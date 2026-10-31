import { round2 } from "@/lib/utils"

export type TaxRuleLike = {
  id: string
  name: string
  rate: number
  scope: string
  category?: string | null
  productId?: string | null
  active: boolean
}

export type PricingLine = {
  productId: string
  category: string
  quantity: number
  unitPrice: number
}

export type DiscountRuleLike = {
  id: string
  name: string
  type: string
  value: number
  scope: string
  productId?: string | null
  minAmount?: number | null
  minQuantity?: number | null
  startDate?: Date | null
  endDate?: Date | null
  usageLimit?: number | null
  usedCount: number
  active: boolean
}

export function resolveTaxRule(rules: TaxRuleLike[], productId: string, category: string) {
  const exact = rules.find((r) => r.active && r.scope === "PRODUCT" && r.productId === productId)
  if (exact) return exact
  const byCat = rules.find((r) => r.active && r.scope === "CATEGORY" && r.category === category)
  if (byCat) return byCat
  return rules.find((r) => r.active && r.scope === "ALL") ?? null
}

export function lineNet(line: PricingLine) {
  return round2(line.quantity * line.unitPrice)
}

export function computeSubtotal(lines: PricingLine[]) {
  return round2(lines.reduce((sum, l) => sum + lineNet(l), 0))
}

export function isDiscountEligible(
  rule: DiscountRuleLike,
  ctx: { subtotal: number; quantity: number; now: Date; productIds?: string[] }
) {
  if (!rule.active) return false
  if (rule.startDate && rule.startDate.getTime() > ctx.now.getTime()) return false
  if (rule.endDate && rule.endDate.getTime() < ctx.now.getTime()) return false
  if (rule.usageLimit !== null && rule.usageLimit !== undefined) {
    if (rule.usageLimit > 0 && rule.usedCount >= rule.usageLimit) return false
  }
  if (rule.minAmount && ctx.subtotal < rule.minAmount) return false
  if (rule.minQuantity && ctx.quantity < rule.minQuantity) return false
  if (rule.scope === "PRODUCT") {
    if (!rule.productId) return false
    if (ctx.productIds && !ctx.productIds.includes(rule.productId)) return false
  }
  return true
}

export type AppliedDiscount = {
  ruleId: string
  name: string
  amount: number
  scope: string
}

export function computeDiscounts(
  rules: DiscountRuleLike[],
  lines: PricingLine[],
  now: Date,
  opts?: { alreadyUsed?: Record<string, number> }
) {
  const subtotal = computeSubtotal(lines)
  const quantity = lines.reduce((s, l) => s + l.quantity, 0)
  const productIds = Array.from(new Set(lines.map((l) => l.productId)))
  const applied: AppliedDiscount[] = []
  const usage = { ...(opts?.alreadyUsed ?? {}) }

  const ordered = [...rules].sort((a, b) => (a.scope === "SUBSCRIPTION" ? 1 : 0) - (b.scope === "SUBSCRIPTION" ? 1 : 0))

  for (const rule of ordered) {
    const effective: DiscountRuleLike = {
      ...rule,
      usedCount: rule.usedCount + (usage[rule.id] ?? 0)
    }
    if (!isDiscountEligible(effective, { subtotal, quantity, now, productIds })) continue

    let base = 0
    if (rule.scope === "PRODUCT") {
      base = round2(lines.filter((l) => l.productId === rule.productId).reduce((s, l) => s + lineNet(l), 0))
    } else {
      base = subtotal
    }
    if (base <= 0) continue

    let amount = rule.type === "PERCENTAGE" ? round2((base * rule.value) / 100) : round2(rule.value)
    if (amount > base) amount = base
    if (amount <= 0) continue

    applied.push({ ruleId: rule.id, name: rule.name, amount, scope: rule.scope })
    usage[rule.id] = (usage[rule.id] ?? 0) + 1
  }

  const total = round2(applied.reduce((s, d) => s + d.amount, 0))
  return { applied, total: Math.min(total, subtotal), subtotal, quantity }
}

export function computeTaxes(
  lines: PricingLine[],
  rules: TaxRuleLike[],
  discountTotal: number
) {
  const subtotal = computeSubtotal(lines)
  const ratio = subtotal > 0 ? Math.max(0, 1 - discountTotal / subtotal) : 0
  return lines.map((line) => {
    const rule = resolveTaxRule(rules, line.productId, line.category)
    const rate = rule?.rate ?? 0
    const discounted = round2(lineNet(line) * ratio)
    const taxAmount = round2((discounted * rate) / 100)
    return {
      productId: line.productId,
      taxRuleId: rule?.id ?? null,
      taxName: rule?.name ?? null,
      taxRate: rate,
      net: discounted,
      taxAmount
    }
  })
}

export function taxBreakdown(items: { taxName: string | null; taxRate: number; taxAmount: number }[]) {
  const map = new Map<string, { name: string; rate: number; amount: number }>()
  for (const item of items) {
    if (!item.taxName || item.taxAmount <= 0) continue
    const key = `${item.taxName}-${item.taxRate}`
    const prev = map.get(key)
    map.set(key, {
      name: item.taxName,
      rate: item.taxRate,
      amount: round2((prev?.amount ?? 0) + item.taxAmount)
    })
  }
  return Array.from(map.values())
}

export function periodLabel(start: Date, end: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return `${fmt(start)} → ${fmt(end)}`
}
