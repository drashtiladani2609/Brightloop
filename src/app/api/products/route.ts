import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { productSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, productSchema)
    const product = await prisma.product.create({
      data: {
        name: body.name,
        type: body.type,
        category: body.category,
        salesPrice: body.salesPrice,
        costPrice: body.costPrice,
        notes: body.notes || null,
        active: body.active ?? true,
        variants: {
          create: (body.variants ?? []).map((v) => ({
            attribute: v.attribute,
            value: v.value,
            priceExtra: v.priceExtra ?? 0
          }))
        }
      },
      include: { variants: true }
    })
    return ok(product, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
