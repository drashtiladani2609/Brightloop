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
import { TAX_SCOPES } from "@/lib/constants"

export type TaxRecord = {
  id: string
  name: string
  rate: number
  scope: string
  category: string | null
  productId: string | null
  active: boolean
}

export function TaxDialog({
  tax,
  products,
  trigger
}: {
  tax?: TaxRecord
  products: { id: string; name: string; category: string }[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<TaxRecord>(
    tax ?? { id: "", name: "", rate: 18, scope: "ALL", category: "", productId: "", active: true }
  )
  const router = useRouter()
  const { toast } = useToast()
  const editing = Boolean(tax?.id)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setForm(tax ?? { id: "", name: "", rate: 18, scope: "ALL", category: "", productId: "", active: true })
  }, [open, tax])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(editing ? `/api/taxes/${tax!.id}` : "/api/taxes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rate: Number(form.rate) })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not save the tax rule")
      toast({ title: editing ? "Tax rule updated" : "Tax rule created", variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the tax rule")
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit tax rule" : "New tax rule"}
        description="Product scope wins over category which wins over all products"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="tax-form" type="submit" loading={loading}>
              {editing ? "Save" : "Create rule"}
            </Button>
          </>
        }
      >
        <form id="tax-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tax name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GST 18%" />
            </div>
            <div className="space-y-1.5">
              <Label>Rate %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Applies to</Label>
            <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              {TAX_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope === "ALL" ? "All products" : scope === "CATEGORY" ? "A category" : "One product"}
                </option>
              ))}
            </Select>
          </div>

          {form.scope === "CATEGORY" && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Pick a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {form.scope === "PRODUCT" && (
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={form.productId ?? ""} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Pick a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} label="Active" />

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
