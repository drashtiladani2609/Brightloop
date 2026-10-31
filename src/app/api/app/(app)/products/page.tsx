import { Boxes, Package, Pencil, Plus } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { ProductDialog } from "@/components/catalogue/product-dialog"
import { money } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const user = await requireRole(["ADMIN", "STAFF"])
  const isAdmin = user.role === "ADMIN"

  const products = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      variants: true,
      _count: { select: { lines: true } }
    }
  })

  const taxRules = await prisma.taxRule.findMany({
    where: { active: true },
    select: { scope: true, category: true, productId: true }
  })

  const taxCount = (product: { id: string; category: string }) =>
    taxRules.filter(
      (rule) =>
        rule.productId === product.id ||
        rule.scope === "ALL" ||
        (rule.scope === "CATEGORY" && rule.category === product.category)
    ).length

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Products and variants"
        description={
          isAdmin
            ? "The sellable catalogue. Variants carry a price extra on top of the base price"
            : "Read only view. Only an admin can change the catalogue"
        }
        actions={
          isAdmin ? (
            <ProductDialog
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> New product
                </Button>
              }
            />
          ) : (
            <Badge variant="secondary">staff view only</Badge>
          )
        }
      />

      {products.length === 0 ? (
        <Card>
          <EmptyState
            title="No products yet"
            description="Add your first product then attach plans and quotation templates to it"
            icon={<Package className="h-4 w-4 text-[color:var(--cobalt)]" />}
            action={
              isAdmin ? (
                <ProductDialog
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4" /> New product
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="hover-lift group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center border-[1.5px] border-[color:var(--line)] bg-[var(--ink)] text-[var(--lime)]">
                        <Boxes className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-[19px] leading-none">{product.name}</p>
                        <p className="mono-label mt-1 text-[8px] text-muted-foreground">
                          {product.type} / {product.category}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <ProductDialog
                      product={{
                        id: product.id,
                        name: product.name,
                        type: product.type,
                        category: product.category,
                        salesPrice: product.salesPrice,
                        costPrice: product.costPrice,
                        notes: product.notes,
                        active: product.active,
                        variants: product.variants.map((v) => ({
                          id: v.id,
                          attribute: v.attribute,
                          value: v.value,
                          priceExtra: v.priceExtra
                        }))
                      }}
                      trigger={
                        <button className="rounded-[2px] p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="num text-[19px] leading-none">{money(product.salesPrice)}</p>
                    <p className="text-[11px] text-muted-foreground">cost {money(product.costPrice)}</p>
                  </div>
                  <Badge variant={product.active ? "success" : "muted"}>{product.active ? "active" : "archived"}</Badge>
                </div>

                {product.variants.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {product.variants.map((variant) => (
                      <span
                        key={variant.id}
                        className="rounded-[2px] border border-border/60 bg-secondary/40 px-2 py-1 text-[10px] text-muted-foreground"
                      >
                        {variant.attribute}: <span className="font-medium text-foreground">{variant.value}</span>
                        {variant.priceExtra !== 0 && (
                          <span className="ml-1 text-[color:var(--pos)]">
                            {variant.priceExtra > 0 ? "+" : ""}
                            {money(variant.priceExtra)}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-3 border-t border-border/40 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {product._count.lines} subscription lines ·{" "}
                  {taxCount(product) === 0
                    ? "no tax rules apply"
                    : taxCount(product) === 1
                      ? "1 tax rule applies"
                      : `${taxCount(product)} tax rules apply`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
