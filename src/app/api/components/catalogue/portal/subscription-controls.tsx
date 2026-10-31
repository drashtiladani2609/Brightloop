"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pause, Play, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"

export function SubscriptionControls({
  subscriptionId,
  status,
  pausable,
  closableEarly,
  pastEnd
}: {
  subscriptionId: string
  status: string
  pausable: boolean
  closableEarly: boolean
  pastEnd: boolean
}) {
  const [confirming, setConfirming] = React.useState<"PAUSE" | "CLOSE" | null>(null)
  const [note, setNote] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function run(action: "PAUSE" | "RESUME" | "CLOSE") {
    setLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not update the subscription")
      toast({
        title: action === "PAUSE" ? "Subscription paused" : action === "RESUME" ? "Subscription resumed" : "Close request registered",
        description: "Our billing team has been notified",
        variant: "success"
      })
      setConfirming(null)
      setNote("")
      router.refresh()
    } catch (error) {
      toast({ title: "Action failed", description: error instanceof Error ? error.message : undefined, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const canClose = closableEarly || pastEnd

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          disabled={!pausable}
          title={pausable ? "Pause billing" : "Your plan does not allow pausing"}
          onClick={() => setConfirming("PAUSE")}
        >
          <Pause className="h-3.5 w-3.5" /> Pause
        </Button>
      )}
      {status === "PAUSED" && (
        <Button size="sm" variant="accent" loading={loading} onClick={() => run("RESUME")}>
          {!loading && <Play className="h-3.5 w-3.5" />} Resume
        </Button>
      )}
      {["ACTIVE", "PAUSED", "CONFIRMED"].includes(status) && (
        <Button
          size="sm"
          variant="ghost"
          className="text-[color:var(--neg)] hover:bg-[color-mix(in_srgb,var(--neg)_10%,transparent)]"
          disabled={!canClose}
          title={canClose ? "Request closure" : "Your plan runs until its end date"}
          onClick={() => setConfirming("CLOSE")}
        >
          <XCircle className="h-3.5 w-3.5" /> Close
        </Button>
      )}

      <Dialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming === "PAUSE" ? "Pause this subscription" : "Close this subscription"}
        description={
          confirming === "PAUSE"
            ? "Billing stops until you resume. You can resume any time"
            : "Closing ends the subscription. Open invoices still need paying"
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              loading={loading}
              variant={confirming === "CLOSE" ? "destructive" : "default"}
              onClick={() => confirming && run(confirming)}
            >
              {confirming === "PAUSE" ? "Pause now" : "Close now"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tell us why (optional)</p>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="We are migrating systems this month" />
        </div>
      </Dialog>
    </div>
  )
}
