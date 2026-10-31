import { Mail, ShieldCheck, User } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PasswordForm } from "@/components/account/password-form"
import { formatDateTime, initials } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const session = await requireUser()
  const account = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true }
  })

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="My account" description="Your profile, role and password" />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[2px] bg-gradient-to-br bg-[color-mix(in_srgb,var(--cobalt)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos)_55%,transparent)] text-lg font-bold text-[color:var(--cobalt)]">
              {initials(account?.name ?? "User")}
            </span>
            <div>
              <p className="text-lg font-bold">{account?.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {account?.email}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> role {account?.role}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant={account?.isActive ? "success" : "danger"}>
              {account?.isActive ? "account active" : "disabled"}
            </Badge>
            <span>joined {formatDateTime(account?.createdAt)}</span>
            <span>last login {account?.lastLoginAt ? formatDateTime(account.lastLoginAt) : "just now"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <User className="h-4 w-4 text-[color:var(--cobalt)]" />
            <CardTitle>What this role can do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-muted-foreground">
            {account?.role === "ADMIN" ? (
              <>
                <p>Full control over catalogue, taxes, discounts and team</p>
                <p>Run billing, confirm invoices and record payments</p>
                <p>See every report and export any table</p>
              </>
            ) : (
              <>
                <p>Manage customers, subscriptions, invoices and payments</p>
                <p>Run billing and view reports</p>
                <p>Catalogue, taxes, discounts and team stay read only</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
