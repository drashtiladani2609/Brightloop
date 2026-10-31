import { guard, handleError, ok, parseBody } from "@/lib/api"
import { subscriptionSchema } from "@/lib/validators"
import { createSubscription } from "@/server/services/subscriptions"
import { clearReportCache } from "@/server/services/reports"

export async function POST(request: Request) {
  try {
    const user = await guard(["ADMIN", "STAFF"])
    const body = await parseBody(request, subscriptionSchema)
    const subscription = await createSubscription(body, { id: user.id, role: user.role })
    clearReportCache()
    return ok(subscription, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
