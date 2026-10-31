"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Ban, Check, Pause, Play, Repeat, Send, Sparkles, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

type Action =
  | "SEND_QUOTATION"
  | "CONFIRM"
  | "ACTIVATE"
  | "PAUSE"
  | "RESUME"
  | "CLOSE"
  | "RENEW"

const COPY: Record<string, { label: string; icon: typeof Check; tone: "default" | "outline" | "destructive" | "accent"; hint: string }> = {
  SEND_QUOTATION: { label: "Send quotation", icon: Send, tone: "outline", hint: "Move this draft into quotation and start the validity clock" },
  CONFIRM: { label: "Confirm", icon: Check, tone: "default", hint: "Lock the quotation into a confirmed subscription" },
  ACTIVATE: { label: "Activate", icon: Sparkles, tone: "accent", hint: "Start billing from the next period and generate the first invoice" },
  PAUSE: { label: "Pause", icon: Pause, tone: "outline", hint: "Hold billing until you resume. The plan must allow pausing" },
  RESUME: { label: "Resume", icon: Play, tone: "default", hint: "Restart billing from today" },
  CLOSE: { label: "Close", icon: XCircle, tone: "destructive", hint: "End the subscription. Early close needs the plan to allow it" },
  RENEW: { label: "Renew", icon: Repeat, tone: "outline", hint: "Create the next term as a fresh draft from the same lines" }
}

export function SubscriptionActions({
  subscriptionId,
  available
}: {
  subscriptionId: string
  available: { action: Action; disabledReason?: string }[]
}) {
  const [pending, setPending] = React.useState<Action | null>(null)
  const [note, setNote] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function run(action: Action, note: string) {
    setLoading(true)
    try {
      const res = await fetch(action === "RENEW" ? `/api/subscriptions/${subscriptionId}/renew` : `/api/subscriptions/${subscriptionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not update the subscription")
      toast({ title: COPY[action].label + " done", variant: "success" })
      setPending(null)
      setNote("")
      if (action === "RENEW" && json.data?.id) router.push(`/subscriptions/${json.data.id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {available.map(({ action, disabledReason }) => {
        const copy = COPY[action]
        const Icon = copy.icon
        return (
          <Button
            key={action}
            size="sm"
            variant={copy.tone === "accent" ? "default" : copy.tone}
            disabled={Boolean(disabledReason)}
            title={disabledReason ?? copy.hint}
            onClick={() => {
              if (action === "PAUSE" || action === "CLOSE" || action === "RENEW") setPending(action)
              else run(action, "")
            }}
            className={cn(disabledReason && "opacity-50")}
          >
            <Icon className="h-3.5 w-3.5" /> {copy.label}
          </Button>
        )
      })}

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? COPY[pending].label : ""}
        description={pending ? COPY[pending].hint : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={() => pending && run(pending, note)}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Add a note for the audit trail (optional)</p>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Customer asked to pause during their migration" />
        </div>
      </Dialog>
    </div>
  )
}

export function QuickActionButton({
  label,
  icon,
  onClick,
  variant = "outline"
}: {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: "outline" | "default"
}) {
  return (
    <Button size="sm" variant={variant} onClick={onClick}>
      {icon}
      {label}
    </Button>
  )
}

export const ACTION_ICONS = { Ban }
