"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  wide?: boolean
}

export function Dialog({ open, onOpenChange, title, description, children, footer, className, wide }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onOpenChange])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[#141210]/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "glass-strong relative z-10 max-h-[90vh] w-full overflow-y-auto",
              wide ? "max-w-3xl" : "max-w-lg",
              className
            )}
          >
            <div className="rule flex items-start justify-between gap-3 bg-[color:color-mix(in_srgb,var(--lime)_22%,var(--surface))] px-4 py-3">
              <div>
                {title && <h2 className="font-display text-[22px] leading-none tracking-tight">{title}</h2>}
                {description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] p-1 transition hover:bg-[var(--coral)] hover:text-white"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t-[1.5px] border-[color:color-mix(in_srgb,var(--line)_20%,transparent)] bg-[var(--surface-2)] px-4 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
