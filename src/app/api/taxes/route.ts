import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { taxSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, taxSchema)
    const tax = await prisma.taxRule.create({
      data: {
        name: body.name,
        rate: body.rate,
        scope: body.scope,
        category: body.scope === "CATEGORY" ? body.category || null : null,
        productId: body.scope === "PRODUCT" ? body.productId || null : null,
        active: body.active
      }
    })
    return ok(tax, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
