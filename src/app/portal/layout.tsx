import { redirect } from "next/navigation"
import { requirePortalUser } from "@/lib/auth"
import { AppShell } from "@/components/layout/app-shell"
import { AppBackdrop } from "@/components/backgrounds"

import { ensureBillingCron } from "@/server/cron"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  ensureBillingCron()
  const user = await requirePortalUser()
  if (!user.customer) redirect("/signup?missing=customer")

  return (
    <>
      <AppBackdrop />
      <AppShell portal user={{ name: user.name, email: user.email, role: user.role }}>
        {children}
      </AppShell>
    </>
  )
}
