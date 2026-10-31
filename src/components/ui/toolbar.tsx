"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

export function useQueryState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key)
        else params.set(key, value)
      }
      if (!("page" in updates)) params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  return { searchParams, setParam, pathname }
}

export function SearchBox({ placeholder = "Search", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const { searchParams, setParam } = useQueryState()
  const [value, setValue] = React.useState(searchParams.get(param) ?? "")

  React.useEffect(() => {
    setValue(searchParams.get(param) ?? "")
  }, [searchParams, param])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if ((searchParams.get(param) ?? "") !== value) setParam({ [param]: value || undefined })
    }, 350)
    return () => clearTimeout(timer)
  }, [value, param, searchParams, setParam])

  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 pr-8 text-[12px]"
      />
      {value && (
        <button onClick={() => setValue("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function FilterSelect({
  param,
  options,
  placeholder,
  className
}: {
  param: string
  options: { value: string; label: string }[]
  placeholder: string
  className?: string
}) {
  const { searchParams, setParam } = useQueryState()
  const value = searchParams.get(param) ?? ""
  return (
    <Select
      value={value}
      onChange={(e) => setParam({ [param]: e.target.value || undefined })}
      className={cn("h-9 w-full text-sm sm:w-auto sm:min-w-[140px]", className)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  )
}

export function ClearFilters({ className }: { className?: string }) {
  const { searchParams, pathname, setParam } = useQueryState()
  const hasFilters = Array.from(searchParams.keys()).some((k) => !["page", "sort", "dir"].includes(k))
  if (!hasFilters) return null
  return (
    <button
      onClick={() => window.location.assign(pathname)}
      className={cn("text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", className)}
    >
      Clear filters
    </button>
  )
}
