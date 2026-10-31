import Link from "next/link"
import { Activity, ArrowUpRight, Plus, Receipt, RefreshCw } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getDashboard, getReportOptions, normalizeFilters } from "@/server/services/reports"
import { KpiCard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { RangeFilters } from "@/components/dashboard/filters"
import { RevenueChart, SubscriptionFlowChart, MethodDonut, InvoiceStatusChart, TopPlansChart } from "@/components/charts/charts"
import { Stagger, StaggerItem } from "@/components/ui/page-transition"
import { RunBillingButton } from "@/components/billing/run-billing-button"
import { money, formatDate } from "@/lib/utils"
import { paymentState } from "@/server/services/invoices"

export const dynamic = "force-dynamic"

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireRole(["ADMIN", "STAFF"])
  const filters = normalizeFilters(searchParams)
  const [data, options] = await Promise.all([getDashboard(filters), getReportOptions()])

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description="Subscriptions, cash collected and what is still owed across the selected range"
        actions={
          <>
            <RunBillingButton />
            <Link href="/subscriptions/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New subscription
              </Button>
            </Link>
          </>
        }
      />

      <RangeFilters plans={options.plans} customers={options.customers} />

      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StaggerItem>
          <KpiCard
            label="Active subscriptions"
            value={data.kpis.activeSubscriptions}
            icon="layers"
            tone="violet"
            index={0}
            hint={`${data.kpis.newSubs} started in range`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="MRR"
            value={data.kpis.mrr}
            format="currency"
            icon="trending"
            tone="teal"
            index={1}
            hint="per month"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Revenue collected"
            value={data.kpis.revenueCollected}
            format="currency"
            icon="revenue"
            tone="sky"
            index={2}
            hint={`${data.kpis.paymentCount} payments`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Outstanding"
            value={data.kpis.outstanding}
            format="currency"
            icon="wallet"
            tone="amber"
            index={3}
            hint={`${data.kpis.outstandingCount} open`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Overdue"
            value={data.kpis.overdueAmount}
            format="currency"
            icon="alert"
            tone="rose"
            index={4}
            hint={`${data.kpis.overdueCount} past due`}
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue collected</CardTitle>
              <p className="text-xs text-muted-foreground">Settled payments per month across the selected range</p>
            </div>
            <span className="border-[1.5px] border-[color:var(--line)] bg-[var(--lime)] px-2 py-0.5 font-mono text-[10px] font-bold text-[#141210]">
              {money(data.kpis.revenueCollected)}
            </span>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments by method</CardTitle>
            <p className="text-xs text-muted-foreground">How customers actually settle</p>
          </CardHeader>
          <CardContent>
            <MethodDonut data={data.paymentsByMethod} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>New against closed</CardTitle>
              <p className="text-xs text-muted-foreground">Churn and intake in the same window</p>
            </div>
            <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{data.kpis.newSubs} new</span>
              <span>{data.kpis.closedSubs} closed</span>
            </span>
          </CardHeader>
          <CardContent>
            <SubscriptionFlowChart data={data.subSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice status mix</CardTitle>
            <p className="text-xs text-muted-foreground">Issued in the selected range</p>
          </CardHeader>
          <CardContent>
            <InvoiceStatusChart data={data.invoiceStatus} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top plans</CardTitle>
            <p className="text-xs text-muted-foreground">By active contract value</p>
          </CardHeader>
          <CardContent>
            <TopPlansChart data={data.topPlans} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Latest invoices</CardTitle>
            <Link href="/invoices" className="flex items-center gap-1 text-xs font-medium text-[color:var(--cobalt)] hover:underline">
              Open invoices <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentInvoices.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">No invoices in this range</p>
            )}
            {data.recentInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center gap-3 rounded-[2px] border border-border/50 bg-secondary/20 px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)] hover:bg-secondary/50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--cobalt)_12%,transparent)]">
                  <Receipt className="h-3.5 w-3.5 text-[color:var(--cobalt)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{invoice.number}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{invoice.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">{money(invoice.total)}</p>
                  <p className="text-[10px] text-muted-foreground">due {formatDate(invoice.dueDate)}</p>
                </div>
                <StatusBadge status={paymentState(invoice)} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[color:var(--pos)]" />
            <CardTitle>Recent collections</CardTitle>
          </div>
          <Link href="/payments" className="text-xs font-medium text-[color:var(--cobalt)] hover:underline">
            All payments
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-2.5 rounded-[2px] border border-border/50 bg-secondary/20 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--pos)_12%,transparent)]">
                  <RefreshCw className="h-3 w-3 text-[color:var(--pos)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{payment.invoice.customer.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {payment.invoice.number} · {payment.method.replace("_", " ").toLowerCase()}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[color:var(--pos)]">{money(payment.amount)}</span>
              </div>
            ))}
            {data.recentPayments.length === 0 && (
              <p className="col-span-full py-4 text-center text-xs text-muted-foreground">No collections yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
