import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-2xl border-[1.5px] border-border bg-card px-4 py-3.5 text-[15px] text-foreground shadow-[inset_0_1px_0_0_var(--sand-line)] transition-all duration-200 outline-none placeholder:text-muted-foreground/60 focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
