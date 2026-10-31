"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "right",
  className
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  side?: "right" | "left"
  className?: string
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  React.useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-[#141210]/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={cn(
              "absolute top-0 h-full w-full max-w-md overflow-y-auto border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] p-4",
              side === "right" ? "right-0" : "left-0",
              className
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                {title && <h2 className="font-display text-[22px] leading-none tracking-tight">{title}</h2>}
                {description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="border-[1.5px] border-[color:var(--line)] p-1 hover:bg-[var(--coral)] hover:text-white"
                aria-label="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
