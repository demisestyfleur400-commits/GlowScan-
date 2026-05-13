import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, AlertTriangle, Eye, Droplets, ShieldAlert, Scan as ScanIcon, Share2, Truck, ChevronRight, Swords, ImageIcon, Lock, Sun, Moon, Calendar, ScanFace, Bell, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { ShareCard } from "./ShareCard";
import FaceZonesMap from "./FaceZonesMap";
import { RoutineShareCard } from "./RoutineShareCard";
import OrderModal, { type OrderItem } from "./OrderModal";
import MedicalReport from "./MedicalReport";
import { catalog, getProductBrand, getBrandByWhatsapp, formatPrice } from "@shared/catalog";
import { productImages as centralProductImages } from "@/lib/productImages";
import { trackWhatsappClick } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
const productImages = centralProductImages;

const SOCIAL_PROOF: Record<string, number> = {
  "creme-visage": 31, "serum-jeunesse": 27, "gel-contour-yeux": 19,
  "potion-lumiere": 23, "solution-douceur": 17, "cocon-lumineux": 22,
  "tresor-cacao": 18, "gel-douche-eclat": 29, "gommage-eclat": 14,
  "savon-corps": 33, "serum-mains-pieds": 16, "huile-eclat": 21,
  "shampooing-chebe": 24, "huile-chebe": 20, "creme-chebe": 15,
  "serum-hairbloom": 13,
  "garnier-eau-micellaire": 142, "garnier-creme-spf": 98,
  "garnier-vitaminc-serum": 178, "ambi-fade-cream": 134,
  "lrp-effaclar-duo": 219, "neutrogena-acne-gel": 156,
  "bioderma-sensibio": 264, "loreal-glycolic-bright": 89,
  "kojie-san-soap": 203, "fair-white-vitaminc": 167,
  "ambi-body-lotion": 112, "africas-best-olive-oil": 88,
  "jamaican-castor-oil": 143, "head-shoulders-shampoo": 321,
  "neutrogena-hydro-boost": 187, "cerave-creme": 243,
  "lrp-effaclar-gel": 167, "nivea-creme-visage": 312,
  "nivea-cocoa-butter-lotion": 289, "dove-lait-corporel": 198,
  "vaseline-intensive-care": 276, "palmers-cocoa-butter": 154,
  "pantene-prov-shampoo": 133, "dark-lovely-creme": 89,
  "cantu-shea-butter": 201, "ors-olive-oil": 76, "schwarzkopf-gliss": 112,
};

function getSocialProof(productId: string): number {
  if (SOCIAL_PROOF[productId]) return SOCIAL_PROOF[productId];
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = ((h << 5) - h + productId.charCodeAt(i)) | 0;
  return 8 + (Math.abs(h) % 20);
}

// Note moyenne déterministe entre 4.6 et 4.9 par produit
function getProductRating(productId: string): string {
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = ((h << 5) - h + productId.charCodeAt(i)) | 0;
  const r = 46 + (Math.abs(h) % 4); // 46..49
  return (r / 10).toFixed(1);
}

// Liste des problèmes détectés à partir du résultat de l'analyse
interface DiagnosticProblem {
  icon: string;
  label: string;
  key: string; // utile pour matcher avec les targets produit
}
function deriveDiagnosticProblems(result: AnalysisResult): DiagnosticProblem[] {
  const b = result.balance || { inflammation: 0, sebum: 0, pores: 0, sensitivity: 0, scars: 0 };
  const score = result.score || 0;
  const zonesText = (result.zones || []).map((z: any) => z.name || z.zone || "").join(" ").toLowerCase();
  const out: DiagnosticProblem[] = [];

  // 1) Acné active
  if ((b.inflammation || 0) >= 4) {
    let zone = "";
    if (zonesText.includes("zone t") || zonesText.includes("front") || zonesText.includes("nez") || zonesText.includes("menton")) zone = " — zone T";
    else if (zonesText.includes("joue")) zone = " — joues";
    const niveau = (b.inflammation || 0) >= 7 ? "sévère" : (b.inflammation || 0) >= 5 ? "modérée" : "active";
    out.push({ icon: "🔴", label: `Acné ${niveau}${zone}`, key: "acne" });
  }

  // 2) Hydratation
  const hydration = Math.min(100, Math.max(10, Math.round(85 - (b.sebum || 0) * 5 + (score - 50) * 0.2)));
  if (hydration < 75) {
    const niveau = hydration < 45 ? "sévère" : hydration < 60 ? "modérée" : "légère";
    out.push({ icon: "💧", label: `Déshydratation ${niveau}`, key: "hydratation" });
  }

  // 3) Taches / hyperpigmentation
  if ((b.scars || 0) >= 3) {
    const niveau = (b.scars || 0) >= 6 ? "marquées" : (b.scars || 0) >= 4 ? "visibles" : "début de";
    out.push({ icon: "🟤", label: `${niveau === "début de" ? "Début de taches" : `Taches ${niveau}`} post-inflammatoires`, key: "taches" });
  }

  // 4) Pores dilatés
  if ((b.pores || 0) >= 5) {
    out.push({ icon: "🕳️", label: "Pores dilatés", key: "pores" });
  }

  // 5) Sensibilité
  if ((b.sensitivity || 0) >= 5) {
    out.push({ icon: "🌡️", label: "Peau sensible / réactive", key: "sensibilite" });
  }

  // Si rien de détecté, on rassure
  if (out.length === 0) {
    out.push({ icon: "✨", label: "Peau globalement équilibrée", key: "equilibre" });
  }

  return out;
}

// Normalise une chaîne : supprime les accents et passe en minuscules
function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Étiquette de la zone ciblée par le produit selon sa catégorie
function getProductTargetArea(product: any): "ta peau" | "tes cheveux" | "ton corps" {
  if (product?.category === "cheveux") return "tes cheveux";
  if (product?.category === "corps") return "ton corps";
  return "ta peau";
}

// Map les problèmes détectés vers une raison "Recommandé pour : X + Y" basée sur le produit
function getProductMatchReasons(product: any, problems: DiagnosticProblem[]): string {
  const targets = normalize((product.targets || []).join(" "));
  const matched: string[] = [];
  for (const p of problems) {
    if (p.key === "acne" && /acn|imperfection|sebum|bouton|points? noirs|comedon/.test(targets)) matched.push("acné");
    else if (p.key === "hydratation" && /hydrat|deshydrat|hyaluron|barriere|seche|nutri/.test(targets)) matched.push("peau déshydratée");
    else if (p.key === "taches" && /tache|hyperpigment|eclat|brillance|vitamin c|fade|kojic|glycol|teint irregulier/.test(targets)) matched.push("taches");
    else if (p.key === "pores" && /pore/.test(targets)) matched.push("pores dilatés");
    else if (p.key === "sensibilite" && /sensible|sensibilit|apaisant|rougeur|reactif/.test(targets)) matched.push("peau sensible");
  }
  // Dédoublonner et limiter à 2
  const uniq = Array.from(new Set(matched)).slice(0, 2);
  if (uniq.length === 0) {
    if (product.category === "cheveux") return "nourrir et fortifier ta fibre capillaire";
    if (product.category === "corps") return "garder ton corps doux et hydraté";
    return "préserver l'équilibre de ta peau";
  }
  return uniq.join(" + ");
}

// Mini phrase d'expert par catégorie de produit
function getProductBenefit(product: any, problems: DiagnosticProblem[]): string {
  const name = normalize(product.name || "");
  const targets = normalize((product.targets || []).join(" "));
  const hasAcne = problems.some(p => p.key === "acne");
  const hasDry = problems.some(p => p.key === "hydratation");
  const hasTaches = problems.some(p => p.key === "taches");

  // SPF / protection solaire en premier (sinon shadowé par crème/lotion)
  if (/spf|protection solaire|sun ?screen/.test(name) || /spf|uv|protection solaire/.test(targets)) {
    return "Une protection quotidienne indispensable pour préserver ta peau et éviter de nouvelles taches.";
  }
  if (/serum/.test(name) && (/vitamin c|eclat|fade|kojic|glycol/.test(targets) || hasTaches)) {
    return "Ce sérum atténue visiblement les taches en 4 à 6 semaines tout en illuminant le teint.";
  }
  if (/serum/.test(name) && (hasAcne || /acn|imperfection|sebum/.test(targets))) {
    return "Ce sérum réduit les boutons visibles en 2 semaines tout en réhydratant en profondeur.";
  }
  if (/serum/.test(name)) {
    return "Ce sérum agit en profondeur dès les premières applications.";
  }
  if (/creme|lotion|baume/.test(name) && (hasDry || /hydrat|barriere|seche|nutri/.test(targets))) {
    return "Cette crème nourrit en profondeur et rétablit la barrière de ta peau.";
  }
  if (/nettoyant|gel|micellaire|savon|gommage/.test(name)) {
    return "Ce nettoyant purifie sans agresser et prépare ta peau aux soins suivants.";
  }
  if (product.category === "cheveux") {
    return "Soin ciblé qui nourrit la fibre et stimule la pousse semaine après semaine.";
  }
  return "Sélectionné spécialement pour répondre à TON diagnostic, pas un produit générique.";
}


interface ResultCardProps {
  result: AnalysisResult;
  scanId?: number | null;
  area?: string;
  imageUrl?: string | null;
  userFirstName?: string | null;
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
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const dataPoints = labels.map((l, i) => {
    const val = balance[l.key as keyof typeof balance] || 0;
    return getPoint(i, val);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {gridLevels.map((level) => {
        const points = labels.map((_, i) => {
          const p = getPoint(i, level * 10);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={level} points={points} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />;
      })}

      {labels.map((_, i) => {
        const p = getPoint(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="0.5" />;
      })}

      <path d={dataPath} fill="rgba(233, 30, 140, 0.15)" stroke="#E91E8C" strokeWidth="2" />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#E91E8C" stroke="white" strokeWidth="2" />
      ))}

      {labels.map((l, i) => {
        const p = getPoint(i, 12.5);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 text-[8px] font-bold uppercase">
            {l.label}
          </text>
        );
      })}
    </svg>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || "modérée";
  let bg = "bg-pink-100 text-pink-700 border-pink-200";
  let icon = <AlertTriangle className="w-3 h-3" />;
  if (s.includes("lég")) {
    bg = "bg-emerald-100 text-emerald-700 border-emerald-200";
  } else if (s.includes("sév")) {
    bg = "bg-rose-100 text-rose-700 border-rose-200";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${bg}`}>
      {icon} {severity}
    </span>
  );
}

// Découpe un texte en phrases — compatible Safari/iOS anciens (pas de lookbehind)
function splitSentences(text: string): string[] {
  return text.replace(/([.!?])\s+/g, "$1\u0000").split("\u0000").filter(Boolean);
}

// ── Composant Insights Prédictifs ──────────────────────────────
function PredictiveInsightsCard({ insights }: { insights: NonNullable<AnalysisResult["predictiveInsights"]> }) {
  const [open, setOpen] = useState(false);

  const levelConfig = {
    high:   { bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500",    text: "text-red-700",   label: "Risque élevé" },
    medium: { bg: "bg-orange-50", border: "border-orange-200",dot: "bg-orange-400", text: "text-orange-700",label: "Risque modéré" },
    low:    { bg: "bg-yellow-50", border: "border-yellow-200",dot: "bg-yellow-400", text: "text-yellow-700", label: "Risque faible" },
  };

  const trendConfig = {
    improving: { icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, label: "en amélioration", color: "text-emerald-600" },
    worsening: { icon: <TrendingDown className="w-4 h-4 text-red-500" />,  label: "en dégradation",  color: "text-red-600" },
    stable:    { icon: <Minus className="w-4 h-4 text-gray-400" />,        label: "stable",           color: "text-gray-500" },
  };

  const highCount = insights.risks.filter(r => r.level === "high").length;

  return (
    <div className="rounded-3xl overflow-hidden border border-pink-200 shadow-sm" data-testid="predictive-insights-card">
      {/* Header — toujours visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-pink-50 to-pink-100"
        data-testid="button-toggle-predictive"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-pink-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-extrabold text-gray-900">Radar prédictif</p>
            <p className="text-xs text-pink-700">
              {highCount > 0 ? `${highCount} risque${highCount > 1 ? "s" : ""} élevé${highCount > 1 ? "s" : ""} détecté${highCount > 1 ? "s" : ""}` : `${insights.risks.length} risque${insights.risks.length > 1 ? "s" : ""} analysé${insights.risks.length > 1 ? "s" : ""}`}
              {insights.progression && ` · suivi ${insights.progression.weeksTracked} sem.`}
            </p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-pink-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {/* Contenu dépliable */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-white"
          >
            <div className="px-5 pb-5 pt-3 space-y-3">

              {/* Progression Type 3 */}
              {insights.progression && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  {trendConfig[insights.progression.trend].icon}
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${trendConfig[insights.progression.trend].color}`}>
                      {insights.progression.delta > 0 ? "+" : ""}{insights.progression.delta} pts vs scan précédent
                      <span className="font-normal text-gray-400 ml-1">({trendConfig[insights.progression.trend].label})</span>
                    </p>
                    <p className="text-xs text-gray-400">Score précédent : {insights.progression.previousScore}/100 · suivi depuis {insights.progression.weeksTracked} semaine{insights.progression.weeksTracked > 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}

              {/* Risques Type 1 */}
              {insights.risks.map((r, i) => {
                const cfg = levelConfig[r.level] || levelConfig.low;
                return (
                  <div key={i} className={`p-3 rounded-xl border ${cfg.bg} ${cfg.border}`} data-testid={`risk-item-${i}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label} · {r.delay}</span>
                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{r.risk}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Fenêtre d'action Type 2 */}
              {insights.actionWindow && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-pink-50 border border-pink-200">
                  <AlertTriangle className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-pink-700 font-medium leading-relaxed">{insights.actionWindow}</p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ResultCard({ result, scanId, area, imageUrl, userFirstName }: ResultCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRoutineCard, setShowRoutineCard] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [j7ReminderSet, setJ7ReminderSet] = useState(false);
  const [showExpertDetails, setShowExpertDetails] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalItems, setOrderModalItems] = useState<OrderItem[]>([]);
  const [orderModalTitle, setOrderModalTitle] = useState("");
  const [challenge30, setChallenge30] = useState<{ startedAt: string; area: string; initialScore: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("glowscan_challenge_30");
      if (raw) setChallenge30(JSON.parse(raw));
    } catch {}
  }, []);



  const detectArea = (): "visage" | "corps" | "cheveux" => {
    if (area === "hair") return "cheveux";
    if (area === "body") return "corps";
    if (area === "face") return "visage";
    const condition = (result.condition || "").toLowerCase();
    const details = (result.details || "").toLowerCase();
    const text = condition + " " + details;
    if (text.includes("cheveu") || text.includes("capillaire") || text.includes("cuir chevelu")) return "cheveux";
    if (text.includes("corps") || text.includes("vergeture") || text.includes("coude") || text.includes("genou")) return "corps";
    return "visage";
  };

  const currentArea = detectArea();

  const getProductRole = (p: typeof catalog[0]): "nettoyant" | "serum" | "creme" => {
    const n = p.name.toLowerCase();
    if (n.includes("savon") || n.includes("soap") || n.includes("gel de douche") || n.includes("gel douche") || n.includes("gommage") || n.includes("shampoo") || n.includes("shampoing") || n.includes("clarifiant") || n.includes("nettoyant") || n.includes("cleansing")) return "nettoyant";
    if (n.includes("sérum") || n.includes("serum") || n.includes("huile") || n.includes("oil") || n.includes("lotion") || n.includes("tonic") || n.includes("tonique") || n.includes("potion") || n.includes("spray") || n.includes("poudre")) return "serum";
    return "creme";
  };

  const findRoutineProducts = () => {
    const condition = (result.condition || "").toLowerCase();
    const details = (result.details || "").toLowerCase();
    const searchText = condition + " " + details;

    const areaProducts = catalog.filter(p => {
      if (currentArea === "cheveux") return p.category === "cheveux";
      if (currentArea === "corps") return p.category === "corps" || p.category === "visage";
      return p.category === "visage";
    });

    const scoreProduct = (p: typeof catalog[0]) => {
      let s = 0;
      for (const t of p.targets) {
        if (searchText.includes(t.toLowerCase())) s += 3;
      }
      const nameParts = p.name.toLowerCase().split(/[\s–\-]+/);
      for (const part of nameParts) {
        if (part.length > 3 && searchText.includes(part)) s += 2;
      }
      return s;
    };

    const roleLabels: Record<string, { emoji: string; label: string }> = {
      nettoyant: { emoji: "🧴", label: currentArea === "cheveux" ? "Shampooing" : "Nettoyant" },
      serum: { emoji: "💧", label: currentArea === "cheveux" ? "Huile / Sérum" : "Sérum / Traitement" },
      creme: { emoji: "🧴", label: currentArea === "cheveux" ? "Masque / Crème" : "Crème hydratante" },
    };

    // ─── Règle "tous même source" ─────────────────────────────────────
    // Une routine = soit 100% une seule marque locale, soit 100% international.
    // Aucun mélange (= 1 seule livraison + cohérence de gamme).
    // À score égal : on PRIVILÉGIE LES MARQUES LOCALES.
    // ────────────────────────────────────────────────────────────────────
    const internationals = areaProducts.filter(p => !p.whatsapp);
    const localsByBrand = new Map<string, typeof catalog>();
    for (const p of areaProducts.filter(x => x.whatsapp)) {
      const k = p.whatsapp as string;
      if (!localsByBrand.has(k)) localsByBrand.set(k, []);
      localsByBrand.get(k)!.push(p);
    }

    type Source = { products: typeof catalog; total: number; brandKey: string };
    const buildSource = (pool: typeof catalog, brandKey: string): Source | null => {
      const nettoyants = pool.filter(p => getProductRole(p) === "nettoyant").sort((a, b) => scoreProduct(b) - scoreProduct(a));
      const serums     = pool.filter(p => getProductRole(p) === "serum").sort((a, b) => scoreProduct(b) - scoreProduct(a));
      const cremes     = pool.filter(p => getProductRole(p) === "creme").sort((a, b) => scoreProduct(b) - scoreProduct(a));
      const picked: typeof catalog = [];
      const tryAdd = (arr: typeof catalog) => {
        const next = arr.find(x => !picked.some(y => y.id === x.id));
        if (next) picked.push(next);
      };
      tryAdd(nettoyants);
      tryAdd(serums);
      tryAdd(cremes);
      // Compléter jusqu'à 3 si un rôle manque dans cette source
      const rest = pool
        .filter(p => !picked.some(y => y.id === p.id))
        .sort((a, b) => scoreProduct(b) - scoreProduct(a));
      while (picked.length < 3 && rest.length) picked.push(rest.shift()!);
      if (picked.length < 3) return null;
      return { products: picked, total: picked.reduce((s, p) => s + scoreProduct(p), 0), brandKey };
    };

    const candidates: Source[] = [];
    const intl = buildSource(internationals, "international");
    if (intl) candidates.push(intl);
    for (const [waKey, brandProducts] of Array.from(localsByBrand.entries())) {
      const c = buildSource(brandProducts, waKey);
      if (c) candidates.push(c);
    }

    // Tri : score décroissant ; à égalité → marques LOCALES en premier
    candidates.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (a.brandKey === "international") return 1;
      if (b.brandKey === "international") return -1;
      return 0;
    });

    // Fallback si vraiment aucune source ne rassemble 3 produits
    let winner: Source | null = candidates[0] || null;
    if (!winner) {
      // Dernier recours : 3 meilleurs internationaux ou marque la plus fournie
      const fallbackPool = internationals.length >= 3
        ? internationals
        : (Array.from(localsByBrand.values()).sort((a, b) => b.length - a.length)[0] || areaProducts);
      const sorted = [...fallbackPool].sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, 3);
      if (sorted.length === 0) return [];
      winner = { products: sorted, total: 0, brandKey: sorted[0].whatsapp || "international" };
    }

    return winner.products.map((p, i) => {
      const role = getProductRole(p);
      return {
        product: p,
        role: roleLabels[role] || roleLabels["creme"],
        index: i + 1,
      };
    });
  };

  const routineProducts = findRoutineProducts();

  const getProductDetails = (name: string) => {
    const nameLower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameWords = nameLower.split(/[\s,–\-']+/).filter(w => w.length > 2);

    let bestMatch: (typeof catalog)[0] | undefined;
    let bestScore = 0;

    for (const p of catalog) {
      const pName = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let score = 0;

      if (pName.includes(nameLower) || nameLower.includes(pName)) {
        score += 100;
      }

      const pWords = pName.split(/[\s,–\-']+/).filter(w => w.length > 2);
      for (const w of nameWords) {
        if (pWords.some(pw => pw.includes(w) || w.includes(pw))) score += 10;
      }

      for (const t of p.targets) {
        const tNorm = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nameLower.includes(tNorm)) score += 5;
        for (const w of nameWords) {
          if (tNorm.includes(w)) score += 2;
        }
      }

      if (p.id && nameLower.includes(p.id.replace(/-/g, " "))) score += 15;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    return bestScore >= 4 ? bestMatch : undefined;
  };

  const getWhatsAppLink = (product: any, imageUrl?: string | null) => {
    const fullImageUrl = imageUrl ? `${window.location.origin}${imageUrl}` : null;
    const message = fullImageUrl
      ? `Bonjour! Je viens de GlowScan.\n\nJe suis intéressé(e) par *${product.name}*.\n\nVoir le produit: ${fullImageUrl}\n\nMerci!`
      : `Bonjour! Je viens de GlowScan.\n\nJe suis intéressé(e) par *${product.name}*.\n\nMerci!`;
    const phone = product.whatsapp.replace(/\+/g, "").replace(/\s/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-500";
    if (score >= 50) return "text-pink-500";
    return "text-rose-500";
  };

  const scoreRing = (score: number) => {
    if (score >= 75) return "from-emerald-400 to-emerald-600";
    if (score >= 50) return "from-pink-400 to-pink-600";
    return "from-rose-400 to-rose-600";
  };

  const findBudgetProduct = () => {
    const condition = (result.condition || "").toLowerCase();
    const details = (result.details || "").toLowerCase();
    const searchText = condition + " " + details;

    const budgetProducts = catalog.filter(p => p.price && p.price >= 2000 && p.price <= 3000);
    if (budgetProducts.length === 0) return null;

    const pool = budgetProducts;

    let best: typeof budgetProducts[0] | null = null;
    let bestScore = 0;

    for (const p of pool) {
      let matchScore = 0;
      for (const t of p.targets) {
        if (searchText.includes(t.toLowerCase())) matchScore += 3;
      }
      if (searchText.includes(p.category)) matchScore += 1;
      const nameParts = p.name.toLowerCase().split(/[\s–-]+/);
      for (const part of nameParts) {
        if (part.length > 3 && searchText.includes(part)) matchScore += 2;
      }
      if (matchScore > bestScore) {
        bestScore = matchScore;
        best = p;
      }
    }

    if (!best) {
      best = pool[0];
    }

    return best;
  };

  const featuredProduct = findBudgetProduct();

  const delay = (i: number) => ({ delay: i * 0.08 });

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* ═══════════════════════════════════════════
                NOUVEAU RAPPORT MÉDICAL — 9 BLOCS
                ═══════════════════════════════════════════ */}
            <MedicalReport
              result={result}
              scanId={scanId}
              area={area}
              imageUrl={imageUrl}
              userFirstName={userFirstName}
              previousScore={result.predictiveInsights?.progression?.previousScore ?? null}
            />

            {/* ── (Ancien contenu masqué — remplacé par MedicalReport) ── */}
            {false && (
            <>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-end mb-2">
                <SeverityBadge severity={result.severity} />
              </div>
              <div className="text-center mb-5" data-testid="diagnostic-header">
                <h2 className="text-2xl font-black text-gray-900 leading-tight font-display tracking-tight">
                  Ton diagnostic est prêt <span aria-hidden="true">✨</span>
                </h2>
                <p className="text-[13px] text-gray-500 mt-2 leading-snug">
                  L'IA a analysé ta peau en détail.
                </p>
                <p className="text-[13px] text-gray-500 leading-snug">
                  Voici ce qu'on a détecté pour toi.
                </p>
              </div>

              {/* Gauge speedometer */}
              {(() => {
                const ARC_LEN = 251.33;
                const filledLen = (result.score / 100) * ARC_LEN;
                return (
                  <>
                    <div className="flex flex-col items-center mb-4">
                      <svg viewBox="0 0 200 115" className="w-52" aria-label={`Glow Score ${result.score}/100`}>
                        <defs>
                          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="35%" stopColor="#f59e0b" />
                            <stop offset="65%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#1B5E20" />
                          </linearGradient>
                        </defs>
                        <path d="M 20,100 A 80,80 0 0 1 180,100" fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
                        <path d="M 20,100 A 80,80 0 0 1 180,100" fill="none" stroke="url(#gauge-grad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${filledLen} ${ARC_LEN}`} strokeDashoffset={0} />
                        <text x="12" y="113" fill="#d1d5db" fontSize="7" fontWeight="700">0</text>
                        <text x="96" y="18" fill="#d1d5db" fontSize="7" fontWeight="700" textAnchor="middle">50</text>
                        <text x="182" y="113" fill="#d1d5db" fontSize="7" fontWeight="700">100</text>
                        <text x="100" y="90" fill="#111827" fontSize="30" fontWeight="900" textAnchor="middle" data-testid="text-score">{result.score}</text>
                        <text x="100" y="103" fill="#9ca3af" fontSize="8" textAnchor="middle">Glow Score</text>
                      </svg>
                    </div>

                  </>
                );
              })()}

              {/* ── Problèmes détectés sur ta peau ── */}
              {(() => {
                const problems = deriveDiagnosticProblems(result);
                return (
                  <div className="mt-2 space-y-2" data-testid="section-problems">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-1">Détecté pour toi</p>
                    {/* Type de peau en premier */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-violet-50 border border-violet-100" data-testid="problem-skin-type">
                      <span className="text-xl flex-shrink-0">🌺</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-violet-600">Type de peau</p>
                        <p className="text-sm font-bold text-violet-900 leading-tight">{result.skinType}</p>
                      </div>
                    </div>
                    {problems.map((p, i) => (
                      <div
                        key={p.key + i}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-pink-50 border border-pink-100"
                        data-testid={`problem-${p.key}`}
                      >
                        <span className="text-xl flex-shrink-0">{p.icon}</span>
                        <p className="text-sm font-bold text-gray-800 leading-tight flex-1">{p.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* ── Analyse expert (juste après le Glow Score) ── */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-pink-600" />
                  </div>
                  <h3 className="text-base font-black text-gray-900">Analyse expert</h3>
                </div>
                <button
                  onClick={() => setShowExpertDetails(v => !v)}
                  data-testid="button-toggle-expert-details"
                  className="flex items-center gap-1 text-xs font-bold text-pink-600 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                >
                  {showExpertDetails ? "Réduire" : "Voir détails"}
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showExpertDetails ? "rotate-90" : ""}`} />
                </button>
              </div>

              {/* Résumé toujours visible (2 premières phrases) */}
              <p className="text-sm text-gray-600 leading-relaxed" data-testid="text-details-summary">
                {result.details ? splitSentences(result.details).slice(0, 2).join(" ") : ""}
                {!showExpertDetails && result.details && splitSentences(result.details).length > 2 && (
                  <span className="text-gray-400"> …</span>
                )}
              </p>

              {/* Détails complets — affichés si showExpertDetails */}
              {showExpertDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm text-gray-600 leading-relaxed mt-2" data-testid="text-details-full">
                    {result.details ? splitSentences(result.details).slice(2).join(" ") : ""}
                  </p>
                </motion.div>
              )}

              {result.motivation && (
                <div className="mt-4 p-4 rounded-2xl bg-pink-50 border border-pink-100">
                  <p className="text-sm font-bold text-pink-700 italic" data-testid="text-motivation">"{result.motivation}"</p>
                </div>
              )}
            </div>

            {/* ── Carte visuelle des zones de la peau ── */}
            {result.zones && result.zones.length > 0 && (
              <FaceZonesMap zones={result.zones} />
            )}

            {/* ── Grille de conversion pour les non-inscrits ── */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-pink-100"
                data-testid="content-gate"
              >
                {/* Barre accent */}
                <div className="h-1 w-full bg-gradient-to-r from-pink-400 via-emerald-400 to-pink-500" />
                <div className="p-5 space-y-4">
                  {/* Titre */}
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto mb-2">
                      <Lock className="w-5 h-5 text-pink-600" />
                    </div>
                    <h3 className="text-base font-black text-gray-900">Débloquer ton analyse complète</h3>
                    <p className="text-xs text-gray-500 mt-1">Crée ton compte gratuit pour accéder à :</p>
                  </div>

                  {/* Ce qu'ils vont débloquer avec le compte gratuit */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: "📊", label: "Métriques complètes", sub: "Âge cutané, hydratation...", free: true },
                      { icon: "🧠", label: "Analyse expert IA", sub: "Diagnostic détaillé", free: true },
                      { icon: "📈", label: "Historique & graphique", sub: "Suivi dans le temps", free: true },
                      { icon: "🧴", label: "Routine & produits", sub: "Premium — 500 FCFA/sem.", free: false },
                    ].map(({ icon, label, sub, free }) => (
                      <div key={label} className={`flex items-start gap-2 rounded-xl p-2.5 border ${free ? "bg-pink-50/60 border-pink-100" : "bg-pink-50/40 border-pink-200"}`}>
                        <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
                        <div>
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">{label}</p>
                          <p className={`text-[9px] mt-0.5 ${free ? "text-pink-600 font-semibold" : "text-pink-600 font-semibold"}`}>
                            {free ? "✓ Gratuit" : "⭐ " + sub}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA principal */}
                  <a
                    href="/auth"
                    data-testid="button-gate-register"
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-emerald-500 text-white font-black text-sm shadow-lg shadow-pink-100/60 active:scale-[0.98] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Créer mon compte — gratuit
                  </a>

                  {/* Lien secondaire */}
                  <p className="text-center text-xs text-gray-400">
                    Déjà inscrit ?{" "}
                    <a href="/auth" className="font-bold text-pink-600 underline underline-offset-2">
                      Me connecter
                    </a>
                  </p>

                  {/* Petite preuve sociale */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <div className="flex -space-x-1.5">
                      {["bg-pink-500","bg-rose-400","bg-pink-400","bg-violet-400"].map((c,i) => (
                        <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-white flex items-center justify-center`}>
                          <span className="text-[7px] text-white font-black">✓</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">+2 400 personnes ont déjà leur routine</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stats 3 colonnes */}
            {user && <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Type Peau", value: result.skinType, icon: <Droplets className="w-3.5 h-3.5 text-pink-500" /> },
                { label: "Lésions", value: result.stats?.lesions || "—", icon: <Eye className="w-3.5 h-3.5 text-rose-500" /> },
                { label: "Pores", value: result.stats?.pores || "—", icon: <ScanIcon className="w-3.5 h-3.5 text-pink-500" /> },
                { label: "Marques", value: result.stats?.marks || "—", icon: <ShieldAlert className="w-3.5 h-3.5 text-pink-500" /> },
                { label: "Zones", value: result.stats?.zones || "—", icon: <AlertTriangle className="w-3.5 h-3.5 text-purple-500" /> },
                { label: "Score", value: `${result.score}%`, icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {stat.icon}
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{stat.label}</span>
                  </div>
                  <p className="text-sm font-black text-gray-900 leading-tight">{stat.value}</p>
                </div>
              ))}
            </div>}

            {/* Radar Chart — Équilibre cutané */}
            {user && result.balance && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-4">Equilibre Cutané</p>
                <RadarChart balance={result.balance} />
              </div>
            )}

            {/* ── Écran 2 — Pont vers les produits ── */}
            {user && routineProducts.length > 0 && (
              <div
                className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-3xl p-6 shadow-lg shadow-pink-200/40 text-white text-center"
                data-testid="bridge-to-products"
              >
                <div className="text-3xl mb-2">🧴</div>
                <h3 className="text-xl font-black leading-tight">Ta routine sur-mesure est prête</h3>
                <p className="text-[13px] font-medium text-pink-50/95 mt-2 leading-relaxed">
                  Basée sur <span className="font-black">TON</span> diagnostic, GlowScan a sélectionné les produits qui correspondent exactement à ta peau.
                </p>
                <p className="text-[12px] font-bold text-pink-100 mt-2">
                  Pas du hasard. Pas du générique. Fait pour toi.
                </p>
                <button
                  onClick={() => {
                    const el = document.getElementById("section-recommended-products");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  data-testid="button-see-products"
                  className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-pink-600 font-black text-sm rounded-2xl active:scale-[0.97] transition-all shadow-md"
                >
                  → Voir mes produits
                </button>
              </div>
            )}

            {/* ── Écran 3 — Cartes produits enrichies ── */}
            {user && routineProducts.length > 0 && (() => {
              const problems = deriveDiagnosticProblems(result);
              return (
                <div
                  id="section-recommended-products"
                  className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100"
                  data-testid="section-recommended-products"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600">Produits pour toi</p>
                      <p className="text-xs text-gray-500 font-medium">Choisis selon TON diagnostic</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {routineProducts.map(({ product, role, index }) => {
                      const img = productImages[product.id];
                      const reasons = getProductMatchReasons(product, problems);
                      const benefit = getProductBenefit(product, problems);
                      const rating = getProductRating(product.id);
                      const proof = getSocialProof(product.id);
                      return (
                        <div
                          key={product.id}
                          className="rounded-3xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/40 overflow-hidden shadow-sm"
                          data-testid={`recommended-product-${index}`}
                        >
                          {/* Top: image + nom */}
                          <div className="flex items-center gap-3 p-4 pb-3">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                              {img
                                ? <img src={img} alt={product.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center bg-pink-50"><Sparkles className="w-5 h-5 text-pink-300" /></div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wide text-pink-600 mb-0.5">{role.emoji} {role.label}</p>
                              <p className="text-base font-black text-gray-900 leading-tight" data-testid={`product-name-${index}`}>{product.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {product.price && <span className="text-sm font-extrabold text-pink-700">{formatPrice(product.price)}</span>}
                                <span className="text-[10px] text-gray-400 font-medium">· {getProductBrand(product)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Recommandé pour */}
                          <div className="mx-4 mb-2 flex items-start gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-100" data-testid={`product-reason-${index}`}>
                            <span className="text-base flex-shrink-0">✅</span>
                            <p className="text-[12px] text-emerald-900 leading-snug">
                              <span className="font-bold">Recommandé pour {getProductTargetArea(product)} :</span> {reasons}
                            </p>
                          </div>

                          {/* Quote / bénéfice */}
                          <div className="mx-4 mb-2 flex items-start gap-2 p-3 rounded-2xl bg-pink-50/70 border border-pink-100" data-testid={`product-benefit-${index}`}>
                            <span className="text-base flex-shrink-0">💬</span>
                            <p className="text-[12px] text-gray-700 italic leading-snug">{benefit}</p>
                          </div>

                          {/* Rating + preuve sociale */}
                          <div className="mx-4 mb-3 flex items-center gap-2 p-2.5 rounded-2xl bg-amber-50 border border-amber-100" data-testid={`product-rating-${index}`}>
                            <span className="text-base">⭐</span>
                            <p className="text-[11px] text-amber-900 leading-tight">
                              <span className="font-black">{rating}/5</span>
                              <span className="text-amber-700"> — {proof} peaux similaires à la tienne ont adoré</span>
                            </p>
                          </div>

                          {/* Pas de bouton individuel — un seul CTA "Commander ma gamme" plus bas */}
                          <div className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Écran 4 — Avant WhatsApp ── */}
            {user && routineProducts.length > 0 && (
              <div
                className="bg-white rounded-3xl p-6 shadow-sm border-2 border-pink-200 text-center"
                data-testid="pre-whatsapp"
              >
                <div className="text-3xl mb-2">🌟</div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  Tu es à 1 étape d'une peau transformée
                </h3>
                <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
                  Ta commande sera préparée spécialement pour ton type de peau.
                </p>
                <ul className="mt-4 space-y-1.5 text-[12px] text-gray-800 leading-snug text-left max-w-xs mx-auto" data-testid="trust-list">
                  <li className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                    <span><span className="font-semibold">Paiement à la livraison</span> — tu ne paies que quand tu reçois.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                    <span><span className="font-semibold">Livraison Douala &amp; Yaoundé</span> sous 24–48h.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                    <span><span className="font-semibold">Une conseillère</span> te confirme tout sur WhatsApp avant l'envoi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                    <span><span className="font-semibold">Produits 100% authentiques</span>, choisis pour les peaux africaines.</span>
                  </li>
                </ul>
                <button
                  onClick={() => {
                    const items: OrderItem[] = routineProducts.map(({ product }) => ({
                      productId: product.id,
                      productName: product.name,
                      brand: getProductBrand(product),
                      price: product.price,
                    }));
                    setOrderModalItems(items);
                    setOrderModalTitle("Confirmer ma commande");
                    setShowOrderModal(true);
                  }}
                  data-testid="button-confirm-whatsapp"
                  className="mt-5 w-full flex items-center justify-center gap-2 py-4 bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm font-black rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-green-200/50"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Confirmer ma commande sur WhatsApp
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            </>
            )}
            {/* ── Fin ancien contenu masqué ── */}


            {/* ── Produit intermédiaire — après analyse expert ── */}
            {user && featuredProduct && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-200 relative overflow-hidden" data-testid="card-budget-product">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600" />
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="text-sm font-black text-gray-900">Pas de budget pour les 3 produits ?</p>
                    <p className="text-xs text-pink-700 font-medium">Commence avec ce produit intermédiaire</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-pink-50 border border-pink-200">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                    {productImages[featuredProduct.id]
                      ? <img src={productImages[featuredProduct.id]} alt={featuredProduct.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center bg-pink-50"><Sparkles className="w-5 h-5 text-pink-300" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight" data-testid="text-budget-product-name">{featuredProduct.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">· {getProductBrand(featuredProduct)}</p>
                    {featuredProduct.price && (
                      <p className="text-base font-extrabold text-pink-700 mt-0.5" data-testid="text-budget-price">{formatPrice(featuredProduct.price)}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOrderModalItems([{ productId: featuredProduct.id, productName: featuredProduct.name, brand: getProductBrand(featuredProduct), price: featuredProduct.price }]);
                    setOrderModalTitle("Commander ce produit");
                    setShowOrderModal(true);
                  }}
                  data-testid="button-budget-whatsapp"
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-green-200/50"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Commander via WhatsApp
                </button>
              </div>
            )}

            {/* ── Insights Prédictifs ── */}
            {result.predictiveInsights && (result.predictiveInsights.risks.length > 0 || result.predictiveInsights.actionWindow || result.predictiveInsights.progression) && (
              <PredictiveInsightsCard insights={result.predictiveInsights} />
            )}

            {/* Boutons de partage */}
            {user && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <p className="text-sm font-bold text-gray-800 text-center" data-testid="text-share-cta">
                  Partage ton analyse
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setShowShareCard(true)}
                    data-testid="button-open-sharecard"
                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                  >
                    <ImageIcon className="w-5 h-5" />
                    Ma carte
                  </button>
                  <button
                    onClick={async () => {
                      if (challengeUrl) {
                        if (navigator.share) navigator.share({ title: "Défi Glow Scan", text: `Je te défie de battre mon score de ${result.score}/100 !`, url: challengeUrl }).catch(() => {});
                        else { navigator.clipboard?.writeText(challengeUrl); toast({ title: "Lien copié !", description: "Envoie-le à ton ami 🥊" }); }
                        return;
                      }
                      setChallengeLoading(true);
                      try {
                        const res = await fetch("/api/challenge/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: result.score, condition: result.condition, area, scanId: scanId ?? undefined }) });
                        const data = await res.json();
                        const url = data.url || `${window.location.origin}/challenge/${data.token}`;
                        setChallengeUrl(url);
                        const text = `🥊 Je te défie de battre mon Glow Score de ${result.score}/100 sur GlowScan ! Clique ici : ${url}`;
                        if (navigator.share) navigator.share({ title: "Défi Glow Scan", text, url }).catch(() => {});
                        else if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text); toast({ title: "Défi créé ! 🥊", description: "Lien copié — envoie-le à ton ami !" }); }
                      } catch { toast({ title: "Erreur", description: "Réessaie plus tard", variant: "destructive" }); }
                      finally { setChallengeLoading(false); }
                    }}
                    disabled={challengeLoading}
                    data-testid="button-challenge-friend"
                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
                  >
                    <Swords className="w-5 h-5" />
                    {challengeLoading ? "..." : challengeUrl ? "Renvoyer" : "Défier"}
                  </button>
                  <button
                    onClick={async () => {
                      const shareText = `🌟 Mon Glow Score est ${result.score}/100 ! Analyse ta peau sur GlowScan 👉 ${window.location.origin}`;
                      if (navigator.share) navigator.share({ title: "Mon Glow Score", text: shareText, url: window.location.origin }).catch(() => {});
                      else { navigator.clipboard?.writeText(shareText); toast({ title: "Copié !", description: "Partage ce message avec tes amis 🎉" }); }
                    }}
                    data-testid="button-share-glow-score"
                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-gradient-to-br from-pink-500 to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                    Partager
                  </button>
                </div>
              </div>
            )}


            {/* ── Bouton SkinBot — tous les membres (premium requis) ── */}
            {user && (
              <a
                href={isPremium ? "/chat" : "/premium"}
                data-testid="button-skinbot-cta"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-sm active:scale-[0.98] transition-all"
                style={{
                  background: isPremium
                    ? "linear-gradient(135deg, #E91E8C 0%, #C2185B 100%)"
                    : "linear-gradient(135deg, #1A1A2E 0%, #E91E8C 100%)",
                  color: "#fff",
                  boxShadow: isPremium ? "0 8px 24px rgba(233,30,140,0.35)" : "0 8px 24px rgba(26,26,46,0.35)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <MessageCircle className="w-5 h-5" />
                {isPremium ? "Discuter avec SkinBot IA" : "⭐ Discuter avec SkinBot — Premium"}
              </a>
            )}

            {/* ── Défi 30 jours ── */}
            {user && (() => {
              const isActive = challenge30 && (Date.now() - new Date(challenge30.startedAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
              const daysElapsed = challenge30 ? Math.floor((Date.now() - new Date(challenge30.startedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              if (isActive) {
                return (
                  <div
                    data-testid="challenge30-active"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-bold"
                    style={{ borderColor: "#c9a84c", background: "rgba(212,160,23,0.07)", color: "#b8860b" }}
                  >
                    🏆 Défi 30 jours en cours · Jour {daysElapsed}/30
                  </div>
                );
              }
              return (
                <button
                  data-testid="button-challenge30"
                  onClick={() => {
                    const c = { startedAt: new Date().toISOString(), area: area || "face", initialScore: result.score };
                    try { localStorage.setItem("glowscan_challenge_30", JSON.stringify(c)); } catch {}
                    setChallenge30(c);
                    toast({ title: "🏆 Défi lancé !", description: "Suis ta routine 30 jours et rescanne ta peau pour voir ta progression !" });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold active:scale-[0.98] transition-all"
                  style={{ borderColor: "#c9a84c", background: "rgba(212,160,23,0.07)", color: "#b8860b" }}
                >
                  🏆 Relever le défi 30 jours
                </button>
              );
            })()}
          </motion.div>

        {/* ══════════════════════════════
            SECTION ROUTINE — Expansible (membres uniquement)
            ══════════════════════════════ */}
        <AnimatePresence>
        {user && showRoutine && (
          <motion.div
            id="routine-section"
            key="routine"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="space-y-4 overflow-hidden"
          >

            {/* Gate anonyme */}
            {!user ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="blur-[3px] pointer-events-none select-none space-y-2.5 opacity-60">
                  {[
                    { role: "🧴 Nettoyant", name: "Gel Nettoyant Doux", price: "4 500 FCFA" },
                    { role: "💧 Sérum", name: "Sérum Éclat Vitamine C", price: "7 200 FCFA" },
                    { role: "🌿 Crème", name: "Crème Hydratante Légère", price: "5 800 FCFA" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-50 to-emerald-50 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{p.role}</p>
                        <p className="text-sm font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs font-extrabold text-pink-600">{p.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px] rounded-2xl px-5 py-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 text-violet-600" />
                  </div>
                  <p className="text-base font-extrabold text-gray-900 mb-1">Ta routine personnalisée est prête !</p>
                  <p className="text-xs text-gray-500 mb-4 leading-snug">Crée un compte gratuit pour voir tes 3 produits<br />recommandés et ta routine matin/soir.</p>
                  <a href="/auth" data-testid="button-gate-signup" className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-extrabold shadow-lg shadow-purple-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    ✨ Créer mon compte gratuit
                  </a>
                  <p className="text-[10px] text-gray-400 mt-2">Sans carte bancaire · En 10 secondes</p>
                </div>
              </div>
            ) : (
              <>
                {/* Routine 3 produits */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-4">✨ Routine Recommandée</p>
                  <div className="space-y-2.5">
                    {routineProducts.map(({ product, role, index }) => {
                      const img = productImages[product.id];
                      return (
                        <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100" data-testid={`routine-product-${index}`}>
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                            {img ? <img src={img} alt={product.name} className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-emerald-50">
                                <Sparkles className="w-5 h-5 text-pink-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{role.emoji} {role.label}</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {product.price ? (
                                <span className="text-xs font-extrabold text-pink-600">{formatPrice(product.price)}</span>
                              ) : (
                                <span className="text-xs font-medium text-gray-400 italic">Sur demande</span>
                              )}
                              <span className="text-[9px] text-gray-400">· {getProductBrand(product)}</span>
                              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                                🔥 {getSocialProof(product.id)} commandes
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* WhatsApp groupé par marque */}
                  {(() => {
                    const brandGroups = routineProducts.reduce<Record<string, typeof routineProducts>>((acc, rp) => {
                      const brandKey = rp.product.whatsapp || rp.product.brand || "autre";
                      if (!acc[brandKey]) acc[brandKey] = [];
                      acc[brandKey].push(rp);
                      return acc;
                    }, {});
                    const brandEntries = Object.entries(brandGroups);
                    const routineTotal = routineProducts.reduce((sum, { product }) => sum + (product.price || 0), 0);
                    return (
                      <div className="mt-4 space-y-2.5">
                        {brandEntries.length > 1 ? (
                          <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-100/60 flex items-center gap-2" data-testid="multi-brand-notice">
                            <Truck className="w-4 h-4 text-pink-500 flex-shrink-0" />
                            <p className="text-[11px] text-pink-700 font-semibold">✓ Sélection multi-marques — meilleur produit pour chaque étape</p>
                          </div>
                        ) : brandEntries.length === 1 ? (
                          <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-100/60 flex items-center gap-2" data-testid="single-brand-notice">
                            <Truck className="w-4 h-4 text-pink-500 flex-shrink-0" />
                            <p className="text-[11px] text-pink-700 font-semibold">✓ Routine <strong>{getProductBrand(brandEntries[0][1][0].product)}</strong> — 1 seule commande</p>
                          </div>
                        ) : null}
                        {routineTotal > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-green-700 font-bold uppercase tracking-wide">Total Routine</p>
                              <p className="text-lg font-black text-green-800">{formatPrice(routineTotal)}</p>
                            </div>
                            <p className="text-[10px] text-green-600 font-medium">{routineProducts.length} produits</p>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const items: OrderItem[] = routineProducts.map(({ product, role }) => ({
                              productId: product.id,
                              productName: product.name,
                              brand: getProductBrand(product),
                              price: product.price,
                            }));
                            setOrderModalItems(items);
                            setOrderModalTitle("Commander ma routine");
                            setShowOrderModal(true);
                          }}
                          data-testid="button-routine-order"
                          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#25D366] text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-green-200/50"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          📲 Commander ma routine sur WhatsApp
                        </button>
                        <div className="bg-green-50 px-4 py-1.5 rounded-xl flex items-center justify-center gap-1.5">
                          <Truck className="w-3 h-3 text-green-600" />
                          <p className="text-[10px] text-green-600 font-medium">Livraison à domicile · Paiement à la réception</p>
                        </div>
                        {routineProducts.length > 0 && (
                          <button
                            onClick={() => setShowRoutineCard(true)}
                            data-testid="button-open-routine-card"
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-violet-700 rounded-xl text-sm font-bold active:scale-[0.98] transition-all"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Partager ma routine personnalisée
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Produit intermédiaire */}
                {featuredProduct && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-200 relative overflow-hidden" data-testid="card-featured-product">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-3">💡 Produit intermédiaire</p>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                        {productImages[featuredProduct.id] ? (
                          <img src={productImages[featuredProduct.id]} alt={featuredProduct.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
                            <Sparkles className="w-5 h-5 text-pink-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate" data-testid="text-featured-product-name">{featuredProduct.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Pour : {result.condition}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {featuredProduct.price && <span className="text-sm font-extrabold text-pink-600" data-testid="text-featured-price">{formatPrice(featuredProduct.price)}</span>}
                          <span className="text-[9px] text-gray-400">· {getProductBrand(featuredProduct)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOrderModalItems([{
                          productId: featuredProduct.id,
                          productName: featuredProduct.name,
                          brand: getProductBrand(featuredProduct),
                          price: featuredProduct.price,
                        }]);
                        setOrderModalTitle("Commander ce produit");
                        setShowOrderModal(true);
                      }}
                      data-testid="button-featured-whatsapp"
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      Commander via WhatsApp
                    </button>
                  </div>
                )}

              </>
            )}

          </motion.div>
        )}
        </AnimatePresence>

        {/* ══════════════════════════════
            SECTION ROUTINE QUOTIDIENNE
            ══════════════════════════════ */}
        <AnimatePresence>
        {showRoutine && (
          <motion.div
            key="daily-routine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >

            {/* Routine Matin */}
            {result.recommendations?.morning?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-5">
                  <Sun className="w-5 h-5 text-pink-500" />
                  <h3 className="text-base font-black text-gray-900">Matin</h3>
                </div>
                <div className="space-y-3">
                  {result.recommendations.morning.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
                {routineProducts.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-3">☀️ Comment utiliser ta routine le matin</p>
                    <div className="space-y-3">
                      {routineProducts.map(({ product, role, index }) => {
                        const img = productImages[product.id];
                        const tips: Record<string, Record<string, string>> = {
                          cheveux: {
                            nettoyant: `Mouille tes cheveux, applique ${product.name} en massant le cuir chevelu 2-3 min, puis rince.`,
                            serum: `Après le shampooing, applique ${product.name} sur les longueurs encore humides. Ne rince pas.`,
                            creme: `Applique une noisette de ${product.name} sur les longueurs. Démêle avec un peigne large.`,
                          },
                          visage: {
                            nettoyant: `Applique ${product.name} sur peau humide le matin. Masse 30s en mouvements circulaires, rince à l'eau tiède.`,
                            serum: `Sur peau propre légèrement humide, applique 2-3 gouttes de ${product.name}. Tapote pour faire pénétrer.`,
                            creme: `Termine avec ${product.name} en couche fine. Attends 2 min avant la protection solaire.`,
                          },
                          corps: {
                            nettoyant: `Sous la douche, applique ${product.name} en mouvements circulaires. Insiste coudes/genoux, puis rince.`,
                            serum: `Après la douche, applique ${product.name} sur les zones ciblées. La peau humide absorbe mieux.`,
                            creme: `Applique ${product.name} sur tout le corps en insistant sur les zones sèches.`,
                          },
                        };
                        const areaT = tips[currentArea] || tips["visage"];
                        const tip = areaT[getProductRole(product)] || areaT["creme"];
                        return (
                          <div key={product.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-pink-50/60 border border-pink-200/80" data-testid={`morning-tip-${index}`}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
                              {img ? <img src={img} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-pink-50"><Sparkles className="w-4 h-4 text-pink-300" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-pink-700 font-bold uppercase tracking-wide mb-0.5">Étape {index} · {role.label}</p>
                              <p className="text-xs text-gray-700 font-medium leading-relaxed">{tip}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Routine Soir */}
            {result.recommendations?.evening?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-5">
                  <Moon className="w-5 h-5 text-pink-500" />
                  <h3 className="text-base font-black text-gray-900">Soir</h3>
                </div>
                <div className="space-y-3">
                  {result.recommendations.evening.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
                {routineProducts.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-3">🌙 Comment utiliser ta routine le soir</p>
                    <div className="space-y-3">
                      {routineProducts.map(({ product, role, index }) => {
                        const img = productImages[product.id];
                        const tips: Record<string, Record<string, string>> = {
                          cheveux: {
                            nettoyant: `Lave tes cheveux avec ${product.name} pour éliminer les impuretés. Masse 3-5 min.`,
                            serum: `Applique ${product.name} généreusement des racines aux pointes. La nuit permet une absorption maximale.`,
                            creme: `Applique ${product.name} sur les longueurs. Tresse pour garder l'hydratation toute la nuit.`,
                          },
                          visage: {
                            nettoyant: `Démaquille-toi, puis nettoie avec ${product.name}. Masse 1 min en insistant zone T, rince à l'eau tiède.`,
                            serum: `Applique ${product.name} sur peau propre et sèche. Les actifs travaillent pendant le sommeil.`,
                            creme: `Applique ${product.name} en couche généreuse. La peau se régénère la nuit.`,
                          },
                          corps: {
                            nettoyant: `Sous la douche du soir, nettoie avec ${product.name}. Prends le temps de masser les zones ciblées.`,
                            serum: `Sur peau propre, applique ${product.name} sur les zones concernées. Les actifs agissent toute la nuit.`,
                            creme: `Applique ${product.name} en couche généreuse avant de dormir.`,
                          },
                        };
                        const areaT = tips[currentArea] || tips["visage"];
                        const tip = areaT[getProductRole(product)] || areaT["creme"];
                        return (
                          <div key={product.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-pink-50/60 border border-pink-100/80" data-testid={`evening-tip-${index}`}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
                              {img ? <img src={img} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-pink-50"><Sparkles className="w-4 h-4 text-pink-300" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-pink-700 font-bold uppercase tracking-wide mb-0.5">Étape {index} · {role.label}</p>
                              <p className="text-xs text-gray-700 font-medium leading-relaxed">{tip}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Routine Hebdo */}
            {result.recommendations?.weekly && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Hebdo</p>
                  <p className="text-sm font-bold text-gray-900">{result.recommendations.weekly}</p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black uppercase">1x / Semaine</span>
              </div>
            )}

            {/* CTA Analyse Cheveux */}
            {currentArea !== "cheveux" && (
              <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 rounded-2xl p-5 border border-pink-200 text-center">
                <p className="text-base font-extrabold text-gray-900 mb-1">💇 Et tes cheveux ?</p>
                <p className="text-xs text-gray-500 font-medium mb-3">Découvre l'état de tes cheveux et reçois une routine capillaire personnalisée</p>
                <a
                  href="/analyze?area=hair"
                  data-testid="button-analyze-hair"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-500 text-white text-sm font-bold rounded-lg shadow-lg active:scale-[0.97] transition-all"
                >
                  <ScanFace className="w-4 h-4" />
                  Faire l'analyse cheveux
                </a>
              </div>
            )}

            {/* Rappel J+7 */}
            <div className="bg-gradient-to-br from-pink-50 to-emerald-50 rounded-2xl p-5 border border-pink-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Rendez-vous dans 7 jours 📅</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Ta peau évolue en 1 semaine. Rescanne pour mesurer tes progrès et ajuster ta routine.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (j7ReminderSet) return;
                  const hasSW = "serviceWorker" in navigator;
                  const hasPerm = "Notification" in window && Notification.permission === "granted";
                  if (hasSW && hasPerm) {
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) { setJ7ReminderSet(true); toast({ title: "✅ Rappel activé !", description: "On te notifiera dans 7 jours pour rescanner." }); return; }
                  }
                  setJ7ReminderSet(true);
                  toast({ title: "📅 Note-le dans ton agenda !", description: `Reviens le ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` });
                }}
                data-testid="button-set-j7-reminder"
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  j7ReminderSet ? "bg-pink-100 text-pink-700 border border-pink-100" : "bg-pink-600 text-white shadow-lg shadow-pink-100 active:scale-[0.98]"
                }`}
              >
                <Bell className="w-4 h-4" />
                {j7ReminderSet ? "✅ Rappel J+7 activé" : "Me rappeler dans 7 jours"}
              </button>
              <p className="text-[10px] text-center text-gray-400 font-medium mt-3">
                Analyse IA à titre indicatif · Consultez un spécialiste pour un avis médical
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Disclaimer médical ── */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gray-50 border border-gray-200" data-testid="disclaimer-medical">
        <span className="text-base flex-shrink-0">⚕️</span>
        <p className="text-[11px] text-gray-500 font-medium leading-relaxed text-center">
          Notre diagnostic ne remplace pas un dermatologue. Consultez un professionnel de santé pour tout problème persistant.
        </p>
      </div>

      {/* Modal commande */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        items={orderModalItems}
        title={orderModalTitle}
        scanContext={{ skinType: result.skinType, condition: result.condition, score: result.score }}
      />

      {/* Modals (hors flow) */}
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
