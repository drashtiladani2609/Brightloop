"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Ban, Check, Mail, Printer, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

export function InvoiceActions({
  invoiceId,
  status,
  overdue
}: {
  invoiceId: string
  status: string
  overdue: boolean
}) {
  const [loading, setLoading] = React.useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  async function run(action: "confirm" | "cancel" | "send" | "remind") {
    setLoading(action)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Action failed")
      toast({
        title: json.data?.message ?? "Done",
        description: action === "send" || action === "remind" ? "Logged in the outbox" : undefined,
        variant: "success"
      })
      router.refresh()
    } catch (error) {
      toast({ title: "Action failed", description: error instanceof Error ? error.message : undefined, variant: "error" })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button size="sm" loading={loading === "confirm"} onClick={() => run("confirm")}>
          {loading !== "confirm" && <Check className="h-3.5 w-3.5" />} Confirm
        </Button>
      )}
      {["CONFIRMED", "PAID"].includes(status) && (
        <Button size="sm" variant="outline" loading={loading === "send"} onClick={() => run("send")}>
          {loading !== "send" && <Send className="h-3.5 w-3.5" />} Send
        </Button>
      )}
      {overdue && (
        <Button size="sm" variant="outline" className="border-[color-mix(in_srgb,var(--warn)_40%,transparent)] text-[color:var(--warn)]" loading={loading === "remind"} onClick={() => run("remind")}>
          {loading !== "remind" && <Mail className="h-3.5 w-3.5" />} Send reminder
        </Button>
      )}
      <a href={`/print/invoice/${invoiceId}`} target="_blank" rel="noreferrer">
        <Button size="sm" variant="outline">
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
      </a>
      {["DRAFT", "CONFIRMED"].includes(status) && (
        <Button
          size="sm"
          variant="ghost"
          className="text-[color:var(--neg)] hover:bg-[color-mix(in_srgb,var(--neg)_10%,transparent)]"
          loading={loading === "cancel"}
          onClick={() => run("cancel")}
        >
          {loading !== "cancel" && <XCircle className="h-3.5 w-3.5" />} Cancel
        </Button>
      )}
      {status === "PAID" && (
        <span className="flex items-center gap-1.5 rounded-[2px] bg-[color-mix(in_srgb,var(--pos)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--pos)]">
          <Check className="h-3 w-3" /> settled
        </span>
      )}
      {status === "CANCELLED" && (
        <span className="flex items-center gap-1.5 rounded-[2px] bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <Ban className="h-3 w-3" /> cancelled
        </span>
      )}
    </div>
  )
}
