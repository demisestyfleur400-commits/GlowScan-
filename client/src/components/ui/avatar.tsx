"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

// Ajout d'une prop status pour afficher l'état du patient ou la disponibilité du pro
interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  status?: "green" | "yellow" | "red" | "online" | null;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, status, children, ...props }, ref) => {
  
  const statusColors = {
    green: "bg-emerald-500 ring-white",
    yellow: "bg-amber-500 ring-white",
    red: "bg-red-500 ring-white animate-pulse",
    online: "bg-blue-500 ring-white",
  };

  return (
    <div className="relative inline-block shrink-0">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 transition-all shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>

      {/* Puce de statut connectée si spécifiée */}
      {status && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 shadow-sm z-10",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 select-none",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
