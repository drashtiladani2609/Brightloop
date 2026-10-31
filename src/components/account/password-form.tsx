"use client"

import * as React from "react"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { PasswordChecklist } from "@/components/auth/password-checklist"
import { isStrongPassword } from "@/lib/password"

export function PasswordForm() {
  const [form, setForm] = React.useState({ currentPassword: "", newPassword: "" })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { toast } = useToast()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not change the password")
      toast({ title: "Password changed", variant: "success" })
      setForm({ currentPassword: "", newPassword: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Current password</Label>
        <Input
          type="password"
          required
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>New password</Label>
        <Input
          type="password"
          required
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
        <PasswordChecklist value={form.newPassword} />
      </div>
      {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
      <Button type="submit" loading={loading} disabled={!isStrongPassword(form.newPassword)}>
        {!loading && <KeyRound className="h-4 w-4" />} Update password
      </Button>
    </form>
  )
}
