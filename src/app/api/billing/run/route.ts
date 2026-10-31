import { guard, handleError, ok } from "@/lib/api"
import { runBillingCycle } from "@/server/services/billing"
import { clearReportCache } from "@/server/services/reports"

export async function POST() {
  try {
    const user = await guard(["ADMIN", "STAFF"])
    const run = await runBillingCycle({ trigger: "MANUAL", actorId: user.id })
    clearReportCache()
    return ok(run)
  } catch (error) {
    return handleError(error)
  }
}
