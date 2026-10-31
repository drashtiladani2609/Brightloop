"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarRange, RotateCcw } from "lucide-react"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toInputDate } from "@/lib/utils"

export function RangeFilters({
  plans,
  customers,
  showStatus = false
}: {
  plans: { id: string; name: string }[]
  customers: { id: string; name: string }[]
  showStatus?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (!value) next.delete(key)
    else next.set(key, value)
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  const presets = [
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "6m", days: 182 },
    { label: "12m", days: 365 }
  ]

  const applyPreset = (days: number) => {
    const to = new Date()
    const from = new Date(Date.now() - days * 86400000)
    const next = new URLSearchParams(params.toString())
    next.set("from", toInputDate(from))
    next.set("to", toInputDate(to))
    router.push(`${pathname}?${next.toString()}`)
  }

  const hasFilters = ["from", "to", "planId", "customerId", "status"].some((k) => params.get(k))

  return (
    <div className="glass mb-4 flex flex-wrap items-end gap-2 rounded-[2px] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" /> Range
      </div>
      <Input
        type="date"
        value={params.get("from") ?? ""}
        onChange={(e) => set("from", e.target.value)}
        className="h-9 w-[145px] text-xs"
        aria-label="From date"
      />
      <Input
        type="date"
        value={params.get("to") ?? ""}
        onChange={(e) => set("to", e.target.value)}
        className="h-9 w-[145px] text-xs"
        aria-label="To date"
      />
      <div className="flex gap-1">
        {presets.map((p) => (
          <Button key={p.label} size="sm" variant="outline" onClick={() => applyPreset(p.days)} className="h-9">
            {p.label}
          </Button>
        ))}
      </div>
      <Select
        value={params.get("planId") ?? ""}
        onChange={(e) => set("planId", e.target.value)}
        className="h-9 w-full text-xs sm:w-[170px]"
        aria-label="Plan"
      >
        <option value="">All plans</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Select
        value={params.get("customerId") ?? ""}
        onChange={(e) => set("customerId", e.target.value)}
        className="h-9 w-full text-xs sm:w-[190px]"
        aria-label="Customer"
      >
        <option value="">All customers</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {showStatus && (
        <Select
          value={params.get("status") ?? ""}
          onChange={(e) => set("status", e.target.value)}
          className="h-9 w-full text-xs sm:w-[150px]"
          aria-label="Invoice status"
        >
          <option value="">Any status</option>
          {["PAID", "CONFIRMED", "DRAFT", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      )}
      {hasFilters && (
        <Button
          size="sm"
          variant="ghost"
          className="h-9 text-xs"
          onClick={() => router.push(pathname)}
          title="Reset filters"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      )}
    </div>
  )
}
