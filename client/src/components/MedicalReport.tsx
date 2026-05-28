import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, AlertTriangle, ShoppingBag, ArrowUp, ArrowDown, ScanLine, Sparkles } from "lucide-react";
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
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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
  main: any[];
  supplement: any | null;
  sourceLabel: string;
}

export type BundleTier = "decouverte" | "essentiel" | "complete" | "premium";

export interface BundlePromise {
  tier: BundleTier;
  emoji: string;
  name: string;
  tagline: string;
  bonus?: string;
  ctaLabel: string;
  badge?: string;
}

function pickBundleTier(score: number): BundleTier {
  if (score >= 60) return "decouverte";
  if (score >= 45) return "essentiel";
  if (score >= 30) return "complete";
  return "premium";
}

function bundleMeta(tier: BundleTier, problems: DiagProblem[]): BundlePromise {
  const mainProblem = problems[0]?.key;
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
      name: "Bundle découverte",
      ctaLabel: "Tester ce produit",
    },
    essentiel: {
      emoji: "⭐",
      name: "Bundle essentiel",
      badge: "Le plus choisi",
      ctaLabel: "Commander mon bundle",
    },
    complete: {
      emoji: "💎",
      name: "Bundle routine complète",
      ctaLabel: "Commander ma routine",
    },
    premium: {
      emoji: "👑",
      name: "Bundle premium",
      bonus: "Rescan offert à J+14 (valeur 2 000 FCFA)",
      ctaLabel: "Commander premium",
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

  let products = routine.main.slice(0, wanted);

  if (products.length < wanted) {
    const cat = area === "hair" ? "cheveux" : area === "body" ? "corps" : "visage";
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

  const localsByBrand = new Map<string, any[]>();
  for (const p of areaProducts.filter((x) => x.whatsapp)) {
    const k = p.whatsapp as string;
    if (!localsByBrand.has(k)) localsByBrand.set(k, []);
    localsByBrand.get(k)!.push(p);
  }

  type Candidate = { products: any[]; total: number; brandKey: string };
  const candidates: Candidate[] = [];

  for (const [waKey, brandProducts] of Array.from(localsByBrand.entries())) {
    if (brandProducts.length < 3) continue;
    const sorted = [...brandProducts].sort((a, b) => score(b) - score(a));
    const top3 = sorted.slice(0, 3);
    candidates.push({ products: top3, total: top3.reduce((s, p) => s + score(p), 0), brandKey: waKey });
  }

  candidates.sort((a, b) => b.total - a.total);

  let winner: Candidate;
  if (candidates.length === 0) {
    const firstBrand = Array.from(localsByBrand.entries())[0];
    if (!firstBrand) {
      return { main: [], supplement: null, sourceLabel: "marque locale" };
    }
    const [waKey, brandProducts] = firstBrand;
    const top = [...brandProducts].sort((a, b) => score(b) - score(a)).slice(0, 3);
    winner = { products: top, total: top.reduce((s, p) => s + score(p), 0), brandKey: waKey };
  } else {
    winner = candidates[0];
  }
  const sourceLabel = BRAND_MAP[winner.brandKey] || "marque locale";

  const sourcePool = localsByBrand.get(winner.brandKey) || [];
  const inRange = sourcePool.filter((p) =>
    typeof p.price === "number" && p.price >= 4000 && p.price <= 6000 &&
    !winner.products.some((w) => w.id === p.id)
  );
  inRange.sort((a, b) => {
    const ds = score(b) - score(a);
    return ds !== 0 ? ds : (a.price! - b.price!);
  });
  const supplement = (inRange[0] && score(inRange[0]) > 0) ? inRange[0] : null;

  return { main: winner.products, supplement, sourceLabel };
}

// === Card médicale design system ===
function MedCard({
  children,
  violet = false,
  className = "",
  testId,
}: {
  children: React.ReactNode;
  violet?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      style={
        violet
          ? {
              background: "rgba(167,139,250,0.06)",
              border: "1px solid rgba(167,139,250,0.18)",
              borderRadius: 24,
              padding: "1.25rem",
            }
          : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 24,
              padding: "1.25rem",
            }
      }
      className={className}
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

function ZoneRow({
  zone,
  index,
}: {
  zone: ZoneAnalysisItem;
  index: number;
}) {
  return (
    <div
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      className="first:border-t-0 py-2"
      data-testid={`zone-row-${index}`}
    >
      <div className="flex items-start gap-2">
        <ZoneIcon status={zone.status} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>
            <span className="font-bold" style={{ color: "#f3f0ff" }}>{zone.name}</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}> — </span>
            <span>{zone.short}</span>
          </p>
          {zone.long && (
            <p
              className="mt-1 text-[12px] leading-relaxed whitespace-pre-line"
              style={{ color: "rgba(200,185,255,0.5)" }}
              data-testid={`text-zone-long-${index}`}
            >
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
  const dateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  const scoreDelta: number | null = (typeof previousScore === "number" && typeof result.score === "number")
    ? (result.score - previousScore)
    : null;

  const metrics = result.metrics ?? {
    hydratation: Math.max(20, Math.min(95, 90 - (result.balance?.sebum || 0) * 5 + ((result.score || 50) - 50) * 0.3)),
    eclat: Math.max(20, Math.min(95, (result.score || 50) - (result.balance?.scars || 0) * 5)),
    purete: Math.max(20, Math.min(95, 100 - (result.balance?.inflammation || 0) * 8 - (result.balance?.scars || 0) * 5)),
  };

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

  const normalizeStep = (s: any, i: number): ProtocolStep => {
    if (s && typeof s === "object") {
      return {
        step: typeof s.step === "string" ? s.step : `Étape ${i + 1}`,
        product: typeof s.product === "string" ? s.product : undefined,
        why: typeof s.why === "string" ? s.why : undefined,
      };
    }
    return { step: `Étape ${i + 1}`, product: typeof s === "string" ? s : String(s ?? "") };
  };
  const protocolMorning: ProtocolStep[] = (result.protocol?.morning || result.recommendations?.morning || []).map(normalizeStep);
  const protocolEvening: ProtocolStep[] = (result.protocol?.evening || result.recommendations?.evening || []).map(normalizeStep);

  const routine = findRoutineProducts(result, area);
  const problems = deriveProblems(result);
  const bundle = pickBundle(result, area || "face", routine, problems);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderTitle, setOrderTitle] = useState("Commander");

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

  const identityZoneLines: string[] = (() => {
    const zones = (zoneAnalysis && zoneAnalysis.length > 0)
      ? zoneAnalysis
      : (result.zones || []).map((z) => ({ name: z.name, status: z.status }));
    return zones.slice(0, 2).map((z) => `${z.name} ${zoneStatusShort(z.status as any)}`);
  })();

  return (
    <div
      className="space-y-2.5"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      data-testid="medical-report"
    >
      {/* ═══ BLOC 1 — Header compact ═══ */}
      <div className="px-1 flex items-center" style={{ height: 30 }} data-testid="block-header">
        <p
          className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis w-full leading-none"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <span className="font-semibold" style={{ color: "#c4b5fd" }}>GlowScan</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}> • </span>
          <span>Analyse </span>
          <span className="font-mono font-semibold" style={{ color: "#a78bfa" }} data-testid="text-reference">
            #{reference}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}> • </span>
          <span>{dateLabel}</span>
        </p>
      </div>

      {/* ═══ BLOC 2 — Carte identité ═══ */}
      <div
        className="px-3 py-3 flex items-start gap-3"
        style={{
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.18)",
          borderRadius: 24,
        }}
        data-testid="block-identity"
      >
        {/* Photo 60×60 */}
        <div
          className="overflow-hidden flex-shrink-0"
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            background: "rgba(167,139,250,0.1)",
            border: "1px solid rgba(167,139,250,0.2)",
          }}
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
            <div className="w-full h-full flex items-center justify-center text-xl" style={{ color: "rgba(167,139,250,0.4)" }}>
              👤
            </div>
          )}
        </div>

        {/* Centre — type de peau */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-bold leading-snug break-words"
            style={{ color: "#f3f0ff" }}
            data-testid="text-skin-type"
          >
            {result.skinType || "Type indéterminé"}
          </p>
          {identityZoneLines.length > 0 && (
            <div className="mt-1 space-y-0">
              {identityZoneLines.map((line, i) => (
                <p key={i} className="text-[11px] leading-snug break-words" style={{ color: "rgba(200,185,255,0.65)" }}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* GlowScore */}
        <div className="flex-shrink-0 text-right pl-1 pt-1">
          <div className="flex items-baseline justify-end gap-0.5 leading-none">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="text-[28px] font-bold"
              style={{ color: "#a78bfa" }}
              data-testid="text-glowscore"
            >
              {result.score}
            </motion.span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>/100</span>
          </div>
          <p className="text-[9px] uppercase tracking-wider font-semibold leading-none mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            GlowScore
          </p>
          {scoreDelta !== null && scoreDelta !== 0 && (
            <p
              className="flex items-center justify-end gap-0.5 text-[10px] font-bold leading-none mt-1"
              style={{ color: scoreDelta > 0 ? "#6ee7b7" : "#fbbf24" }}
              data-testid="text-score-delta"
            >
              {scoreDelta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`}
            </p>
          )}
        </div>
      </div>

      {/* ═══ BLOC 3 — Métriques pills ═══ */}
      <div
        className="px-3 flex items-center justify-between gap-1 text-[12px]"
        style={{
          height: 40,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 9999,
        }}
        data-testid="block-metrics-pills"
      >
        <span className="flex items-center gap-1 font-medium truncate" data-testid="metric-hydratation">
          <span aria-hidden="true">💧</span>
          <span style={{ color: "rgba(200,185,255,0.65)" }}>Hydratation</span>
          <span className="font-bold" style={{ color: "#a78bfa" }}>{Math.round(metrics.hydratation)}</span>
        </span>
        <span style={{ color: "rgba(167,139,250,0.3)" }}>•</span>
        <span className="flex items-center gap-1 font-medium truncate" data-testid="metric-eclat">
          <span aria-hidden="true">✨</span>
          <span style={{ color: "rgba(200,185,255,0.65)" }}>Éclat</span>
          <span className="font-bold" style={{ color: "#a78bfa" }}>{Math.round(metrics.eclat)}</span>
        </span>
        <span style={{ color: "rgba(167,139,250,0.3)" }}>•</span>
        <span className="flex items-center gap-1 font-medium truncate" data-testid="metric-purete">
          <span aria-hidden="true">🧼</span>
          <span style={{ color: "rgba(200,185,255,0.65)" }}>Pureté</span>
          <span className="font-bold" style={{ color: "#a78bfa" }}>{Math.round(metrics.purete)}</span>
        </span>
      </div>

      {/* ═══ BLOC 4 — Bundle recommandé ═══ */}
      <MedCard violet testId="block-products" className="!p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-4 h-4" style={{ color: "#a78bfa" }} />
          <h2 className="text-[15px] font-bold" style={{ color: "#f3f0ff" }}>Recommandé pour toi</h2>
        </div>
        <p className="text-[11px] mb-3 leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>
          Bundle adapté à ton diagnostic — {bundle.sourceLabel}, livraison directe par la marque.
        </p>

        <div
          style={{
            border: "1px solid rgba(233,30,140,0.3)",
            borderRadius: 20,
            overflow: "hidden",
            background: "rgba(233,30,140,0.04)",
          }}
          data-testid={`card-bundle-${bundle.tier}`}
        >
          {/* En-tête bundle */}
          <div
            className="px-4 pt-3.5 pb-3"
            style={{ borderBottom: "1px solid rgba(167,139,250,0.12)" }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{bundle.emoji}</span>
                <h3
                  className="text-[16px] font-bold leading-tight truncate"
                  style={{ color: "#f3f0ff" }}
                  data-testid="text-bundle-name"
                >
                  {bundle.name}
                </h3>
              </div>
              {bundle.badge && (
                <span
                  className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap"
                  style={{
                    background: "rgba(167,139,250,0.15)",
                    border: "1px solid rgba(167,139,250,0.3)",
                    borderRadius: 8,
                    color: "#c4b5fd",
                  }}
                  data-testid="badge-bundle"
                >
                  ⭐ {bundle.badge}
                </span>
              )}
            </div>
            <p className="text-[13px] font-semibold leading-snug" style={{ color: "rgba(200,185,255,0.8)" }} data-testid="text-bundle-tagline">
              {bundle.tagline}
            </p>
            {bundle.bonus && (
              <p
                className="mt-2 text-[11px] font-bold px-2 py-1.5 leading-snug"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 10,
                  color: "#fbbf24",
                }}
                data-testid="text-bundle-bonus"
              >
                🎁 {bundle.bonus}
              </p>
            )}
          </div>

          {/* Liste produits inclus */}
          {bundle.products.length > 0 && (
            <div className="px-4 py-2.5">
              <p
                className="text-[10px] uppercase tracking-wider font-bold mb-1.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
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
                      <div
                        className="overflow-hidden flex-shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: "rgba(167,139,250,0.08)",
                          border: "1px solid rgba(167,139,250,0.15)",
                        }}
                      >
                        {img ? (
                          <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "rgba(167,139,250,0.4)" }}>🧴</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-[12px] font-bold leading-tight truncate"
                          style={{ color: "#f3f0ff" }}
                          data-testid={`name-bundle-product-${product.id}`}
                        >
                          {product.name}
                        </h4>
                        {labels.length > 0 && (
                          <p className="text-[10px] leading-tight truncate" style={{ color: "rgba(200,185,255,0.65)" }}>
                            {labels.join(" • ")}
                          </p>
                        )}
                      </div>
                      {typeof product.price === "number" && (
                        <p className="text-[11px] font-semibold leading-none whitespace-nowrap flex-shrink-0" style={{ color: "#c4b5fd" }}>
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
            <div
              className="px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: "linear-gradient(135deg,#E91E8C,#f43f5e)" }}
            >
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Total bundle
                </p>
                {bundle.total > 0 && (
                  <p className="text-[18px] font-bold text-white" data-testid="text-bundle-total">
                    {formatPrice(bundle.total)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleOrderBundle}
                className="flex-1 max-w-[210px] inline-flex items-center justify-center gap-1.5 text-[13px] font-bold active:scale-[0.97] transition-transform"
                style={{
                  background: "#fff",
                  color: "#7c3aed",
                  borderRadius: 9999,
                  padding: "0.625rem 1rem",
                }}
                data-testid="button-order-bundle"
                aria-label={`Commander ${bundle.name}`}
              >
                {bundle.ctaLabel} →
              </button>
            </div>
          )}
        </div>

        {/* Bloc confiance */}
        <div
          className="mt-3 p-3"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 14,
          }}
          data-testid="block-trust"
        >
          <p className="text-[10px] uppercase tracking-wider font-bold leading-none mb-2" style={{ color: "#6ee7b7" }}>
            Commander en confiance
          </p>
          <ul className="space-y-1.5 text-[12px] leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6ee7b7" }} className="font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold" style={{ color: "#f3f0ff" }}>Paiement à la livraison</span> — tu ne paies que quand tu reçois ton colis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6ee7b7" }} className="font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold" style={{ color: "#f3f0ff" }}>Livraison express</span> sous 24–48h dans les grandes villes, partout ailleurs en 3–5 jours.</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6ee7b7" }} className="font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold" style={{ color: "#f3f0ff" }}>Une conseillère GlowScan</span> te confirme la commande sur WhatsApp avant l'envoi.</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6ee7b7" }} className="font-bold flex-shrink-0">✓</span>
              <span><span className="font-semibold" style={{ color: "#f3f0ff" }}>Produits 100% authentiques</span>, sélectionnés pour les peaux africaines.</span>
            </li>
          </ul>
        </div>
      </MedCard>

      {/* ═══ BLOC 5 — Analyse complète (zones) ═══ */}
      {(zoneAnalysis.length > 0 || (result.zones && result.zones.length > 0)) && (
        <MedCard violet testId="block-zone-analysis">
          <div className="flex items-center gap-2 mb-2">
            <ScanLine className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h2 className="text-[15px] font-bold" style={{ color: "#f3f0ff" }}>Analyse complète</h2>
          </div>
          {result.zones && result.zones.length > 0 && (
            <div className="mb-3" data-testid="block-face-map">
              <p
                className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Carte des zones
              </p>
              <FaceZonesMap zones={result.zones} />
            </div>
          )}
          {zoneAnalysis.length > 0 && (
            <div>
              {zoneAnalysis.map((zone, i) => (
                <ZoneRow key={i} zone={zone} index={i} />
              ))}
            </div>
          )}
        </MedCard>
      )}

      {/* ═══ BLOC 6 — Protocole de soin ═══ */}
      <MedCard violet testId="block-protocol">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
          <h2 className="text-[15px] font-bold" style={{ color: "#f3f0ff" }}>Mon protocole de soin</h2>
        </div>
        <p className="text-[11px] italic mb-3" style={{ color: "rgba(200,185,255,0.5)" }}>
          Applique-le 4 à 6 semaines avant de réévaluer.
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sun className="w-4 h-4" style={{ color: "#fbbf24" }} />
              <h3 className="text-[13px] font-bold" style={{ color: "#f3f0ff" }}>🌅 Matin</h3>
            </div>
            <ol className="space-y-1.5 ml-1">
              {protocolMorning.map((s, i) => (
                <ProtocolRow key={i} index={i + 1} step={s} compact />
              ))}
              {protocolMorning.length === 0 && (
                <li className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>Aucune étape disponible.</li>
              )}
            </ol>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Moon className="w-4 h-4" style={{ color: "#c4b5fd" }} />
              <h3 className="text-[13px] font-bold" style={{ color: "#f3f0ff" }}>🌙 Soir</h3>
            </div>
            <ol className="space-y-1.5 ml-1">
              {protocolEvening.map((s, i) => (
                <ProtocolRow key={i} index={i + 1} step={s} compact />
              ))}
              {protocolEvening.length === 0 && (
                <li className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>Aucune étape disponible.</li>
              )}
            </ol>
          </div>
          {result.recommendations?.weekly && (
            <div
              className="p-2.5"
              style={{
                background: "rgba(167,139,250,0.06)",
                border: "1px solid rgba(167,139,250,0.18)",
                borderRadius: 12,
              }}
            >
              <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "#a78bfa" }}>Hebdo</p>
              <p className="text-[12px] leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>
                {result.recommendations.weekly}
              </p>
            </div>
          )}
        </div>
      </MedCard>

      {severityLevel >= 4 && (
        <div
          className="px-3.5 py-2.5 flex items-start gap-2"
          style={{
            background: "rgba(233,30,140,0.08)",
            border: "1px solid rgba(233,30,140,0.2)",
            borderRadius: 20,
          }}
          data-testid="alert-severity-high"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f9a8d4" }} />
          <p className="text-[12px] leading-snug" style={{ color: "#f9a8d4" }}>
            <span className="font-bold">Consultation dermatologique recommandée</span> — {severityLabel.toLowerCase()} (niveau {severityLevel}/5).
          </p>
        </div>
      )}

      {/* ═══ BLOC 7 — Message de rétention ═══ */}
      <div
        className="px-4 py-3 text-center"
        style={{
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.18)",
          borderRadius: 24,
        }}
        data-testid="block-retention-message"
      >
        <p className="text-[13px] font-bold leading-snug" style={{ color: "#c4b5fd" }}>
          ✨ Suis ta routine 4 semaines et reviens scanner —
        </p>
        <p className="text-[12px] leading-snug mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
          on mesurera ensemble tes vrais progrès.{" "}
          <span className="font-semibold" style={{ color: "#a78bfa" }}>Rescan offert</span> au bout du parcours 🎁
        </p>
      </div>

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
      <span
        className="flex-shrink-0 w-6 h-6 text-[11px] font-bold flex items-center justify-center mt-0.5"
        style={{
          background: "#7c3aed",
          color: "#fff",
          borderRadius: 9999,
        }}
      >
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`${compact ? "text-[13px]" : "text-[14px]"} font-bold leading-tight`}
          style={{ color: "#f3f0ff" }}
        >
          {step.step}
        </p>
        {step.product && (
          <p className="text-[12px] font-medium leading-snug" style={{ color: "#a78bfa" }}>
            {step.product}
          </p>
        )}
        {!compact && step.why && (
          <p className="text-[12px] italic leading-snug mt-1" style={{ color: "rgba(200,185,255,0.5)" }}>
            {step.why}
          </p>
        )}
      </div>
    </li>
  );
}
