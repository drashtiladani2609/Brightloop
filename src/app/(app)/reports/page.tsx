import Link from "next/link"
import { Download, FileSpreadsheet, TrendingUp } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDashboard, getReportOptions, normalizeFilters } from "@/server/services/reports"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { KpiCard } from "@/components/ui/kpi-card"
import { RangeFilters } from "@/components/dashboard/filters"
import { FilterTabs } from "@/components/ui/filter-tabs"
import { SearchBox, ClearFilters } from "@/components/ui/toolbar"
import { Pagination } from "@/components/ui/pagination"
import { SortHeader } from "@/components/ui/sort-header"
import { RevenueChart, SubscriptionFlowChart, MethodDonut, InvoiceStatusChart, TopPlansChart } from "@/components/charts/charts"
import { PAGE_SIZE, PAYMENT_METHOD_LABEL } from "@/lib/constants"
import { formatDate, money } from "@/lib/utils"
import { paymentState } from "@/server/services/invoices"

export const dynamic = "force-dynamic"

type Search = {
  from?: string
  to?: string
  planId?: string
  customerId?: string
  status?: string
  tab?: string
  q?: string
  page?: string
  sort?: string
  dir?: string
}

export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  await requireRole(["ADMIN", "STAFF"])

  const filters = normalizeFilters(searchParams)
  const [data, options] = await Promise.all([getDashboard(filters), getReportOptions()])

  const tab = searchParams.tab ?? "subscriptions"
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q?.trim()
  const dir = searchParams.dir === "asc" ? "asc" : "desc"
  const scope = {
    ...(filters.planId ? { planId: filters.planId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {})
  }
  const range = { gte: filters.from, lte: filters.to }
  const exportParams = new URLSearchParams({
    type: tab === "payments" ? "payments" : tab === "overdue" ? "overdue" : "subscriptions",
    from: filters.from.toISOString().slice(0, 10),
    to: filters.to.toISOString().slice(0, 10),
    ...(filters.planId ? { planId: filters.planId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {})
  })

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        title="Reports"
        description="Revenue, churn and collections for the selected range, with the detail behind every figure"
        actions={
          <Link href={`/api/export?${exportParams.toString()}`}>
            <Button size="sm" variant="outline">
              <Download className="h-3.5 w-3.5" /> Export this view
            </Button>
          </Link>
        }
      />

      <RangeFilters plans={options.plans} customers={options.customers} showStatus />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue collected" value={data.kpis.revenueCollected} format="currency" icon="revenue" tone="teal" index={0} />
        <KpiCard label="MRR" value={data.kpis.mrr} format="currency" icon="trending" tone="violet" index={1} />
        <KpiCard label="Outstanding" value={data.kpis.outstanding} format="currency" icon="wallet" tone="amber" index={2} hint={`${data.kpis.outstandingCount} open invoices`} />
        <KpiCard label="Overdue" value={data.kpis.overdueAmount} format="currency" icon="alert" tone="rose" index={3} hint={`${data.kpis.overdueCount} invoices past due`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New against closed</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionFlowChart data={data.subSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments by method</CardTitle>
          </CardHeader>
          <CardContent>
            <MethodDonut data={data.paymentsByMethod} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoice status</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceStatusChart data={data.invoiceStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top plans</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPlansChart data={data.topPlans} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[color:var(--pos)]" />
            <CardTitle>Detail tables</CardTitle>
          </div>
          <SearchBox placeholder="Search inside this table" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-y border-border/50 p-3">
            <FilterTabs
              param="tab"
              tabs={[
                { value: "subscriptions", label: "Active subscriptions" },
                { value: "payments", label: "Payments" },
                { value: "overdue", label: "Overdue invoices" }
              ]}
            />
          </div>

          {tab === "payments" && <PaymentsTable filters={filters} q={q} page={page} dir={dir} sort={searchParams.sort} />}
          {tab === "overdue" && <OverdueTable filters={filters} q={q} page={page} dir={dir} sort={searchParams.sort} />}
          {tab === "subscriptions" && (
            <SubscriptionsTable filters={filters} q={q} page={page} dir={dir} sort={searchParams.sort} scope={scope} range={range} />
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" /> Aggregates are cached for 20 seconds. Filters and tables always hit the database.
      </p>
    </div>
  )
}

async function SubscriptionsTable({
  filters,
  q,
  page,
  dir,
  sort,
  scope,
  range
}: {
  filters: ReturnType<typeof normalizeFilters>
  q?: string
  page: number
  dir: "asc" | "desc"
  sort?: string
  scope: Record<string, string>
  range: { gte: Date; lte: Date }
}) {
  const orderField = sort === "total" ? "total" : sort === "number" ? "number" : "startDate"
  const where = {
    status: "ACTIVE",
    ...scope,
    startDate: range,
    ...(q ? { OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }] } : {})
  }
  const [total, rows] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { [orderField]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { id: true, name: true } }, plan: { select: { name: true, period: true } } }
    })
  ])

  if (!rows.length) return <p className="p-8 text-center text-xs text-muted-foreground">Nothing in this range</p>

  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>
              <SortHeader label="Number" field="number" />
            </Th>
            <Th>Customer</Th>
            <Th>Plan</Th>
            <Th>Start</Th>
            <Th>Next billing</Th>
            <Th>Status</Th>
            <Th className="text-right">
              <SortHeader label="Contract value" field="total" />
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.id}>
              <Td>
                <Link href={`/subscriptions/${row.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                  {row.number}
                </Link>
              </Td>
              <Td className="text-xs">{row.customer.name}</Td>
              <Td className="text-xs text-muted-foreground">
                {row.plan.name} /{row.plan.period.toLowerCase()}
              </Td>
              <Td className="text-xs text-muted-foreground">{formatDate(row.startDate)}</Td>
              <Td className="text-xs text-muted-foreground">{row.nextBillingDate ? formatDate(row.nextBillingDate) : "—"}</Td>
              <Td>
                <StatusBadge status={row.status} />
              </Td>
              <Td className="text-right text-xs font-semibold">{money(row.total)}</Td>
            </Tr>
          ))}
        </tbody>
      </TableWrap>
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </>
  )
}

async function PaymentsTable({
  filters,
  q,
  page,
  dir,
  sort
}: {
  filters: ReturnType<typeof normalizeFilters>
  q?: string
  page: number
  dir: "asc" | "desc"
  sort?: string
}) {
  const orderField = sort === "method" ? "method" : "paidAt"
  const where = {
    status: "SETTLED",
    paidAt: { gte: filters.from, lte: filters.to },
    invoice: {
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.planId ? { subscription: { planId: filters.planId } } : {})
    },
    ...(q ? { OR: [{ reference: { contains: q } }, { invoice: { number: { contains: q } } }] } : {})
  }
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { [orderField]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } }
    })
  ])

  if (!rows.length) return <p className="p-8 text-center text-xs text-muted-foreground">No payments in this range</p>

  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>
              <SortHeader label="Paid on" field="paidAt" />
            </Th>
            <Th>Invoice</Th>
            <Th>Customer</Th>
            <Th>
              <SortHeader label="Method" field="method" />
            </Th>
            <Th className="text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.id}>
              <Td className="text-xs">{formatDate(row.paidAt)}</Td>
              <Td>
                <Link href={`/invoices/${row.invoice.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                  {row.invoice.number}
                </Link>
              </Td>
              <Td className="text-xs">{row.invoice.customer.name}</Td>
              <Td className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABEL[row.method] ?? row.method}</Td>
              <Td className="text-right text-xs font-semibold">{money(row.amount)}</Td>
            </Tr>
          ))}
        </tbody>
      </TableWrap>
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </>
  )
}

async function OverdueTable({
  filters,
  q,
  page,
  dir,
  sort
}: {
  filters: ReturnType<typeof normalizeFilters>
  q?: string
  page: number
  dir: "asc" | "desc"
  sort?: string
}) {
  const orderField = sort === "total" ? "total" : "dueDate"
  const where = {
    status: "CONFIRMED",
    dueDate: { lt: new Date() },
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.planId ? { subscription: { planId: filters.planId } } : {}),
    ...(q ? { OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }] } : {})
  }
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { [orderField]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { id: true, name: true } } }
    })
  ])

  if (!rows.length) return <p className="p-8 text-center text-xs text-muted-foreground">No overdue invoices. Nice work</p>

  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>Number</Th>
            <Th>Customer</Th>
            <Th>
              <SortHeader label="Due" field="dueDate" />
            </Th>
            <Th>Days late</Th>
            <Th>Status</Th>
            <Th className="text-right">
              <SortHeader label="Balance" field="total" />
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const daysLate = Math.floor((Date.now() - row.dueDate.getTime()) / 86400000)
            return (
              <Tr key={row.id}>
                <Td>
                  <Link href={`/invoices/${row.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                    {row.number}
                  </Link>
                </Td>
                <Td className="text-xs">{row.customer.name}</Td>
                <Td className="text-xs text-muted-foreground">{formatDate(row.dueDate)}</Td>
                <Td>
                  <span className="rounded-none bg-[color-mix(in_srgb,var(--neg)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--neg)]">
                    {daysLate} days
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={paymentState(row)} />
                </Td>
                <Td className="text-right text-xs font-semibold">{money(row.total - row.amountPaid)}</Td>
              </Tr>
            )
          })}
        </tbody>
      </TableWrap>
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </>
  )
}
