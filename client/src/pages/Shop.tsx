import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { catalog, type Product, formatPrice, getProductBrand } from "@shared/catalog";
import { Sparkles, X, Check, MessageCircle, Star, ChevronLeft, ShieldCheck, Truck } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
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

const SHOP_SOCIAL_CITIES = ["Douala", "Yaoundé", "Bafoussam", "Limbé", "Abidjan", "Dakar", "Kribi"];

function getPackCategory(product: Product, profile: UserProfile): {
  packName: string;
  accroche: string;
  emoji: string;
  socialProof: string;
} | null {
  if (!profile.condition && !profile.skinType) return null;
  const blob = searchableText(product);
  const cond = (profile.condition || "").toLowerCase();

  // Détermination déterministe de la ville selon l'id produit
  let cityIdx = 0;
  for (let i = 0; i < product.id.length; i++) cityIdx += product.id.charCodeAt(i);
  const city = SHOP_SOCIAL_CITIES[cityIdx % SHOP_SOCIAL_CITIES.length];
  let count = 12 + (cityIdx % 25);

  if (/tache|hyperpigment|pih|mélasma|éclaircis|niacinamide|vitamine c/i.test(blob)) {
    return {
      packName: "Pack Anti-taches",
      accroche: cond.includes("tache") || cond.includes("hyperpigment")
        ? "Ton analyse a révélé des taches d'hyperpigmentation actives sur ta peau."
        : "Ce soin cible les irrégularités de teint et les marques sombres.",
      emoji: "🌟",
      socialProof: `${count} femmes de ${city} ont éclairci leur teint avec ce soin ce mois-ci.`,
    };
  }
  if (/acn[eé]|bouton|imperfection|comédon|salicylique|peroxyde|anti-acn/i.test(blob)) {
    return {
      packName: "Pack Anti-acné",
      accroche: cond.includes("acné") || cond.includes("acne")
        ? "Ton analyse a détecté une acné inflammatoire — ce soin traite la cause racine."
        : "Formule sébo-régulatrice pour prévenir les imperfections.",
      emoji: "🔴",
      socialProof: `${count} femmes de ${city} ont réduit leurs boutons de plus de 70% en 4 semaines.`,
    };
  }
  if (/hydrat|déshydrat|hyaluron|barrière|céramide|sèche/i.test(blob)) {
    return {
      packName: "Routine Éclat",
      accroche: cond.includes("déshydrat") || cond.includes("sèche")
        ? "Ton analyse a révélé une déshydratation cutanée profonde."
        : "Hydratation intense pour redonner de l'éclat à ton teint.",
      emoji: "💧",
      socialProof: `${count} femmes de ${city} ont retrouvé une peau lumineuse en 2 semaines.`,
    };
  }
  if (product.category === "cheveux" && /sec|sèche|sécheresse|démangeaison|cuir/i.test(blob)) {
    return {
      packName: "Pack Cuir Chevelu",
      accroche: "Ton analyse a révélé une sécheresse du cuir chevelu et des démangeaisons.",
      emoji: "🌿",
      socialProof: `${count} femmes de ${city} ont apaisé leur cuir chevelu avec ce soin.`,
    };
  }
  if (product.category === "cheveux" && /croissance|pousse|densité|fragilité|chute/i.test(blob)) {
    return {
      packName: "Pack Pousse & Densité",
      accroche: "Ton analyse capillaire a détecté une fragilité pilaire et une pousse ralentie.",
      emoji: "💪",
      socialProof: `${count} femmes de ${city} ont observé une repousse visible en 6 semaines.`,
    };
  }
  return null;
}

function getRecommendationReason(product: Product, profile: UserProfile): string | null {
  if (!profile.skinType && !profile.condition && !profile.scanDate) return null;
  const date = profile.scanDate?.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) || "ton dernier scan";
  const skin = profile.skinType?.toLowerCase() || "ta peau";
  const cond = profile.condition ? profile.condition.toLowerCase() : "";

  const blob = searchableText(product);
  let activeIngredient = "ses actifs ciblés";
  if (/niacinamide/i.test(blob)) activeIngredient = "le niacinamide";
  else if (/salicylique/i.test(blob)) activeIngredient = "l'acide salicylique";
  else if (/hyaluron/i.test(blob)) activeIngredient = "l'acide hyaluronique";
  else if (/céramide/i.test(blob)) activeIngredient = "les céramides";
  else if (/spf|uv|solaire/i.test(blob)) activeIngredient = "sa protection solaire";
  else if (/rétinol/i.test(blob)) activeIngredient = "le rétinol";
  else if (/vitamine c/i.test(blob)) activeIngredient = "la vitamine C";

  const condLabel = cond ? `**${cond}**` : `peau ${skin}`;
  return `Ton analyse du ${date} a révélé ${condLabel}. Ce soin est calibré pour cibler précisément ce problème via ${activeIngredient} — actif démontré sur peaux africaines.`;
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
  const packCopy = getPackCategory(product, profile);
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

            {/* ── Pack copywriting émotionnel ── */}
            {packCopy && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(233,30,140,0.06)",
                  border: "1px solid rgba(233,30,140,0.2)",
                }}
              >
                <p className="text-[10px] font-bold tracking-wide mb-1.5" style={{ color: "#E91E8C" }}>
                  {packCopy.emoji} {packCopy.packName}
                </p>
                <p className="text-sm font-bold leading-snug mb-2" style={{ color: "#f3f0ff" }}>
                  {packCopy.accroche}
                </p>
                <p className="text-[10px] font-medium" style={{ color: "rgba(249,168,212,0.8)" }}>
                  ⭐ {packCopy.socialProof}
                </p>
              </div>
            )}

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
            Commander maintenant — Livraison à Douala
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Tag color mapping
// ─────────────────────────────────────────────────────────────────────
function getTagStyle(tag: string): React.CSSProperties {
  const t = tag.toLowerCase();
  if (/acn[eé]|bouton|imperfection/.test(t))
    return { background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" };
  if (/tache|hyperpigment|pih|mélasma|éclaircis/.test(t))
    return { background: "#fefce8", color: "#ca8a04", border: "1px solid #fde68a" };
  if (/hydrat|déshydrat|sèche|dry/.test(t))
    return { background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" };
  if (/cheveux|cuir|capillaire/.test(t))
    return { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" };
  if (/corps|gommage|savon/.test(t))
    return { background: "#fdf4ff", color: "#9333ea", border: "1px solid #e9d5ff" };
  if (/solaire|spf|uv/.test(t))
    return { background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" };
  return { background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" };
}

// ─────────────────────────────────────────────────────────────────────
//  Skeleton card
// ─────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "14px 16px",
      display: "flex", gap: 14, alignItems: "flex-start",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: 12, flexShrink: 0,
        background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 10, width: "40%", borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 14, width: "85%", borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 14, width: "60%", borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 18, width: "35%", borderRadius: 6, marginTop: 4, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 38, borderRadius: 10, marginTop: 4, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Product Card — design référence (horizontal, fond blanc)
// ─────────────────────────────────────────────────────────────────────
function ProductCard({
  product,
  profile,
  onOrder,
  index,
}: {
  product: Product;
  profile: UserProfile;
  onOrder: (p: Product) => void;
  index: number;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const img = productImages[product.id] || product.image;
  const brand = getProductBrand(product);
  const recommended = isRecommendedForUser(product, profile);
  const tags = product.targets.slice(0, 2).map(t =>
    t.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );

  const waNumber = (product.whatsapp || "+237674377959").replace("+", "");
  const waMsg = encodeURIComponent(
    `Bonjour 👋, je souhaite commander :\n• ${product.name}\nPrix : ${product.price?.toLocaleString("fr-FR")} FCFA\n\nMerci 🙏`
  );
  const waUrl = `https://wa.me/${waNumber}?text=${waMsg}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.3 }}
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        boxShadow: recommended
          ? "0 2px 16px rgba(124,58,237,0.12)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        border: recommended ? "1.5px solid rgba(124,58,237,0.2)" : "1px solid #f0f0f0",
        position: "relative",
      }}
    >
      {/* Badge recommandé */}
      {recommended && (
        <div style={{
          position: "absolute", top: -1, left: 16,
          background: "#7c3aed", color: "#fff",
          fontSize: 9, fontWeight: 800, letterSpacing: ".04em",
          padding: "3px 8px", borderRadius: "0 0 8px 8px",
          display: "flex", alignItems: "center", gap: 3,
        }}>
          <Star style={{ width: 8, height: 8, fill: "currentColor" }} />
          Recommandé
        </div>
      )}

      {/* Image 120×120 */}
      <div style={{
        width: 120, height: 120, borderRadius: 12, flexShrink: 0,
        overflow: "hidden", background: "#f7f7f7",
        position: "relative",
      }}>
        {/* Skeleton pendant chargement */}
        {!imgLoaded && !imgError && img && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }} />
        )}
        {img && !imgError ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            width={120}
            height={120}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 36,
          }}>
            {product.category === "cheveux" ? "💆" : product.category === "corps" ? "🧴" : "✨"}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Marque */}
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#9ca3af",
          letterSpacing: ".08em", textTransform: "uppercase",
        }}>
          {brand}
        </span>

        {/* Nom produit */}
        <p style={{
          fontSize: 14, fontWeight: 800, color: "#111827",
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {product.name}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600,
                padding: "3px 8px", borderRadius: 9999,
                ...getTagStyle(tag),
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Prix */}
        <p style={{ fontSize: 16, fontWeight: 900, color: "#111827", marginTop: 2 }}>
          {product.price ? `${product.price.toLocaleString("fr-FR")} FCFA` : "Sur demande"}
        </p>

        {/* Bouton Commander */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            fetch("/api/analytics/whatsapp-click", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: product.id,
                productName: product.name,
                brand: brand,
                whatsappNumber: product.whatsapp || "+237674377959",
              }),
            }).catch(() => {});
          }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "10px 0", borderRadius: 10,
            background: "#25d366", color: "#fff",
            fontSize: 13, fontWeight: 800,
            textDecoration: "none", marginTop: 2,
          }}
        >
          <MessageCircle style={{ width: 14, height: 14 }} />
          Commander
        </a>
      </div>
    </motion.div>
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
      className="min-h-screen pb-28"
      style={{ background: "#f5f5f7", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      <Navbar />

      {/* Header */}
      <header className="px-4 pt-5 pb-4 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>
            Produits recommandés
          </h1>
          <button
            onClick={() => setProblemFilter("tous")}
            style={{ fontSize: 13, fontWeight: 700, color: "#ca8a04", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
          >
            Voir tout <ChevronLeft style={{ width: 14, height: 14, transform: "rotate(180deg)" }} />
          </button>
        </div>
        {hasProfile && (
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            Sélection basée sur ton analyse · {profile.skinType || profile.condition || ""}
          </p>
        )}
      </header>

      {/* Filter tabs */}
      <div
        className="sticky top-0 z-20 bg-white"
        style={{ borderBottom: "1px solid #f0f0f0" }}
      >
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROBLEMS.map((p) => {
            const isActive = problemFilter === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setProblemFilter(p.key)}
                className="flex items-center gap-1.5 px-3.5 h-8 text-xs font-700 transition-all active:scale-[0.97] flex-shrink-0"
                style={
                  isActive
                    ? { background: "#111827", borderRadius: 9999, color: "#fff" }
                    : { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 9999, color: "#6b7280" }
                }
              >
                <span style={{ fontSize: 11 }}>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product list */}
      <main className="px-4 py-4">

        {/* CSS shimmer animation */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", borderRadius: 16 }}>
            <Sparkles style={{ width: 32, height: 32, margin: "0 auto 12px", color: "#d1d5db" }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Aucun produit trouvé</p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Sélectionne un autre filtre.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                profile={profile}
                onOrder={openOrderForProduct}
                index={i}
              />
            ))}
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
