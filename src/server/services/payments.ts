import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { round2 } from "@/lib/utils"
import { PAYMENT_METHOD_LABEL } from "@/lib/constants"
import type { Actor } from "@/server/services/subscriptions"

type InvoiceSnapshot = { id: string; total: number; amountPaid: number; status: string; customerId: string; number: string }

async function loadInvoice(invoiceId: string): Promise<InvoiceSnapshot> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, total: true, amountPaid: true, status: true, customerId: true, number: true }
  })
  if (!invoice) throw new ApiError("Invoice not found", 404)
  if (invoice.status === "CANCELLED") throw new ApiError("Invoice is cancelled", 409)
  return invoice
}

export async function recordPayment(
  input: { invoiceId: string; method: string; amount: number; paidAt: string; reference?: string; note?: string },
  actor: Actor,
  opts?: { customerId?: string; settled?: boolean }
) {
  const invoice = await loadInvoice(input.invoiceId)
  if (opts?.customerId && invoice.customerId !== opts.customerId) throw new ApiError("Invoice not yours", 403)
  if (invoice.status === "DRAFT") throw new ApiError("Confirm the invoice before taking payment", 409)

  const outstanding = round2(invoice.total - invoice.amountPaid)
  if (opts?.settled !== false && input.amount - outstanding > 0.01) {
    throw new ApiError(`Amount is more than the outstanding ${outstanding}`, 422)
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        method: input.method,
        amount: round2(input.amount),
        paidAt: new Date(input.paidAt),
        reference: input.reference || null,
        note: input.note || null,
        recordedById: actor.id,
        status: opts?.settled === false ? "PENDING" : "SETTLED"
      }
    })

    if (payment.status === "SETTLED") {
      const agg = await tx.payment.aggregate({
        where: { invoiceId: invoice.id, status: "SETTLED" },
        _sum: { amount: true }
      })
      const amountPaid = round2(agg._sum.amount ?? 0)
      const isPaid = amountPaid + 0.01 >= invoice.total
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid,
          status: isPaid ? "PAID" : invoice.status,
          paidAt: isPaid ? new Date() : null
        }
      })
    }

    return payment
  })
}

export async function settleIntent(paymentId: string, actor: Actor) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new ApiError("Payment not found", 404)
  if (payment.status === "SETTLED") throw new ApiError("Payment already settled", 409)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SETTLED", recordedById: actor.id, note: `${payment.note ?? ""} settled manually`.trim() }
    })
    const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } })
    if (!invoice) return updated
    const agg = await tx.payment.aggregate({
      where: { invoiceId: invoice.id, status: "SETTLED" },
      _sum: { amount: true }
    })
    const amountPaid = round2(agg._sum.amount ?? 0)
    const isPaid = amountPaid + 0.01 >= invoice.total
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid, status: isPaid ? "PAID" : invoice.status, paidAt: isPaid ? new Date() : null }
    })
    return updated
  })
}

export async function paymentSummaryForInvoice(invoiceId: string) {
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: "desc" },
    include: { recordedBy: { select: { name: true } } }
  })
  return payments.map((p) => ({
    id: p.id,
    method: PAYMENT_METHOD_LABEL[p.method] ?? p.method,
    amount: p.amount,
    paidAt: p.paidAt,
    status: p.status,
    reference: p.reference,
    note: p.note,
    by: p.recordedBy?.name ?? "System"
  }))
}
