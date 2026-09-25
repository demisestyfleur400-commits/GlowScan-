import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ScanCamera, type LightLevel } from "@/components/b2c/ScanCamera";
import { quotaLabel, type IngredientRisk, type ProductIngredient, type ProductQuota as Quota } from "@shared/productSafety";

// ════════════════════════════════════════════════════════════════════════
// Scan produit (refonte Organic) — maquette « GlowScan App » › Scan produit.
// Verdict « Compatible » / « À éviter pour votre peau », ingrédients dangereux
// (hydroquinone, corticoïdes, mercure) détectés côté serveur, alternative sans
// danger dans la Boutique. Compte obligatoire ; 3 scans gratuits par semaine.
// ════════════════════════════════════════════════════════════════════════

type ScanResult = {
  productName: string | null; brand: string | null; category: string | null;
  ingredients: ProductIngredient[];
  verdict: "compatible" | "avoid"; title: string; text: string;
  quota: Quota;
};

const RISK_COLOR: Record<IngredientRisk, string> = {
  danger: "var(--color-accent)",
  caution: "var(--color-accent-300)",
  ok: "var(--color-accent-2-600)",
};


export default function ProductScanCamera() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: quota } = useQuery<Quota>({ queryKey: ["/api/product-scan/quota"], enabled: !!user });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const onCapture = async (image: string, light: LightLevel) => {
    if (light === "dark") {
      toast({ title: "Photo trop sombre", description: "Rapprochez-vous d'une fenêtre pour que la liste soit lisible.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/product-scan", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ image }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) { setLocation("/auth"); return; }
      if (res.status === 403 && d?.code === "PRODUCT_QUOTA_EXCEEDED") {
        qc.setQueryData(["/api/product-scan/quota"], { isPremium: false, used: d.used, limit: d.limit, remaining: 0 });
        return;
      }
      if (!res.ok) throw new Error(d?.message);
      setResult(d as ScanResult);
      qc.setQueryData(["/api/product-scan/quota"], (d as ScanResult).quota);
    } catch {
      toast({ title: "Analyse impossible", description: "Le produit n'a pas pu être analysé. Réessayez.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const back = () => (result ? setResult(null) : setLocation("/analyze"));
  const exhausted = !!quota && !quota.isPremium && (quota.remaining ?? 0) <= 0;

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <button type="button" onClick={back} className="flex items-center gap-1 self-start border-0 bg-transparent p-0 font-bold text-organic-accent-700">
          <ArrowLeft size={18} strokeWidth={1.75} /> Retour
        </button>

        {!authLoading && !user ? (
          <div className="flex flex-col gap-3 rounded-lg bg-organic-surface p-5">
            <h1 className="m-0 text-[26px]">Scanner un produit</h1>
            <p className="m-0 text-[14px]">Connectez-vous pour vérifier vos produits : 3 scans gratuits par semaine.</p>
            <button type="button" onClick={() => setLocation("/auth")} className="rounded-pill border-0 bg-organic-accent p-3.5 text-[15px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">
              Se connecter
            </button>
          </div>
        ) : result ? (
          <>
            <div className="flex flex-col gap-1">
              {(result.category || result.brand) && (
                <span className="text-[12px] text-organic-neutral-700">{[result.category, result.brand].filter(Boolean).join(" · ")}</span>
              )}
              <h1 className="m-0 text-[26px]">{result.productName || "Produit analysé"}</h1>
            </div>
            <div
              className="flex flex-col gap-1.5 rounded-lg p-4"
              style={result.verdict === "avoid"
                ? { background: "var(--color-accent-700)", color: "var(--color-bg)" }
                : { background: "var(--color-accent-2-100)", color: "var(--color-accent-2-900)" }}
            >
              <span className="text-[18px] font-bold">{result.title}</span>
              <span className="text-[13px] leading-normal">{result.text}</span>
            </div>
            {result.ingredients.length > 0 ? (
              <div className="flex flex-col gap-2">
                {[...result.ingredients]
                  .sort((a, b) => ["danger", "caution", "ok"].indexOf(a.risk) - ["danger", "caution", "ok"].indexOf(b.risk))
                  .map((g, i) => (
                    <div key={`${g.name}-${i}`} className="flex items-center gap-2.5 rounded-pill bg-organic-surface px-3.5 py-2.5">
                      <span className="h-2.5 w-2.5 flex-none rounded-pill" style={{ background: RISK_COLOR[g.risk] }} />
                      <span className="flex-1 text-[13px] font-semibold">{g.name}</span>
                      {g.why && <span className="text-[12px] text-organic-neutral-700">{g.why}</span>}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="m-0 text-[13px] text-organic-neutral-700">La liste des ingrédients n'était pas lisible. Reprenez la photo au dos du produit.</p>
            )}
            {result.verdict === "avoid" ? (
              <button type="button" onClick={() => setLocation("/shop")} className="rounded-pill border border-organic-divider bg-transparent p-3 text-[14px] font-bold hover:bg-organic-text/[.07]">
                Voir une alternative sans danger
              </button>
            ) : (
              <button type="button" onClick={() => setResult(null)} className="rounded-pill border border-organic-divider bg-transparent p-3 text-[14px] font-bold hover:bg-organic-text/[.07]">
                Scanner un autre produit
              </button>
            )}
            <span className="text-[11px] text-organic-neutral-700">Ingrédients lus sur votre photo : en cas de doute, vérifiez l'emballage.</span>
          </>
        ) : exhausted ? (
          <div className="flex flex-col gap-3 rounded-lg bg-organic-surface p-5">
            <h1 className="m-0 text-[24px]">Vos 3 scans gratuits sont utilisés</h1>
            <p className="m-0 text-[14px]">Ils se renouvellent sur 7 jours glissants. Avec Premium, les scans produit sont illimités.</p>
            <button type="button" onClick={() => setLocation("/premium")} className="rounded-pill border-0 bg-organic-accent p-3.5 text-[15px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">
              Voir Premium
            </button>
          </div>
        ) : busy ? (
          <div className="flex items-center justify-center gap-3 rounded-pill bg-organic-accent-2-100 px-5 py-3.5 text-[14px] font-bold text-organic-accent-2-900">
            <span className="h-4 w-4 animate-pulse rounded-pill bg-organic-accent-2-600" />
            Lecture des ingrédients…
          </div>
        ) : (
          <>
            <h1 className="m-0 text-[28px]">Scanner un produit</h1>
            <ScanCamera
              hint="Visez la liste des ingrédients au dos du produit"
              facing="environment"
              frame="label"
              captureLabel="Scanner le produit"
              onCapture={onCapture}
            />
            <span className="text-center text-[12px] text-organic-neutral-700">{quotaLabel(quota)}</span>
          </>
        )}
      </main>
    </div>
  );
}
