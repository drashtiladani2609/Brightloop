import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { productSchema } from "@/lib/validators"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, productSchema.partial())
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: params.id },
        data: {
          name: body.name,
          type: body.type,
          category: body.category,
          salesPrice: body.salesPrice,
          costPrice: body.costPrice,
          notes: body.notes ?? undefined,
          active: body.active
        },
        include: { variants: true }
      })

      if (body.variants) {
        const keepIds = body.variants.filter((v) => v.id).map((v) => v.id as string)
        await tx.productVariant.deleteMany({
          where: { productId: params.id, id: { notIn: keepIds.length ? keepIds : ["-"] } }
        })
        for (const variant of body.variants) {
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { attribute: variant.attribute, value: variant.value, priceExtra: variant.priceExtra ?? 0 }
            })
          } else {
            await tx.productVariant.create({
              data: {
                productId: params.id,
                attribute: variant.attribute,
                value: variant.value,
                priceExtra: variant.priceExtra ?? 0
              }
            })
          }
        }
      }
      return tx.product.findUnique({ where: { id: updated.id }, include: { variants: true } })
    })
    return ok(product)
  } catch (error) {
    return handleError(error)
  }
}
