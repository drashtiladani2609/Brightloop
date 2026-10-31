"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronsLeft, LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV, PORTAL_NAV, type NavItem } from "@/components/layout/nav-config"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"

type ShellUser = { name: string; email: string; role: string }

export function AppShell({
  user,
  children,
  portal = false
}: {
  user: ShellUser
  children: React.ReactNode
  portal?: boolean
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const items = portal ? PORTAL_NAV : NAV.filter((item) => item.roles.includes(user.role as "ADMIN"))
  const groups = Array.from(new Set(items.map((i) => i.group)))
  const roleLabel = user.role === "ADMIN" ? "Administrator" : user.role === "STAFF" ? "Internal staff" : "Customer"

  React.useEffect(() => setMobileOpen(false), [pathname])

  const isActive = (item: NavItem) =>
    pathname === item.href || (item.href !== "/dashboard" && item.href !== "/portal" && pathname.startsWith(item.href))

  const navBody = (compact: boolean) => (
    <>
      <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map((group, groupIndex) => (
          <div key={group}>
            {!compact && (
              <p className="mono-label px-2 pb-1.5 text-[8px] text-[color:color-mix(in_srgb,var(--rail-text)_38%,transparent)]">
                {String(groupIndex + 1).padStart(2, "0")} / {group}
              </p>
            )}
            <ul>
              {items
                .filter((i) => i.group === group)
                .map((item) => {
                  const active = isActive(item)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "group flex items-center gap-2 border-l-[3px] py-1.5 pl-2 pr-2 text-[12px] transition-colors",
                          active
                            ? "border-[var(--lime)] bg-[color:color-mix(in_srgb,var(--rail-text)_10%,transparent)] font-semibold text-[var(--rail-text)]"
                            : "border-transparent text-[color:color-mix(in_srgb,var(--rail-text)_55%,transparent)] hover:border-[color:color-mix(in_srgb,var(--rail-text)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--rail-text)_6%,transparent)] hover:text-[var(--rail-text)]",
                          compact && "justify-center px-0 pl-0"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            active
                              ? "text-[var(--lime)]"
                              : "text-[color:color-mix(in_srgb,var(--rail-text)_40%,transparent)] group-hover:text-[color:color-mix(in_srgb,var(--rail-text)_80%,transparent)]"
                          )}
                        />
                        {!compact && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-[color:color-mix(in_srgb,var(--rail-text)_14%,transparent)] p-2.5">
        {!compact && (
          <div className="border-[1.5px] border-[color:color-mix(in_srgb,var(--rail-text)_22%,transparent)] p-2">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center bg-[var(--rail-text)] font-mono text-[9px] font-bold text-[var(--rail)]">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-[var(--rail-text)]">{user.name}</p>
                <p className="mono-label truncate text-[7.5px] text-[color:color-mix(in_srgb,var(--rail-text)_45%,transparent)]">
                  {roleLabel}
                </p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="mt-2 flex w-full items-center justify-center gap-1.5 border border-[color:color-mix(in_srgb,var(--rail-text)_25%,transparent)] py-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--rail-text)_70%,transparent)] transition-colors hover:bg-[var(--coral)] hover:text-white"
              >
                <LogOut className="h-2.5 w-2.5" /> Sign out
              </button>
            </form>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "flex w-full items-center gap-1.5 px-1 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--rail-text)_45%,transparent)] transition-colors hover:text-[var(--rail-text)]",
            compact && "justify-center"
          )}
        >
          <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform", compact && "rotate-180")} />
          {!compact && "Collapse"}
        </button>
      </div>
    </>
  )

  return (
    <div className="relative flex min-h-screen">
      <motion.aside
        animate={{ width: collapsed ? 70 : 238 }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r-[1.5px] border-[var(--rail)] bg-[var(--rail)] lg:flex"
      >
        <div className={cn("flex items-center gap-2 px-2.5 pb-2 pt-3", collapsed && "justify-center px-0")}>
          <Link href={portal ? "/portal" : "/dashboard"} className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center border-[1.5px] border-[var(--rail-text)] bg-[var(--lime)] font-display text-[17px] leading-none text-[#141210]">
              B
            </span>
            {!collapsed && (
              <span className="leading-tight">
                <span className="block text-[13px] font-semibold tracking-tight text-[var(--rail-text)]">Brightloop</span>
                <span className="mono-label block text-[7.5px] text-[color:color-mix(in_srgb,var(--rail-text)_45%,transparent)]">
                  {portal ? "Customer portal" : "Billing suite"}
                </span>
              </span>
            )}
          </Link>
        </div>
        {navBody(collapsed)}
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b-[1.5px] border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--paper)_94%,transparent)] backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-8 w-8 place-items-center border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <PageHeading pathname={pathname} portal={portal} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden items-center gap-1.5 border-[1.5px] border-[color:var(--line)] px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.14em] md:inline-flex">
                <span className="h-1.5 w-1.5 animate-blink bg-[var(--lime)]" /> Engine live
              </span>
              <ThemeToggle />
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1460px] flex-1 px-3 pb-14 pt-4 sm:px-5 lg:px-6">{children}</main>

        <footer className="mx-auto flex w-full max-w-[1460px] flex-wrap items-center justify-between gap-2 px-3 pb-6 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[color:var(--muted-text)] sm:px-5 lg:px-6">
          <span>Brightloop Billing · {portal ? "customer portal" : "operations"}</span>
          <span>Drashti · Manthan · Khushi</span>
          <span>© {new Date().getFullYear()} · amounts in USD</span>
        </footer>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-[#141210]/75"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute left-0 top-0 flex h-full w-[260px] flex-col border-r-[1.5px] border-[var(--rail)] bg-[var(--rail)]"
            >
              <div className="flex items-center justify-between px-2.5 pb-2 pt-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center border-[1.5px] border-[var(--rail-text)] bg-[var(--lime)] font-display text-[17px] leading-none text-[#141210]">
                    B
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--rail-text)]">Brightloop</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="border border-[color:color-mix(in_srgb,var(--rail-text)_30%,transparent)] p-1 text-[var(--rail-text)]"
                  aria-label="Close menu"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {navBody(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PageHeading({ pathname, portal }: { pathname: string; portal: boolean }) {
  const all = [...NAV, ...PORTAL_NAV]
  const match = all
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const label = match?.label ?? (portal ? "Portal" : "Dashboard")
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="mono-label hidden text-[8.5px] text-[color:var(--muted-text)] sm:inline">
        {portal ? "Portal" : "Workspace"}
      </span>
      <span className="hidden text-[color:color-mix(in_srgb,var(--line)_35%,transparent)] sm:inline">/</span>
      <h1 className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em]">{label}</h1>
    </div>
  )
}

export function ShellActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

export { Button as ShellButton }
