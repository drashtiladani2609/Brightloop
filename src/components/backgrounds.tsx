"use client"

import { cn } from "@/lib/utils"

export function HeroBackdrop({
  image = "/hero.jpg",
  overlay = "from-[#141210]/95 via-[#141210]/88 to-[#141210]/97"
}: {
  image?: string
  overlay?: string
}) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#141210]">
      <div
        className="animate-drift absolute inset-0 scale-105 bg-cover bg-center opacity-[0.18] [filter:grayscale(1)_contrast(1.2)]"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className={cn("absolute inset-0 bg-gradient-to-b", overlay)} />
      <div className="halftone absolute inset-0 text-[#f1ede2] opacity-[0.12]" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_12%_8%,rgba(200,242,78,0.22),transparent_52%),radial-gradient(ellipse_at_88%_90%,rgba(37,64,232,0.28),transparent_55%)]" />
      <div className="absolute -left-14 top-24 hidden h-32 w-32 rotate-12 border-[1.5px] border-[#f1ede2]/20 lg:block" />
      <div className="absolute bottom-14 right-10 hidden h-20 w-36 -rotate-6 border-[1.5px] border-[#c8f24e]/40 lg:block" />
    </div>
  )
}

export function AppBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--paper)]">
      <div className="ledger-grid absolute inset-0 opacity-40" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_10%_-12%,color-mix(in_srgb,var(--lime)_26%,transparent),transparent_46%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--paper)] to-transparent" />
    </div>
  )
}
