"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

export function SettleIntentButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function settle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/${paymentId}/settle`, { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not settle")
      toast({ title: "Payment settled", variant: "success" })
      router.refresh()
    } catch (error) {
      toast({ title: "Settle failed", description: error instanceof Error ? error.message : undefined, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" loading={loading} onClick={settle} className="h-7 text-[11px]">
      {!loading && <Check className="h-3 w-3" />} Settle
    </Button>
  )
}
