import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, Banknote, CircleDollarSign, Mail, Receipt } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { InvoiceActions } from "@/components/billing/invoice-actions"
import { PaymentDialog } from "@/components/billing/payment-dialog"
import { SettleIntentButton } from "@/components/billing/settle-intent-button"
import { formatDate, formatDateTime, money } from "@/lib/utils"
import { isOverdue, paymentState } from "@/server/services/invoices"
import { taxBreakdown } from "@/server/services/pricing"
import { PAYMENT_METHOD_LABEL } from "@/lib/constants"

export const dynamic = "force-dynamic"

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "STAFF"])

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      subscription: { include: { plan: { select: { name: true, period: true } } } },
      lines: { orderBy: { kind: "desc" } },
      payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { name: true } } } },
      emails: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  })
  if (!invoice) notFound()

  const overdue = isOverdue(invoice)
  const state = paymentState(invoice)
  const balance = Number((invoice.total - invoice.amountPaid).toFixed(2))
  const taxes = taxBreakdown(
    invoice.lines.map((line) => ({ taxName: line.taxRate ? `Tax ${line.taxRate}%` : null, taxRate: line.taxRate, taxAmount: line.taxAmount }))
  )
  const productLines = invoice.lines.filter((line) => line.kind === "PRODUCT")
  const discountLines = invoice.lines.filter((line) => line.kind === "DISCOUNT")

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{invoice.number}</h2>
                <StatusBadge status={state} />
                <Badge variant="secondary">{invoice.subscription.plan.name}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Link href={`/customers/${invoice.customer.id}`} className="hover:text-foreground">
                  {invoice.customer.name}
                </Link>
                <Link href={`/subscriptions/${invoice.subscriptionId}`} className="hover:text-foreground">
                  {invoice.subscription.number}
                </Link>
                <span>issued {formatDate(invoice.issueDate)}</span>
                <span>due {formatDate(invoice.dueDate)}</span>
                <span>
                  period {formatDate(invoice.billingPeriodStart)} → {formatDate(invoice.billingPeriodEnd)}
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold">{money(invoice.total)}</p>
              <p className="text-[11px] text-muted-foreground">
                paid {money(invoice.amountPaid)} · balance {money(balance)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
            <InvoiceActions invoiceId={invoice.id} status={invoice.status} overdue={overdue} />
            {invoice.status === "CONFIRMED" && balance > 0.01 && (
              <PaymentDialog
                invoices={[{ id: invoice.id, number: invoice.number, total: invoice.total, amountPaid: invoice.amountPaid }]}
                invoiceId={invoice.id}
                trigger={
                  <Button size="sm" variant="accent">
                    <Banknote className="h-3.5 w-3.5" /> Record payment
                  </Button>
                }
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice lines</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Description</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Unit</Th>
                    <Th className="text-right">Tax</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {productLines.map((line) => (
                    <Tr key={line.id}>
                      <Td className="text-xs font-medium">{line.description}</Td>
                      <Td className="text-right text-xs">{line.quantity}</Td>
                      <Td className="text-right text-xs">{money(line.unitPrice)}</Td>
                      <Td className="text-right text-xs text-muted-foreground">
                        {line.taxRate ? `${line.taxRate}%` : "—"}
                      </Td>
                      <Td className="text-right text-xs font-semibold">{money(line.lineAmount)}</Td>
                    </Tr>
                  ))}
                  {discountLines.map((line) => (
                    <Tr key={line.id}>
                      <Td className="text-xs font-medium text-[color:var(--pos)]">{line.description}</Td>
                      <Td className="text-right text-xs">—</Td>
                      <Td className="text-right text-xs">—</Td>
                      <Td className="text-right text-xs">—</Td>
                      <Td className="text-right text-xs font-semibold text-[color:var(--pos)]">{money(line.lineAmount)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
              <div className="space-y-1.5 border-t border-border/50 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{money(invoice.subtotal)}</span>
                </div>
                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-[color:var(--pos)]">
                    <span>Discount</span>
                    <span>− {money(invoice.discountTotal)}</span>
                  </div>
                )}
                {taxes.map((tax) => (
                  <div key={tax.rate} className="flex justify-between text-muted-foreground">
                    <span>{tax.name}</span>
                    <span>{money(tax.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border/50 pt-2 text-sm font-bold">
                  <span>Total</span>
                  <span>{money(invoice.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoice.payments.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">No payments recorded yet</p>
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Method</Th>
                      <Th>Reference</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Amount</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment) => (
                      <Tr key={payment.id}>
                        <Td className="text-xs">{formatDate(payment.paidAt)}</Td>
                        <Td className="text-xs">{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</Td>
                        <Td className="text-[11px] text-muted-foreground">{payment.reference ?? "—"}</Td>
                        <Td>
                          <StatusBadge status={payment.status} />
                        </Td>
                        <Td className="text-right text-xs font-semibold">{money(payment.amount)}</Td>
                        <Td className="text-right">
                          {payment.status === "PENDING" && <SettleIntentButton paymentId={payment.id} />}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bill to</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p className="text-sm font-semibold">{invoice.customer.name}</p>
              <p className="text-muted-foreground">{invoice.customer.contactName}</p>
              <p className="text-muted-foreground">{invoice.customer.email}</p>
              {invoice.customer.phone && <p className="text-muted-foreground">{invoice.customer.phone}</p>}
              <p className="text-muted-foreground">
                {[invoice.customer.addressLine, invoice.customer.city, invoice.customer.country].filter(Boolean).join(", ")}
              </p>
              {invoice.customer.taxId && <p className="mt-1 text-muted-foreground">Tax id {invoice.customer.taxId}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px]">
              <TimelineRow icon={<Receipt className="h-3 w-3" />} label="Invoice issued" value={formatDateTime(invoice.issueDate)} />
              {invoice.confirmedAt && (
                <TimelineRow icon={<CircleDollarSign className="h-3 w-3" />} label="Confirmed" value={formatDateTime(invoice.confirmedAt)} />
              )}
              {invoice.sentAt && <TimelineRow icon={<Mail className="h-3 w-3" />} label="Marked as sent" value={formatDateTime(invoice.sentAt)} />}
              {invoice.paidAt && <TimelineRow icon={<Banknote className="h-3 w-3" />} label="Paid in full" value={formatDateTime(invoice.paidAt)} />}
              {invoice.cancelledAt && (
                <TimelineRow icon={<Ban className="h-3 w-3" />} label="Cancelled" value={formatDateTime(invoice.cancelledAt)} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.emails.length === 0 && <p className="text-xs text-muted-foreground">No email delivery logged for this invoice</p>}
              {invoice.emails.map((email) => (
                <div key={email.id} className="rounded-[2px] border border-border/60 px-3 py-2">
                  <p className="text-[11px] font-semibold">{email.subject}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {email.status} · {formatDateTime(email.createdAt)}
                  </p>
                </div>
              ))}
              <Link href={`/print/invoice/${invoice.id}`} target="_blank" className="flex items-center justify-between rounded-[2px] border border-border/60 px-3 py-2 text-xs hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)]">
                Open print view <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TimelineRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[2px] bg-secondary/40 px-2.5 py-1.5">
      <span className="text-[color:var(--cobalt)]">{icon}</span>
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-muted-foreground">{value}</span>
    </div>
  )
}

function Ban({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  )
}
