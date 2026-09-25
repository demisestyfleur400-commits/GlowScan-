import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // .tag Organic : 11 px, padding 3×10, pilule
  "whitespace-nowrap inline-flex items-center rounded-pill border border-transparent px-2.5 py-[3px] text-[11px] tracking-[0.02em] select-none focus:outline-none",
  {
    variants: {
      variant: {
        // tag-accent
        default: "bg-organic-accent-100 text-organic-accent-800",
        accent: "bg-organic-accent-100 text-organic-accent-800",
        // tag-accent-2
        "accent-2": "bg-organic-accent-2-100 text-organic-accent-2-800",
        // tag-neutral
        neutral: "bg-organic-neutral-100 text-organic-neutral-800",
        // Anciennes variantes, redirigées vers la palette Organic
        secondary: "bg-organic-neutral-100 text-organic-neutral-800",
        destructive: "bg-organic-accent-100 text-organic-accent-800",
        success: "bg-organic-accent-2-100 text-organic-accent-2-800",
        warning: "bg-organic-accent-100 text-organic-accent-800",
        info: "bg-organic-neutral-100 text-organic-neutral-800",
        // tag-outline
        outline: "border-organic-accent bg-transparent text-organic-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
