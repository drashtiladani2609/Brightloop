import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { z } from "zod"
import { cancelInvoice, confirmInvoice, markInvoiceSent, isOverdue } from "@/server/services/invoices"
import { invoiceEmailTemplate, reminderEmailTemplate, sendMail } from "@/server/services/mailer"
import { clearReportCache } from "@/server/services/reports"
import { money, formatDate } from "@/lib/utils"
import { appUrl } from "@/server/config"

const actionSchema = z.object({ action: z.enum(["confirm", "cancel", "send", "remind"]) })

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await guard(["ADMIN", "STAFF"])
    const { action } = await parseBody(request, actionSchema)

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { customer: true, subscription: { select: { number: true } } }
    })
    if (!invoice) throw new ApiError("Invoice not found", 404)

    if (action === "confirm") {
      const updated = await confirmInvoice(invoice.id, user.id)
      clearReportCache()
      return ok({ invoice: updated, message: "Invoice confirmed" })
    }

    if (action === "cancel") {
      const updated = await cancelInvoice(invoice.id, user.id)
      clearReportCache()
      return ok({ invoice: updated, message: "Invoice cancelled" })
    }

    if (action === "send") {
      if (invoice.status === "DRAFT") throw new ApiError("Confirm the invoice before sending it", 409)
      await sendMail({
        to: invoice.customer.email,
        subject: `Invoice ${invoice.number} from Brightloop`,
        html: invoiceEmailTemplate({
          customerName: invoice.customer.contactName,
          invoiceNumber: invoice.number,
          total: money(invoice.total),
          dueDate: formatDate(invoice.dueDate),
          link: `${appUrl}/portal/invoices/${invoice.id}`
        }),
        type: "INVOICE",
        invoiceId: invoice.id
      })
      const updated = await markInvoiceSent(invoice.id)
      return ok({ invoice: updated, message: "Invoice sent" })
    }

    if (!isOverdue(invoice)) throw new ApiError("That invoice is not overdue", 409)
    const daysOverdue = Math.max(1, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000))
    await sendMail({
      to: invoice.customer.email,
      subject: `Reminder for invoice ${invoice.number}`,
      html: reminderEmailTemplate({
        customerName: invoice.customer.contactName,
        invoiceNumber: invoice.number,
        total: money(invoice.total - invoice.amountPaid),
        dueDate: formatDate(invoice.dueDate),
        daysOverdue
      }),
      type: "REMINDER",
      invoiceId: invoice.id
    })
    return ok({ message: `Reminder sent for ${invoice.number}` })
  } catch (error) {
    return handleError(error)
  }
}
