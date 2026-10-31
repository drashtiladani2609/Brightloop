import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { discountBase } from "@/lib/validators"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, discountBase.partial())
    const discount = await prisma.discountRule.update({
      where: { id: params.id },
      data: {
        name: body.name,
        type: body.type,
        value: body.value,
        scope: body.scope,
        productId: body.scope === "PRODUCT" ? body.productId || null : undefined,
        minAmount: body.minAmount,
        minQuantity: body.minQuantity,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        usageLimit: body.usageLimit,
        active: body.active
      }
    })
    return ok(discount)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    await prisma.discountRule.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
