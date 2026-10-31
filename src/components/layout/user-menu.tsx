"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, LogOut, Settings2 } from "lucide-react"
import { initials } from "@/lib/utils"

export function UserMenu({ user }: { user: { name: string; email: string; role: string } }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const roleLabel = user.role === "ADMIN" ? "Administrator" : user.role === "STAFF" ? "Internal staff" : "Customer"

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] py-1 pl-1 pr-2 transition-colors hover:bg-[var(--lime)] hover:text-[#141210]"
      >
        <span className="grid h-5 w-5 place-items-center bg-[var(--ink)] font-mono text-[9px] font-bold text-[var(--paper)]">
          {initials(user.name)}
        </span>
        <span className="hidden text-[11px] font-medium sm:block">{user.name.split(" ")[0]}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="glass-strong absolute right-0 top-10 z-50 w-56 p-2"
            >
              <div className="border-b border-dashed border-[color:color-mix(in_srgb,var(--line)_30%,transparent)] px-1 pb-2">
                <p className="truncate text-[11px] font-semibold">{user.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                <span className="mono-label mt-1.5 inline-block bg-[var(--lime)] px-1.5 py-0.5 text-[8px] text-[#141210]">
                  {roleLabel}
                </span>
              </div>
              <a
                href={user.role === "CUSTOMER" ? "/portal/profile" : "/account"}
                className="mt-1 flex items-center gap-2 px-1.5 py-1.5 text-[11px] transition-colors hover:bg-[color:color-mix(in_srgb,var(--lime)_24%,transparent)]"
              >
                <Settings2 className="h-3 w-3" /> Account settings
              </a>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-1.5 py-1.5 text-[11px] text-[var(--coral)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--coral)_12%,transparent)]"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
