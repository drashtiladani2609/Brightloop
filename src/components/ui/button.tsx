"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border-[1.5px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--line)] bg-[var(--ink)] text-[var(--paper)] shadow-[3px_3px_0_0_var(--lime)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--lime)]",
        secondary:
          "border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]",
        outline:
          "border-dashed border-[color:var(--line)] bg-transparent text-[var(--ink)] hover:border-solid hover:bg-[var(--lime)] hover:text-[#141210]",
        ghost:
          "border-transparent text-[color:var(--muted-text)] hover:border-[color:var(--line)] hover:text-[var(--ink)]",
        destructive:
          "border-[color:var(--line)] bg-[var(--coral)] text-white shadow-[3px_3px_0_0_var(--offset)] hover:brightness-110",
        accent:
          "border-[color:var(--line)] bg-[var(--lime)] text-[#141210] shadow-[3px_3px_0_0_var(--offset)] hover:bg-[var(--lime-deep)]",
        link: "border-transparent px-0 text-cobalt underline decoration-1 underline-offset-4 hover:no-underline"
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[9.5px]",
        lg: "h-12 px-6 text-[11px]",
        icon: "h-10 w-10 px-0"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-3 w-3 animate-spin rounded-none border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
