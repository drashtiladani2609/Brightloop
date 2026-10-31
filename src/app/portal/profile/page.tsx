import { Building2, Mail, MapPin, Phone } from "lucide-react"
import { requirePortalUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PasswordForm } from "@/components/account/password-form"
import { initials } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function PortalProfilePage() {
  const user = await requirePortalUser()
  const customer = await prisma.customer.findUnique({ where: { id: user.customer!.id } })

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Profile" description="Your company details and the password you sign in with" />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[2px] bg-gradient-to-br bg-[color-mix(in_srgb,var(--cobalt)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos)_55%,transparent)] text-lg font-bold text-[color:var(--cobalt)]">
            {initials(customer?.name ?? "User")}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold">{customer?.name}</p>
              <Badge variant={customer?.active ? "success" : "muted"}>{customer?.active ? "active" : "inactive"}</Badge>
            </div>
            <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> {customer?.contactName}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {customer?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {customer?.phone ?? "no phone on file"}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {[customer?.city, customer?.country].filter(Boolean).join(", ") || "no address"}
              </span>
            </div>
          </div>
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

      <p className="text-center text-[11px] text-muted-foreground">
        Need your company details updated? Reply to any invoice email and our team will fix it
      </p>
    </div>
  )
}
