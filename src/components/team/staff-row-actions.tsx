"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

export function StaffRowActions({
  member,
  isSelf
}: {
  member: { id: string; role: string; isActive: boolean }
  isSelf: boolean
}) {
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function patch(body: Record<string, unknown>, message: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not update the member")
      toast({ title: message, variant: "success" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        value={member.role}
        disabled={isSelf || loading}
        onChange={(e) => patch({ role: e.target.value }, "Role updated")}
        className="h-8 w-[110px] text-xs"
      >
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
      </Select>
      <Button
        size="sm"
        variant={member.isActive ? "outline" : "default"}
        disabled={isSelf || loading}
        onClick={() => patch({ isActive: !member.isActive }, member.isActive ? "Account disabled" : "Account enabled")}
      >
        {member.isActive ? "Disable" : "Enable"}
      </Button>
    </div>
  )
}
