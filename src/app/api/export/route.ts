import { prisma } from "@/lib/prisma"
import { csvResponse, guard, handleError } from "@/lib/api"
import { paymentState } from "@/server/services/invoices"
import { formatDate } from "@/lib/utils"

const MAX_ROWS = 10000

export async function GET(request: Request) {
  try {
    await guard(["ADMIN", "STAFF"])
    const params = new URL(request.url).searchParams
    const type = params.get("type") ?? "invoices"
    const status = params.get("status") ?? undefined
    const planId = params.get("planId") ?? undefined
    const customerId = params.get("customerId") ?? undefined
    const q = params.get("q")?.trim()
    const from = params.get("from") ? new Date(params.get("from")!) : undefined
    const to = params.get("to") ? new Date(params.get("to")!) : undefined

    if (type === "subscriptions") {
      const rows = await prisma.subscription.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(planId ? { planId } : {}),
          ...(customerId ? { customerId } : {}),
          ...(q ? { OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }] } : {})
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { customer: true, plan: true }
      })
      return csvResponse(
        "subscriptions.csv",
        [
          ["number", "customer", "email", "plan", "period", "status", "start", "expiry", "next billing", "subtotal", "discount", "tax", "total"],
          ...rows.map((row) => [
            row.number,
            row.customer.name,
            row.customer.email,
            row.plan.name,
            row.plan.period,
            row.status,
            formatDate(row.startDate),
            formatDate(row.expiryDate),
            row.nextBillingDate ? formatDate(row.nextBillingDate) : "",
            row.subtotal,
            row.discountTotal,
            row.taxTotal,
            row.total
          ])
        ]
      )
    }

    if (type === "payments") {
      const rows = await prisma.payment.findMany({
        where: {
          status: "SETTLED",
          ...(from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          ...(customerId ? { invoice: { customerId } } : {}),
          ...(planId ? { invoice: { subscription: { planId }, ...(customerId ? { customerId } : {}) } } : {})
        },
        orderBy: { paidAt: "desc" },
        take: MAX_ROWS,
        include: { invoice: { include: { customer: true } }, recordedBy: true }
      })
      return csvResponse(
        "payments.csv",
        [
          ["paid on", "invoice", "customer", "method", "amount", "reference", "recorded by"],
          ...rows.map((row) => [
            formatDate(row.paidAt),
            row.invoice.number,
            row.invoice.customer.name,
            row.method,
            row.amount,
            row.reference ?? "",
            row.recordedBy?.name ?? "system"
          ])
        ]
      )
    }

    const rows = await prisma.invoice.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        ...(planId ? { subscription: { planId } } : {}),
        ...(from || to ? { issueDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(q ? { OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }] } : {})
      },
      orderBy: { issueDate: "desc" },
      take: MAX_ROWS,
      include: { customer: true, subscription: { select: { number: true } } }
    })

    return csvResponse(
      type === "overdue" ? "overdue-invoices.csv" : "invoices.csv",
      [
        ["number", "subscription", "customer", "email", "status", "payment state", "issue date", "due date", "period start", "period end", "subtotal", "discount", "tax", "total", "paid", "balance"],
        ...rows.map((row) => [
          row.number,
          row.subscription.number,
          row.customer.name,
          row.customer.email,
          row.status,
          paymentState(row),
          formatDate(row.issueDate),
          formatDate(row.dueDate),
          formatDate(row.billingPeriodStart),
          formatDate(row.billingPeriodEnd),
          row.subtotal,
          row.discountTotal,
          row.taxTotal,
          row.total,
          row.amountPaid,
          Number((row.total - row.amountPaid).toFixed(2))
        ])
      ]
    )
  } catch (error) {
    return handleError(error)
  }
}
