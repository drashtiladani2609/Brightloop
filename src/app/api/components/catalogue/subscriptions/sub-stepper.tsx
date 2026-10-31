"use client"

import { motion } from "framer-motion"
import { Check, Circle, Pause } from "lucide-react"
import { SUB_FLOW } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function SubStepper({ status }: { status: string }) {
  const paused = status === "PAUSED"
  const activeIndex = Math.max(0, SUB_FLOW.indexOf((paused ? "ACTIVE" : status) as "DRAFT"))

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
      {SUB_FLOW.map((step, index) => {
        const done = index < activeIndex || status === "CLOSED"
        const current = index === activeIndex && status !== "CLOSED"
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.06 }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-none border text-[10px] font-bold",
                  done && "border-[color-mix(in_srgb,var(--pos)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos)_15%,transparent)] text-[color:var(--pos)]",
                  current && "border-[color-mix(in_srgb,var(--cobalt)_60%,transparent)] bg-[color-mix(in_srgb,var(--cobalt)_20%,transparent)] text-[color:var(--cobalt)] ring-2 ring-[color-mix(in_srgb,var(--cobalt)_55%,transparent)]",
                  !done && !current && "border-border/60 bg-secondary/40 text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : current ? <Circle className="h-2 w-2 fill-current" /> : index + 1}
              </motion.span>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px] font-medium",
                  current ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60"
                )}
              >
                {step}
              </span>
            </div>
            {index < SUB_FLOW.length - 1 && (
              <span
                className={cn(
                  "mx-1.5 h-px w-6 sm:w-10",
                  index < activeIndex ? "bg-[color-mix(in_srgb,var(--pos)_40%,transparent)]" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
      {paused && (
        <span className="ml-2 flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--warn)]">
          <Pause className="h-2.5 w-2.5" /> paused
        </span>
      )}
    </div>
  )
}
