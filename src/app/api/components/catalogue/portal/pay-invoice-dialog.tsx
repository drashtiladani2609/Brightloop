"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/constants"
import { money } from "@/lib/utils"

export function PayInvoiceDialog({
  invoiceId,
  invoiceNumber,
  balance,
  trigger
}: {
  invoiceId: string
  invoiceNumber: string
  balance: number
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [method, setMethod] = React.useState("CARD")
  const [amount, setAmount] = React.useState(balance)
  const router = useRouter()
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setAmount(Number(balance.toFixed(2)))
      setError(null)
    }
  }, [open, balance])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/payments?invoiceId=${invoiceId}&mode=intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, amount: Number(amount) })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not register the payment")
      toast({
        title: "Payment registered",
        description: "Our finance team confirms it and the invoice flips to paid",
        variant: "success",
        duration: 7000
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Pay ${invoiceNumber}`}
        description="This records a payment intent. Finance confirms it to settle the invoice"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="pay-form" type="submit" loading={loading}>
              Submit payment
            </Button>
          </>
        }
      >
        <form id="pay-form" onSubmit={submit} className="space-y-4">
          <div className="rounded-[2px] border border-border/60 bg-secondary/40 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance on this invoice</span>
              <span className="font-semibold">{money(balance)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((option) => (
                  <option key={option} value={option}>
                    {PAYMENT_METHOD_LABEL[option]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>
          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CreditCard className="h-3 w-3" /> No real money moves in this demo build
          </p>
        </form>
      </Dialog>
    </>
  )
}
