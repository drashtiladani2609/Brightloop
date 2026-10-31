import { prisma } from "@/lib/prisma"
import { round2 } from "@/lib/utils"
import { addMonths } from "date-fns"

export type ReportFilters = {
  from: Date
  to: Date
  planId?: string
  customerId?: string
  status?: string
}

const MONTHLY_FACTOR: Record<string, number> = { DAILY: 30, WEEKLY: 4.345, MONTHLY: 1, YEARLY: 1 / 12 }

type CacheEntry = { exp: number; value: unknown }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 20_000

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.value as T
  const value = await fn()
  cache.set(key, { exp: Date.now() + CACHE_TTL_MS, value })
  if (cache.size > 200) cache.clear()
  return value
}

export function clearReportCache() {
  cache.clear()
}

export function normalizeFilters(search: Record<string, string | undefined>): ReportFilters {
  const now = new Date()
  const to = search.to ? new Date(search.to) : now
  const from = search.from ? new Date(search.from) : addMonths(to, -11)
  return {
    from,
    to,
    planId: search.planId || undefined,
    customerId: search.customerId || undefined,
    status: search.status || undefined
  }
}

function subScope(filters: ReportFilters) {
  return {
    ...(filters.planId ? { planId: filters.planId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {})
  }
}

function invoiceScope(filters: ReportFilters) {
  return {
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.planId ? { subscription: { planId: filters.planId } } : {}),
    ...(filters.status ? { status: filters.status } : {})
  }
}

function monthBuckets(from: Date, to: Date) {
  const buckets: { label: string; start: Date; end: Date }[] = []
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  while (cursor <= to && buckets.length < 24) {
    const start = new Date(cursor)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999)
    buckets.push({
      label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      start: start < from ? from : start,
      end: end > to ? to : end
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return buckets
}

export async function getDashboard(filters: ReportFilters) {
  const key = JSON.stringify(filters)
  return cached(key, async () => {
    const now = new Date()
    const subWhere = subScope(filters)
    const invWhere = invoiceScope(filters)
    const buckets = monthBuckets(filters.from, filters.to)

    const [
      activeByPlan,
      revenueAgg,
      outstandingAgg,
      overdueAgg,
      newSubs,
      closedSubs,
      methodRows,
      statusRows,
      topPlanRows,
      recentInvoices,
      recentPayments
    ] = await Promise.all([
      prisma.subscription.groupBy({
        by: ["planId"],
        where: { ...subWhere, status: "ACTIVE" },
        _sum: { total: true },
        _count: { _all: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: "SETTLED",
          paidAt: { gte: filters.from, lte: filters.to },
          invoice: invWhere
        },
        _sum: { amount: true },
        _count: { _all: true }
      }),
      prisma.invoice.aggregate({
        where: { ...invWhere, status: "CONFIRMED" },
        _sum: { total: true, amountPaid: true },
        _count: { _all: true }
      }),
      prisma.invoice.aggregate({
        where: { ...invWhere, status: "CONFIRMED", dueDate: { lt: now } },
        _sum: { total: true, amountPaid: true },
        _count: { _all: true }
      }),
      prisma.subscription.count({ where: { ...subWhere, createdAt: { gte: filters.from, lte: filters.to } } }),
      prisma.subscription.count({ where: { ...subWhere, closedAt: { gte: filters.from, lte: filters.to } } }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { status: "SETTLED", paidAt: { gte: filters.from, lte: filters.to }, invoice: invWhere },
        _sum: { amount: true },
        _count: { _all: true }
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { ...invWhere, issueDate: { gte: filters.from, lte: filters.to } },
        _sum: { total: true },
        _count: { _all: true }
      }),
      prisma.subscription.groupBy({
        by: ["planId"],
        where: { ...subWhere, status: "ACTIVE" },
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5
      }),
      prisma.invoice.findMany({
        where: invWhere,
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          number: true,
          total: true,
          status: true,
          dueDate: true,
          amountPaid: true,
          customer: { select: { name: true } }
        }
      }),
      prisma.payment.findMany({
        where: { status: "SETTLED", paidAt: { gte: filters.from, lte: filters.to }, invoice: invWhere },
        orderBy: { paidAt: "desc" },
        take: 6,
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          invoice: { select: { number: true, customer: { select: { name: true } } } }
        }
      })
    ])

    const plans = await prisma.plan.findMany({ select: { id: true, name: true, period: true } })
    const planMap = new Map(plans.map((p) => [p.id, p]))

    const activeCount = activeByPlan.reduce((s, r) => s + r._count._all, 0)
    const mrr = round2(
      activeByPlan.reduce((s, row) => {
        const period = planMap.get(row.planId)?.period ?? "MONTHLY"
        return s + (row._sum.total ?? 0) * (MONTHLY_FACTOR[period] ?? 1)
      }, 0)
    )

    const [revSeries, subSeries] = await Promise.all([
      Promise.all(
        buckets.map(async (b) => {
          const agg = await prisma.payment.aggregate({
            where: { status: "SETTLED", paidAt: { gte: b.start, lte: b.end }, invoice: invWhere },
            _sum: { amount: true }
          })
          return { label: b.label, value: round2(agg._sum.amount ?? 0) }
        })
      ),
      Promise.all(
        buckets.map(async (b) => {
          const [created, closed] = await Promise.all([
            prisma.subscription.count({ where: { ...subWhere, createdAt: { gte: b.start, lte: b.end } } }),
            prisma.subscription.count({ where: { ...subWhere, closedAt: { gte: b.start, lte: b.end } } })
          ])
          return { label: b.label, created, closed }
        })
      )
    ])

    const outstanding = round2((outstandingAgg._sum.total ?? 0) - (outstandingAgg._sum.amountPaid ?? 0))
    const overdueAmount = round2((overdueAgg._sum.total ?? 0) - (overdueAgg._sum.amountPaid ?? 0))

    return {
      kpis: {
        activeSubscriptions: activeCount,
        mrr,
        revenueCollected: round2(revenueAgg._sum.amount ?? 0),
        paymentCount: revenueAgg._count._all,
        outstanding,
        outstandingCount: outstandingAgg._count._all,
        overdueCount: overdueAgg._count._all,
        overdueAmount,
        newSubs,
        closedSubs
      },
      revenueSeries: revSeries,
      subSeries,
      paymentsByMethod: methodRows.map((r) => ({
        label: r.method,
        amount: round2(r._sum.amount ?? 0),
        count: r._count._all
      })),
      invoiceStatus: statusRows.map((r) => ({
        label: r.status,
        amount: round2(r._sum.total ?? 0),
        count: r._count._all
      })),
      topPlans: topPlanRows.map((r) => ({
        label: planMap.get(r.planId)?.name ?? "Unknown",
        amount: round2(r._sum.total ?? 0),
        count: r._count._all
      })),
      recentInvoices,
      recentPayments,
      range: { from: filters.from.toISOString(), to: filters.to.toISOString() }
    }
  })
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>

export async function getReportOptions() {
  const [plans, customers] = await Promise.all([
    prisma.plan.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 })
  ])
  return { plans, customers }
}
