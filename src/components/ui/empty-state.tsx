import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  action,
  icon,
  className
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center", className)}>
      <div className="halftone pointer-events-none absolute inset-x-0 top-0 h-14 text-[color:var(--line)] opacity-[0.12]" />
      <div className="relative mb-3.5 flex h-12 w-12 items-center justify-center border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] offset-lime">
        {icon ?? <span className="font-display text-xl leading-none">0</span>}
      </div>
      <h3 className="relative font-display text-[20px] leading-tight">{title}</h3>
      {description && <p className="relative mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="relative mt-4">{action}</div>}
    </div>
  )
}
