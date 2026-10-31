import Link from "next/link"
import { ChevronRight, Plus, Users } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { SearchBox, FilterSelect, ClearFilters } from "@/components/ui/toolbar"
import { SortHeader } from "@/components/ui/sort-header"
import { Pagination } from "@/components/ui/pagination"
import { CustomerDialog } from "@/components/catalogue/customer-dialog"
import { PAGE_SIZE } from "@/lib/constants"
import { formatDate, initials } from "@/lib/utils"

export const dynamic = "force-dynamic"

const SORTABLE: Record<string, "name" | "createdAt"> = { name: "name", createdAt: "createdAt" }

export default async function CustomersPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string; sort?: string; dir?: string; status?: string }
}) {
  await requireRole(["ADMIN", "STAFF"])

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q?.trim()
  const sort = SORTABLE[searchParams.sort ?? "createdAt"] ?? "createdAt"
  const dir = searchParams.dir === "asc" ? "asc" : "desc"

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { contactName: { contains: q } },
            { email: { contains: q } },
            { city: { contains: q } }
          ]
        }
      : {}),
    ...(searchParams.status === "active" ? { active: true } : searchParams.status === "inactive" ? { active: false } : {})
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { subscriptions: true, invoices: true } },
        user: { select: { id: true, lastLoginAt: true } }
      }
    })
  ])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Customers"
        description="Accounts, portal access and everything they subscribe to"
        actions={
          <CustomerDialog
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New customer
              </Button>
            }
          />
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-border/50 p-3 sm:flex-row sm:items-center">
          <SearchBox placeholder="Search name, contact, city" />
          <FilterSelect
            param="status"
            placeholder="Any status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" }
            ]}
          />
          <ClearFilters className="ml-auto" />
        </div>

        {customers.length === 0 ? (
          <EmptyState
            title={q ? "No customers match that search" : "No customers yet"}
            description={q ? "Try a shorter search or clear the filters" : "Add your first customer to start billing"}
            icon={<Users className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>
                    <SortHeader label="Customer" field="name" />
                  </Th>
                  <Th>Contact</Th>
                  <Th>Subscriptions</Th>
                  <Th>Invoices</Th>
                  <Th>Portal</Th>
                  <Th>
                    <SortHeader label="Added" field="createdAt" />
                  </Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <Tr key={customer.id}>
                    <Td>
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center border-[1.5px] border-[color:var(--line)] bg-[var(--surface-2)] font-mono text-[9px] font-bold">
                          {initials(customer.name)}
                        </span>
                        <span>
                          <span className="block text-[12px] font-semibold">{customer.name}</span>
                          <span className="block text-[11px] text-muted-foreground">{customer.email}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {customer.contactName}
                      {customer.city ? ` · ${customer.city}` : ""}
                    </Td>
                    <Td className="text-xs font-medium">{customer._count.subscriptions}</Td>
                    <Td className="text-xs font-medium">{customer._count.invoices}</Td>
                    <Td>
                      <Badge variant={customer.user ? "success" : "muted"}>{customer.user ? "enabled" : "none"}</Badge>
                    </Td>
                    <Td className="text-xs text-muted-foreground">{formatDate(customer.createdAt)}</Td>
                    <Td className="text-right">
                      <Link href={`/customers/${customer.id}`}>
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
