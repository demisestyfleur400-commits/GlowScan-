import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { catalog, type Product, formatPrice, getProductBrand } from "@shared/catalog";
import { Sparkles, X, Check, MessageCircle, Star, ChevronLeft } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { trackPageVisit } from "@/lib/analytics";
import { productImages } from "@/lib/productImages";
import OrderModal, { type OrderItem } from "@/components/OrderModal";

// ─────────────────────────────────────────────────────────────────────
//  Filtres par problème
// ─────────────────────────────────────────────────────────────────────
type ProblemKey = "tous" | "acne" | "taches" | "hydratation" | "solaire" | "corps";

interface ProblemFilter {
  key: ProblemKey;
  label: string;
  emoji: string;
  matcher: (p: Product) => boolean;
}

function searchableText(p: Product): string {
  return `${p.targets.join(" ")} ${p.name} ${p.description || ""}`.toLowerCase();
}

const PROBLEMS: ProblemFilter[] = [
  { key: "tous", label: "Tous", emoji: "✨", matcher: () => true },
  {
    key: "acne",
    label: "Acné",
    emoji: "🔴",
    // Acné = produit qui CIBLE activement l'acné. On regarde le nom + description
    // (les targets contiennent souvent "post-acné/marques acné" pour des produits
    // anti-taches, ce qui donne des faux positifs).
    matcher: (p) => {
      if (p.category === "cheveux") return false;
      const nameDesc = `${p.name} ${p.description || ""}`.toLowerCase();
      // Signaux acné actifs (jamais "post-acné" ni "marques acné" ni "cicatrices acné")
      const hasActiveSignal = /acn[eé]|bouton|imperfection|point.{0,3}noir|comédon|salicylique|peroxyde de benzoyle|anti-imperfection|purifiant.*visage|anti-acn/i.test(nameDesc);
      if (!hasActiveSignal) return false;
      // Exclure si le seul signal est "post-acné", "marques acné", "cicatrices acné"
      const isJustPostAcne = /(post.acn|marques.acn|cicatrices.acn)/i.test(nameDesc) &&
        !/anti.acn|salicylique|peroxyde|imperfection|bouton|comédon/i.test(nameDesc);
      if (isJustPostAcne) return false;
      // Corps : seulement si acné corporelle explicite
      if (p.category === "corps" && !/dos|body acne|acné corporelle|acné du dos/i.test(nameDesc)) return false;
      return true;
    },
  },
  {
    key: "taches",
    label: "Taches",
    emoji: "🟤",
    matcher: (p) => p.category !== "cheveux" && /tache|hyperpigment|éclaircis|pih|niacinamide|vitamine c|mélasma|dyschromie/i.test(searchableText(p)),
  },
  {
    key: "hydratation",
    label: "Hydratation",
    emoji: "💧",
    matcher: (p) => /hydrat|déshydrat|hyaluron|barrière cutanée|céramide|nourrissant/i.test(searchableText(p)),
  },
  {
    key: "solaire",
    label: "Solaire",
    emoji: "☀️",
    // Solaire = vrai produit de protection visage (SPF dans le NOM/description,
    // pas une simple mention "protection solaire naturelle" dans une huile capillaire).
    matcher: (p) => {
      if (p.category === "cheveux") return false;
      const nameDesc = `${p.name} ${p.description || ""}`.toLowerCase();
      return /spf\s?\d|écran solaire|crème solaire|sunscreen/i.test(nameDesc);
    },
  },
  { key: "corps", label: "Corps", emoji: "🧴", matcher: (p) => p.category === "corps" },
];

// ─────────────────────────────────────────────────────────────────────
//  Profil utilisateur (issu du dernier scan)
// ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  skinType?: string;
  condition?: string;
  scanDate?: Date;
}

function extractUserProfile(scans: any[]): UserProfile {
  const last = scans?.[0];
  if (!last) return {};
  const full = last.recommendations?._fullResult;
  return {
    skinType: full?.skinType || last.skinType || undefined,
    condition: full?.condition || last.condition || undefined,
    scanDate: last.createdAt ? new Date(last.createdAt) : undefined,
  };
}

function isRecommendedForUser(product: Product, profile: UserProfile): boolean {
  if (!profile.skinType && !profile.condition) return false;
  const profileText = `${profile.skinType || ""} ${profile.condition || ""}`.toLowerCase();
  const productText = searchableText(product);
  // Mots-clés "fort" = vraies pathologies/conditions ciblées
  const strongKeywords = [
    "acn", "bouton", "imperfection", "comédon",
    "tache", "hyperpigment", "pih", "mélasma",
    "déshydrat", "sécheresse",
    "ride", "anti-âge",
    "rougeur", "rosacée",
  ];
  // Type de peau = match si le produit cible explicitement ce type
  const skinTypeMatch = ["grasse", "mixte", "sèche", "sensible"].some(
    (t) => profileText.includes(t) && productText.includes(t)
  );
  const strongMatch = strongKeywords.some(
    (kw) => profileText.includes(kw) && productText.includes(kw)
  );
  return strongMatch || skinTypeMatch;
}

// ─────────────────────────────────────────────────────────────────────
//  Bénéfices dynamiques selon profil
// ─────────────────────────────────────────────────────────────────────
function getDynamicBenefits(product: Product, profile: UserProfile): string[] {
  const benefits: string[] = [];
  const blob = searchableText(product);
  const skin = profile.skinType?.toLowerCase() || "";
  const cond = profile.condition?.toLowerCase() || "";
  const userBlob = `${skin} ${cond}`;

  // Acné — copy prudente sans promesse chiffrée
  if (/acn[eé]|bouton|imperfection|point.{0,3}noir|comédon|salicylique/i.test(blob)) {
    if (/acn[eé]|bouton|comédon/.test(userBlob)) {
      benefits.push("Aide à apaiser tes imperfections actuelles");
    } else {
      benefits.push("Prévient l'apparition de nouvelles imperfections");
    }
  }

  // Sébum / pores
  if (/sébum|peau grasse|matifiant|pore|salicylique/i.test(blob)) {
    if (skin.includes("mixte")) {
      benefits.push("Régule l'excès de sébum sur ta zone T");
    } else if (skin.includes("grasse")) {
      benefits.push("Régule la production de sébum sur tout le visage");
    } else {
      benefits.push("Désincruste les pores et matifie la peau");
    }
  }

  // Taches / PIH
  if (/tache|hyperpigment|éclaircis|pih|niacinamide|vitamine c/i.test(blob)) {
    if (/tache|pih|hyperpigment/.test(userBlob)) {
      benefits.push("Atténue tes taches post-inflammatoires");
    } else {
      benefits.push("Unifie le teint et atténue les marques");
    }
  }

  // Hydratation
  if (/hydrat|hyaluron|déshydrat|céramide|barrière/i.test(blob)) {
    if (skin.includes("grasse") || skin.includes("mixte")) {
      benefits.push("Hydrate sans obstruer les pores");
    } else if (skin.includes("sèche")) {
      benefits.push("Hydrate intensément ta peau sèche pendant 24h");
    } else {
      benefits.push("Hydratation longue durée jusqu'à 24h");
    }
  }

  // SPF
  if (/spf|uv|solaire/i.test(blob)) {
    if (/tache|pih|hyperpigment/.test(userBlob)) {
      benefits.push("Protège des UV qui aggravent tes taches");
    } else {
      benefits.push("Protège ta peau des UV au quotidien");
    }
  }

  // Sensibilité
  if (/sensible|doux|apais/i.test(blob)) {
    if (skin.includes("sensible")) {
      benefits.push("Formule douce qui ne réactive pas tes rougeurs");
    } else {
      benefits.push("Formule douce respectant la barrière cutanée");
    }
  }

  // Cheveux
  if (product.category === "cheveux") {
    if (/sec|sèche/i.test(blob)) benefits.push("Nourrit en profondeur tes cheveux secs");
    if (/croissance|pousse/i.test(blob)) benefits.push("Stimule la pousse de tes cheveux");
    if (/frisé|crépu|naturel|boucle/i.test(blob)) benefits.push("Définit tes boucles sans alourdir");
  }

  // Corps
  if (product.category === "corps" && benefits.length === 0) {
    if (skin.includes("sèche")) benefits.push("Nourrit ta peau et restaure sa douceur");
    else benefits.push("Hydrate et adoucit ta peau au quotidien");
  }

  // Anti-âge
  if (/rétinol|anti-âge|ride/i.test(blob)) {
    benefits.push("Stimule le renouvellement cellulaire et lisse les rides");
  }

  // Dédoublonner et limiter à 4
  const unique = Array.from(new Set(benefits)).slice(0, 4);

  // Fallback si rien matché
  if (unique.length === 0) {
    if (product.usagePoints && product.usagePoints.length > 0) {
      return product.usagePoints.slice(0, 4);
    }
    return ["Améliore visiblement la qualité de ta peau", "Adapté à ton type de peau"];
  }

  return unique;
}

function getRecommendationReason(product: Product, profile: UserProfile): string | null {
  if (!profile.skinType && !profile.condition && !profile.scanDate) return null;
  const date = profile.scanDate?.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) || "ton dernier scan";
  const skin = profile.skinType?.toLowerCase() || "ta peau";
  const cond = profile.condition ? ` avec ${profile.condition.toLowerCase()}` : "";

  const blob = searchableText(product);
  let activeIngredient = "ses actifs ciblés";
  if (/niacinamide/i.test(blob)) activeIngredient = "le niacinamide";
  else if (/salicylique/i.test(blob)) activeIngredient = "l'acide salicylique";
  else if (/hyaluron/i.test(blob)) activeIngredient = "l'acide hyaluronique";
  else if (/céramide/i.test(blob)) activeIngredient = "les céramides";
  else if (/spf|uv|solaire/i.test(blob)) activeIngredient = "sa protection solaire";
  else if (/rétinol/i.test(blob)) activeIngredient = "le rétinol";
  else if (/vitamine c/i.test(blob)) activeIngredient = "la vitamine C";

  return `Basé sur ton diagnostic du ${date}, ta peau ${skin}${cond} bénéficiera particulièrement de ${activeIngredient}.`;
}

// ─────────────────────────────────────────────────────────────────────
//  Modale détail produit
// ─────────────────────────────────────────────────────────────────────
function ProductDetailModal({
  product,
  profile,
  onClose,
  onOrder,
}: {
  product: Product | null;
  profile: UserProfile;
  onClose: () => void;
  onOrder: (product: Product) => void;
}) {
  useEffect(() => {
    if (!product) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    // Lock body scroll pendant que la modale est ouverte
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;
  const benefits = getDynamicBenefits(product, profile);
  const reason = getRecommendationReason(product, profile);
  const img = productImages[product.id] || product.image;
  const brand = getProductBrand(product);
  // Adapte le titre des bénéfices à la catégorie du produit
  const targetLabel =
    product.category === "cheveux" ? "TES cheveux" :
    product.category === "corps" ? "TON corps" :
    "TA peau";

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
        data-testid="modal-backdrop"
      />
      <motion.div
        key="modal-drawer"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl"
        data-testid="modal-product-detail"
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            data-testid="button-close-detail"
            aria-label="Fermer"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex justify-center">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Photo */}
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
            {img ? (
              <img src={img} alt={product.name} className="w-full h-full object-cover" data-testid="img-product-detail" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          <div className="p-5 space-y-6">
            {/* Nom + prix */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.18em]">{brand}</p>
              <h2 id="product-title" className="text-[22px] font-bold text-gray-900 font-display tracking-tight leading-tight mt-1" data-testid="text-product-name">
                {product.name}
              </h2>
              <p className="text-[24px] font-black text-pink-700 mt-3 font-display" data-testid="text-product-price">
                {product.price ? formatPrice(product.price) : "Prix sur demande"}
              </p>
            </div>

            {/* Description courte */}
            {product.description && (
              <p className="text-[13px] text-gray-600 leading-relaxed border-l-2 border-gray-200 pl-3 italic">
                {product.description}
              </p>
            )}

            {/* Bénéfices dynamiques */}
            <section data-testid="section-benefits">
              <h3 className="text-[14px] font-bold text-gray-900 mb-3 font-display">
                Ce que ce produit va faire pour <span className="text-pink-700">{targetLabel}</span>&nbsp;:
              </h3>
              <ul className="space-y-2.5">
                {benefits.map((b, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3 text-[13px] text-gray-700 leading-relaxed"
                    data-testid={`benefit-${i}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-pink-600" strokeWidth={3} />
                    </div>
                    <span>{b}</span>
                  </motion.li>
                ))}
              </ul>
            </section>

            {/* Pourquoi GlowScan recommande */}
            {reason && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-2xl p-4"
                data-testid="section-recommendation"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-pink-700">
                    Pourquoi GlowScan te le recommande
                  </h3>
                </div>
                <p className="text-[13px] text-gray-700 leading-relaxed">{reason}</p>
              </motion.section>
            )}

            {/* Espace pour le bouton sticky */}
            <div className="h-4" />
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div
          className="border-t border-gray-100 bg-white p-4 flex-shrink-0"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            type="button"
            onClick={() => onOrder(product)}
            data-testid="button-order-now"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-lg text-white font-bold text-[15px] shadow-lg shadow-pink-300/40 active:scale-[0.97] transition-transform"
            style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
          >
            <MessageCircle className="w-5 h-5" />
            Commander maintenant
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  PAGE BOUTIQUE
// ─────────────────────────────────────────────────────────────────────
export default function Shop() {
  const { user } = useAuth();
  const { data: scans } = useScans();
  const [problemFilter, setProblemFilter] = useState<ProblemKey>("tous");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ── Modale fiche commande (nom / téléphone / adresse → WhatsApp 237 674 377 959) ──
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => { trackPageVisit("/shop"); }, []);

  const profile = useMemo(
    () => extractUserProfile(Array.isArray(scans) ? (scans as any[]) : []),
    [scans]
  );
  const hasProfile = !!(profile.skinType || profile.condition);

  const openOrderForProduct = (product: Product) => {
    setOrderItems([{
      productId: product.id,
      productName: product.name,
      brand: getProductBrand(product),
      price: product.price,
    }]);
    setSelectedProduct(null);
    setShowOrderModal(true);
  };

  const filtered = useMemo(() => {
    const matcher = PROBLEMS.find((p) => p.key === problemFilter)!.matcher;
    let products = catalog.filter(matcher);
    if (hasProfile) {
      products = [...products].sort((a, b) => {
        const aRec = isRecommendedForUser(a, profile) ? 1 : 0;
        const bRec = isRecommendedForUser(b, profile) ? 1 : 0;
        return bRec - aRec;
      });
    }
    return products;
  }, [problemFilter, profile, hasProfile]);

  // Gate non connecté
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20 bg-gradient-to-b from-pink-50 to-white">
        <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center mb-6 text-4xl">🛍️</div>
        <h1 className="text-[24px] font-bold text-gray-900 font-display mb-3">La Boutique</h1>
        <p className="text-[14px] text-gray-500 leading-relaxed text-center max-w-xs mb-8">
          Connecte-toi pour découvrir les produits sélectionnés pour ta peau.
        </p>
        <a
          href="/auth"
          className="w-full max-w-sm flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-[14px] text-white shadow-lg shadow-pink-500/30 active:scale-95 transition-transform glow-bg-pink"
        >
          Me connecter
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" data-testid="page-shop">
      <Navbar />

      {/* Header */}
      <header className="bg-white px-5 pt-5 pb-4 border-b border-gray-100">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-pink-600">Boutique ✦</p>
        <h1 className="text-[26px] font-bold font-display text-gray-900 tracking-tight mt-1">
          Pour {hasProfile ? `ta peau ${profile.skinType || ""}`.trim() : "ta peau"}
        </h1>
        <p className="text-[12px] text-gray-500 mt-1">
          {hasProfile
            ? "Produits sélectionnés selon ton dernier diagnostic"
            : "Fais une analyse pour personnaliser tes recommandations"}
        </p>
      </header>

      {/* Filtre par problème */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div
          className="flex gap-2 overflow-x-auto px-4 py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          data-testid="filter-bar"
        >
          {PROBLEMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProblemFilter(p.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                problemFilter === p.key
                  ? "bg-pink-600 text-white shadow-md shadow-pink-100/50"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              data-testid={`filter-${p.key}`}
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille produits */}
      <main className="px-4 py-5">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400">Aucun produit dans cette catégorie</p>
            <p className="text-xs text-gray-300 mt-1">Essaie un autre filtre</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product, i) => {
              const img = productImages[product.id] || product.image;
              const recommended = isRecommendedForUser(product, profile);
              return (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 text-left active:scale-[0.97] transition-transform flex flex-col"
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                    {img ? (
                      <img src={img} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {recommended && (
                      <div className="absolute top-2 left-2 right-2">
                        <span
                          className="inline-flex items-center gap-1 bg-pink-600 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-md uppercase tracking-wide whitespace-normal text-center leading-tight"
                          data-testid={`badge-recommended-${product.id}`}
                        >
                          <Star className="w-2.5 h-2.5 fill-white flex-shrink-0" />
                          Recommandé pour ta peau
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">
                      {getProductBrand(product)}
                    </p>
                    <p className="text-[12px] font-bold text-gray-900 leading-snug line-clamp-2 mb-2 min-h-[32px]">
                      {product.name}
                    </p>
                    <p className="text-[14px] font-black text-gray-900 mt-auto" data-testid={`price-${product.id}`}>
                      {product.price ? formatPrice(product.price) : "Sur demande"}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      {/* Modale détail */}
      <ProductDetailModal
        product={selectedProduct}
        profile={profile}
        onClose={() => setSelectedProduct(null)}
        onOrder={openOrderForProduct}
      />

      {/* Fiche commande — toutes les commandes vont vers WhatsApp 237 674 377 959 */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        items={orderItems}
        title="Commander ce produit"
        scanContext={profile.skinType || profile.condition ? {
          skinType: profile.skinType,
          condition: profile.condition,
        } : undefined}
      />
    </div>
  );
}
