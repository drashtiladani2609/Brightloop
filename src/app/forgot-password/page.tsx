"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Copy, MailCheck, Send } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [devLink, setDevLink] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not send the link")
      setSent(true)
      if (json.data.devLink) {
        setDevLink(json.data.devLink)
        toast({
          title: "Dev mode reset link",
          description: "No SMTP configured so the link is shown here and printed in the server console",
          variant: "info",
          duration: 12000
        })
      } else {
        toast({ title: "Check your inbox", description: "The reset link expires in 60 minutes", variant: "success" })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We send a single use link that expires in 60 minutes"
      footer={
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[color:var(--cobalt)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-start gap-3 rounded-[2px] border border-[color-mix(in_srgb,var(--pos)_30%,transparent)] bg-[color-mix(in_srgb,var(--pos)_10%,transparent)] p-4">
            <MailCheck className="mt-0.5 h-5 w-5 text-[color:var(--pos)]" />
            <div>
              <p className="text-sm font-semibold">Link sent</p>
              <p className="mt-1 text-xs text-muted-foreground">
                If <span className="font-medium text-foreground">{email}</span> is registered you will get an email in a
                moment.
              </p>
            </div>
          </div>

          {devLink && (
            <div className="rounded-[2px] border border-[color-mix(in_srgb,var(--warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--warn)]">dev only</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SMTP is not configured so here is your reset link. It is also printed in the server console.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded-[2px] bg-black/30 px-2.5 py-2 text-[11px] text-[color:var(--warn)]">{devLink}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(devLink)
                    toast({ title: "Copied", variant: "success" })
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Link href={devLink} className="mt-2 inline-block text-[11px] font-semibold text-[color:var(--warn)] underline">
                Open the reset page
              </Link>
            </div>
          )}
        </motion.div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Registered email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.io"
            />
          </div>
          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {!loading && <Send className="h-4 w-4" />} Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
