import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Search, Heart, Camera, ChevronRight, Crown, ShoppingBag } from "lucide-react";
import { catalog, formatPrice, getProductBrand } from "@shared/catalog";
import { productImages, getSafetyScore } from "@/lib/productImages";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

type Filter = "Tous" | "Nettoyant" | "Hydratant" | "Sérum" | "Visage" | "Corps" | "Cheveux";
const FILTERS: Filter[] = ["Tous", "Nettoyant", "Hydratant", "Sérum", "Visage", "Corps", "Cheveux"];

function matchFilter(name: string, cat: string, targets: string[], filter: Filter) {
  if (filter === "Tous") return true;
  if (filter === "Visage") return cat === "visage";
  if (filter === "Corps") return cat === "corps";
  if (filter === "Cheveux") return cat === "cheveux";
  const n = name.toLowerCase();
  const t = targets.join(" ").toLowerCase();
  if (filter === "Nettoyant") return n.includes("gel") || n.includes("savon") || n.includes("shampoi") || t.includes("nettoyage");
  if (filter === "Hydratant") return n.includes("crème") || n.includes("lait") || n.includes("beurre") || n.includes("hydrat") || t.includes("hydrat");
  if (filter === "Sérum") return n.includes("sérum") || n.includes("serum");
  return true;
}

export default function ScanProduct() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"search" | "recommended">("search");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Tous");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFav = (id: string) =>
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const visibleProducts = useMemo(() => {
    let list = catalog.filter(p => productImages[p.id]);
    if (tab === "recommended") {
      list = list.filter(p => p.category === "visage");
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.targets || []).some(t => t.toLowerCase().includes(q))
      );
    }
    list = list.filter(p => matchFilter(p.name, p.category, p.targets || [], filter));
    return list;
  }, [tab, query, filter]);

  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
        style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      >
        {/* Glow orb */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />
        </div>

        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl relative z-10" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          🔬
        </div>
        <div className="text-center mb-8 relative z-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
          >
            <Crown className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-extrabold" style={{ color: "#c4b5fd" }}>Fonctionnalité premium</span>
          </div>
          <h1 className="text-xl font-extrabold mb-3" style={{ color: DS.text }}>Scan produit</h1>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: DS.body }}>
            Analyse tes cosmétiques, vérifie leur composition et leur sécurité pour ta peau — <strong style={{ color: DS.text }}>500 FCFA/semaine</strong> ou <strong style={{ color: DS.text }}>2 000 FCFA/mois</strong>.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3 mb-8 relative z-10">
          {["Analyses de peau illimitées", "SkinBot IA — assistant peau 24h/24", "Scan Produit — vérifier tes cosmétiques", "Boutique — accès aux produits recommandés"].map(item => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl p-3.5"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <span style={{ color: "#6ee7b7" }} className="text-xs font-extrabold">✓</span>
              </div>
              <span className="text-sm font-medium" style={{ color: DS.body }}>{item}</span>
            </div>
          ))}
        </div>
        <a
          href="/premium"
          className="w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-full font-extrabold text-sm text-white relative z-10"
          style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)" }}
        >
          <Crown className="w-5 h-5" />
          Passer premium — 500 FCFA/semaine
        </a>
        <button onClick={() => setLocation("/")} className="mt-4 text-sm font-medium" style={{ color: DS.muted }}>← Retour à l'accueil</button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      data-testid="page-scan-product"
    >
      {/* Header */}
      <div
        className="px-5 pt-14 pb-5 sticky top-0 z-40"
        style={{ background: "rgba(13,10,14,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${DS.border}` }}
      >
        <h1 className="text-lg font-extrabold text-center" style={{ color: DS.text }}>Produits</h1>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Tabs */}
        <div
          className="flex rounded-2xl p-1.5 gap-1"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
        >
          {[
            { key: "search", label: "Rechercher produit" },
            { key: "recommended", label: "Recommandés" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as "search" | "recommended")}
              className="flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all"
              style={tab === key ? { background: "#7c3aed", color: "white" } : { color: DS.muted }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.muted }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none"
            style={{ background: DS.surface, border: `1px solid ${DS.border}`, color: DS.text }}
            data-testid="input-product-search"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all"
              style={filter === f
                ? { background: "#7c3aed", color: "white", borderColor: "#7c3aed" }
                : { background: "rgba(255,255,255,0.04)", color: DS.muted, borderColor: DS.border }
              }
              data-testid={`filter-chip-${f.toLowerCase()}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3">
          {visibleProducts.map((product, i) => {
            const img = productImages[product.id];
            const safety = getSafetyScore(product.id);
            const brand = getProductBrand(product);
            const isFav = favorites.has(product.id);
            const topTargets = (product.targets || []).slice(0, 2);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="rounded-2xl overflow-hidden"
                style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
                data-testid={`product-card-${product.id}`}
              >
                {/* Image zone */}
                <div className="relative flex items-center justify-center" style={{ height: 160, background: "rgba(255,255,255,0.03)" }}>
                  {/* Favorite */}
                  <button
                    onClick={() => toggleFav(product.id)}
                    className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                    style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${DS.border}` }}
                    aria-label="Favori"
                  >
                    <Heart className={`w-3.5 h-3.5 transition-colors ${isFav ? "fill-rose-400 text-rose-400" : "text-white/40"}`} />
                  </button>

                  {img ? (
                    <img
                      src={img}
                      alt={product.name}
                      className="h-32 w-auto object-contain drop-shadow-md"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                    />
                  ) : (
                    <div className="w-16 h-28 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <span className="text-xl">🧴</span>
                    </div>
                  )}

                  {/* Safety badge */}
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2">
                    <span
                      className="text-[9px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap text-white"
                      style={{ background: "rgba(124,58,237,0.8)" }}
                    >
                      Safety: {safety}/100
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="px-3 pt-2.5 pb-3 space-y-1.5">
                  <p className="text-[9px] font-medium uppercase tracking-wide leading-none" style={{ color: DS.muted }}>{brand}</p>
                  <p className="text-[11px] font-bold leading-snug line-clamp-2" style={{ color: DS.text }}>{product.name}</p>

                  {topTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topTargets.map(t => (
                        <span
                          key={t}
                          className="text-[8px] font-medium px-1.5 py-0.5 rounded-full leading-none capitalize"
                          style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[12px] font-extrabold" style={{ color: DS.text }}>
                    {product.price ? formatPrice(product.price) : "Prix sur demande"}
                  </p>

                  <a
                    href={`https://wa.me/237674377959?text=${encodeURIComponent(
                      `🛍️ Bonjour ! Je voudrais commander ce produit recommandé par GlowScan :\n\n• *${product.name}*\n💰 ${product.price ? formatPrice(product.price) : "À confirmer"}\n\nMerci !`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    data-testid={`button-commander-${product.id}`}
                    className="flex items-center justify-center gap-1 w-full py-1.5 rounded-xl text-white text-[10px] font-extrabold active:scale-[0.97] transition-all"
                    style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 2.108.549 4.093 1.512 5.821L.057 23.428l5.769-1.512A11.94 11.94 0 0012 24c6.626 0 12-5.373 12-12S18.626 0 12 0zm0 21.818a9.818 9.818 0 01-5.019-1.382l-.36-.213-3.427.899.915-3.343-.234-.373A9.817 9.817 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                    </svg>
                    Commander
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {visibleProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-extrabold text-base" style={{ color: DS.text }}>Aucun produit trouvé</p>
            <p className="text-sm mt-1" style={{ color: DS.muted }}>Essaie un autre mot-clé ou filtre</p>
          </div>
        )}
      </div>
    </div>
  );
}
