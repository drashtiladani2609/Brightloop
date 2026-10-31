"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { money } from "@/lib/utils"

export type TemplateProduct = {
  id: string
  name: string
  salesPrice: number
  variants: { id: string; attribute: string; value: string; priceExtra: number }[]
}

export type TemplateRecord = {
  id: string
  name: string
  validityDays: number
  planId: string
  notes: string | null
  lines: { productId: string; variantId: string | null; quantity: number }[]
}

export function TemplateDialog({
  template,
  products,
  plans,
  trigger
}: {
  template?: TemplateRecord
  products: TemplateProduct[]
  plans: { id: string; name: string }[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<{
    name: string
    validityDays: number
    planId: string
    notes: string
    lines: { productId: string; variantId: string; quantity: number }[]
  }>({
    name: "",
    validityDays: 30,
    planId: plans[0]?.id ?? "",
    notes: "",
    lines: [{ productId: products[0]?.id ?? "", variantId: "", quantity: 1 }]
  })
  const router = useRouter()
  const { toast } = useToast()
  const editing = Boolean(template?.id)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    if (template) {
      setForm({
        name: template.name,
        validityDays: template.validityDays,
        planId: template.planId,
        notes: template.notes ?? "",
        lines: template.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId ?? "",
          quantity: l.quantity
        }))
      })
    } else {
      setForm({
        name: "",
        validityDays: 30,
        planId: plans[0]?.id ?? "",
        notes: "",
        lines: [{ productId: products[0]?.id ?? "", variantId: "", quantity: 1 }]
      })
    }
  }, [open, template, plans, products])

  function setLine(index: number, patch: Partial<{ productId: string; variantId: string; quantity: number }>) {
    setForm({ ...form, lines: form.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) })
  }

  const total = form.lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId)
    const variant = product?.variants.find((v) => v.id === line.variantId)
    return sum + ((product?.salesPrice ?? 0) + (variant?.priceExtra ?? 0)) * line.quantity
  }, 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(editing ? `/api/templates/${template!.id}` : "/api/templates", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          validityDays: Number(form.validityDays),
          planId: form.planId,
          notes: form.notes,
          lines: form.lines
            .filter((l) => l.productId)
            .map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: Number(l.quantity) }))
        })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not save the template")
      toast({ title: editing ? "Template updated" : "Template created", variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${template?.name}` : "New quotation template"}
        description="One click from a template creates a subscription with the plan and lines pre filled"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="template-form" type="submit" loading={loading}>
              {editing ? "Save changes" : "Create template"}
            </Button>
          </>
        }
      >
        <form id="template-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Template name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Validity in days</Label>
              <Input
                type="number"
                min="1"
                value={form.validityDays}
                onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 rounded-[2px] border border-border/60 bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Default lines</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm({ ...form, lines: [...form.lines, { productId: products[0]?.id ?? "", variantId: "", quantity: 1 }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>
            </div>

            {form.lines.map((line, index) => {
              const product = products.find((p) => p.id === line.productId)
              return (
                <div key={index} className="grid grid-cols-[1fr_1fr_70px_auto] items-center gap-2">
                  <Select
                    value={line.productId}
                    onChange={(e) => setLine(index, { productId: e.target.value, variantId: "" })}
                    className="h-9 text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={line.variantId}
                    onChange={(e) => setLine(index, { variantId: e.target.value })}
                    className="h-9 text-xs"
                  >
                    <option value="">No variant</option>
                    {product?.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.attribute}: {variant.value}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => setLine(index, { quantity: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-[color:var(--neg)]"
                    onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}

            <p className="text-right text-[11px] text-muted-foreground">
              Indicative line value <span className="font-semibold text-foreground">{money(total)}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
