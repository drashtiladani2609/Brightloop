"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { PAYMENT_TERMS, PAYMENT_TERMS_LABEL } from "@/lib/constants"
import { money, toInputDate } from "@/lib/utils"

export type FormProduct = {
  id: string
  name: string
  category: string
  salesPrice: number
  variants: { id: string; attribute: string; value: string; priceExtra: number }[]
}

export type FormPlan = {
  id: string
  name: string
  price: number
  period: string
  minQuantity: number
  pausable: boolean
  closableEarly: boolean
  renewable: boolean
  autoCloseOnEnd: boolean
}

export type FormTemplate = {
  id: string
  name: string
  planId: string
  validityDays: number
  lines: { productId: string; variantId: string | null; quantity: number }[]
}

type Line = { productId: string; variantId: string; quantity: number }

const periodDays = (period: string) => (period === "DAILY" ? 1 : period === "WEEKLY" ? 7 : period === "MONTHLY" ? 30 : 365)

export function SubscriptionForm({
  customers,
  plans,
  products,
  templates,
  presetCustomerId,
  presetTemplateId
}: {
  customers: { id: string; name: string }[]
  plans: FormPlan[]
  products: FormProduct[]
  templates: FormTemplate[]
  presetCustomerId?: string
  presetTemplateId?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const presetTemplate = templates.find((t) => t.id === presetTemplateId)
  const initialPlan = plans.find((p) => p.id === (presetTemplate?.planId ?? plans[0]?.id)) ?? plans[0]

  const [form, setForm] = React.useState({
    customerId: presetCustomerId ?? customers[0]?.id ?? "",
    planId: initialPlan?.id ?? "",
    templateId: presetTemplateId ?? "",
    startDate: toInputDate(new Date()),
    expiryDate: toInputDate(new Date(Date.now() + periodDays(initialPlan?.period ?? "MONTHLY") * 30 * 86400000)),
    paymentTerms: "NET_15",
    quotationValidityDays: presetTemplate?.validityDays ?? 30,
    notes: ""
  })
  const [lines, setLines] = React.useState<Line[]>(
    presetTemplate
      ? presetTemplate.lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? "", quantity: l.quantity }))
      : [{ productId: products[0]?.id ?? "", variantId: "", quantity: 1 }]
  )
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const plan = plans.find((p) => p.id === form.planId)
  const totalQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)

  const lineTotal = lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId)
    const variant = product?.variants.find((v) => v.id === line.variantId)
    return sum + ((product?.salesPrice ?? 0) + (variant?.priceExtra ?? 0)) * Number(line.quantity || 0)
  }, 0)

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template) {
      setForm({ ...form, templateId: "" })
      return
    }
    setForm({
      ...form,
      templateId,
      planId: template.planId,
      quotationValidityDays: template.validityDays
    })
    setLines(template.lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? "", quantity: l.quantity })))
    toast({ title: "Template applied", description: `${template.name} pre filled the form`, variant: "info" })
  }

  function setPlan(planId: string) {
    const next = plans.find((p) => p.id === planId)
    setForm({
      ...form,
      planId,
      expiryDate: toInputDate(new Date(Date.now() + periodDays(next?.period ?? "MONTHLY") * 30 * 86400000))
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quotationValidityDays: Number(form.quotationValidityDays),
          lines: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: Number(line.quantity)
          }))
        })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not create the subscription")
      toast({ title: "Subscription created", description: `${json.data.number} is in draft`, variant: "success" })
      router.push(`/subscriptions/${json.data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the subscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Subscription basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {presetTemplate && (
              <div className="flex items-start gap-2 rounded-[2px] border border-[color-mix(in_srgb,var(--cobalt)_30%,transparent)] bg-[color-mix(in_srgb,var(--cobalt)_10%,transparent)] p-3 text-[11px]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[color:var(--cobalt)]" />
                <p>
                  Started from <span className="font-semibold">{presetTemplate.name}</span>. Change anything before you
                  save.
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quotation template</Label>
                <Select value={form.templateId} onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">No template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.planId} onChange={(e) => setPlan(e.target.value)} required>
                  {plans.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} · {money(option.price)} / {option.period.toLowerCase()}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment terms</Label>
                <Select value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term} value={term}>
                      {PAYMENT_TERMS_LABEL[term]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry date</Label>
                <Input
                  type="date"
                  required
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quotation validity in days</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.quotationValidityDays}
                  onChange={(e) => setForm({ ...form, quotationValidityDays: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum quantity on this plan</Label>
                <Input value={plan?.minQuantity ?? 1} readOnly className="opacity-70" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything the billing team should know"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Lines</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLines([...lines, { productId: products[0]?.id ?? "", variantId: "", quantity: 1 }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {lines.map((line, index) => {
              const product = products.find((p) => p.id === line.productId)
              const variant = product?.variants.find((v) => v.id === line.variantId)
              const unit = (product?.salesPrice ?? 0) + (variant?.priceExtra ?? 0)
              return (
                <div key={index} className="grid grid-cols-[1.4fr_1fr_70px_90px_auto] items-center gap-2">
                  <Select
                    value={line.productId}
                    onChange={(e) =>
                      setLines(lines.map((l, i) => (i === index ? { ...l, productId: e.target.value, variantId: "" } : l)))
                    }
                    className="h-9 text-xs"
                  >
                    {products.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={line.variantId}
                    onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, variantId: e.target.value } : l)))}
                    className="h-9 text-xs"
                  >
                    <option value="">No variant</option>
                    {product?.variants.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.attribute}: {option.value} {option.priceExtra ? `(+${option.priceExtra})` : ""}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines(lines.map((l, i) => (i === index ? { ...l, quantity: Number(e.target.value) } : l)))
                    }
                    className="h-9 text-xs"
                  />
                  <span className="text-right text-xs font-medium">{money(unit * line.quantity)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-[color:var(--neg)]"
                    onClick={() => setLines(lines.filter((_, i) => i !== index))}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{plan?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Billing period</span>
              <span className="font-medium">{plan?.period ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total quantity</span>
              <span className={totalQty < (plan?.minQuantity ?? 1) ? "font-semibold text-[color:var(--neg)]" : "font-medium"}>
                {totalQty} / min {plan?.minQuantity ?? 1}
              </span>
            </div>
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Line value</span>
                <span className="text-lg font-bold">{money(lineTotal)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Taxes and eligible discounts resolve when the invoice is generated
              </p>
            </div>

            {plan && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  { on: plan.pausable, label: "pausable" },
                  { on: plan.closableEarly, label: "close early" },
                  { on: plan.renewable, label: "renewable" },
                  { on: plan.autoCloseOnEnd, label: "auto close" }
                ].map((flag) => (
                  <span
                    key={flag.label}
                    className={`rounded-none border px-2 py-0.5 text-[10px] ${
                      flag.on ? "border-[color-mix(in_srgb,var(--pos)_30%,transparent)] bg-[color-mix(in_srgb,var(--pos)_10%,transparent)] text-[color:var(--pos)]" : "border-border/60 text-muted-foreground line-through"
                    }`}
                  >
                    {flag.label}
                  </span>
                ))}
              </div>
            )}

            {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}

            <Button type="submit" className="w-full" loading={loading} disabled={totalQty < (plan?.minQuantity ?? 1)}>
              Create subscription
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Created as a draft. Send the quotation, confirm then activate
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
