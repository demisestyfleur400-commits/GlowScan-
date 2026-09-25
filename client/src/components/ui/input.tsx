import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // .input Organic : surface, bordure divider, pilule, padding-inline 14 px.
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-pill border border-organic-divider bg-organic-surface px-3.5 py-1.5 text-base text-organic-text caret-organic-accent file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-organic-text placeholder:text-organic-text/55 hover:border-organic-text/45 focus-visible:border-organic-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
