"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, toggle } = useTheme()
  const dark = theme === "dark"
  return (
    <button
      onClick={toggle}
      aria-label="Toggle colour mode"
      className={cn(
        "group inline-flex h-8 items-center gap-1.5 border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] px-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-[var(--lime)] hover:text-[#141210]",
        className
      )}
    >
      {dark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      {!compact && <span>{dark ? "Ink" : "Paper"}</span>}
    </button>
  )
}
