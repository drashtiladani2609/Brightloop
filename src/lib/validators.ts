import { z } from "zod"
import {
  BILLING_PERIODS,
  DISCOUNT_SCOPES,
  DISCOUNT_TYPES,
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  PRODUCT_TYPES,
  TAX_SCOPES
} from "@/lib/constants"
import { isStrongPassword } from "@/lib/password"

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .refine(isStrongPassword, "Use 9+ chars with upper lower and a special char")

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email")

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: emailSchema,
  password: passwordSchema,
  company: z.string().trim().max(120).optional()
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
})

export const forgotSchema = z.object({ email: emailSchema })

export const resetSchema = z.object({
  token: z.string().min(10, "Reset token missing"),
  password: passwordSchema
})

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["STAFF", "ADMIN"]).default("STAFF")
})

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  contactName: z.string().trim().min(2, "Contact name is required").max(80),
  email: emailSchema,
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  addressLine: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  taxId: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  active: z.boolean().optional().default(true),
  createPortalLogin: z.boolean().optional().default(false)
})

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  type: z.enum(PRODUCT_TYPES),
  category: z.string().trim().min(1).max(60).default("General"),
  salesPrice: z.coerce.number().min(0, "Price cannot be negative"),
  costPrice: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  active: z.boolean().optional().default(true),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        attribute: z.string().trim().min(1, "Attribute is required").max(40),
        value: z.string().trim().min(1, "Value is required").max(60),
        priceExtra: z.coerce.number().default(0)
      })
    )
    .optional()
    .default([])
})

export const planBase = z.object({
    name: z.string().trim().min(2, "Plan name is required").max(100),
    description: z.string().trim().max(400).optional().or(z.literal("")),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    period: z.enum(BILLING_PERIODS),
    minQuantity: z.coerce.number().int().min(1, "At least 1"),
    availableFrom: z.string().optional().or(z.literal("")),
    availableTo: z.string().optional().or(z.literal("")),
    autoCloseOnEnd: z.boolean().default(false),
    closableEarly: z.boolean().default(true),
    pausable: z.boolean().default(true),
    renewable: z.boolean().default(true),
    active: z.boolean().default(true)
})

export const planSchema = planBase.refine(
  (v) => !v.availableFrom || !v.availableTo || new Date(v.availableFrom) <= new Date(v.availableTo),
  { message: "Available from must be before available to", path: ["availableTo"] }
)

export const templateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required").max(100),
  validityDays: z.coerce.number().int().min(1).max(365),
  planId: z.string().min(1, "Pick a plan"),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        variantId: z.string().optional().or(z.literal("")),
        quantity: z.coerce.number().int().min(1).max(999)
      })
    )
    .min(1, "Add at least one line")
})

export const taxBase = z.object({
    name: z.string().trim().min(2, "Tax name is required").max(60),
    rate: z.coerce.number().min(0, "Rate cannot be negative").max(100, "Rate above 100"),
    scope: z.enum(TAX_SCOPES),
    category: z.string().trim().max(60).optional().or(z.literal("")),
    productId: z.string().optional().or(z.literal("")),
    active: z.boolean().default(true)
})

export const taxSchema = taxBase
  .refine((v) => v.scope !== "PRODUCT" || !!v.productId, { message: "Pick a product", path: ["productId"] })
  .refine((v) => v.scope !== "CATEGORY" || !!v.category, { message: "Pick a category", path: ["category"] })

export const discountBase = z.object({
    name: z.string().trim().min(2, "Discount name is required").max(60),
    type: z.enum(DISCOUNT_TYPES),
    value: z.coerce.number().min(0.01, "Value must be positive"),
    scope: z.enum(DISCOUNT_SCOPES),
    productId: z.string().optional().or(z.literal("")),
    minAmount: z.coerce.number().min(0).optional(),
    minQuantity: z.coerce.number().int().min(0).optional(),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),
    usageLimit: z.coerce.number().int().min(0).optional(),
    active: z.boolean().default(true)
})

export const discountSchema = discountBase
  .refine((v) => v.type !== "PERCENTAGE" || v.value <= 100, { message: "Percentage max is 100", path: ["value"] })
  .refine((v) => v.scope !== "PRODUCT" || !!v.productId, { message: "Pick a product", path: ["productId"] })

export const subscriptionLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "Quantity at least 1").max(999),
  unitPrice: z.coerce.number().min(0).optional()
})

export const subscriptionSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  planId: z.string().min(1, "Pick a plan"),
  templateId: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  paymentTerms: z.enum(PAYMENT_TERMS),
  quotationValidityDays: z.coerce.number().int().min(1).max(365).default(30),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  lines: z.array(subscriptionLineSchema).min(1, "Add at least one line")
})

export const statusActionSchema = z.object({
  action: z.enum(["SEND_QUOTATION", "CONFIRM", "ACTIVATE", "PAUSE", "RESUME", "CLOSE", "REOPEN"]),
  note: z.string().trim().max(300).optional()
})

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Pick an invoice"),
  method: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().positive("Amount must be more than zero"),
  paidAt: z.string().min(1, "Payment date is required"),
  reference: z.string().trim().max(60).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal(""))
})

export const paymentIntentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().positive("Amount must be more than zero")
})

export type SignupInput = z.infer<typeof signupSchema>
export type SubscriptionInput = z.input<typeof subscriptionSchema>
export type ProductInput = z.infer<typeof productSchema>
export type PlanInput = z.infer<typeof planSchema>
