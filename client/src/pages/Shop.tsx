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
    label: "Protections solaires",
    emoji: "☀️",
    matcher: (p) => {
      if (p.category === "cheveux") return false;
      const nameDesc = `${p.name} ${p.description || ""}`.toLowerCase();
      return /spf\s?\d|écran solaire|crème solaire|sunscreen/i.test(nameDesc);
    },
  },
  { key: "corps", label: "Soins corps", emoji: "🧴", matcher: (p) => p.category === "corps" },
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
//  Modale Fiche Produit
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
    product.category === "cheveux" ? "tes cheveux" :
    product.category === "corps" ? "ton corps" :
    "ta peau";

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(13,10,14,0.7)", backdropFilter: "blur(6px)" }}
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
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
        style={{
          background: "#13101f",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "28px 28px 0 0",
          maxHeight: "94vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "9999px",
              color: "rgba(200,185,255,0.65)",
            }}
            aria-label="Retour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "9999px",
              color: "rgba(200,185,255,0.65)",
            }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Product image */}
          <div
            className="relative aspect-square flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {img ? (
              <img src={img} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-16 h-16" style={{ color: "rgba(167,139,250,0.3)" }} />
            )}
            <div className="absolute bottom-4 left-4">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-700 px-3 py-1.5"
                style={{
                  background: "rgba(13,10,14,0.85)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#c4b5fd",
                  backdropFilter: "blur(10px)",
                }}
              >
                <ShieldCheck className="w-3 h-3" style={{ color: "#a78bfa" }} />
                Authentique
              </span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Product info */}
            <div>
              <span className="text-[10px] font-700 uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                {brand}
              </span>
              <h2 className="text-xl font-800 leading-tight mt-1" style={{ color: "#f3f0ff" }}>
                {product.name}
              </h2>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-2xl font-800" style={{ color: "#f3f0ff" }}>
                  {product.price ? formatPrice(product.price) : "Sur demande"}
                </span>
                <span
                  className="text-[10px] font-700 uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Livraison rapide
                </span>
              </div>
            </div>

            {product.description && (
              <p
                className="text-xs md:text-sm font-500 leading-relaxed px-4 py-3"
                style={{
                  color: "rgba(200,185,255,0.65)",
                  background: "rgba(167,139,250,0.06)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: "24px",
                }}
              >
                {product.description}
              </p>
            )}

            {/* AI recommendation reason */}
            {reason && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4"
                style={{
                  background: "rgba(167,139,250,0.06)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: "24px",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  <h3 className="text-[10px] font-700 uppercase tracking-wider" style={{ color: "#c4b5fd" }}>
                    Analyse clinique GlowScan
                  </h3>
                </div>
                <p className="text-xs md:text-sm font-500 leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>
                  {reason}
                </p>
              </motion.section>
            )}

            {/* Benefits list */}
            <section>
              <h3 className="text-xs font-700 mb-3" style={{ color: "rgba(200,185,255,0.65)" }}>
                Impact ciblé sur{" "}
                <span style={{ color: "#c4b5fd" }}>{targetLabel}</span> :
              </h3>
              <ul className="space-y-2.5">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs md:text-sm font-500 leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>
                    <div
                      className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: "rgba(167,139,250,0.15)",
                        border: "1px solid rgba(167,139,250,0.3)",
                        borderRadius: "8px",
                      }}
                    >
                      <Check className="w-3 h-3" style={{ color: "#c4b5fd" }} strokeWidth={3} />
                    </div>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Delivery info */}
            <div
              className="flex items-center gap-3 p-4"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "16px",
              }}
            >
              <Truck className="w-5 h-5 shrink-0" style={{ color: "#6ee7b7" }} />
              <p className="text-[11px] font-500 leading-normal" style={{ color: "rgba(110,231,183,0.85)" }}>
                Livraison à domicile ou retrait disponible à Douala & Yaoundé sous 24/48h.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div
          className="p-4 flex-shrink-0"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(19,16,31,0.97)",
            backdropFilter: "blur(20px)",
          }}
        >
          <button
            type="button"
            onClick={() => onOrder(product)}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-800"
            style={{
              background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
              borderRadius: "12px",
              color: "#fff",
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Acheter via WhatsApp — Cash à la livraison
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE : BOUTIQUE
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

  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      >
        {/* Glow orb */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 320,
            height: 320,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-60%)",
            background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
            borderRadius: "9999px",
          }}
        />
        <div
          className="w-16 h-16 flex items-center justify-center mb-6 text-2xl relative"
          style={{
            background: "rgba(167,139,250,0.06)",
            border: "1px solid rgba(167,139,250,0.18)",
            borderRadius: "24px",
          }}
        >
          🛍️
        </div>
        <h1 className="text-xl font-800 mb-2" style={{ color: "#f3f0ff" }}>
          Boutique GlowScan
        </h1>
        <p
          className="text-xs font-500 text-center max-w-xs mb-8 leading-relaxed"
          style={{ color: "rgba(200,185,255,0.65)" }}
        >
          Accède aux prescriptions cosmétiques calibrées pour ta mélanine et ton type de peau.
        </p>
        <a
          href="/auth"
          className="w-full max-w-xs flex items-center justify-center py-3.5 text-sm font-800"
          style={{
            background: "#7c3aed",
            borderRadius: "9999px",
            color: "#fff",
          }}
        >
          Créer mon compte / Connexion
        </a>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* Ambient glow orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
            borderRadius: "9999px",
          }}
        />
      </div>

      <Navbar />

      {/* Header */}
      <header
        className="px-5 pt-6 pb-5 relative"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span
          className="text-[10px] font-700 tracking-widest uppercase"
          style={{ color: "#a78bfa" }}
        >
          Pharmacie IA · GlowScan
        </span>
        <h1 className="text-2xl font-800 mt-1 tracking-tight" style={{ color: "#f3f0ff" }}>
          {hasProfile
            ? `Soins pour peau ${profile.skinType || ""}`.trim()
            : "Prescriptions cosmétiques"}
        </h1>
        <p className="text-xs font-500 mt-1.5 leading-normal" style={{ color: "rgba(200,185,255,0.65)" }}>
          {hasProfile
            ? "Actifs et soins triés selon tes scans cliniques récents."
            : "Effectue un scan facial pour recevoir tes recommandations sur-mesure."}
        </p>
      </header>

      {/* Filter tabs */}
      <div
        className="sticky top-0 z-20"
        style={{
          background: "rgba(13,10,14,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex gap-2 overflow-x-auto px-4 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROBLEMS.map((p) => {
            const isActive = problemFilter === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setProblemFilter(p.key)}
                className="flex items-center gap-2 px-4 h-9 text-xs font-700 transition-all active:scale-[0.97] flex-shrink-0"
                style={
                  isActive
                    ? {
                        background: "#7c3aed",
                        borderRadius: "9999px",
                        color: "#fff",
                      }
                    : {
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "9999px",
                        color: "rgba(200,185,255,0.65)",
                      }
                }
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product grid */}
      <main className="px-4 py-6 relative z-10">
        {filtered.length === 0 ? (
          <div
            className="text-center py-20 p-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "24px",
            }}
          >
            <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(167,139,250,0.4)" }} />
            <p className="text-xs font-700" style={{ color: "#f3f0ff" }}>Aucune formule trouvée</p>
            <p className="text-xs font-500 mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Sélectionne un autre filtre.
            </p>
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
                  className="overflow-hidden text-left active:scale-[0.98] transition-all flex flex-col group relative"
                  style={{
                    background: recommended
                      ? "rgba(167,139,250,0.06)"
                      : "rgba(255,255,255,0.04)",
                    border: recommended
                      ? "1px solid rgba(167,139,250,0.18)"
                      : "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "24px",
                  }}
                >
                  {/* Image area */}
                  <div
                    className="relative aspect-square flex items-center justify-center overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Sparkles className="w-6 h-6" style={{ color: "rgba(167,139,250,0.3)" }} />
                    )}

                    {/* Recommended badge — pink only for this urgency/highlight signal */}
                    {recommended && (
                      <div className="absolute top-2 left-2 right-2 z-10">
                        <div
                          className="w-full flex items-center justify-center gap-1 py-1 text-[9px] font-700 uppercase tracking-wider"
                          style={{
                            background: "rgba(233,30,140,0.85)",
                            color: "#fff",
                            borderRadius: "9999px",
                          }}
                        >
                          <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                          Recommandé par l'IA
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-3.5 flex-1 flex flex-col">
                    <span
                      className="text-[9px] font-700 uppercase tracking-wider mb-1 truncate"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {getProductBrand(product)}
                    </span>
                    <h3
                      className="text-xs font-700 leading-snug line-clamp-2 mb-2 min-h-[32px] tracking-tight"
                      style={{ color: "#f3f0ff" }}
                    >
                      {product.name}
                    </h3>
                    <div className="text-xs font-700 mt-auto pt-1 flex justify-between items-center">
                      <span style={{ color: "#f3f0ff" }}>
                        {product.price ? formatPrice(product.price) : "Sur demande"}
                      </span>
                      <span
                        className="text-[9px] font-700 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "#a78bfa" }}
                      >
                        Voir
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      {/* Product detail drawer */}
      <ProductDetailModal
        product={selectedProduct}
        profile={profile}
        onClose={() => setSelectedProduct(null)}
        onOrder={openOrderForProduct}
      />

      {/* Order modal */}
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
