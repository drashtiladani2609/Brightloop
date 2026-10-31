"use client"

import { Check, X } from "lucide-react"
import { passwordChecks } from "@/lib/password"
import { cn } from "@/lib/utils"

const RULES = [
  { key: "length" as const, label: "More than 8 characters" },
  { key: "upper" as const, label: "One uppercase letter" },
  { key: "lower" as const, label: "One lowercase letter" },
  { key: "special" as const, label: "One special character" }
]

export function PasswordChecklist({ value }: { value: string }) {
  const checks = passwordChecks(value)
  const passed = Object.values(checks).filter(Boolean).length

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-none transition-colors duration-300",
              passed > i
                ? passed <= 2
                  ? "bg-[color-mix(in_srgb,var(--warn)_30%,transparent)]"
                  : passed === 3
                    ? "bg-[color-mix(in_srgb,var(--cobalt)_30%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--pos)_30%,transparent)]"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {RULES.map((rule) => {
          const ok = checks[rule.key]
          return (
            <li
              key={rule.key}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors",
                ok ? "text-[color:var(--pos)]" : "text-muted-foreground"
              )}
            >
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
