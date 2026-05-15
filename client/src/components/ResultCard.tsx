import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, AlertTriangle, Eye, Droplets, ShieldAlert, Scan as ScanIcon, Share2, Truck, ChevronRight, ImageIcon, Lock, Sun, Moon, Calendar, Bell } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { ShareCard } from "./ShareCard";
import FaceZonesMap from "./FaceZonesMap";
import { RoutineShareCard } from "./RoutineShareCard";
import OrderModal, { type OrderItem } from "./OrderModal";
import MedicalReport from "./MedicalReport";
import { Component as ReactComponent, type ReactNode } from "react";
import { catalog, getProductBrand, getBrandByWhatsapp, formatPrice } from "@shared/catalog";
import { productImages as centralProductImages } from "@/lib/productImages";
import { trackWhatsappClick } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

class MedicalReportBoundary extends ReactComponent<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean; msg: string }> {
  state = { hasError: false, msg: "" };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, msg: err?.message || String(err) };
  }
  componentDidCatch(err: Error) {
    console.error("[MedicalReport crash]", err?.message, err?.stack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-900" data-testid="block-medical-fallback">
          <p className="font-bold mb-1">Affichage simplifié</p>
          <p className="mb-2">Impossible d'afficher le rapport détaillé. Voici tes infos essentielles ci-dessous.</p>
          <p className="text-[10px] text-amber-700/70 break-words">Détail technique : {this.state.msg}</p>
          <div className="mt-3">{this.props.fallback}</div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}
const productImages = centralProductImages;

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


export function ResultCard({ result, scanId, area, imageUrl, userFirstName }: ResultCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRoutineCard, setShowRoutineCard] = useState(false);
  const [j7ReminderSet, setJ7ReminderSet] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalItems, setOrderModalItems] = useState<OrderItem[]>([]);
  const [orderModalTitle, setOrderModalTitle] = useState("");



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

    // ─── Règle "une seule marque locale par routine" ─────────────────
    // Une routine = 100% une seule marque locale (Andrea / Ebony / Hair Bloom)
    // = 1 seule livraison + cohérence de gamme.
    // ────────────────────────────────────────────────────────────────────
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
    for (const [waKey, brandProducts] of Array.from(localsByBrand.entries())) {
      const c = buildSource(brandProducts, waKey);
      if (c) candidates.push(c);
    }

    // Choisir la marque locale qui matche le mieux le diagnostic
    candidates.sort((a, b) => b.total - a.total);

    // Fallback si aucune marque ne rassemble 3 produits : prendre la plus fournie
    let winner: Source | null = candidates[0] || null;
    if (!winner) {
      const fallbackPool = Array.from(localsByBrand.values()).sort((a, b) => b.length - a.length)[0] || areaProducts;
      const sorted = [...fallbackPool].sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, 3);
      if (sorted.length === 0) return [];
      winner = { products: sorted, total: 0, brandKey: sorted[0].whatsapp || "" };
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
            <MedicalReportBoundary
              fallback={
                <div className="space-y-2 text-[12px] text-gray-800">
                  {result.skinType && <p><span className="font-bold">Type :</span> {result.skinType}</p>}
                  {result.condition && <p><span className="font-bold">Diagnostic :</span> {result.condition}</p>}
                  {typeof result.score === "number" && <p><span className="font-bold">GlowScore :</span> {result.score}/100</p>}
                  {result.details && <p className="whitespace-pre-line">{result.details}</p>}
                </div>
              }
            >
              <MedicalReport
                result={result}
                scanId={scanId}
                area={area}
                imageUrl={imageUrl}
                userFirstName={userFirstName}
                previousScore={result.predictiveInsights?.progression?.previousScore ?? null}
              />
            </MedicalReportBoundary>

            {/* ── Analyse technique par zone (Cerveau Structuré) ── */}
            {(() => {
              const r = result as any;
              const zones = r?.analyse_zones as Record<string, string> | undefined;
              const justif = r?.justification_score as string | undefined;
              const conseil = r?.conseil_expert as string | undefined;
              if (!zones && !justif && !conseil) return null;
              return (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100" data-testid="section-technical">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-3">Analyse technique par zone</p>
                  {zones && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {Object.entries(zones).map(([z, d]) => (
                        <div key={z} className="text-[11px] bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                          <p className="font-black uppercase tracking-wider text-gray-500 text-[9px] mb-0.5">{z}</p>
                          <p className="text-gray-800 leading-snug">{d}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {justif && (
                    <div className="text-xs text-gray-700 leading-snug mb-2 px-1">
                      <span className="font-black uppercase tracking-wider text-gray-500 text-[9px]">Pourquoi ce score :</span> {justif}
                    </div>
                  )}
                  {conseil && (
                    <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="font-black uppercase tracking-wider text-amber-700 text-[9px] mb-1">Conseil expert</p>
                      <p className="text-gray-800 leading-snug">{conseil}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Carte visuelle des zones de la peau ── */}
            {result.zones && result.zones.length > 0 && (
              <FaceZonesMap zones={result.zones} />
            )}

            {/* ── Détails repliables : Équilibre cutané (radar) ── */}
            {user && result.balance && (
              <details className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" data-testid="details-balance">
                <summary className="cursor-pointer px-6 py-4 flex items-center justify-between text-sm font-black text-gray-900 hover:bg-gray-50 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600">Détails — Équilibre cutané</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </summary>
                <div className="px-6 pb-6">
                  <RadarChart balance={result.balance} />
                </div>
              </details>
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
                  {result.recommendations.morning.map((s: any, idx) => {
                    const text = typeof s === "string"
                      ? s
                      : [s?.step, s?.product, s?.why].filter((x) => typeof x === "string").join(" — ");
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
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
                  {result.recommendations.evening.map((s: any, idx) => {
                    const text = typeof s === "string"
                      ? s
                      : [s?.step, s?.product, s?.why].filter((x) => typeof x === "string").join(" — ");
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
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
