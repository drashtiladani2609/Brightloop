"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs } from "@/components/ui/tabs"

export function FilterTabs({
  param = "status",
  tabs,
  className
}: {
  param?: string
  tabs: { value: string; label: string; count?: number }[]
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(param) ?? ""

  return (
    <Tabs
      className={className}
      tabs={tabs}
      value={current}
      onChange={(value) => {
        const params = new URLSearchParams(searchParams.toString())
        if (!value) params.delete(param)
        else params.set(param, value)
        params.delete("page")
        router.push(`${pathname}?${params.toString()}`)
      }}
    />
  )
}
