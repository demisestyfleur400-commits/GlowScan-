import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Format pilule (rounded-full), texte compact et graisse épaisse pour le rendu B2B Clinique
  "whitespace-nowrap inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all select-none focus:outline-none",
  {
    variants: {
      variant: {
        // Mode Élite Tech : Couleurs sémantiques pures et contrastées
        default:
          "border-slate-950 bg-slate-950 text-white shadow-xs",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-800",
        destructive:
          "border-red-100 bg-red-50 text-red-700",
        success:
          "border-emerald-100 bg-emerald-50 text-emerald-700",
        warning:
          "border-amber-100 bg-amber-50 text-amber-700",
        info:
          "border-blue-100 bg-blue-50 text-blue-600",
        outline: 
          "border-slate-300 bg-transparent text-slate-700",
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
