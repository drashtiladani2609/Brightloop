"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import { DISCOUNT_SCOPES, DISCOUNT_TYPES } from "@/lib/constants"
import { toInputDate } from "@/lib/utils"

export type DiscountRecord = {
  id: string
  name: string
  type: string
  value: number
  scope: string
  productId: string | null
  minAmount: number | null
  minQuantity: number | null
  startDate: string | null
  endDate: string | null
  usageLimit: number | null
  active: boolean
}

const EMPTY: DiscountRecord = {
  id: "",
  name: "",
  type: "PERCENTAGE",
  value: 10,
  scope: "SUBSCRIPTION",
  productId: "",
  minAmount: null,
  minQuantity: null,
  startDate: "",
  endDate: "",
  usageLimit: null,
  active: true
}

export function DiscountDialog({
  discount,
  products,
  trigger
}: {
  discount?: DiscountRecord
  products: { id: string; name: string }[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<DiscountRecord>(discount ?? EMPTY)
  const router = useRouter()
  const { toast } = useToast()
  const editing = Boolean(discount?.id)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      discount
        ? {
            ...discount,
            startDate: toInputDate(discount.startDate),
            endDate: toInputDate(discount.endDate)
          }
        : EMPTY
    )
  }, [open, discount])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        type: form.type,
        value: Number(form.value),
        scope: form.scope,
        productId: form.productId || "",
        minAmount: form.minAmount === null || Number.isNaN(form.minAmount) ? undefined : Number(form.minAmount),
        minQuantity: form.minQuantity === null || Number.isNaN(form.minQuantity) ? undefined : Number(form.minQuantity),
        startDate: form.startDate || "",
        endDate: form.endDate || "",
        usageLimit: form.usageLimit === null || Number.isNaN(form.usageLimit) ? undefined : Number(form.usageLimit),
        active: form.active
      }
      const res = await fetch(editing ? `/api/discounts/${discount!.id}` : "/api/discounts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not save the discount")
      toast({ title: editing ? "Discount updated" : "Discount created", variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the discount")
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
        title={editing ? `Edit ${discount?.name}` : "New discount rule"}
        description="Rules apply themself on the next invoice while they are eligible"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="discount-form" type="submit" loading={loading}>
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </>
        }
      >
        <form id="discount-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Launch 10 percent" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "FIXED" ? "Fixed amount" : "Percentage"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{form.type === "FIXED" ? "Amount off" : "Percent off"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value, productId: e.target.value === "PRODUCT" ? form.productId : "" })}
              >
                {DISCOUNT_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope === "PRODUCT" ? "Specific product line" : "Whole subscription"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select
                value={form.productId ?? ""}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                disabled={form.scope !== "PRODUCT"}
                className={form.scope !== "PRODUCT" ? "opacity-50" : ""}
              >
                <option value="">Pick a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 rounded-[2px] border border-border/60 bg-secondary/30 p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Minimum purchase amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.minAmount ?? ""}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="No minimum"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum quantity</Label>
              <Input
                type="number"
                min="0"
                value={form.minQuantity ?? ""}
                onChange={(e) => setForm({ ...form, minQuantity: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="No minimum"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input
                type="date"
                value={form.startDate ?? ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="date" value={form.endDate ?? ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Usage limit</Label>
              <Input
                type="number"
                min="0"
                value={form.usageLimit ?? ""}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Unlimited"
              />
            </div>
            <div className="flex items-end">
              <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} label="Active" />
            </div>
          </div>

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
