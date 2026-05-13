import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Search, Heart, Home as HomeIcon, ShoppingBag,
  BarChart2, Clock, Camera, ChevronRight, Crown, Star,
} from "lucide-react";
import { catalog, formatPrice, getProductBrand } from "@shared/catalog";
import { productImages, getSafetyScore } from "@/lib/productImages";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

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

function BottomNav() {
  const [, setLocation] = useLocation();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      data-testid="nav-bottom"
    >
      <div className="flex justify-around items-end px-2 pt-2 pb-1">
        <button onClick={() => setLocation("/")} className="flex flex-col items-center gap-0.5 flex-1 pb-1">
          <HomeIcon className="w-5 h-5 text-gray-400" />
          <span className="text-[9px] font-bold text-gray-400">Accueil</span>
        </button>
        <button onClick={() => setLocation("/shop")} className="flex flex-col items-center gap-0.5 flex-1 pb-1">
          <ShoppingBag className="w-5 h-5 text-pink-600 fill-pink-600/20" />
          <span className="text-[9px] font-bold text-pink-600">Boutique</span>
        </button>
        <button onClick={() => setLocation("/analyze")} className="flex flex-col items-center flex-1" style={{ marginTop: -20 }}>
          <div className="w-14 h-14 rounded-full bg-pink-600 flex items-center justify-center shadow-xl shadow-pink-300/50 border-4 border-white active:scale-90 transition-all">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </button>
        <button onClick={() => setLocation("/analyze")} className="flex flex-col items-center gap-0.5 flex-1 pb-1">
          <BarChart2 className="w-5 h-5 text-gray-400" />
          <span className="text-[9px] font-bold text-gray-400">Rapport</span>
        </button>
        <button onClick={() => setLocation("/profile")} className="flex flex-col items-center gap-0.5 flex-1 pb-1">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="text-[9px] font-bold text-gray-400">Historique</span>
        </button>
      </div>
    </nav>
  );
}

export default function ScanProduct() {
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #f5f3ff 100%)" }}>
        <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center mb-6 text-4xl">🔬</div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-full px-4 py-1.5 mb-4">
            <Crown className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-bold text-pink-700">Fonctionnalité Premium</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>Scan Produit</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            Analyse tes cosmétiques, vérifie leur composition et leur sécurité pour ta peau — <strong>500 FCFA/semaine</strong> ou <strong>2 000 FCFA/mois</strong>.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3 mb-8">
          {["Analyses de peau illimitées", "SkinBot IA — assistant peau 24h/24", "Scan Produit — vérifier tes cosmétiques", "Boutique — accès aux produits recommandés"].map(item => (
            <div key={item} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
              <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-500 text-xs font-bold">✓</span>
              </div>
              <span className="text-sm font-medium text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <a href="/premium" className="w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white shadow-lg" style={{ background: "linear-gradient(135deg, #b8860b 0%, #d4a017 50%, #c9a84c 100%)", fontFamily: "'Outfit', sans-serif" }}>
          <Crown className="w-5 h-5" />
          Passer Premium — 500 FCFA/semaine
        </a>
        <a href="/" className="mt-4 text-sm text-gray-400 font-medium">← Retour à l'accueil</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#f2f4f1" }} data-testid="page-scan-product">

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-50">
        <h1 className="text-[22px] font-black text-gray-900 text-center tracking-tight">Produits</h1>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* ── Tabs ── */}
        <div className="flex bg-gray-100/80 rounded-2xl p-1.5 gap-1">
          {[
            { key: "search", label: "Rechercher Produit" },
            { key: "recommended", label: "Recommandés" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as "search" | "recommended")}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-extrabold transition-all ${
                tab === key
                  ? "bg-pink-600 text-white shadow-md shadow-pink-100/50"
                  : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-700 placeholder-gray-400 border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-100"
            data-testid="input-product-search"
          />
        </div>

        {/* ── Category chips ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${
                filter === f
                  ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
              data-testid={`filter-chip-${f.toLowerCase()}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Product grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {visibleProducts.map((product, i) => {
            const img = productImages[product.id];
            const safety = getSafetyScore(product.id);
            const brand = getProductBrand(product);
            const isFav = favorites.has(product.id);
            const waPhone = product.whatsapp ? product.whatsapp.replace(/\D/g, "") : "";
            const topTargets = (product.targets || []).slice(0, 2);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                data-testid={`product-card-${product.id}`}
              >
                {/* ── Zone image ── */}
                <div className="relative flex items-center justify-center bg-gray-50" style={{ height: 160 }}>
                  {/* Cœur favori */}
                  <button
                    onClick={() => toggleFav(product.id)}
                    className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-90 transition-all"
                    aria-label="Favori"
                  >
                    <Heart className={`w-3.5 h-3.5 transition-colors ${isFav ? "fill-rose-500 text-rose-500" : "text-gray-300"}`} />
                  </button>

                  {/* Image produit */}
                  {img ? (
                    <img
                      src={img}
                      alt={product.name}
                      className="h-32 w-auto object-contain drop-shadow"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                    />
                  ) : (
                    <div className="w-16 h-28 rounded-xl bg-gray-200 flex items-center justify-center">
                      <span className="text-xl">🧴</span>
                    </div>
                  )}

                  {/* Badge sécurité */}
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-pink-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm">
                      Safety: {safety}/100
                    </span>
                  </div>
                </div>

                {/* ── Infos produit ── */}
                <div className="px-3 pt-2.5 pb-3 space-y-1.5">
                  {/* Marque */}
                  <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide leading-none">{brand}</p>

                  {/* Nom produit */}
                  <p className="text-[11px] font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</p>

                  {/* Ce que ça soigne — tags */}
                  {topTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topTargets.map(t => (
                        <span
                          key={t}
                          className="text-[8px] font-medium text-pink-700 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded-full leading-none capitalize"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Prix */}
                  <p className="text-[12px] font-bold text-gray-900">
                    {product.price ? formatPrice(product.price) : "Prix sur demande"}
                  </p>

                  {/* Bouton commander — toujours WhatsApp vers OWNER_PHONE (237674377959) */}
                  <a
                    href={`https://wa.me/237674377959?text=${encodeURIComponent(
                      `🛍️ Bonjour ! Je voudrais commander ce produit recommandé par GlowScan :\n\n• *${product.name}*\n💰 ${product.price ? formatPrice(product.price) : "À confirmer"}\n\nMerci !`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    data-testid={`button-commander-${product.id}`}
                    className="flex items-center justify-center gap-1 w-full py-1.5 rounded-xl text-white text-[10px] font-bold active:scale-[0.97] transition-all"
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
            <p className="text-gray-700 font-extrabold text-base">Aucun produit trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essaie un autre mot-clé ou filtre</p>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
