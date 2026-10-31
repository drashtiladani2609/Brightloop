import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { templateSchema } from "@/lib/validators"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN", "STAFF"])
    const body = await parseBody(request, templateSchema)
    const template = await prisma.$transaction(async (tx) => {
      await tx.templateLine.deleteMany({ where: { templateId: params.id } })
      return tx.quotationTemplate.update({
        where: { id: params.id },
        data: {
          name: body.name,
          validityDays: body.validityDays,
          planId: body.planId,
          notes: body.notes || null,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: line.quantity
            }))
          }
        }
      })
    })
    return ok(template)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    await prisma.quotationTemplate.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
