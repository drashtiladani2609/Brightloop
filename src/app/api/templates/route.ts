import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { templateSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    await guard(["ADMIN", "STAFF"])
    const body = await parseBody(request, templateSchema)
    const template = await prisma.quotationTemplate.create({
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
    return ok(template, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
