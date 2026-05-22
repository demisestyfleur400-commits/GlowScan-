import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { catalog, type Product, formatPrice, getProductBrand } from "@shared/catalog";
import { Sparkles, X, Check, MessageCircle, Star, ChevronLeft, ShieldCheck, Truck } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { trackPageVisit } from "@/lib/analytics";
import { productImages } from "@/lib/productImages";
import OrderModal, { type OrderItem } from "@/components/OrderModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────
//  Filtres par problème (Esthétique Clinique)
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
    label: "Acné & Boutons",
    emoji: "🔴",
    matcher: (p) => {
      if (p.category === "cheveux") return false;
      const nameDesc = `${p.name} ${p.description || ""}`.toLowerCase();
      const hasActiveSignal = /acn[eé]|bouton|imperfection|point.{0,3}noir|comédon|salicylique|peroxyde de benzoyle|anti-imperfection|purifiant.*visage|anti-acn/i.test(nameDesc);
      if (!hasActiveSignal) return false;
      const isJustPostAcne = /(post.acn|marques.acn|cicatrices.acn)/i.test(nameDesc) &&
        !/anti.acn|salicylique|peroxyde|imperfection|bouton|comédon/i.test(nameDesc);
      if (isJustPostAcne) return false;
      if (p.category === "corps" && !/dos|body acne|acné corporelle|acné du dos/i.test(nameDesc)) return false;
      return true;
    },
  },
  {
    key: "taches",
    label: "Taches & Teint",
    emoji: "🟤",
    matcher: (p) => p.category !== "cheveux" && /tache|hyperpigment|éclaircis|pih|niacinamide|vitamine c|mélasma|dyschromie/i.test(searchableText(p)),
  },
  {
    key: "hydratation",
    label: "Hydratation & Barrière",
    emoji: "💧",
    matcher: (p) => /hydrat|déshydrat|hyaluron|barrière cutanée|céramide|nourrissant/i.test(searchableText(p)),
  },
  {
    key: "solaire",
    label: "Protections Solaires",
    emoji: "☀️",
    matcher: (p) => {
      if (p.category === "cheveux") return false;
      const nameDesc = `${p.name} ${p.description || ""}`.toLowerCase();
      return /spf\s?\d|écran solaire|crème solaire|sunscreen/i.test(nameDesc);
    },
  },
  { key: "corps", label: "Soins Corps", emoji: "🧴", matcher: (p) => p.category === "corps" },
];

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
  const strongKeywords = [
    "acn", "bouton", "imperfection", "comédon",
    "tache", "hyperpigment", "pih", "mélasma",
    "déshydrat", "sécheresse", "ride", "anti-âge",
    "rougeur", "rosacée",
  ];
  const skinTypeMatch = ["grasse", "mixte", "sèche", "sensible"].some(
    (t) => profileText.includes(t) && productText.includes(t)
  );
  const strongMatch = strongKeywords.some(
    (kw) => profileText.includes(kw) && productText.includes(kw)
  );
  return strongMatch || skinTypeMatch;
}

function getDynamicBenefits(product: Product, profile: UserProfile): string[] {
  const benefits: string[] = [];
  const blob = searchableText(product);
  const skin = profile.skinType?.toLowerCase() || "";
  const cond = profile.condition?.toLowerCase() || "";
  const userBlob = `${skin} ${cond}`;

  if (/acn[eé]|bouton|imperfection|point.{0,3}noir|comédon|salicylique/i.test(blob)) {
    if (/acn[eé]|bouton|comédon/.test(userBlob)) {
      benefits.push("Aide à apaiser tes imperfections actuelles");
    } else {
      benefits.push("Prévient l'apparition de nouvelles imperfections");
    }
  }
  if (/sébum|peau grasse|matifiant|pore|salicylique/i.test(blob)) {
    if (skin.includes("mixte")) benefits.push("Régule l'excès de sébum sur ta zone T");
    else if (skin.includes("grasse")) benefits.push("Régule la production de sébum sur tout le visage");
    else benefits.push("Désincruste les pores et matifie la peau");
  }
  if (/tache|hyperpigment|éclaircis|pih|niacinamide|vitamine c/i.test(blob)) {
    if (/tache|pih|hyperpigment/.test(userBlob)) benefits.push("Atténue tes taches post-inflammatoires");
    else benefits.push("Unifie le teint et atténue les marques");
  }
  if (/hydrat|hyaluron|déshydrat|céramide|barrière/i.test(blob)) {
    if (skin.includes("grasse") || skin.includes("mixte")) benefits.push("Hydrate sans obstruer les pores");
    else if (skin.includes("sèche")) benefits.push("Hydrate intensément ta peau sèche pendant 24h");
    else benefits.push("Hydratation longue durée jusqu'à 24h");
  }
  if (/spf|uv|solaire/i.test(blob)) {
    if (/tache|pih|hyperpigment/.test(userBlob)) benefits.push("Protège des UV qui aggravent tes taches");
    else benefits.push("Protège ta peau des UV au quotidien");
  }
  if (/sensible|doux|apais/i.test(blob)) {
    if (skin.includes("sensible")) benefits.push("Formule douce qui ne réactive pas tes rougeurs");
    else benefits.push("Formule douce respectant la barrière cutanée");
  }
  if (product.category === "cheveux") {
    if (/sec|sèche/i.test(blob)) benefits.push("Nourrit en profondeur tes cheveux secs");
    if (/croissance|pousse/i.test(blob)) benefits.push("Stimule la pousse de tes cheveux");
    if (/frisé|crépu|naturel|boucle/i.test(blob)) benefits.push("Définit tes boucles sans alourdir");
  }
  if (product.category === "corps" && benefits.length === 0) {
    if (skin.includes("sèche")) benefits.push("Nourrit ta peau et restaure sa douceur");
    else benefits.push("Hydrate et adoucit ta peau au quotidien");
  }
  if (/rétinol|anti-âge|ride/i.test(blob)) {
    benefits.push("Stimule le renouvellement cellulaire et lisse les rides");
  }

  const unique = Array.from(new Set(benefits)).slice(0, 4);
  if (unique.length === 0) {
    if (product.usagePoints && product.usagePoints.length > 0) return product.usagePoints.slice(0, 4);
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

  return `Prescription IA : Diagnostiqué le ${date}. Ce soin est précisément calibré pour cibler ta peau ${skin}${cond} via ${activeIngredient}.`;
}

// ─────────────────────────────────────────────────────────────────────
//  Modale Fiche Produit (Style Tiroir Applicatif Premium)
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

  const targetLabel =
    product.category === "cheveux" ? "TES CHEVEUX" :
    product.category === "corps" ? "TON CORPS" :
    "TA PEAU";

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50"
        onClick={onClose}
      />
      <motion.div
        key="modal-drawer"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl border-t border-slate-100"
      >
        {/* Header Modale */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Fermer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700" />
          </button>
          <div className="w-12 h-1.5 rounded-full bg-slate-200" />
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>

        {/* Corps défilant */}
        <div className="overflow-y-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative aspect-square bg-slate-50 flex items-center justify-center border-b border-slate-100">
            {img ? (
              <img src={img} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-16 h-16 text-slate-200" />
            )}
            
            {/* Badges de réassurance exclusifs */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <span className="inline-flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm tracking-wider">
                <ShieldCheck className="w-3 h-3 text-blue-400" /> Authentique
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Infos Principales */}
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{brand}</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight mt-1">
                {product.name}
              </h2>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-950">
                  {product.price ? formatPrice(product.price) : "Sur demande"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Livraison Rapide</span>
              </div>
            </div>

            {product.description && (
              <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 border-l-2 border-slate-900 p-3.5 rounded-r-xl">
                {product.description}
              </p>
            )}

            {/* Pourquoi l'IA recommande */}
            {reason && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50/60 border border-blue-100/70 rounded-2xl p-4.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                    Analyse Clinique GlowScan
                  </h3>
                </div>
                <p className="text-xs md:text-sm font-semibold text-slate-700 leading-relaxed">{reason}</p>
              </motion.section>
            )}

            {/* Liste des Actions Cutanées */}
            <section>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3.5">
                Impact ciblé sur <span className="text-blue-600">{targetLabel}</span> :
              </h3>
              <ul className="space-y-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs md:text-sm font-medium text-slate-700 leading-relaxed">
                    <div className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                    </div>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
            
            {/* Rappel Logistique */}
            <div className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl bg-slate-50/50 text-slate-500">
              <Truck className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-[11px] font-medium leading-normal">
                Livraison à domicile ou retrait disponible à Douala & Yaoundé sous 24/48h.
              </p>
            </div>
          </div>
        </div>

        {/* Bouton d'achat Sticky */}
        <div className="border-t border-slate-100 bg-white p-4 flex-shrink-0">
          <Button
            type="button"
            variant="premium"
            size="lg"
            onClick={() => onOrder(product)}
            className="w-full shadow-lg"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            Acheter via WhatsApp — Direct Réseau
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE : BOUTIQUE EXPERTE
// ─────────────────────────────────────────────────────────────────────
export default function Shop() {
  const { user } = useAuth();
  const { data: scans } = useScans();
  const [problemFilter, setProblemFilter] = useState<ProblemKey>("tous");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  // Écran d'attente / Connexion requis
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-6 text-2xl text-white shadow-xl shadow-slate-950/10">🛍️</div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider mb-2">Boutique GlowScan</h1>
        <p className="text-xs font-medium text-slate-500 text-center max-w-xs mb-8 leading-relaxed">
          Accède aux prescriptions cosmétiques calibrées pour ta mélanine et ton type de peau.
        </p>
        <Button asChild size="lg" variant="default" className="w-full max-w-xs">
          <a href="/auth">Créer mon compte / Connexion</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <Navbar />

      {/* En-tête de la Pharmacie Technologique */}
      <header className="bg-white px-5 pt-6 pb-5 border-b border-slate-200/50">
        <span className="text-[10px] font-black tracking-widest uppercase text-blue-600">Pharmacie IA ✦ GlowScan</span>
        <h1 className="text-[24px] font-black text-slate-900 tracking-tight uppercase mt-1">
          {hasProfile ? `Profil : Peau ${profile.skinType || ""}`.trim() : "Prescriptions Cosmétiques"}
        </h1>
        <p className="text-xs font-semibold text-slate-400 mt-1.5 leading-normal">
          {hasProfile
            ? "Molécules et soins triés selon tes scans cliniques récents."
            : "Effectue un scan facial pour recevoir tes recommandations sur-mesure."}
        </p>
      </header>

      {/* Filtres Horizontaux Fluides (Barre de défilement masquée) */}
      <div className="bg-white sticky top-0 z-20 border-b border-slate-200/50">
        <div className="flex gap-2 overflow-x-auto px-4 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROBLEMS.map((p) => {
            const isActive = problemFilter === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setProblemFilter(p.key)}
                className={`flex items-center gap-2 px-4.5 h-10 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97] border ${
                  isActive
                    ? "bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/10"
                    : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille des produits ordonnés par pertinence IA */}
      <main className="px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60 p-6">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-black uppercase text-slate-800 tracking-wider">Aucune formule trouvée</p>
            <p className="text-xs font-medium text-slate-400 mt-1">Sélectionne un autre filtre moléculaire.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filtered.map((product, i) => {
              const img = productImages[product.id] || product.image;
              const recommended = isRecommendedForUser(product, profile);
              return (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.35 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/60 text-left active:scale-[0.98] transition-all flex flex-col hover:shadow-md hover:shadow-slate-100/50 group relative"
                >
                  <div className="relative aspect-square bg-slate-50 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                    {img ? (
                      <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-slate-200" />
                    )}
                    
                    {/* Badge de Recommandation Algorithmique */}
                    {recommended && (
                      <div className="absolute top-2 left-2 right-2 z-10">
                        <Badge variant="info" className="w-full justify-center gap-1 shadow-sm text-center py-1">
                          <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                          Recommandé par l'IA
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Corps de la Carte */}
                  <div className="p-3.5 flex-1 flex flex-col bg-white">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 truncate">
                      {getProductBrand(product)}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-2 mb-2 min-h-[32px] tracking-tight">
                      {product.name}
                    </h3>
                    <div className="text-xs font-black text-slate-950 mt-auto pt-1 flex justify-between items-center">
                      <span>{product.price ? formatPrice(product.price) : "Sur demande"}</span>
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Voir</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      {/* Modale Fiche Produit Tiroir */}
      <ProductDetailModal
        product={selectedProduct}
        profile={profile}
        onClose={() => setSelectedProduct(null)}
        onOrder={openOrderForProduct}
      />

      {/* Modale de validation finale de coordonnées */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        items={orderItems}
        title="Finaliser la commande"
        scanContext={profile.skinType || profile.condition ? {
          skinType: profile.skinType,
          condition: profile.condition,
        } : undefined}
      />
    </div>
  );
}
