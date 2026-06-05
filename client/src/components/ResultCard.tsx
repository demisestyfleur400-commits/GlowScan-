// ─── Copywriting personnalisé par produit & condition ───────────────
function buildWhyText(
  product: typeof catalog[0],
  condition: string,
  skinType?: string,
  area?: "visage" | "corps" | "cheveux",
  role?: "nettoyant" | "serum" | "creme"
): string {
  const condLower = (condition || "").toLowerCase();
  const r = role || "creme";

  if (area === "cheveux") {
    if (r === "nettoyant") return "Purifie le cuir chevelu en profondeur sans altérer les pigments mélaniques naturels de tes cheveux.";
    if (r === "serum") return "Concentré en actifs capillaires pour stimuler la microcirculation et renforcer la fibre pilaire.";
    return "Nourrit et scelle les écailles de la tige capillaire pour un brillant et une résistance accrus.";
  }

  if (area === "corps") {
    if (r === "nettoyant") return "Élimine les impuretés corpo tout en préservant le film hydrolipidique essentiel à ta peau.";
    return "Apport lipidique intense pour les zones sèches identifiées lors du diagnostic cutané.";
  }

  // visage
  if (r === "nettoyant") {
    if (condLower.includes("acné") || condLower.includes("acne") || condLower.includes("comédons"))
      return "Formule sébo-régulatrice qui élimine le sébum excédentaire — première cause des boutons identifiée dans ton profil.";
    if (condLower.includes("sensib") || condLower.includes("réactiv"))
      return "Nettoyage doux qui respecte la barrière cutanée fragile identifiée dans ton diagnostic.";
    return "Prépare la peau à recevoir les actifs suivants en éliminant la couche lipidique oxydée.";
  }
  if (r === "serum") {
    if (condLower.includes("tache") || condLower.includes("hyperpigment") || condLower.includes("mélasma"))
      return "Actifs dépigmentants pour cibler les taches identifiées lors de ta cartographie — résultats visibles en 3–4 semaines.";
    if (condLower.includes("acné") || condLower.includes("acne"))
      return "Niacinamide & anti-inflammatoires pour calmer les lésions actives et réguler la sécrétion sébacée.";
    if (condLower.includes("rides") || condLower.includes("anti-âge") || condLower.includes("vieilliss"))
      return "Booster de collagène pour rebondir les volumes faciaux et réduire les rides de contraction détectées.";
    if (condLower.includes("déshydrat") || condLower.includes("sèch"))
      return "Acide hyaluronique multi-poids pour reconstituer les réserves hydriques cutanées à tous les niveaux.";
    return "Concentré d'actifs ciblés pour traiter directement la problématique identifiée dans ton Glow Score.";
  }
  // creme
  if (condLower.includes("déshydrat") || condLower.includes("sèch") || condLower.includes("tiraillem"))
    return "Scelle l'hydratation et répare la barrière cutanée affaiblie — essentiel en dernière étape de rituel.";
  if (condLower.includes("acné") || condLower.includes("gras") || condLower.includes("brillan"))
    return "Texture légère non-comédogène pour hydrater sans boucher les pores ni aggraver l'état acnéique détecté.";
  return "Renforce la barrière cutanée détectée comme fragilisée et protège des agressions environnementales locales.";
}

// ─────────────────────────────────────────────────────────
// ANNUAIRE DERMATOLOGUES PARTENAIRES GLOWSCAN
// Ajouter de nouveaux dermatologues ici → ils apparaissent
// automatiquement en carousel dans toutes les analyses.
// ─────────────────────────────────────────────────────────
interface Dermatologist {
  id: string;
  name: string;
  title: string;
  location: string;
  mode: string;
  whatsapp: string; // sans le "+"
  available: boolean;
}

const DERMATOLOGISTS: Dermatologist[] = [
  {
    id: "legonou-christelle",
    name: "Dr LEGONOU Christelle",
    title: "Dermatologue - Vénérologue",
    location: "Cotonou, Bénin",
    mode: "Consultation en ligne",
    whatsapp: "22901590866877",
    available: true,
  },
  // ← Ajouter d'autres dermatologues ici
];

function DermatologistSection({
  score,
  condition,
}: {
  score: number;
  condition: string;
}) {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const docs = DERMATOLOGISTS.filter(d => d.available);
  if (docs.length === 0) return null;

  const doc = docs[currentIdx];
  const waMsg = encodeURIComponent(
    `Bonjour Dr ${doc.name.replace("Dr ", "")}, j'ai fait mon analyse GlowScan (score : ${score}/100 - ${condition}) et je souhaite une consultation en ligne.`
  );
  const waUrl = `https://wa.me/${doc.whatsapp}?text=${waMsg}`;

  return (
    <div style={{ marginTop: "4px" }}>
      {/* Titre section */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "15px" }}>💬</span>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "rgba(200,185,255,0.9)" }}>
          Consulter un dermatologue expert
        </p>
      </div>

      {/* Carte dermatologue */}
      <div
        style={{
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "20px",
          padding: "16px 18px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Badge disponibilité */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              flexShrink: 0,
              boxShadow: "0 0 0 0 rgba(34,197,94,0.4)",
              animation: "glowscan-pulse 1.8s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#22c55e",
              letterSpacing: ".3px",
              textTransform: "uppercase",
            }}
          >
            Consultation en ligne disponible
          </span>
        </div>

        {/* Identité */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg,rgba(167,139,250,0.25),rgba(124,58,237,0.15))",
              border: "1px solid rgba(167,139,250,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              flexShrink: 0,
            }}
          >
            👩‍⚕️
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "#f3f0ff", marginBottom: "2px" }}>
              {doc.name}
            </p>
            <p style={{ fontSize: "11px", color: "rgba(200,185,255,0.75)", marginBottom: "4px" }}>
              {doc.title}
            </p>
            <p style={{ fontSize: "10px", color: "rgba(200,185,255,0.5)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>📍</span> {doc.location} · {doc.mode}
            </p>
          </div>
        </div>

        {/* Bouton WhatsApp */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "12px 0",
            background: "linear-gradient(135deg,#25d366,#128c7e)",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          <MessageCircle size={15} strokeWidth={2} />
          Prendre rendez-vous sur WhatsApp
        </a>

        {/* Navigation carousel si plusieurs dermatologues */}
        {docs.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "12px" }}>
            <button
              onClick={() => setCurrentIdx(i => (i - 1 + docs.length) % docs.length)}
              style={{ background: "rgba(167,139,250,0.12)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "#a78bfa", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >‹</button>
            {docs.map((_, i) => (
              <span
                key={i}
                onClick={() => setCurrentIdx(i)}
                style={{ width: 6, height: 6, borderRadius: "50%", background: i === currentIdx ? "#a78bfa" : "rgba(167,139,250,0.3)", cursor: "pointer", display: "inline-block" }}
              />
            ))}
            <button
              onClick={() => setCurrentIdx(i => (i + 1) % docs.length)}
              style={{ background: "rgba(167,139,250,0.12)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "#a78bfa", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >›</button>
          </div>
        )}
      </div>

      {/* CSS animation dot */}
      <style>{`
        @keyframes glowscan-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MessageCircle, AlertTriangle, Eye, Droplets, ShieldAlert,
  Scan as ScanIcon, Truck, Camera,
  Sun, Moon, Calendar, MapPin, Leaf, CheckCircle2,
} from "lucide-react";
import type { AnalysisResult, ProtocolStep } from "@shared/schema";
import { ShareCard } from "./ShareCard";
import FaceZonesMap from "./FaceZonesMap";
import { RoutineShareCard } from "./RoutineShareCard";
import OrderModal, { type OrderItem } from "./OrderModal";
import { catalog, getProductBrand, formatPrice } from "@shared/catalog";
import { productImages as centralProductImages } from "@/lib/productImages";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

const productImages = centralProductImages;

// ─── Priorité marques locales ────────────────────────────────────────
const LOCAL_WHATSAPP = new Set([
  "+237658651775", // Andrea Skincare
  "+237655728663", // Ebony Hair
]);

// ─── Image du produit — priorité: productImages.ts > catalog.image > null ──
function getProductImage(product: typeof catalog[0]): string | undefined {
  return productImages[product.id] || (product as any).image || undefined;
}

// ─── Placeholder visuel quand pas d'image ────────────────────────────
function ProductImagePlaceholder({ area }: { area: "visage" | "corps" | "cheveux" }) {
  const emoji = area === "cheveux" ? "💆" : area === "corps" ? "🧴" : "✨";
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "4px",
      background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(233,30,140,0.06))",
    }}>
      <span style={{ fontSize: "28px" }}>{emoji}</span>
      <span style={{ fontSize: "7px", fontWeight: 800, letterSpacing: "0.1em", color: "rgba(167,139,250,0.5)" }}>
        GlowScan
      </span>
    </div>
  );
}

// ─── Meilleur produit unique adapté au diagnostic ────────────────────
function findBestSingleProduct(
  condition: string,
  skinType: string | undefined,
  area: "visage" | "corps" | "cheveux"
): typeof catalog[0] | null {
  const searchText = `${condition} ${skinType || ""}`.toLowerCase();

  const pool = catalog.filter(p => {
    if (p.id.startsWith("kit-")) return false;
    if (area === "cheveux") return p.category === "cheveux";
    if (area === "corps") return p.category === "corps";
    return p.category === "visage";
  });

  const scored = pool.map(p => {
    let score = 0;

    // Score par mots-clés des targets
    for (const t of p.targets) {
      if (searchText.includes(t.toLowerCase())) score += 3;
    }

    // Score par mots du nom/description du produit qui matchent le diagnostic
    const blob = `${p.name} ${p.description}`.toLowerCase();
    const diagWords = searchText.split(/\s+/).filter(w => w.length > 3);
    for (const w of diagWords) {
      if (blob.includes(w)) score += 1;
    }

    // BOOST ×3 pour marques locales partenaires (Andrea Skincare, Ebony Hair)
    if (p.whatsapp && LOCAL_WHATSAPP.has(p.whatsapp)) score *= 3;

    // Bonus si le produit a une image (évite les placeholders)
    if (getProductImage(p)) score += 2;

    return { product: p, score };
  });

  // Trier par score décroissant
  scored.sort((a, b) => b.score - a.score);

  // Retourner le meilleur — s'il a un score > 0, sinon premier du pool local
  if (scored[0]?.score > 0) return scored[0].product;

  // Fallback : premier produit local avec un numéro WhatsApp
  const localFallback = pool.find(p => p.whatsapp && LOCAL_WHATSAPP.has(p.whatsapp));
  return localFallback || pool[0] || null;
}

// ─── Preuve sociale (déterministe) pour produits locaux ─────────────
const SOCIAL_PROOF: Record<string, number> = {
  "creme-visage": 31, "serum-jeunesse": 27, "gel-contour-yeux": 19,
  "potion-lumiere": 23, "solution-douceur": 17, "cocon-lumineux": 22,
  "tresor-cacao": 18, "gel-douche-eclat": 29, "gommage-eclat": 14,
  "savon-corps": 33, "serum-mains-pieds": 16, "huile-eclat": 21,
  "shampooing-chebe": 24, "huile-chebe": 20, "creme-chebe": 15,
  "serum-hairbloom": 13,
};

const SOCIAL_CITIES = ["Douala", "Yaoundé", "Bafoussam", "Limbé", "Kribi", "Abidjan", "Dakar"];

function getSocialProof(productId: string): { count: number; city: string } {
  const base = SOCIAL_PROOF[productId] ?? (() => {
    let h = 0;
    for (let i = 0; i < productId.length; i++) h = ((h << 5) - h + productId.charCodeAt(i)) | 0;
    return 8 + (Math.abs(h) % 20);
  })();
  let cityIdx = 0;
  for (let i = 0; i < productId.length; i++) cityIdx += productId.charCodeAt(i);
  return { count: base, city: SOCIAL_CITIES[cityIdx % SOCIAL_CITIES.length] };
}

// ─── Hook émotionnel par catégorie de condition ──────────────────────
function getConditionHook(condition: string, area: "visage" | "corps" | "cheveux"): { accroche: string; urgence: string; emoji: string } {
  const c = (condition || "").toLowerCase();

  if (area === "cheveux") {
    if (/sécheresse|sec|déshydrat/.test(c)) return {
      emoji: "🌿",
      accroche: "Ton analyse a révélé une sécheresse capillaire avancée.",
      urgence: "Tes cheveux perdent leur éclat et leur élasticité. Sans soin adapté, la casse et la fragilité s'aggravent.",
    };
    if (/chute|perte|fragilité/.test(c)) return {
      emoji: "💪",
      accroche: "Ton analyse a détecté une fragilité pilaire qui favorise la chute.",
      urgence: "Tes racines ont besoin de nutrients ciblés pour arrêter la casse et relancer la pousse.",
    };
    return {
      emoji: "✨",
      accroche: "Ton analyse capillaire est prête.",
      urgence: "Découvre la routine personnalisée qui correspond à tes cheveux.",
    };
  }

  if (/tache|hyperpigment|mélasma|pih|dyschromie/.test(c)) return {
    emoji: "🌟",
    accroche: "Ton analyse a révélé des taches d'hyperpigmentation actives.",
    urgence: "Les taches sur peau noire s'aggravent au soleil sans protection ciblée. Chaque jour sans traitement = 2 jours de retard.",
  };
  if (/acné|acne|bouton|comédon|imperfection/.test(c)) return {
    emoji: "🔴",
    accroche: "Ton analyse a détecté une acné inflammatoire à traiter en urgence.",
    urgence: "L'acné non traitée laisse des marques durables sur les peaux melanisées. Le bon protocole arrête les lésions en 3 semaines.",
  };
  if (/déshydrat|sèche|tiraillement/.test(c)) return {
    emoji: "💧",
    accroche: "Ton analyse a révélé une peau déshydratée et une barrière fragilisée.",
    urgence: "Une peau déshydratée produit plus de sébum en réaction — c'est un cercle vicieux. Brise-le avec les bons actifs.",
  };
  if (/ride|anti-âge|vieilliss/.test(c)) return {
    emoji: "⏳",
    accroche: "Ton analyse a identifié des premiers signes de relâchement cutané.",
    urgence: "La peau africaine vieillit différemment — mieux, mais elle a ses propres besoins. Agis maintenant.",
  };
  if (/sensib|réactiv|rougeur/.test(c)) return {
    emoji: "🌸",
    accroche: "Ton analyse a révélé une peau réactive avec une barrière cutanée fragilisée.",
    urgence: "Une peau sensible mal soignée s'enflamme facilement. Les bons actifs doux changent tout.",
  };
  return {
    emoji: "✨",
    accroche: `Ton analyse a révélé : ${condition}.`,
    urgence: "Ta peau a un profil unique. Voici la routine calibrée pour toi.",
  };
}

// ─── Helpers numériques pour les tuiles ─────────────────────────────
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function deriveAgeCutane(result: AnalysisResult): number {
  const score = result.score || 50;
  const scars = result.balance?.scars || 0;
  return clamp(Math.round(22 + (100 - score) * 0.25 + scars * 1.2), 18, 65);
}

function deriveIndiceAcne(result: AnalysisResult): { value: number; label: string } {
  const inflam = result.balance?.inflammation || 0;
  const value = clamp(inflam * 10, 0, 100);
  const label = value >= 60 ? "Élevé" : value >= 35 ? "Modéré" : value >= 15 ? "Léger" : "Faible";
  return { value, label };
}

function deriveHydratation(result: AnalysisResult): { value: number; label: string } {
  const sebum = result.balance?.sebum || 5;
  const score = result.score || 50;
  const value = clamp(Math.round(70 - sebum * 4 + (score - 50) * 0.3), 15, 95);
  const label = value >= 75 ? "optimal" : value >= 55 ? "moyen" : "faible";
  return { value, label };
}

function deriveRides(result: AnalysisResult): { value: number; label: string } {
  const scars = result.balance?.scars || 0;
  const age = deriveAgeCutane(result);
  const value = clamp(Math.round(100 - scars * 6 - Math.max(0, age - 28) * 1.2), 25, 99);
  const label = value >= 80 ? "Faible" : value >= 55 ? "Modéré" : "Marqué";
  return { value, label };
}

function derivePoresLabel(result: AnalysisResult): string {
  const pores = result.balance?.pores || 0;
  if (pores >= 7) return "Très dilatés";
  if (pores >= 5) return "Dilatés";
  if (pores >= 3) return "Modérés";
  return "Fins";
}

function deriveMarquesLabel(result: AnalysisResult): string {
  const scars = result.balance?.scars || 0;
  if (scars >= 7) return "Marquées";
  if (scars >= 4) return "Visibles";
  if (scars >= 2) return "Discrètes";
  return "Aucune";
}

function deriveLesionsLabel(result: AnalysisResult): string {
  const inflam = result.balance?.inflammation || 0;
  if (inflam >= 7) return "Lésions inflammatoires marquées";
  if (inflam >= 4) return "Quelques lésions actives";
  if (inflam >= 2) return "Imperfections mineures";
  return "Aucune lésion notable";
}

function deriveZonesLabel(result: AnalysisResult): string {
  const statsZones = (result as any).stats?.zones;
  if (typeof statsZones === "string" && statsZones.trim() && statsZones.trim() !== "—" && statsZones.trim() !== "Non détecté") {
    return statsZones.trim();
  }
  const zones = (result.zones || []).filter((z: any) => z.status === "red" || z.status === "yellow");
  if (zones.length === 0) return "Toutes saines";
  const names = zones.slice(0, 2).map((z: any) => z.name);
  return names.join(" · ");
}

// ─── Bénéfice lisible (sans nom commercial) ─────────────────────────
function getBenefitLabel(
  role: "nettoyant" | "serum" | "creme",
  condition: string,
  area: "visage" | "corps" | "cheveux"
): string {
  const c = condition.toLowerCase();
  if (area === "cheveux") {
    if (role === "nettoyant") return "Shampooing Purifiant Cuir Chevelu";
    if (role === "serum") return "Huile Fortifiante Capillaire";
    return "Masque Nutrition Intensive";
  }
  if (role === "nettoyant") {
    if (/acn[eé]|bouton|comédon/.test(c)) return "Gel Nettoyant Anti-Acné";
    if (/tache|hyperpigment|pih/.test(c)) return "Nettoyant Éclat Unifiant";
    if (/sèche|déshydrat/.test(c)) return "Lait Nettoyant Doux Hydratant";
    return "Nettoyant Sébo-Régulateur";
  }
  if (role === "serum") {
    if (/tache|hyperpigment|pih|mélasma/.test(c)) return "Sérum Anti-Taches Intensif";
    if (/acn[eé]|bouton/.test(c)) return "Sérum Anti-Imperfections";
    if (/sèche|déshydrat/.test(c)) return "Sérum Hydratation Profonde";
    if (/ride|anti-âge/.test(c)) return "Sérum Anti-Âge Repulpant";
    return "Sérum Éclat Ciblé";
  }
  // creme
  if (/tache|hyperpigment/.test(c)) return "Crème Unifiante SPF";
  if (/acn[eé]|bouton/.test(c)) return "Fluide Matifiant Non-Comédogène";
  if (/sèche|déshydrat/.test(c)) return "Crème Barrière Nourrissante";
  if (/ride|anti-âge/.test(c)) return "Crème Fermeté Anti-Âge";
  return "Crème Hydratante Protectrice";
}

// ─── Copywriting par diagnostic + zone ──────────────────────────────
function getDiagnosisCopy(condition: string, zone: string): string {
  const c = condition.toLowerCase();
  const z = zone || "tes zones sensibles";
  if (/tache|hyperpigment|pih|mélasma/.test(c))
    return `Sélectionné pour effacer tes taches sur ${z}`;
  if (/acn[eé]|bouton|comédon/.test(c))
    return `Formulé pour calmer ton acné sur ${z} sans laisser de traces`;
  if (/sèche|déshydrat|tiraillement/.test(c))
    return `Hydratation intensive conçue pour ta peau africaine`;
  if (/cuir chevelu|cheveu|capillaire/.test(c))
    return `Traitement ciblé pour ton cuir chevelu — résultats en 3 semaines`;
  if (/ride|anti-âge|vieilliss/.test(c))
    return `Conçu pour lisser et repulper ${z}`;
  return `Sélectionné pour ${z} par notre IA GlowScan`;
}

// ─── Zones affectées en texte lisible ───────────────────────────────
function getAffectedZoneLabel(zones: any[]): string {
  if (!zones || zones.length === 0) return "ton visage";
  const affected = zones.filter((z: any) => z.status === "red" || z.status === "yellow");
  if (affected.length === 0) return "ton visage";
  return affected.slice(0, 2).map((z: any) => z.name?.toLowerCase()).filter(Boolean).join(" et ") || "ton visage";
}

// ─── Carte Ordonnance produit ────────────────────────────────────────
function ProductRecommendationCard({
  photo,
  benefit,
  zone,
  diagnosis,
  price,
  onOrder,
  delay = 0,
}: {
  photo?: string;
  benefit: string;
  zone: string;
  diagnosis: string;
  price: number;
  onOrder: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      style={{
        borderRadius: "20px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        background: "#1a0a2e",
        border: "1px solid #7c3aed",
        boxShadow: "0 0 16px rgba(124,58,237,0.15)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "-20px", right: "-20px",
        width: "100px", height: "100px", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)",
      }} />

      {/* Photo + Info */}
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>

        {/* Photo carré 80×80 avec watermark */}
        <div style={{
          width: "80px", height: "80px", borderRadius: "14px",
          flexShrink: 0, overflow: "hidden", position: "relative",
          border: "1px solid rgba(124,58,237,0.45)",
        }}>
          {photo
            ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ProductImagePlaceholder area={zone as any} />
          }
          {/* Watermark GlowScan */}
          {photo && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center", pointerEvents: "none",
            }}>
              <span style={{
                fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.15)", transform: "rotate(-30deg)",
                userSelect: "none",
              }}>
                GlowScan
              </span>
            </div>
          )}
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1.3, marginBottom: "6px" }}>
            ✨ {benefit}
          </p>
          <p style={{ fontSize: "11px", fontWeight: 500, fontStyle: "italic", lineHeight: 1.55, color: DS.violetLight, marginBottom: "8px" }}>
            "{diagnosis}"
          </p>
          {/* Badge validé */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "3px 8px", borderRadius: "6px",
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
          }}>
            <span style={{ fontSize: "8px", fontWeight: 700, color: "#6ee7b7", letterSpacing: "0.04em" }}>
              ✓ Validé pour peaux africaines
            </span>
          </div>
        </div>
      </div>

      {/* Prix + CTA */}
      <div>
        <p style={{ fontSize: "20px", fontWeight: 800, color: DS.textPrimary, marginBottom: "10px" }}>
          {formatPrice(price)}
        </p>

        {/* Bouton pulsant */}
        <motion.button
          onClick={onOrder}
          animate={{ boxShadow: [
            "0 0 10px #E91E8C30",
            "0 0 22px #E91E8C60",
            "0 0 10px #E91E8C30",
          ]}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "100%", padding: "14px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
            color: "#fff", fontSize: "13px", fontWeight: 800,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px",
          }}
        >
          <MessageCircle style={{ width: "14px", height: "14px", fill: "currentColor" }} />
          Commander maintenant →
        </motion.button>

        <p style={{ fontSize: "10px", textAlign: "center", marginTop: "8px", color: DS.textMuted }}>
          🚚 Livraison à Douala · Cash à la livraison
        </p>
      </div>
    </motion.div>
  );
}

// ─── Normalise les étapes de protocole ──────────────────────────────
function normalizeStep(s: any, i: number): ProtocolStep {
  if (s && typeof s === "object") {
    return {
      step: typeof s.step === "string" ? s.step : `Étape ${i + 1}`,
      product: typeof s.product === "string" ? s.product : undefined,
      why: typeof s.why === "string" ? s.why : undefined,
    };
  }
  return { step: `Étape ${i + 1}`, product: typeof s === "string" ? s : String(s) };
}

// ─── DS tokens (inline) ─────────────────────────────────────────────
const DS = {
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  bg: "#0d0a0e",
  surface: "#13101f",
  element: "#0e0b1a",
  textPrimary: "#f3f0ff",
  textBody: "rgba(200,185,255,0.65)",
  textMuted: "rgba(255,255,255,0.35)",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  pink: "#E91E8C",
  subtleCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "24px",
  } as React.CSSProperties,
  violetCard: {
    background: "rgba(167,139,250,0.06)",
    border: "1px solid rgba(167,139,250,0.18)",
    borderRadius: "24px",
  } as React.CSSProperties,
};

// ─── Composants UI ──────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || "modérée";
  let bg = "rgba(233,30,140,0.08)";
  let border = "rgba(233,30,140,0.2)";
  let color = "#f9a8d4";
  if (s.includes("lég")) { bg = "rgba(16,185,129,0.1)"; border = "rgba(16,185,129,0.25)"; color = "#6ee7b7"; }
  else if (s.includes("sév")) { bg = "rgba(233,30,140,0.12)"; border = "rgba(233,30,140,0.3)"; color = "#f9a8d4"; }
  return (
    <span
      data-testid="badge-severity"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "8px",
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      <AlertTriangle style={{ width: "12px", height: "12px" }} /> {severity}
    </span>
  );
}

function GlowGauge({ score, observationsVisuelles }: { score: number; observationsVisuelles?: string }) {
  const safeScore = clamp(score || 0, 0, 100);
  const radius = 90;
  const cx = 120;
  const cy = 110;
  const filled = (safeScore / 100) * (Math.PI * radius);
  const remaining = (Math.PI * radius) - filled;

  return (
    <div style={{ width: "100%", maxWidth: "280px", margin: "0 auto", textAlign: "center" }} data-testid="glow-gauge">
      <div style={{ position: "relative" }}>
        <svg viewBox="0 0 240 140" style={{ width: "100%" }}>
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="rgba(167,139,250,0.1)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled},${remaining}`}
          />
          <text x={cx} y={cy - radius - 6} textAnchor="middle" fill="rgba(200,185,255,0.35)" fontSize="10" fontWeight="bold">50</text>
          <text x={cx - radius} y={cy + 22} textAnchor="middle" fill="rgba(200,185,255,0.35)" fontSize="10" fontWeight="bold">0</text>
          <text x={cx + radius} y={cy + 22} textAnchor="middle" fill="rgba(200,185,255,0.35)" fontSize="10" fontWeight="bold">100</text>
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "16px",
            pointerEvents: "none",
          }}
        >
          <p style={{ fontSize: "48px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1 }}>{safeScore}</p>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", marginTop: "4px", color: DS.textMuted }}>Glow Score</p>
        </div>
      </div>
      {observationsVisuelles && (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "12px",
            padding: "12px",
            textAlign: "left",
            background: "rgba(167,139,250,0.06)",
            border: "1px solid rgba(167,139,250,0.18)",
          }}
        >
          <p style={{ fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", letterSpacing: "0.08em", marginBottom: "4px", color: DS.violetLight }}>
            <Sparkles style={{ width: "14px", height: "14px" }} /> Observations cliniques
          </p>
          <p style={{ fontSize: "12px", fontWeight: 500, fontStyle: "italic", lineHeight: 1.5, color: DS.textBody }}>"{observationsVisuelles}"</p>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon, label, value, suffix, sub, color, explicationContextuelle
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  sub?: string;
  color: "amber" | "rose" | "blue" | "emerald";
  explicationContextuelle?: string;
}) {
  const accentMap: Record<string, string> = {
    amber: "rgba(245,158,11,0.25)",
    rose: "rgba(233,30,140,0.2)",
    blue: "rgba(167,139,250,0.25)",
    emerald: "rgba(16,185,129,0.25)",
  };
  const bgMap: Record<string, string> = {
    amber: "rgba(245,158,11,0.1)",
    rose: "rgba(233,30,140,0.08)",
    blue: "rgba(167,139,250,0.08)",
    emerald: "rgba(16,185,129,0.1)",
  };
  const colorMap: Record<string, string> = {
    amber: "#fbbf24",
    rose: "#f9a8d4",
    blue: DS.violetLight,
    emerald: "#6ee7b7",
  };
  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        background: bgMap[color],
        border: `1px solid ${accentMap[color]}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: DS.textMuted }}>{label}</p>
          <p style={{ fontSize: "18px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1.2 }}>
            {value}
            {suffix && <span style={{ fontSize: "12px", fontWeight: 700, marginLeft: "2px" }}>{suffix}</span>}
            {sub && <span style={{ fontSize: "11px", fontWeight: 600, marginLeft: "6px", color: colorMap[color] }}>{sub}</span>}
          </p>
        </div>
      </div>
      {explicationContextuelle && (
        <div style={{ fontSize: "11px", fontWeight: 500, paddingTop: "6px", lineHeight: 1.4, color: DS.textBody, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {explicationContextuelle}
        </div>
      )}
    </div>
  );
}

function GridTile({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        ...DS.subtleCard,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
        {icon}
        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: DS.textMuted }}>{label}</p>
      </div>
      <p style={{ fontSize: "13px", fontWeight: 700, color: DS.textPrimary, lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}

function RadarChart({ balance }: { balance: AnalysisResult["balance"] }) {
  const labels = [
    { key: "inflammation", label: "Inflammation" },
    { key: "sebum", label: "Sébum" },
    { key: "pores", label: "Pores" },
    { key: "scars", label: "Cicatrices" },
    { key: "sensitivity", label: "Sensibilité" },
  ];
  const cx = 120, cy = 120, r = 80;
  const n = labels.length;
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const radius = (value / 10) * r;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = labels.map((l, i) => getPoint(i, balance[l.key as keyof typeof balance] || 0));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  return (
    <svg viewBox="0 0 240 240" style={{ width: "100%", maxWidth: "260px", margin: "0 auto", display: "block" }} data-testid="radar-balance">
      {gridLevels.map((level) => (
        <polygon key={level} points={labels.map((_, i) => `${getPoint(i, level * 10).x},${getPoint(i, level * 10).y}`).join(" ")} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="0.5" />
      ))}
      {labels.map((_, i) => <line key={i} x1={cx} y1={cy} x2={getPoint(i, 10).x} y2={getPoint(i, 10).y} stroke="rgba(167,139,250,0.12)" strokeWidth="0.5" />)}
      <path d={dataPath} fill="rgba(124,58,237,0.18)" stroke="#7c3aed" strokeWidth="2" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#a78bfa" stroke="rgba(13,10,14,0.8)" strokeWidth="2" />)}
      {labels.map((l, i) => (
        <text key={i} x={getPoint(i, 12.5).x} y={getPoint(i, 12.5).y} textAnchor="middle" dominantBaseline="middle" fill="rgba(200,185,255,0.45)" fontSize="8" fontWeight="bold">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

function ProtocolRow({ index, step }: { index: number; step: ProtocolStep }) {
  return (
    <li style={{ display: "flex", gap: "10px" }}>
      <span
        style={{
          flexShrink: 0,
          width: "24px",
          height: "24px",
          borderRadius: "9999px",
          color: DS.textPrimary,
          fontSize: "11px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "2px",
          background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
        }}
      >
        {index}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: DS.textPrimary, lineHeight: 1.3 }}>{step.step}</p>
        {step.product && (
          <p style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4, color: DS.violetLight }}>{step.product}</p>
        )}
        {step.why && (
          <p style={{ fontSize: "12px", fontStyle: "italic", lineHeight: 1.4, marginTop: "2px", color: DS.textMuted }}>{step.why}</p>
        )}
      </div>
    </li>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────
interface PatientIntakeProp {
  fullName?: string;
  phone?: string;
  age?: string;
  duration?: string;
  previousProducts?: string;
  allergies?: string;
}

interface ResultCardProps {
  result: AnalysisResult;
  scanId?: number | null;
  savedScanId?: number | null;
  area?: string;
  imageUrl?: string | null;
  userFirstName?: string | null;
  patientIntake?: PatientIntakeProp | null;
  isPro?: boolean;
}

export function ResultCard({ result, scanId, savedScanId, area, imageUrl, userFirstName, patientIntake, isPro = false }: ResultCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRoutineCard, setShowRoutineCard] = useState(false);
  const [j7ReminderSet, setJ7ReminderSet] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalItems, setOrderModalItems] = useState<OrderItem[]>([]);
  const [orderModalTitle, setOrderModalTitle] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const ageCutane = deriveAgeCutane(result);
  const indiceAcne = deriveIndiceAcne(result);
  const hydratation = deriveHydratation(result);
  const rides = deriveRides(result);
  const protocolMorning = (result as any).protocol?.morning || [];
  const protocolEvening = (result as any).protocol?.evening || [];
  const weekly = (result as any).protocol?.weekly || undefined;
  const expertCitation = (result as any).consultationData?.recommendation || "Votre peau exprime un besoin urgent de régulation. Suivre rigoureusement le protocole de soins locaux sélectionné est la première étape essentielle pour retrouver l'équilibre.";

  if (result.condition === "Image non exploitable") {
    return (
      <div style={{ maxWidth: "512px", margin: "0 auto", padding: "0 16px" }} data-testid="result-unanalyzable">
        <div
          style={{
            borderRadius: "24px",
            padding: "24px",
            textAlign: "center",
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 16px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <Camera style={{ width: "28px", height: "28px", color: "#fbbf24" }} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: DS.textPrimary, marginBottom: "8px" }}>Photo non analysable</h2>
          <p style={{ fontSize: "14px", lineHeight: 1.6, marginBottom: "20px", color: DS.textBody }}>
            {result.details || "Cette photo ne montre pas une peau humaine analysable. Reprends une photo nette en pleine lumière, sans filtre, à 20-30 cm."}
          </p>
          <button
            onClick={() => window.location.reload()}
            data-testid="button-rescan"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "9999px",
              background: "#7c3aed",
              color: DS.textPrimary,
              fontSize: "14px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            Reprendre une photo
          </button>
        </div>
      </div>
    );
  }

  const detectArea = (): "visage" | "corps" | "cheveux" => {
    if (area === "hair") return "cheveux";
    if (area === "body") return "corps";
    if (area === "face") return "visage";
    const text = ((result.condition || "") + " " + (result.details || "")).toLowerCase();
    if (text.includes("cheveu") || text.includes("capillaire") || text.includes("cuir chevelu")) return "cheveux";
    if (text.includes("corps") || text.includes("vergeture") || text.includes("coude") || text.includes("genou")) return "corps";
    return "visage";
  };
  const currentArea = detectArea();
  const conditionHook = getConditionHook(result.condition, currentArea as "visage" | "corps" | "cheveux");

  // ── Meilleur produit (hissé au niveau composant pour le partager avec le PDF) ──
  const _bestProduct = findBestSingleProduct(result.condition, result.skinType, currentArea as "visage" | "corps" | "cheveux");
  const _bestRoleKey = _bestProduct ? (() => {
    const n = _bestProduct.name.toLowerCase();
    if (/savon|soap|gel|shampoo|shampoing|nettoyant|purif|gommage|mousse/.test(n)) return "nettoyant" as const;
    if (/sérum|serum|huile|lotion|tonic|tonique|potion|bha|spray|essence/.test(n)) return "serum" as const;
    return "creme" as const;
  })() : "creme" as const;
  const _benefit = getBenefitLabel(_bestRoleKey, result.condition, currentArea as "visage" | "corps" | "cheveux");

  // ── Numéro de rapport unique (stable pour cette session) ──
  const reportNumber = `GS-${new Date().getFullYear()}-${Math.abs(
    result.condition.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  ).toString(36).slice(0, 5).toUpperCase()}`;

  // ── Ingrédients toxiques — enrichis par antécédents et allergies ─────────
  const getToxicIngredients = () => {
    const c = (result.condition + " " + (result.skinType || "")).toLowerCase();
    const allergyText = (patientIntake?.allergies || "").toLowerCase();
    const prevProducts = (patientIntake?.previousProducts || "").toLowerCase();

    const base = [
      { name: "Alcool dénat. (Alcohol Denat.)", why: "Détruit le film hydrolipidique, fragilise la barrière cutanée", level: "Élevé" },
      { name: "Sodium Lauryl Sulfate (SLS)", why: "Détergent ultra-agressif — décape la peau et aggrave les rougeurs", level: "Élevé" },
      {
        name: "Fragrance / Parfum synthétique",
        why: /parfum|fragrance|fragances/.test(allergyText)
          ? "⚠ ALLERGIE DÉCLARÉE — Risque de réaction cutanée sévère sur votre peau"
          : "Principale cause d'allergie cutanée et d'irritations chroniques",
        level: /parfum|fragrance/.test(allergyText) ? "CRITIQUE" : "Moyen",
      },
      { name: "Parabènes (Methylparaben, Propylparaben)", why: "Perturbateurs endocriniens suspectés — pénètrent dans la peau", level: "Moyen" },
    ];

    const specific: { name: string; why: string; level: string }[] = [];

    // Basé sur les antécédents produits utilisés
    if (/éclaircissant|éclaircissante|blanchissant|dépigment|dépigmentant|white|lightening/.test(prevProducts)) {
      specific.push(
        { name: "Mercure (Mercury / Hg)", why: "Détecté dans certaines crèmes éclaircissantes que vous avez utilisées — TOXIQUE, neurotoxique, interdit au Cameroun", level: "CRITIQUE" },
        { name: "Hydroquinone >2%", why: "Présent dans les crèmes éclaircissantes — rebond pigmentaire sévère sur peaux noires à l'arrêt", level: "CRITIQUE" },
      );
    }
    if (/cortisone|corticoïde|betamethasone|clobetasol/.test(prevProducts)) {
      specific.push(
        { name: "Corticoïdes topiques (Betamethasone, Clobetasol)", why: "Produits détectés dans vos antécédents — amincissement cutané irréversible, rebond à l'arrêt", level: "CRITIQUE" },
      );
    }

    // Basé sur les allergies déclarées
    if (/lanoline|lanolin/.test(allergyText)) {
      specific.push({ name: "Lanoline (Lanolin)", why: "ALLERGIE DÉCLARÉE — Présente dans de nombreuses crèmes hydratantes", level: "CRITIQUE" });
    }
    if (/nickel/.test(allergyText)) {
      specific.push({ name: "Sulfate de nickel", why: "ALLERGIE DÉCLARÉE — Peut être présent dans certains actifs cosmétiques", level: "CRITIQUE" });
    }
    if (/propylene|propylène/.test(allergyText)) {
      specific.push({ name: "Propylene Glycol", why: "ALLERGIE DÉCLARÉE — Solvant très répandu dans les crèmes et lotions", level: "CRITIQUE" });
    }

    // Basé sur le diagnostic
    if (/tache|hyperpigment|pih|mélasma/.test(c)) {
      if (!specific.some(s => s.name.includes("Mercure")))
        specific.push({ name: "Mercure (Mercury / Hg)", why: "Présent dans certaines crèmes africaines — TOXIQUE, neurotoxique, interdit", level: "CRITIQUE" });
      if (!specific.some(s => s.name.includes("Hydroquinone")))
        specific.push({ name: "Hydroquinone >2%", why: "Rebond pigmentaire sur peaux noires, risque d'ochronose (taches bleu-grisâtre permanentes)", level: "Élevé" });
      if (!specific.some(s => s.name.includes("Corticoïdes")))
        specific.push({ name: "Corticoïdes sans prescription", why: "Amincissement cutané, rebond immédiat des taches à l'arrêt", level: "Élevé" });
      specific.push({ name: "Huile minérale (Mineral Oil)", why: "Obstrue les pores, emprisonne les pigments oxydés et ralentit le renouvellement cellulaire", level: "Moyen" });
    }
    if (/acn[eé]|bouton|comédon|imperfection/.test(c)) {
      specific.push(
        { name: "Huile de coco (visage)", why: "Score comédogène 4/5 — bouche les pores et aggrave directement l'acné", level: "Élevé" },
        { name: "Beurre de cacao (visage)", why: "Très comédogène sur le visage — réservé strictement au corps", level: "Élevé" },
        { name: "Dimethicone / Silicones", why: "Créent un film occlusif qui emprisonne sébum et bactéries sous la peau", level: "Moyen" },
        { name: "Isopropyl Myristate", why: "Pénétrant comédogène — présent dans de nombreuses crèmes bon marché", level: "Moyen" },
      );
    }
    if (/sèche|déshydrat|tiraillement/.test(c)) {
      specific.push(
        { name: "Alcool isopropylique / éthylique", why: "Assèche intensément — totalement contre-productif sur peau déjà déshydratée", level: "Élevé" },
        { name: "Menthol / Camphre", why: "Sensation fraîche trompeuse — irritants cutanés qui aggravent la sécheresse", level: "Moyen" },
      );
    }
    if (/sensib|réactiv|rougeur/.test(c)) {
      specific.push(
        { name: "Rétinol (sans prescription)", why: "Trop puissant pour peaux réactives — provoque inflammations et desquamations", level: "Élevé" },
        { name: "AHA/BHA en concentration élevée", why: "Exfoliants chimiques agressifs — sur-irritent les peaux déjà réactives", level: "Moyen" },
      );
    }

    // Dédupliquer par nom
    const seen = new Set<string>();
    const all = [...specific, ...base].filter(t => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });
    return all;
  };

  // ── Conseils d'hygiène enrichis par antécédents ────────────────────────────
  const getHygieneAdvice = () => {
    const c = (result.condition + " " + (result.skinType || "")).toLowerCase();
    const prevProducts = (patientIntake?.previousProducts || "").toLowerCase();
    const allergies = (patientIntake?.allergies || "").toLowerCase();

    const base = [
      "🚿 Nettoyer le visage matin et soir avec de l'eau tiède (jamais chaude — dilate les pores)",
      "☀️ Protection solaire SPF 50+ tous les matins — indispensable sous le soleil équatorial",
      "💧 Boire minimum 1,5L d'eau par jour — l'hydratation interne se reflète sur la peau",
      "🛏️ Changer la taie d'oreiller toutes les 2 à 3 nuits — source majeure de bactéries",
      "🙌 Ne jamais toucher ou percer les boutons — cicatrices et taches durables sur peaux noires",
    ];
    const specific: string[] = [];

    // Avertissements basés sur les antécédents
    if (/éclaircissant|éclaircissante|blanchissant/.test(prevProducts)) {
      specific.push("🚨 ARRÊT IMMÉDIAT des crèmes éclaircissantes actuelles — elles contiennent probablement du mercure ou de l'hydroquinone qui aggravent votre condition");
    }
    if (/cortisone|corticoïde/.test(prevProducts)) {
      specific.push("⚠️ Sevrage progressif des corticoïdes — un arrêt brutal provoque un rebond violent, consultez un dermatologue pour un plan de sevrage");
    }

    // Avertissements basés sur les allergies
    if (allergies && allergies !== "aucune" && allergies.trim()) {
      specific.push(`⚠️ Allergie déclarée (${patientIntake?.allergies}) — vérifiez systématiquement la liste INCI de chaque produit avant application`);
    }

    if (/tache|hyperpigment/.test(c)) {
      specific.push(
        "🕶️ Porter un chapeau ou rester à l'ombre entre 11h et 15h — les UV aggravent activement les taches",
        "🚫 Éviter toute crème éclaircissante non certifiée — elles contiennent souvent du mercure",
        "🍊 Consommer des aliments riches en vitamine C (mangue, papaye, citron) — action anti-pigmentaire naturelle",
      );
    }
    if (/acn[eé]|bouton/.test(c)) {
      specific.push(
        "🍬 Réduire le sucre raffiné et les fritures — index glycémique élevé = plus de sébum",
        "📱 Désinfecter l'écran du téléphone quotidiennement — contact direct avec la peau du visage",
        "🧖 Masque purifiant à l'argile 1× par semaine maximum — trop souvent = irritation",
      );
    }
    if (/sèche|déshydrat/.test(c)) {
      specific.push(
        "🛁 Douche courte à l'eau tiède — l'eau chaude détruit la barrière lipidique",
        "🧴 Appliquer la crème visage sur peau encore légèrement humide — absorption optimale",
      );
    }
    return [...specific, ...base].slice(0, 7);
  };

  // ── Téléchargement PDF via print window (zéro dépendance, 100% mobile) ──
  const handleDownloadPDF = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);

    try {
      const score = Math.max(0, Math.min(100, result.score || 0));
      const zones = result.zones || [];
      const morning: any[] = (result as any).protocol?.morning || [];
      const evening: any[] = (result as any).protocol?.evening || [];
      const toxics = getToxicIngredients();
      const hygiene = getHygieneAdvice();
      const pdfBestProduct = _bestProduct;
      const pdfBenefit = _benefit;
      const pdfIsLocal = pdfBestProduct?.whatsapp ? LOCAL_WHATSAPP.has(pdfBestProduct.whatsapp) : false;
      const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

      const zoneStatusColor = (s: string) =>
        s === "red" ? "#E91E8C" : s === "yellow" ? "#f59e0b" : "#10b981";
      const zoneStatusLabel = (s: string) =>
        s === "red" ? "Attention requise" : s === "yellow" ? "À surveiller" : "Zone saine";

      const renderSteps = (steps: any[], label: string, color: string) => {
        if (!steps.length) return "";
        return `
          <div class="section" style="margin-top:18px">
            <div class="protocol-label" style="color:${color};background:${color}18;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:700;margin-bottom:10px">
              ${label}
            </div>
            ${steps.map((s: any, i: number) => {
              const step = typeof s === "object" ? s : { step: String(s) };
              return `<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start">
                <div style="min-width:22px;height:22px;border-radius:50%;background:#7c3aed;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${i+1}</div>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#1f2937">${step.step || ""}</div>
                  ${step.product ? `<div style="font-size:11px;color:#7c3aed;margin-top:2px">${step.product}</div>` : ""}
                  ${step.why ? `<div style="font-size:10px;color:#9ca3af;font-style:italic;margin-top:1px">${step.why}</div>` : ""}
                </div>
              </div>`;
            }).join("")}
          </div>`;
      };

      const levelColor = (l: string) =>
        l === "CRITIQUE" ? "#dc2626" : l === "Élevé" ? "#E91E8C" : "#f59e0b";
      const levelBg = (l: string) =>
        l === "CRITIQUE" ? "#fef2f2" : l === "Élevé" ? "#fdf2f8" : "#fffbeb";

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GlowScan — Consultation ${reportNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#fff;color:#1f2937;font-size:13px}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
    @page{margin:0;size:A4}
    .page-break{page-break-before:always}
  }

  /* ── Header ── */
  .header{background:#0d0a0e;padding:20px 28px 16px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-left{}
  .brand{font-size:24px;font-weight:900;color:#7c3aed;letter-spacing:-.5px;margin-bottom:2px}
  .report-title{font-size:15px;font-weight:700;color:#f3f0ff;margin-bottom:2px}
  .report-sub{font-size:9px;color:#a78bfa;line-height:1.5;margin-bottom:8px}
  .report-meta{font-size:9px;color:#6b7280}
  .report-meta b{color:#a78bfa}
  .stamp{border:2px solid #7c3aed;border-radius:8px;padding:8px 12px;text-align:center;min-width:100px}
  .stamp-top{font-size:8px;font-weight:700;color:#a78bfa;letter-spacing:.05em;text-transform:uppercase}
  .stamp-price{font-size:20px;font-weight:900;color:#7c3aed;line-height:1.2}
  .stamp-currency{font-size:10px;color:#7c3aed;font-weight:700}
  .stamp-label{font-size:7px;color:#6b7280;margin-top:2px}

  /* ── Body ── */
  .body{padding:18px 28px 0}

  /* ── CTA impression ── */
  .print-cta{background:linear-gradient(135deg,#7c3aed,#a78bfa);border-radius:12px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
  .print-cta-text{color:#f3f0ff;font-weight:700;font-size:14px}
  .print-cta-sub{color:rgba(255,255,255,.65);font-size:10px;margin-top:2px}
  .print-btn{background:#fff;color:#7c3aed;font-weight:800;font-size:13px;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;white-space:nowrap}

  /* ── Profil ── */
  .profile-card{background:#f8f7ff;border:1px solid #e8e3ff;border-radius:12px;padding:16px;display:flex;gap:16px;align-items:flex-start;margin-bottom:0}
  .profile-photo{width:80px;height:80px;border-radius:10px;border:2px solid #7c3aed;object-fit:cover;flex-shrink:0}
  .profile-photo-placeholder{width:80px;height:80px;border-radius:10px;border:2px solid #7c3aed;background:#f3e8ff;display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0}
  .profile-name{font-size:20px;font-weight:900;color:#0d0a0e;margin-bottom:1px}
  .profile-condition{font-size:10px;color:#6b7280;margin-bottom:8px}
  .score-row{display:flex;align-items:baseline;gap:4px;margin-bottom:4px}
  .score-val{font-size:38px;font-weight:900;color:#7c3aed;line-height:1}
  .score-lbl{font-size:11px;color:#6b7280}
  .progress-track{height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin:4px 0 6px}
  .progress-fill{height:6px;border-radius:3px;background:linear-gradient(90deg,#7c3aed,#E91E8C)}
  .badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
  .badge{font-size:8px;font-weight:700;padding:2px 7px;border-radius:4px}

  /* ── Sections ── */
  .section{margin-top:18px}
  .section-title{font-size:11px;font-weight:800;color:#7c3aed;letter-spacing:.7px;text-transform:uppercase;padding-bottom:5px;border-bottom:2px solid #e8e3ff;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .section-icon{font-size:14px}

  /* ── Zones ── */
  .zones-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .zone-card{padding:8px;border-radius:8px;border:1px solid}
  .zone-dot{width:9px;height:9px;border-radius:50%;margin-bottom:4px}
  .zone-name{font-size:9px;font-weight:700;color:#374151;margin-bottom:2px}
  .zone-level{font-size:8px;color:#6b7280}

  /* ── Evaluation ── */
  .eval-box{background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;padding:12px;font-size:10.5px;line-height:1.8;color:#374151}

  /* ── Toxiques ── */
  .toxic-table{width:100%;border-collapse:collapse;margin-top:4px}
  .toxic-table th{background:#0d0a0e;color:#f3f0ff;font-size:9px;padding:7px 10px;text-align:left;font-weight:700}
  .toxic-table td{font-size:9.5px;padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
  .toxic-table tr:nth-child(even) td{background:#fafafa}
  .toxic-name{font-weight:700;color:#1f2937;margin-bottom:2px}
  .toxic-why{color:#6b7280;font-size:9px;line-height:1.4}
  .toxic-level{display:inline-block;font-size:8px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap}

  /* ── Hygiène ── */
  .hygiene-list{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .hygiene-item{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:9px 11px;font-size:9.5px;color:#166534;line-height:1.5}

  /* ── Ordonnance ── */
  .ordonnance-header{background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(233,30,140,.04));border:1px solid rgba(124,58,237,.2);border-radius:10px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px}
  .ordonnance-icon{font-size:20px}
  .ordonnance-label{font-size:10px;font-weight:700;color:#7c3aed}
  .ordonnance-sub{font-size:9px;color:#9ca3af;margin-top:1px}
  .product-card{background:#fdf2f8;border:1.5px solid #fbcfe8;border-radius:12px;padding:14px;display:flex;gap:14px;align-items:flex-start}
  .product-img-box{width:64px;height:64px;border-radius:10px;background:#f3e8ff;border:1px solid #ddd6fe;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
  .product-badge{display:inline-block;background:#d1fae5;color:#059669;font-size:8px;font-weight:700;padding:2px 7px;border-radius:4px;margin-bottom:5px}
  .product-name{font-size:15px;font-weight:800;color:#0d0a0e;margin-bottom:3px}
  .product-price{font-size:20px;font-weight:900;color:#E91E8C;margin-bottom:5px}
  .product-usage{font-size:9px;color:#6b7280;line-height:1.6}
  .product-wa{display:inline-flex;align-items:center;gap:5px;background:#25D366;color:#fff;font-size:9px;font-weight:700;padding:5px 12px;border-radius:6px;margin-top:8px;text-decoration:none}

  /* ── Protocole ── */
  .protocol-block{margin-bottom:14px}
  .protocol-label{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;padding:7px 10px;border-radius:6px;margin-bottom:8px}
  .protocol-steps{display:flex;flex-direction:column;gap:6px}
  .step-row{display:flex;gap:10px;align-items:flex-start}
  .step-num{min-width:22px;height:22px;border-radius:50%;background:#7c3aed;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
  .step-content{flex:1}
  .step-name{font-size:11px;font-weight:700;color:#1f2937;line-height:1.4}
  .step-product{font-size:10px;color:#7c3aed;margin-top:1px}
  .step-why{font-size:9px;color:#9ca3af;font-style:italic;margin-top:1px}

  /* ── Validité ── */
  .validity-box{margin-top:16px;background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px}
  .validity-icon{font-size:18px}
  .validity-text{font-size:9.5px;color:#92400e;line-height:1.5}

  /* ── Footer ── */
  .footer{background:#0d0a0e;padding:14px 28px;display:flex;align-items:center;gap:14px;margin-top:20px}
  .footer-text{flex:1}
  .footer-disclaimer{font-size:8px;color:#a78bfa;line-height:1.5;margin-bottom:3px}
  .footer-url{font-size:10px;font-weight:800;color:#7c3aed}
  .footer-brand{font-size:14px;font-weight:900;color:#7c3aed;white-space:nowrap;text-align:right}
  .footer-ref{font-size:8px;color:#4b5563;text-align:right;margin-top:2px}
</style>
</head>
<body>

<!-- ══ HEADER ══ -->
<div class="header">
  <div class="header-left">
    <div class="brand">✦ GlowScan</div>
    <div class="report-title">Rapport de Consultation Cutanée</div>
    <div class="report-sub">Pré-analyse dermatologique par IA — Spécialisé Peaux Africaines<br>Ce document est votre ordonnance personnalisée GlowScan.</div>
    <div class="report-meta">Date : <b>${date}</b> &nbsp;|&nbsp; Réf. : <b>${reportNumber}</b> &nbsp;|&nbsp; Validité : <b>3 mois</b></div>
  </div>
  <div class="stamp">
    <div class="stamp-top">Consultation</div>
    <div class="stamp-price">5 000</div>
    <div class="stamp-currency">FCFA</div>
    <div class="stamp-label">Analyse Premium</div>
  </div>
</div>

<div class="body">

<!-- CTA impression -->
<div class="print-cta no-print">
  <div>
    <div class="print-cta-text">📄 Votre rapport est prêt</div>
    <div class="print-cta-sub">Appuie sur le bouton → Enregistrer en PDF dans le menu d'impression</div>
  </div>
  <button class="print-btn" onclick="window.print()">⬇ Télécharger en PDF</button>
</div>

<!-- ══ 0. INFOS PATIENT ══ -->
${(patientIntake?.fullName || patientIntake?.phone || patientIntake?.age) ? `
<div class="section" style="margin-top:12px">
  <div class="section-title"><span class="section-icon">📋</span> Informations Patient</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8f7ff;border:1px solid #e8e3ff;border-radius:10px;padding:12px">
    ${patientIntake?.fullName ? `<div><span style="font-size:9px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Nom</span><br><span style="font-size:12px;font-weight:700;color:#0d0a0e">${patientIntake.fullName}</span></div>` : ""}
    ${patientIntake?.phone ? `<div><span style="font-size:9px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Téléphone</span><br><span style="font-size:12px;font-weight:700;color:#0d0a0e">${patientIntake.phone}</span></div>` : ""}
    ${patientIntake?.age ? `<div><span style="font-size:9px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Âge</span><br><span style="font-size:12px;font-weight:700;color:#0d0a0e">${patientIntake.age}</span></div>` : ""}
    ${patientIntake?.duration ? `<div><span style="font-size:9px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Problème depuis</span><br><span style="font-size:12px;font-weight:700;color:#0d0a0e">${patientIntake.duration}</span></div>` : ""}
    ${patientIntake?.previousProducts ? `<div style="grid-column:1/-1"><span style="font-size:9px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Produits déjà utilisés</span><br><span style="font-size:11px;color:#374151">${patientIntake.previousProducts}</span></div>` : ""}
    ${patientIntake?.allergies ? `<div style="grid-column:1/-1"><span style="font-size:9px;color:#E91E8C;font-weight:700;text-transform:uppercase;letter-spacing:.05em">⚠ Allergies connues</span><br><span style="font-size:11px;color:#374151">${patientIntake.allergies}</span></div>` : ""}
  </div>
</div>
` : ""}

<!-- ══ CARTE D'IDENTITÉ PATIENT ══ -->
<div style="margin:16px 20px 0;border-radius:14px;overflow:hidden;border:2px solid #7c3aed">
  <div style="background:#0d0a0e;padding:8px 14px;display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:16px;font-weight:900;color:#7c3aed">✦ GlowScan</span>
      <span style="font-size:8px;font-weight:700;color:#a78bfa;background:rgba(124,58,237,.2);padding:2px 7px;border-radius:3px">Carte Analyse</span>
    </div>
    <span style="font-size:8px;color:#6b7280">Réf. ${reportNumber}</span>
  </div>
  <div style="background:#f8f7ff;padding:14px;display:flex;gap:14px;align-items:center">
    ${imageUrl ? `
    <div style="position:relative;width:72px;height:72px;border-radius:10px;border:2px solid #7c3aed;overflow:hidden;flex-shrink:0">
      <img src="${imageUrl}" alt="Photo" style="width:100%;height:100%;object-fit:cover" />
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
        <span style="font-size:7px;font-weight:800;color:rgba(255,255,255,0.15);transform:rotate(-30deg)">GlowScan</span>
      </div>
    </div>` : `
    <div style="width:72px;height:72px;border-radius:10px;border:2px solid #7c3aed;background:#f3e8ff;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0">👤</div>`}
    <div style="flex:1">
      <div style="font-size:18px;font-weight:900;color:#0d0a0e;margin-bottom:4px">${userFirstName || "Patient GlowScan"}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">
        ${patientIntake?.age ? `<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(124,58,237,.1);color:#7c3aed">${patientIntake.age}</span>` : ""}
        ${patientIntake?.duration ? `<span style="font-size:8px;padding:2px 6px;border-radius:4px;background:#f3f4f6;color:#6b7280">Depuis : ${patientIntake.duration}</span>` : ""}
        ${patientIntake?.allergies && patientIntake.allergies.toLowerCase() !== "aucune" ? `<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(233,30,140,.08);color:#E91E8C">⚠ Allergie : ${patientIntake.allergies}</span>` : ""}
      </div>
      <div style="padding:5px 8px;border-radius:7px;background:rgba(233,30,140,.07);border:1px solid rgba(233,30,140,.18);margin-bottom:4px">
        <div style="font-size:7px;font-weight:700;color:rgba(233,30,140,.7);text-transform:uppercase;letter-spacing:.06em;margin-bottom:1px">Diagnostic clinique</div>
        <div style="font-size:12px;font-weight:800;color:#0d0a0e">${result.condition}</div>
        <div style="font-size:8px;color:#6b7280;margin-top:1px">${result.severity || ""} · ${(result.skinType || "").split("(")[0].trim()}</div>
      </div>
      ${patientIntake?.previousProducts && patientIntake.previousProducts.toLowerCase() !== "aucun" ? `<div style="font-size:9px;color:#9ca3af">Produits utilisés : ${patientIntake.previousProducts.slice(0,70)}${patientIntake.previousProducts.length>70?"…":""}</div>` : ""}
    </div>
    <div style="text-align:center;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.3);border-radius:10px;padding:8px 10px;flex-shrink:0">
      <div style="font-size:28px;font-weight:900;color:#7c3aed;line-height:1">${score}</div>
      <div style="font-size:8px;color:#6b7280">/100</div>
      <div style="font-size:7px;color:#a78bfa;font-weight:700;margin-top:2px">GLOW</div>
    </div>
  </div>
</div>

<!-- ══ 1. PROFIL CUTANÉ ══ -->
<div class="section">
  <div class="section-title"><span class="section-icon">🧬</span> Compréhension Approfondie de Votre Peau</div>
  <div class="profile-card">
    ${imageUrl
      ? `<img src="${imageUrl}" class="profile-photo" alt="Photo analyse" />`
      : `<div class="profile-photo-placeholder">👤</div>`}
    <div style="flex:1">
      <div class="profile-name">${userFirstName || "Utilisatrice GlowScan"}</div>
      <div class="profile-condition">${result.condition}</div>
      <div class="score-row">
        <span class="score-val">${score}</span>
        <span class="score-lbl">/100 &nbsp;Glow Score</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${score}%"></div></div>
      <div class="badges">
        <span class="badge" style="background:#ede9fe;color:#7c3aed">Peau : ${result.skinType || "—"}</span>
        <span class="badge" style="background:#fce7f3;color:#9d174d">Sévérité : ${result.severity || "Modérée"}</span>
        <span class="badge" style="background:#ecfdf5;color:#065f46">Peaux africaines ✓</span>
      </div>
    </div>
  </div>
</div>

<!-- ══ 2. DIAGNOSTIC ZONE PAR ZONE ══ -->
${zones.length > 0 ? `
<div class="section">
  <div class="section-title"><span class="section-icon">📍</span> Diagnostic Zone par Zone</div>
  <div class="zones-grid">
    ${zones.slice(0, 8).map((z: any) => `
      <div class="zone-card" style="border-color:${z.status === "red" ? "#fecdd3" : z.status === "yellow" ? "#fef3c7" : "#d1fae5"};background:${z.status === "red" ? "#fff1f2" : z.status === "yellow" ? "#fffbeb" : "#f0fdf4"}">
        <div class="zone-dot" style="background:${z.status === "red" ? "#E91E8C" : z.status === "yellow" ? "#f59e0b" : "#10b981"}"></div>
        <div class="zone-name">${z.name || ""}</div>
        <div class="zone-level">${z.status === "red" ? "⚠ Attention" : z.status === "yellow" ? "◐ À surveiller" : "✓ Saine"}</div>
        ${z.note ? `<div class="zone-level" style="font-style:italic;margin-top:2px">${z.note.slice(0,38)}</div>` : ""}
      </div>
    `).join("")}
  </div>
</div>
` : ""}

<!-- ══ 3. COMPRÉHENSION APPROFONDIE ══ -->
${result.details ? `
<div class="section">
  <div class="section-title"><span class="section-icon">🔬</span> Compréhension Approfondie de Votre Peau</div>
  <div class="eval-box">${result.details}</div>
</div>
` : ""}

<!-- ══ 4. INGRÉDIENTS TOXIQUES À BANNIR ══ -->
<div class="section">
  <div class="section-title"><span class="section-icon">🚫</span> Ingrédients Toxiques à Bannir Absolument</div>
  <table class="toxic-table">
    <thead>
      <tr>
        <th style="width:30%">Ingrédient</th>
        <th style="width:12%">Niveau de risque</th>
        <th>Pourquoi l'éviter</th>
      </tr>
    </thead>
    <tbody>
      ${toxics.map(t => `
        <tr>
          <td>
            <div class="toxic-name">${t.name}</div>
          </td>
          <td>
            <span class="toxic-level" style="background:${levelBg(t.level)};color:${levelColor(t.level)}">${t.level}</span>
          </td>
          <td>
            <div class="toxic-why">${t.why}</div>
          </td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <p style="font-size:8.5px;color:#9ca3af;margin-top:8px;font-style:italic">
    ⚠ Vérifiez la liste INCI (ingrédients) de vos produits actuels. Ces substances sont présentes dans de nombreuses crèmes vendues en Afrique sans contrôle.
  </p>
</div>

<!-- ══ 5. CONSEILS D'HYGIÈNE ══ -->
<div class="section">
  <div class="section-title"><span class="section-icon">💡</span> Conseils d'Hygiène Personnalisés</div>
  <div class="hygiene-list">
    ${hygiene.map(h => `<div class="hygiene-item">${h}</div>`).join("")}
  </div>
</div>

<!-- ══ 6. ORDONNANCE PERSONNALISÉE ══ -->
${_bestProduct ? `
<div class="section">
  <div class="section-title"><span class="section-icon">📋</span> Ordonnance Personnalisée</div>
  <div class="ordonnance-header">
    <div class="ordonnance-icon">🏥</div>
    <div>
      <div class="ordonnance-label">Soin prescrit par GlowScan IA — adapté à votre peau</div>
      <div class="ordonnance-sub">Sélectionné parmi les marques locales de confiance · Résultats visibles en 3–4 semaines</div>
    </div>
  </div>
  <div class="product-card">
    <div class="product-img-box">✦</div>
    <div style="flex:1">
      <div class="product-badge">✓ Validé pour peaux africaines</div>
      <div class="product-name">${_benefit}</div>
      <div class="product-price">${_bestProduct.price?.toLocaleString("fr-FR")} FCFA</div>
      <div class="product-usage">${(_bestProduct.usagePoints || []).slice(0, 3).map((p: string) => `• ${p}`).join("<br>")}</div>
      <a class="product-wa" href="https://wa.me/237674377959">
        📱 Commander via WhatsApp
      </a>
    </div>
  </div>
</div>
` : ""}

<!-- ══ 7. PROTOCOLE MATIN / SOIR ══ -->
${morning.length > 0 || evening.length > 0 ? `
<div class="section page-break">
  <div class="section-title"><span class="section-icon">🌿</span> Protocole d'Application Personnalisé</div>

  ${morning.length > 0 ? `
  <div class="protocol-block">
    <div class="protocol-label" style="background:#fffbeb;color:#92400e">☀ Rituel du Matin — Protection &amp; Régulation</div>
    <div class="protocol-steps">
      ${morning.map((s: any, i: number) => {
        const step = typeof s === "object" ? s : { step: String(s) };
        return `<div class="step-row">
          <div class="step-num">${i+1}</div>
          <div class="step-content">
            <div class="step-name">${step.step || ""}</div>
            ${step.product ? `<div class="step-product">${step.product}</div>` : ""}
            ${step.why ? `<div class="step-why">${step.why}</div>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>
  ` : ""}

  ${evening.length > 0 ? `
  <div class="protocol-block">
    <div class="protocol-label" style="background:#ede9fe;color:#5b21b6">🌙 Rituel du Soir — Réparation Intense</div>
    <div class="protocol-steps">
      ${evening.map((s: any, i: number) => {
        const step = typeof s === "object" ? s : { step: String(s) };
        return `<div class="step-row">
          <div class="step-num" style="background:#a78bfa">${i+1}</div>
          <div class="step-content">
            <div class="step-name">${step.step || ""}</div>
            ${step.product ? `<div class="step-product">${step.product}</div>` : ""}
            ${step.why ? `<div class="step-why">${step.why}</div>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>
  ` : ""}
</div>
` : ""}

<!-- ══ 🚫 INGRÉDIENTS TOXIQUES À BANNIR ══ -->
<div class="section">
  <div class="section-title"><span class="section-icon">🚫</span> Ingrédients Toxiques à Bannir Absolument</div>
  ${patientIntake?.allergies && patientIntake.allergies.toLowerCase() !== "aucune"
    ? `<div style="background:#fef2f2;border:1px solid #fecdd3;border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:9px;color:#b91c1c;font-weight:700">
      ⚠ Allergie déclarée : ${patientIntake.allergies} — ingrédients marqués CRITIQUE en priorité
    </div>` : ""}
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#0d0a0e">
        <th style="padding:6px 8px;text-align:left;font-size:8px;color:#f3f0ff;font-weight:700;width:32%">Ingrédient</th>
        <th style="padding:6px 8px;text-align:left;font-size:8px;color:#f3f0ff;font-weight:700;width:13%">Risque</th>
        <th style="padding:6px 8px;text-align:left;font-size:8px;color:#f3f0ff;font-weight:700">Pourquoi l'éviter</th>
      </tr>
    </thead>
    <tbody>
      ${toxics.map((t, i) => `
      <tr style="background:${i%2===0?"#fafafa":"#fff"}">
        <td style="padding:6px 8px;font-size:9px;font-weight:700;color:#1f2937;border-bottom:1px solid #f3f4f6">${t.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">
          <span style="font-size:8px;font-weight:800;padding:2px 6px;border-radius:3px;
            background:${t.level==="CRITIQUE"?"#fef2f2":t.level==="Élevé"?"#fdf2f8":"#fffbeb"};
            color:${t.level==="CRITIQUE"?"#dc2626":t.level==="Élevé"?"#E91E8C":"#f59e0b"}">
            ${t.level}
          </span>
        </td>
        <td style="padding:6px 8px;font-size:9px;color:#6b7280;line-height:1.4;border-bottom:1px solid #f3f4f6">${t.why}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <p style="font-size:8px;color:#9ca3af;margin-top:6px;font-style:italic">
    Vérifiez la liste INCI de vos produits actuels — ces substances sont présentes dans de nombreuses crèmes vendues sans contrôle en Afrique.
  </p>
</div>

<!-- ══ 💡 CONSEILS D'HYGIÈNE PERSONNALISÉS ══ -->
<div class="section">
  <div class="section-title"><span class="section-icon">💡</span> Conseils d'Hygiène Personnalisés</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
    ${hygiene.map(h => `
    <div style="padding:8px 10px;border-radius:8px;font-size:9.5px;line-height:1.5;
      background:${h.startsWith("🚨")||h.startsWith("⚠️")?"rgba(220,38,38,.06)":"rgba(16,185,129,.06)"};
      border:1px solid ${h.startsWith("🚨")||h.startsWith("⚠️")?"rgba(220,38,38,.2)":"rgba(16,185,129,.2)"};
      color:${h.startsWith("🚨")||h.startsWith("⚠️")?"#b91c1c":"#166534"}">
      ${h}
    </div>`).join("")}
  </div>
</div>

<!-- ══ 🛍️ ORDONNANCE PERSONNALISÉE — VOTRE COLIS ══ -->
${pdfBestProduct ? `
<div class="section">
  <div class="section-title"><span class="section-icon">🛍️</span> Ordonnance Personnalisée — Votre Colis GlowScan</div>
  <div style="background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(233,30,140,.03));border:1.5px solid rgba(124,58,237,.25);border-radius:12px;padding:14px">
    <div style="font-size:8px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">
      ${pdfIsLocal ? `Marque locale · ${getProductBrand(pdfBestProduct)}` : "Dermocosmétique certifié"}
    </div>
    <div style="font-size:14px;font-weight:800;color:#0d0a0e;margin-bottom:4px">${pdfBenefit}</div>
    <div style="font-size:16px;font-weight:900;color:#E91E8C;margin-bottom:8px">${pdfBestProduct.price?.toLocaleString("fr-FR")} FCFA</div>
    ${(pdfBestProduct.usagePoints||[]).slice(0,3).map((p: string) => `
    <div style="display:flex;gap:6px;margin-bottom:4px;font-size:9px;color:#374151">
      <span style="color:#7c3aed;font-weight:700">✓</span>${p}
    </div>`).join("")}
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(124,58,237,.15)">
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px">
        Ce produit a été sélectionné selon votre diagnostic, vos antécédents et votre type de peau.
        ${patientIntake?.allergies && patientIntake.allergies.toLowerCase() !== "aucune" ? `Il ne contient pas les ingrédients auxquels vous êtes allergique(e).` : ""}
      </div>
      <div style="display:inline-flex;align-items:center;gap:5px;background:#25D366;color:#fff;font-size:9px;font-weight:700;padding:5px 12px;border-radius:6px">
        📱 Commander via WhatsApp — Livraison à Douala
      </div>
    </div>
  </div>
</div>
` : ""}

<!-- Validité -->
<div class="validity-box">
  <span class="validity-icon">📅</span>
  <div class="validity-text">
    <b>Ce rapport est valable 3 mois</b> à compter du ${date}.<br>
    Après cette période, refaites une analyse pour suivre l'évolution de votre peau.<br>
    Réf. consultation : <b>${reportNumber}</b>
  </div>
</div>

</div><!-- /body -->

<!-- ══ FOOTER ══ -->
<div class="footer">
  <div class="footer-text">
    <div class="footer-disclaimer">Ce rapport est un outil de pré-analyse cutanée généré par intelligence artificielle GlowScan.</div>
    <div class="footer-disclaimer">Il ne remplace pas une consultation médicale. Consultez un dermatologue pour tout problème persistant.</div>
    <div class="footer-url">glow-scan.com</div>
  </div>
  <div>
    <div class="footer-brand">✦ GlowScan</div>
    <div class="footer-ref">${reportNumber}</div>
  </div>
</div>

</body>
</html>`;

      const win = window.open("", "_blank");
      if (!win) {
        // Si le popup est bloqué, fallback : ouvre dans le même onglet
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        win.document.write(html);
        win.document.close();
        win.focus();
      }

    } catch (err) {
      console.error("PDF generation failed:", err);
      toast({ title: "Erreur rapport", description: "Impossible de générer le rapport.", variant: "destructive" });
    } finally {
      setPdfGenerating(false);
    }
  };

  const getProductRole = (p: typeof catalog[0]): "nettoyant" | "serum" | "creme" => {
    const n = p.name.toLowerCase();
    if (
      n.includes("savon") || n.includes("soap") || n.includes("gel de douche") ||
      n.includes("gel douche") || n.includes("gommage") || n.includes("shampoo") ||
      n.includes("shampoing") || n.includes("nettoyant") || n.includes("purif")
    ) return "nettoyant";
    if (
      n.includes("sérum") || n.includes("serum") || n.includes("huile") || n.includes("oil") ||
      n.includes("lotion") || n.includes("tonic") || n.includes("tonique") || n.includes("potion") ||
      n.includes("bha") || n.includes("spray")
    ) return "serum";
    return "creme";
  };

  // Trouve le kit GlowScan Dermo le plus pertinent selon la condition détectée
  const findBestKit = (): typeof catalog[0] | null => {
    if (currentArea !== "visage") return null;
    const kits = catalog.filter(p => p.id.startsWith("kit-") && p.category === "visage");
    if (kits.length === 0) return null;
    const searchText = ((result.condition || "") + " " + (result.details || "")).toLowerCase();
    const scored = kits
      .map(k => ({ kit: k, score: k.targets.filter(t => searchText.includes(t.toLowerCase())).length }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.score > 0 ? scored[0].kit : kits[0];
  };

  const findRoutineProducts = () => {
    const consultationText = (result as any).consultationData?.observations_visuelles || "";
    const searchText = ((result.condition || "") + " " + (result.details || "") + " " + consultationText).toLowerCase();

    // Marques pharmacie réservées au mode Pro uniquement
    const INTL_PHARMA_BRANDS = new Set([
      "Bioderma", "Uriage", "La Roche-Posay", "The Ordinary",
      "CeraVe", "Nubiance", "Topicrem",
    ]);

    // Exclure les kits des recommandations 3-produits (ils ont leur propre section)
    // En mode Basic (non-Pro) : exclure les marques pharmacie internationales
    const areaProducts = catalog.filter(p => {
      if (p.id.startsWith("kit-")) return false;
      if (!isPro && p.brand && INTL_PHARMA_BRANDS.has(p.brand)) return false;
      if (currentArea === "cheveux") return p.category === "cheveux";
      if (currentArea === "corps") return p.category === "corps" || p.category === "visage";
      return p.category === "visage";
    });

    const scoreProduct = (p: typeof catalog[0]) => {
      let s = 0;
      for (const t of p.targets) if (searchText.includes(t.toLowerCase())) s += 3;
      for (const part of p.name.toLowerCase().split(/[\s–\-]+/)) {
        if (part.length > 3 && searchText.includes(part)) s += 2;
      }
      return s;
    };

    const roleLabels: Record<string, { emoji: string; label: string }> = {
      nettoyant: { emoji: "🧴", label: currentArea === "cheveux" ? "Shampooing" : "Nettoyant" },
      serum: { emoji: "💧", label: currentArea === "cheveux" ? "Huile / Sérum" : "Sérum / Traitement" },
      creme: { emoji: "🧴", label: currentArea === "cheveux" ? "Masque / Crème" : "Crème hydratante" },
    };

    const localsByBrand = new Map<string, typeof catalog>();
    for (const p of areaProducts.filter(x => x.whatsapp)) {
      const k = p.whatsapp as string;
      if (!localsByBrand.has(k)) localsByBrand.set(k, []);
      localsByBrand.get(k)!.push(p);
    }

    type Source = { products: typeof catalog; total: number; brandKey: string };
    const buildSource = (pool: typeof catalog, brandKey: string): Source | null => {
      const n = pool.filter(p => getProductRole(p) === "nettoyant").sort((a, b) => scoreProduct(b) - scoreProduct(a));
      const s = pool.filter(p => getProductRole(p) === "serum").sort((a, b) => scoreProduct(b) - scoreProduct(a));
      const c = pool.filter(p => getProductRole(p) === "creme").sort((a, b) => scoreProduct(b) - scoreProduct(a));
      const picked: typeof catalog = [];
      const tryAdd = (arr: typeof catalog) => {
        const next = arr.find(x => !picked.some(y => y.id === x.id));
        if (next) picked.push(next);
      };
      tryAdd(n); tryAdd(s); tryAdd(c);
      const rest = pool.filter(p => !picked.some(y => y.id === p.id)).sort((a, b) => scoreProduct(b) - scoreProduct(a));
      while (picked.length < 3 && rest.length) picked.push(rest.shift()!);
      if (picked.length < 3) return null;
      return { products: picked, total: picked.reduce((sum, p) => sum + scoreProduct(p), 0), brandKey };
    };

    const candidates: Source[] = [];
    for (const [waKey, brandProducts] of Array.from(localsByBrand.entries())) {
      const c = buildSource(brandProducts, waKey);
      if (c) candidates.push(c);
    }
    candidates.sort((a, b) => b.total - a.total);
    let winner: Source | null = candidates[0] || null;
    if (!winner) {
      const fallbackPool = Array.from(localsByBrand.values()).sort((a, b) => b.length - a.length)[0] || areaProducts;
      const sorted = [...fallbackPool].sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, 3);
      if (sorted.length === 0) return [];
      winner = { products: sorted, total: 0, brandKey: sorted[0].whatsapp || "" };
    }
    return winner.products.map((p, i) => {
      const roleKey = getProductRole(p);
      return {
        product: { ...p },
        role: roleLabels[roleKey] || roleLabels["creme"],
        index: i + 1,
        why: buildWhyText(p, result.condition, result.skinType, currentArea, roleKey),
      };
    });
  };

  const routineProducts = findRoutineProducts();
  const bestKit = findBestKit();

  // ── Pack cheveux Ebony Hair (seul partenaire capillaire officiel) ──────────────
  const findHairPacks = () => {
    if (currentArea !== "cheveux") return [];
    const EBONY_WA   = "+237655728663";
    const buildPack = (waKey: string, brandName: string) => {
      const pool = catalog.filter(p => p.category === "cheveux" && p.whatsapp === waKey && !p.id.startsWith("kit-"));
      if (pool.length === 0) return null;
      // Nettoyant d'abord, puis sérum/huile, puis crème/masque
      const nettoyants = pool.filter(p => getProductRole(p) === "nettoyant");
      const serums     = pool.filter(p => getProductRole(p) === "serum");
      const cremes     = pool.filter(p => getProductRole(p) === "creme");
      const picked: typeof catalog = [];
      if (nettoyants[0]) picked.push(nettoyants[0]);
      if (serums[0])     picked.push(serums[0]);
      if (cremes[0])     picked.push(cremes[0]);
      // Compléter à 3 produits si manquant
      const rest = pool.filter(p => !picked.includes(p));
      while (picked.length < 3 && rest.length) picked.push(rest.shift()!);
      if (picked.length === 0) return null;
      const total = picked.reduce((s, p) => s + (p.price || 0), 0);
      const waMsg = encodeURIComponent(
        `Bonjour GlowScan 👋\n\nJe veux commander le Pack ${brandName} :\n` +
        picked.map(p => `• ${p.name} — ${p.price?.toLocaleString("fr-FR")} FCFA`).join("\n") +
        `\n\nTotal : ${total.toLocaleString("fr-FR")} FCFA`
      );
      return { brand: brandName, products: picked, total, waKey, waMsg };
    };
    return [
      buildPack(EBONY_WA, "Ebony Hair"),
    ].filter(Boolean) as NonNullable<ReturnType<typeof buildPack>>[];
  };
  const hairPacks = findHairPacks();

  const getIntermediateOffer = () => {
    if (routineProducts.length < 2) return null;
    const duoProducts = routineProducts.slice(0, 2);
    const totalPriceDuo = duoProducts.reduce((sum, item) => sum + item.product.price, 0);
    return {
      duo: duoProducts,
      totalPrice: totalPriceDuo,
      copywriting: {
        title: "Le Compromis Idéal",
        subtitle: currentArea === "cheveux" ? "Kit Duo Croissance" : "Protocole Duo Action Ciblée",
      }
    };
  };

  const intermediateOffer = getIntermediateOffer();

  // ═══════════════════════════════════════════════════════════════════
  //  RENDU
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div
      data-testid="result-card"
      style={{
        maxWidth: "512px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        fontFamily: DS.font,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {/* ═══ BLOC 0 — Carte d'identité patient ═══ */}
        {(imageUrl || userFirstName || patientIntake?.age) && (
          <div style={{
            borderRadius: "20px", overflow: "hidden",
            border: "1px solid rgba(167,139,250,0.25)",
            background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(233,30,140,0.04))",
          }}>
            {/* Bandeau header */}
            <div style={{
              background: "#0d0a0e", padding: "10px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#7c3aed" }}>✦ GlowScan</span>
                <span style={{ fontSize: "9px", padding: "1px 7px", borderRadius: "4px", background: "rgba(124,58,237,0.2)", color: "#a78bfa", fontWeight: 700 }}>
                  Carte Analyse
                </span>
              </div>
              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            {/* Contenu carte */}
            <div style={{ padding: "14px 16px", display: "flex", gap: "14px", alignItems: "center" }}>
              {/* Photo ID */}
              <div style={{
                width: "72px", height: "72px", borderRadius: "12px", flexShrink: 0,
                border: "2px solid #7c3aed", overflow: "hidden",
                background: "rgba(124,58,237,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                {imageUrl
                  ? <img src={imageUrl} alt="Photo analyse" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "28px" }}>👤</span>
                }
                {/* Watermark */}
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center", pointerEvents: "none",
                }}>
                  <span style={{ fontSize: "7px", fontWeight: 800, color: "rgba(255,255,255,0.15)", transform: "rotate(-30deg)", userSelect: "none" }}>
                    GlowScan
                  </span>
                </div>
              </div>
              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {userFirstName && (
                  <p style={{ fontSize: "16px", fontWeight: 800, color: DS.textPrimary, marginBottom: "3px" }}>
                    {userFirstName}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                  {patientIntake?.age && (
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(124,58,237,0.1)", color: DS.violetLight }}>
                      {patientIntake.age}
                    </span>
                  )}
                  {patientIntake?.duration && (
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: DS.textMuted }}>
                      Depuis : {patientIntake.duration}
                    </span>
                  )}
                </div>
                {/* ── Diagnostic clinique — la pathologie africaine identifiée ── */}
                <div style={{
                  padding: "6px 10px", borderRadius: "8px", marginBottom: "5px",
                  background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)",
                }}>
                  <p style={{ fontSize: "8px", fontWeight: 700, color: "rgba(249,168,212,0.7)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>
                    Diagnostic clinique
                  </p>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1.3 }}>
                    {result.condition}
                  </p>
                  {result.severity && (
                    <p style={{ fontSize: "9px", color: "rgba(249,168,212,0.65)", marginTop: "2px" }}>
                      Sévérité : {result.severity} · {result.skinType?.split("(")[0].trim() || ""}
                    </p>
                  )}
                </div>
                {patientIntake?.allergies && patientIntake.allergies.toLowerCase() !== "aucune" && (
                  <span style={{ display: "inline-block", fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(233,30,140,0.1)", color: "#f9a8d4" }}>
                    ⚠ Allergie : {patientIntake.allergies}
                  </span>
                )}
                {patientIntake?.previousProducts && patientIntake.previousProducts.toLowerCase() !== "aucun" && (
                  <p style={{ fontSize: "9px", color: DS.textMuted, lineHeight: 1.4 }}>
                    Produits utilisés : {patientIntake.previousProducts.slice(0, 60)}{patientIntake.previousProducts.length > 60 ? "…" : ""}
                  </p>
                )}
              </div>
              {/* Score compact */}
              <div style={{
                textAlign: "center", padding: "8px 10px", borderRadius: "10px",
                background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
                flexShrink: 0,
              }}>
                <p style={{ fontSize: "24px", fontWeight: 900, color: "#7c3aed", lineHeight: 1 }}>{result.score}</p>
                <p style={{ fontSize: "8px", color: DS.textMuted, fontWeight: 700 }}>/100</p>
                <p style={{ fontSize: "7px", color: "#a78bfa", fontWeight: 700, marginTop: "2px" }}>GLOW</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ BLOC 1 — Diagnostic principal ═══ */}
        <div
          data-testid="block-diagnostic"
          style={{ ...DS.subtleCard, padding: "20px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: DS.textMuted }}>Diagnostic & Stratégie</p>
            <SeverityBadge severity={result.severity || "Modérée"} />
          </div>

          {/* ── Hook émotionnel personnalisé ── */}
          <div
            style={{
              borderRadius: "16px",
              padding: "14px 16px",
              marginBottom: "16px",
              background: "rgba(233,30,140,0.06)",
              border: "1px solid rgba(233,30,140,0.2)",
            }}
          >
            <p style={{ fontSize: "15px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1.35, marginBottom: "6px" }}>
              {conditionHook.emoji} {conditionHook.accroche}
            </p>
            <p style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.6, color: "rgba(249,168,212,0.85)" }}>
              {conditionHook.urgence}
            </p>
          </div>

          <h1
            data-testid="text-condition"
            style={{ fontSize: "20px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1.3, marginBottom: "20px" }}
          >
            {result.condition}
          </h1>

          <GlowGauge
            score={result.score}
            observationsVisuelles={result.consultationData?.observations_visuelles || (result as any).observationsVisuelles}
          />

          {/* Progress bar */}
          <div style={{ marginTop: "16px", height: "3px", borderRadius: "9999px", background: "rgba(167,139,250,0.1)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${clamp(result.score || 0, 0, 100)}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: "9999px" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
            <StatTile
              icon={<Sun style={{ width: "20px", height: "20px", color: "#fbbf24" }} />}
              label="Âge cutané"
              value={`${ageCutane} ans`}
              sub="estimé"
              color="amber"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.age || (result as any).facteurAge}
            />
            <StatTile
              icon={<div style={{ width: "12px", height: "12px", borderRadius: "9999px", background: "#f9a8d4" }} />}
              label="Indice acné"
              value={`${indiceAcne.value}%`}
              sub={indiceAcne.label}
              color="rose"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.inflammation || (result as any).facteurInflammation}
            />
            <StatTile
              icon={<Droplets style={{ width: "20px", height: "20px", color: DS.violetMid }} />}
              label="Hydratation"
              value={`${hydratation.value}%`}
              sub={hydratation.label}
              color="blue"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.hydratation || (result as any).facteurHydratation}
            />
            <StatTile
              icon={<Leaf style={{ width: "20px", height: "20px", color: "#6ee7b7" }} />}
              label="Rides"
              value={rides.value}
              sub={rides.label}
              color="emerald"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.rides || (result as any).facteurRides}
            />
          </div>
        </div>

        {/* ═══ BLOC 7 — 1 seul produit recommandé (masqué en mode Pro) ═══ */}
        {!isPro && (() => {
          const bestProduct = _bestProduct;
          if (!bestProduct) return null;

          const zoneLabel = getAffectedZoneLabel(result.zones || []);
          const benefit = _benefit;
          const copy = getDiagnosisCopy(result.condition, zoneLabel);
          const img = getProductImage(bestProduct);
          const social = getSocialProof(bestProduct.id);
          const isLocal = bestProduct.whatsapp ? LOCAL_WHATSAPP.has(bestProduct.whatsapp) : false;

          const waNumber = "237674377959"; // toutes les commandes → numéro unique GlowScan
          const waMsg = encodeURIComponent(
            `Bonjour GlowScan 👋\n\nMon analyse a révélé : *${result.condition}*\n\nJe veux commander :\n• ${benefit}\n  Prix : ${bestProduct.price?.toLocaleString("fr-FR")} FCFA\n\nLivraison à Douala SVP 🙏`
          );

          return (
            <div data-testid="block-conversion-tunnel" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Header ordonnance */}
              <div style={{ background: "rgba(233,30,140,0.06)", border: "1px solid rgba(233,30,140,0.2)", borderRadius: "14px", padding: "12px 14px", marginBottom: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🛍️</span>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 800, color: DS.textPrimary }}>Ton ordonnance personnalisée GlowScan</p>
                    <p style={{ fontSize: "9px", color: "rgba(249,168,212,0.8)", fontWeight: 600 }}>
                      {isLocal ? `Marque locale · ${getProductBrand(bestProduct)}` : "Dermocosmétique certifié"} · Résultats en 3–4 semaines
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: "10px", color: DS.textBody, lineHeight: 1.5 }}>
                  Ce produit a été sélectionné par l'IA en fonction de ton diagnostic, tes antécédents et ton type de peau. Si tu décides de commander, ton colis sera préparé et livré directement chez toi à Douala.
                </p>
              </div>

              <ProductRecommendationCard
                photo={img}
                benefit={benefit}
                zone={zoneLabel}
                diagnosis={copy}
                price={bestProduct.price || 0}
                delay={0}
                onOrder={() => {
                  window.open(`https://wa.me/${waNumber}?text=${waMsg}`, "_blank", "noopener,noreferrer");
                }}
              />

              <p style={{ fontSize: "10px", textAlign: "center", color: DS.textMuted }}>
                ⭐ <strong style={{ color: DS.textBody }}>{social.count} femmes de {social.city}</strong> ont commandé ce soin ce mois
              </p>

              <div style={{
                padding: "10px 14px", borderRadius: "12px",
                display: "flex", alignItems: "center", gap: "8px",
                background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)",
              }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>🔒</span>
                <p style={{ fontSize: "11px", fontWeight: 700, color: DS.violetLight }}>
                  Ce soin est réservé 24h pour toi
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 500, color: DS.textMuted, marginTop: "1px" }}>
                    Commande maintenant pour garantir la disponibilité
                  </span>
                </p>
              </div>

              <button
                onClick={() => setShowRoutineCard(true)}
                style={{
                  width: "100%", padding: "6px", fontSize: "11px", fontWeight: 700,
                  textAlign: "center", textDecoration: "underline",
                  background: "transparent", border: "none", cursor: "pointer", color: DS.textMuted,
                }}
              >
                Partager mon ordonnance
              </button>
            </div>
          );
        })()}

        {/* ═══ BLOC 2 — Grille 6 tuiles ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          <GridTile
            icon={<Droplets style={{ width: "14px", height: "14px", color: DS.violetLight }} />}
            label="Type Peau"
            value={((result as any).consultationData?.type_peau || result.skinType || "Mixte").split("(")[0].trim()}
            testId="tile-skintype"
          />
          <GridTile
            icon={<Eye style={{ width: "14px", height: "14px", color: "#f9a8d4" }} />}
            label="Lésions"
            value={deriveLesionsLabel(result).replace("inflammatoires ", "")}
            testId="tile-lesions"
          />
          <GridTile
            icon={<ScanIcon style={{ width: "14px", height: "14px", color: DS.violetMid }} />}
            label="Pores"
            value={derivePoresLabel(result)}
            testId="tile-pores"
          />
          <GridTile
            icon={<ShieldAlert style={{ width: "14px", height: "14px", color: "#fbbf24" }} />}
            label="Marques"
            value={deriveMarquesLabel(result)}
            testId="tile-marques"
          />
          <GridTile
            icon={<MapPin style={{ width: "14px", height: "14px", color: DS.violetLight }} />}
            label="Zones"
            value={deriveZonesLabel(result)}
            testId="tile-zones"
          />
          <GridTile
            icon={<Sparkles style={{ width: "14px", height: "14px", color: "#6ee7b7" }} />}
            label="Score"
            value={`${result.score}%`}
            testId="tile-score"
          />
        </div>

        {/* ═══ BLOC 3 — Radar Équilibre cutané ═══ */}
        {result.balance && (
          <div
            data-testid="block-radar"
            style={{ ...DS.subtleCard, padding: "20px" }}
          >
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", marginBottom: "12px", textAlign: "center", color: DS.violetLight }}>
              Équilibre cutané
            </p>
            <RadarChart balance={result.balance} />
          </div>
        )}

        {/* ═══ BLOC 4 — Conclusions cliniques ═══ */}
        <div
          data-testid="block-expert"
          style={{ ...DS.violetCard, padding: "20px", position: "relative", overflow: "hidden" }}
        >
          {/* Glow accent — radial-gradient div, NO box-shadow */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "120px",
              height: "120px",
              pointerEvents: "none",
              background: "radial-gradient(circle at top right, rgba(124,58,237,0.2), transparent 70%)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                }}
              >
                <Sparkles style={{ width: "16px", height: "16px", color: DS.violetMid }} />
              </div>
              <h2 style={{ fontSize: "14px", fontWeight: 800, color: DS.textPrimary }}>Conclusions du Dr. GlowScan</h2>
            </div>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "8px",
                letterSpacing: "0.08em",
                background: "rgba(167,139,250,0.15)",
                border: "1px solid rgba(167,139,250,0.3)",
                color: DS.violetLight,
              }}
            >
              Approuvé IA
            </span>
          </div>

          {result.details && (
            <div
              style={{
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "6px", color: DS.textMuted }}>
                Évaluation de la barrière cutanée :
              </p>
              <p
                data-testid="text-details"
                style={{ fontSize: "12px", lineHeight: 1.6, fontWeight: 500, color: DS.textBody }}
              >
                {result.details}
              </p>
            </div>
          )}

          <div
            style={{
              borderRadius: "16px",
              padding: "16px",
              position: "relative",
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-10px",
                left: "16px",
                fontSize: "9px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                letterSpacing: "0.06em",
                background: DS.bg,
                border: "1px solid rgba(124,58,237,0.3)",
                color: DS.violetLight,
              }}
            >
              La recommandation clé
            </div>
            <p
              data-testid="text-motivation"
              style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.6, fontStyle: "italic", marginTop: "4px", color: DS.textBody }}
            >
              "{expertCitation}"
            </p>
          </div>

          <p style={{ fontSize: "10px", textAlign: "center", fontWeight: 500, marginTop: "14px", color: "rgba(255,255,255,0.25)" }}>
            Vos données d'analyse clinique restent 100% confidentielles.
          </p>
        </div>

        {/* ═══ BLOC 5 — Cartographie des zones ═══ */}
        {result.zones && result.zones.length > 0 && (
          <div
            data-testid="block-zones-map"
            style={{ ...DS.subtleCard, padding: "20px", position: "relative", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(124,58,237,0.12)",
                    border: "1px solid rgba(124,58,237,0.25)",
                  }}
                >
                  <ScanIcon style={{ width: "16px", height: "16px", color: DS.violetMid }} />
                </div>
                <div>
                  <h2 style={{ fontSize: "12px", fontWeight: 800, color: DS.textPrimary }}>Cartographie Cutanée</h2>
                  <p style={{ fontSize: "10px", fontWeight: 500, color: DS.textMuted }}>Localisation des foyers à traiter</p>
                </div>
              </div>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "8px",
                  letterSpacing: "0.08em",
                  background: "rgba(167,139,250,0.15)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  color: DS.violetLight,
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "9999px", background: DS.violetMid, animation: "pulse 2s infinite" }} />
                Analyse IA
              </span>
            </div>

            <div
              style={{
                borderRadius: "16px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <FaceZonesMap zones={result.zones} />
            </div>

            <p style={{ fontSize: "10px", textAlign: "center", fontWeight: 500, marginTop: "12px", color: DS.textMuted }}>
              Cliquez sur les zones colorées pour isoler les imperfections détectées.
            </p>
          </div>
        )}

        {/* ═══ BLOC 6 — Protocole de soin ═══ */}
        {(protocolMorning.length > 0 || protocolEvening.length > 0 || weekly) && (
          <div
            data-testid="block-protocol"
            style={{ ...DS.subtleCard, padding: "20px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles style={{ width: "16px", height: "16px", color: DS.violetMid }} />
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: DS.textPrimary }}>Mon Ordonnance d'Application</h2>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "8px",
                  background: "rgba(167,139,250,0.15)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  color: DS.violetLight,
                }}
              >
                4 à 6 semaines
              </span>
            </div>
            <p style={{ fontSize: "11px", marginBottom: "20px", color: DS.textMuted }}>
              Suivez rigoureusement cet ordre pour maximiser la pénétration des actifs.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Matin */}
              {protocolMorning.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "16px", borderLeft: "2px solid rgba(245,158,11,0.35)" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-9px",
                      top: 0,
                      background: "#f59e0b",
                      borderRadius: "9999px",
                      padding: "2px",
                    }}
                  >
                    <Sun style={{ width: "12px", height: "12px", color: "#0d0a0e" }} />
                  </div>
                  <h3 style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24" }}>
                    Rituel du Matin
                    <span style={{ fontSize: "10px", fontWeight: 500, color: DS.textMuted }}>protection & régulation</span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {protocolMorning.map((s: any, i: number) => {
                      const stepData = normalizeStep(s, i);
                      const matchedItem = routineProducts.find(rp =>
                        stepData.product && rp.product.name.toLowerCase().includes(stepData.product.toLowerCase())
                      );
                      return (
                        <div
                          key={`m-${i}`}
                          style={{
                            borderRadius: "14px",
                            padding: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: DS.textPrimary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              background: "rgba(124,58,237,0.18)",
                              border: "1px solid rgba(124,58,237,0.3)",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: DS.textMuted }}>{stepData.step}</p>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: DS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {matchedItem ? matchedItem.product.name : (stepData.product || stepData.step)}
                            </p>
                            {stepData.why && (
                              <p style={{ fontSize: "10px", lineHeight: 1.4, marginTop: "2px", fontWeight: 500, color: DS.textMuted }}>{stepData.why}</p>
                            )}
                          </div>
                          {matchedItem && (
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                padding: "2px",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              <img
                                src={productImages[matchedItem.product.id] || "/placeholder-product.png"}
                                alt={matchedItem.product.name}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Soir */}
              {protocolEvening.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "16px", borderLeft: "2px solid rgba(124,58,237,0.35)" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-9px",
                      top: 0,
                      background: "#7c3aed",
                      borderRadius: "9999px",
                      padding: "2px",
                    }}
                  >
                    <Moon style={{ width: "12px", height: "12px", color: "#f3f0ff" }} />
                  </div>
                  <h3 style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", color: DS.violetLight }}>
                    Rituel du Soir
                    <span style={{ fontSize: "10px", fontWeight: 500, color: DS.textMuted }}>réparation intense</span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {protocolEvening.map((s: any, i: number) => {
                      const stepData = normalizeStep(s, i);
                      const matchedItem = routineProducts.find(rp =>
                        stepData.product && rp.product.name.toLowerCase().includes(stepData.product.toLowerCase())
                      );
                      return (
                        <div
                          key={`e-${i}`}
                          style={{
                            borderRadius: "14px",
                            padding: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: DS.textPrimary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              background: "rgba(124,58,237,0.18)",
                              border: "1px solid rgba(124,58,237,0.3)",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: DS.textMuted }}>{stepData.step}</p>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: DS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {matchedItem ? matchedItem.product.name : (stepData.product || stepData.step)}
                            </p>
                            {stepData.why && (
                              <p style={{ fontSize: "10px", lineHeight: 1.4, marginTop: "2px", fontWeight: 500, color: DS.textMuted }}>{stepData.why}</p>
                            )}
                          </div>
                          {matchedItem && (
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                padding: "2px",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              <img
                                src={productImages[matchedItem.product.id] || "/placeholder-product.png"}
                                alt={matchedItem.product.name}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hebdomadaire */}
              {weekly && (
                <div
                  style={{
                    borderRadius: "16px",
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "rgba(167,139,250,0.08)",
                    border: "1px solid rgba(167,139,250,0.18)",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: "rgba(167,139,250,0.12)",
                      border: "1px solid rgba(167,139,250,0.25)",
                      color: DS.violetLight,
                    }}
                  >
                    <Calendar style={{ width: "16px", height: "16px" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: DS.violetLight }}>Soin Booster Hebdomadaire</p>
                    <p style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.4, marginTop: "2px", color: DS.textPrimary }}>{weekly}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ BLOC 7bis — 🚫 Ingrédients toxiques à bannir ═══ */}
        {(() => {
          const toxics = getToxicIngredients();
          const levelColor = (l: string) => l === "CRITIQUE" ? "#dc2626" : l === "Élevé" ? "#E91E8C" : "#f59e0b";
          const levelBg = (l: string) => l === "CRITIQUE" ? "rgba(220,38,38,0.08)" : l === "Élevé" ? "rgba(233,30,140,0.08)" : "rgba(245,158,11,0.08)";
          const levelBorder = (l: string) => l === "CRITIQUE" ? "rgba(220,38,38,0.25)" : l === "Élevé" ? "rgba(233,30,140,0.2)" : "rgba(245,158,11,0.2)";
          return (
            <div data-testid="block-toxics" style={{ ...DS.subtleCard, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <span style={{ fontSize: "14px" }}>🚫</span>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 800, color: DS.textPrimary }}>Ingrédients à bannir absolument</p>
                  <p style={{ fontSize: "10px", color: DS.textMuted }}>
                    {patientIntake?.allergies && patientIntake.allergies.toLowerCase() !== "aucune"
                      ? `Adaptés à votre profil · Allergie déclarée : ${patientIntake.allergies}`
                      : "Adaptés à votre diagnostic cutané"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {toxics.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", borderRadius: "10px", background: levelBg(t.level), border: `1px solid ${levelBorder(t.level)}` }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: levelBg(t.level), color: levelColor(t.level), border: `1px solid ${levelBorder(t.level)}`, whiteSpace: "nowrap", flexShrink: 0, marginTop: "1px" }}>
                      {t.level}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: DS.textPrimary, marginBottom: "1px" }}>{t.name}</p>
                      <p style={{ fontSize: "10px", color: DS.textBody, lineHeight: 1.4 }}>{t.why}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "9px", color: DS.textMuted, marginTop: "10px", fontStyle: "italic" }}>
                Vérifie la liste INCI (ingrédients) de tes produits actuels — ces substances sont présentes dans de nombreuses crèmes vendues sans contrôle en Afrique.
              </p>
            </div>
          );
        })()}

        {/* ═══ BLOC 7ter — 💡 Conseils d'hygiène personnalisés ═══ */}
        {(() => {
          const hygiene = getHygieneAdvice();
          return (
            <div data-testid="block-hygiene" style={{ ...DS.subtleCard, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <span style={{ fontSize: "14px" }}>💡</span>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 800, color: DS.textPrimary }}>Conseils d'hygiène personnalisés</p>
                  <p style={{ fontSize: "10px", color: DS.textMuted }}>Adaptés à votre mode de vie et votre condition</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                {hygiene.map((h, i) => (
                  <div key={i} style={{
                    padding: "8px 12px", borderRadius: "10px", fontSize: "11px", color: "#166534", lineHeight: 1.55,
                    background: h.startsWith("🚨") || h.startsWith("⚠️") ? "rgba(220,38,38,0.07)" : "rgba(16,185,129,0.07)",
                    border: `1px solid ${h.startsWith("🚨") || h.startsWith("⚠️") ? "rgba(220,38,38,0.2)" : "rgba(16,185,129,0.2)"}`,
                    color: h.startsWith("🚨") || h.startsWith("⚠️") ? "#b91c1c" : "#166534",
                  }}>
                    {h}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══ BLOC 7b — Pack cheveux Ebony Hair ═══ */}
        {currentArea === "cheveux" && hairPacks.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: DS.textMuted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>
              🌿 Choisis ton pack capillaire
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {hairPacks.map(pack => (
                <div key={pack.brand} style={{ borderRadius: "20px", padding: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Header */}
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 800, color: DS.textPrimary, lineHeight: 1.2 }}>{pack.brand}</p>
                    <p style={{ fontSize: "10px", color: DS.textMuted, marginTop: "2px" }}>Pack Routine Complète</p>
                  </div>
                  {/* Produits */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {pack.products.map(p => {
                      const img = (productImages as any)[p.id] || p.image;
                      return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {img ? (
                            <img src={img} alt={p.name} style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(124,58,237,0.15)", flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "10px", fontWeight: 700, color: DS.textPrimary, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                            <p style={{ fontSize: "9px", color: DS.textMuted }}>{p.price?.toLocaleString("fr-FR")} FCFA</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Total + CTA */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "10px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 800, color: DS.violetMid, marginBottom: "8px" }}>
                      Total : {pack.total.toLocaleString("fr-FR")} FCFA
                    </p>
                    <a
                      href={`https://wa.me/237674377959?text=${pack.waMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "9px 0",
                        textAlign: "center",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: 800,
                        textDecoration: "none",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Commander →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bouton export PDF (grand public uniquement) ── */}
        {!isPro && <button
          onClick={handleDownloadPDF}
          disabled={pdfGenerating}
          data-testid="button-download-pdf"
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            cursor: pdfGenerating ? "not-allowed" : "pointer",
            opacity: pdfGenerating ? 0.7 : 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            background: DS.violet,
            transition: "opacity 0.15s, transform 0.1s",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            {pdfGenerating ? (
              <>
                <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Génération en cours...
              </>
            ) : (
              <>
                <span>📄</span>
                Télécharger mon rapport
              </>
            )}
          </span>
          {!pdfGenerating && (
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              Partageable avec votre dermatologue
            </span>
          )}
        </button>}

        {/* Footer avertissement */}
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10px",
            fontWeight: 500,
            borderRadius: "12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            color: DS.textMuted,
          }}
        >
          <AlertTriangle style={{ width: "14px", height: "14px", flexShrink: 0, color: DS.textMuted }} />
          <span>Analyse indicative générée par GlowScan AI.</span>
        </div>
      </motion.div>

      {/* Bloc dermatologue partenaire */}
      <DermatologistSection
        score={result.score || 0}
        condition={result.condition || ""}
      />

      {/* Disclaimer médical */}
      <div
        data-testid="disclaimer-medical"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "12px 16px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: "16px", flexShrink: 0 }}>⚕️</span>
        <p style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1.6, textAlign: "center", color: DS.textMuted }}>
          Notre diagnostic ne remplace pas un dermatologue. Consultez un professionnel de santé pour tout problème persistant.
        </p>
      </div>

      {/* Modals */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        items={orderModalItems}
        title={orderModalTitle}
        scanContext={{ skinType: result.skinType, condition: result.condition, score: result.score }}
      />
      {user && showShareCard && (
        <ShareCard
          score={result.score}
          condition={result.condition}
          area={area || "face"}
          userName={user?.firstName || user?.lastName || undefined}
          onClose={() => setShowShareCard(false)}
        />
      )}
      {user && showRoutineCard && routineProducts.length > 0 && (
        <RoutineShareCard
          score={result.score}
          condition={result.condition}
          area={area || "face"}
          userName={user?.firstName || user?.lastName || undefined}
          products={routineProducts.map(({ product, role, index }) => ({
            name: product.name,
            price: product.price,
            whatsapp: product.whatsapp,
            role,
            index,
          }))}
          onClose={() => setShowRoutineCard(false)}
        />
      )}
    </div>
  );
}
