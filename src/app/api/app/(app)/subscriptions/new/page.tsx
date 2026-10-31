import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"

export const dynamic = "force-dynamic"

export default async function NewSubscriptionPage({
  searchParams
}: {
  searchParams: { customer?: string; template?: string }
}) {
  await requireRole(["ADMIN", "STAFF"])

  const [customers, plans, products, templates] = await Promise.all([
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        period: true,
        minQuantity: true,
        pausable: true,
        closableEarly: true,
        renewable: true,
        autoCloseOnEnd: true
      }
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        salesPrice: true,
        variants: { select: { id: true, attribute: true, value: true, priceExtra: true } }
      }
    }),
    prisma.quotationTemplate.findMany({
      select: {
        id: true,
        name: true,
        planId: true,
        validityDays: true,
        lines: { select: { productId: true, variantId: true, quantity: true } }
      }
    })
  ])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="New subscription"
        description="Pick a customer and a plan, or start from a quotation template and adjust"
      />
      <SubscriptionForm
        customers={customers}
        plans={plans}
        products={products}
        templates={templates}
        presetCustomerId={searchParams.customer}
        presetTemplateId={searchParams.template}
      />
    </div>
  )
}
