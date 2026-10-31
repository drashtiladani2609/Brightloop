import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Landing } from "@/components/marketing/landing"
import { homeForRole } from "@/lib/auth"

export const dynamic = "force-dynamic"

import { ensureBillingCron } from "@/server/cron"

export default async function HomePage() {
  ensureBillingCron()
  const session = await getSession()
  if (session) redirect(homeForRole(session.role))

  const [plans, subs, invoices, revenue] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        period: true,
        description: true,
        pausable: true,
        closableEarly: true,
        renewable: true,
        autoCloseOnEnd: true
      }
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.count(),
    prisma.payment.aggregate({ where: { status: "SETTLED" }, _sum: { amount: true } })
  ])

  return (
    <Landing
      plans={plans}
      stats={{ subs, invoices, revenue: revenue._sum.amount ?? 0 }}
    />
  )
}
