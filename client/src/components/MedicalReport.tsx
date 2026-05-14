import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, AlertTriangle, ShoppingBag, ArrowUp, ArrowDown, ScanLine, Sparkles, ArrowRight } from "lucide-react";
import type { AnalysisResult, ZoneAnalysisItem, ProtocolStep } from "@shared/schema";
import FaceZonesMap from "./FaceZonesMap";
import { catalog, getProductBrand, formatPrice, BRAND_MAP } from "@shared/catalog";
import { productImages } from "@/lib/productImages";
import OrderModal, { type OrderItem } from "./OrderModal";

interface Props {
  result: AnalysisResult;
  scanId?: number | null;
  area?: string;
  imageUrl?: string | null;
  userFirstName?: string | null;
  /** Score du scan précédent (pour afficher la flèche +N / -N sur la carte d'identité) */
  previousScore?: number | null;
}

// Étiquette FR courte pour un statut de zone — pour les sous-lignes de la carte d'identité
function zoneStatusShort(s: ZoneAnalysisItem["status"] | "red" | "yellow" | "green"): string {
  if (s === "red") return "à traiter";
  if (s === "yellow") return "à surveiller";
  return "saine";
}

// === Helpers ===

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface DiagProblem { icon: string; label: string; key: string; }

function deriveProblems(result: AnalysisResult): DiagProblem[] {
  const b = result.balance || { inflammation: 0, sebum: 0, pores: 0, sensitivity: 0, scars: 0 };
  const out: DiagProblem[] = [];
  if ((b.inflammation || 0) >= 4) out.push({ icon: "🔴", label: "acné", key: "acne" });
  if ((b.sebum || 0) >= 6) out.push({ icon: "🛢️", label: "excès de sébum", key: "sebum" });
  if ((b.scars || 0) >= 3) out.push({ icon: "🟤", label: "taches", key: "taches" });
  if ((b.pores || 0) >= 5) out.push({ icon: "🕳️", label: "pores dilatés", key: "pores" });
  if ((b.sensitivity || 0) >= 5) out.push({ icon: "🌡️", label: "peau sensible", key: "sensibilite" });
  // Heuristique hydratation : sébum bas + score < 75 = peau probablement déshydratée
  if (((b.sebum || 0) <= 4 && (result.score || 100) < 75) || /deshydrat|sech|xerose/.test(normalize(result.condition || ""))) {
    out.push({ icon: "💧", label: "déshydratation", key: "hydratation" });
  }
  return out;
}

function getMatchReasons(product: any, problems: DiagProblem[]): string[] {
  const targets = normalize((product.targets || []).join(" "));
  const matched: string[] = [];
  for (const p of problems) {
    if (p.key === "acne" && /acn|imperfection|sebum|bouton|points? noirs|comedon/.test(targets)) matched.push("acné");
    else if (p.key === "sebum" && /sebum|gras|matifian|purif/.test(targets)) matched.push("excès de sébum");
    else if (p.key === "hydratation" && /hydrat|deshydrat|hyaluron|barriere|seche|nutri/.test(targets)) matched.push("hydratation");
    else if (p.key === "taches" && /tache|hyperpigment|eclat|brillance|vitamin c|fade|kojic|glycol|teint irregulier/.test(targets)) matched.push("taches");
    else if (p.key === "pores" && /pore/.test(targets)) matched.push("pores dilatés");
    else if (p.key === "sensibilite" && /sensible|sensibilit|apaisant|rougeur|reactif/.test(targets)) matched.push("sensibilité");
  }
  return Array.from(new Set(matched)).slice(0, 2);
}

// Étiquettes courtes par problème — utilisées dans la sous-ligne "Acné • Zone T"
function shortReasonLabels(product: any, problems: DiagProblem[]): string[] {
  const reasons = getMatchReasons(product, problems);
  const map: Record<string, string> = {
    "acné": "Acné",
    "excès de sébum": "Sébum",
    "hydratation": "Hydratation",
    "taches": "Taches",
    "pores dilatés": "Pores",
    "sensibilité": "Sensibilité",
  };
  return reasons.map((r) => map[r] || r).slice(0, 2);
}

// Copywriting court pour le produit intermédiaire (2000–4000 FCFA), adapté au problème principal
function supplementCopy(problems: DiagProblem[]): string {
  if (problems.length === 0) return "Petit geste en plus — entretien quotidien à intégrer dans ta routine.";
  const k = problems[0].key;
  if (k === "acne") return "Booster anti-imperfections à petit prix — pour cibler tes boutons au quotidien.";
  if (k === "sebum") return "Touche matifiante express — pour absorber l'excès de sébum sans agresser ta peau.";
  if (k === "hydratation") return "Coup d'hydratation malin — à intégrer matin et soir pour repulper ta peau.";
  if (k === "taches") return "Anti-taches express — à appliquer en local sur les marques foncées.";
  if (k === "pores") return "Resserre tes pores entre deux soins — petit prix, gros effet visible.";
  if (k === "sensibilite") return "Apaisant ultra-doux — soulage les rougeurs et calme l'inconfort cutané.";
  return "Petit geste en plus — pour entretenir les résultats de ta routine.";
}

interface RoutineSelection {
  main: any[];           // 3 produits cohérents (tous internationaux OU tous une seule marque locale)
  supplement: any | null; // 4e produit intermédiaire 2000–4000 FCFA, même source
  sourceLabel: string;    // ex. "international" ou "Andrea Skincare"
}

// ═══════════════════════════════════════════════════════════════════════
//   BUNDLES — 4 paliers calibrés Cameroun (résultat-promis, pas produit-vendu)
//   Le bundle affiché est UNIQUE et choisi par sévérité du diagnostic.
//   • Découverte  (1 prod)        : prix d'appel, déclic première commande
//   • Essentiel   (2 prods)       : minimum viable, vraie conversion
//   • Complète    (3 prods)       : routine experte, montée en gamme
//   • Premium     (3 prods + rescan offert) : sévérité élevée, suivi inclus
// ═══════════════════════════════════════════════════════════════════════

export type BundleTier = "decouverte" | "essentiel" | "complete" | "premium";

export interface BundlePromise {
  tier: BundleTier;
  emoji: string;
  name: string;
  tagline: string;          // promesse résultat (vendre le résultat, pas le produit)
  bonus?: string;           // bonus inclus (ex. rescan offert)
  ctaLabel: string;         // texte du bouton de commande
  badge?: string;           // ex. "⭐ Le plus choisi"
}

function pickBundleTier(score: number): BundleTier {
  // Le score est plafonné à 70 côté serveur, donc 70 = peau saine, < 35 = sévère
  if (score >= 60) return "decouverte";
  if (score >= 45) return "essentiel";
  if (score >= 30) return "complete";
  return "premium";
}

function bundleMeta(tier: BundleTier, problems: DiagProblem[]): BundlePromise {
  const mainProblem = problems[0]?.key;
  // Promesse résultat ciblée par problème dominant
  const promiseByProblem: Record<string, Record<string, string>> = {
    decouverte: {
      acne: "Premiers résultats anti-imperfections en 14 jours",
      taches: "Premiers signes d'éclat en 14 jours",
      hydratation: "Peau confortable et nourrie en 7 jours",
      sebum: "Brillance maîtrisée dès la 1ʳᵉ semaine",
      default: "Teste l'effet sur ta peau en 14 jours",
    },
    essentiel: {
      acne: "Moins de boutons, peau visiblement plus nette en 3 semaines",
      taches: "Teint plus uniforme, taches estompées en 4 semaines",
      hydratation: "Peau repulpée et lumineuse en 3 semaines",
      sebum: "Pores resserrés, peau matifiée en 3 semaines",
      default: "Routine minimum efficace — résultats visibles en 3 semaines",
    },
    complete: {
      acne: "Peau transformée — fini les imperfections en 4-6 semaines",
      taches: "Teint unifié et lumineux en 4-6 semaines",
      hydratation: "Hydratation profonde et durable en 4 semaines",
      default: "Routine experte complète — peau transformée en 4-6 semaines",
    },
    premium: {
      default: "Résultats premium + suivi personnalisé pour mesurer ta progression",
    },
  };
  const tagline =
    promiseByProblem[tier]?.[mainProblem || "default"] ||
    promiseByProblem[tier]?.default ||
    "Routine adaptée à ton diagnostic";

  const meta: Record<BundleTier, Omit<BundlePromise, "tier" | "tagline">> = {
    decouverte: {
      emoji: "🌱",
      name: "Bundle Découverte",
      ctaLabel: "Tester ce produit",
    },
    essentiel: {
      emoji: "⭐",
      name: "Bundle Essentiel",
      badge: "Le plus choisi",
      ctaLabel: "Commander mon bundle",
    },
    complete: {
      emoji: "💎",
      name: "Bundle Routine Complète",
      ctaLabel: "Commander ma routine",
    },
    premium: {
      emoji: "👑",
      name: "Bundle Premium",
      bonus: "🎁 Rescan offert à J+14 (valeur 2 000 FCFA)",
      ctaLabel: "Commander Premium",
    },
  };

  return { tier, tagline, ...meta[tier] };
}

export interface ChosenBundle extends BundlePromise {
  products: any[];
  total: number;
  sourceLabel: string;
}

function pickBundle(result: AnalysisResult, area: string, routine: RoutineSelection, problems: DiagProblem[]): ChosenBundle {
  const tier = pickBundleTier(result.score || 55);
  const counts: Record<BundleTier, number> = { decouverte: 1, essentiel: 2, complete: 3, premium: 3 };
  const wanted = counts[tier];

  // 1) On part des produits déjà sélectionnés par findRoutineProducts (même source, ranking pertinence)
  let products = routine.main.slice(0, wanted);

  // 2) Fallback (b) : si pas assez, complète avec un produit local générique de la bonne catégorie
  if (products.length < wanted) {
    const cat = area === "hair" ? "cheveux" : area === "body" ? "corps" : "visage";
    // Marques locales = celles qui ont un whatsapp mappé dans BRAND_MAP
    const localGeneric = catalog.filter(
      (p) =>
        p.whatsapp &&
        p.category === cat &&
        !products.some((x) => x.id === p.id)
    );
    while (products.length < wanted && localGeneric.length) {
      products.push(localGeneric.shift()!);
    }
  }

  const total = products.reduce((s, p) => s + (typeof p.price === "number" ? p.price : 0), 0);
  const meta = bundleMeta(tier, problems);
  return { ...meta, products, total, sourceLabel: routine.sourceLabel };
}

function findRoutineProducts(result: AnalysisResult, area: string): RoutineSelection {
  const cat = area === "hair" ? "cheveux" : area === "body" ? "corps" : "visage";
  const problems = deriveProblems(result);
  const areaProducts = catalog.filter((p) => p.category === cat);
  const score = (p: any) => getMatchReasons(p, problems).length;

  // Internationaux = pas de whatsapp local (tous routés via le N° central GlowScan = 1 livraison)
  const internationals = areaProducts.filter((p) => !p.whatsapp);
  // Locaux groupés par numéro WhatsApp = par marque
  const localsByBrand = new Map<string, any[]>();
  for (const p of areaProducts.filter((x) => x.whatsapp)) {
    const k = p.whatsapp as string;
    if (!localsByBrand.has(k)) localsByBrand.set(k, []);
    localsByBrand.get(k)!.push(p);
  }

  // Chaque "candidat" = 3 produits cohérents (1 livraison)
  type Candidate = { products: any[]; total: number; brandKey: string };
  const candidates: Candidate[] = [];

  // Bloc tout-international
  const intSorted = [...internationals].sort((a, b) => score(b) - score(a));
  if (intSorted.length >= 3) {
    const top3 = intSorted.slice(0, 3);
    candidates.push({ products: top3, total: top3.reduce((s, p) => s + score(p), 0), brandKey: "international" });
  }

  // Un bloc par marque locale (si elle a ≥3 produits dans la catégorie)
  for (const [waKey, brandProducts] of Array.from(localsByBrand.entries())) {
    if (brandProducts.length < 3) continue;
    const sorted = [...brandProducts].sort((a, b) => score(b) - score(a));
    const top3 = sorted.slice(0, 3);
    candidates.push({ products: top3, total: top3.reduce((s, p) => s + score(p), 0), brandKey: waKey });
  }

  // Choisir le meilleur ; égalité → PRIORITÉ AUX MARQUES LOCALES
  // (soutien au tissu local + livraison directe par la marque elle-même)
  candidates.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.brandKey === "international") return 1;   // international descend
    if (b.brandKey === "international") return -1;  // local remonte
    return 0;
  });

  // Fallback robuste : pas de mélange local/international
  let winner: Candidate;
  if (candidates.length === 0) {
    if (internationals.length > 0) {
      const top = [...internationals].sort((a, b) => score(b) - score(a)).slice(0, 3);
      winner = { products: top, total: top.reduce((s, p) => s + score(p), 0), brandKey: "international" };
    } else {
      const firstBrand = Array.from(localsByBrand.entries())[0];
      if (!firstBrand) {
        return { main: [], supplement: null, sourceLabel: "international" };
      }
      const [waKey, brandProducts] = firstBrand;
      const top = [...brandProducts].sort((a, b) => score(b) - score(a)).slice(0, 3);
      winner = { products: top, total: top.reduce((s, p) => s + score(p), 0), brandKey: waKey };
    }
  } else {
    winner = candidates[0];
  }
  const sourceLabel = winner.brandKey === "international" ? "international" : (BRAND_MAP[winner.brandKey] || "marque locale");

  // Gamme intermédiaire (4000–6000 FCFA, point d'entrée pour pousser à l'action), MÊME source, exclu des 3 principaux
  const sourcePool = winner.brandKey === "international"
    ? internationals
    : (localsByBrand.get(winner.brandKey) || []);
  const inRange = sourcePool.filter((p) =>
    typeof p.price === "number" && p.price >= 4000 && p.price <= 6000 &&
    !winner.products.some((w) => w.id === p.id)
  );
  // Pertinence pour le diagnostic d'abord, prix ensuite ; supplément masqué si aucun lien diagnostic
  inRange.sort((a, b) => {
    const ds = score(b) - score(a);
    return ds !== 0 ? ds : (a.price! - b.price!);
  });
  const supplement = (inRange[0] && score(inRange[0]) > 0) ? inRange[0] : null;

  return { main: winner.products, supplement, sourceLabel };
}

// === Card médicale (cards flottantes spec utilisateur) ===
function MedCard({
  children,
  accent = false,
  className = "",
  testId,
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 ${
        accent ? "border-l-[4px] border-l-pink-600" : "border border-gray-100"
      } ${className}`}
      data-testid={testId}
    >
      {children}
    </motion.section>
  );
}

function ZoneIcon({ status }: { status: ZoneAnalysisItem["status"] | "red" | "yellow" | "green" }) {
  const map: Record<string, string> = { red: "🔴", yellow: "🟡", green: "🟢" };
  return <span className="text-base">{map[status] || "🟡"}</span>;
}

// Une ligne de zone à l'intérieur de l'accordion BLOC 5 — son propre "Voir plus" indépendant
function ZoneRow({
  zone,
  index,
}: {
  zone: ZoneAnalysisItem;
  index: number;
}) {
  return (
    <div className="border-t border-gray-100 first:border-t-0 py-2" data-testid={`zone-row-${index}`}>
      <div className="flex items-start gap-2">
        <ZoneIcon status={zone.status} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-gray-800 leading-snug">
            <span className="font-bold text-gray-900">{zone.name}</span>
            <span className="text-gray-400"> — </span>
            <span>{zone.short}</span>
          </p>
          {zone.long && (
            <p className="mt-1 text-[12px] text-gray-600 leading-relaxed font-medical whitespace-pre-line" data-testid={`text-zone-long-${index}`}>
              {zone.long}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// === Composant principal ===
export default function MedicalReport({ result, scanId, area = "face", imageUrl, userFirstName, previousScore }: Props) {
  const reference = result.reference || (scanId ? `GS-${new Date().getFullYear()}-${String(scanId).padStart(4, "0")}` : `GS-${new Date().getFullYear()}-DEMO`);
  // Date courte pour le header compact : "29 avril 2026"
  const dateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  // Delta GlowScore vs scan précédent (pour la flèche ↑ +10 / ↓ -5 sur la carte d'identité)
  const scoreDelta: number | null = (typeof previousScore === "number" && typeof result.score === "number")
    ? (result.score - previousScore)
    : null;

  // Métriques avec fallback intelligent depuis balance si pas générées par IA
  const metrics = result.metrics ?? {
    hydratation: Math.max(20, Math.min(95, 90 - (result.balance?.sebum || 0) * 5 + ((result.score || 50) - 50) * 0.3)),
    eclat: Math.max(20, Math.min(95, (result.score || 50) - (result.balance?.scars || 0) * 5)),
    purete: Math.max(20, Math.min(95, 100 - (result.balance?.inflammation || 0) * 8 - (result.balance?.scars || 0) * 5)),
  };

  // Zone analysis avec fallback depuis zones[] simples si pas générée
  const zoneAnalysis: ZoneAnalysisItem[] = result.zoneAnalysis && result.zoneAnalysis.length > 0
    ? result.zoneAnalysis
    : (result.zones || []).map((z) => ({
        name: z.name,
        status: z.status,
        short: z.issue || (z.status === "green" ? "Zone stable, aucune imperfection notable." : "Zone à surveiller."),
        long: "",
      }));

  const conclusion = result.conclusion || {
    short: result.details || "Analyse en cours.",
    long: "",
  };

  const severityLevel: number = (result.severityLevel as number) || (
    (result.balance?.inflammation || 0) >= 7 ? 4 :
    (result.balance?.inflammation || 0) >= 5 ? 3 :
    (result.balance?.inflammation || 0) >= 3 ? 2 : 1
  );
  const severityLabel = result.severityLabel || (
    severityLevel === 1 ? "Peau saine — soins cosmétiques d'entretien" :
    severityLevel === 2 ? "Cas léger à modéré — traitement cosmétique suffit" :
    severityLevel === 3 ? "Cas modéré — consultation dermatologue suggérée" :
    severityLevel === 4 ? "Cas marqué — consultation fortement recommandée" :
    "Cas sévère — consultation médicale impérative"
  );

  // Protocole avec fallback depuis recommendations.morning/evening
  const protocolMorning: ProtocolStep[] = result.protocol?.morning || (result.recommendations?.morning || []).map((s, i) => ({
    step: `Étape ${i + 1}`,
    product: s,
  }));
  const protocolEvening: ProtocolStep[] = result.protocol?.evening || (result.recommendations?.evening || []).map((s, i) => ({
    step: `Étape ${i + 1}`,
    product: s,
  }));

  const routine = findRoutineProducts(result, area);
  const problems = deriveProblems(result);
  const bundle = pickBundle(result, area || "face", routine, problems);

  // ── Modale "fiche commande" : nom, téléphone, adresse → WhatsApp 237674377959 ──
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderTitle, setOrderTitle] = useState("Commander");

  // Commander le bundle (1, 2 ou 3 produits selon palier) en un seul envoi WhatsApp
  const handleOrderBundle = () => {
    if (!bundle.products.length) return;
    setOrderItems(bundle.products.map((p) => ({
      productId: p.id,
      productName: p.name,
      brand: getProductBrand(p),
      price: p.price,
    })));
    setOrderTitle(`Commander ${bundle.name}`);
    setShowOrderModal(true);
  };

  // Sous-lignes courtes pour la carte d'identité — au plus 2 zones
  const identityZoneLines: string[] = (() => {
    const zones = (zoneAnalysis && zoneAnalysis.length > 0)
      ? zoneAnalysis
      : (result.zones || []).map((z) => ({ name: z.name, status: z.status }));
    return zones.slice(0, 2).map((z) => `${z.name} ${zoneStatusShort(z.status as any)}`);
  })();

  return (
    <div className="space-y-2.5" data-testid="medical-report">
      {/* ═══════════════════════════════════════════
          BLOC 1 — Header compact (1 ligne, 30px max)
          GlowScan • Analyse #GS-2024-XXXX • 29 avril 2026
          ═══════════════════════════════════════════ */}
      <div
        className="px-1 flex items-center"
        style={{ height: 30 }}
        data-testid="block-header"
      >
        {/* Une seule zone texte tronquée pour rester fiable sur mobile étroit */}
        <p className="text-[11px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis w-full leading-none">
          <span className="font-semibold text-gray-700">GlowScan</span>
          <span className="text-gray-300"> • </span>
          <span>Analyse </span>
          <span className="font-mono font-medium text-pink-600" data-testid="text-reference">#{reference}</span>
          <span className="text-gray-300"> • </span>
          <span>{dateLabel}</span>
        </p>
      </div>

      {/* ═══════════════════════════════════════════
          BLOC 2 — Carte identité (hauteur auto pour ne pas couper le diagnostic)
          Photo 60×60 | Type de peau (texte complet) | GlowScore + delta
          ═══════════════════════════════════════════ */}
      <div
        className="rounded-2xl border border-pink-200 bg-white shadow-sm px-3 py-3 flex items-start gap-3"
        data-testid="block-identity"
      >
        {/* Photo 60×60 carré arrondi */}
        <div
          className="rounded-xl overflow-hidden bg-pink-50 border border-pink-100 flex-shrink-0"
          style={{ width: 60, height: 60 }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Photo analysée"
              className="w-full h-full object-cover"
              data-testid="img-analyzed-photo"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-pink-300 text-xl">
              👤
            </div>
          )}
        </div>

        {/* Centre — type de peau bold complet (wrap autorisé) + sous-lignes zones */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-bold text-gray-900 font-display leading-snug break-words"
            data-testid="text-skin-type"
          >
            {result.skinType || "Type indéterminé"}
          </p>
          {identityZoneLines.length > 0 ? (
            <div className="mt-1 space-y-0">
              {identityZoneLines.map((line, i) => (
                <p key={i} className="text-[11px] text-gray-500 leading-snug break-words">{line}</p>
              ))}
            </div>
          ) : null}
        </div>

        {/* Droite — GlowScore rose, chiffre grand + delta */}
        <div className="flex-shrink-0 text-right pl-1 pt-1">
          <div className="flex items-baseline justify-end gap-0.5 leading-none">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="text-[28px] font-bold text-pink-600 font-display"
              data-testid="text-glowscore"
            >
              {result.score}
            </motion.span>
            <span className="text-[11px] text-gray-400">/100</span>
          </div>
          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-none mt-0.5">GlowScore</p>
          {scoreDelta !== null && scoreDelta !== 0 && (
            <p
              className={`flex items-center justify-end gap-0.5 text-[10px] font-bold leading-none mt-1 ${
                scoreDelta > 0 ? "text-emerald-600" : "text-orange-500"
              }`}
              data-testid="text-score-delta"
            >
              {scoreDelta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`}
            </p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          BLOC 3 — 3 métriques pills horizontales (35px)
          💧 Hydratation 65 • ✨ Éclat 70 • 🧼 Pureté 58
          ═══════════════════════════════════════════ */}
      <div
        className="rounded-full border border-pink-100 bg-white shadow-sm px-3 flex items-center justify-between gap-1 text-[12px]"
        style={{ height: 35 }}
        data-testid="block-metrics-pills"
      >
        <span className="flex items-center gap-1 font-medium text-gray-800 truncate" data-testid="metric-hydratation">
          <span aria-hidden="true">💧</span>
          <span className="text-gray-600">Hydratation</span>
          <span className="font-bold text-pink-600">{Math.round(metrics.hydratation)}</span>
        </span>
        <span className="text-pink-200">•</span>
        <span className="flex items-center gap-1 font-medium text-gray-800 truncate" data-testid="metric-eclat">
          <span aria-hidden="true">✨</span>
          <span className="text-gray-600">Éclat</span>
          <span className="font-bold text-pink-600">{Math.round(metrics.eclat)}</span>
        </span>
        <span className="text-pink-200">•</span>
        <span className="flex items-center gap-1 font-medium text-gray-800 truncate" data-testid="metric-purete">
          <span aria-hidden="true">🧼</span>
          <span className="text-gray-600">Pureté</span>
          <span className="font-bold text-pink-600">{Math.round(metrics.purete)}</span>
        </span>
      </div>

      {/* ═══════════════════════════════════════════
          BLOC 4 — Bundle unique recommandé (tier dynamique selon sévérité)
          STRATÉGIE :
          • UN SEUL bundle adapté au diagnostic (Découverte / Essentiel / Complète / Premium)
          • Vendre LE RÉSULTAT (la promesse), pas la liste de produits
          • UN seul bouton "Commander mon bundle"
          • Bonus inclus si Premium (ex: rescan offert)
          • Bloc copywriting de confiance en dessous
          ═══════════════════════════════════════════ */}
      <MedCard accent testId="block-products" className="!p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-4 h-4 text-pink-600" />
          <h2 className="text-[15px] font-bold text-gray-900 font-display">Recommandé pour toi</h2>
        </div>
        <p className="text-[11px] text-gray-500 mb-3 leading-snug">
          Bundle adapté à ton diagnostic — {bundle.sourceLabel === "international" ? "marques internationales" : bundle.sourceLabel}, une seule livraison.
        </p>

        <div
          className="rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-white via-pink-50/30 to-rose-50/40 overflow-hidden shadow-md"
          data-testid={`card-bundle-${bundle.tier}`}
        >
          {/* En-tête bundle : nom + tier + promesse résultat */}
          <div className="px-4 pt-3.5 pb-3 border-b border-pink-100">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{bundle.emoji}</span>
                <h3 className="text-[16px] font-black text-gray-900 leading-tight truncate font-display" data-testid="text-bundle-name">
                  {bundle.name}
                </h3>
              </div>
              {bundle.badge && (
                <span className="flex-shrink-0 text-[10px] font-bold text-pink-700 bg-pink-100 border border-pink-200 px-2 py-0.5 rounded-full whitespace-nowrap" data-testid="badge-bundle">
                  ⭐ {bundle.badge}
                </span>
              )}
            </div>
            <p className="text-[13px] font-semibold text-gray-800 leading-snug" data-testid="text-bundle-tagline">
              {bundle.tagline}
            </p>
            {bundle.bonus && (
              <p className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 leading-snug" data-testid="text-bundle-bonus">
                {bundle.bonus}
              </p>
            )}
          </div>

          {/* Liste compacte des produits inclus */}
          {bundle.products.length > 0 && (
            <div className="px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">
                Inclus dans ce bundle ({bundle.products.length} produit{bundle.products.length > 1 ? "s" : ""})
              </p>
              <div className="space-y-1.5">
                {bundle.products.map((product) => {
                  const labels = shortReasonLabels(product, problems);
                  const img = productImages[product.id] || product.image;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-2.5"
                      data-testid={`card-bundle-product-${product.id}`}
                    >
                      <div className="rounded-md overflow-hidden bg-white border border-pink-100 flex-shrink-0" style={{ width: 36, height: 36 }}>
                        {img ? (
                          <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-pink-300">🧴</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-gray-900 leading-tight truncate" data-testid={`name-bundle-product-${product.id}`}>
                          {product.name}
                        </h4>
                        {labels.length > 0 && (
                          <p className="text-[10px] text-gray-500 leading-tight truncate">
                            {labels.join(" • ")}
                          </p>
                        )}
                      </div>
                      {typeof product.price === "number" && (
                        <p className="text-[11px] font-semibold text-gray-600 leading-none whitespace-nowrap flex-shrink-0">
                          {formatPrice(product.price)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA Total + bouton commande */}
          {bundle.products.length > 0 && (
            <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wider font-bold text-pink-100">Total bundle</p>
                {bundle.total > 0 && (
                  <p className="text-[18px] font-black" data-testid="text-bundle-total">
                    {formatPrice(bundle.total)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleOrderBundle}
                className="flex-1 max-w-[210px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-black text-pink-700 bg-white shadow-md active:scale-[0.97] transition-transform"
                data-testid="button-order-bundle"
                aria-label={`Commander ${bundle.name}`}
              >
                {bundle.ctaLabel} →
              </button>
            </div>
          )}
        </div>

        {/* Bloc copywriting de confiance — réduit la friction avant la commande */}
        <div
          className="mt-3 rounded-xl bg-emerald-50/70 border border-emerald-100 p-3"
          data-testid="block-trust"
        >
          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 leading-none mb-2">
            Commander en confiance
          </p>
          <ul className="space-y-1.5 text-[12px] text-gray-800 leading-snug">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold">Paiement à la livraison</span> — tu ne paies que quand tu reçois ton colis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold">Livraison Douala &amp; Yaoundé</span> sous 24–48h, partout au Cameroun en 3–5 jours.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold">Une conseillère GlowScan</span> te confirme la commande sur WhatsApp avant l'envoi.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold">Produits 100% authentiques</span>, sélectionnés pour les peaux africaines.</span>
            </li>
          </ul>
        </div>
      </MedCard>

      {/* ═══════════════════════════════════════════
          BLOC 5 — Analyse détaillée (accordion)
          Contient : carte des zones du visage (si dispo) + 1 ligne par zone avec son "Voir plus"
          ═══════════════════════════════════════════ */}
      {(zoneAnalysis.length > 0 || (result.zones && result.zones.length > 0)) && (
        <MedCard accent testId="block-zone-analysis">
          <div className="flex items-center gap-2 mb-2">
            <ScanLine className="w-4 h-4 text-pink-600" />
            <h2 className="text-[15px] font-bold text-gray-900 font-display">Analyse complète</h2>
          </div>
          {result.zones && result.zones.length > 0 && (
            <div className="mb-3" data-testid="block-face-map">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Carte des zones</p>
              <FaceZonesMap zones={result.zones} />
            </div>
          )}
          {zoneAnalysis.length > 0 && (
            <div className="divide-y divide-gray-100">
              {zoneAnalysis.map((zone, i) => (
                <ZoneRow key={i} zone={zone} index={i} />
              ))}
            </div>
          )}
        </MedCard>
      )}

      {/* ═══════════════════════════════════════════
          BLOC 6 — Mon protocole de soin (carte plate)
          ═══════════════════════════════════════════ */}
      <MedCard accent testId="block-protocol">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-pink-600" />
          <h2 className="text-[15px] font-bold text-gray-900 font-display">Mon protocole de soin</h2>
        </div>
        <p className="text-[11px] text-gray-500 italic mb-3">Applique-le 4 à 6 semaines avant de réévaluer.</p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <h3 className="text-[13px] font-bold text-gray-900">🌅 Matin</h3>
            </div>
            <ol className="space-y-1.5 ml-1">
              {protocolMorning.map((s, i) => (
                <ProtocolRow key={i} index={i + 1} step={s} compact />
              ))}
              {protocolMorning.length === 0 && (
                <li className="text-[12px] text-gray-400 italic">Aucune étape disponible.</li>
              )}
            </ol>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Moon className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[13px] font-bold text-gray-900">🌙 Soir</h3>
            </div>
            <ol className="space-y-1.5 ml-1">
              {protocolEvening.map((s, i) => (
                <ProtocolRow key={i} index={i + 1} step={s} compact />
              ))}
              {protocolEvening.length === 0 && (
                <li className="text-[12px] text-gray-400 italic">Aucune étape disponible.</li>
              )}
            </ol>
          </div>
          {result.recommendations?.weekly && (
            <div className="rounded-lg p-2.5 bg-pink-50 border border-pink-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-pink-600 mb-0.5">Hebdo</p>
              <p className="text-[12px] text-gray-800 font-medical leading-snug">{result.recommendations.weekly}</p>
            </div>
          )}
        </div>
      </MedCard>

      {severityLevel >= 4 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 flex items-start gap-2" data-testid="alert-severity-high">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-rose-900 leading-snug">
            <span className="font-bold">Consultation dermatologique recommandée</span> — {severityLabel.toLowerCase()} (niveau {severityLevel}/5).
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          BLOC 7 — TA TRANSFORMATION 4 SEMAINES (rétention)
          Roadmap visuelle qui pousse à revenir chaque semaine
          mesurer ses progrès, avec récompense finale (rescan offert).
          ═══════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(233,30,140,0.18)]"
        data-testid="block-transformation-4w"
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1A1A2E 0%, #2D1B3D 45%, #4A1B4D 75%, #E91E8C 100%)",
          }}
          aria-hidden="true"
        />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-pink-400/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-rose-300/15 blur-3xl" aria-hidden="true" />

        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-[0.25em] font-black text-pink-200/90">Ton parcours Glow</p>
            <span className="text-[10px] font-bold text-pink-100 bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
              Semaine 1 / 4
            </span>
          </div>
          <h3 className="text-[20px] font-black leading-tight font-display mb-1">
            Ta transformation en 4 semaines
          </h3>
          <p className="text-[12px] text-pink-100/85 leading-snug mb-4">
            Suis ta routine, reviens chaque semaine — on mesure ensemble tes vrais progrès.
          </p>

          <div className="relative mb-4 px-1">
            <div className="absolute left-3 right-3 top-3 h-[2px] bg-white/15" aria-hidden="true" />
            <div
              className="absolute left-3 top-3 h-[2px] bg-gradient-to-r from-pink-300 to-pink-100"
              style={{ width: "10%" }}
              aria-hidden="true"
            />
            <div className="relative grid grid-cols-4 gap-2">
              {[
                { week: "S1", label: "Hydratation", desc: "On répare la barrière", emoji: "💧", active: true },
                { week: "S2", label: "Premiers signes", desc: "Teint plus net", emoji: "✨", active: false },
                { week: "S3", label: "Uniformisation", desc: "Taches qui s'atténuent", emoji: "🌸", active: false },
                { week: "S4", label: "Glow révélé", desc: "Rescan offert 🎁", emoji: "🏆", active: false, reward: true },
              ].map((step) => (
                <div key={step.week} className="flex flex-col items-center text-center">
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black mb-1.5 ${
                      step.active
                        ? "bg-white text-pink-700 shadow-lg shadow-pink-500/40 ring-2 ring-pink-200"
                        : step.reward
                          ? "bg-amber-300/90 text-amber-900 ring-2 ring-amber-200/40"
                          : "bg-white/15 text-white/70 border border-white/25"
                    }`}
                    data-testid={`milestone-${step.week.toLowerCase()}`}
                  >
                    {step.active ? "•" : step.week}
                  </div>
                  <p className="text-[15px] mb-0.5" aria-hidden="true">{step.emoji}</p>
                  <p className={`text-[10px] font-bold leading-tight ${step.active ? "text-white" : step.reward ? "text-amber-200" : "text-white/70"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[9px] leading-tight mt-0.5 ${step.active ? "text-pink-100" : "text-white/45"}`}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-3 mb-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xl flex-shrink-0">🎁</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-amber-200 leading-tight">
                  Récompense semaine 4
                </p>
                <p className="text-[11px] text-white/85 leading-snug mt-0.5">
                  Termine ton parcours et débloque <span className="font-bold text-white">1 rescan offert</span> + un nouveau diagnostic comparatif "avant / après".
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              try {
                const journey = {
                  startedAt: new Date().toISOString(),
                  initialScore: result.score,
                  area: area || "face",
                  condition: result.condition,
                };
                localStorage.setItem("glowscan_journey_4w", JSON.stringify(journey));
              } catch {}
              const reminderBtn = document.querySelector('[data-testid="button-set-j7-reminder"]') as HTMLButtonElement | null;
              if (reminderBtn) reminderBtn.click();
              const target = document.querySelector('[data-testid="block-products"]');
              if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            data-testid="button-start-journey"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-pink-700 font-black text-sm shadow-xl shadow-black/30 active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Démarrer mon parcours 4 semaines
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-pink-100/70 text-center mt-2.5 font-medium">
            On t'envoie un rappel chaque semaine pour mesurer tes progrès
          </p>
        </div>
      </motion.section>

      {/* Modale fiche commande — toutes les commandes vont vers WhatsApp 237 674 377 959 */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        items={orderItems}
        title={orderTitle}
        scanContext={{
          skinType: result.skinType,
          condition: result.condition,
          score: result.score,
        }}
      />
    </div>
  );
}

function ProtocolRow({ index, step, compact = false }: { index: number; step: ProtocolStep; compact?: boolean }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`${compact ? "text-[13px]" : "text-[14px]"} font-bold text-gray-900 leading-tight`}>
          {step.step}
        </p>
        {step.product && (
          <p className="text-[12px] text-pink-600 font-medium leading-snug">{step.product}</p>
        )}
        {!compact && step.why && (
          <p className="text-[12px] text-gray-600 italic leading-snug mt-1">{step.why}</p>
        )}
      </div>
    </li>
  );
}
