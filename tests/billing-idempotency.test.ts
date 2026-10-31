import { beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/lib/prisma"
import { createSubscription, transitionSubscription } from "../src/server/services/subscriptions"
import { billSubscription } from "../src/server/services/billing"
import { addPeriod } from "../src/server/services/dates"

const actor = { id: "test-actor", role: "ADMIN" }

async function seedFixture() {
  await prisma.invoiceLine.deleteMany()
  await prisma.discountUsage.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.subscriptionEvent.deleteMany()
  await prisma.subscriptionLine.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.discountRule.deleteMany()
  await prisma.taxRule.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.user.deleteMany()
  await prisma.counter.deleteMany()

  await prisma.user.create({
    data: { id: actor.id, email: "test@brightloop.app", name: "Test Admin", role: "ADMIN", passwordHash: "x" }
  })
  const customer = await prisma.customer.create({
    data: { name: "Test Co", contactName: "Test User", email: "testco@example.io" }
  })
  const product = await prisma.product.create({
    data: { name: "Core", category: "Platform", salesPrice: 100, costPrice: 20, variants: { create: [{ attribute: "Brand", value: "Odoo", priceExtra: 560 }] } }
  })
  const variant = await prisma.productVariant.findFirst({ where: { productId: product.id } })
  const plan = await prisma.plan.create({
    data: { name: "Monthly", price: 99, period: "MONTHLY", minQuantity: 1, pausable: true, closableEarly: true, renewable: true }
  })
  await prisma.taxRule.create({ data: { name: "GST", rate: 18, scope: "ALL" } })

  return { customer, product, variant, plan }
}

describe("billing engine idempotency", () => {
  beforeEach(async () => {
    await seedFixture()
  })

  it("bills each period exactly once across repeated runs", async () => {
    const { customer, product, plan } = await seedFixture()
    const start = new Date()
    start.setMonth(start.getMonth() - 3)

    const sub = await createSubscription(
      {
        customerId: customer.id,
        planId: plan.id,
        startDate: start.toISOString().slice(0, 10),
        expiryDate: addPeriod(addPeriod(addPeriod(addPeriod(start, "MONTHLY"), "MONTHLY"), "MONTHLY"), "MONTHLY").toISOString().slice(0, 10),
        paymentTerms: "NET_15",
        quotationValidityDays: 30,
        lines: [{ productId: product.id, quantity: 1 }]
      },
      actor
    )

    await transitionSubscription({ subscriptionId: sub.id, action: "SEND_QUOTATION", actor })
    await transitionSubscription({ subscriptionId: sub.id, action: "CONFIRM", actor })
    await transitionSubscription({ subscriptionId: sub.id, action: "ACTIVATE", actor, now: new Date() })

    const first = await prisma.invoice.count({ where: { subscriptionId: sub.id } })
    expect(first).toBeGreaterThan(0)

    const repeat = await billSubscription(sub.id, new Date())
    expect(repeat.created).toBe(0)

    const after = await prisma.invoice.count({ where: { subscriptionId: sub.id } })
    expect(after).toBe(first)

    const periods = await prisma.invoice.groupBy({
      by: ["billingPeriodStart"],
      where: { subscriptionId: sub.id },
      _count: { _all: true }
    })
    expect(periods.every((row) => row._count._all === 1)).toBe(true)
  })

  it("catches up periods when the job was down for a while", async () => {
    const { customer, product, plan } = await seedFixture()
    const start = new Date()
    start.setMonth(start.getMonth() - 2)

    const sub = await createSubscription(
      {
        customerId: customer.id,
        planId: plan.id,
        startDate: start.toISOString().slice(0, 10),
        expiryDate: addPeriod(addPeriod(start, "MONTHLY"), "MONTHLY").toISOString().slice(0, 10),
        paymentTerms: "IMMEDIATE",
        quotationValidityDays: 30,
        lines: [{ productId: product.id, quantity: 2 }]
      },
      actor
    )

    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", nextBillingDate: start } })

    const firstRun = await billSubscription(sub.id, new Date())
    expect(firstRun.created).toBeGreaterThanOrEqual(2)
    expect(firstRun.skipped).toBe(0)

    const secondRun = await billSubscription(sub.id, new Date())
    expect(secondRun.created).toBe(0)

    const totals = await prisma.invoice.aggregate({ where: { subscriptionId: sub.id }, _sum: { total: true }, _count: { _all: true } })
    expect(totals._count._all).toBe(firstRun.created)
    expect(totals._sum.total ?? 0).toBeGreaterThan(0)
  })

  it("applies the invoice total with tax and no double billing", async () => {
    const { customer, product, plan } = await seedFixture()
    const start = new Date()
    start.setDate(start.getDate() - 1)

    const sub = await createSubscription(
      {
        customerId: customer.id,
        planId: plan.id,
        startDate: start.toISOString().slice(0, 10),
        expiryDate: addPeriod(start, "MONTHLY").toISOString().slice(0, 10),
        paymentTerms: "IMMEDIATE",
        quotationValidityDays: 30,
        lines: [{ productId: product.id, quantity: 1 }]
      },
      actor
    )
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", nextBillingDate: start } })
    await billSubscription(sub.id, new Date())

    const invoice = await prisma.invoice.findFirst({ where: { subscriptionId: sub.id } })
    expect(invoice?.subtotal).toBe(100)
    expect(invoice?.taxTotal).toBe(18)
    expect(invoice?.total).toBe(118)
  })
})
