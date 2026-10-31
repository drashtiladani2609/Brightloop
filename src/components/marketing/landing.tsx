"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ArrowUpRight, Check, Minus } from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { money } from "@/lib/utils"

type Plan = {
  id: string
  name: string
  price: number
  period: string
  description: string | null
  pausable: boolean
  closableEarly: boolean
  renewable: boolean
  autoCloseOnEnd: boolean
}

const MODULES: [string, string, string, string][] = [
  ["01", "Catalogue", "Products with variants and price extras. The line price is base plus extra, resolved in one place.", "ADMIN"],
  ["02", "Plans", "Daily to yearly cycles, minimum quantity and four lifecycle switches that the server actually enforces.", "ADMIN"],
  ["03", "Quotations", "Reusable templates with validity windows. One click prefills a whole subscription.", "STAFF"],
  ["04", "Subscriptions", "Draft to quotation to confirmed to active to closed, fully audited with a visual stepper.", "STAFF"],
  ["05", "Invoices", "Generated per period. A unique period index makes double billing impossible.", "ENGINE"],
  ["06", "Taxes", "Admin rules resolved per line and snapshotted onto the invoice, never recalculated later.", "ADMIN"],
  ["07", "Discounts", "Fixed or percentage, scoped, usage limited and applied automatically at billing time.", "ADMIN"],
  ["08", "Payments", "Partial and full, five methods. The invoice flips to paid exactly when it is covered.", "STAFF"],
  ["09", "Reporting", "MRR, collected, outstanding and overdue from SQL aggregates, with CSV export.", "FINANCE"]
]

const LIFECYCLE = [
  ["Draft", "A deal taking shape. Editable, unbilled, invisible to the customer."],
  ["Quotation", "Sent with a validity window. Waits for the customer to accept."],
  ["Confirmed", "Signed. Lines, taxes and first billing date are locked in."],
  ["Active", "The engine issues invoices each period until expiry or close."],
  ["Closed", "Terminal. History, invoices and payments stay readable forever."]
]

const ROLES: [string, string[]][] = [
  ["Administrator", ["Catalogue, taxes and discounts", "Staff and access control", "Billing runs and reports"]],
  ["Internal staff", ["Customers and subscriptions", "Invoices and payments", "Read only catalogue"]],
  ["Customer", ["Own subscriptions and invoices", "Payment history and print", "Pause or close requests"]]
]

const DEMOS: [string, string, string][] = [
  ["Admin", "admin@brightloop.app", "Admin@1234"],
  ["Staff", "staff@brightloop.app", "Staff@1234"],
  ["Customer", "northwind.systems@northwindsystems.io", "Customer@1234"]
]

export function Landing({ plans, stats }: { plans: Plan[]; stats: { subs: number; invoices: number; revenue: number } }) {
  const ticker = [
    `${stats.subs.toLocaleString("en-US")} active subscriptions`,
    `${stats.invoices.toLocaleString("en-US")} invoices issued`,
    `${money(stats.revenue)} collected`,
    "taxes resolved per line",
    "discounts applied automatically",
    "audit trail on every action",
    "print-ready invoices"
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b-[1.5px] border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--paper)_94%,transparent)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center border-[1.5px] border-[color:var(--line)] bg-[var(--lime)] font-display text-[17px] leading-none text-[#141210]">
              B
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Brightloop</span>
            <span className="mono-label hidden text-[8px] text-muted-foreground sm:inline">/ billing suite</span>
          </Link>
          <nav className="hidden items-center gap-5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] md:flex">
            {[
              ["#index", "Index"],
              ["#lifecycle", "Lifecycle"],
              ["#plans", "Plans"],
              ["#demo", "Demo"]
            ].map(([href, label]) => (
              <a key={href} href={href} className="hover:underline hover:decoration-2 hover:underline-offset-4">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle compact />
            <Link href="/login">
              <span className="inline-flex h-8 items-center border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] px-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]">
                Sign in
              </span>
            </Link>
            <Link href="/signup" className="hidden sm:block">
              <span className="inline-flex h-8 items-center gap-1.5 border-[1.5px] border-[color:var(--line)] bg-[var(--ink)] px-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--paper)] shadow-[3px_3px_0_0_var(--lime)]">
                Start free <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b-[1.5px] border-[color:var(--line)]">
        <div className="ledger-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[380px] w-[380px] rounded-none bg-[color:color-mix(in_srgb,var(--lime)_30%,transparent)] blur-[90px]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="sticker rotate-[-1.5deg]">
                <span className="h-1.5 w-1.5 animate-blink bg-[#141210]" /> Billing engine live
              </span>
              <span className="border-[1.5px] border-[color:var(--line)] px-2 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em]">
                Next · Prisma · SQLite
              </span>
            </div>

            <h1 className="mt-5 font-display text-[50px] leading-[0.88] tracking-[-0.03em] sm:text-[68px] lg:text-[80px]">
              Subscription
              <br />
              billing that
              <br />
              <span className="display-i bg-[var(--lime)] px-2 text-[#141210]">runs itself.</span>
            </h1>

            <p className="mt-5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
              Brightloop replaces the spreadsheet. Define products and plans, walk the subscription lifecycle, and let
              one idempotent engine issue tax aware invoices, collect payments and report the numbers back.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link href="/login">
                <span className="inline-flex h-11 items-center gap-2 border-[1.5px] border-[color:var(--line)] bg-[var(--ink)] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime)] transition-transform hover:-translate-x-px hover:-translate-y-px">
                  Walk the live demo <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link href="/signup">
                <span className="inline-flex h-11 items-center border-[1.5px] border-[color:var(--line)] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--lime)] hover:text-[#141210]">
                  Create a customer account
                </span>
              </Link>
            </div>

            <dl className="mt-8 grid max-w-lg grid-cols-2 border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] sm:grid-cols-4">
              {[
                [stats.subs.toLocaleString("en-US"), "subscriptions"],
                [stats.invoices.toLocaleString("en-US"), "invoices"],
                [money(stats.revenue), "collected"],
                ["24/7", "billing engine"]
              ].map(([value, label], i) => (
                <div
                  key={label}
                  className={`px-3 py-2.5 ${i < 3 ? "border-[color:var(--line)] sm:border-r-[1.5px]" : ""} ${
                    i < 2 ? "border-b-[1.5px] sm:border-b-0" : ""
                  }`}
                >
                  <dt className="num text-[15px] leading-none">{value}</dt>
                  <dd className="mono-label mt-1 text-[8px] text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="animate-spin-slow absolute h-[260px] w-[260px] border-[1.5px] border-dashed border-[color:color-mix(in_srgb,var(--line)_35%,transparent)]" />
            <motion.div
              initial={{ opacity: 0, y: 16, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative w-full max-w-[320px] border-[1.5px] border-[color:var(--line)] bg-[var(--surface)] shadow-[8px_8px_0_0_var(--ink)]"
            >
              <div className="flex items-center justify-between border-b-[1.5px] border-[color:var(--line)] bg-[var(--ink)] px-3 py-2">
                <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-[var(--paper)]">
                  Invoice
                </span>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[var(--lime)]">
                  SUB-2026-00001
                </span>
              </div>
              <div className="px-3 py-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="mono-label text-[8px] text-muted-foreground">Billed to</p>
                    <p className="text-[12px] font-semibold">Northwind Systems</p>
                  </div>
                  <p className="num text-[24px] leading-none">
                    $1,284<sup className="text-[10px]">.00</sup>
                  </p>
                </div>
                <div className="mt-3 space-y-1 border-t border-dashed border-[color:color-mix(in_srgb,var(--line)_30%,transparent)] pt-2 text-[10px]">
                  {[
                    ["Brightloop Core", "3 × $45.00"],
                    ["Variant · Brand Odoo", "+$560.00"],
                    ["Discount · launch 20", "−$204.00"],
                    ["GST 18%", "$266.76"]
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="num">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t-[1.5px] border-[color:var(--line)] pt-2">
                  <span className="mono-label text-[8px]">Total due</span>
                  <span className="num text-[15px]">$1,550.76</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 border-[1.5px] border-[color:var(--line)] bg-[var(--lime)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#141210]">
                    <Check className="h-2.5 w-2.5" /> Paid
                  </span>
                  <span className="mono-label text-[7.5px] text-muted-foreground">Nov 01 → Dec 01</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative overflow-hidden border-t-[1.5px] border-[color:var(--line)] bg-[var(--ink)] py-1.5">
          <div className="animate-marquee flex w-max items-center gap-6 whitespace-nowrap">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((item, i) => (
              <span key={i} className="flex items-center gap-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:color-mix(in_srgb,var(--paper)_60%,transparent)]">
                {item}
                <span className="h-1 w-1 bg-[var(--lime)]" />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="index" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[1.5px] border-[color:var(--line)] pb-3">
          <div>
            <p className="mono-label text-muted-foreground">01 / Index</p>
            <h2 className="mt-1.5 font-display text-[34px] leading-none tracking-tight sm:text-[42px]">
              Everything the finance loop needs
            </h2>
          </div>
          <p className="max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
            Nine modules over one ledger, from the first quotation to the last collected payment.
          </p>
        </div>

        <div className="grid gap-px border-[1.5px] border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--line)_25%,transparent)] sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(([num, title, copy, role]) => (
            <div
              key={title}
              className="group bg-[var(--surface)] px-4 py-4 transition-colors hover:bg-[color:color-mix(in_srgb,var(--lime)_18%,var(--surface))]"
            >
              <div className="flex items-center justify-between">
                <span className="num text-[10px] text-muted-foreground">{num}</span>
                <span className="border border-[color:color-mix(in_srgb,var(--line)_30%,transparent)] px-1 py-0.5 font-mono text-[7.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {role}
                </span>
              </div>
              <h3 className="mt-2 font-display text-[20px] leading-none">{title}</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="lifecycle" className="border-y-[1.5px] border-[color:var(--line)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-6 border-b-[1.5px] border-[color:var(--line)] pb-3">
            <p className="mono-label text-muted-foreground">02 / Lifecycle</p>
            <h2 className="mt-1.5 font-display text-[34px] leading-none tracking-tight sm:text-[42px]">
              One path, enforced in the service layer
            </h2>
          </div>
          <ol className="grid gap-px border-[1.5px] border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--line)_25%,transparent)] sm:grid-cols-2 lg:grid-cols-5">
            {LIFECYCLE.map(([title, copy], i) => (
              <li key={title} className="bg-[var(--paper)] px-3.5 py-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center border-[1.5px] border-[color:var(--line)] bg-[var(--lime)] font-mono text-[9px] font-bold text-[#141210]">
                    {i + 1}
                  </span>
                  <span className="mono-label">{title}</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="plans" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[1.5px] border-[color:var(--line)] pb-3">
          <div>
            <p className="mono-label text-muted-foreground">03 / Plans</p>
            <h2 className="mt-1.5 font-display text-[34px] leading-none tracking-tight sm:text-[42px]">Live from the database</h2>
          </div>
          <p className="max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
            The same records the billing engine reads. Each switch below changes what a subscription may do.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.slice(0, 6).map((plan) => (
            <div key={plan.id} className="glass lift p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-[22px] leading-none">{plan.name}</h3>
                  <p className="mono-label mt-1 text-[8px] text-muted-foreground">per {plan.period.toLowerCase()}</p>
                </div>
                <p className="num text-[19px] leading-none">{money(plan.price)}</p>
              </div>
              <p className="mt-2.5 min-h-[32px] text-[11px] leading-relaxed text-muted-foreground">
                {plan.description ?? "Billed each period until the term ends."}
              </p>
              <ul className="mt-3 space-y-1 border-t border-dashed border-[color:color-mix(in_srgb,var(--line)_25%,transparent)] pt-2">
                {[
                  ["Pausable", plan.pausable],
                  ["Close early", plan.closableEarly],
                  ["Renewable", plan.renewable],
                  ["Auto close", plan.autoCloseOnEnd]
                ].map(([label, on]) => (
                  <li key={String(label)} className="flex items-center justify-between text-[10.5px]">
                    <span className="text-muted-foreground">{label}</span>
                    {on ? (
                      <Check className="h-3 w-3 text-[var(--pos)]" />
                    ) : (
                      <Minus className="h-3 w-3 text-[color:color-mix(in_srgb,var(--muted-text)_50%,transparent)]" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y-[1.5px] border-[color:var(--line)] bg-[var(--surface)]">
        <div className="mx-auto grid w-full max-w-6xl gap-px bg-[color:color-mix(in_srgb,var(--line)_25%,transparent)] px-0 sm:grid-cols-3">
          {ROLES.map(([role, items]) => (
            <div key={role} className="bg-[var(--surface)] px-4 py-5">
              <h3 className="font-display text-[22px] leading-none">{role}</h3>
              <ul className="mt-2.5 space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--pos)]" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mono-label text-muted-foreground">04 / Demo</p>
            <h2 className="mt-1.5 font-display text-[34px] leading-none tracking-tight sm:text-[42px]">
              Seeded and ready
              <br />
              to walk through
            </h2>
            <p className="mt-3 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
              Twenty five customers, two thousand subscriptions and thousands of invoices are already in the ledger.
              Sign in, run the engine, watch the numbers move.
            </p>
            <Link href="/login" className="mt-5 inline-flex">
              <span className="inline-flex h-11 items-center gap-2 border-[1.5px] border-[color:var(--line)] bg-[var(--ink)] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime)]">
                Open the demo <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          <div className="border-[1.5px] border-[color:var(--line)] bg-[var(--ink)] p-4 shadow-[6px_6px_0_0_var(--lime)]">
            <p className="mono-label text-[8px] text-[color:color-mix(in_srgb,var(--paper)_45%,transparent)]">Demo credentials</p>
            <div className="mt-2 divide-y divide-[color:color-mix(in_srgb,var(--paper)_18%,transparent)]">
              {DEMOS.map(([role, email, password]) => (
                <div key={role} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--lime)]">{role}</p>
                    <p className="text-[11.5px] text-[color:color-mix(in_srgb,var(--paper)_85%,transparent)]">{email}</p>
                  </div>
                  <code className="border border-[color:color-mix(in_srgb,var(--paper)_28%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-[color:color-mix(in_srgb,var(--paper)_70%,transparent)]">
                    {password}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t-[1.5px] border-[color:var(--line)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted-foreground sm:px-6">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--lime)]" /> Brightloop Billing
          </span>
          <span>Built by Drashti · Manthan · Khushi</span>
          <span>© {new Date().getFullYear()} · all amounts in USD</span>
        </div>
      </footer>
    </div>
  )
}
