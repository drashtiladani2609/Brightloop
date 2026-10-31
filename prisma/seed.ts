import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { computeDiscounts, computeSubtotal, computeTaxes, type DiscountRuleLike, type PricingLine, type TaxRuleLike } from "../src/server/services/pricing"
import { addPeriod } from "../src/server/services/dates"
import { round2 } from "../src/lib/utils"

const prisma = new PrismaClient()

let seed = 20260214
function rnd() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000)
const d0 = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const iso = (d: Date) => d.toISOString().slice(0, 10)

async function reset() {
  await prisma.emailLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceLine.deleteMany()
  await prisma.discountUsage.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.subscriptionEvent.deleteMany()
  await prisma.subscriptionLine.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.templateLine.deleteMany()
  await prisma.quotationTemplate.deleteMany()
  await prisma.discountRule.deleteMany()
  await prisma.taxRule.deleteMany()
  await prisma.billingRun.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.user.deleteMany()
  await prisma.counter.deleteMany()
}

async function main() {
  console.log("resetting tables")
  await reset()

  const adminHash = await bcrypt.hash("Admin@1234", 10)
  const staffHash = await bcrypt.hash("Staff@1234", 10)
  const customerHash = await bcrypt.hash("Customer@1234", 10)

  const admin = await prisma.user.create({
    data: { email: "admin@brightloop.app", name: "Mira Chandra", role: "ADMIN", passwordHash: adminHash }
  })
  const staff1 = await prisma.user.create({
    data: { email: "staff@brightloop.app", name: "Dev Patel", role: "STAFF", passwordHash: staffHash }
  })
  const staff2 = await prisma.user.create({
    data: { email: "accounts@brightloop.app", name: "Rhea Kulkarni", role: "STAFF", passwordHash: staffHash }
  })
  console.log("users ready")

  const productSpecs = [
    { name: "Brightloop Core", type: "Software", category: "Platform", salesPrice: 45, costPrice: 12, variants: [{ attribute: "Brand", value: "Odoo", priceExtra: 560 }, { attribute: "Brand", value: "Brightloop", priceExtra: 0 }] },
    { name: "Analytics Add-on", type: "Add-on", category: "Analytics", salesPrice: 25, costPrice: 6, variants: [{ attribute: "Seats", value: "10 seats", priceExtra: 0 }, { attribute: "Seats", value: "50 seats", priceExtra: 180 }] },
    { name: "Onboarding Service", type: "Service", category: "Services", salesPrice: 450, costPrice: 210, variants: [{ attribute: "Mode", value: "Remote", priceExtra: 0 }, { attribute: "Mode", value: "Onsite", priceExtra: 320 }] },
    { name: "Priority Support", type: "Support", category: "Services", salesPrice: 120, costPrice: 38, variants: [{ attribute: "SLA", value: "8x5", priceExtra: 0 }, { attribute: "SLA", value: "24x7", priceExtra: 240 }] },
    { name: "Warehouse Hub", type: "Software", category: "Operations", salesPrice: 95, costPrice: 28, variants: [{ attribute: "Brand", value: "Odoo", priceExtra: 560 }, { attribute: "Edition", value: "Standard", priceExtra: 0 }] },
    { name: "Payments Connector", type: "Add-on", category: "Fintech", salesPrice: 35, costPrice: 8, variants: [{ attribute: "Region", value: "Global", priceExtra: 0 }, { attribute: "Region", value: "India", priceExtra: 40 }] },
    { name: "Data Migration", type: "Service", category: "Services", salesPrice: 650, costPrice: 340, variants: [{ attribute: "Volume", value: "Up to 50k rows", priceExtra: 0 }, { attribute: "Volume", value: "Unlimited", priceExtra: 480 }] },
    { name: "Insight Dashboard", type: "Software", category: "Analytics", salesPrice: 65, costPrice: 18, variants: [{ attribute: "Brand", value: "Odoo", priceExtra: 560 }] }
  ]

  const products: any[] = []
  for (const spec of productSpecs) {
    const product: any = await prisma.product.create({
      data: {
        name: spec.name,
        type: spec.type,
        category: spec.category,
        salesPrice: spec.salesPrice,
        costPrice: spec.costPrice,
        notes: `${spec.name} sold on recurring terms`,
        active: true,
        variants: { create: spec.variants.map((v: { attribute: string; value: string; priceExtra: number }) => ({ ...v, sku: `${spec.name.slice(0, 3).toUpperCase()}-${v.value.slice(0, 3).toUpperCase()}` })) }
      },
      include: { variants: true }
    })
    products.push(product)
  }
  console.log("products ready", products.length)

  const planSpecs = [
    { name: "Starter Monthly", price: 0, period: "MONTHLY", minQuantity: 1, autoCloseOnEnd: false, closableEarly: true, pausable: true, renewable: true, description: "Entry tier billed every month with room to grow" },
    { name: "Growth Monthly", price: 249, period: "MONTHLY", minQuantity: 2, autoCloseOnEnd: false, closableEarly: true, pausable: true, renewable: true, description: "Most popular tier for scaling teams" },
    { name: "Scale Annual", price: 2490, period: "YEARLY", minQuantity: 3, autoCloseOnEnd: true, closableEarly: false, pausable: true, renewable: true, description: "Locked annual rate with auto close at term end" },
    { name: "Sprint Weekly", price: 79, period: "WEEKLY", minQuantity: 1, autoCloseOnEnd: true, closableEarly: true, pausable: false, renewable: true, description: "Short weekly sprint for delivery teams" },
    { name: "Metered Daily", price: 12, period: "DAILY", minQuantity: 2, autoCloseOnEnd: false, closableEarly: true, pausable: true, renewable: false, description: "Pay per day for burst workloads" },
    { name: "Enterprise Custom", price: 4990, period: "MONTHLY", minQuantity: 4, autoCloseOnEnd: false, closableEarly: false, pausable: true, renewable: true, description: "High volume plan with negotiated terms" }
  ]

  const plans = []
  for (const spec of planSpecs) {
    const plan = await prisma.plan.create({
      data: {
        ...spec,
        availableFrom: daysAgo(400),
        availableTo: daysAhead(220),
        active: true
      }
    })
    plans.push(plan)
  }
  console.log("plans ready")

  const taxes = await Promise.all([
    prisma.taxRule.create({ data: { name: "GST 18%", rate: 18, scope: "ALL", active: true } }),
    prisma.taxRule.create({ data: { name: "Digital Services Levy", rate: 6, scope: "CATEGORY", category: "Platform", active: true } }),
    prisma.taxRule.create({ data: { name: "Service Tax 10%", rate: 10, scope: "CATEGORY", category: "Services", active: true } })
  ])

  const discounts = await Promise.all([
    prisma.discountRule.create({
      data: { name: "Launch 10 percent", type: "PERCENTAGE", value: 10, scope: "SUBSCRIPTION", minAmount: 400, minQuantity: 2, startDate: daysAgo(120), endDate: daysAhead(90), usageLimit: 500, usedCount: 118, active: true }
    }),
    prisma.discountRule.create({
      data: { name: "Flat 75 off", type: "FIXED", value: 75, scope: "SUBSCRIPTION", minAmount: 250, startDate: daysAgo(60), endDate: daysAhead(120), usageLimit: 250, usedCount: 42, active: true }
    }),
    prisma.discountRule.create({
      data: { name: "Odoo bundle 15 percent", type: "PERCENTAGE", value: 15, scope: "PRODUCT", productId: products[0].id, minQuantity: 1, startDate: daysAgo(200), endDate: daysAhead(200), usageLimit: 400, usedCount: 96, active: true }
    }),
    prisma.discountRule.create({
      data: { name: "Winter promo 20 percent", type: "PERCENTAGE", value: 20, scope: "SUBSCRIPTION", minAmount: 100, startDate: daysAgo(300), endDate: daysAgo(45), usageLimit: 200, usedCount: 200, active: true }
    })
  ])

  const customerSpecs = [
    "Northwind Systems", "Aurora Labs", "Helix Retail", "Cobalt Freight", "Lumen Health", "Vertex Robotics",
    "Solstice Media", "Kestrel Finance", "Orchid Foods", "Ironwood Legal", "Nimbus Education", "Pillar Construction",
    "Crescent Travel", "Beacon Energy", "Quartz Telecom", "Sable Textiles", "Harbor Logistics", "Meridian Pharma",
    "Juniper Sports", "Ashgrove Hotels", "Titan Manufacturing", "Verde Agritech", "Copper Studios", "Wavelength Audio",
    "Zenith Insure"
  ]
  const contacts = ["Aarav Shah", "Priya Menon", "Rohan Iyer", "Sara Khan", "Vikram Rao", "Neha Joshi", "Kabir Sethi", "Ananya Bose", "Dev Malhotra", "Isha Reddy"]
  const cities = ["Rajkot", "Bengaluru", "Mumbai", "Pune", "Ahmedabad", "Delhi", "Surat", "Jaipur", "Kochi", "Hyderabad"]

  const customers = []
  for (let i = 0; i < customerSpecs.length; i++) {
    const name = customerSpecs[i]
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${name.toLowerCase().replace(/[^a-z]+/g, "")}.io`
    const isDemo = i === 0
    const user = await prisma.user.create({
      data: {
        email,
        name: contacts[i % contacts.length],
        role: "CUSTOMER",
        passwordHash: customerHash,
        createdAt: daysAgo(400 - i * 7)
      }
    })
    const customer = await prisma.customer.create({
      data: {
        name,
        contactName: contacts[i % contacts.length],
        email,
        phone: `+91 9${int(100000000, 899999999)}`,
        addressLine: `${int(2, 90)} ${pick(["Ring Road", "MG Road", "Park Street", "Marine Drive", "Sector 12"])}`,
        city: cities[i % cities.length],
        country: "India",
        taxId: `GSTIN${int(100000, 999999)}A`,
        notes: isDemo ? "Flagship pilot account - demo portal login" : null,
        active: true,
        userId: user.id,
        createdAt: daysAgo(400 - i * 7)
      }
    })
    customers.push(customer)
  }
  console.log("customers ready", customers.length)

  const templates = []
  const templateSpecs = [
    { name: "Growth starter pack", planId: plans[1].id, validityDays: 21, lines: [{ productId: products[0].id, variantId: products[0].variants[0].id, quantity: 2 }, { productId: products[1].id, variantId: products[1].variants[1].id, quantity: 1 }] },
    { name: "Annual platform bundle", planId: plans[2].id, validityDays: 30, lines: [{ productId: products[0].id, variantId: products[0].variants[1].id, quantity: 5 }, { productId: products[3].id, variantId: products[3].variants[1].id, quantity: 2 }, { productId: products[7].id, variantId: products[7].variants[0].id, quantity: 1 }] },
    { name: "Services sprint", planId: plans[3].id, validityDays: 14, lines: [{ productId: products[2].id, variantId: products[2].variants[0].id, quantity: 1 }, { productId: products[6].id, variantId: products[6].variants[0].id, quantity: 1 }] }
  ]
  for (const spec of templateSpecs) {
    const template = await prisma.quotationTemplate.create({
      data: {
        name: spec.name,
        validityDays: spec.validityDays,
        planId: spec.planId,
        notes: `${spec.name} - pre filled lines`,
        lines: { create: spec.lines }
      }
    })
    templates.push(template)
  }
  console.log("templates ready")

  const taxLike: TaxRuleLike[] = taxes.map((t) => ({ id: t.id, name: t.name, rate: t.rate, scope: t.scope, category: t.category, productId: t.productId, active: t.active }))
  const discountLike: DiscountRuleLike[] = discounts.map((d) => ({ id: d.id, name: d.name, type: d.type, value: d.value, scope: d.scope, productId: d.productId, minAmount: d.minAmount, minQuantity: d.minQuantity, startDate: d.startDate, endDate: d.endDate, usageLimit: d.usageLimit, usedCount: d.usedCount, active: d.active }))

  const SUB_TOTAL = 2000
  const subs: any[] = []
  const subLines: any[] = []
  const subEvents: any[] = []
  const invoices: any[] = []
  const invoiceLines: any[] = []
  const payments: any[] = []
  const emailLogs: any[] = []
  const paidOn = (issue: Date, maxDays: number) =>
    new Date(Math.min(issue.getTime() + int(0, maxDays) * 86400000, now.getTime() - int(2, 30) * 3600000))

  let invSeq = 0
  const now = new Date()
  const statusPlan = [
    ...Array(1380).fill("ACTIVE"),
    ...Array(300).fill("CLOSED"),
    ...Array(90).fill("PAUSED"),
    ...Array(80).fill("CONFIRMED"),
    ...Array(80).fill("QUOTATION"),
    ...Array(70).fill("DRAFT")
  ]

  for (let i = 0; i < SUB_TOTAL; i++) {
    const customer = customers[int(0, customers.length - 1)]
    const planRoll = rnd()
    const plan =
      planRoll < 0.3 ? plans[0] : planRoll < 0.65 ? plans[1] : planRoll < 0.77 ? plans[2] : planRoll < 0.85 ? plans[3] : planRoll < 0.92 ? plans[4] : plans[5]
    const status = statusPlan[i]
    const startDays = int(30, 420)
    const start = d0(daysAgo(startDays))
    const periodCount = plan.period === "DAILY" ? int(10, 60) : plan.period === "WEEKLY" ? int(4, 24) : plan.period === "MONTHLY" ? int(3, 14) : int(1, 3)
    const expiry = addPeriod(start, plan.period)
    let expiryCursor = start
    for (let p = 0; p < periodCount; p++) expiryCursor = addPeriod(expiryCursor, plan.period)

    const lineCount = rnd() < 0.72 ? 1 : rnd() < 0.85 ? 2 : 3
    const chosen: PricingLine[] = []
    const lineRows: any[] = []
    for (let l = 0; l < lineCount; l++) {
      const product = pick(products)
      const variant: any = product.variants.length ? pick<any>(product.variants) : null
      const quantity = int(1, 2)
      const unitPrice = round2(product.salesPrice + (variant?.priceExtra ?? 0))
      chosen.push({ productId: product.id, category: product.category, quantity, unitPrice })
      lineRows.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity,
        unitPrice
      })
    }
    if (chosen.reduce((s, l) => s + l.quantity, 0) < plan.minQuantity) {
      chosen[0].quantity += plan.minQuantity
      lineRows[0].quantity += plan.minQuantity
    }

    const subtotal = computeSubtotal(chosen)
    const disc = computeDiscounts(discountLike, chosen, now)
    const taxesComputed = computeTaxes(chosen, taxLike, disc.total)
    const taxTotal = round2(taxesComputed.reduce((s, t) => s + t.taxAmount, 0))
    const total = round2(subtotal - disc.total + taxTotal)

    const subId = randomUUID()
    const number = `SUB-2026-${String(i + 1).padStart(5, "0")}`
    const paymentTerms = pick(["IMMEDIATE", "NET_15", "NET_30", "NET_45"])
    const nextBilling = status === "ACTIVE" ? (i % 40 === 0 ? daysAgo(int(2, 20)) : daysAhead(int(0, 30))) : null

    subs.push({
      id: subId,
      number,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate: start,
      expiryDate: expiryCursor,
      paymentTerms,
      quotationValidityDays: int(14, 30),
      quotationValidUntil: daysAhead(int(5, 40)),
      currency: "USD",
      subtotal,
      discountTotal: disc.total,
      taxTotal,
      total,
      nextBillingDate: nextBilling,
      lastBilledAt: status === "ACTIVE" ? daysAgo(int(1, 30)) : null,
      notes: null,
      closedAt: status === "CLOSED" ? daysAgo(int(1, Math.max(2, startDays - 40))) : null,
      pausedAt: status === "PAUSED" ? daysAgo(int(2, 60)) : null,
      createdById: pick([admin.id, staff1.id, staff2.id]),
      createdAt: start,
      updatedAt: start
    })

    lineRows.forEach((row, idx) => {
      subLines.push({
        id: randomUUID(),
        subscriptionId: subId,
        productId: row.productId,
        variantId: row.variantId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        taxRuleId: taxesComputed[idx]?.taxRuleId ?? null,
        taxRate: taxesComputed[idx]?.taxRate ?? 0,
        taxAmount: taxesComputed[idx]?.taxAmount ?? 0,
        lineAmount: round2(row.quantity * row.unitPrice)
      })
    })

    subEvents.push({ id: randomUUID(), subscriptionId: subId, fromStatus: null, toStatus: "DRAFT", actorId: pick([admin.id, staff1.id]), note: "Subscription created", createdAt: start })
    if (status !== "DRAFT") subEvents.push({ id: randomUUID(), subscriptionId: subId, fromStatus: "DRAFT", toStatus: "QUOTATION", actorId: staff1.id, note: null, createdAt: start })
    if (["CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"].includes(status)) subEvents.push({ id: randomUUID(), subscriptionId: subId, fromStatus: "QUOTATION", toStatus: "CONFIRMED", actorId: staff2.id, note: null, createdAt: start })
    if (["ACTIVE", "PAUSED", "CLOSED"].includes(status)) subEvents.push({ id: randomUUID(), subscriptionId: subId, fromStatus: "CONFIRMED", toStatus: "ACTIVE", actorId: staff1.id, note: null, createdAt: start })
    if (status === "PAUSED") subEvents.push({ id: randomUUID(), subscriptionId: subId, fromStatus: "ACTIVE", toStatus: "PAUSED", actorId: staff1.id, note: "Customer requested a hold", createdAt: daysAgo(int(2, 60)) })
    if (status === "CLOSED") subEvents.push({ id: randomUUID(), subscriptionId: subId, fromStatus: "ACTIVE", toStatus: "CLOSED", actorId: admin.id, note: "Term finished", createdAt: daysAgo(int(1, 60)) })

    if (["ACTIVE", "PAUSED", "CLOSED"].includes(status)) {
      const maxInvoices = int(3, 7)
      let cursor = new Date(start)
      let made = 0
      while (made < maxInvoices && cursor.getTime() <= now.getTime()) {
        const periodEnd = addPeriod(cursor, plan.period)
        if (periodEnd.getTime() > expiryCursor.getTime()) break
        const issue = new Date(cursor)
        const due = new Date(issue)
        due.setDate(due.getDate() + ({ IMMEDIATE: 0, NET_15: 15, NET_30: 30, NET_45: 45 } as Record<string, number>)[paymentTerms])
        const isLatest = made === maxInvoices - 1
        const roll = rnd()
        let invStatus = "PAID"
        if (isLatest) invStatus = roll < 0.5 ? "PAID" : roll < 0.88 ? "CONFIRMED" : roll < 0.95 ? "DRAFT" : "CANCELLED"
        else invStatus = roll < 0.74 ? "PAID" : roll < 0.9 ? "CONFIRMED" : roll < 0.95 ? "CANCELLED" : "DRAFT"

        const invId = randomUUID()
        invSeq += 1
        const invNumber = `INV-2026-${String(invSeq).padStart(5, "0")}`
        const partial = invStatus === "CONFIRMED" && rnd() < 0.35

        invoices.push({
          id: invId,
          number: invNumber,
          subscriptionId: subId,
          customerId: customer.id,
          status: invStatus,
          issueDate: issue,
          dueDate: due,
          billingPeriodStart: cursor,
          billingPeriodEnd: periodEnd,
          subtotal,
          discountTotal: disc.total,
          taxTotal,
          total,
          amountPaid: invStatus === "PAID" ? total : partial ? round2(total * 0.45) : 0,
          notes: `Billing period ${iso(cursor)} to ${iso(periodEnd)}`,
          sentAt: invStatus === "DRAFT" ? null : issue,
          confirmedAt: invStatus === "DRAFT" ? null : issue,
          paidAt: invStatus === "PAID" ? paidOn(issue, 12) : null,
          cancelledAt: invStatus === "CANCELLED" ? issue : null,
          createdAt: issue,
          updatedAt: issue
        })

        chosen.forEach((line, idx) => {
          const product: any = products.find((p: any) => p.id === line.productId)!
          const variantRow = lineRows[idx].variantId ? product.variants.find((v: any) => v.id === lineRows[idx].variantId) : null
          invoiceLines.push({
            id: randomUUID(),
            invoiceId: invId,
            kind: "PRODUCT",
            description: `${product.name}${variantRow ? ` (${variantRow.attribute}: ${variantRow.value})` : ""}`,
            productId: line.productId,
            variantId: lineRows[idx].variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: taxesComputed[idx]?.taxRate ?? 0,
            taxAmount: taxesComputed[idx]?.taxAmount ?? 0,
            lineAmount: round2(line.quantity * line.unitPrice)
          })
        })
        for (const applied of disc.applied) {
          invoiceLines.push({
            id: randomUUID(),
            invoiceId: invId,
            kind: "DISCOUNT",
            description: `Discount - ${applied.name}`,
            productId: null,
            variantId: null,
            quantity: 1,
            unitPrice: -applied.amount,
            taxRate: 0,
            taxAmount: 0,
            lineAmount: -applied.amount
          })
        }

        if ((invStatus === "PAID" || partial) && rnd() < 0.18) {
          const half = round2((invStatus === "PAID" ? total : round2(total * 0.45)) / 2)
          payments.push({
            id: randomUUID(),
            invoiceId: invId,
            method: pick(["CARD", "UPI"]),
            amount: half,
            paidAt: paidOn(issue, 5),
            reference: `PMT-${int(100000, 999999)}`,
            note: "First of two instalments",
            recordedById: staff1.id,
            status: "SETTLED",
            createdAt: issue
          })
          payments.push({
            id: randomUUID(),
            invoiceId: invId,
            method: pick(["BANK_TRANSFER", "CHEQUE"]),
            amount: round2((invStatus === "PAID" ? total : round2(total * 0.45)) - half),
            paidAt: paidOn(issue, 18),
            reference: `PMT-${int(100000, 999999)}`,
            note: null,
            recordedById: staff2.id,
            status: "SETTLED",
            createdAt: issue
          })
        } else if (invStatus === "PAID" || partial) {
          payments.push({
            id: randomUUID(),
            invoiceId: invId,
            method: pick(["CARD", "BANK_TRANSFER", "UPI", "CASH", "CHEQUE"]),
            amount: invStatus === "PAID" ? total : round2(total * 0.45),
            paidAt: paidOn(issue, 14),
            reference: `PMT-${int(100000, 999999)}`,
            note: null,
            recordedById: pick([staff1.id, staff2.id, admin.id]),
            status: "SETTLED",
            createdAt: issue
          })
        }
        if (invStatus !== "DRAFT") {
          emailLogs.push({
            id: randomUUID(),
            to: customer.email,
            subject: `Invoice ${invNumber} from Brightloop`,
            body: `Hello ${customer.name}, invoice ${invNumber} for ${total.toFixed(2)} is now available in your portal`,
            type: "INVOICE",
            invoiceId: invId,
            status: "SENT",
            createdAt: issue
          })
        }

        cursor = periodEnd
        made += 1
      }
    }
  }

  console.log("writing subscriptions", subs.length)
  for (let i = 0; i < subs.length; i += 500) {
    await prisma.subscription.createMany({ data: subs.slice(i, i + 500) })
  }
  for (let i = 0; i < subLines.length; i += 2000) {
    await prisma.subscriptionLine.createMany({ data: subLines.slice(i, i + 2000) })
  }
  for (let i = 0; i < subEvents.length; i += 2000) {
    await prisma.subscriptionEvent.createMany({ data: subEvents.slice(i, i + 2000) })
  }
  console.log("writing invoices", invoices.length)
  for (let i = 0; i < invoices.length; i += 1000) {
    await prisma.invoice.createMany({ data: invoices.slice(i, i + 1000) })
  }
  console.log("writing invoice lines", invoiceLines.length)
  for (let i = 0; i < invoiceLines.length; i += 2000) {
    await prisma.invoiceLine.createMany({ data: invoiceLines.slice(i, i + 2000) })
  }
  console.log("writing payments", payments.length)
  for (let i = 0; i < payments.length; i += 2000) {
    await prisma.payment.createMany({ data: payments.slice(i, i + 2000) })
  }
  for (let i = 0; i < emailLogs.length; i += 1000) {
    await prisma.emailLog.createMany({ data: emailLogs.slice(i, i + 1000) })
  }

  await prisma.discountUsage.create({
    data: { discountId: discounts[0].id, invoiceId: invoices[invoices.length - 1].id, amount: 42.5 }
  })

  const runs = []
  for (let i = 0; i < 14; i++) {
    const startedAt = daysAgo(i)
    runs.push({
      id: randomUUID(),
      trigger: i % 5 === 0 ? "MANUAL" : "CRON",
      status: i === 6 ? "PARTIAL" : "SUCCESS",
      startedAt,
      finishedAt: new Date(startedAt.getTime() + int(900, 4200)),
      durationMs: int(900, 4200),
      created: int(4, 38),
      skipped: int(0, 6),
      invoicesOk: int(4, 38),
      errors: i === 6 ? 1 : 0,
      message: i === 6 ? "one subscription had no lines and got skipped" : null,
      actorId: i % 5 === 0 ? admin.id : null,
      createdAt: startedAt
    })
  }
  await prisma.billingRun.createMany({ data: runs })

  await prisma.counter.createMany({
    data: [
      { key: "sub-2026", value: SUB_TOTAL },
      { key: "inv-2026", value: invSeq }
    ]
  })

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    plans: await prisma.plan.count(),
    subscriptions: await prisma.subscription.count(),
    invoices: await prisma.invoice.count(),
    invoiceLines: await prisma.invoiceLine.count(),
    payments: await prisma.payment.count()
  }
  console.log("seed done", counts)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
