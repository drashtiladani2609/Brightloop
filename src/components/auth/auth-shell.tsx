"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ShieldCheck, Sparkles } from "lucide-react"
import { HeroBackdrop } from "@/components/backgrounds"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  image = "/auth.jpg"
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
  image?: string
}) {
  return (
    <div className="relative min-h-screen">
      <header className="relative z-20 border-b-[1.5px] border-[color:color-mix(in_srgb,var(--paper)_25%,transparent)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center border-[1.5px] border-[var(--paper)] bg-[var(--lime)] font-display text-[17px] leading-none text-[#141210]">
              B
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--paper)]">
              Brightloop
            </span>
            <span className="mono-label hidden text-[8px] text-[color:color-mix(in_srgb,var(--paper)_50%,transparent)] sm:inline">
              / billing suite
            </span>
          </Link>
          <ThemeToggle className="border-[color:color-mix(in_srgb,var(--paper)_30%,transparent)] bg-transparent text-[var(--paper)] hover:bg-[var(--lime)] hover:text-[#141210]" />
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <div className="max-w-md">
            <span className="sticker rotate-[-1.5deg]">
              <Sparkles className="h-3 w-3" /> Every period billed once
            </span>
            <h2 className="mt-5 font-display text-[46px] leading-[0.92] tracking-[-0.02em] text-[var(--paper)]">
              The calm way
              <br />
              to bill on{" "}
              <span className="display-i bg-[var(--lime)] px-1.5 text-[#141210]">repeat.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[12.5px] leading-relaxed text-[color:color-mix(in_srgb,var(--paper)_62%,transparent)]">
              Subscriptions, invoices, taxes and payments in one ledger-clean workspace, with role based access from
              the first screen.
            </p>

            <ul className="mt-7 space-y-2.5">
              {[
                "Idempotent billing runs with a full audit trail",
                "Automatic tax and discount resolution per line",
                "Customer portal with printable invoices"
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[12px] text-[color:color-mix(in_srgb,var(--paper)_72%,transparent)]"
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lime)]" />
                  {item}
                </li>
              ))}
            </ul>

            <dl className="mt-8 grid max-w-sm grid-cols-3 border-[1.5px] border-[color:color-mix(in_srgb,var(--paper)_22%,transparent)]">
              {[
                ["2,000", "Subscriptions"],
                ["6,883", "Invoices"],
                ["6,194", "Payments"]
              ].map(([value, label], i) => (
                <div
                  key={label}
                  className={`px-2.5 py-2 ${i < 2 ? "border-r-[1.5px] border-[color:color-mix(in_srgb,var(--paper)_22%,transparent)]" : ""}`}
                >
                  <dt className="num text-[13px] leading-none text-[var(--paper)]">{value}</dt>
                  <dd className="mono-label mt-1 text-[7.5px] text-[color:color-mix(in_srgb,var(--paper)_45%,transparent)]">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="glass-strong p-5 sm:p-6">
            <div className="rule pb-3">
              <h1 className="font-display text-[28px] leading-none tracking-tight">{title}</h1>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
            <div className="pt-4">{children}</div>
            {footer && (
              <div className="mt-4 border-t border-dashed border-[color:color-mix(in_srgb,var(--line)_25%,transparent)] pt-3 text-center text-[11.5px] text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </motion.section>
      </main>

      <footer className="relative z-10 pb-6 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[color:color-mix(in_srgb,var(--paper)_35%,transparent)]">
        Brightloop Billing · subscription revenue, settled · Drashti · Manthan · Khushi
      </footer>

      <HeroBackdrop image={image} />
    </div>
  )
}
