import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { planBase } from "@/lib/validators"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, planBase.partial())
    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description ?? undefined,
        price: body.price,
        period: body.period,
        minQuantity: body.minQuantity,
        availableFrom: body.availableFrom ? new Date(body.availableFrom) : undefined,
        availableTo: body.availableTo ? new Date(body.availableTo) : undefined,
        autoCloseOnEnd: body.autoCloseOnEnd,
        closableEarly: body.closableEarly,
        pausable: body.pausable,
        renewable: body.renewable,
        active: body.active
      }
    })
    return ok(plan)
  } catch (error) {
    return handleError(error)
  }
}
