import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Organic : pilule, Figtree 700, bordure transparente par défaut
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border border-transparent font-body text-sm font-bold leading-tight select-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-organic-accent disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // .btn-primary : accent, texte neutral-100, survol accent-600
        default:
          "bg-organic-accent text-organic-neutral-100 hover:bg-organic-accent-600 active:bg-organic-accent-700",
        // Conservé pour compatibilité : même rendu que le bouton principal
        premium:
          "bg-organic-accent text-organic-neutral-100 hover:bg-organic-accent-600 active:bg-organic-accent-700",
        destructive:
          "bg-organic-accent-700 text-organic-neutral-100 hover:bg-organic-accent-800",
        // .btn-secondary : transparent, bordure divider, survol text 7 %
        outline:
          "border-organic-divider bg-transparent text-organic-text hover:bg-organic-text/[.07] active:bg-organic-text/[.14]",
        secondary:
          "border-organic-divider bg-transparent text-organic-text hover:bg-organic-text/[.07] active:bg-organic-text/[.14]",
        // .btn-ghost : texte accent, survol accent 10 %
        ghost:
          "bg-transparent text-organic-accent hover:bg-organic-accent/10 active:bg-organic-accent/[.18]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 py-1.5 text-[13px]",
        lg: "h-12 px-6 py-3 text-[15px]",
        icon: "h-9 w-9 p-0",
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
          {...{ disabled: isDisabled }} // Slot transmet l'attribut à l'enfant
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
