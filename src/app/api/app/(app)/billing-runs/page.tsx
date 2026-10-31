import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Timer } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { KpiCard } from "@/components/ui/kpi-card"
import { RunBillingButton } from "@/components/billing/run-billing-button"
import { formatDateTime } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function BillingRunsPage() {
  await requireRole(["ADMIN", "STAFF"])

  const [runs, totals, dueSubs] = await Promise.all([
    prisma.billingRun.findMany({ orderBy: { startedAt: "desc" }, take: 40 }),
    prisma.billingRun.aggregate({
      _sum: { created: true, skipped: true, errors: true },
      _count: { _all: true }
    }),
    prisma.subscription.count({ where: { status: "ACTIVE", nextBillingDate: { lte: new Date() } } })
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Billing runs"
        description="Every run of the billing engine, whether the scheduler started it or someone pressed the button"
        actions={<RunBillingButton variant="default" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Runs logged" value={totals._count._all} icon="activity" tone="violet" index={0} />
        <KpiCard label="Invoices created" value={totals._sum.created ?? 0} icon="invoice" tone="teal" index={1} />
        <KpiCard label="Periods skipped" value={totals._sum.skipped ?? 0} icon="clock" tone="amber" index={2} />
        <KpiCard
          label="Waiting to bill"
          value={dueSubs}
          icon="alert"
          tone="rose"
          index={3}
          hint="active subscriptions due now"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How idempotency works here</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-[2px] border border-border/60 bg-secondary/30 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--pos)]" /> Unique window
            </p>
            A unique index on subscription plus billing period start and end makes a second insert impossible.
          </div>
          <div className="rounded-[2px] border border-border/60 bg-secondary/30 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
              <RefreshCw className="h-3.5 w-3.5 text-[color:var(--cobalt)]" /> Catch up
            </p>
            Each run walks nextBillingDate forward period by period so a missed cron day never loses an invoice.
          </div>
          <div className="rounded-[2px] border border-border/60 bg-secondary/30 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-[color:var(--warn)]" /> Transactional
            </p>
            Invoices, discount usage counters and nextBillingDate commit together or not at all.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Timer className="h-4 w-4 text-[color:var(--pos)]" />
          <CardTitle>Run history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableWrap>
            <thead>
              <tr>
                <Th>Started</Th>
                <Th>Trigger</Th>
                <Th>Status</Th>
                <Th className="text-right">Created</Th>
                <Th className="text-right">Skipped</Th>
                <Th className="text-right">Errors</Th>
                <Th className="text-right">Duration</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <Tr key={run.id}>
                  <Td className="text-xs">{formatDateTime(run.startedAt)}</Td>
                  <Td>
                    <Badge variant={run.trigger === "MANUAL" ? "info" : "secondary"}>{run.trigger}</Badge>
                  </Td>
                  <Td>
                    <Badge
                      variant={run.status === "SUCCESS" ? "success" : run.status === "PARTIAL" ? "warning" : run.status === "FAILED" ? "danger" : "secondary"}
                    >
                      {run.status}
                    </Badge>
                  </Td>
                  <Td className="text-right text-xs font-semibold text-[color:var(--pos)]">{run.created}</Td>
                  <Td className="text-right text-xs text-muted-foreground">{run.skipped}</Td>
                  <Td className="text-right text-xs">
                    {run.errors > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[color:var(--neg)]">
                        <AlertTriangle className="h-3 w-3" /> {run.errors}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </Td>
                  <Td className="text-right text-xs text-muted-foreground">{run.durationMs}ms</Td>
                  <Td className="max-w-[240px] truncate text-[11px] text-muted-foreground">{run.message ?? "—"}</Td>
                </Tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">
                    No runs yet. Press run billing now to see one
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </CardContent>
      </Card>
    </div>
  )
}
