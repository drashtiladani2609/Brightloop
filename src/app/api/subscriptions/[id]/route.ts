import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { statusActionSchema } from "@/lib/validators"
import { transitionSubscription } from "@/server/services/subscriptions"
import { clearReportCache } from "@/server/services/reports"

const CUSTOMER_ACTIONS = ["PAUSE", "RESUME", "CLOSE"]

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await guard()
    const body = await parseBody(request, statusActionSchema)

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      select: { id: true, customerId: true }
    })
    if (!subscription) throw new ApiError("Subscription not found", 404)

    if (user.role === "CUSTOMER") {
      if (user.customer?.id !== subscription.customerId) throw new ApiError("That subscription is not yours", 403)
      if (!CUSTOMER_ACTIONS.includes(body.action)) throw new ApiError("You cannot do that from the portal", 403)
    } else if (!["ADMIN", "STAFF"].includes(user.role)) {
      throw new ApiError("Not allowed", 403)
    }

    const updated = await transitionSubscription({
      subscriptionId: subscription.id,
      action: body.action,
      actor: { id: user.id, role: user.role },
      note: body.note
    })
    clearReportCache()
    return ok(updated)
  } catch (error) {
    return handleError(error)
  }
}
