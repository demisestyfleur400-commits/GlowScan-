import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

// Chaque item devient une capsule isolée et raffinée
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "mb-3 rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden transition-all data-[state=open]:border-blue-600/20 data-[state=open]:shadow-md data-[state=open]:shadow-blue-600/[0.02]",
      className
    )}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

// Le déclencheur adopte un style applicatif pur (plus de soulignement obsolète)
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between px-5 py-4.5 text-left text-xs font-black uppercase tracking-wider text-slate-800 transition-all [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:text-blue-600 outline-none group",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-3 w-full pr-2 leading-relaxed">{children}</span>
      {/* Conteneur d'icône stylisé pour un effet bouton natif */}
      <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-600 group-[&[data-state=open]]:bg-blue-50 group-[&[data-state=open]]:border-blue-100 group-[&[data-state=open]]:text-blue-600 transition-colors flex-shrink-0">
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 ease-out" />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

// Le contenu s'ouvre avec un padding parfaitement calibré et une police lisible
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-xs md:text-sm text-slate-600 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("px-5 pb-5 pt-1 border-t border-slate-50 font-medium leading-relaxed text-slate-600", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = "@radix-ui/react-accordion/Content"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
