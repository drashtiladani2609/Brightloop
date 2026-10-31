import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[2px] border-[1.5px] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase leading-4 tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-[color:var(--line)] bg-[var(--lime)] text-[#141210]",
        secondary: "border-[color:var(--line)] bg-[var(--surface-2)] text-[var(--ink)]",
        success: "border-[color:var(--line)] bg-[var(--lime)] text-[#141210]",
        warning: "border-[color:var(--line)] bg-[var(--warn)] text-[#141210]",
        danger: "border-[color:var(--line)] bg-[var(--coral)] text-white",
        info: "border-[color:var(--line)] bg-[var(--cobalt)] text-white",
        teal: "border-[color:var(--line)] bg-[var(--lime)] text-[#141210]",
        outline: "border-[color:var(--line)] bg-transparent text-[color:var(--muted-text)]",
        muted: "border-transparent bg-[color:color-mix(in_srgb,var(--line)_10%,transparent)] text-[color:var(--muted-text)]"
      },
      pulse: { true: "", false: "" }
    },
    defaultVariants: { variant: "default", pulse: false }
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, pulse, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, pulse }), className)} {...props} />
}

const TONE: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
  DRAFT: { variant: "muted", label: "Draft" },
  QUOTATION: { variant: "info", label: "Quotation" },
  CONFIRMED: { variant: "info", label: "Confirmed" },
  ACTIVE: { variant: "success", label: "Active" },
  PAUSED: { variant: "warning", label: "Paused" },
  CLOSED: { variant: "muted", label: "Closed" },
  PAID: { variant: "success", label: "Paid" },
  PARTIAL: { variant: "warning", label: "Part paid" },
  OUTSTANDING: { variant: "secondary", label: "Outstanding" },
  OVERDUE: { variant: "danger", label: "Overdue" },
  CANCELLED: { variant: "muted", label: "Cancelled" },
  PENDING: { variant: "warning", label: "Pending" },
  SETTLED: { variant: "success", label: "Settled" }
}

export function StatusBadge({ status, className, pulse }: { status: string; className?: string; pulse?: boolean }) {
  const tone = TONE[status] ?? { variant: "outline" as const, label: status }
  const animate = pulse ?? false
  return (
    <Badge variant={tone.variant} pulse={animate} className={className}>
      <span className="h-1.5 w-1.5 bg-current" />
      {tone.label}
    </Badge>
  )
}
