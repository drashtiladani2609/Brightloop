import { Wallet } from "lucide-react"
import { requirePortalUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, money } from "@/lib/utils"
import { PAYMENT_METHOD_LABEL } from "@/lib/constants"

export const dynamic = "force-dynamic"

export default async function PortalPaymentsPage() {
  const user = await requirePortalUser()

  const payments = await prisma.payment.findMany({
    where: { invoice: { customerId: user.customer!.id } },
    orderBy: { paidAt: "desc" },
    take: 100,
    include: { invoice: { select: { id: true, number: true } } }
  })

  const settled = payments.filter((p) => p.status === "SETTLED").reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Payment history" description={`${money(settled)} settled across ${payments.length} records`} />

      <Card>
        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payments you submit from an invoice show up here"
            icon={<Wallet className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        ) : (
          <CardContent className="p-0">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Invoice</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="text-xs">{formatDate(payment.paidAt)}</Td>
                    <Td className="text-xs font-medium">{payment.invoice.number}</Td>
                    <Td>
                      <Badge variant="secondary">{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</Badge>
                    </Td>
                    <Td className="text-[11px] text-muted-foreground">{payment.reference ?? "—"}</Td>
                    <Td>
                      <StatusBadge status={payment.status} />
                    </Td>
                    <Td className="text-right text-xs font-semibold">{money(payment.amount)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
