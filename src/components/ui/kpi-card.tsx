"use client"

import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock,
  FileText,
  Layers,
  Percent,
  Receipt,
  TrendingUp,
  UserCheck,
  Users,
  Wallet
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CountUp } from "@/components/ui/count-up"

const ICONS = {
  layers: Layers,
  trending: TrendingUp,
  revenue: CircleDollarSign,
  wallet: Wallet,
  alert: AlertTriangle,
  invoice: FileText,
  receipt: Receipt,
  users: Users,
  customer: UserCheck,
  activity: Activity,
  clock: Clock,
  percent: Percent,
  boxes: Boxes
}

export type KpiIcon = keyof typeof ICONS

const FORMATTERS: Record<string, (v: number) => string> = {
  number: (v) => Math.round(v).toLocaleString("en-US"),
  currency: (v) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v),
  money: (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)
}

export function KpiCard({
  label,
  value,
  format = "number",
  icon = "layers",
  hint,
  trend,
  tone = "violet",
  index = 0
}: {
  label: string
  value: number
  format?: keyof typeof FORMATTERS
  icon?: KpiIcon
  hint?: string
  trend?: { value: number; label?: string }
  tone?: "violet" | "teal" | "amber" | "rose" | "sky"
  index?: number
}) {
  const Icon = ICONS[icon] ?? Layers
  const tones: Record<string, string> = {
    violet: "bg-[var(--cobalt)]",
    teal: "bg-[var(--lime)]",
    amber: "bg-[var(--warn)]",
    rose: "bg-[var(--coral)]",
    sky: "bg-[var(--cobalt)]"
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass group relative overflow-hidden p-3.5 lift"
    >
      <span className={cn("absolute left-0 top-0 h-full w-[3px]", tones[tone])} />
      <div className="flex items-start justify-between gap-2 pl-1.5">
        <p className="mono-label max-w-[82%] leading-4 text-[color:var(--muted-text)]">{label}</p>
        <span className="border-[1.5px] border-[color:color-mix(in_srgb,var(--line)_40%,transparent)] p-1">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="num mt-2.5 pl-1.5 text-[25px] font-medium leading-none tracking-tight">
        <CountUp value={value} format={FORMATTERS[format]} />
      </p>
      {hint && (
        <p className="mt-2 border-t border-dashed border-[color:color-mix(in_srgb,var(--line)_25%,transparent)] pt-1.5 pl-1.5 text-[10px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {trend && (
        <div className="mt-2 flex items-center gap-1.5 pl-1.5 text-[10px]">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 border-[1.5px] border-[color:color-mix(in_srgb,var(--line)_40%,transparent)] px-1 font-mono font-bold",
              trend.value >= 0 ? "bg-[var(--lime)] text-[#141210]" : "bg-[var(--coral)] text-white"
            )}
          >
            {trend.value >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
        </div>
      )}
    </motion.div>
  )
}
