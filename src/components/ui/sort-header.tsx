"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function SortHeader({ label, field, className }: { label: string; field: string; className?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sort = searchParams.get("sort") ?? ""
  const dir = searchParams.get("dir") ?? "desc"
  const active = sort === field
  const nextDir = active && dir === "desc" ? "asc" : "desc"

  const params = new URLSearchParams(searchParams.toString())
  params.set("sort", field)
  params.set("dir", nextDir)

  return (
    <Link
      href={`${pathname}?${params.toString()}`}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground", className)}
    >
      {label}
      {active ? (
        dir === "desc" ? <ArrowDown className="h-2.5 w-2.5" /> : <ArrowUp className="h-2.5 w-2.5" />
      ) : (
        <ChevronsUpDown className="h-2.5 w-2.5 opacity-40" />
      )}
    </Link>
  )
}
