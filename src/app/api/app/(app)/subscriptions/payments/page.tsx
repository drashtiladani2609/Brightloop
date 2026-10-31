import Link from "next/link"
import { Download, Wallet } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { SearchBox, FilterSelect, ClearFilters } from "@/components/ui/toolbar"
import { SortHeader } from "@/components/ui/sort-header"
import { Pagination } from "@/components/ui/pagination"
import { PaymentDialog } from "@/components/billing/payment-dialog"
import { SettleIntentButton } from "@/components/billing/settle-intent-button"
import { PAGE_SIZE, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/constants"
import { formatDate, money } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: { q?: string; method?: string; status?: string; page?: string; sort?: string; dir?: string }
}) {
  await requireRole(["ADMIN", "STAFF"])

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const sort = searchParams.sort === "amount" ? "amount" : "paidAt"
  const dir = searchParams.dir === "asc" ? "asc" : "desc"
  const q = searchParams.q?.trim()

  const where = {
    ...(searchParams.method ? { method: searchParams.method } : {}),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { invoice: { number: { contains: q } } },
            { invoice: { customer: { name: { contains: q } } } }
          ]
        }
      : {})
  }

  const [total, rows, totals, pending, openInvoices] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        invoice: { select: { id: true, number: true, customer: { select: { id: true, name: true } } } },
        recordedBy: { select: { name: true } }
      }
    }),
    prisma.payment.aggregate({ where: { status: "SETTLED" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.invoice.findMany({
      where: { status: "CONFIRMED" },
      orderBy: { dueDate: "asc" },
      take: 60,
      select: { id: true, number: true, total: true, amountPaid: true }
    })
  ])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Payments"
        description="Every settled payment and every customer intent waiting for confirmation"
        actions={
          <>
            <Link href="/api/export?type=payments">
              <Button size="sm" variant="outline">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </Link>
            <PaymentDialog
              invoices={openInvoices}
              trigger={
                <Button size="sm">
                  <Wallet className="h-3.5 w-3.5" /> Record payment
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Collected all time", money(totals._sum.amount ?? 0)],
          ["Settled payments", totals._count._all.toLocaleString("en-US")],
          ["Pending intents", String(pending)]
        ].map(([label, value], i) => (
          <Card key={label} className="relative overflow-hidden p-3.5">
            <span
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ background: ["var(--lime)", "var(--cobalt)", "var(--warn)"][i] }}
            />
            <p className="mono-label pl-1.5 text-[color:var(--muted-text)]">{label}</p>
            <p className="num mt-2 pl-1.5 text-[25px] leading-none">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-border/50 p-3 sm:flex-row sm:items-center">
          <SearchBox placeholder="Search reference, invoice or customer" />
          <FilterSelect
            param="method"
            placeholder="Any method"
            options={PAYMENT_METHODS.map((method) => ({ value: method, label: PAYMENT_METHOD_LABEL[method] }))}
          />
          <FilterSelect
            param="status"
            placeholder="Any status"
            options={[
              { value: "SETTLED", label: "Settled" },
              { value: "PENDING", label: "Pending" }
            ]}
          />
          <ClearFilters className="sm:ml-auto" />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Record a payment against a confirmed invoice to see it here"
            icon={<Wallet className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>
                    <SortHeader label="Paid on" field="paidAt" />
                  </Th>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                  <Th className="text-right">
                    <SortHeader label="Amount" field="amount" />
                  </Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="text-xs">{formatDate(payment.paidAt)}</Td>
                    <Td>
                      <Link href={`/invoices/${payment.invoice.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                        {payment.invoice.number}
                      </Link>
                    </Td>
                    <Td className="text-xs">{payment.invoice.customer.name}</Td>
                    <Td>
                      <Badge variant="secondary">{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</Badge>
                    </Td>
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
            <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
          </>
        )}
      </Card>
    </div>
  )
}
