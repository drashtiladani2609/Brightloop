import Link from "next/link"
import { Layers } from "lucide-react"
import { requirePortalUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, StatusBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { SubscriptionControls } from "@/components/portal/subscription-controls"
import { formatDate, money } from "@/lib/utils"
import { PAYMENT_TERMS_LABEL } from "@/lib/constants"

export const dynamic = "force-dynamic"

export default async function PortalSubscriptionsPage() {
  const user = await requirePortalUser()
  const subscriptions = await prisma.subscription.findMany({
    where: { customerId: user.customer!.id },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      lines: { include: { product: true, variant: true } },
      _count: { select: { invoices: true } }
    }
  })

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="My subscriptions" description="Pause, resume or close where your plan allows it" />

      {subscriptions.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing subscribed yet"
            description="Once our team activates a plan for you it will appear here with invoices"
            icon={<Layers className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">{sub.plan.name}</p>
                      <StatusBadge status={sub.status} />
                      <Badge variant="secondary">{sub.number}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(sub.startDate)} → {formatDate(sub.expiryDate)} · {PAYMENT_TERMS_LABEL[sub.paymentTerms]} ·{" "}
                      {sub._count.invoices} invoices
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sub.lines.slice(0, 4).map((line) => (
                        <span key={line.id} className="rounded-[2px] border border-border/60 bg-secondary/40 px-2 py-1 text-[10px]">
                          {line.quantity} × {line.product.name}
                          {line.variant ? ` (${line.variant.value})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold">{money(sub.total)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      next billing {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "not scheduled"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  <SubscriptionControls
                    subscriptionId={sub.id}
                    status={sub.status}
                    pausable={sub.plan.pausable}
                    closableEarly={sub.plan.closableEarly}
                    pastEnd={new Date() >= sub.expiryDate}
                  />
                  <Link href={`/portal/invoices?subscription=${sub.id}`} className="ml-auto">
                    <Button size="sm" variant="ghost">
                      View invoices
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
