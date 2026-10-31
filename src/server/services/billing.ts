import { prisma } from "@/lib/prisma"
import { addPeriod, endOfDay, startOfDay } from "@/server/services/dates"
import { generateInvoiceForPeriod, findExistingInvoice } from "@/server/services/invoices"
import type { DiscountRuleLike, TaxRuleLike } from "@/server/services/pricing"

export type BillOutcome = {
  created: number
  skipped: number
  errors: number
  closed: number
  messages: string[]
}

const MAX_PERIODS_PER_SUB = 36

export async function billSubscription(subscriptionId: string, now = new Date()): Promise<BillOutcome> {
  const outcome: BillOutcome = { created: 0, skipped: 0, errors: 0, closed: 0, messages: [] }

  const snapshot = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, status: true, nextBillingDate: true, expiryDate: true, plan: { select: { period: true, autoCloseOnEnd: true } } }
  })
  if (!snapshot) {
    outcome.errors += 1
    outcome.messages.push(`subscription ${subscriptionId} missing`)
    return outcome
  }
  if (snapshot.status !== "ACTIVE") return outcome
  if (!snapshot.nextBillingDate) return outcome

  const expiryLimit = endOfDay(snapshot.expiryDate).getTime()
  let cursor = startOfDay(snapshot.nextBillingDate)
  if (cursor.getTime() > now.getTime()) return outcome

  try {
    await prisma.$transaction(
      async (tx) => {
        const taxRules = (await tx.taxRule.findMany({ where: { active: true } })) as TaxRuleLike[]
        const discountRules = (await tx.discountRule.findMany({ where: { active: true } })) as DiscountRuleLike[]
        let guard = 0

        while (cursor.getTime() <= now.getTime() && guard < MAX_PERIODS_PER_SUB) {
          const periodEnd = addPeriod(cursor, snapshot.plan.period)
          if (periodEnd.getTime() > expiryLimit) break

          const existing = await findExistingInvoice(tx, {
            subscriptionId,
            periodStart: cursor,
            periodEnd
          })
          if (existing) {
            outcome.skipped += 1
          } else {
            const result = await generateInvoiceForPeriod(tx, {
              subscriptionId,
              periodStart: cursor,
              periodEnd,
              now,
              taxRules,
              discountRules
            })
            if (result.created) outcome.created += 1
            else outcome.skipped += 1
          }
          cursor = periodEnd
          guard += 1
        }

        const reachedEnd = cursor.getTime() >= expiryLimit
        const shouldClose = reachedEnd && snapshot.plan.autoCloseOnEnd
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            nextBillingDate: cursor,
            lastBilledAt: now,
            ...(shouldClose ? { status: "CLOSED", closedAt: now } : {})
          }
        })
        if (shouldClose) {
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId,
              fromStatus: "ACTIVE",
              toStatus: "CLOSED",
              note: "Auto closed at plan end date"
            }
          })
          outcome.closed += 1
        }
      },
      { timeout: 30000, maxWait: 10000 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Unique constraint")) {
      outcome.skipped += 1
    } else {
      outcome.errors += 1
      outcome.messages.push(`${subscriptionId}: ${message.slice(0, 160)}`)
    }
  }

  return outcome
}

export async function autoCloseExpired(now = new Date()) {
  const expired = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED"] },
      expiryDate: { lte: now },
      plan: { autoCloseOnEnd: true }
    },
    select: { id: true, status: true },
    take: 2000
  })
  let closed = 0
  for (const sub of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: "CLOSED", closedAt: now, nextBillingDate: null }
      })
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          fromStatus: sub.status,
          toStatus: "CLOSED",
          note: "Auto closed at plan end date"
        }
      })
    })
    closed += 1
  }
  return closed
}

export async function runBillingCycle(opts: { trigger: "CRON" | "MANUAL"; actorId?: string | null } = { trigger: "MANUAL" }) {
  const startedAt = new Date()
  const run = await prisma.billingRun.create({
    data: { trigger: opts.trigger, status: "RUNNING", startedAt, actorId: opts.actorId ?? null }
  })

  const outcome: BillOutcome = { created: 0, skipped: 0, errors: 0, closed: 0, messages: [] }
  const now = new Date()

  try {
    const pageSize = 200
    let cursorId: string | undefined
    for (let page = 0; page < 500; page++) {
      const subs = await prisma.subscription.findMany({
        where: { status: "ACTIVE", nextBillingDate: { lte: now } },
        select: { id: true },
        orderBy: { id: "asc" },
        take: pageSize,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
      })
      if (!subs.length) break
      cursorId = subs[subs.length - 1].id
      for (const sub of subs) {
        const res = await billSubscription(sub.id, now)
        outcome.created += res.created
        outcome.skipped += res.skipped
        outcome.errors += res.errors
        outcome.closed += res.closed
        if (res.messages.length) outcome.messages.push(...res.messages)
      }
      if (subs.length < pageSize) break
    }

    outcome.closed += await autoCloseExpired(now)
  } catch (error) {
    outcome.errors += 1
    outcome.messages.push(error instanceof Error ? error.message : "billing failed")
  }

  const finishedAt = new Date()
  return prisma.billingRun.update({
    where: { id: run.id },
    data: {
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      status: outcome.errors > 0 ? (outcome.created > 0 ? "PARTIAL" : "FAILED") : "SUCCESS",
      created: outcome.created,
      skipped: outcome.skipped,
      invoicesOk: outcome.created,
      errors: outcome.errors,
      message: outcome.messages.slice(0, 6).join(" | ") || null
    }
  })
}
