import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { SUB_TRANSITIONS, type SubStatus } from "@/lib/constants"
import { round2 } from "@/lib/utils"
import type { SubscriptionInput } from "@/lib/validators"
import { computeDiscounts, computeSubtotal, computeTaxes, lineNet, type DiscountRuleLike, type PricingLine, type TaxRuleLike } from "@/server/services/pricing"
import { addPeriod, endOfDay, startOfDay } from "@/server/services/dates"
import { nextSubscriptionNumber } from "@/server/services/numbering"
import { generateInvoiceForPeriod } from "@/server/services/invoices"

export type Actor = { id: string; role: string }

const ACTION_TARGET: Record<string, SubStatus> = {
  SEND_QUOTATION: "QUOTATION",
  CONFIRM: "CONFIRMED",
  ACTIVATE: "ACTIVE",
  PAUSE: "PAUSED",
  RESUME: "ACTIVE",
  CLOSE: "CLOSED",
  REOPEN: "ACTIVE"
}

export function canTransition(from: string, to: string) {
  const allowed = SUB_TRANSITIONS[from as SubStatus] ?? []
  return allowed.includes(to as SubStatus)
}

export function resolveTransition(current: string, action: string) {
  const target = ACTION_TARGET[action]
  if (!target) throw new ApiError("Unknown action", 400)
  if (action === "REOPEN" && current !== "CLOSED") throw new ApiError("Only closed subscriptions can reopen", 409)
  if (current === "CLOSED" && action !== "REOPEN") throw new ApiError("Closed subscriptions are read only", 409)
  if (!canTransition(current, target) && !(action === "REOPEN" && current === "CLOSED")) {
    throw new ApiError(`Cannot go from ${current} to ${target}`, 409)
  }
  return target
}

export async function buildPricing(input: { productId: string; quantity: number; unitPrice?: number; variantId?: string | null }[]) {
  const ids = Array.from(new Set(input.map((l) => l.productId)))
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { variants: true }
  })
  const map = new Map(products.map((p) => [p.id, p]))
  return input.map((line) => {
    const product = map.get(line.productId)
    if (!product) throw new ApiError("Product not found", 404)
    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : null
    if (line.variantId && !variant) throw new ApiError("Variant not found on that product", 404)
    const unitPrice = round2(line.unitPrice ?? product.salesPrice + (variant?.priceExtra ?? 0))
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: line.quantity,
      unitPrice,
      category: product.category,
      productName: product.name,
      variantLabel: variant ? `${variant.attribute}: ${variant.value}` : null
    }
  })
}

export async function priceSubscription(
  lines: { productId: string; category: string; quantity: number; unitPrice: number }[],
  now = new Date()
) {
  const taxRules = (await prisma.taxRule.findMany({ where: { active: true } })) as TaxRuleLike[]
  const discountRules = (await prisma.discountRule.findMany({ where: { active: true } })) as DiscountRuleLike[]
  const pricing: PricingLine[] = lines.map((l) => ({
    productId: l.productId,
    category: l.category,
    quantity: l.quantity,
    unitPrice: l.unitPrice
  }))
  const subtotal = computeSubtotal(pricing)
  const discounts = computeDiscounts(discountRules, pricing, now)
  const taxes = computeTaxes(pricing, taxRules, discounts.total)
  const taxTotal = round2(taxes.reduce((s, t) => s + t.taxAmount, 0))
  return {
    subtotal,
    discountTotal: discounts.total,
    taxTotal,
    total: round2(subtotal - discounts.total + taxTotal),
    taxes,
    appliedDiscounts: discounts.applied
  }
}

export async function createSubscription(input: SubscriptionInput, actor: Actor) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } })
  if (!customer) throw new ApiError("Customer not found", 404)

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
  if (!plan) throw new ApiError("Plan not found", 404)
  if (!plan.active) throw new ApiError("That plan is archived", 409)

  const start = startOfDay(new Date(input.startDate))
  const expiry = endOfDay(new Date(input.expiryDate))
  if (expiry.getTime() <= start.getTime()) throw new ApiError("Expiry must be after start date", 422)
  if (plan.availableFrom && start < plan.availableFrom) throw new ApiError("Plan not available yet on that start date", 422)
  if (plan.availableTo && start > plan.availableTo) throw new ApiError("Plan availability ended before that start date", 422)

  const totalQty = input.lines.reduce((s, l) => s + l.quantity, 0)
  if (totalQty < plan.minQuantity) throw new ApiError(`Plan needs minimum quantity of ${plan.minQuantity}`, 422)

  const priced = await buildPricing(input.lines)
  const totals = await priceSubscription(priced)

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextSubscriptionNumber(tx, new Date())
    const sub = await tx.subscription.create({
      data: {
        number,
        customerId: input.customerId,
        planId: input.planId,
        status: "DRAFT",
        startDate: start,
        expiryDate: expiry,
        paymentTerms: input.paymentTerms,
        quotationValidityDays: input.quotationValidityDays ?? 30,
        quotationValidUntil: new Date(start.getTime() + (input.quotationValidityDays ?? 30) * 86400000),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: input.notes || null,
        createdById: actor.id,
        lines: {
          create: priced.map((line, index) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRuleId: totals.taxes[index]?.taxRuleId ?? null,
            taxRate: totals.taxes[index]?.taxRate ?? 0,
            taxAmount: totals.taxes[index]?.taxAmount ?? 0,
            lineAmount: round2(lineNet({ ...line, unitPrice: line.unitPrice }))
          }))
        }
      }
    })
    await tx.subscriptionEvent.create({
      data: { subscriptionId: sub.id, fromStatus: null, toStatus: "DRAFT", actorId: actor.id, note: "Subscription created" }
    })
    return sub
  })

  return created
}

export async function transitionSubscription(params: {
  subscriptionId: string
  action: string
  actor: Actor
  note?: string
  now?: Date
}) {
  const now = params.now ?? new Date()
  const sub = await prisma.subscription.findUnique({
    where: { id: params.subscriptionId },
    include: { plan: true, customer: true }
  })
  if (!sub) throw new ApiError("Subscription not found", 404)

  const target = resolveTransition(sub.status, params.action)

  if (target === "PAUSED" && !sub.plan.pausable) throw new ApiError("Plan does not allow pausing", 409)
  if (target === "CLOSED" && sub.status === "ACTIVE" && !sub.plan.closableEarly && now < sub.expiryDate) {
    throw new ApiError("Plan cannot be closed before its end date", 409)
  }
  if (params.action === "RESUME" && sub.status !== "PAUSED") throw new ApiError("Only paused subscriptions can resume", 409)

  const data: Record<string, unknown> = { status: target }
  if (target === "PAUSED") data.pausedAt = now
  if (target === "ACTIVE" && params.action === "RESUME") {
    data.pausedAt = null
    data.nextBillingDate = startOfDay(now)
  }
  if (target === "ACTIVE" && params.action === "ACTIVATE") {
    data.nextBillingDate = startOfDay(sub.startDate)
  }
  if (target === "CLOSED") data.closedAt = now

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.subscription.update({ where: { id: sub.id }, data })
    await tx.subscriptionEvent.create({
      data: {
        subscriptionId: sub.id,
        fromStatus: sub.status,
        toStatus: target,
        actorId: params.actor.id,
        note: params.note || null
      }
    })
    return row
  })

  if (target === "ACTIVE" && (params.action === "ACTIVATE" || params.action === "RESUME")) {
    const periods = sub.plan.period
    const expiryLimit = endOfDay(sub.expiryDate).getTime()
    let cursor = startOfDay(new Date(updated.nextBillingDate ?? now))
    let guard = 0
    while (cursor.getTime() <= now.getTime() && guard < 36) {
      const periodEnd = addPeriod(cursor, periods)
      if (periodEnd.getTime() > expiryLimit) break
      await prisma.$transaction(async (tx) => {
        await generateInvoiceForPeriod(tx, {
          subscriptionId: sub.id,
          periodStart: cursor,
          periodEnd,
          now
        })
      })
      cursor = periodEnd
      guard += 1
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: cursor, lastBilledAt: now }
    })
  }

  return updated
}

export async function renewSubscription(subscriptionId: string, actor: Actor) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, lines: true }
  })
  if (!sub) throw new ApiError("Subscription not found", 404)
  if (!sub.plan.renewable) throw new ApiError("Plan is not renewable", 409)
  if (sub.status !== "CLOSED" && sub.status !== "ACTIVE") {
    throw new ApiError("Only active or closed subscriptions can renew", 409)
  }
  const start = sub.expiryDate
  const expiry = addPeriod(start, sub.plan.period)
  const priced = sub.lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    variantId: l.variantId ?? undefined
  }))
  return createSubscription(
    {
      customerId: sub.customerId,
      planId: sub.planId,
      startDate: start.toISOString().slice(0, 10),
      expiryDate: expiry.toISOString().slice(0, 10),
      paymentTerms: sub.paymentTerms as "IMMEDIATE",
      quotationValidityDays: sub.quotationValidityDays,
      notes: `Renewal of ${sub.number}`,
      templateId: "",
      lines: priced
    },
    actor
  )
}
