"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { PRODUCT_TYPES } from "@/lib/constants"
import { money } from "@/lib/utils"

type Variant = { id?: string; attribute: string; value: string; priceExtra: number }

export type ProductRecord = {
  id: string
  name: string
  type: string
  category: string
  salesPrice: number
  costPrice: number
  notes: string | null
  active: boolean
  variants: Variant[]
}

const EMPTY: ProductRecord = {
  id: "",
  name: "",
  type: "Software",
  category: "General",
  salesPrice: 0,
  costPrice: 0,
  notes: "",
  active: true,
  variants: []
}

export function ProductDialog({ product, trigger }: { product?: ProductRecord; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<ProductRecord>(product ?? EMPTY)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const editing = Boolean(product?.id)

  React.useEffect(() => {
    if (open) {
      setForm(product ?? EMPTY)
      setError(null)
    }
  }, [open, product])

  function addVariant() {
    setForm({ ...form, variants: [...form.variants, { attribute: "", value: "", priceExtra: 0 }] })
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    setForm({
      ...form,
      variants: form.variants.map((v, i) => (i === index ? { ...v, ...patch } : v))
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        notes: form.notes ?? "",
        salesPrice: Number(form.salesPrice),
        costPrice: Number(form.costPrice),
        variants: form.variants
          .filter((v) => v.attribute.trim() && v.value.trim())
          .map((v) => ({ id: v.id, attribute: v.attribute, value: v.value, priceExtra: Number(v.priceExtra) }))
      }
      const res = await fetch(editing ? `/api/products/${product!.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not save the product")
      toast({ title: editing ? "Product updated" : "Product created", variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product")
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
        title={editing ? `Edit ${product?.name}` : "New product"}
        description="Variants add a price extra on top of the base sales price"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="product-form" type="submit" loading={loading}>
              {editing ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Product name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Brightloop Core"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Platform"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sales price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.salesPrice}
                  onChange={(e) => setForm({ ...form, salesPrice: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Anything the sales team should know"
            />
          </div>

          <div className="rounded-[2px] border border-border/60 bg-secondary/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Variants</p>
                <p className="text-[11px] text-muted-foreground">Final price = base price plus the extra below</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addVariant}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            {form.variants.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">No variants yet · the base price applies</p>
            )}

            <div className="space-y-2">
              {form.variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_90px_auto] items-end gap-2">
                  <Input
                    placeholder="Attribute"
                    value={variant.attribute}
                    onChange={(e) => updateVariant(index, { attribute: e.target.value })}
                    className="h-9"
                  />
                  <Input
                    placeholder="Value"
                    value={variant.value}
                    onChange={(e) => updateVariant(index, { value: e.target.value })}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={variant.priceExtra}
                    onChange={(e) => updateVariant(index, { priceExtra: Number(e.target.value) })}
                    className="h-9"
                    placeholder="+0"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-[color:var(--neg)]"
                    onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {form.variants.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Preview · {form.name || "product"} with{" "}
                {form.variants[0].attribute || "attribute"} {form.variants[0].value || "value"} ={" "}
                <span className="font-semibold text-foreground">
                  {money(Number(form.salesPrice) + Number(form.variants[0].priceExtra || 0))}
                </span>
              </p>
            )}
          </div>

          <Switch
            checked={form.active}
            onCheckedChange={(active) => setForm({ ...form, active })}
            label="Active"
            description="Archived products stay on existing subscriptions"
          />

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}

export function CloseIcon() {
  return <X className="h-3.5 w-3.5" />
}
