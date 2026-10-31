"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { PasswordChecklist } from "@/components/auth/password-checklist"
import { isStrongPassword } from "@/lib/password"

export function StaffDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "STAFF" })
  const router = useRouter()
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", password: "", role: "STAFF" })
      setError(null)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not create the account")
      toast({ title: "Staff account created", description: `${form.email} can sign in now`, variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account")
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
        title="Create a staff account"
        description="Staff handle customers, subscriptions, invoices and payments. Only admins change the catalogue"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="staff-form" type="submit" loading={loading} disabled={!isStrongPassword(form.password)}>
              Create account
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@brightloop.app"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="STAFF">Staff · day to day work</option>
              <option value="ADMIN">Admin · full control</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <PasswordChecklist value={form.password} />
          </div>
          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
