import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl text-xs font-black uppercase tracking-wider select-none focus-visible:outline-none transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Le bouton d'action standard : Propre, contrasté, autoritaire
        default:
          "bg-slate-950 text-white shadow-md shadow-slate-950/10 hover:bg-slate-900",
        // Le bouton de paiement / conversion : Attire instantanément l'œil
        premium:
          "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-purple-500/20 hover:opacity-95 text-white border-0",
        destructive:
          "bg-red-600 text-white shadow-md shadow-red-600/10 hover:bg-red-700",
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs",
        secondary: 
          "bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-slate-200/40",
        ghost: 
          "hover:bg-slate-50 text-slate-600 hover:text-slate-900",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-lg px-3.5 text-[10px]",
        lg: "h-14 rounded-2xl px-8 text-sm tracking-wide",
        icon: "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean // Intégration directe de l'état de chargement
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    
    // Si l'état isLoading est actif, on force le blocage du bouton
    const isDisabled = disabled || isLoading;
    
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={isDisabled}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Affichage intelligent du spinner si l'action charge */}
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-current" />
            <span>Chargement...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
