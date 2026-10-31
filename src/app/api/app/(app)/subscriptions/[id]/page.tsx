import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, CalendarDays, Clock, FileText, Receipt, User } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { SubStepper } from "@/components/subscriptions/sub-stepper"
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions"
import { PaymentDialog } from "@/components/billing/payment-dialog"
import { formatDate, formatDateTime, money } from "@/lib/utils"
import { PAYMENT_TERMS_LABEL } from "@/lib/constants"
import { paymentState } from "@/server/services/invoices"
import { taxBreakdown } from "@/server/services/pricing"

export const dynamic = "force-dynamic"

export default async function SubscriptionDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "STAFF"])

  const sub = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      plan: true,
      createdBy: { select: { name: true } },
      lines: { include: { product: true, variant: true } },
      invoices: { orderBy: { issueDate: "desc" }, take: 10 },
      events: { orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { name: true } } } }
    }
  })
  if (!sub) notFound()

  const taxLines = sub.lines.map((line) => ({
    taxName: line.taxRuleId ? "Tax" : null,
    taxRate: line.taxRate,
    taxAmount: line.taxAmount
  }))
  const grouped = new Map<string, { name: string; rate: number; amount: number }>()
  for (const line of taxLines) {
    if (!line.taxRate || !line.taxAmount) continue
    const key = `${line.taxRate}`
    const prev = grouped.get(key)
    grouped.set(key, { name: `Tax ${line.taxRate}%`, rate: line.taxRate, amount: (prev?.amount ?? 0) + line.taxAmount })
  }
  const taxRows = Array.from(grouped.values())
  void taxBreakdown

  const openInvoices = sub.invoices
    .filter((invoice) => invoice.status === "CONFIRMED")
    .map((invoice) => ({ id: invoice.id, number: invoice.number, total: invoice.total, amountPaid: invoice.amountPaid }))

  const available: { action: "SEND_QUOTATION" | "CONFIRM" | "ACTIVATE" | "PAUSE" | "RESUME" | "CLOSE" | "RENEW"; disabledReason?: string }[] = []
  const status = sub.status

  if (status === "DRAFT") available.push({ action: "SEND_QUOTATION" })
  if (status === "QUOTATION") available.push({ action: "CONFIRM" })
  if (status === "CONFIRMED") available.push({ action: "ACTIVATE" })
  if (status === "ACTIVE") {
    available.push({
      action: "PAUSE",
      disabledReason: sub.plan.pausable ? undefined : "This plan is not pausable"
    })
    available.push({
      action: "CLOSE",
      disabledReason: sub.plan.closableEarly || new Date() >= sub.expiryDate ? undefined : "This plan cannot close before its end date"
    })
  }
  if (status === "PAUSED") available.push({ action: "RESUME" })
  if (status === "CLOSED" || status === "ACTIVE") {
    available.push({ action: "RENEW", disabledReason: sub.plan.renewable ? undefined : "This plan is not renewable" })
  }
  if (["DRAFT", "QUOTATION", "CONFIRMED"].includes(status)) {
    available.push({ action: "CLOSE", disabledReason: status === "CONFIRMED" ? undefined : undefined })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{sub.number}</h2>
                <StatusBadge status={sub.status} />
                <Badge variant="secondary">{sub.plan.name}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Link href={`/customers/${sub.customer.id}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <User className="h-3 w-3" /> {sub.customer.name}
                </Link>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" /> {formatDate(sub.startDate)} → {formatDate(sub.expiryDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {PAYMENT_TERMS_LABEL[sub.paymentTerms]}
                </span>
                <span>created by {sub.createdBy?.name ?? "system"}</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-2xl font-bold">{money(sub.total)}</p>
              <p className="text-[11px] text-muted-foreground">
                next billing {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "none"}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-border/50 pt-3">
            <SubStepper status={sub.status} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SubscriptionActions subscriptionId={sub.id} available={available} />
            {openInvoices.length > 0 && (
              <PaymentDialog
                invoices={openInvoices}
                trigger={
                  <Button size="sm" variant="outline">
                    <Receipt className="h-3.5 w-3.5" /> Take payment
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Lines</CardTitle>
              <span className="text-[11px] text-muted-foreground">
                quotation valid till {sub.quotationValidUntil ? formatDate(sub.quotationValidUntil) : "n/a"}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Item</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Unit</Th>
                    <Th className="text-right">Tax</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {sub.lines.map((line) => (
                    <Tr key={line.id}>
                      <Td>
                        <p className="text-xs font-medium">{line.product.name}</p>
                        {line.variant && (
                          <p className="text-[10px] text-muted-foreground">
                            {line.variant.attribute}: {line.variant.value}
                          </p>
                        )}
                      </Td>
                      <Td className="text-right text-xs">{line.quantity}</Td>
                      <Td className="text-right text-xs">{money(line.unitPrice)}</Td>
                      <Td className="text-right text-xs text-muted-foreground">
                        {line.taxRate ? `${line.taxRate}%` : "—"}
                      </Td>
                      <Td className="text-right text-xs font-semibold">{money(line.lineAmount)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
              <div className="space-y-1.5 border-t border-border/50 p-4 text-xs">
                <Row label="Subtotal" value={money(sub.subtotal)} />
                <Row label="Discount" value={`− ${money(sub.discountTotal)}`} muted />
                {taxRows.map((tax) => (
                  <Row key={tax.rate} label={tax.name} value={money(tax.amount)} muted />
                ))}
                <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm font-bold">
                  <span>Total</span>
                  <span>{money(sub.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Invoices on this subscription</CardTitle>
              <Link href={`/invoices?customerId=${sub.customerId}`} className="text-xs text-[color:var(--cobalt)] hover:underline">
                All invoices
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {sub.invoices.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  No invoices yet. Activate the subscription or run billing
                </p>
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Number</Th>
                      <Th>Period</Th>
                      <Th>Due</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sub.invoices.map((invoice) => (
                      <Tr key={invoice.id}>
                        <Td>
                          <Link href={`/invoices/${invoice.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                            {invoice.number}
                          </Link>
                        </Td>
                        <Td className="text-[11px] text-muted-foreground">
                          {formatDate(invoice.billingPeriodStart)} → {formatDate(invoice.billingPeriodEnd)}
                        </Td>
                        <Td className="text-xs text-muted-foreground">{formatDate(invoice.dueDate)}</Td>
                        <Td>
                          <StatusBadge status={paymentState(invoice)} />
                        </Td>
                        <Td className="text-right text-xs font-semibold">{money(invoice.total)}</Td>
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
              <CardTitle>Plan rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Billing period" value={sub.plan.period} />
              <Row label="Minimum quantity" value={String(sub.plan.minQuantity)} />
              <Row label="Pausable" value={sub.plan.pausable ? "yes" : "no"} />
              <Row label="Close early" value={sub.plan.closableEarly ? "yes" : "no"} />
              <Row label="Renewable" value={sub.plan.renewable ? "yes" : "no"} />
              <Row label="Auto close on end" value={sub.plan.autoCloseOnEnd ? "yes" : "no"} />
              <Row label="Quotation validity" value={`${sub.quotationValidityDays} days`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-border/60 pl-4">
                {sub.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-none bg-[color-mix(in_srgb,var(--cobalt)_30%,transparent)] ring-4 ring-background" />
                    <p className="text-xs font-semibold">
                      {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `created as ${event.toStatus}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(event.createdAt)} · {event.actor?.name ?? "system"}
                    </p>
                    {event.note && <p className="mt-1 rounded-[2px] bg-secondary/50 px-2 py-1 text-[10px]">{event.note}</p>}
                  </li>
                ))}
                {sub.events.length === 0 && <p className="text-xs text-muted-foreground">No events recorded</p>}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/customers/${sub.customer.id}`} className="flex items-center justify-between rounded-[2px] border border-border/60 px-3 py-2 text-xs transition hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)]">
                Customer profile <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/subscriptions?customerId=${sub.customerId}`} className="flex items-center justify-between rounded-[2px] border border-border/60 px-3 py-2 text-xs transition hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)]">
                Other subscriptions <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              {sub.invoices[0] && (
                <Link href={`/invoices/${sub.invoices[0].id}/print`} className="flex items-center justify-between rounded-[2px] border border-border/60 px-3 py-2 text-xs transition hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)]">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Latest invoice print view
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium"}>{value}</span>
    </div>
  )
}
