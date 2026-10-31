import { CalendarClock, Layers, Pencil, Plus, Repeat, ShieldCheck, Snowflake } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { PlanDialog } from "@/components/catalogue/plan-dialog"
import { formatDate, money, toInputDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const PERIOD_LABEL: Record<string, string> = {
  DAILY: "per day",
  WEEKLY: "per week",
  MONTHLY: "per month",
  YEARLY: "per year"
}

export default async function PlansPage() {
  const user = await requireRole(["ADMIN", "STAFF"])
  const isAdmin = user.role === "ADMIN"

  const plans = await prisma.plan.findMany({
    orderBy: [{ active: "desc" }, { price: "asc" }],
    include: { _count: { select: { subscriptions: true, templates: true } } }
  })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Plans"
        description={
          isAdmin
            ? "Each plan carries its own guard rails for pause, early close, renewal and auto close"
            : "Read only view. Plan changes stay with the admin"
        }
        actions={
          isAdmin ? (
            <PlanDialog
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> New plan
                </Button>
              }
            />
          ) : (
            <Badge variant="secondary">staff view only</Badge>
          )
        }
      />

      {plans.length === 0 ? (
        <Card>
          <EmptyState
            title="No plans configured"
            description="Create a plan so subscriptions have something to bill against"
            icon={<Layers className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover-lift group relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-[21px] leading-none">{plan.name}</p>
                    <p className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="num text-[19px] leading-none">{money(plan.price)}</span>
                      <span className="mono-label text-[8px] text-muted-foreground">
                        per {PERIOD_LABEL[plan.period].toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={plan.active ? "success" : "muted"}>{plan.active ? "active" : "archived"}</Badge>
                    {isAdmin && (
                      <PlanDialog
                        plan={{
                          id: plan.id,
                          name: plan.name,
                          description: plan.description,
                          price: plan.price,
                          period: plan.period,
                          minQuantity: plan.minQuantity,
                          availableFrom: plan.availableFrom ? toInputDate(plan.availableFrom) : null,
                          availableTo: plan.availableTo ? toInputDate(plan.availableTo) : null,
                          autoCloseOnEnd: plan.autoCloseOnEnd,
                          closableEarly: plan.closableEarly,
                          pausable: plan.pausable,
                          renewable: plan.renewable,
                          active: plan.active
                        }}
                        trigger={
                          <button className="rounded-[2px] p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                    )}
                  </div>
                </div>

                <p className="mt-2 min-h-[34px] text-[12px] leading-relaxed text-muted-foreground">
                  {plan.description ?? "No description"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <Flag on={plan.pausable} icon={Snowflake} label="Pausable" />
                  <Flag on={plan.closableEarly} icon={ShieldCheck} label="Close early" />
                  <Flag on={plan.renewable} icon={Repeat} label="Renewable" />
                  <Flag on={plan.autoCloseOnEnd} icon={CalendarClock} label="Auto close" />
                </div>

                <dl className="mt-3 space-y-1 border-t border-dashed border-[color:var(--line)]/25 pt-2 text-[10.5px] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Minimum quantity</dt>
                    <dd className="num text-foreground">{plan.minQuantity}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Available</dt>
                    <dd className="num text-foreground">
                      {plan.availableFrom ? formatDate(plan.availableFrom) : "always"}
                      {plan.availableTo ? ` → ${formatDate(plan.availableTo)}` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>In use</dt>
                    <dd className="num text-foreground">
                      {plan._count.subscriptions} subs · {plan._count.templates} tpl
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Flag({ on, icon: Icon, label }: { on: boolean; icon: typeof Snowflake; label: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 border-[1.5px] px-1.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.08em] ${
        on
          ? "border-[color:var(--line)] bg-[var(--lime)] text-[#141210]"
          : "border-dashed border-[color:color-mix(in_srgb,var(--line)_28%,transparent)] text-[color:color-mix(in_srgb,var(--muted-text)_70%,transparent)]"
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </div>
  )
}
