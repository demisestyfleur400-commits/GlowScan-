// ─── SYSTÈME DE CORRESPONDANCE DE L'OMBRE (ANTI-FUITE) ─────────────
const getClinicalNomenclature = (productName: string, role: string): { anonymousName: string; secretCode: string } => {
  const nameLower = productName.toLowerCase();
  
  // Génération d'un code unique basé sur le nom du produit
  let hash = 0;
  for (let i = 0; i < productName.length; i++) hash = ((hash << 5) - hash + productName.charCodeAt(i)) | 0;
  const uniqueId = Math.abs(hash % 99) + 1;
  const padId = uniqueId < 10 ? `0${uniqueId}` : uniqueId;

  if (role === "nettoyant") {
    let ingredients = "Céramides & Zinc PCA";
    if (nameLower.includes("savon") || nameLower.includes("acn")) ingredients = "Soufre & Arbre à Thé";
    if (nameLower.includes("gommage")) ingredients = "Micro-Acides de Fruits (AHA)";
    return {
      anonymousName: `GlowScan Solution 🧴 Nettoyant Purifiant ${ingredients}`,
      secretCode: `#GS-N${padId}`
    };
  }
  
  if (role === "serum") {
    let ingredients = "Niacinamide 10% & Acide Hyaluronique";
    if (nameLower.includes("chebe") || nameLower.includes("bloom")) ingredients = "Complexe Capillaire Chébé Bio Active";
    if (nameLower.includes("huile") || nameLower.includes("oil")) ingredients = "Éclat Botanique Oxygénante";
    return {
      anonymousName: `GlowScan Concentré 💧 Sérum Actif Cblé ${ingredients}`,
      secretCode: `#GS-S${padId}`
    };
  }
  
  let ingredients = "Vitamine C & Filtres Barrières";
  if (nameLower.includes("creme") || nameLower.includes("cacao")) ingredients = "Beurre de Cacao Pur & Lipides Protecteurs";
  return {
    anonymousName: `GlowScan Formule 🛡️ Soin Régénérant ${ingredients}`,
    secretCode: `#GS-C${padId}`
  };
};

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

// ─── Composants UI réutilisables et personnalisés ───────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || "modérée";
  let style = { background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)", color: "#f9a8d4" };
  if (s.includes("lég")) style = { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" };
  else if (s.includes("sév")) style = { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" };
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={style} data-testid="badge-severity">
      <AlertTriangle className="w-3 h-3" /> {severity}
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
    <div className="w-full max-w-[280px] mx-auto text-center" data-testid="glow-gauge">
      <div className="relative">
        <svg viewBox="0 0 240 140" className="w-full">
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#E91E8C" />
            </linearGradient>
          </defs>
          <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
          <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} fill="none" stroke="url(#gauge-gradient)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${filled},${remaining}`} />
          <text x={cx} y={cy - radius - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="bold">50</text>
          <text x={cx - radius} y={cy + 22} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="bold">0</text>
          <text x={cx + radius} y={cy + 22} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="bold">100</text>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
          <p className="text-5xl font-black text-white leading-none">{safeScore}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Glow Score</p>
        </div>
      </div>
      {observationsVisuelles && (
        <div
          className="mt-3 rounded-xl p-3 text-left"
          style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)" }}
        >
          <p className="text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider mb-1" style={{ color: "#f9a8d4" }}>
            <Sparkles className="w-3.5 h-3.5" /> L'avis du Doc'
          </p>
          <p className="text-xs font-semibold italic leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>"{observationsVisuelles}"</p>
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
    amber: "rgba(245,158,11,0.6)",
    rose: "rgba(233,30,140,0.6)",
    blue: "rgba(99,102,241,0.6)",
    emerald: "rgba(16,185,129,0.6)",
  };
  const accent = accentMap[color];
  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-1.5"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}33`, backdropFilter: "blur(10px)" }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
          <p className="text-lg font-black text-white leading-tight">
            {value}{suffix && <span className="text-xs font-bold ml-0.5">{suffix}</span>}
            {sub && <span className="text-[11px] font-semibold ml-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</span>}
          </p>
        </div>
      </div>
      {explicationContextuelle && (
        <div className="text-[11px] font-medium pt-1.5 leading-snug" style={{ color: "rgba(255,255,255,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          💡 {explicationContextuelle}
        </div>
      )}
    </div>
  );
}

function GridTile({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId?: string }) {
  return (
    <div
      className="rounded-2xl px-3 py-3 flex flex-col items-center text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      </div>
      <p className="text-[13px] font-extrabold text-white leading-tight">{value}</p>
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
        <polygon key={level} points={labels.map((_, i) => `${getPoint(i, level * 10).x},${getPoint(i, level * 10).y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      ))}
      {labels.map((_, i) => <line key={i} x1={cx} y1={cy} x2={getPoint(i, 10).x} y2={getPoint(i, 10).y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />)}
      <path d={dataPath} fill="rgba(233,30,140,0.15)" stroke="#E91E8C" strokeWidth="2" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#E91E8C" stroke="rgba(13,10,14,0.8)" strokeWidth="2" />)}
      {labels.map((l, i) => (
        <text key={i} x={getPoint(i, 12.5).x} y={getPoint(i, 12.5).y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="bold">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

function ProtocolRow({ index, step }: { index: number; step: ProtocolStep }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center mt-0.5" style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)" }}>
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white leading-tight">{step.step}</p>
        {step.product && (
          <p className="text-[12px] font-medium leading-snug" style={{ color: "#f9a8d4" }}>{step.product}</p>
        )}
        {step.why && (
          <p className="text-[12px] italic leading-snug mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{step.why}</p>
        )}
      </div>
    </li>
  );
}

// ─── COMPOSANT PRINCIPAL SÉCURISÉ ───────────────────────────────────
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

  // ─── Déclarer les variables manquantes ─────────────────────────────
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
      <div className="max-w-lg mx-auto px-4" data-testid="result-unanalyzable">
        <div className="rounded-3xl p-6 text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Camera className="w-8 h-8" style={{ color: "#fbbf24" }} />
          </div>
          <h2 className="text-lg font-black text-white mb-2">Photo non analysable</h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
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

  const getProductRole = (p: typeof catalog[0]): "nettoyant" | "serum" | "creme" => {
    const n = p.name.toLowerCase();
    if (n.includes("savon") || n.includes("soap") || n.includes("gel de douche") || n.includes("gel douche") || n.includes("gommage") || n.includes("shampoo") || n.includes("shampoing")) return "nettoyant";
    if (n.includes("sérum") || n.includes("serum") || n.includes("huile") || n.includes("oil") || n.includes("lotion") || n.includes("tonic") || n.includes("tonique") || n.includes("potion")) return "serum";
    return "creme";
  };

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
    return winner.products.map((p, i) => {
      const roleKey = getProductRole(p);
      const { anonymousName, secretCode } = getClinicalNomenclature(p.name, roleKey);
      
      return {
        product: {
          ...p,
          name: anonymousName,
          secretCode: secretCode,
          brand: "GlowScan Clinic"
        },
        role: roleLabels[roleKey] || roleLabels["creme"],
        index: i + 1,
      };
    });
  };

  const routineProducts = findRoutineProducts();

  const getIntermediateOffer = () => {
    if (routineProducts.length < 2) return null;
    const duoProducts = routineProducts.slice(0, 2);
    const totalPriceDuo = duoProducts.reduce((sum, item) => sum + item.product.price, 0);
    const orderCodes = duoProducts.map(item => (item.product as any).secretCode).join(" + ");
    
    return {
      duo: duoProducts,
      totalPrice: totalPriceDuo,
      secretCodes: orderCodes,
      copywriting: {
        title: "Le Compromis Idéal ✨",
        subtitle: currentArea === "cheveux" ? "Le Kit Duo Croissance" : "Le Protocole Duo Action Ciblée",
        description: `Le strict minimum requis par notre IA pour saturer les récepteurs de votre peau sans surcharger votre budget.`
      }
    };
  };

  const intermediateOffer = getIntermediateOffer();

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
        <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid="block-diagnostic">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.35)" }}>Diagnostic & Stratégie</p>
            <SeverityBadge severity={result.severity || "Modérée"} />
          </div>
          <h1 className="text-[22px] font-black text-white leading-tight mb-5 font-display" data-testid="text-condition">
            {result.condition}
          </h1>

          <GlowGauge 
            score={result.score} 
            observationsVisuelles={result.consultationData?.observations_visuelles || (result as any).observationsVisuelles} 
          />
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
            value={deriveLesionsLabel(result).replace("inflammatoires ", "")}
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
          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid="block-radar">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-center" style={{ color: "#f9a8d4" }}>Équilibre cutané</p>
            <RadarChart balance={result.balance} />
          </div>
        )}

        {/* ═══════════════════════════════════════════
            BLOC 4 — L'Ordonnance Clinique
            ═══════════════════════════════════════════ */}
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid="block-expert">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: "radial-gradient(circle, rgba(233,30,140,0.15), transparent)" }} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "#E91E8C" }} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Conclusions du Dr. GlowScan</h2>
            </div>
            <span className="text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wide" style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)", color: "#f9a8d4" }}>
              ✓ Approuvé IA
            </span>
          </div>

          {result.details && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-black uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Évaluation de la barrière cutanée :</p>
              <p className="text-xs leading-relaxed font-medium" style={{ color: "rgba(255,255,255,0.65)" }} data-testid="text-details">
                {result.details}
              </p>
            </div>
          )}

          <div className="rounded-2xl p-4 relative" style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)" }}>
            <div className="absolute -top-2 left-4 text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: "rgba(13,10,14,0.9)", border: "1px solid rgba(233,30,140,0.3)", color: "#f9a8d4" }}>
              La recommandation clé
            </div>
            <p className="text-[12px] font-semibold leading-relaxed italic mt-1" style={{ color: "rgba(255,255,255,0.7)" }} data-testid="text-motivation">
              "{expertCitation}"
            </p>
          </div>

          <p className="text-[10px] text-center font-medium mt-3.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            🔒 Vos données d'analyse clinique restent 100% confidentielles.
          </p>
        </div>

        {/* ═══════════════════════════════════════════
            BLOC 5 — Cartographie visuelle des zones
            ═══════════════════════════════════════════ */}
        {result.zones && result.zones.length > 0 && (
          <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid="block-zones-map">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <ScanIcon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-white">Cartographie Cutanée</h2>
                  <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Localisation des foyers à traiter</p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Analyse Rétinienne IA
              </span>
            </div>

            <div className="rounded-2xl p-2 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <FaceZonesMap zones={result.zones} />
            </div>

            <p className="text-[10px] text-center font-medium mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
              💡 Cliquez sur les zones colorées pour isoler les imperfections détectées.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            BLOC 6 — Protocole de soin
            ═══════════════════════════════════════════ */}
        {(protocolMorning.length > 0 || protocolEvening.length > 0 || weekly) && (
          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid="block-protocol">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#E91E8C" }} />
                <h2 className="text-[15px] font-black text-white font-display">Mon Ordonnance d'Application</h2>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)", color: "#f9a8d4" }}>
                Cycle de 4 à 6 semaines
              </span>
            </div>
            <p className="text-[11px] mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Suivez rigoureusement cet ordre pour maximiser la pénétration des actifs sous le climat chaud.
            </p>

            <div className="space-y-6">
              {/* ☀️ LE PROTOCOLE DU MATIN */}
              {protocolMorning.length > 0 && (
                <div className="relative pl-4" style={{ borderLeft: "2px solid rgba(245,158,11,0.4)" }}>
                  <div className="absolute -left-[9px] top-0 text-white rounded-full p-0.5" style={{ background: "#f59e0b" }}>
                    <Sun className="w-3 h-3" />
                  </div>
                  <h3 className="text-[12px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "#fbbf24" }}>
                    Rituel du Matin <span className="text-[10px] font-medium font-sans lowercase" style={{ color: "rgba(255,255,255,0.3)" }}>(protection & régulation)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {protocolMorning.map((s, i) => {
                      const stepData = normalizeStep(s, i);
                      const matchedItem = routineProducts.find(rp => 
                        stepData.product && rp.product.name.toLowerCase().includes(stepData.product.toLowerCase())
                      );

                      return (
                        <div key={`m-${i}`} className="rounded-2xl p-2.5 flex items-center gap-3 transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-5 h-5 rounded-lg text-[11px] font-black text-white flex items-center justify-center flex-shrink-0" style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)" }}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>{stepData.step}</p>
                            <p className="text-[12px] font-bold text-white truncate">
                              {matchedItem ? matchedItem.product.name : (stepData.product || stepData.step)}
                            </p>
                            {stepData.why && <p className="text-[10px] leading-snug mt-0.5 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{stepData.why}</p>}
                          </div>

                          {matchedItem && (
                            <div className="w-10 h-10 rounded-xl p-0.5 flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                              <img
                                src={productImages[matchedItem.product.id] || "/placeholder-product.png"}
                                alt={matchedItem.product.name}
                                className="w-full h-full object-contain"
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
                <div className="relative pl-4" style={{ borderLeft: "2px solid rgba(99,102,241,0.4)" }}>
                  <div className="absolute -left-[9px] top-0 text-white rounded-full p-0.5" style={{ background: "#6366f1" }}>
                    <Moon className="w-3 h-3" />
                  </div>
                  <h3 className="text-[12px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "#a5b4fc" }}>
                    Rituel du Soir <span className="text-[10px] font-medium font-sans lowercase" style={{ color: "rgba(255,255,255,0.3)" }}>(réparation intense)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {protocolEvening.map((s, i) => {
                      const stepData = normalizeStep(s, i);
                      const matchedItem = routineProducts.find(rp => 
                        stepData.product && rp.product.name.toLowerCase().includes(stepData.product.toLowerCase())
                      );

                      return (
                        <div key={`e-${i}`} className="rounded-2xl p-2.5 flex items-center gap-3 transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-5 h-5 rounded-lg text-[11px] font-black text-white flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>{stepData.step}</p>
                            <p className="text-[12px] font-bold text-white truncate">
                              {matchedItem ? matchedItem.product.name : (stepData.product || stepData.step)}
                            </p>
                            {stepData.why && <p className="text-[10px] leading-snug mt-0.5 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{stepData.why}</p>}
                          </div>

                          {matchedItem && (
                            <div className="w-10 h-10 rounded-xl p-0.5 flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                              <img
                                src={productImages[matchedItem.product.id] || "/placeholder-product.png"}
                                alt={matchedItem.product.name}
                                className="w-full h-full object-contain"
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
                <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" }}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "#c084fc" }}>Soin Booster Hebdomadaire</p>
                    <p className="text-[12px] font-bold leading-tight mt-0.5 text-white">{weekly}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            BLOC 7 : TUNNEL D'ACHAT
            ═══════════════════════════════════════════ */}
        {routineProducts.length > 0 ? (
          (() => {
            const routineTotal = routineProducts.reduce((sum, { product }) => sum + (product.price || 0), 0);
            const brandLabel = getProductBrand(routineProducts[0].product);
            
            const unitPriceTotal = Math.round(routineTotal * 1.2);
            const totalSavingsRoutine = unitPriceTotal - routineTotal;
            
            const duoTotal = intermediateOffer ? intermediateOffer.totalPrice : 0;
            const unitPriceDuo = Math.round(duoTotal * 1.15);
            const totalSavingsDuo = unitPriceDuo - duoTotal;

            return (
              <div className="mt-6 space-y-5 px-1 animate-fade-in" data-testid="block-conversion-tunnel">
                
                {/* NOTIFICATION DE FOMO */}
                <div className="p-3.5 rounded-2xl flex items-center gap-2.5" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <span className="flex h-2 w-2 relative flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <p className="text-[11px] font-bold leading-tight" style={{ color: "rgba(255,255,255,0.7)" }}>
                    🔥 <span className="text-red-400 font-extrabold">37 femmes</span> ont validé cette ordonnance à Douala aujourd'hui. Stock de la gamme <span className="underline">{brandLabel}</span> limité.
                  </p>
                </div>

                {/* DOUBLE OFFRE COMPARATIVE */}
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* OFFRE 1 : L'EXPÉRIENCE TOTALE */}
                  <div className="rounded-3xl p-5 flex flex-col justify-between transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-white text-sm flex items-center gap-1">
                          L'Expérience Totale 🚀
                        </h4>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}>
                          Économie : {formatPrice(totalSavingsRoutine)}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Traitement Global Synergique (Nettoyant + Sérum + Crème)</p>
                      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Zéro compromis. C'est la combinaison exacte recommandée par l'IA pour traiter le problème à la racine.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3.5 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div>
                        <p className="text-[9px] font-bold line-through" style={{ color: "rgba(255,255,255,0.25)" }}>{formatPrice(unitPriceTotal)}</p>
                        <p className="text-lg font-black text-white">{formatPrice(routineTotal)}</p>
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
                        className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-black rounded-xl transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        Prendre la Totale
                      </button>
                    </div>
                  </div>

                  {/* OFFRE 2 : LE DUO */}
                  {intermediateOffer && (
                    <div className="rounded-3xl p-5 relative transition-all scale-[1.01]" style={{ background: "linear-gradient(135deg, rgba(233,30,140,0.12) 0%, rgba(255,255,255,0.04) 100%)", border: "2px solid rgba(233,30,140,0.4)", boxShadow: "0 0 30px rgba(233,30,140,0.15)" }}>
                      <div className="absolute -top-3 right-5 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)", boxShadow: "0 0 15px rgba(233,30,140,0.5)" }}>
                        Le Compromis Idéal ✨
                      </div>

                      <h4 className="font-black text-white text-sm mb-0.5">
                        {intermediateOffer.copywriting.title}
                      </h4>
                      <p className="text-[10px] font-bold mb-2" style={{ color: "#f9a8d4" }}>{intermediateOffer.copywriting.subtitle}</p>
                      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Vous n'avez pas le budget pour la totale ? Ce duo rassemble les 2 actifs majeurs pour stopper l'urgence cutanée.
                      </p>

                      <div className="space-y-2 mb-4 rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(233,30,140,0.15)" }}>
                        {intermediateOffer.duo.map((item, idx) => (
                          <div key={idx} className="text-[11px] font-bold text-white flex items-center gap-2">
                            <span className="p-0.5 rounded text-xs" style={{ background: "rgba(233,30,140,0.15)" }}>{item.role.emoji}</span>
                            <span className="truncate">{item.product.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3.5" style={{ borderTop: "1px solid rgba(233,30,140,0.2)" }}>
                        <div>
                          <p className="text-[9px] font-bold line-through" style={{ color: "rgba(255,255,255,0.25)" }}>{formatPrice(unitPriceDuo)}</p>
                          <p className="text-lg font-black" style={{ color: "#f9a8d4" }}>{formatPrice(duoTotal)}</p>
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
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          Prendre le Duo
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* BLOC LOGISTIQUE */}
                <div className="px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <Truck className="w-5 h-5 flex-shrink-0" style={{ color: "#6ee7b7" }} />
                  <div className="text-left">
                    <p className="text-[11px] font-black leading-tight" style={{ color: "#6ee7b7" }}>Expédition Express au Cameroun</p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: "rgba(110,231,183,0.7)" }}>Livraison à domicile (Douala & Yaoundé) · Paiement Cash à la livraison</p>
                  </div>
                </div>

                {/* Action secondaire */}
                <button
                  onClick={() => setShowRoutineCard(true)}
                  className="w-full py-2 text-[11px] font-bold transition-all text-center underline tracking-wide"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  💾 Enregistrer ou partager mon ordonnance personnalisée
                </button>
              </div>
            );
          })()
        ) : null}

        {/* Footer Prévention Clinique */}
        <div className="px-4 py-2.5 flex items-center gap-2 text-[10px] font-semibold text-left rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
          <span>Analyse indicative générée par GlowScan AI.</span>
        </div>
      </motion.div>

      {/* ── Disclaimer médical ── */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="disclaimer-medical">
        <span className="text-base flex-shrink-0">⚕️</span>
        <p className="text-[11px] font-medium leading-relaxed text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
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
