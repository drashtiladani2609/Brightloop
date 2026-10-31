import { addDays, addMonths, addWeeks, addYears, differenceInDays } from "date-fns"
import type { BillingPeriod } from "@/lib/constants"

export function addPeriod(date: Date, period: string): Date {
  switch (period as BillingPeriod) {
    case "DAILY":
      return addDays(date, 1)
    case "WEEKLY":
      return addWeeks(date, 1)
    case "MONTHLY":
      return addMonths(date, 1)
    case "YEARLY":
      return addYears(date, 1)
    default:
      return addMonths(date, 1)
  }
}

export function daysBetween(from: Date, to: Date) {
  return Math.max(0, differenceInDays(to, from))
}

export function termEndFor(start: Date, period: string) {
  return addPeriod(start, period)
}

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
