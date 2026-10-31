"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Tabs({
  tabs,
  value,
  onChange,
  className
}: {
  tabs: { value: string; label: string; count?: number }[]
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "whitespace-nowrap rounded-[2px] border-[1.5px] px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] transition-colors",
              active
                ? "border-[color:var(--line)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-[color:color-mix(in_srgb,var(--line)_25%,transparent)] bg-transparent text-[color:var(--muted-text)] hover:border-[color:var(--line)] hover:text-[var(--ink)]"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && <span className="ml-1.5 opacity-55">{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
