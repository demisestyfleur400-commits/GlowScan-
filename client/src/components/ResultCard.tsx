import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MessageCircle, AlertTriangle, Eye, Droplets, ShieldAlert,
  Scan as ScanIcon, Share2, Truck, ImageIcon, Lock, Sun, Moon, Calendar,
  Bell, MapPin, Activity, Leaf, Heart, CheckCircle2, Camera,
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

// ─── Preuve sociale (déterministe) pour produits locaux ─────────────
const SOCIAL_PROOF: Record<string, number> = {
  "creme-visage": 31, "serum-jeunesse": 27, "gel-contour-yeux": 19,
  "potion-lumiere": 23, "solution-douceur": 17, "cocon-lumineux": 22,
  "tresor-cacao": 18, "gel-douche-eclat": 29, "gommage-eclat": 14,
  "savon-corps": 33, "serum-mains-pieds": 16, "huile-eclat": 21,
  "shampooing-chebe": 24, "huile-chebe": 20, "creme-chebe": 15,
  "serum-hairbloom": 13,
};
function getSocialProof(productId: string): number {
  if (SOCIAL_PROOF[productId]) return SOCIAL_PROOF[productId];
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = ((h << 5) - h + productId.charCodeAt(i)) | 0;
  return 8 + (Math.abs(h) % 20);
}

// ─── Helpers numériques pour les tuiles ─────────────────────────────
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function deriveAgeCutane(result: AnalysisResult): number {
  const score = result.score || 50;
  const scars = result.balance?.scars || 0;
  // Plus le score est bas et plus il y a de cicatrices/marques, plus l'âge cutané est élevé
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
  // Plus de sébum + bon score = meilleure hydratation (relation indirecte)
  const value = clamp(Math.round(70 - sebum * 4 + (score - 50) * 0.3), 15, 95);
  const label = value >= 75 ? "optimal" : value >= 55 ? "moyen" : "faible";
  return { value, label };
}
function deriveRides(result: AnalysisResult): { value: number; label: string } {
  const scars = result.balance?.scars || 0;
  const age = deriveAgeCutane(result);
  // Note 0-100, plus c'est haut, plus c'est faible (= peu de rides)
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
  // 1) Préférer stats.zones rempli par l'IA : c'est la localisation anatomique
  //    précise (ex: "Front + Menton", "Zone T + Joue droite") — bien plus
  //    informatif que la simple liste des zones rouges.
  const statsZones = (result as any).stats?.zones;
  if (typeof statsZones === "string" && statsZones.trim() && statsZones.trim() !== "—" && statsZones.trim() !== "Non détecté") {
    return statsZones.trim();
  }
  // 2) Fallback : noms des zones red/yellow détectées
  const zones = (result.zones || []).filter((z: any) => z.status === "red" || z.status === "yellow");
  if (zones.length === 0) return "Toutes saines";
  const names = zones.slice(0, 2).map((z: any) => z.name);
  return names.join(" · ");
}

// ─── Normalise les étapes de protocole (str OU {step,product,why}) ──
function normalizeStep(s: any, i: number): ProtocolStep {
  if (s && typeof s === "object") {
    return {
      step: typeof s.step === "string" ? s.step : `Étape ${i + 1}`,
      product: typeof s.product === "string" ? s.product : undefined,
      why: typeof s.why === "string" ? s.why : undefined,
    };
  }
  return { step: `Étape ${i + 1}`, product: typeof s === "string" ? s : String(s) };
   };

// ─── Composants UI réutilisables et personnalisés ───────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || "modérée";
  let bg = "bg-pink-100 text-pink-700 border-pink-200";
  if (s.includes("lég")) bg = "bg-emerald-100 text-emerald-700 border-emerald-200";
  else if (s.includes("sév")) bg = "bg-rose-100 text-rose-700 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${bg}`} data-testid="badge-severity">
      <AlertTriangle className="w-3 h-3" /> {severity}
    </span>
  );
}

// Jauge demi-cercle Glow Score enrichie avec la remarque personnalisée du Docteur
function GlowGauge({ score, observationsVisuelles }: { score: number; observationsVisuelles?: string }) {
  const safeScore = clamp(score || 0, 0, 100);
  const radius = 90;
  const cx = 120;
  const cy = 110;
  const filled = (safeScore / 100) * (Math.PI * radius);
  const remaining = (Math.PI * radius) - filled;

  return (
    <div className="w-full max-w-[280px] mx-auto text-center" data-testid="glow-gauge">
      <div className="relative">
        <svg viewBox="0 0 240 140" className="w-full">
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${remaining}`}
          />
          <text x={cx} y={cy - radius - 6} textAnchor="middle" className="fill-gray-400 text-[10px] font-bold">50</text>
          <text x={cx - radius} y={cy + 22} textAnchor="middle" className="fill-gray-400 text-[10px] font-bold">0</text>
          <text x={cx + radius} y={cy + 22} textAnchor="middle" className="fill-gray-400 text-[10px] font-bold">100</text>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
          <p className="text-5xl font-black text-gray-900 leading-none">{safeScore}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Glow Score</p>
        </div>
      </div>

      {/* 💬 REMARQUE DU DOCTEUR IA : Brise le côté générique instantanément */}
      {observationsVisuelles && (
        <div className="mt-3 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-left shadow-sm">
          <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> L'avis du Doc'
          </p>
          <p className="text-xs font-semibold text-gray-700 italic leading-relaxed">
            "{observationsVisuelles}"
          </p>
        </div>
      )}
    </div>
  );
}

// Tuile chiffrée colorée avec option d'explication contextuelle
function StatTile({
  icon, label, value, suffix, sub, color, explicationContextuelle
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  sub?: string;
  color: "amber" | "rose" | "blue" | "emerald";
  explicationContextuelle?: string; // Ex: "Aggravé par le manque de sommeil mentionné"
}) {
  const palette: Record<string, string> = {
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    rose: "bg-rose-50 border-rose-100 text-rose-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-800",
  };
  return (
    <div className={`rounded-2xl border ${palette[color]} p-3 flex flex-col gap-1.5 shadow-sm`}>
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
          <p className="text-lg font-black text-gray-900 leading-tight">
            {value}{suffix && <span className="text-xs font-bold ml-0.5">{suffix}</span>}
            {sub && <span className="text-[11px] font-semibold text-gray-500 ml-1.5">{sub}</span>}
          </p>
        </div>
      </div>
      
      {/* 🎯 FACTEUR DÉCLENCHEUR : Lie le score directement aux réponses du questionnaire */}
      {explicationContextuelle && (
        <div className="text-[11px] font-medium border-t border-black/5 pt-1.5 opacity-80 leading-snug">
          💡 {explicationContextuelle}
        </div>
      )}
    </div>
  );
}

function GridTile({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 px-3 py-3 flex flex-col items-center text-center shadow-sm" data-testid={testId}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-[13px] font-extrabold text-gray-900 leading-tight">{value}</p>
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
    <svg viewBox="0 0 240 240" className="w-full max-w-[260px] mx-auto" data-testid="radar-balance">
      {gridLevels.map((level) => (
        <polygon key={level} points={labels.map((_, i) => `${getPoint(i, level * 10).x},${getPoint(i, level * 10).y}`).join(" ")} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
      ))}
      {labels.map((_, i) => <line key={i} x1={cx} y1={cy} x2={getPoint(i, 10).x} y2={getPoint(i, 10).y} stroke="#e5e7eb" strokeWidth="0.5" />)}
      <path d={dataPath} fill="rgba(20, 184, 166, 0.18)" stroke="#14b8a6" strokeWidth="2" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#14b8a6" stroke="white" strokeWidth="2" />)}
      {labels.map((l, i) => (
        <text key={i} x={getPoint(i, 12.5).x} y={getPoint(i, 12.5).y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 text-[8px] font-bold uppercase">
          {l.label}
          </text>
      ))}
    </svg>
  );
}

// Ligne d'étape de protocole
function ProtocolRow({ index, step }: { index: number; step: ProtocolStep }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900 leading-tight">{step.step}</p>
        {step.product && (
          <p className="text-[12px] text-pink-600 font-medium leading-snug">{step.product}</p>
        )}
        {step.why && (
          <p className="text-[12px] text-gray-600 italic leading-snug mt-0.5">{step.why}</p>
        )}
      </div>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Composant principal
// ═══════════════════════════════════════════════════════════════════
interface ResultCardProps {
  result: AnalysisResult;
  scanId?: number | null;
  area?: string;
  imageUrl?: string | null;
  userFirstName?: string | null;
}

export function ResultCard({ result, scanId, area, imageUrl, userFirstName }: ResultCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRoutineCard, setShowRoutineCard] = useState(false);
  const [j7ReminderSet, setJ7ReminderSet] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalItems, setOrderModalItems] = useState<OrderItem[]>([]);
  const [orderModalTitle, setOrderModalTitle] = useState("");

  // ── Cas "Image non exploitable" : message court et clair ──────────
  // On se fie UNIQUEMENT au signal explicite du backend pour éviter de
  // masquer à tort des scans historiques valides avec score 0 ou sans zones.
  if (result.condition === "Image non exploitable") {
    return (
      <div className="max-w-lg mx-auto px-4" data-testid="result-unanalyzable">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-2">Photo non analysable</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            {result.details || "Cette photo ne montre pas une peau humaine analysable. Reprends une photo nette en pleine lumière, sans filtre, à 20-30 cm."}
          </p>
          <button
            onClick={() => window.location.reload()}
            data-testid="button-rescan"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-extrabold shadow-lg shadow-pink-200 active:scale-[0.98] transition-all"
          >
            Reprendre une photo
          </button>
        </div>
      </div>
    );
  }

  // ── Zone détectée ──────────────────────────────────────────────────
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

  // ── Construction de la routine 3 produits (1 seule marque locale) ─
  const getProductRole = (p: typeof catalog[0]): "nettoyant" | "serum" | "creme" => {
    const n = p.name.toLowerCase();
    if (n.includes("savon") || n.includes("soap") || n.includes("gel de douche") || n.includes("gel douche") || n.includes("gommage") || n.includes("shampoo") || n.includes("shampoing") || n.includes("clarifiant") || n.includes("nettoyant") || n.includes("cleansing")) return "nettoyant";
    if (n.includes("sérum") || n.includes("serum") || n.includes("huile") || n.includes("oil") || n.includes("lotion") || n.includes("tonic") || n.includes("tonique") || n.includes("potion") || n.includes("spray") || n.includes("poudre")) return "serum";
    return 
  const findRoutineProducts = () => {
    const consultationText = (result as any).consultationData?.observations_visuelles || "";
    const searchText = ((result.condition || "") + " " + (result.details || "") + " " + consultationText).toLowerCase();
    
    const areaProducts = catalog.filter(p => {
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
    return winner.products.map((p, i) => ({
      product: p,
      role: roleLabels[getProductRole(p)] || roleLabels["creme"],
      index: i + 1,
    }));
  };

  // 1) On génère la routine complète de 3 produits
  const routineProducts = findRoutineProducts();

  // 2) 🛠️ On calcule automatiquement l'offre intermédiaire (Le Duo) juste après
  const getIntermediateOffer = () => {
    if (routineProducts.length < 2) return null;
    const duoProducts = routineProducts.slice(0, 2);
    const totalPriceDuo = duoProducts.reduce((sum, item) => sum + item.product.price, 0);
    return {
      duo: duoProducts,
      totalPrice: totalPriceDuo,
      copywriting: {
        title: "Le Compromis Idéal ✨",
        subtitle: currentArea === "cheveux" ? "Le kit booster de croissance" : "Le Duo Action Ciblée",
        description: `Le strict minimum requis pour cibler directement l'état actuel de votre peau sans surcharger votre routine.`
      }
    };
  };

  const intermediateOffer = getIntermediateOffer();
  // ── Protocole matin/soir/hebdo normalisé ───────────────────────────
  const protocolMorning: ProtocolStep[] = ((result as any).protocol?.morning || result.recommendations?.morning || []).map(normalizeStep);
  const protocolEvening: ProtocolStep[] = ((result as any).protocol?.evening || result.recommendations?.evening || []).map(normalizeStep);
  const weekly = typeof result.recommendations?.weekly === "string" ? result.recommendations.weekly : "";

  // ── Valeurs des tuiles ─────────────────────────────────────────────
  const ageCutane = deriveAgeCutane(result);
  const indiceAcne = deriveIndiceAcne(result);
  const hydratation = deriveHydratation(result);
  const rides = deriveRides(result);
  const expertCitation = result.motivation || "Ton produit te soigne. GlowScan te connaît — on garde la mémoire de ce qui marche sur ta peau, pour que tu ne repartes jamais de zéro.";

  // ═══════════════════════════════════════════════════════════════════
  //  RENDU
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-lg mx-auto space-y-4" data-testid="result-card">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        {/* ═══════════════════════════════════════════
            BLOC 1 — Carte Diagnostic principale
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100" data-testid="block-diagnostic">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Diagnostic & Stratégie</p>
            <SeverityBadge severity={result.severity || "Modérée"} />
          </div>
          <h1 className="text-[22px] font-black text-gray-900 leading-tight mb-5 font-display" data-testid="text-condition">
            {result.condition}
          </h1>

          {/* Jauge demi-cercle */}
          
           <GlowGauge 
  score={result.score} 
  observationsVisuelles={result.consultationData?.observations_visuelles || (result as any).observationsVisuelles} 
/>
     {/* 4 tuiles colorées et contextualisées */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <StatTile
              icon={<Sun className="w-5 h-5 text-amber-500" />}
              label="Âge cutané"
              value={`${ageCutane} ans`}
              sub="estimé"
              color="amber"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.age || (result as any).facteurAge}
            />
            <StatTile
              icon={<div className="w-3 h-3 rounded-full bg-rose-500" />}
              label="Indice acné"
              value={`${indiceAcne.value}%`}
              sub={indiceAcne.label}
              color="rose"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.inflammation || (result as any).facteurInflammation}
            />
            <StatTile
              icon={<Droplets className="w-5 h-5 text-blue-500" />}
              label="Hydratation"
              value={`${hydratation.value}%`}
              sub={hydratation.label}
              color="blue"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.hydratation || (result as any).facteurHydratation}
            />
            <StatTile
              icon={<Leaf className="w-5 h-5 text-emerald-500" />}
              label="Rides"
              value={rides.value}
              sub={rides.label}
              color="emerald"
              explicationContextuelle={(result as any).consultationData?.impact_facteurs?.rides || (result as any).facteurRides}
            />
          </div>
        </div>
           
        {/* ═══════════════════════════════════════════
            BLOC 2 — Grille 6 tuiles
            ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-3 gap-2">
          <GridTile
            icon={<Droplets className="w-3.5 h-3.5 text-cyan-500" />}
            label="Type Peau"
            value={((result as any).consultationData?.type_peau || result.skinType || "Mixte").split("(")[0].trim()}
            testId="tile-skintype"
          />
          <GridTile
            icon={<Eye className="w-3.5 h-3.5 text-rose-500" />}
            label="Lésions"
            value={deriveLesionsLabel(result).replace("inflammatoires ", "")} /* Version plus courte pour éviter le bug d'affichage sur mobile */
            testId="tile-lesions"
          />
          <GridTile
            icon={<ScanIcon className="w-3.5 h-3.5 text-indigo-500" />}
            label="Pores"
            value={derivePoresLabel(result)}
            testId="tile-pores"
          />
          <GridTile
            icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
            label="Marques"
            value={deriveMarquesLabel(result)}
            testId="tile-marques"
          />
          <GridTile
            icon={<MapPin className="w-3.5 h-3.5 text-violet-500" />}
            label="Zones"
            value={deriveZonesLabel(result)}
            testId="tile-zones"
          />
          <GridTile
            icon={<Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
            label="Score"
            value={`${result.score}%`}
            testId="tile-score"
          />
        </div>

        {/* ═══════════════════════════════════════════
            BLOC 3 — Radar Équilibre cutané
            ═══════════════════════════════════════════ */}
        {result.balance && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100" data-testid="block-radar">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 mb-3 text-center">Équilibre cutané</p>
            <RadarChart balance={result.balance} />
          </div>
        )}

        {/* ═══════════════════════════════════════════
            BLOC 4 — L'Ordonnance Clinique de l'Expert GlowScan
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden" data-testid="block-expert">
          {/* Filigrane de sécurité médicale en arrière-plan */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50/30 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">Conclusions du Dr. GlowScan</h2>
            </div>
            {/* Badge de réassurance scientifique */}
            <span className="text-[9px] font-black bg-teal-600 text-white px-2 py-1 rounded-lg uppercase tracking-wide shadow-sm shadow-teal-100">
              ✓ Approuvé IA Clinique
            </span>
          </div>

          {/* Corps de l'analyse : Diagnostic de la peau */}
          {result.details && (
            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-1.5">Évaluation de la barrière cutanée :</p>
              <p className="text-xs text-gray-700 leading-relaxed font-medium" data-testid="text-details">
                {result.details}
              </p>
            </div>
          )}

          {/* L'ordonnance / La recommandation clé de l'expert */}
          <div className="bg-gradient-to-r from-teal-50/70 to-emerald-50/40 border border-teal-100/60 rounded-2xl p-4 relative">
            <div className="absolute -top-2 left-4 bg-white border border-teal-100 text-[9px] font-black text-teal-700 px-2 py-0.5 rounded-full uppercase">
              La recommandation clé
            </div>
            <p className="text-[12px] text-teal-950 font-semibold leading-relaxed italic mt-1" data-testid="text-motivation">
              "{expertCitation || "Votre peau exprime un besoin urgent de régulation. Suivre rigoureusement le protocole de soins locaux sélectionné est la première étape essentielle pour restaurer votre éclat d'origine."}"
            </p>
          </div>

          {/* Rappel bienveillant d'accompagnement */}
          <p className="text-[10px] text-gray-400 text-center font-medium mt-3.5">
            🔒 Vos données d'analyse clinique restent 100% confidentielles.
          </p>
        </div>

        {/* ═══════════════════════════════════════════
            BLOC 5 — Cartographie visuelle des zones (visage)
            ═══════════════════════════════════════════ */}
        {result.zones && result.zones.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden" data-testid="block-zones-map">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <ScanIcon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">Cartographie Cutanée</h2>
                  <p className="text-[10px] text-gray-400 font-semibold">Localisation des foyers à traiter</p>
                </div>
              </div>
              
              {/* Effet Scanner Clignotant pour le côté technologique */}
              <span className="flex items-center gap-1.5 text-[9px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                Analyse Rétinienne IA
              </span>
            </div>

            {/* Le composant de la carte du visage */}
            <div className="bg-gradient-to-b from-gray-50/50 to-white rounded-2xl p-2 border border-gray-100/60 flex items-center justify-center">
              <FaceZonesMap zones={result.zones} />
            </div>

            {/* Légende rapide pour faciliter l'interprétation sous le soleil de Douala */}
            <p className="text-[10px] text-gray-400 text-center font-medium mt-3">
              💡 Cliquez sur les zones colorées pour isoler les imperfections détectées.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            BLOC 6 — Protocole de soin (Matin / Soir / Hebdo)
            ═══════════════════════════════════════════ */}
        {(protocolMorning.length > 0 || protocolEvening.length > 0 || weekly) && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100" data-testid="block-protocol">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-pink-600" />
              <h2 className="text-[15px] font-black text-gray-900 font-display">Mon protocole de soin</h2>
            </div>
            <p className="text-[11px] text-gray-500 italic mb-4">Applique-le 4 à 6 semaines avant de réévaluer.</p>
            <div className="space-y-4">
              {protocolMorning.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <h3 className="text-[13px] font-black text-gray-900">Matin</h3>
                  </div>
                  <ol className="space-y-2 ml-1">
                    {protocolMorning.map((s, i) => <ProtocolRow key={`m-${i}`} index={i + 1} step={s} />)}
                  </ol>
                </div>
              )}
              {protocolEvening.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-[13px] font-black text-gray-900">Soir</h3>
                  </div>
                  <ol className="space-y-2 ml-1">
                    {protocolEvening.map((s, i) => <ProtocolRow key={`e-${i}`} index={i + 1} step={s} />)}
                  </ol>
                </div>
              )}
              {weekly && (
                <div className="rounded-2xl p-3 bg-purple-50 border border-purple-100 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">Hebdo · 1×/semaine</p>
                    <p className="text-[12px] text-gray-800 font-medium leading-snug">{weekly}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOC 6 — Le Protocole de Soin Connecté au Catalogue de Vente */}
        {(protocolMorning.length > 0 || protocolEvening.length > 0 || weekly) && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100" data-testid="block-protocol">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <h2 className="text-[15px] font-black text-gray-900 font-display">Mon Ordonnance d'Application</h2>
              </div>
              <span className="text-[9px] bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded-full">
                Cycle de 4 à 6 semaines
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-5">
              Suivez rigoureusement cet ordre pour maximiser la pénétration des actifs sous le climat chaud.
            </p>

            <div className="space-y-6">
              {/* ☀️ LE PROTOCOLE DU MATIN */}
              {protocolMorning.length > 0 && (
                <div className="relative pl-4 border-l-2 border-amber-200">
                  <div className="absolute -left-[9px] top-0 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                    <Sun className="w-3 h-3" />
                  </div>
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-1.5">
                    Rituel du Matin <span className="text-[10px] font-medium text-gray-400 font-sans lowercase">(protection & régulation)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {protocolMorning.map((s, i) => {
                      const stepData = normalizeStep(s, i);
                      // On cherche si un produit du catalogue correspond à cette étape
                      const matchedItem = routineProducts.find(rp => 
                        stepData.product && rp.product.name.toLowerCase().includes(stepData.product.toLowerCase())
                      );

                      return (
                        <div key={`m-${i}`} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-2.5 flex items-center gap-3 transition-all">
                          <div className="w-5 h-5 rounded-lg bg-white border border-gray-200 text-[11px] font-black text-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{stepData.step}</p>
                            <p className="text-[12px] font-bold text-gray-900 truncate">
                              {matchedItem ? matchedItem.product.name : (stepData.product || stepData.step)}
                            </p>
                            {stepData.why && <p className="text-[10px] text-gray-500 leading-snug mt-0.5 font-medium">{stepData.why}</p>}
                          </div>
                          
                          {/* Affichage de la vignette du produit pour forcer l'achat */}
                          {matchedItem && (
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/60 p-0.5 flex-shrink-0 flex items-center justify-center shadow-inner">
                              <img 
                                src={productImages[matchedItem.product.id] || "/placeholder-product.png"} 
                                alt={matchedItem.product.name} 
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 🌙 LE PROTOCOLE DU SOIR */}
              {protocolEvening.length > 0 && (
                <div className="relative pl-4 border-l-2 border-indigo-200">
                  <div className="absolute -left-[9px] top-0 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                    <Moon className="w-3 h-3" />
                  </div>
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                    Rituel du Soir <span className="text-[10px] font-medium text-gray-400 font-sans lowercase">(réparation intense)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {protocolEvening.map((s, i) => {
                      const stepData = normalizeStep(s, i);
                      const matchedItem = routineProducts.find(rp => 
                        stepData.product && rp.product.name.toLowerCase().includes(stepData.product.toLowerCase())
                      );

                      return (
                        <div key={`e-${i}`} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-2.5 flex items-center gap-3 transition-all">
                          <div className="w-5 h-5 rounded-lg bg-white border border-gray-200 text-[11px] font-black text-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{stepData.step}</p>
                            <p className="text-[12px] font-bold text-gray-900 truncate">
                              {matchedItem ? matchedItem.product.name : (stepData.product || stepData.step)}
                            </p>
                            {stepData.why && <p className="text-[10px] text-gray-500 leading-snug mt-0.5 font-medium">{stepData.why}</p>}
                          </div>
                          
                          {/* Affichage de la vignette du produit */}
                          {matchedItem && (
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/60 p-0.5 flex-shrink-0 flex items-center justify-center shadow-inner">
                              <img 
                                src={productImages[matchedItem.product.id] || "/placeholder-product.png"} 
                                alt={matchedItem.product.name} 
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 📅 SOIN HEBDOMADAIRE */}
              {weekly && (
                <div className="rounded-2xl p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/70 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-purple-200 text-purple-600 flex-shrink-0 shadow-sm">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-purple-700">Soin Booster Hebdomadaire</p>
                    <p className="text-[12px] text-gray-800 font-bold leading-tight mt-0.5">{weekly}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

                        {/* BLOC 7 : TUNNEL D'ACHAT AGRESSIF HAUTE CONVERSION (1M+ REVENUS) */}
        {routineProducts.length > 0 ? (
          (() => {
            const routineTotal = routineProducts.reduce((sum, { product }) => sum + (product.price || 0), 0);
            const brandLabel = getProductBrand(routineProducts[0].product);
            
            // Simulation d'un prix de vente unitaire plus élevé pour l'effet d'ancrage psychologique (+20%)
            const unitPriceTotal = Math.round(routineTotal * 1.2);
            const totalSavingsRoutine = unitPriceTotal - routineTotal;
            
            // Calculs de l'offre intermédiaire (Le Duo à 2 produits)
            const duoTotal = intermediateOffer ? intermediateOffer.totalPrice : 0;
            const unitPriceDuo = Math.round(duoTotal * 1.15);
            const totalSavingsDuo = unitPriceDuo - duoTotal;

            return (
              <div className="mt-6 space-y-5 px-1 animate-fade-in" data-testid="block-conversion-tunnel">
                
                {/* NOTIFICATION DE FOMO & PREUVE SOCIALE CAMEROUNAISE */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center gap-2.5 shadow-sm">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <p className="text-[11px] text-amber-950 font-bold leading-tight">
                    🔥 <span className="text-red-600 font-extrabold">37 femmes</span> ont validé cette ordonnance à Douala aujourd'hui. Stock de la gamme <span className="underline">{brandLabel}</span> limité.
                  </p>
                </div>

                {/* DOUBLE OFFRE COMPARATIVE : L'ANCRAGE REVERSE */}
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* OFFRE 1 : L'EXPÉRIENCE TOTALE (ROUTINE COMPLÈTE - 3 PRODUITS) */}
                  <div className="border border-gray-200 bg-white rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all hover:border-gray-300">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-gray-900 text-sm flex items-center gap-1">
                          L'Expérience Totale 🚀
                        </h4>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                          Économie : {formatPrice(totalSavingsRoutine)}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">Traitement Global Synergique (Nettoyant + Sérum + Crème)</p>
                      <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                        Zéro compromis. C'est la combinaison exacte recommandée par l'IA pour traiter le problème à la racine et bloquer définitivement le retour des imperfections.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3.5 mt-1">
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold line-through">{formatPrice(unitPriceTotal)}</p>
                        <p className="text-lg font-black text-gray-950">{formatPrice(routineTotal)}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const items: OrderItem[] = routineProducts.map(({ product }) => ({
                            productId: product.id,
                            productName: product.name,
                            brand: getProductBrand(product),
                            price: product.price,
                          }));
                          setOrderModalItems(items);
                          setOrderModalTitle("Commander la routine complète");
                          setShowOrderModal(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-950 hover:bg-gray-900 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        Prendre la Totale
                      </button>
                    </div>
                  </div>

                  {/* OFFRE 2 : LE COMPROMIS IDÉAL (LE DUO DE SAUVETAGE - 2 PRODUITS) */}
                  {intermediateOffer && (
                    <div className="border-2 border-pink-500 bg-gradient-to-br from-pink-50/20 via-white to-white rounded-3xl p-5 relative shadow-md shadow-pink-100/40 transition-all scale-[1.01]">
                      <div className="absolute -top-3 right-5 bg-pink-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Le Compromis Idéal ✨
                      </div>
                      
                      <h4 className="font-black text-gray-950 text-sm mb-0.5">
                        {intermediateOffer.copywriting.title}
                      </h4>
                      <p className="text-[10px] font-bold text-pink-600 mb-2">{intermediateOffer.copywriting.subtitle}</p>
                      <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                        Vous n'avez pas le budget pour la totale ? Ce duo rassemble les **2 actifs majeurs** pour stopper l'urgence cutanée sans vider vos poches.
                      </p>
                      
                      {/* Vignettes visuelles des produits inclus dans le Duo */}
                      <div className="space-y-2 mb-4 bg-white/80 rounded-xl p-2.5 border border-pink-100/40">
                        {intermediateOffer.duo.map((item, idx) => (
                          <div key={idx} className="text-[11px] font-bold text-gray-800 flex items-center gap-2">
                            <span className="bg-pink-100 p-0.5 rounded text-xs">{item.role.emoji}</span> 
                            <span className="truncate">{item.product.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-pink-100 pt-3.5">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold line-through">{formatPrice(unitPriceDuo)}</p>
                          <p className="text-lg font-black text-pink-600">{formatPrice(duoTotal)}</p>
                        </div>
                        <button 
                          onClick={() => {
                            const items: OrderItem[] = intermediateOffer.duo.map(({ product }) => ({
                              productId: product.id,
                              productName: product.name,
                              brand: getProductBrand(product),
                              price: product.price,
                            }));
                            setOrderModalItems(items);
                            setOrderModalTitle("Commander le Compromis Idéal");
                            setShowOrderModal(true);
                          }}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-pink-200 active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          Prendre le Duo
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* BLOC LOGISTIQUE DE CONFIANCE (DOUALA / YAOUNDÉ) */}
                <div className="bg-emerald-50/80 px-4 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100/80 shadow-sm">
                  <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[11px] text-emerald-800 font-black leading-tight">Expédition Express au Cameroun</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Livraison à domicile (Douala & Yaoundé) · Paiement Cash à la livraison</p>
                  </div>
                </div>

                {/* Action secondaire : Partage social discret */}
                <button
                  onClick={() => setShowRoutineCard(true)}
                  className="w-full py-2 text-gray-400 hover:text-gray-600 text-[11px] font-bold transition-all text-center underline tracking-wide"
                >
                  💾 Enregistrer ou partager mon ordonnance personnalisée
                </button>
              </div>
            );
          })()
        ) : null}


                  {/* OFFRE 2 : LE COMPROMIS IDÉAL (LE DUO DE SAUVETAGE - 2 PRODUITS) */}
                  {intermediateOffer && (
                    <div className="border-2 border-pink-500 bg-gradient-to-br from-pink-50/20 via-white to-white rounded-3xl p-5 relative shadow-md shadow-pink-100/40 transition-all scale-[1.01]">
                      <div className="absolute -top-3 right-5 bg-pink-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Le Compromis Idéal ✨
                      </div>
                      
                      <h4 className="font-black text-gray-950 text-sm mb-0.5">
                        {intermediateOffer.copywriting.title}
                      </h4>
                      <p className="text-[10px] font-bold text-pink-600 mb-2">{intermediateOffer.copywriting.subtitle}</p>
                      <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                        Vous n'avez pas le budget pour la totale ? Ce duo rassemble les **2 actifs majeurs** pour stopper l'urgence cutanée sans vider vos poches.
                      </p>
                      
                      {/* Vignettes visuelles des produits inclus dans le Duo */}
                      <div className="space-y-2 mb-4 bg-white/80 rounded-xl p-2.5 border border-pink-100/40">
                        {intermediateOffer.duo.map((item, idx) => (
                          <div key={idx} className="text-[11px] font-bold text-gray-800 flex items-center gap-2">
                            <span className="bg-pink-100 p-0.5 rounded text-xs">{item.role.emoji}</span> 
                            <span className="truncate">{item.product.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-pink-100 pt-3.5">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold line-through">{formatPrice(unitPriceDuo)}</p>
                          <p className="text-lg font-black text-pink-600">{formatPrice(duoTotal)}</p>
                        </div>
                        <button 
                          onClick={() => {
                            const items: OrderItem[] = intermediateOffer.duo.map(({ product }) => ({
                              productId: product.id,
                              productName: product.name,
                              brand: getProductBrand(product),
                              price: product.price,
                            }));
                            setOrderModalItems(items);
                            setOrderModalTitle("Commander le Compromis Idéal");
                            setShowOrderModal(true);
                          }}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-pink-200 active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          Prendre le Duo
                        </button>
                      </div>
                    </div>
                                    </div>
        </div>
      );
    })()
  ) : (
    <div className="space-y-3 mt-4">
      {/* BLOC LOGISTIQUE DE CONFIANCE (DOUALA / YAOUNDÉ) */}
      <div className="bg-emerald-50/80 px-4 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100/80 shadow-sm">
        <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="text-left">
          <p className="text-[11px] text-emerald-800 font-black leading-tight">Expédition Express au Cameroun</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Livraison à domicile (Douala & Yaoundé) · Paiement Cash à la livraison</p>
        </div>
      </div>

      {/* Action secondaire : Partage social discret */}
      <button
        onClick={() => setShowRoutineCard(true)}
        className="w-full py-2 text-gray-400 hover:text-gray-600 text-[11px] font-bold transition-all text-center underline tracking-wide"
      >
        💾 Enregistrer ou partager mon ordonnance personnalisée
      </button>
    </div>
  )}

  {/* Footer Prévention Clinique */}
  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-semibold text-left">
    <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
    <span>Analyse indicative générée par GlowScan AI.</span>
  </div>
</div>
);
}

        {/* ═══════════════════════════════════════════
            BLOC 8 — Partage social
            ═══════════════════════════════════════════ */}
        {user && (
          <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-5 shadow-xl border border-gray-800 space-y-4 text-white" data-testid="block-challenge-j7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-pink-400">Le Défi Éclat GlowScan</h3>
              </div>
              <span className="text-[9px] bg-white/10 text-white px-2 py-0.5 rounded-md uppercase font-bold tracking-wide">
                Objectif J+7
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-black leading-snug">
                Prête à voir ton score de {result.score}/100 grimper ?
              </p>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                En lançant ta routine dès aujourd'hui, ta peau va commencer sa régulation. Active ton rappel pour bloquer ta prochaine analyse automatique dans exactement 7 jours.
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={() => {
                  setJ7ReminderSet(!j7ReminderSet);
                  toast({
                    title: j7ReminderSet ? "Rappel annulé" : "Rappel activé ! 🗓️",
                    description: j7ReminderSet 
                      ? "Le rappel J+7 a été désactivé." 
                      : "Nous te notifierons dans 7 jours pour analyser l'évolution de tes imperfections.",
                  });
                }}
                data-testid="button-j7-reminder"
                className={`w-full py-3 px-4 rounded-xl text-xs font-black tracking-wide transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-md ${
                  j7ReminderSet 
                    ? "bg-emerald-600 text-white shadow-emerald-900/20" 
                    : "bg-white text-gray-900 hover:bg-gray-50 shadow-white/5"
                }`}
              >
                {j7ReminderSet ? "✓ Rappel activé pour le diagnostic de suivi" : "🗓️ Planifier mon scan de contrôle gratuit (J+7)"}
              </button>
            </div>

            <p className="text-[9px] text-gray-400 text-center font-medium">
              🔒 Le suivi d'évolution nécessite l'application rigoureuse du protocole commandé.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
                {/* BLOC 9 : L'ACCÈS AU SKINBOT IA — CONVERSION PREMIUM À 2 000 FRScfa */}
        {user && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4" data-testid="block-skinbot-premium">
            
            {/* Titre d'accroche pour créer le besoin si elle n'est pas premium */}
            {!isPremium && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-pink-600">
                  <Sparkles className="w-4 h-4" />
                  <p className="text-[11px] font-black uppercase tracking-wider">Accompagnement Continu</p>
                </div>
                <h4 className="text-sm font-black text-gray-950 leading-tight">
                  Des questions sur l'évolution de vos imperfections ?
                </h4>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Débloquez votre coach cutané personnel. SkinBot IA ajuste votre routine au quotidien selon la météo locale, suit vos réactions aux actifs et répond 24h/24.
                </p>
                {/* Badge de prix psychologique */}
                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                  <span className="bg-gray-900 text-white font-extrabold px-1.5 py-0.5 rounded text-[9px]">Seulement 2 000 FRS</span>
                  Accès illimité à vie sans abonnement mensuel.
                </div>
              </div>
            )}

            {/* Le Bouton d'Action Principal */}
            <a
              href={isPremium ? "/chat" : "/premium"}
              data-testid="button-skinbot-cta"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all tracking-wide shadow-lg group"
              style={{
                background: isPremium
                  ? "linear-gradient(135deg, #E91E8C 0%, #C2185B 100%)"
                  : "linear-gradient(135deg, #1A1A2E 0%, #E91E8C 100%)",
                color: "#fff",
                boxShadow: isPremium ? "0 8px 24px rgba(233,30,140,0.3)" : "0 8px 24px rgba(26,26,46,0.25)",
              }}
            >
              <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
              <div className="text-left flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider leading-none">
                  {isPremium ? "Ouvrir mon suivi SkinBot IA" : "⭐ Activer SkinBot Premium"}
                </span>
                {!isPremium && (
                  <span className="text-[9px] font-medium opacity-80 mt-0.5 leading-none">
                    Votre dermatologue de poche pour 2 000 FRS
                  </span>
                )}
              </div>
            </a>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            BLOC 10 — Rappel J+7
            ═══════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-pink-50 to-emerald-50 rounded-2xl p-5 border border-pink-100" data-testid="block-j7">
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
        </div>
      </motion.div>

      {/* ── Disclaimer médical ── */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gray-50 border border-gray-200" data-testid="disclaimer-medical">
        <span className="text-base flex-shrink-0">⚕️</span>
        <p className="text-[11px] text-gray-500 font-medium leading-relaxed text-center">
          Notre diagnostic ne remplace pas un dermatologue. Consultez un professionnel de santé pour tout problème persistant.
        </p>
      </div>

      {/* ── Modals ── */}
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
import { OrderTrackingCard } from "@/components/OrderTrackingCard";

// Dans ton composant ResultCard, là où tu as tes données :
<OrderTrackingCard 
  products={result.recommendations.products} 
  onRedirectToOrder={() => {
    // Exemple : Envoi direct sur le WhatsApp Business ou la page panier
    window.open("https://wa.me/237674377959?text=Bonjour%20GlowScan,%20je%20souhaite%20commander%20ma%20routine...", "_blank");
  }}
/>
