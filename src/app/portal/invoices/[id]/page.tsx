import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import { requirePortalUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { PayInvoiceDialog } from "@/components/portal/pay-invoice-dialog"
import { formatDate, money } from "@/lib/utils"
import { paymentState } from "@/server/services/invoices"
import { PAYMENT_METHOD_LABEL } from "@/lib/constants"

export const dynamic = "force-dynamic"

export default async function PortalInvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePortalUser()

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      subscription: { include: { plan: true } },
      lines: true,
      payments: { orderBy: { paidAt: "desc" } }
    }
  })
  if (!invoice) notFound()
  if (invoice.customerId !== user.customer?.id) redirect("/portal/invoices")

  const balance = invoice.total - invoice.amountPaid

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/portal/invoices" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to invoices
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{invoice.number}</h2>
              <StatusBadge status={paymentState(invoice)} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {invoice.subscription.plan.name} · issued {formatDate(invoice.issueDate)} · due {formatDate(invoice.dueDate)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              period {formatDate(invoice.billingPeriodStart)} → {formatDate(invoice.billingPeriodEnd)}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-2xl font-bold">{money(invoice.total)}</p>
            <div className="flex gap-2">
              {invoice.status === "CONFIRMED" && balance > 0.01 && (
                <PayInvoiceDialog
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.number}
                  balance={balance}
                  trigger={
                    <Button size="sm" variant="accent">
                      Pay {money(balance)}
                    </Button>
                  }
                />
              )}
              <Link href={`/print/invoice/${invoice.id}`} target="_blank">
                <Button size="sm" variant="outline">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableWrap>
            <thead>
              <tr>
                <Th>Description</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Unit</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <Tr key={line.id}>
                  <Td className="text-xs">{line.description}</Td>
                  <Td className="text-right text-xs">{line.kind === "DISCOUNT" ? "—" : line.quantity}</Td>
                  <Td className="text-right text-xs">{line.kind === "DISCOUNT" ? "—" : money(line.unitPrice)}</Td>
                  <Td className="text-right text-xs font-semibold">{money(line.lineAmount)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="space-y-1.5 border-t border-border/50 p-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-[color:var(--pos)]">
                <span>Discount</span>
                <span>− {money(invoice.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{money(invoice.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-2 text-sm font-bold">
              <span>Total</span>
              <span>{money(invoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{money(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance</span>
              <span>{money(balance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoice.payments.length === 0 && <p className="text-xs text-muted-foreground">No payments yet</p>}
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-2 rounded-[2px] border border-border/60 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{formatDate(payment.paidAt)}</span>
              <span>{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</span>
              <StatusBadge status={payment.status} />
              <span className="ml-auto font-semibold">{money(payment.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
