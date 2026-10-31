"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Variant = "success" | "error" | "info" | "warning"
type ToastItem = { id: string; title: string; description?: string; variant: Variant; duration: number }

type ToastContextValue = {
  toast: (input: { title: string; description?: string; variant?: Variant; duration?: number }) => void
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} })

export const useToast = () => React.useContext(ToastContext)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert
}

const TONES: Record<Variant, string> = {
  success: "border-l-[var(--lime)] text-[var(--lime)]",
  error: "border-l-[var(--coral)] text-[var(--coral)]",
  info: "border-l-[var(--cobalt)] text-[var(--cobalt)]",
  warning: "border-l-[var(--warn)] text-[var(--warn)]"
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = "info", duration = 4800 }: { title: string; description?: string; variant?: Variant; duration?: number }) => {
      const id = Math.random().toString(36).slice(2)
      setItems((prev) => [...prev.slice(-3), { id, title, description, variant, duration }])
      setTimeout(() => remove(id), duration)
    },
    [remove]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-auto sm:items-end">
        <AnimatePresence>
          {items.map((item) => {
            const Icon = ICONS[item.variant]
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 border-[1.5px] border-l-[4px] border-[color:var(--line)] bg-[var(--surface)] p-3 offset",
                  TONES[item.variant]
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-foreground">{item.title}</p>
                  {item.description && <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>}
                </div>
                <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
