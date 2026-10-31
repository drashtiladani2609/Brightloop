"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  name
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  name?: string
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        name={name}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-[2px] border-[1.5px] border-[color:var(--line)] transition-colors",
          checked ? "bg-[var(--lime)]" : "bg-transparent"
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-3.5 w-3.5 bg-[var(--ink)] transition-transform duration-200",
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          )}
        />
      </button>
      {(label || description) && (
        <span className="leading-tight">
          {label && <span className="block text-[12.5px] font-semibold">{label}</span>}
          {description && <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{description}</span>}
        </span>
      )}
    </label>
  )
}
