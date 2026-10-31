import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("mono-label block text-[color:var(--muted-text)]", className)} {...props} />
  )
)
Label.displayName = "Label"

export { Label }
