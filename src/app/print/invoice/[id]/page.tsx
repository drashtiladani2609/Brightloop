import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { PrintButton } from "@/components/billing/print-button"
import { formatDate, money } from "@/lib/utils"
import { taxBreakdown } from "@/server/services/pricing"
import { PAYMENT_METHOD_LABEL, PAYMENT_TERMS_LABEL } from "@/lib/constants"
import { paymentState } from "@/server/services/invoices"

export const dynamic = "force-dynamic"

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const user = await requireUser()

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      subscription: { include: { plan: true } },
      lines: true,
      payments: true
    }
  })
  if (!invoice) notFound()

  if (user.role === "CUSTOMER" && invoice.customerId !== user.customer?.id) redirect("/portal/invoices")

  const taxes = taxBreakdown(
    invoice.lines.map((line) => ({ taxName: line.taxRate ? `Tax ${line.taxRate}%` : null, taxRate: line.taxRate, taxAmount: line.taxAmount }))
  )
  const balance = invoice.total - invoice.amountPaid
  const state = paymentState(invoice)

  return (
    <div className="min-h-screen bg-[var(--paper)] py-8 text-[var(--ink)] print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex justify-end gap-2 print:hidden">
          <PrintButton />
        </div>

        <article className="print-sheet mx-auto max-w-3xl border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] p-10 text-[var(--ink)] shadow-[6px_6px_0_0_var(--offset)] print:border-0 print:bg-white print:p-0 print:shadow-none">
          <header className="flex items-start justify-between border-b border-[color-mix(in_srgb,var(--line)_40%,transparent)] pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center border-[1.5px] border-[color:var(--line)] bg-[var(--lime)] font-display text-[18px] leading-none text-[#141210]">
                  B
                </span>
                <div>
                  <p className="font-display text-[20px] leading-none">Brightloop Billing</p>
                  <p className="mono-label mt-1 text-[8px] text-[color:var(--muted-text)]">Recurring revenue platform</p>
                </div>
              </div>
              <div className="mt-3 text-[11px] leading-relaxed text-[color:var(--muted-text)]">
                <p>Brightloop Systems Pvt Ltd</p>
                <p>14 Ring Road, Rajkot, Gujarat 360001</p>
                <p>GSTIN24AABCB1234C1ZP · billing@brightloop.app</p>
              </div>
            </div>
            <div className="text-right">
              <p className="mono-label text-[color:var(--muted-text)]">Invoice</p>
              <p className="text-xl font-bold">{invoice.number}</p>
              <p className="mt-2 text-[11px] text-[color:var(--muted-text)]">Issued {formatDate(invoice.issueDate)}</p>
              <p className="text-[11px] text-[color:var(--muted-text)]">Due {formatDate(invoice.dueDate)}</p>
              <p className="mt-1 inline-block rounded-none bg-[color-mix(in_srgb,var(--line)_6%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted-text)]">
                {state.toLowerCase().replace("_", " ")}
              </p>
            </div>
          </header>

          <section className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-text)]">Billed to</p>
              <p className="mt-1 text-sm font-semibold">{invoice.customer.name}</p>
              <div className="text-[11px] leading-relaxed text-[color:var(--muted-text)]">
                <p>{invoice.customer.contactName}</p>
                <p>{invoice.customer.email}</p>
                {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
                <p>
                  {[invoice.customer.addressLine, invoice.customer.city, invoice.customer.country].filter(Boolean).join(", ")}
                </p>
                {invoice.customer.taxId && <p>Tax id {invoice.customer.taxId}</p>}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-text)]">Subscription</p>
              <p className="mt-1 text-sm font-semibold">{invoice.subscription.number}</p>
              <div className="text-[11px] leading-relaxed text-[color:var(--muted-text)]">
                <p>{invoice.subscription.plan.name} · {invoice.subscription.plan.period.toLowerCase()}</p>
                <p>Terms {PAYMENT_TERMS_LABEL[invoice.subscription.paymentTerms]}</p>
                <p>
                  Period {formatDate(invoice.billingPeriodStart)} to {formatDate(invoice.billingPeriodEnd)}
                </p>
              </div>
            </div>
          </section>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-y border-[color-mix(in_srgb,var(--line)_40%,transparent)] text-left text-[9px] uppercase tracking-wider text-[color:var(--muted-text)]">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit price</th>
                <th className="py-2 text-right">Tax</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-[color-mix(in_srgb,var(--line)_40%,transparent)]">
                  <td className={line.kind === "DISCOUNT" ? "py-2 text-[color:var(--pos)]" : "py-2"}>{line.description}</td>
                  <td className="py-2 text-right">{line.kind === "DISCOUNT" ? "—" : line.quantity}</td>
                  <td className="py-2 text-right">{line.kind === "DISCOUNT" ? "—" : money(line.unitPrice)}</td>
                  <td className="py-2 text-right text-[color:var(--muted-text)]">{line.taxRate ? `${line.taxRate}%` : "—"}</td>
                  <td className="py-2 text-right font-medium">{money(line.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="mt-5 flex flex-col items-end gap-1 text-[11px]">
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-[color:var(--muted-text)]">Subtotal</span>
              <span className="font-medium">{money(invoice.subtotal)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex w-full max-w-xs justify-between text-[color:var(--pos)]">
                <span>Discount</span>
                <span>− {money(invoice.discountTotal)}</span>
              </div>
            )}
            {taxes.map((tax) => (
              <div key={tax.rate} className="flex w-full max-w-xs justify-between text-[color:var(--muted-text)]">
                <span>{tax.name}</span>
                <span>{money(tax.amount)}</span>
              </div>
            ))}
            <div className="mt-1 flex w-full max-w-xs justify-between border-t border-[color-mix(in_srgb,var(--line)_40%,transparent)] pt-2 text-sm font-bold">
              <span>Total</span>
              <span>{money(invoice.total)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between text-[color:var(--muted-text)]">
              <span>Paid</span>
              <span>{money(invoice.amountPaid)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between font-semibold">
              <span>Balance due</span>
              <span>{money(balance)}</span>
            </div>
          </section>

          {invoice.payments.length > 0 && (
            <section className="mt-6 rounded-[2px] border border-[color-mix(in_srgb,var(--line)_40%,transparent)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-text)]">Payments received</p>
              <table className="mt-2 w-full text-[11px]">
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-[color-mix(in_srgb,var(--line)_40%,transparent)]">
                      <td className="py-1.5">{formatDate(payment.paidAt)}</td>
                      <td className="py-1.5">{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</td>
                      <td className="py-1.5">{payment.reference ?? "—"}</td>
                      <td className="py-1.5 text-right font-medium">{money(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <footer className="mt-8 border-t border-[color-mix(in_srgb,var(--line)_40%,transparent)] pt-4 text-[10px] leading-relaxed text-[color:var(--muted-text)]">
            <p>Payment terms {PAYMENT_TERMS_LABEL[invoice.subscription.paymentTerms]} from the issue date.</p>
            <p>Late payments may pause service. Questions? billing@brightloop.app</p>
            <p className="mt-2 text-[color:var(--muted-text)]">Generated by Brightloop Billing · {invoice.number}</p>
          </footer>
        </article>
      </div>
    </div>
  )
}
