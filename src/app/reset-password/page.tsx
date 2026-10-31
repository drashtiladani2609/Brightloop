"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { PasswordChecklist } from "@/components/auth/password-checklist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { isStrongPassword } from "@/lib/password"

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const token = params.get("token") ?? ""
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const strong = isStrongPassword(password)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Both passwords must match")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not reset the password")
      setDone(true)
      toast({ title: "Password updated", description: "Sign in with the new password", variant: "success" })
      setTimeout(() => router.push("/login"), 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-4 text-sm text-[color:var(--neg)]">
        This page needs a reset token. Request a fresh link from the{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          forgot password page
        </Link>
        .
      </div>
    )
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--pos)_15%,transparent)]">
          <ShieldCheck className="h-6 w-6 text-[color:var(--pos)]" />
        </span>
        <p className="text-sm font-semibold">Password changed</p>
        <p className="text-xs text-muted-foreground">Taking you to the sign in page</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 9 characters"
        />
        <PasswordChecklist value={password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Repeat password</Label>
        <Input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again"
        />
      </div>
      {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
      <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!strong}>
        {!loading && <KeyRound className="h-4 w-4" />} Set new password
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Your reset link works once and then it expires"
      footer={
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[color:var(--cobalt)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      <React.Suspense fallback={<div className="h-40 animate-pulse rounded-[2px] bg-muted/40" />}>
        <ResetForm />
      </React.Suspense>
    </AuthShell>
  )
}
