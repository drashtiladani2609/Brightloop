import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok } from "@/lib/api"
import { renewSubscription } from "@/server/services/subscriptions"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await guard(["ADMIN", "STAFF"])
    const subscription = await prisma.subscription.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!subscription) throw new ApiError("Subscription not found", 404)
    const renewed = await renewSubscription(subscription.id, { id: user.id, role: user.role })
    return ok(renewed, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
