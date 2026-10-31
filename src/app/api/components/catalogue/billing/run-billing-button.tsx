"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

export function RunBillingButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function run() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/run", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Billing run failed")
      const run = json.data
      toast({
        title: `${run.created} invoice${run.created === 1 ? "" : "s"} created`,
        description: `Skipped ${run.skipped} already billed periods · ${run.errors} errors · ${run.durationMs}ms`,
        variant: run.errors > 0 ? "warning" : "success",
        duration: 7000
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Billing run failed",
        description: error instanceof Error ? error.message : "Try again in a moment",
        variant: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant={variant} onClick={run} loading={loading}>
      {!loading && <PlayCircle className="h-3.5 w-3.5" />} Run billing now
    </Button>
  )
}
