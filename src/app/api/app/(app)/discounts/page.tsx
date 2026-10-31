import { BadgePercent, Pencil, Plus } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DiscountDialog } from "@/components/catalogue/discount-dialog"
import { formatDate, money, toInputDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DiscountsPage() {
  await requireRole(["ADMIN"])

  const [discounts, products] = await Promise.all([
    prisma.discountRule.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }], include: { product: true } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ])

  const now = new Date()

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Discount rules"
        description="Eligible rules apply themself on the next invoice. Usage increments inside the same transaction"
        actions={
          <DiscountDialog
            products={products}
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New discount
              </Button>
            }
          />
        }
      />

      {discounts.length === 0 ? (
        <Card>
          <EmptyState
            title="No discount rules"
            description="Create a rule to reward volume or run a time boxed promo"
            icon={<BadgePercent className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {discounts.map((discount) => {
            const expired = discount.endDate ? discount.endDate.getTime() < now.getTime() : false
            const atLimit = discount.usageLimit ? discount.usedCount >= discount.usageLimit : false
            const usedPercent = discount.usageLimit ? Math.min(100, (discount.usedCount / discount.usageLimit) * 100) : 0
            const state = !discount.active ? "paused" : expired ? "expired" : atLimit ? "limit reached" : "live"

            return (
              <Card key={discount.id} className="hover-lift group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{discount.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {discount.type === "PERCENTAGE" ? `${discount.value}% off` : `${money(discount.value)} off`} ·{" "}
                        {discount.scope === "PRODUCT" ? discount.product?.name ?? "product removed" : "whole subscription"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={state === "live" ? "success" : state === "limit reached" ? "warning" : state === "expired" ? "danger" : "muted"}
                      >
                        {state}
                      </Badge>
                      <DiscountDialog
                        discount={{
                          id: discount.id,
                          name: discount.name,
                          type: discount.type,
                          value: discount.value,
                          scope: discount.scope,
                          productId: discount.productId,
                          minAmount: discount.minAmount,
                          minQuantity: discount.minQuantity,
                          startDate: discount.startDate ? toInputDate(discount.startDate) : null,
                          endDate: discount.endDate ? toInputDate(discount.endDate) : null,
                          usageLimit: discount.usageLimit,
                          active: discount.active
                        }}
                        products={products}
                        trigger={
                          <button className="rounded-[2px] p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div className="rounded-[2px] bg-secondary/40 px-2 py-1.5">
                      Min amount <span className="font-semibold text-foreground">{discount.minAmount ? money(discount.minAmount) : "none"}</span>
                    </div>
                    <div className="rounded-[2px] bg-secondary/40 px-2 py-1.5">
                      Min qty <span className="font-semibold text-foreground">{discount.minQuantity ?? "none"}</span>
                    </div>
                    <div className="rounded-[2px] bg-secondary/40 px-2 py-1.5">
                      From <span className="font-semibold text-foreground">{discount.startDate ? formatDate(discount.startDate) : "any"}</span>
                    </div>
                    <div className="rounded-[2px] bg-secondary/40 px-2 py-1.5">
                      To <span className="font-semibold text-foreground">{discount.endDate ? formatDate(discount.endDate) : "open"}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">
                        {discount.usedCount}
                        {discount.usageLimit ? ` / ${discount.usageLimit}` : " · unlimited"}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-none bg-secondary/70">
                      <div
                        className={`h-full rounded-none bg-gradient-to-r ${
                          atLimit ? "bg-[color-mix(in_srgb,var(--neg)_55%,transparent)] bg-[color-mix(in_srgb,var(--warn)_55%,transparent)]" : "bg-[color-mix(in_srgb,var(--cobalt)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos)_55%,transparent)]"
                        }`}
                        style={{ width: discount.usageLimit ? `${Math.max(3, usedPercent)}%` : "8%" }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
