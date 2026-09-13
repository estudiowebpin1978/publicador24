import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-all outline-none",
        "placeholder:text-slate-500",
        "focus-visible:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-violet-500/20",
        "disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-50",
        "aria-invalid:border-red-500/50 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
