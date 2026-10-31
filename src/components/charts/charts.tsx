"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { cn, money } from "@/lib/utils"

const AXIS = { fontSize: 10, fill: "currentColor", opacity: 0.55 }
const LIME = "var(--lime)"
const COBALT = "var(--cobalt)"
const CORAL = "var(--coral)"
const WARN = "var(--warn)"
const INK = "var(--ink)"

function ChartTooltip({ active, payload, label, currency = true }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong px-2.5 py-2 text-[11px]">
      {label && <p className="mono-label mb-1 text-[color:var(--muted-text)]">{label}</p>}
      {payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2" style={{ background: entry.color ?? entry.fill }} />
          <span className="capitalize">{entry.name}</span>
          <span className="num ml-auto text-foreground">
            {currency && typeof entry.value === "number" ? money(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export function RevenueChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LIME} stopOpacity={0.5} />
            <stop offset="65%" stopColor={LIME} stopOpacity={0.12} />
            <stop offset="100%" stopColor={LIME} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="currentColor" opacity={0.12} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: INK, strokeDasharray: "3 3", opacity: 0.3 }} />
        <Area type="monotone" dataKey="value" name="collected" stroke={INK} strokeWidth={1.8} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function SubscriptionFlowChart({ data }: { data: { label: string; created: number; closed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 6" stroke="currentColor" opacity={0.12} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip currency={false} />} cursor={{ fill: INK, opacity: 0.06 }} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, opacity: 0.75 }} />
        <Bar dataKey="created" name="new" fill={INK} radius={[2, 2, 0, 0]} maxBarSize={18} />
        <Bar dataKey="closed" name="closed" fill={LIME} radius={[2, 2, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const METHOD_COLORS = [COBALT, LIME, WARN, INK, CORAL]

export function MethodDonut({ data }: { data: { label: string; amount: number; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  if (!data.length) return <ChartEmpty />
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-[220px]">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="label" innerRadius={54} outerRadius={82} paddingAngle={3} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full flex-1 space-y-2">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-none" style={{ background: METHOD_COLORS[i % METHOD_COLORS.length] }} />
            <span className="capitalize text-muted-foreground">{item.label.replace(/_/g, " ").toLowerCase()}</span>
            <span className="ml-auto font-semibold">{money(item.amount)}</span>
            <span className="w-10 text-right text-muted-foreground">{total ? Math.round((item.amount / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InvoiceStatusChart({ data }: { data: { label: string; amount: number; count: number }[] }) {
  if (!data.length) return <ChartEmpty />
  const max = Math.max(...data.map((d) => d.count), 1)
  const tone: Record<string, string> = {
    PAID: "bg-[var(--lime)]",
    CONFIRMED: "bg-[var(--cobalt)]",
    DRAFT: "bg-[color:color-mix(in_srgb,var(--line)_35%,transparent)]",
    CANCELLED: "bg-[var(--coral)]"
  }
  return (
    <div className="space-y-3.5 pt-1">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-[11.5px]">
            <span className="mono-label text-[var(--ink)]">{item.label}</span>
            <span className="num text-[10px] text-muted-foreground">
              {item.count.toLocaleString()} · {money(item.amount)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden border border-[color:color-mix(in_srgb,var(--line)_25%,transparent)] bg-transparent">
            <div
              className={cn("h-full transition-all duration-700", tone[item.label] ?? "bg-[var(--ink)]")}
              style={{ width: `${Math.max(3, (item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TopPlansChart({ data }: { data: { label: string; amount: number; count: number }[] }) {
  if (!data.length) return <ChartEmpty />
  const max = Math.max(...data.map((d) => d.amount), 1)
  return (
    <div className="space-y-3.5 pt-1">
      {data.map((item, i) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-[11.5px]">
            <span className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center border border-[color:color-mix(in_srgb,var(--line)_40%,transparent)] font-mono text-[9px] font-bold">
                {i + 1}
              </span>
              {item.label}
            </span>
            <span className="num text-[10px] text-muted-foreground">{money(item.amount)}</span>
          </div>
          <div className="h-1.5 overflow-hidden border border-[color:color-mix(in_srgb,var(--line)_25%,transparent)] bg-transparent">
            <div
              className="h-full bg-[var(--lime)]"
              style={{ width: `${Math.max(4, (item.amount / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MiniSparkline({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LIME} stopOpacity={0.55} />
            <stop offset="100%" stopColor={LIME} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={LIME} strokeWidth={1.8} fill="url(#spark)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ChartEmpty() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="halftone h-10 w-10 border-[1.5px] border-[color:color-mix(in_srgb,var(--line)_30%,transparent)] text-[color:var(--line)] opacity-60" />
      <p className="text-[11px] text-muted-foreground">Not enough data for this range yet</p>
    </div>
  )
}
