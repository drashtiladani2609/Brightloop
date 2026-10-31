import { Pencil, Percent, Plus } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { TaxDialog } from "@/components/catalogue/tax-dialog"

export const dynamic = "force-dynamic"

export default async function TaxesPage() {
  await requireRole(["ADMIN"])

  const [taxes, products] = await Promise.all([
    prisma.taxRule.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { product: true } }),
    prisma.product.findMany({ select: { id: true, name: true, category: true }, orderBy: { name: "asc" } })
  ])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tax rules"
        description="Taxes resolve per line at invoice time. Product scope beats category which beats the catch all rule"
        actions={
          <TaxDialog
            products={products}
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New tax rule
              </Button>
            }
          />
        }
      />

      <Card>
        {taxes.length === 0 ? (
          <EmptyState
            title="No tax rules"
            description="Add a catch all rule first then layer product or category specific rates"
            icon={<Percent className="h-4 w-4 text-[color:var(--cobalt)]" />}
          />
        ) : (
          <CardContent className="p-0">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Tax</Th>
                  <Th>Rate</Th>
                  <Th>Applies to</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((tax) => (
                  <Tr key={tax.id}>
                    <Td className="font-medium">{tax.name}</Td>
                    <Td>
                      <span className="rounded-[2px] bg-[color-mix(in_srgb,var(--cobalt)_12%,transparent)] px-2 py-1 text-xs font-semibold text-[color:var(--cobalt)]">
                        {tax.rate}%
                      </span>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {tax.scope === "ALL" && "All products"}
                      {tax.scope === "CATEGORY" && `Category · ${tax.category}`}
                      {tax.scope === "PRODUCT" && `Product · ${tax.product?.name ?? "removed"}`}
                    </Td>
                    <Td>
                      <Badge variant={tax.active ? "success" : "muted"}>{tax.active ? "active" : "off"}</Badge>
                    </Td>
                    <Td className="text-right">
                      <TaxDialog
                        tax={{
                          id: tax.id,
                          name: tax.name,
                          rate: tax.rate,
                          scope: tax.scope,
                          category: tax.category,
                          productId: tax.productId,
                          active: tax.active
                        }}
                        products={products}
                        trigger={
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
