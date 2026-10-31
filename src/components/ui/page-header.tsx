import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col justify-between gap-3 border-b-[1.5px] border-[color:var(--line)] pb-3 sm:flex-row sm:items-end",
        className
      )}
    >
      <div>
        <h2 className="font-display text-[30px] leading-none tracking-tight sm:text-[38px]">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
