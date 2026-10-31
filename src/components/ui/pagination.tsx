"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function Pagination({ page, pageCount, total }: { page: number; pageCount: number; total: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const href = (target: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(target))
    return `${pathname}?${params.toString()}`
  }

  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, pageCount - 4))
    return start + i
  }).filter((p) => p >= 1 && p <= pageCount)

  const square =
    "flex h-7 min-w-7 items-center justify-center rounded-[2px] border-[1.5px] px-1.5 font-mono text-[10px] transition"

  return (
    <div className="flex flex-col items-center justify-between gap-2.5 border-t-[1.5px] border-[color:color-mix(in_srgb,var(--line)_20%,transparent)] px-4 py-2.5 sm:flex-row">
      <p className="mono-label text-[color:var(--muted-text)]">
        {total.toLocaleString("en-US")} records · page {page} of {Math.max(1, pageCount)}
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={href(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(square, "border-[color:color-mix(in_srgb,var(--line)_40%,transparent)] text-[color:var(--muted-text)] hover:bg-[var(--lime)] hover:text-[#141210]", page <= 1 && "pointer-events-none opacity-30")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
        {pages.map((p) => (
          <Link
            key={p}
            href={href(p)}
            className={cn(
              square,
              p === page
                ? "border-[color:var(--line)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-[color:color-mix(in_srgb,var(--line)_40%,transparent)] text-[color:var(--muted-text)] hover:bg-[var(--lime)] hover:text-[#141210]"
            )}
          >
            {p}
          </Link>
        ))}
        <Link
          href={href(Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={cn(square, "border-[color:color-mix(in_srgb,var(--line)_40%,transparent)] text-[color:var(--muted-text)] hover:bg-[var(--lime)] hover:text-[#141210]", page >= pageCount && "pointer-events-none opacity-30")}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
