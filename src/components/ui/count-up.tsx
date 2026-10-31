"use client"

import * as React from "react"
import { useInView } from "framer-motion"

export function CountUp({
  value,
  duration = 1100,
  format
}: {
  value: number
  duration?: number
  format?: (v: number) => string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const [display, setDisplay] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  const text = format ? format(display) : Math.round(display).toLocaleString("en-US")
  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  )
}
