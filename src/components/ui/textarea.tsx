import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("field min-h-[80px] resize-y py-2 leading-relaxed", className)} {...props} />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
