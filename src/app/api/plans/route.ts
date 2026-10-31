import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { planSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, planSchema)
    const plan = await prisma.plan.create({
      data: {
        name: body.name,
        description: body.description || null,
        price: body.price,
        period: body.period,
        minQuantity: body.minQuantity,
        availableFrom: body.availableFrom ? new Date(body.availableFrom) : null,
        availableTo: body.availableTo ? new Date(body.availableTo) : null,
        autoCloseOnEnd: body.autoCloseOnEnd,
        closableEarly: body.closableEarly,
        pausable: body.pausable,
        renewable: body.renewable,
        active: body.active
      }
    })
    return ok(plan, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
