import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-2xl border-[1.5px] border-border bg-card px-4 text-[15px] text-foreground shadow-[inset_0_1px_0_0_var(--sand-line)] transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
