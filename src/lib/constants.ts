export const ROLES = { ADMIN: "ADMIN", STAFF: "STAFF", CUSTOMER: "CUSTOMER" } as const
export type Role = keyof typeof ROLES

export const SUB_STATUS = {
  DRAFT: "DRAFT",
  QUOTATION: "QUOTATION",
  CONFIRMED: "CONFIRMED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  CLOSED: "CLOSED"
} as const
export type SubStatus = keyof typeof SUB_STATUS

export const SUB_FLOW: SubStatus[] = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"]

export const SUB_TRANSITIONS: Record<SubStatus, SubStatus[]> = {
  DRAFT: ["QUOTATION", "CLOSED"],
  QUOTATION: ["CONFIRMED", "DRAFT", "CLOSED"],
  CONFIRMED: ["ACTIVE", "CLOSED"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: []
}

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  PAID: "PAID",
  CANCELLED: "CANCELLED"
} as const
export type InvoiceStatus = keyof typeof INVOICE_STATUS

export const BILLING_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const
export type BillingPeriod = (typeof BILLING_PERIODS)[number]

export const PAYMENT_METHODS = ["CARD", "BANK_TRANSFER", "UPI", "CASH", "CHEQUE"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CASH: "Cash",
  CHEQUE: "Cheque"
}

export const PAYMENT_TERMS = ["IMMEDIATE", "NET_15", "NET_30", "NET_45"] as const
export type PaymentTerms = (typeof PAYMENT_TERMS)[number]

export const PAYMENT_TERMS_DAYS: Record<string, number> = { IMMEDIATE: 0, NET_15: 15, NET_30: 30, NET_45: 45 }

export const PAYMENT_TERMS_LABEL: Record<string, string> = {
  IMMEDIATE: "Immediate",
  NET_15: "Net 15",
  NET_30: "Net 30",
  NET_45: "Net 45"
}

export const PRODUCT_TYPES = ["Software", "Add-on", "Service", "Hardware", "Support"] as const
export const DISCOUNT_TYPES = ["FIXED", "PERCENTAGE"] as const
export const DISCOUNT_SCOPES = ["PRODUCT", "SUBSCRIPTION"] as const
export const TAX_SCOPES = ["ALL", "CATEGORY", "PRODUCT"] as const

export const PAGE_SIZE = 20
