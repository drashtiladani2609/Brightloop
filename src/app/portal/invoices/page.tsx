import Link from "next/link"
import { FileText, Printer } from "lucide-react"
import { requirePortalUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { PayInvoiceDialog } from "@/components/portal/pay-invoice-dialog"
import { formatDate, money } from "@/lib/utils"
import { paymentState } from "@/server/services/invoices"

export const dynamic = "force-dynamic"

export default async function PortalInvoicesPage({ searchParams }: { searchParams: { subscription?: string } }) {
  const user = await requirePortalUser()

  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: user.customer!.id,
      ...(searchParams.subscription ? { subscriptionId: searchParams.subscription } : {})
    },
    orderBy: { issueDate: "desc" },
    take: 100,
    include: { subscription: { select: { number: true, plan: { select: { name: true } } } } }
  })

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="My invoices"
        description="Print any invoice or register a payment against the ones still open"
      />

      <Card>
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Invoices are issued automatically each billing period"
            icon={<FileText className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        ) : (
          <CardContent className="p-0">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Plan</Th>
                  <Th>Issued</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const balance = invoice.total - invoice.amountPaid
                  return (
                    <Tr key={invoice.id}>
                      <Td>
                        <Link href={`/portal/invoices/${invoice.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                          {invoice.number}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">{invoice.subscription.number}</p>
                      </Td>
                      <Td className="text-xs">{invoice.subscription.plan.name}</Td>
                      <Td className="text-xs text-muted-foreground">{formatDate(invoice.issueDate)}</Td>
                      <Td className="text-xs text-muted-foreground">{formatDate(invoice.dueDate)}</Td>
                      <Td>
                        <StatusBadge status={paymentState(invoice)} />
                      </Td>
                      <Td className="text-right text-xs font-semibold">{money(invoice.total)}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1.5">
                          {invoice.status === "CONFIRMED" && balance > 0.01 && (
                            <PayInvoiceDialog
                              invoiceId={invoice.id}
                              invoiceNumber={invoice.number}
                              balance={balance}
                              trigger={
                                <Button size="sm" variant="accent" className="h-7 text-[11px]">
                                  Pay {money(balance)}
                                </Button>
                              }
                            />
                          )}
                          <Link href={`/print/invoice/${invoice.id}`} target="_blank">
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
