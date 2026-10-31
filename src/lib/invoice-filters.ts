export const INVOICE_STATES = ["PAID", "PARTIAL", "OUTSTANDING", "OVERDUE"] as const
export type InvoiceState = (typeof INVOICE_STATES)[number] | "DRAFT" | "CANCELLED"

export function stateWhere(state: string, now = new Date()) {
  switch (state) {
    case "PAID":
      return { status: "PAID" }
    case "DRAFT":
      return { status: "DRAFT" }
    case "CANCELLED":
      return { status: "CANCELLED" }
    case "OVERDUE":
      return { status: "CONFIRMED", dueDate: { lt: now } }
    case "PARTIAL":
      return { status: "CONFIRMED", amountPaid: { gt: 0 } }
    case "OUTSTANDING":
      return { status: "CONFIRMED", amountPaid: 0, dueDate: { gte: now } }
    default:
      return {}
  }
}

export function invoiceStateWhere(state: string) {
  if (!state) return {}
  return stateWhere(state)
}
