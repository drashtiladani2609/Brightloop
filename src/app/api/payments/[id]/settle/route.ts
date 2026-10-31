import { guard, handleError, ok } from "@/lib/api"
import { settleIntent } from "@/server/services/payments"
import { clearReportCache } from "@/server/services/reports"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await guard(["ADMIN", "STAFF"])
    const payment = await settleIntent(params.id, { id: user.id, role: user.role })
    clearReportCache()
    return ok({ payment, message: "Payment settled" })
  } catch (error) {
    return handleError(error)
  }
}
