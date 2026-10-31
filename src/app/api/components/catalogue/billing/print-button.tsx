"use client"

import { Printer, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <>
      <Link href="/invoices">
        <Button variant="outline" size="sm" className="border-[color-mix(in_srgb,var(--line)_40%,transparent)] bg-white text-[color:var(--muted-text)] hover:bg-[color-mix(in_srgb,var(--line)_6%,transparent)] hover:text-[color:var(--muted-text)]">
          <X className="h-3.5 w-3.5" /> Close
        </Button>
      </Link>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" /> Print or save as PDF
      </Button>
    </>
  )
}
