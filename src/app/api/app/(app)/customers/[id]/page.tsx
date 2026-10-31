import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, Building2, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { KpiCard } from "@/components/ui/kpi-card"
import { CustomerDialog } from "@/components/catalogue/customer-dialog"
import { PaymentDialog } from "@/components/billing/payment-dialog"
import { formatDate, initials, money } from "@/lib/utils"
import { paymentState } from "@/server/services/invoices"

export const dynamic = "force-dynamic"

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "STAFF"])

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { user: { select: { email: true, lastLoginAt: true, isActive: true } } }
  })
  if (!customer) notFound()

  const [subscriptions, invoices, invoiceAgg, paidAgg, activeCount] = await Promise.all([
    prisma.subscription.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { plan: { select: { name: true, period: true } } }
    }),
    prisma.invoice.findMany({
      where: { customerId: customer.id },
      orderBy: { issueDate: "desc" },
      take: 8
    }),
    prisma.invoice.aggregate({
      where: { customerId: customer.id, status: { notIn: ["CANCELLED", "DRAFT"] } },
      _sum: { total: true, amountPaid: true },
      _count: { _all: true }
    }),
    prisma.payment.aggregate({
      where: { status: "SETTLED", invoice: { customerId: customer.id } },
      _sum: { amount: true }
    }),
    prisma.subscription.count({ where: { customerId: customer.id, status: "ACTIVE" } })
  ])

  const outstanding = (invoiceAgg._sum.total ?? 0) - (invoiceAgg._sum.amountPaid ?? 0)
  const openInvoices = await prisma.invoice.findMany({
    where: { customerId: customer.id, status: "CONFIRMED" },
    select: { id: true, number: true, total: true, amountPaid: true }
  })

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[2px] bg-gradient-to-br bg-[color-mix(in_srgb,var(--cobalt)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos)_55%,transparent)] text-lg font-bold text-[color:var(--cobalt)]">
              {initials(customer.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{customer.name}</h2>
                <Badge variant={customer.active ? "success" : "muted"}>{customer.active ? "active" : "inactive"}</Badge>
                {customer.user && <Badge variant="info">portal login</Badge>}
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> {customer.contactName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> {customer.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> {customer.phone ?? "no phone"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> {[customer.addressLine, customer.city, customer.country].filter(Boolean).join(", ") || "no address"}
                </span>
              </div>
              {customer.notes && <p className="mt-2 rounded-[2px] bg-secondary/40 px-2.5 py-1.5 text-[11px]">{customer.notes}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <CustomerDialog
              customer={{
                id: customer.id,
                name: customer.name,
                contactName: customer.contactName,
                email: customer.email,
                phone: customer.phone,
                addressLine: customer.addressLine,
                city: customer.city,
                country: customer.country,
                taxId: customer.taxId,
                notes: customer.notes,
                active: customer.active,
                userId: customer.userId
              }}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              }
            />
            <Link href={`/subscriptions/new?customer=${customer.id}`}>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New subscription
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active subscriptions" value={activeCount} icon="layers" tone="violet" index={0} />
        <KpiCard label="Collected" value={paidAgg._sum.amount ?? 0} format="currency" icon="revenue" tone="teal" index={1} />
        <KpiCard
          label="Outstanding"
          value={outstanding}
          format="currency"
          icon="wallet"
          tone="amber"
          index={2}
          hint={`${invoiceAgg._count._all} issued invoices`}
        />
        <KpiCard
          label="Invoices"
          value={invoiceAgg._count._all}
          icon="invoice"
          tone="sky"
          index={3}
          hint={`last login ${customer.user?.lastLoginAt ? formatDate(customer.user.lastLoginAt) : "never"}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Subscriptions</CardTitle>
            <Link href={`/subscriptions?customerId=${customer.id}`} className="text-xs text-[color:var(--cobalt)] hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {subscriptions.length === 0 ? (
              <EmptyState title="No subscriptions" description="Create one to start the revenue loop" />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Plan</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <Tr key={sub.id}>
                      <Td>
                        <Link href={`/subscriptions/${sub.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                          {sub.number}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">{formatDate(sub.startDate)}</p>
                      </Td>
                      <Td className="text-xs">{sub.plan.name}</Td>
                      <Td>
                        <StatusBadge status={sub.status} />
                      </Td>
                      <Td className="text-right text-xs font-medium">{money(sub.total)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent invoices</CardTitle>
            <Link href={`/invoices?customerId=${customer.id}`} className="text-xs text-[color:var(--cobalt)] hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <EmptyState title="No invoices yet" description="Invoices arrive with the billing run" />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td>
                        <Link href={`/invoices/${invoice.id}`} className="text-xs font-semibold text-[color:var(--cobalt)] hover:underline">
                          {invoice.number}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted-foreground">{formatDate(invoice.dueDate)}</Td>
                      <Td>
                        <StatusBadge status={paymentState(invoice)} />
                      </Td>
                      <Td className="text-right text-xs font-medium">{money(invoice.total)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </CardContent>
        </Card>
      </div>

      {openInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Take a payment</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentDialog
              invoices={openInvoices}
              trigger={
                <Button variant="outline" size="sm">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Record payment
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
