import * as React from "react"
import { cn } from "@/lib/utils"

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] border-collapse text-[12.5px]">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 border-b-[1.5px] border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted-text)]",
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-[color:color-mix(in_srgb,var(--line)_12%,transparent)] px-3 py-2.5 align-middle", className)}>{children}</td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-[color:color-mix(in_srgb,var(--lime)_16%,transparent)]", className)}>{children}</tr>
}
