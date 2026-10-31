import Link from "next/link"
import { ArrowUpRight, CalendarClock, Layers, Receipt, Wallet } from "lucide-react"
import { requirePortalUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/badge"
import { KpiCard } from "@/components/ui/kpi-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, money } from "@/lib/utils"
import { paymentState } from "@/server/services/invoices"

export const dynamic = "force-dynamic"

export default async function PortalHomePage() {
  const user = await requirePortalUser()
  const customerId = user.customer!.id

  const [customer, subscriptions, invoices, paid, outstanding] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.subscription.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { plan: { select: { name: true, period: true } } }
    }),
    prisma.invoice.findMany({
      where: { customerId, status: { in: ["CONFIRMED", "PAID", "DRAFT"] } },
      orderBy: { issueDate: "desc" },
      take: 6
    }),
    prisma.payment.aggregate({
      where: { status: "SETTLED", invoice: { customerId } },
      _sum: { amount: true }
    }),
    prisma.invoice.aggregate({
      where: { customerId, status: "CONFIRMED" },
      _sum: { total: true, amountPaid: true },
      _count: { _all: true }
    })
  ])

  const activeCount = await prisma.subscription.count({ where: { customerId, status: "ACTIVE" } })
  const nextInvoice = await prisma.invoice.findFirst({
    where: { customerId, status: "CONFIRMED", amountPaid: 0, dueDate: { gte: new Date() } },
    orderBy: { dueDate: "asc" }
  })
  const overdueCount = await prisma.invoice.count({
    where: { customerId, status: "CONFIRMED", dueDate: { lt: new Date() } }
  })
  const balance = (outstanding._sum.total ?? 0) - (outstanding._sum.amountPaid ?? 0)

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={`Hello ${customer?.contactName.split(" ")[0] ?? "there"}`}
        description={`${customer?.name} · everything you subscribe to and everything you owe, in one place`}
        actions={
          <Link href="/portal/invoices">
            <Button size="sm">
              <Receipt className="h-3.5 w-3.5" /> My invoices
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active subscriptions" value={activeCount} icon="layers" tone="violet" index={0} />
        <KpiCard label="Amount due" value={balance} format="currency" icon="wallet" tone="amber" index={1} hint={`${outstanding._count._all} open invoices`} />
        <KpiCard label="Paid till date" value={paid._sum.amount ?? 0} format="currency" icon="revenue" tone="teal" index={2} />
        <KpiCard
          label={overdueCount > 0 ? "Overdue invoices" : "Next due in days"}
          value={overdueCount > 0 ? overdueCount : nextInvoice ? Math.ceil((nextInvoice.dueDate.getTime() - Date.now()) / 86400000) : 0}
          icon={overdueCount > 0 ? "alert" : "clock"}
          tone={overdueCount > 0 ? "rose" : "sky"}
          index={3}
          hint={
            overdueCount > 0
              ? "please clear them soon"
              : nextInvoice
                ? `due ${formatDate(nextInvoice.dueDate)}`
                : "nothing pending"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My subscriptions</CardTitle>
            <Link href="/portal/subscriptions" className="text-xs text-[color:var(--cobalt)] hover:underline">
              Manage
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {subscriptions.length === 0 ? (
              <EmptyState title="No subscriptions yet" description="Your first plan will show up here once the team activates it" />
            ) : (
              subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 rounded-[2px] border border-border/50 bg-secondary/20 px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--cobalt)_12%,transparent)]">
                    <Layers className="h-3.5 w-3.5 text-[color:var(--cobalt)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{sub.plan.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {sub.number} · next billing {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "—"}
                    </p>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent invoices</CardTitle>
            <Link href="/portal/invoices" className="text-xs text-[color:var(--cobalt)] hover:underline">
              All invoices
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 ? (
              <EmptyState title="No invoices yet" description="Invoices appear here as soon as your subscription bills" />
            ) : (
              invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/portal/invoices/${invoice.id}`}
                  className="flex items-center gap-3 rounded-[2px] border border-border/50 bg-secondary/20 px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--pos)_12%,transparent)]">
                    <Receipt className="h-3.5 w-3.5 text-[color:var(--pos)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{invoice.number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      <CalendarClock className="mr-1 inline h-2.5 w-2.5" />
                      due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold">{money(invoice.total)}</span>
                  <StatusBadge status={paymentState(invoice)} />
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
