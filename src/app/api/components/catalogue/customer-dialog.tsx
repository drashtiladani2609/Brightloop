"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"

export type CustomerRecord = {
  id: string
  name: string
  contactName: string
  email: string
  phone: string | null
  addressLine: string | null
  city: string | null
  country: string | null
  taxId: string | null
  notes: string | null
  active: boolean
  userId?: string | null
}

export function CustomerDialog({ customer, trigger }: { customer?: CustomerRecord; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createLogin, setCreateLogin] = React.useState(false)
  const [form, setForm] = React.useState<CustomerRecord>(
    customer ?? {
      id: "",
      name: "",
      contactName: "",
      email: "",
      phone: "",
      addressLine: "",
      city: "",
      country: "India",
      taxId: "",
      notes: "",
      active: true
    }
  )
  const router = useRouter()
  const { toast } = useToast()
  const editing = Boolean(customer?.id)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setCreateLogin(false)
    setForm(
      customer ?? {
        id: "",
        name: "",
        contactName: "",
        email: "",
        phone: "",
        addressLine: "",
        city: "",
        country: "India",
        taxId: "",
        notes: "",
        active: true
      }
    )
  }, [open, customer])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(editing ? `/api/customers/${customer!.id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, createPortalLogin: editing ? undefined : createLogin })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not save the customer")
      toast({
        title: editing ? "Customer updated" : "Customer created",
        description: !editing && createLogin ? "Portal login made with the password Customer@1234" : undefined,
        variant: "success"
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the customer")
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
        title={editing ? `Edit ${customer?.name}` : "New customer"}
        description="Customers can also self signup from the marketing site"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="customer-form" type="submit" loading={loading}>
              {editing ? "Save changes" : "Create customer"}
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={editing && Boolean(customer?.userId)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.addressLine ?? ""} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tax id</Label>
              <Input value={form.taxId ?? ""} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} label="Active customer" />

          {!editing && (
            <Switch
              checked={createLogin}
              onCheckedChange={setCreateLogin}
              label="Create a portal login"
              description="Password starts as Customer@1234 and the customer can reset it"
            />
          )}

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
