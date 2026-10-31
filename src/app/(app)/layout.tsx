import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { AppShell } from "@/components/layout/app-shell"
import { AppBackdrop } from "@/components/backgrounds"

import { ensureBillingCron } from "@/server/cron"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  ensureBillingCron()
  const user = await requireUser()
  if (user.role === "CUSTOMER") redirect("/portal")

  return (
    <>
      <AppBackdrop />
      <AppShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AppShell>
    </>
  )
}
