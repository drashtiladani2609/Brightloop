import { Plus, ShieldCheck } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableWrap, Td, Th, Tr } from "@/components/ui/table"
import { StaffDialog } from "@/components/team/staff-dialog"
import { StaffRowActions } from "@/components/team/staff-row-actions"
import { formatDate, initials } from "@/lib/utils"

export const dynamic = "force-dynamic"

const MATRIX = [
  { label: "Create staff accounts", admin: true, staff: false },
  { label: "Products, variants and plans", admin: true, staff: false },
  { label: "Taxes and discount rules", admin: true, staff: false },
  { label: "Customers and subscriptions", admin: true, staff: true },
  { label: "Invoices and payments", admin: true, staff: true },
  { label: "Reports and CSV export", admin: true, staff: true },
  { label: "Run the billing engine", admin: true, staff: true },
  { label: "Own subscription and invoices only", admin: false, staff: false }
]

export default async function TeamPage() {
  const current = await requireRole(["ADMIN"])

  const members = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true }
  })

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Team and access"
        description="Only an admin can add staff accounts or change roles. Customer accounts come from signup"
        actions={
          <StaffDialog
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> Add staff
              </Button>
            }
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Internal users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableWrap>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last login</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <Tr key={member.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-gradient-to-br bg-[color-mix(in_srgb,var(--cobalt)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos)_55%,transparent)] text-[10px] font-bold text-[color:var(--cobalt)]">
                        {initials(member.name)}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold">
                          {member.name}
                          {member.id === current.id && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{member.email}</span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={member.role === "ADMIN" ? "default" : "info"}>{member.role}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={member.isActive ? "success" : "muted"}>{member.isActive ? "active" : "disabled"}</Badge>
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {member.lastLoginAt ? formatDate(member.lastLoginAt) : "never"}
                  </Td>
                  <Td className="text-xs text-muted-foreground">{formatDate(member.createdAt)}</Td>
                  <Td className="text-right">
                    <StaffRowActions member={{ id: member.id, role: member.role, isActive: member.isActive }} isSelf={member.id === current.id} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--pos)]" /> What each role can do
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableWrap>
            <thead>
              <tr>
                <Th>Permission</Th>
                <Th className="text-center">Admin</Th>
                <Th className="text-center">Staff</Th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <Tr key={row.label}>
                  <Td className="text-xs">{row.label}</Td>
                  <Td className="text-center text-xs">{row.admin ? "yes" : "no"}</Td>
                  <Td className="text-center text-xs">{row.staff ? "yes" : "no"}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </CardContent>
      </Card>
    </div>
  )
}
