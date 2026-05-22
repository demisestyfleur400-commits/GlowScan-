import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 flex gap-3 items-start overflow-hidden shadow-sm transition-all",
  {
    variants: {
      variant: {
        default: 
          "bg-white border-slate-200/60 text-slate-800 [&_svg]:text-slate-500",
        destructive:
          "bg-red-50/60 border-red-100 text-red-900 [&_svg]:text-red-600",
        success:
          "bg-emerald-50/60 border-emerald-100 text-emerald-900 [&_svg]:text-emerald-600",
        warning:
          "bg-amber-50/60 border-amber-100 text-amber-900 [&_svg]:text-amber-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("text-xs font-black uppercase tracking-wider leading-none text-slate-900 mb-1", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs md:text-sm font-medium text-slate-600 leading-relaxed [&_p]:leading-relaxed flex-1 min-w-0", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
