import Link from "next/link"
import { ArrowRight, Pencil, Plus, ScrollText } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { TemplateDialog } from "@/components/catalogue/template-dialog"
import { money } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function TemplatesPage() {
  await requireRole(["ADMIN", "STAFF"])

  const [templates, products, plans] = await Promise.all([
    prisma.quotationTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: true, lines: { include: { product: { include: { variants: true } } } } }
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, salesPrice: true, variants: { select: { id: true, attribute: true, value: true, priceExtra: true } } }
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  ])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Quotation templates"
        description="A template pre fills the plan and the lines so a rep can create a subscription in one click"
        actions={
          <TemplateDialog
            products={products}
            plans={plans}
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New template
              </Button>
            }
          />
        }
      />

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            title="No templates yet"
            description="Templates save the sales team a pile of clicks on repeat deals"
            icon={<ScrollText className="h-4 w-4 text-[color:var(--cobalt)]" />}
            action={
              <TemplateDialog
                products={products}
                plans={plans}
                trigger={<Button>Create the first template</Button>}
              />
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const lineValue = template.lines.reduce((sum, line) => {
              const variant = line.product.variants.find((v) => v.id === line.variantId)
              return sum + (line.product.salesPrice + (variant?.priceExtra ?? 0)) * line.quantity
            }, 0)

            return (
              <Card key={template.id} className="hover-lift group flex flex-col">
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {template.plan.name} · valid {template.validityDays} days
                      </p>
                    </div>
                    <TemplateDialog
                      template={{
                        id: template.id,
                        name: template.name,
                        validityDays: template.validityDays,
                        planId: template.planId,
                        notes: template.notes,
                        lines: template.lines.map((l) => ({
                          productId: l.productId,
                          variantId: l.variantId,
                          quantity: l.quantity
                        }))
                      }}
                      products={products}
                      plans={plans}
                      trigger={
                        <button className="rounded-[2px] p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                  </div>

                  <div className="mt-3 flex-1 space-y-1.5">
                    {template.lines.map((line) => {
                      const variant = line.product.variants.find((v) => v.id === line.variantId)
                      return (
                        <div key={line.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate text-muted-foreground">
                            {line.quantity} × {line.product.name}
                            {variant ? ` (${variant.attribute}: ${variant.value})` : ""}
                          </span>
                          <span className="shrink-0 font-medium">
                            {money((line.product.salesPrice + (variant?.priceExtra ?? 0)) * line.quantity)}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
                    <Badge variant="secondary">{money(lineValue)} indicative</Badge>
                    <Link href={`/subscriptions/new?template=${template.id}`}>
                      <Button size="sm" variant="outline">
                        Use template <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
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
