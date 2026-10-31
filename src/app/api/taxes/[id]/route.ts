import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { taxBase } from "@/lib/validators"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, taxBase.partial())
    const tax = await prisma.taxRule.update({
      where: { id: params.id },
      data: {
        name: body.name,
        rate: body.rate,
        scope: body.scope,
        category: body.scope === "CATEGORY" ? body.category || null : null,
        productId: body.scope === "PRODUCT" ? body.productId || null : null,
        active: body.active
      }
    })
    return ok(tax)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    await prisma.taxRule.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
