"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/constants"
import { money, toInputDate } from "@/lib/utils"

type InvoiceOption = { id: string; number: string; total: number; amountPaid: number }

export function PaymentDialog({
  invoices,
  invoiceId,
  trigger
}: {
  invoices: InvoiceOption[]
  invoiceId?: string
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    invoiceId: invoiceId ?? invoices[0]?.id ?? "",
    method: "BANK_TRANSFER",
    amount: 0,
    paidAt: toInputDate(new Date()),
    reference: "",
    note: ""
  })
  const router = useRouter()
  const { toast } = useToast()

  const selected = invoices.find((invoice) => invoice.id === form.invoiceId)
  const outstanding = selected ? Number((selected.total - selected.amountPaid).toFixed(2)) : 0

  React.useEffect(() => {
    if (!open) return
    setError(null)
    const preset = invoiceId ?? invoices[0]?.id ?? ""
    const invoice = invoices.find((i) => i.id === preset)
    setForm({
      invoiceId: preset,
      method: "BANK_TRANSFER",
      amount: invoice ? Number((invoice.total - invoice.amountPaid).toFixed(2)) : 0,
      paidAt: toInputDate(new Date()),
      reference: "",
      note: ""
    })
  }, [open, invoiceId, invoices])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not record the payment")
      toast({ title: "Payment recorded", description: `${money(Number(form.amount))} booked`, variant: "success" })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the payment")
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
        title="Record a payment"
        description="Part payments are fine. The invoice flips to paid when the balance hits zero"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="payment-form" type="submit" loading={loading}>
              Record payment
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Invoice</Label>
            <Select
              value={form.invoiceId}
              onChange={(e) => {
                const invoice = invoices.find((i) => i.id === e.target.value)
                setForm({
                  ...form,
                  invoiceId: e.target.value,
                  amount: invoice ? Number((invoice.total - invoice.amountPaid).toFixed(2)) : form.amount
                })
              }}
            >
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.number} · due {money(invoice.total - invoice.amountPaid)}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABEL[method]}
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
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paid on</Label>
              <Input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="UTR or cheque no" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Anything worth remembering" />
          </div>

          <div className="flex items-center justify-between rounded-[2px] border border-border/60 bg-secondary/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Outstanding on this invoice</span>
            <span className="font-semibold">{money(outstanding)}</span>
          </div>

          {error && <p className="rounded-[2px] border border-[color-mix(in_srgb,var(--neg)_30%,transparent)] bg-[color-mix(in_srgb,var(--neg)_10%,transparent)] p-2.5 text-xs text-[color:var(--neg)]">{error}</p>}
        </form>
      </Dialog>
    </>
  )
}
