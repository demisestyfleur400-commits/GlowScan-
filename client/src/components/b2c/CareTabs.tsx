import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

/** Segmented « Ma routine / Boutique » de l'onglet Soins (maquette « GlowScan App » › Soins). */
export function CareTabs({ active }: { active: "routine" | "shop" }) {
  const [, setLocation] = useLocation();
  const seg = (on: boolean) => cn(
    "flex-1 rounded-pill border-0 p-2.5 text-[14px] font-bold",
    on ? "bg-organic-accent text-organic-bg" : "bg-transparent text-organic-text",
  );
  return (
    <div className="flex flex-col gap-3">
      <h1 className="m-0 text-[28px]">Soins</h1>
      <div className="flex gap-1.5 rounded-pill bg-organic-surface p-1">
        <button type="button" className={seg(active === "routine")} onClick={() => setLocation("/routine")}>Ma routine</button>
        <button type="button" className={seg(active === "shop")} onClick={() => setLocation("/shop")}>Boutique</button>
      </div>
    </div>
  );
}
