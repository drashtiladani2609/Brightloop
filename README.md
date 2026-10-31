# Brightloop Billing

A subscription and recurring-billing workspace for a small finance team: product catalogue, quotation to cash, idempotent recurring invoicing, payment recording, a reporting suite and a customer self-service portal.

Built with Next.js 14 (App Router), TypeScript, Prisma + SQLite and Tailwind CSS with a hand-rolled component kit.

![Dashboard](docs/dashboard.png)

---

## Quick start

```bash
npm install                 # postinstall runs prisma generate
cp .env.example .env        # the defaults work locally
npm run db:push             # create prisma/dev.db from the schema
npm run db:seed             # 25 customers, 2 000 subscriptions, 6 883 invoices, 6 194 payments
npm run dev                 # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

The seed is deterministic, so the figures quoted in this document match a fresh `db:seed` run.

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@brightloop.app` | `Admin@1234` |
| Staff | `staff@brightloop.app` | `Staff@1234` |
| Staff | `accounts@brightloop.app` | `Staff@1234` |
| Customer | `northwind.systems@northwindsystems.io` | `Customer@1234` |

All three roles are also reachable in one click from the sign-in page. A staff or admin login opens `/dashboard`; a customer login opens `/portal`. The other 24 seeded customers follow the same pattern — `<slug>@<slug>.io` — and are listed on the Customers page.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14.2, App Router with server components and route handlers |
| Language | TypeScript 5.6, strict mode |
| Styling | Tailwind CSS 3.4, CSS variables for light and dark, custom primitives |
| Motion | Framer Motion 11 |
| Data | Prisma 5.22 + SQLite; Postgres is a datasource change only |
| Auth | bcryptjs hashes, JWT sessions (`jose`) in an httpOnly cookie, role middleware |
| Charts | Recharts 2.13 |
| Mail | Nodemailer with a console fallback and an `EmailLog` outbox |
| Jobs | node-cron scheduler, plus a manual trigger that calls the same function |
| Tests | Vitest |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` | `prisma generate`, then `next build` |
| `npm start` | Serve the production build on port 3000 |
| `npm run db:push` | Sync the Prisma schema to SQLite |
| `npm run db:seed` | Wipe and regenerate the demo dataset |
| `npm run db:reset` | `--force-reset` push followed by a seed |
| `npm test` | Vitest unit suite |

---

## Environment

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | A Postgres URL works as well, see below |
| `JWT_SECRET` | development fallback | Set a real value anywhere outside local |
| `APP_URL` | `http://localhost:3000` | Used to build password-reset links |
| `CRON_ENABLED` | `true` | `false` disables the scheduler |
| `CRON_SCHEDULE` | `0 * * * *` | node-cron expression for the billing sweep |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | empty | When empty, mail is written to the console and to `EmailLog` instead of being sent |
| `SMTP_FROM` | `billing@brightloop.app` | Sender address |

### Switching to Postgres

1. `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`.
2. `.env`: set `DATABASE_URL="postgresql://user:pass@host:5432/brightloop"`.
3. `npx prisma migrate dev --name init && npm run db:seed`.

No application code changes are needed. The models use portable types only — no native enums, no JSON columns — and money is rounded through `round2` at the service layer.

---

## Modules

### Landing, sign in and sign up
A ruled hero with a sample invoice card, a ticker built from live figures and a plan board rendered from the same records the billing engine reads. Sign in and sign up share an ink panel with the form on paper. Sign up enforces a unique email and a password policy of more than eight characters with upper case, lower case and a special character; the checklist runs in the browser and the same Zod schema runs again in the route handler.

### Dashboard
Five KPI tiles — active subscriptions, MRR, revenue collected, outstanding, overdue — followed by a revenue trend chart, payments by method, new against closed subscriptions and the invoice status mix. Range presets (30, 90, 180, 365 days) plus plan and customer filters. All figures are computed on the server.

### Catalogue
- **Products** with variants (`attribute`, `value`, `priceExtra`). A line price is base plus extra, calculated in `services/pricing.ts`.
- **Plans** with price, billing period (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), minimum quantity, availability window and four behaviour flags: `autoCloseOnEnd`, `closableEarly`, `pausable`, `renewable`. The flags are enforced in the service layer, not only hidden in the interface: pausing a non-pausable plan returns `Plan does not allow pausing`, and closing early returns `Plan cannot be closed before its end date`.
- **Quotation templates** holding plan and product lines with default quantities, converted into a subscription in one action.

### Subscriptions
Auto-numbered `SUB-2026-00001` and up. The lifecycle is `DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED` with an explicit transition table, so illegal moves are rejected (`Cannot go from ACTIVE to ACTIVE`). Every action writes an event row with actor, timestamp and change, which drives both the stepper and the history list. Pause, resume, close, renew and the automatic close on expiry live in `services/subscriptions.ts`.

### Invoicing and the billing engine
Invoices are never created by hand. The sweep walks every active subscription from its `nextBillingDate`, period by period, so a missed cron run catches up rather than skipping a cycle. Each insert carries `(subscriptionId, billingPeriodStart, billingPeriodEnd)` under a unique index, which makes a second run a no-op: `created: 0, skipped: n`. Invoice, lines, discount usage counter, `nextBillingDate` and event row commit in a single transaction.

`/billing-runs` lists the run history with trigger (`CRON` or `MANUAL`), status, created, skipped and error counts, duration and notes. The header button calls the same `runBillingCycle({ trigger: "MANUAL" })`.

Invoice states are `DRAFT → CONFIRMED → PAID`, with `CANCELLED` as a terminal exit. `OVERDUE` is derived and never stored: confirmed, unpaid balance, due date in the past. Due dates follow the subscription payment terms (`IMMEDIATE`, `NET_15`, `NET_30`, `NET_45`). `/print/invoice/[id]` renders a print sheet that only the owning customer or a staff member can open.

### Taxes and discounts
Tax rules are admin managed with scope `ALL`, `CATEGORY` or a single product. Applicable rules are applied per line and summed into a breakdown on the invoice.

Discount rules support `FIXED` and `PERCENTAGE`, minimum amount and quantity, a date window, a usage limit with a used counter, and `PRODUCT` or `SUBSCRIPTION` scope. They apply automatically to the next invoice as their own negative line, and the counter moves in the same transaction as the invoice.

### Payments
`CARD`, `BANK_TRANSFER`, `UPI`, `CASH` and `CHEQUE`, with partial payments as a first-class case. An invoice becomes `PAID` when the paid total reaches its total; overpayment is rejected (`Amount is more than the outstanding 0`). Staff record settled payments; customers can only request one, which arrives as `PENDING` for staff to settle. Overdue invoices carry a one-click reminder that writes to the outbox.

### Reports
KPIs, revenue over time, new against closed subscriptions, payments by method, invoice status mix and top plans, filterable by date range, plan, customer and invoice status. Detail tables are aggregated in SQL and sorted and paginated on the server. Exports: `/api/export?type=invoices|overdue|subscriptions|payments`.

### Customer portal
Overview, subscriptions, invoices, payment history and profile, scoped to the signed-in customer, with print and download, payment requests, and pause or close requests where the plan allows them.

---

## Roles and permissions

| Capability | ADMIN | STAFF | CUSTOMER |
| --- | --- | --- | --- |
| Dashboard, reports, exports | yes | yes | no |
| Customers, create and edit | yes | yes | no |
| Products, variants, plans | yes | view only | no |
| Quotation templates | yes | yes | no |
| Subscriptions, invoices, payments | yes | yes | own records only |
| Taxes, discounts | yes | no | no |
| Team and access | yes | no | no |
| Portal | no | no | yes |

Enforcement is deliberately duplicated: `src/middleware.ts` gates routes (`/team`, `/taxes` and `/discounts` are admin only, customers are pinned to `/portal`), and each service entry point re-checks the role, so a direct API call fails even when the control is hidden. Rejections use one message shape: `You are not allowed to do that`.

---

## Project structure

```
prisma/
  schema.prisma          models, indexes, unique billing window
  seed.ts                deterministic 2 000 subscription dataset
src/
  app/
    (app)/               dashboard, subscriptions, invoices, payments, reports, catalogue, team
    portal/              customer portal
    print/invoice/[id]/  printable invoice
    api/                 auth, account, subscriptions, invoices, payments, billing,
                         export, team, customers, products, plans, templates, taxes, discounts
    login, signup, forgot-password, reset-password, page.tsx
  components/            ui kit, layout, charts, catalogue, subscriptions, billing, portal
  lib/                   prisma, auth, jwt, password, validators, api, errors, constants, utils
  server/
    services/            pricing, numbering, dates, invoices, subscriptions, billing,
                         payments, reports, mailer
    cron.ts              scheduler bootstrap
  middleware.ts
tests/                   Vitest suites
```

Business logic sits in `src/server/services`. Route handlers parse with Zod, call a service and translate `ApiError` into a JSON error. Pages do not query Prisma directly for anything a service owns.

---

## API surface

All handlers return `{ ok: true, data }` or `{ ok: false, error }`.

| Route | Purpose |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout` | Session management |
| `GET /api/auth/session` | Current role and identity, 401 when signed out |
| `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Reset flow, `devLink` returned in development |
| `POST /api/account/password` | Change own password |
| `GET, POST /api/customers`, `GET, PATCH /api/customers/[id]` | Customer records |
| `GET, POST /api/products`, `GET, PATCH, DELETE /api/products/[id]` | Products and variants |
| `GET, POST /api/plans`, `GET, PATCH, DELETE /api/plans/[id]` | Plans |
| `GET, POST /api/templates`, `GET, PATCH, DELETE /api/templates/[id]` | Quotation templates |
| `GET, POST /api/subscriptions`, `GET, PATCH /api/subscriptions/[id]`, `POST /api/subscriptions/[id]/renew` | Lifecycle actions |
| `GET /api/invoices/[id]` | Invoice detail and history |
| `GET, POST /api/payments`, `POST /api/payments/[id]/settle` | Payment recording and settlement |
| `POST /api/billing/run` | Manual billing sweep |
| `GET /api/export?type=…` | CSV export |
| `GET, POST /api/taxes`, `PATCH, DELETE /api/taxes/[id]` | Tax rules |
| `GET, POST /api/discounts`, `PATCH, DELETE /api/discounts/[id]` | Discount rules |
| `GET, POST /api/team`, `PATCH /api/team/[id]` | Staff accounts |

---

## Data model notes

- `Subscription` has a unique `number` and indexes on `customerId`, `status`, `nextBillingDate` and `expiryDate`.
- `Invoice` has a unique `number` **and** a unique `(subscriptionId, billingPeriodStart, billingPeriodEnd)`, which is the idempotency guarantee.
- `InvoiceLine` snapshots description, quantity, unit price, tax rate and amount, so historical invoices survive later price edits.
- `SubscriptionEvent` and invoice history rows carry the audit trail used by the stepper and the timeline.
- `DiscountUsage` links an application to its invoice; `EmailLog` is the outbox for every send attempt.

---

## Performance notes

- Server-side pagination throughout (`page`, `pageSize`), with search and sort pushed into SQL.
- Report aggregates are grouped queries rather than in-memory loops; the dashboard payload is cached for 20 seconds.
- Indexes on every foreign key plus the status and date columns (`nextBillingDate`, `dueDate`, `issueDate`, `paidAt`).
- Seeded at 2 000 subscriptions, 6 883 invoices, 19 414 lines and 6 194 payments; pages return in 0.15 to 0.9 seconds locally.
- Email, cron and bcrypt are listed as server externals, so they never enter the client bundle.

---

## Testing

```bash
npm test
```

Four suites with 22 assertions covering pricing and tax arithmetic, discount eligibility and allocation, subscription and invoice state transitions, billing idempotency and the password policy. `tests/global-setup.ts` pushes a schema to a throwaway SQLite file (`prisma/test.db`), so the development data is never touched.

---

## Interface notes

The workspace is laid out like a printed ledger.

- **Type** — Instrument Serif for headings and totals, Inter for prose, JetBrains Mono for numbers, labels and status chips. All three are loaded through `next/font` and self-hosted.
- **Colour** — warm paper `#f1ede2`, ink `#141210`, one action accent (`#c8f24e`), cobalt for information, coral for anything late. Dark mode is the same sheet printed inverted.
- **Geometry** — 1.5px rules, 2px radii, offset shadows instead of blur, ruled tables, dashed dividers on secondary detail.
- **Motion** — hero ticker, count-up figures, staggered lists and hover lift, all disabled under `prefers-reduced-motion`.
- **Accents carry meaning** — the action accent means "do this", cobalt means "know this", coral means "this is late". Nothing else is coloured.

---

## Scope notes

- Money is `Float` with `round2` at each boundary, which keeps the demo data readable. A production build would move to integer minor units or Prisma `Decimal`.
- `POST /api/auth/forgot-password` returns the reset link as `devLink` in development only, so the flow can be tested without SMTP.
- Sign-in and sign-up verify that the session cookie survived before navigating. If a preview frame blocks cookies the form says so instead of bouncing back to the sign-in screen.
