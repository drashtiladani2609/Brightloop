"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { BILLING_PERIODS } from "@/lib/constants"
import { toInputDate } from "@/lib/utils"

export type PlanRecord = {
  id: string
  name: string
  description: string | null
  price: number
  period: string
  minQuantity: number
  availableFrom: string | null
  availableTo: string | null
  autoCloseOnEnd: boolean
  closableEarly: boolean
  pausable: boolean
  renewable: boolean
  active: boolean
}

const EMPTY: PlanRecord = {
  id: "",
  name: "",
  description: "",
  price: 0,
  period: "MONTHLY",
  minQuantity: 1,
  availableFrom: "",
  availableTo: "",
  autoCloseOnEnd: false,
  closableEarly: true,
  pausable: true,
  renewable: true,
  active: true
}

export function PlanDialog({ plan, trigger }: { plan?: PlanRecord; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<PlanRecord>(plan ?? EMPTY)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const editing = Boolean(plan?.id)

  React.useEffect(() => {
    if (open) {
      setForm(plan ? { ...plan, availableFrom: toInputDate(plan.availableFrom), availableTo: toInputDate(plan.availableTo) } : EMPTY)
      setError(null)
    }
  }, [open, plan])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        description: form.description ?? "",
        availableFrom: form.availableFrom || "",
        availableTo: form.availableTo || "",
        price: Number(form.price),
        minQuantity: Number(form.minQuantity)
      }
      const res = await fetch(editing ? `/api/plans/${plan!.id}` : "/api/plans", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not save the plan")
      toast({ title: editing ? "Plan updated" : "Plan created", variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the plan")
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
        title={editing ? `Edit ${plan?.name}` : "New plan"}
        description="Plan flags decide what staff and customers may do with a subscription"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="plan-form" type="submit" loading={loading}>
              {editing ? "Save changes" : "Create plan"}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plan name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Growth Monthly"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Billing period</Label>
              <Select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                {BILLING_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum quantity</Label>
              <Input
                type="number"
                min="1"
                value={form.minQuantity}
                onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Available from</Label>
              <Input
                type="date"
                value={form.availableFrom ?? ""}
                onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Available to</Label>
              <Input
                type="date"
                value={form.availableTo ?? ""}
                onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Who is this plan for"
            />
          </div>

          <div className="grid gap-3 rounded-[2px] border border-border/60 bg-secondary/30 p-3 sm:grid-cols-2">
            <Switch
              checked={form.autoCloseOnEnd}
              onCheckedChange={(v) => setForm({ ...form, autoCloseOnEnd: v })}
              label="Auto close on end"
              description="Close the subscription at its expiry date"
            />
            <Switch
              checked={form.closableEarly}
              onCheckedChange={(v) => setForm({ ...form, closableEarly: v })}
              label="Closable early"
              description="Allow closing before the expiry date"
            />
            <Switch
              checked={form.pausable}
              onCheckedChange={(v) => setForm({ ...form, pausable: v })}
              label="Pausable"
              description="Allow pause and resume"
            />
            <Switch
              checked={form.renewable}
              onCheckedChange={(v) => setForm({ ...form, renewable: v })}
              label="Renewable"
              description="Allow renewing into the next term"
            />
          </div>

          <Switch
            checked={form.active}
            onCheckedChange={(active) => setForm({ ...form, active })}
            label="Active plan"
            description="Inactive plans cannot take new subscriptions"
          />

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
