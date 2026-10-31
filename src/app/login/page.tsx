"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Eye, EyeOff, LogIn, TriangleAlert } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"

const DEMOS = [
  { label: "Admin", email: "admin@brightloop.app", password: "Admin@1234" },
  { label: "Staff", email: "staff@brightloop.app", password: "Staff@1234" },
  { label: "Customer", email: "northwind.systems@northwindsystems.io", password: "Customer@1234" }
]

export default function LoginPage() {
  const { toast } = useToast()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [show, setShow] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function signIn(creds: { email: string; password: string }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not sign you in")

      const check = await fetch("/api/auth/session", { cache: "no-store" })
      if (!check.ok) {
        throw new Error("Signed in but this preview blocked the session cookie. Open the app in its own browser tab and try again.")
      }

      toast({ title: "Welcome back", description: "Taking you to your workspace", variant: "success" })
      window.location.assign(json.data.redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign you in")
      setLoading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    void signIn({ email, password })
  }

  return (
    <AuthShell
      title="Sign in to Brightloop"
      subtitle="Use a demo account below or your own credentials"
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-[color:var(--cobalt)] underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.io"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-[11px] text-[color:var(--cobalt)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
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

        <Button type="submit" className="w-full" loading={loading} size="lg">
          {!loading && <LogIn className="h-4 w-4" />} Sign in
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative mb-3 text-center">
          <span className="relative z-10 bg-transparent px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            one click demo
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMOS.map((demo) => (
            <button
              key={demo.label}
              type="button"
              disabled={loading}
              onClick={() => {
                setEmail(demo.email)
                setPassword(demo.password)
                void signIn(demo)
              }}
              className="group rounded-[2px] border border-border/60 bg-secondary/40 px-2 py-2 text-[11px] font-medium text-muted-foreground transition hover:border-[color-mix(in_srgb,var(--cobalt)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--cobalt)_10%,transparent)] hover:text-foreground disabled:opacity-50"
            >
              {demo.label}
              <ArrowRight className="ml-1 inline h-3 w-3 opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}
