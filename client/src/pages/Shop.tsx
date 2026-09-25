import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { catalog, type Product } from "@shared/catalog";
import { productsAllowed, resultStateOf } from "@shared/resultB2C";
import { formatF } from "@shared/delivery";
import { productImages } from "@/lib/productImages";
import { cart, useCart } from "@/lib/cart";
import { CareTabs } from "@/components/b2c/CareTabs";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Soins › Boutique (refonte Organic). Chaque produit dit pourquoi il est pour
// vous, à partir de données réelles (recommandation de votre dernière analyse).
// Si cette analyse demande un avis médical, aucun produit n'est « conseillé ».
// ════════════════════════════════════════════════════════════════════════

const CATS = [
  { key: "visage", label: "Visage" },
  { key: "corps", label: "Corps" },
  { key: "cheveux", label: "Cheveux" },
] as const;

export default function Shop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: scans } = useScans();
  const lines = useCart();
  const [cat, setCat] = useState<(typeof CATS)[number]["key"]>("visage");

  const last: any = Array.isArray(scans) && scans.length ? scans[0] : null;
  const full = last?.recommendations?._fullResult;
  const lastState = last ? resultStateOf(full ?? { score: last.score, condition: last.condition }) : null;
  const canRecommend = !!lastState && productsAllowed(lastState);
  const recommended = new Set<string>(canRecommend ? (full?.recommendations?.products ?? []) : []);
  const lastDate = last?.createdAt ? new Date(last.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;

  const why = (p: Product) =>
    recommended.has(p.name) || recommended.has(p.id)
      ? `Conseillé par votre analyse${lastDate ? ` du ${lastDate}` : ""}`
      : (p.description || "").split(/(?<=[.!?])\s/)[0].slice(0, 90);

  const products = useMemo(() => {
    const list = catalog.filter((p) => p.category === cat && typeof p.price === "number" && p.price > 0);
    // Les produits conseillés par l'analyse d'abord.
    return [...list].sort((a, b) => Number(recommended.has(b.name) || recommended.has(b.id)) - Number(recommended.has(a.name) || recommended.has(a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, canRecommend, full]);

  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + (catalog.find((p) => p.id === l.id)?.price ?? 0) * l.qty, 0);
  const chip = (on: boolean) => cn(
    "whitespace-nowrap rounded-pill border px-4 py-[9px] text-[14px] font-semibold",
    on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text",
  );

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <CareTabs active="shop" />

        {lastState && !canRecommend && lastState !== "unusable" && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-organic-accent-100 p-4 text-organic-accent-900">
            <span className="text-[14px] font-bold">Votre dernière analyse demande l'avis d'un dermatologue</span>
            <span className="text-[13px]">GlowScan ne vous conseille aucun produit avant cet avis.</span>
            <button type="button" onClick={() => setLocation("/dermatologues")} className="self-start rounded-pill border-0 bg-organic-accent px-4 py-2 text-[13px] font-bold text-organic-bg">Consulter un dermatologue</button>
          </div>
        )}

        <div className="flex gap-1.5">
          {CATS.map((c) => (
            <button key={c.key} type="button" className={chip(cat === c.key)} onClick={() => setCat(c.key)}>{c.label}</button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const on = lines.some((l) => l.id === p.id);
            const img = productImages[p.id] || p.image;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-organic-surface px-3 py-2.5">
                {img ? <img src={img} alt="" loading="lazy" className="h-12 w-12 flex-none rounded-[14px] object-cover" /> : <span className="h-12 w-12 flex-none rounded-[14px] bg-organic-accent-200" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-bold">{p.name}</span>
                  <span className="line-clamp-2 text-[11px] text-organic-accent-2-800">{why(p)}</span>
                  <span className="text-[12px] font-bold">{formatF(p.price!)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => cart.toggle(p.id)}
                  className="flex-none rounded-pill border-0 px-3.5 py-2 text-[13px] font-bold text-organic-bg"
                  style={{ background: on ? "var(--color-accent-2-600)" : "var(--color-accent)" }}
                >
                  {on ? "Ajouté ✓" : "Ajouter"}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {count > 0 && (
        <div className="sticky bottom-[84px] z-40 mx-auto max-w-[480px] px-5 pb-3">
          <button
            type="button"
            onClick={() => setLocation(user ? "/commande" : "/auth")}
            className="flex w-full items-center justify-between rounded-pill border-0 bg-organic-neutral-900 px-5 py-3.5 text-[15px] font-bold text-organic-neutral-100 shadow-organic-md"
          >
            <span>Commander · {count} produit{count > 1 ? "s" : ""}</span>
            <span>{formatF(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
