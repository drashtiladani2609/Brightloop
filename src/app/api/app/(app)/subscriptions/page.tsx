import Link from "next/link"
import { ChevronRight, Download, Layers, Plus } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { SearchBox, FilterSelect, ClearFilters } from "@/components/ui/toolbar"
import { SortHeader } from "@/components/ui/sort-header"
import { Pagination } from "@/components/ui/pagination"
import { FilterTabs } from "@/components/ui/filter-tabs"
import { PAGE_SIZE, SUB_FLOW } from "@/lib/constants"
import { formatDate, money } from "@/lib/utils"

export const dynamic = "force-dynamic"

const SORTABLE: Record<string, string> = {
  number: "number",
  total: "total",
  startDate: "startDate",
  expiryDate: "expiryDate",
  nextBillingDate: "nextBillingDate",
  createdAt: "createdAt"
}

export default async function SubscriptionsPage({
  searchParams
}: {
  searchParams: { q?: string; status?: string; planId?: string; customerId?: string; page?: string; sort?: string; dir?: string }
}) {
  await requireRole(["ADMIN", "STAFF"])

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const sort = SORTABLE[searchParams.sort ?? "createdAt"] ?? "createdAt"
  const dir = searchParams.dir === "asc" ? "asc" : "desc"
  const q = searchParams.q?.trim()

  const where = {
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.planId ? { planId: searchParams.planId } : {}),
    ...(searchParams.customerId ? { customerId: searchParams.customerId } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { email: { contains: q } } }
          ]
        }
      : {})
  }

  const [total, rows, statusCounts, plans, customers] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { id: true, name: true } },
        plan: { select: { name: true, period: true } },
        _count: { select: { invoices: true } }
      }
    }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.plan.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 })
  ])

  const countFor = (status: string) => statusCounts.find((row) => row.status === status)?._count._all ?? 0
  const allCount = statusCounts.reduce((sum, row) => sum + row._count._all, 0)
  const exportQuery = new URLSearchParams({
    type: "subscriptions",
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.planId ? { planId: searchParams.planId } : {}),
    ...(searchParams.customerId ? { customerId: searchParams.customerId } : {}),
    ...(q ? { q } : {})
  })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Subscriptions"
        description="Draft to closed with a full status trail. Plan rules decide what each subscription may do"
        actions={
          <>
            <Link href={`/api/export?${exportQuery.toString()}`}>
              <Button size="sm" variant="outline">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </Link>
            <Link href="/subscriptions/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New subscription
              </Button>
            </Link>
          </>
        }
      />

      <Card>
        <div className="space-y-2 border-b border-border/50 p-3">
          <FilterTabs
            tabs={[
              { value: "", label: "All", count: allCount },
              ...SUB_FLOW.map((status) => ({ value: status, label: status, count: countFor(status) })),
              { value: "PAUSED", label: "PAUSED", count: countFor("PAUSED") }
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox placeholder="Search number or customer" />
            <FilterSelect param="planId" placeholder="All plans" options={plans.map((p) => ({ value: p.id, label: p.name }))} />
            <FilterSelect
              param="customerId"
              placeholder="All customers"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
            <ClearFilters className="sm:ml-auto" />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No subscriptions found"
            description="Adjust the filters or create a subscription to get the loop started"
            icon={<Layers className="h-4 w-4 text-[color:var(--cobalt)]" />}
            action={
              <Link href="/subscriptions/new">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> New subscription
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>
                    <SortHeader label="Number" field="number" />
                  </Th>
                  <Th>Customer</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th>
                    <SortHeader label="Start" field="startDate" />
                  </Th>
                  <Th>
                    <SortHeader label="Next billing" field="nextBillingDate" />
                  </Th>
                  <Th className="text-right">
                    <SortHeader label="Total" field="total" />
                  </Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((sub) => (
                  <Tr key={sub.id}>
                    <Td>
                      <Link href={`/subscriptions/${sub.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                        {sub.number}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{sub._count.invoices} {sub._count.invoices === 1 ? "invoice" : "invoices"}</p>
                    </Td>
                    <Td>
                      <Link href={`/customers/${sub.customer.id}`} className="text-xs hover:underline">
                        {sub.customer.name}
                      </Link>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {sub.plan.name}
                      <span className="ml-1 text-[10px] text-muted-foreground">/{sub.plan.period.toLowerCase()}</span>
                    </Td>
                    <Td>
                      <StatusBadge status={sub.status} />
                    </Td>
                    <Td className="text-xs text-muted-foreground">{formatDate(sub.startDate)}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "—"}
                    </Td>
                    <Td className="text-right text-xs font-semibold">{money(sub.total)}</Td>
                    <Td className="text-right">
                      <Link href={`/subscriptions/${sub.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
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
