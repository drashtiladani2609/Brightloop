import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { discountSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, discountSchema)
    const discount = await prisma.discountRule.create({
      data: {
        name: body.name,
        type: body.type,
        value: body.value,
        scope: body.scope,
        productId: body.scope === "PRODUCT" ? body.productId || null : null,
        minAmount: body.minAmount ?? null,
        minQuantity: body.minQuantity ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        usageLimit: body.usageLimit ?? null,
        active: body.active
      }
    })
    return ok(discount, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
