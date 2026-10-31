import cron from "node-cron"
import { runBillingCycle } from "@/server/services/billing"
import { clearReportCache } from "@/server/services/reports"

const globalForCron = globalThis as unknown as { brightloopCron?: boolean }

export function ensureBillingCron() {
  if (globalForCron.brightloopCron) return
  if (process.env.CRON_ENABLED === "false") return
  globalForCron.brightloopCron = true

  const expression = process.env.CRON_SCHEDULE || "0 * * * *"
  cron.schedule(expression, async () => {
    try {
      const run = await runBillingCycle({ trigger: "CRON" })
      clearReportCache()
      console.info(`[billing] cron run created=${run.created} skipped=${run.skipped} errors=${run.errors}`)
    } catch (error) {
      console.error("[billing] cron run failed", error instanceof Error ? error.message : error)
    }
  })
  console.info(`[billing] cron scheduled with "${expression}"`)
}
