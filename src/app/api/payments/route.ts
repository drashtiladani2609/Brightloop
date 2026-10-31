import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { paymentIntentSchema, paymentSchema } from "@/lib/validators"
import { recordPayment } from "@/server/services/payments"
import { clearReportCache } from "@/server/services/reports"

export async function POST(request: Request) {
  try {
    const user = await guard()
    const url = new URL(request.url)
    const mode = url.searchParams.get("mode") ?? "record"

    if (user.role === "CUSTOMER") {
      const body = await parseBody(request, paymentIntentSchema)
      const invoiceId = url.searchParams.get("invoiceId")
      if (!invoiceId) throw new ApiError("Invoice is required", 400)
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
      if (!invoice) throw new ApiError("Invoice not found", 404)
      if (invoice.customerId !== user.customer?.id) throw new ApiError("That invoice is not yours", 403)

      const payment = await recordPayment(
        {
          invoiceId,
          method: body.method,
          amount: body.amount,
          paidAt: new Date().toISOString(),
          note: "Recorded from customer portal - awaiting confirmation"
        },
        { id: user.id, role: user.role },
        { customerId: user.customer.id, settled: false }
      )
      return ok({ payment, message: "Payment intent recorded" }, { status: 201 })
    }

    if (!["ADMIN", "STAFF"].includes(user.role)) throw new ApiError("Not allowed", 403)
    if (mode !== "record") throw new ApiError("Bad payment mode", 400)

    const body = await parseBody(request, paymentSchema)
    const payment = await recordPayment(body, { id: user.id, role: user.role })
    clearReportCache()
    return ok({ payment, message: "Payment recorded" }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
