"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, TriangleAlert, UserPlus } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { PasswordChecklist } from "@/components/auth/password-checklist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { isStrongPassword } from "@/lib/password"

export default function SignupPage() {
  const { toast } = useToast()
  const [form, setForm] = React.useState({ name: "", company: "", email: "", password: "" })
  const [show, setShow] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const strong = isStrongPassword(form.password)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!strong) {
      setError("Password does not meet all four rules yet")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not create your account")

      const check = await fetch("/api/auth/session", { cache: "no-store" })
      if (!check.ok) {
        throw new Error("Account created but this preview blocked the session cookie. Open the app in its own browser tab and sign in.")
      }

      toast({ title: "Account created", description: "Welcome to the customer portal", variant: "success" })
      window.location.assign(json.data.redirect ?? "/portal")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account")
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Self signup opens the customer portal. Staff accounts are made by an admin"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[color:var(--cobalt)] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Priya Menon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Northwind Systems"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.io"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 9 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordChecklist value={form.password} />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!strong}>
          {!loading && <UserPlus className="h-4 w-4" />} Create account
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          One account per email. By continuing you agree to the demo terms of this build
        </p>
      </form>
    </AuthShell>
  )
}
