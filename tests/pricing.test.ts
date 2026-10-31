import { describe, expect, it } from "vitest"
import { computeDiscounts, computeTaxes, resolveTaxRule, type DiscountRuleLike, type TaxRuleLike } from "../src/server/services/pricing"

const now = new Date("2026-06-15T00:00:00.000Z")

const rule = (over: Partial<DiscountRuleLike>): DiscountRuleLike => ({
  id: "d1",
  name: "Ten percent",
  type: "PERCENTAGE",
  value: 10,
  scope: "SUBSCRIPTION",
  productId: null,
  minAmount: null,
  minQuantity: null,
  startDate: null,
  endDate: null,
  usageLimit: null,
  usedCount: 0,
  active: true,
  ...over
})

describe("discount engine", () => {
  it("applies a percentage rule on the whole subscription", () => {
    const result = computeDiscounts([rule({})], [{ productId: "p1", category: "Platform", quantity: 2, unitPrice: 100 }], now)
    expect(result.total).toBe(20)
    expect(result.applied).toHaveLength(1)
  })

  it("stops applying once the usage limit is reached", () => {
    const nearLimit = computeDiscounts(
      [rule({ usageLimit: 5, usedCount: 4 })],
      [{ productId: "p1", category: "Platform", quantity: 1, unitPrice: 500 }],
      now
    )
    expect(nearLimit.total).toBe(50)

    const atLimit = computeDiscounts(
      [rule({ usageLimit: 5, usedCount: 5 })],
      [{ productId: "p1", category: "Platform", quantity: 1, unitPrice: 500 }],
      now
    )
    expect(atLimit.total).toBe(0)
    expect(atLimit.applied).toHaveLength(0)
  })

  it("respects minimum amount and minimum quantity", () => {
    const lines = [{ productId: "p1", category: "Platform", quantity: 1, unitPrice: 100 }]
    expect(computeDiscounts([rule({ minAmount: 400 })], lines, now).total).toBe(0)
    expect(computeDiscounts([rule({ minQuantity: 3 })], lines, now).total).toBe(0)
    expect(computeDiscounts([rule({ minAmount: 50, minQuantity: 1 })], lines, now).total).toBe(10)
  })

  it("ignores a rule that expired yesterday", () => {
    const expired = rule({ endDate: new Date("2026-06-14T00:00:00.000Z") })
    expect(computeDiscounts([expired], [{ productId: "p1", category: "Platform", quantity: 1, unitPrice: 300 }], now).total).toBe(0)
  })

  it("scopes a product rule to matching lines only", () => {
    const productRule = rule({ scope: "PRODUCT", productId: "p2", type: "FIXED", value: 75 })
    const result = computeDiscounts(
      [productRule],
      [
        { productId: "p1", category: "Platform", quantity: 1, unitPrice: 200 },
        { productId: "p2", category: "Add-on", quantity: 1, unitPrice: 100 }
      ],
      now
    )
    expect(result.total).toBe(75)
  })

  it("never discounts more than the subtotal", () => {
    const huge = rule({ type: "FIXED", value: 9999 })
    const result = computeDiscounts([huge], [{ productId: "p1", category: "Platform", quantity: 1, unitPrice: 120 }], now)
    expect(result.total).toBe(120)
  })
})

describe("tax resolution", () => {
  const rules: TaxRuleLike[] = [
    { id: "t1", name: "GST", rate: 18, scope: "ALL", active: true },
    { id: "t2", name: "Service", rate: 10, scope: "CATEGORY", category: "Services", active: true },
    { id: "t3", name: "Special", rate: 5, scope: "PRODUCT", productId: "p9", active: true }
  ]

  it("prefers the product rule", () => {
    expect(resolveTaxRule(rules, "p9", "Services")?.rate).toBe(5)
  })

  it("falls back to the category then to all", () => {
    expect(resolveTaxRule(rules, "p1", "Services")?.rate).toBe(10)
    expect(resolveTaxRule(rules, "p1", "Platform")?.rate).toBe(18)
  })

  it("computes tax on the discounted amount", () => {
    const taxes = computeTaxes([{ productId: "p1", category: "Platform", quantity: 2, unitPrice: 100 }], rules, 40)
    expect(taxes[0].net).toBe(160)
    expect(taxes[0].taxAmount).toBe(28.8)
  })
})
