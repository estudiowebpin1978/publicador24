import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-all outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
        "placeholder:text-slate-500",
        "focus-visible:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-violet-500/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-50",
        "aria-invalid:border-red-500/50 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
