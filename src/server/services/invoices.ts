import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma as prismaClient } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { PAYMENT_TERMS_DAYS } from "@/lib/constants"
import { round2 } from "@/lib/utils"
import { nextInvoiceNumber } from "@/server/services/numbering"
import {
  computeDiscounts,
  computeSubtotal,
  computeTaxes,
  lineNet,
  type DiscountRuleLike,
  type PricingLine,
  type TaxRuleLike
} from "@/server/services/pricing"

type Db = PrismaClient | Prisma.TransactionClient

export type GenerateParams = {
  subscriptionId: string
  periodStart: Date
  periodEnd: Date
  now?: Date
  taxRules?: TaxRuleLike[]
  discountRules?: DiscountRuleLike[]
}

export type GenerateResult = {
  created: boolean
  skipped: boolean
  invoiceId?: string
  number?: string
  reason?: string
}

export async function findExistingInvoice(db: Db, params: GenerateParams) {
  return db.invoice.findUnique({
    where: {
      subscriptionId_billingPeriodStart_billingPeriodEnd: {
        subscriptionId: params.subscriptionId,
        billingPeriodStart: params.periodStart,
        billingPeriodEnd: params.periodEnd
      }
    },
    select: { id: true, number: true, status: true }
  })
}

export async function generateInvoiceForPeriod(db: Db, params: GenerateParams): Promise<GenerateResult> {
  const now = params.now ?? new Date()
  const existing = await findExistingInvoice(db, params)
  if (existing) {
    return { created: false, skipped: true, invoiceId: existing.id, number: existing.number, reason: "already billed" }
  }

  const subscription = await db.subscription.findUnique({
    where: { id: params.subscriptionId },
    include: {
      customer: true,
      plan: true,
      lines: { include: { product: true, variant: true } }
    }
  })
  if (!subscription) return { created: false, skipped: true, reason: "subscription missing" }
  if (!subscription.lines.length) return { created: false, skipped: true, reason: "no lines on subscription" }

  const pricingLines: PricingLine[] = subscription.lines.map((l) => ({
    productId: l.productId,
    category: l.product.category,
    quantity: l.quantity,
    unitPrice: l.unitPrice
  }))

  const taxRules = params.taxRules ?? ((await db.taxRule.findMany({ where: { active: true } })) as TaxRuleLike[])
  const discountRules =
    params.discountRules ?? ((await db.discountRule.findMany({ where: { active: true } })) as DiscountRuleLike[])

  const subtotal = computeSubtotal(pricingLines)
  const discountResult = computeDiscounts(discountRules, pricingLines, now)
  const taxes = computeTaxes(pricingLines, taxRules, discountResult.total)
  const taxTotal = round2(taxes.reduce((s, t) => s + t.taxAmount, 0))
  const total = round2(subtotal - discountResult.total + taxTotal)

  const issueDate = params.periodStart
  const dueDate = new Date(issueDate)
  dueDate.setDate(dueDate.getDate() + (PAYMENT_TERMS_DAYS[subscription.paymentTerms] ?? 0))
  const status = issueDate.getTime() > now.getTime() ? "DRAFT" : "CONFIRMED"

  const number = await nextInvoiceNumber(db, issueDate)

  const lineRows: Prisma.InvoiceLineCreateManyInput[] = subscription.lines.map((line, index) => {
    const tax = taxes[index]
    const variantLabel = line.variant ? ` (${line.variant.attribute}: ${line.variant.value})` : ""
    return {
      invoiceId: "",
      kind: "PRODUCT",
      description: `${line.product.name}${variantLabel}`,
      productId: line.productId,
      variantId: line.variantId ?? null,
      quantity: line.quantity,
      unitPrice: round2(line.unitPrice),
      taxRate: tax?.taxRate ?? 0,
      taxAmount: tax?.taxAmount ?? 0,
      lineAmount: round2(lineNet(pricingLines[index]))
    }
  })

  for (const discount of discountResult.applied) {
    lineRows.push({
      invoiceId: "",
      kind: "DISCOUNT",
      description: `Discount - ${discount.name}`,
      productId: null,
      variantId: null,
      quantity: 1,
      unitPrice: -discount.amount,
      taxRate: 0,
      taxAmount: 0,
      lineAmount: -discount.amount
    })
  }

  const invoice = await db.invoice.create({
    data: {
      number,
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      status,
      issueDate,
      dueDate,
      billingPeriodStart: params.periodStart,
      billingPeriodEnd: params.periodEnd,
      subtotal,
      discountTotal: discountResult.total,
      taxTotal,
      total,
      notes: `Billing period ${params.periodStart.toISOString().slice(0, 10)} to ${params.periodEnd.toISOString().slice(0, 10)}`,
      confirmedAt: status === "CONFIRMED" ? now : null,
      lines: {
        createMany: {
          data: lineRows.map(({ invoiceId: _ignored, ...rest }) => rest)
        }
      }
    }
  })

  for (const discount of discountResult.applied) {
    await db.discountUsage.create({
      data: { discountId: discount.ruleId, invoiceId: invoice.id, amount: discount.amount }
    })
    await db.discountRule.update({
      where: { id: discount.ruleId },
      data: { usedCount: { increment: 1 } }
    })
  }

  return { created: true, skipped: false, invoiceId: invoice.id, number: invoice.number }
}

export async function recalcInvoiceTotals(db: Db, invoiceId: string) {
  const lines = await db.invoiceLine.findMany({ where: { invoiceId } })
  const subtotal = round2(lines.filter((l) => l.kind === "PRODUCT").reduce((s, l) => s + l.lineAmount, 0))
  const discountTotal = round2(lines.filter((l) => l.kind === "DISCOUNT").reduce((s, l) => s + Math.abs(l.lineAmount), 0))
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0))
  const total = round2(subtotal - discountTotal + taxTotal)
  return db.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, discountTotal, taxTotal, total }
  })
}

export async function confirmInvoice(invoiceId: string, _actorId?: string) {
  const invoice = await loadInvoiceRow(invoiceId)
  if (invoice.status !== "DRAFT") throw new ApiError("Only draft invoices can confirm", 409)
  return prismaClient.invoice.update({
    where: { id: invoiceId },
    data: { status: "CONFIRMED", confirmedAt: new Date() }
  })
}

export async function cancelInvoice(invoiceId: string, _actorId?: string) {
  const invoice = await loadInvoiceRow(invoiceId)
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    throw new ApiError("Paid or cancelled invoices stay put", 409)
  }
  return prismaClient.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED", cancelledAt: new Date() }
  })
}

export async function markInvoiceSent(invoiceId: string) {
  return prismaClient.invoice.update({
    where: { id: invoiceId },
    data: { sentAt: new Date() }
  })
}

export function isOverdue(invoice: { status: string; dueDate: Date; amountPaid: number; total: number }, now = new Date()) {
  if (invoice.status !== "CONFIRMED") return false
  if (invoice.amountPaid + 0.01 >= invoice.total) return false
  return invoice.dueDate.getTime() < now.getTime()
}

export function paymentState(invoice: { status: string; dueDate: Date; amountPaid: number; total: number }, now = new Date()) {
  if (invoice.status === "PAID") return "PAID"
  if (invoice.status === "CANCELLED") return "CANCELLED"
  if (invoice.status === "DRAFT") return "DRAFT"
  if (isOverdue(invoice, now)) return "OVERDUE"
  if (invoice.amountPaid > 0) return "PARTIAL"
  return "OUTSTANDING"
}

async function loadInvoiceRow(invoiceId: string) {
  const client = prismaClient
  const invoice = await client.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) throw new ApiError("Invoice not found", 404)
  return invoice
}
