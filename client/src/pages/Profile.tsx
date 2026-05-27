import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Navbar } from "@/components/Navbar";
import { ResultCard } from "@/components/ResultCard";
import { PrivacySettings } from "@/components/PrivacySettings";
import { Loader2, Calendar, ChevronRight, Star, Gift, Trophy, Share2, ScanFace, Sparkles, Check, Copy, Bell, Flame, Target, Bot, Link2, Crown, Zap, X, Filter, GitCompare, TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult } from "@shared/schema";


function ScoreChart({ scans }: { scans: Array<{ score: number | null; createdAt: Date | null; area: string }> }) {
  const pts = scans.slice(0, 10).reverse().filter(s => s.score !== null) as Array<{ score: number; createdAt: Date | null; area: string }>;
  if (pts.length < 2) return null;
  const W = 320, H = 80, pad = 12;
  const scores = pts.map(p => p.score);
  const minS = Math.min(...scores, 0), maxS = Math.max(...scores, 100);
  const range = maxS - minS || 1;
  const xStep = (W - pad * 2) / (pts.length - 1);
  const toX = (i: number) => pad + i * xStep;
  const toY = (s: number) => H - pad - ((s - minS) / range) * (H - pad * 2);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.score)}`).join(" ");
  const latest = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const trend = latest >= prev ? "↑" : "↓";
  const trendColor = latest >= prev ? { color: "#10b981" } : { color: "#f43f5e" };

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid="card-score-chart">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Évolution du Score</p>
          <p className="text-sm font-bold text-white mt-0.5">{pts.length} analyses</p>
        </div>
        <div className="flex items-center gap-1 text-lg font-extrabold" style={trendColor}>
          {trend} <span className="text-base">{latest}/100</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E91E8C" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1={pad} y1={toY(v)} x2={W - pad} y2={toY(v)}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}
        <path d={path} fill="none" stroke="url(#chartGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.score)} r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? "#10b981" : "#E91E8C"}
            stroke="rgba(13,10,14,0.8)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{pts[0]?.createdAt ? format(new Date(pts[0].createdAt), "d MMM", { locale: fr }) : ""}</span>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{pts[pts.length - 1]?.createdAt ? format(new Date(pts[pts.length - 1].createdAt!), "d MMM", { locale: fr }) : "Auj."}</span>
      </div>
    </div>
  );
}

function RoutineShortcut() {
  return (
    <Link href="/routine">
      <div className="flex items-center justify-between rounded-2xl p-4 mb-6 cursor-pointer active:scale-[0.98] transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="card-routine-shortcut">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}>
            <Check className="w-5 h-5" style={{ color: "#E91E8C" }} />
          </div>
          <div>
            <p className="text-sm font-black text-white">Ma routine</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Matin & soir, étape par étape</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} />
      </div>
    </Link>
  );
}

const AREA_LABELS: Record<string, string> = { face: "Visage", body: "Corps", hair: "Cheveux" };
const AREA_EMOJI: Record<string, string> = { face: "😊", body: "🫧", hair: "💇" };

type ScanRecord = {
  id: number;
  area: string;
  condition: string | null;
  analysis: string | null;
  recommendations: unknown;
  score: number | null;
  motivation: string | null;
  createdAt: Date | null;
  imageUrl: string | null;
};

function scanToAnalysisResult(scan: ScanRecord): AnalysisResult {
  const recs = (scan.recommendations as any) || {};
  if (recs._fullResult) return recs._fullResult as AnalysisResult;
  return {
    condition: scan.condition || "Analyse",
    severity: "modérée",
    score: scan.score || 0,
    skinType: "Normal",
    details: scan.analysis || "",
    motivation: scan.motivation || "",
    stats: { lesions: "–", zones: "–", pores: "–", marks: "–" },
    balance: { inflammation: 50, sebum: 50, pores: 50, sensitivity: 50, scars: 50 },
    recommendations: {
      products: Array.isArray(recs.products) ? recs.products : [],
      morning: Array.isArray(recs.morning) ? recs.morning : [],
      evening: Array.isArray(recs.evening) ? recs.evening : [],
      weekly: recs.weekly || "",
    },
  };
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#E91E8C";
  return "#f43f5e";
}

function getScoreBg(score: number): React.CSSProperties {
  if (score >= 75) return { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" };
  if (score >= 50) return { background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.3)" };
  return { background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)" };
}

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-4xl font-black" : size === "sm" ? "text-lg font-bold" : "text-2xl font-extrabold";
  return (
    <div className="rounded-xl px-3 py-1 text-center" style={getScoreBg(score)}>
      <span className={sz} style={{ color: getScoreColor(score) }}>{score}</span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>/100</span>
    </div>
  );
}

function ScanDetailModal({ scan, onClose }: { scan: ScanRecord; onClose: () => void }) {
  const { user } = useAuth();
  const result = scanToAnalysisResult(scan);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#0D0A0E" } as React.CSSProperties}
    >
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
          data-testid="button-close-scan-detail"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {AREA_EMOJI[scan.area] || "🔬"} {scan.condition || "Analyse"}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {scan.createdAt ? format(new Date(scan.createdAt), "d MMMM yyyy • HH:mm", { locale: fr }) : ""}
          </p>
        </div>
        <ScoreBadge score={scan.score || 0} size="sm" />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ResultCard
          result={result}
          scanId={scan.id}
          area={scan.area as any}
          imageUrl={(scan as any).imageUrl || null}
          userFirstName={(user as any)?.firstName || null}
        />
      </div>
    </motion.div>
  );
}

function CompareModal({ scanA, scanB, onClose }: { scanA: ScanRecord; scanB: ScanRecord; onClose: () => void }) {
  const delta = (scanB.score || 0) - (scanA.score || 0);
  const deltaColor = delta > 0 ? "#10b981" : delta < 0 ? "#f43f5e" : "rgba(255,255,255,0.35)";
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  const recA = (scanA.recommendations as any) || {};
  const recB = (scanB.recommendations as any) || {};
  const morningA: string[] = Array.isArray(recA.morning) ? recA.morning : [];
  const morningB: string[] = Array.isArray(recB.morning) ? recB.morning : [];
  const eveningA: string[] = Array.isArray(recA.evening) ? recA.evening : [];
  const eveningB: string[] = Array.isArray(recB.evening) ? recB.evening : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#0D0A0E" } as React.CSSProperties}
    >
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }} data-testid="button-close-compare">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-white flex-1">Comparaison de scans</h2>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Score comparison */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>Évolution du Glow Score</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{scanA.createdAt ? format(new Date(scanA.createdAt), "d MMM yyyy", { locale: fr }) : "Scan A"}</p>
              <ScoreBadge score={scanA.score || 0} size="lg" />
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{AREA_EMOJI[scanA.area]} {AREA_LABELS[scanA.area]}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <DeltaIcon className="w-6 h-6" style={{ color: deltaColor } as React.CSSProperties} />
              <span className="text-lg font-extrabold" style={{ color: deltaColor }}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>pts</span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{scanB.createdAt ? format(new Date(scanB.createdAt), "d MMM yyyy", { locale: fr }) : "Scan B"}</p>
              <ScoreBadge score={scanB.score || 0} size="lg" />
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{AREA_EMOJI[scanB.area]} {AREA_LABELS[scanB.area]}</p>
            </div>
          </div>
          {scanA.createdAt && scanB.createdAt && (
            <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              {Math.abs(differenceInDays(new Date(scanB.createdAt), new Date(scanA.createdAt)))} jours entre les deux analyses
            </p>
          )}
        </div>

        {/* Conditions */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Condition détectée</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{scanA.createdAt ? format(new Date(scanA.createdAt), "d MMM", { locale: fr }) : "Avant"}</p>
              <p className="text-sm font-bold text-white">{scanA.condition || "–"}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(233,30,140,0.1)", border: "1px solid rgba(233,30,140,0.25)" }}>
              <p className="text-[10px] mb-1" style={{ color: "#f9a8d4" }}>{scanB.createdAt ? format(new Date(scanB.createdAt), "d MMM", { locale: fr }) : "Après"}</p>
              <p className="text-sm font-bold" style={{ color: "#f9a8d4" }}>{scanB.condition || "–"}</p>
            </div>
          </div>
        </div>

        {/* Routine matin comparison */}
        {(morningA.length > 0 || morningB.length > 0) && (
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>☀️ Routine Matin</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Avant</p>
                <ul className="space-y-1">
                  {morningA.map((s, i) => <li key={i} className="text-xs flex items-start gap-1" style={{ color: "rgba(255,255,255,0.6)" }}><span style={{ color: "rgba(255,255,255,0.25)" }} className="flex-shrink-0">•</span>{s}</li>)}
                  {morningA.length === 0 && <li className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Aucune donnée</li>}
                </ul>
              </div>
              <div>
                <p className="text-[10px] mb-2" style={{ color: "#f9a8d4" }}>Après</p>
                <ul className="space-y-1">
                  {morningB.map((s, i) => <li key={i} className="text-xs flex items-start gap-1" style={{ color: "#f9a8d4" }}><span style={{ color: "rgba(233,30,140,0.5)" }} className="flex-shrink-0">•</span>{s}</li>)}
                  {morningB.length === 0 && <li className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Aucune donnée</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Analyse textuelle */}
        {(scanA.analysis || scanB.analysis) && (
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Analyse IA</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Avant</p>
                <p className="text-xs leading-relaxed line-clamp-6" style={{ color: "rgba(255,255,255,0.6)" }}>{scanA.analysis || "–"}</p>
              </div>
              <div>
                <p className="text-[10px] mb-2" style={{ color: "#f9a8d4" }}>Après</p>
                <p className="text-xs leading-relaxed line-clamp-6" style={{ color: "#f9a8d4" }}>{scanB.analysis || "–"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const REWARDS = [
  { type: "discount_5", points: 100, discount: 5, label: "-5% sur vos produits", color: "from-pink-400 to-pink-600" },
  { type: "discount_10", points: 200, discount: 10, label: "-10% sur vos produits", color: "from-pink-500 to-pink-600" },
  { type: "discount_15", points: 350, discount: 15, label: "-15% sur vos produits", color: "from-violet-400 to-purple-600" },
  { type: "discount_20", points: 500, discount: 20, label: "-20% sur vos produits", color: "from-rose-400 to-pink-600" },
];

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: scans, isLoading: scansLoading } = useScans();
  const { isPremium, scansThisMonth, scansRemaining, scansLimit, data: subData } = useSubscription();
  const [activeTab, setActiveTab] = useState<"profil" | "fidelite">("profil");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [filterArea, setFilterArea] = useState<"all" | "face" | "body" | "hair">("all");
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);
  const [compareScans, setCompareScans] = useState<{ a: ScanRecord; b: ScanRecord } | null>(null);
  const { toast } = useToast();

  const toggleCompareSelect = (scan: ScanRecord) => {
    setCompareSelection(prev => {
      if (prev.includes(scan.id)) return prev.filter(id => id !== scan.id);
      if (prev.length >= 2) return prev;
      return [...prev, scan.id];
    });
  };

  const { data: referralData } = useQuery<{ code: string; link: string }>({
    queryKey: ["/api/referral/me"],
    enabled: !!user,
  });

  const { data: loyaltyData, isLoading: loyaltyLoading } = useQuery<{
    totalPoints: number;
    availablePoints: number;
    history: any[];
    rewards: any[];
  }>({
    queryKey: ["/api/loyalty"],
    enabled: !!user && activeTab === "fidelite",
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardType: string) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem", { rewardType });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty"] });
      toast({
        title: "Récompense obtenue !",
        description: `Votre code promo ${data.discountCode} (-${data.discountPercent}%) est prêt. Mentionnez-le lors de votre commande WhatsApp.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err?.message || "Points insuffisants",
        variant: "destructive",
      });
    },
  });

  if (authLoading || scansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0A0E" } as React.CSSProperties}>
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "#0D0A0E" } as React.CSSProperties}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-profile-title">Mon Espace</h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Bon retour, {user.firstName}
            </p>
          </div>
          <Link href="/analyze">
            <span className="px-5 py-2.5 rounded-xl bg-pink-600 text-white font-semibold text-sm shadow-lg shadow-pink-600/20 hover:bg-pink-700 transition-all cursor-pointer inline-block" data-testid="button-new-analysis">
              + Nouvelle Analyse
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 rounded-xl p-1 w-fit mb-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setActiveTab("profil")}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === "profil" ? { background: "rgba(233,30,140,0.15)", color: "#f9a8d4", border: "1px solid rgba(233,30,140,0.25)" } : { color: "rgba(255,255,255,0.45)" }}
            data-testid="tab-profil"
          >
            <ScanFace className="w-4 h-4" /> Mon Profil
          </button>
          <button
            onClick={() => setActiveTab("fidelite")}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === "fidelite" ? { background: "rgba(233,30,140,0.15)", color: "#f9a8d4", border: "1px solid rgba(233,30,140,0.25)" } : { color: "rgba(255,255,255,0.45)" }}
            data-testid="tab-fidelite"
          >
            <Star className="w-4 h-4" /> Fidélité
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "profil" ? (
            <motion.div key="profil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Total Analyses</p>
                  <p className="text-3xl font-extrabold text-white mt-2" data-testid="text-total-scans">{scans?.length || 0}</p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Dernière Analyse</p>
                  <p className="text-lg font-bold text-white mt-2">
                    {scans && scans.length > 0
                      ? format(new Date(scans[0].createdAt!), "d MMMM yyyy", { locale: fr })
                      : "Aucune analyse"}
                  </p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Zone Ciblée</p>
                  <p className="text-lg font-bold text-white mt-2 capitalize">
                    {scans && scans.length > 0 ? (scans[0].area === 'face' ? 'Visage' : scans[0].area === 'body' ? 'Corps' : 'Cheveux') : "N/A"}
                  </p>
                </div>
              </div>

              {/* === Carte abonnement === */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 mb-5 flex items-center justify-between"
              style={isPremium
                ? { background: "rgba(233,30,140,0.1)", border: "1px solid rgba(233,30,140,0.3)" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
              }
                data-testid="card-subscription"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={isPremium ? { background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)" } : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {isPremium ? <Crown className="w-5 h-5" style={{ color: "#E91E8C" }} /> : <Zap className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {isPremium ? "Abonnement Premium actif" : "Forfait Gratuit"}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {isPremium
                        ? `Expire le ${subData?.subscription?.expiresAt ? new Date(subData.subscription.expiresAt).toLocaleDateString("fr-FR") : "—"}`
                        : `${scansRemaining ?? 3} analyse${(scansRemaining ?? 3) > 1 ? "s" : ""} restante${(scansRemaining ?? 3) > 1 ? "s" : ""} ce mois`
                      }
                    </p>
                  </div>
                </div>
                {!isPremium && (
                  <a
                    href="/premium"
                    data-testid="button-upgrade-profile"
                    className="text-xs font-bold bg-gradient-to-r from-pink-500 to-pink-600 text-white px-3 py-1.5 rounded-xl shadow-sm"
                  >
                    Passer Premium
                  </a>
                )}
                {isPremium && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ color: "#E91E8C", background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}>✓ Actif</span>
                )}
              </motion.div>

              {/* === Code de parrainage — toujours visible === */}
              {referralData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-5 mb-6 shadow-lg shadow-purple-200/50"
                  data-testid="card-referral-profil"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white">Ton code de parrainage</p>
                      <p className="text-xs text-white/60">Partage et aide tes amis à prendre soin de leur peau</p>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-white tracking-[0.15em]" data-testid="text-referral-code-profil">
                      {referralData.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.code);
                        toast({ title: "Code copié !", description: "Colle-le dans ton message WhatsApp 🎉" });
                      }}
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      data-testid="button-copy-referral-profil"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </button>
                  </div>

                  {/* Comment ça marche */}
                  <div className="space-y-1.5 mb-4">
                    {[
                      { step: "1", text: "Copie ton code ou ton lien ci-dessous" },
                      { step: "2", text: "Envoie-le à une amie via WhatsApp ou Story" },
                      { step: "3", text: "Elle scan sa peau et découvre sa routine" },
                    ].map(({ step, text }) => (
                      <div key={step} className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-black text-white">{step}</span>
                        </div>
                        <span className="text-xs text-white/80 font-medium">{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Boutons partage */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.link);
                        toast({ title: "Lien copié !", description: "Colle-le dans ton WhatsApp 🔗" });
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-colors"
                      data-testid="button-copy-link-profil"
                    >
                      <Link2 className="w-4 h-4" />
                      Copier le lien
                    </button>
                    <button
                      onClick={() => {
                        const text = `🌟 Analyse ta peau gratuitement avec GlowScan !\n\nObtiens ton Glow Score + une routine 100% personnalisée en 10 secondes ✨\n\n👉 ${referralData.link}`;
                        if (navigator.share) {
                          navigator.share({ title: "GlowScan", text, url: referralData.link });
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white text-violet-700 text-xs font-bold rounded-xl transition-colors"
                      data-testid="button-share-whatsapp-referral"
                    >
                      <Share2 className="w-4 h-4" />
                      Partager
                    </button>
                  </div>
                </motion.div>
              )}

              {/* === Streak & Countdown J+7 === */}
              {(() => {
                const lastScan = scans && scans.length > 0 ? scans[0] : null;
                if (!lastScan) return null;
                const daysSince = Math.floor((Date.now() - new Date(lastScan.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
                const daysLeft = Math.max(0, 7 - daysSince);
                const progress = Math.min(100, (daysSince / 7) * 100);
                const isDue = daysSince >= 7;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5 mb-6"
                    style={isDue
                      ? { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                    data-testid="card-streak"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={isDue ? { background: "rgba(244,63,94,0.15)", color: "#f43f5e" } : { background: "rgba(233,30,140,0.12)", color: "#E91E8C" }}>
                          {isDue ? <Bell className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        </div>
                        <p className="text-sm font-black text-white">
                          {isDue ? "🔔 Rescan recommandé !" : `Prochain scan dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-pink-500" />
                        <span className="text-sm font-bold text-pink-600">{scans?.length || 0} scan{(scans?.length || 0) > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, background: isDue ? "#f43f5e" : "#E91E8C" }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
                      <span>Dernier scan : {format(new Date(lastScan.createdAt!), "d MMM", { locale: fr })}</span>
                      <span className="font-bold" style={{ color: isDue ? "#f43f5e" : "#E91E8C" }}>
                        {isDue ? `+${daysSince - 7}j de retard` : `J+${daysSince}`}
                      </span>
                    </div>

                    {isDue && (
                      <Link href="/analyze">
                        <button
                          data-testid="button-rescan-now"
                          className="w-full py-2.5 bg-rose-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                        >
                          <ScanFace className="w-4 h-4" />
                          Rescanner maintenant
                        </button>
                      </Link>
                    )}
                  </motion.div>
                );
              })()}

              {/* Score evolution chart */}
              {scans && scans.length >= 2 && <ScoreChart scans={scans as any} />}

              {/* Routine shortcut */}
              <RoutineShortcut />

              {/* Chat IA shortcut */}
              <Link href="/chat">
                <div className="flex items-center justify-between bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 mb-6 shadow-md shadow-purple-200 cursor-pointer active:scale-[0.98] transition-all" data-testid="card-chat-shortcut">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Poser une question à SkinBot</p>
                      <p className="text-xs text-white/70">Conseils IA personnalisés sur ta peau</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </div>
              </Link>

              {/* === Historique des Analyses === */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Historique des Analyses</h2>
                {scans && scans.length >= 2 && (
                  <button
                    onClick={() => { setCompareMode(v => !v); setCompareSelection([]); }}
                    data-testid="button-toggle-compare"
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                    style={compareMode
                      ? { background: "linear-gradient(135deg, #E91E8C, #f43f5e)", color: "white" }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }
                    }
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    {compareMode ? "Annuler" : "Comparer"}
                  </button>
                )}
              </div>

              {/* Filtres par zone */}
              {scans && scans.length > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                  {(["all", "face", "body", "hair"] as const).map(area => (
                    <button
                      key={area}
                      onClick={() => setFilterArea(area)}
                      data-testid={`filter-area-${area}`}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                      style={filterArea === area
                        ? { background: "linear-gradient(135deg, #E91E8C, #f43f5e)", color: "white" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      {area === "all" ? "🌟 Tous" : `${AREA_EMOJI[area]} ${AREA_LABELS[area]}`}
                      {area !== "all" && scans && (
                        <span className="text-[10px] rounded-full px-1.5 py-0.5" style={filterArea === area ? { background: "rgba(255,255,255,0.2)" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                          {scans.filter(s => s.area === area).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Barre de comparaison flottante */}
              <AnimatePresence>
                {compareMode && compareSelection.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl"
                  >
                    <span className="text-sm font-bold">{compareSelection.length}/2 scan{compareSelection.length > 1 ? "s" : ""} sélectionné{compareSelection.length > 1 ? "s" : ""}</span>
                    <button
                      disabled={compareSelection.length < 2}
                      onClick={() => {
                        if (compareSelection.length < 2 || !scans) return;
                        const a = scans.find(s => s.id === compareSelection[0]);
                        const b = scans.find(s => s.id === compareSelection[1]);
                        if (a && b) {
                          const sorted = [a, b].sort((x, y) => new Date(x.createdAt!).getTime() - new Date(y.createdAt!).getTime());
                          setCompareScans({ a: sorted[0] as ScanRecord, b: sorted[1] as ScanRecord });
                        }
                      }}
                      data-testid="button-compare-launch"
                      className="px-4 py-1.5 bg-pink-500 text-white font-bold text-sm rounded-xl disabled:opacity-40 transition-all"
                    >
                      Comparer →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {scans && (() => {
                const filtered = filterArea === "all" ? scans : scans.filter(s => s.area === filterArea);
                if (filtered.length === 0) return (
                  <div className="text-center py-10 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                    <Filter className="w-10 h-10 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Aucun scan {AREA_LABELS[filterArea as string]?.toLowerCase()} pour l'instant</p>
                    <button onClick={() => setFilterArea("all")} className="text-xs font-bold mt-2 hover:underline" style={{ color: "#E91E8C" }}>Voir tous les scans</button>
                  </div>
                );
                return (
                  <div className="grid grid-cols-1 gap-3">
                    {filtered.map((scan, idx) => {
                      const isSelected = compareSelection.includes(scan.id);
                      const scoreVal = scan.score || 0;
                      return (
                        <motion.div
                          key={scan.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          onClick={() => {
                            if (compareMode) {
                              toggleCompareSelect(scan as ScanRecord);
                            } else {
                              setSelectedScan(scan as ScanRecord);
                            }
                          }}
                          data-testid={`card-scan-${scan.id}`}
                          className="p-4 rounded-2xl transition-all cursor-pointer group"
                          style={isSelected
                            ? { background: "rgba(233,30,140,0.1)", border: "1px solid rgba(233,30,140,0.4)", boxShadow: "0 0 20px rgba(233,30,140,0.15)" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }
                          }
                        >
                          <div className="flex items-center gap-3">
                            {/* Checkbox compare ou indicateur zone */}
                            {compareMode ? (
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all" style={isSelected ? { background: "#E91E8C", borderColor: "#E91E8C" } : { borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)" }}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.2)" }}>
                                {AREA_EMOJI[scan.area] || "🔬"}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: "rgba(233,30,140,0.12)", color: "#f9a8d4", border: "1px solid rgba(233,30,140,0.2)" }}>
                                  {AREA_LABELS[scan.area] || scan.area}
                                </span>
                                <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                                  <Calendar className="w-3 h-3" />
                                  {scan.createdAt ? format(new Date(scan.createdAt), "d MMM yyyy", { locale: fr }) : ""}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-white truncate">{scan.condition || "Analyse"}</h3>
                              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{scan.analysis}</p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-center px-2 py-1 rounded-xl" style={getScoreBg(scoreVal)}>
                                <span className="text-sm font-extrabold" style={{ color: getScoreColor(scoreVal) }}>{scoreVal}</span>
                                <span className="text-[9px] block leading-none" style={{ color: "rgba(255,255,255,0.35)" }}>/100</span>
                              </div>
                              {!compareMode && <ChevronRight className="w-4 h-4 transition-colors" style={{ color: "rgba(255,255,255,0.25)" }} />}
                            </div>
                          </div>

                          {/* Barre de score visuelle */}
                          <div className="mt-3 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${scoreVal}%`, background: getScoreColor(scoreVal) }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}

              {scans && scans.length === 0 && (
                <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                  <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>Aucun historique</h3>
                  <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>Commencez votre première analyse pour suivre votre santé cutanée.</p>
                  <Link href="/analyze">
                    <span className="px-5 py-2 rounded-xl bg-pink-600 text-white font-semibold text-sm cursor-pointer inline-block">
                      Analyser maintenant
                    </span>
                  </Link>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="fidelite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loyaltyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-pink-700 via-pink-600 to-pink-500 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-5 h-5 text-pink-300 fill-pink-300" />
                        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Programme de Fidélité</span>
                      </div>
                      <p className="text-4xl font-extrabold mt-2" data-testid="text-points-balance">
                        {loyaltyData?.availablePoints || 0} <span className="text-lg font-bold text-white/70">pts</span>
                      </p>
                      <p className="text-sm text-white/70 mt-1">Points disponibles</p>
                      {(loyaltyData?.totalPoints || 0) > (loyaltyData?.availablePoints || 0) && (
                        <p className="text-xs text-white/50 mt-1">
                          {loyaltyData?.totalPoints} pts gagnés au total · {(loyaltyData?.totalPoints || 0) - (loyaltyData?.availablePoints || 0)} pts utilisés
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}>
                          <ScanFace className="w-5 h-5" style={{ color: "#E91E8C" }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Analyse IA</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Faites une analyse de peau</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-lg font-extrabold" style={{ color: "#E91E8C" }}>+2 pts</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>par analyse</span>
                      </div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
                          <Share2 className="w-5 h-5" style={{ color: "#8b5cf6" }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Partage ton score</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Partagez à 3 amis</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-lg font-extrabold" style={{ color: "#8b5cf6" }}>+15 pts</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>par partage</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Gift className="w-5 h-5" style={{ color: "#E91E8C" }} /> Récompenses
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {REWARDS.map((reward) => {
                        const canRedeem = (loyaltyData?.availablePoints || 0) >= reward.points;
                        const progress = Math.min(100, Math.round(((loyaltyData?.availablePoints || 0) / reward.points) * 100));
                        return (
                          <div key={reward.type} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid={`reward-${reward.type}`}>
                            <div className={`h-1.5 bg-gradient-to-r ${reward.color}`} />
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-base font-bold text-white">{reward.label}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={canRedeem ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" } : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                                  {reward.points} pts
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                                <div
                                  className={`h-full bg-gradient-to-r ${reward.color} rounded-full transition-all duration-500`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: canRedeem ? "#10b981" : "rgba(255,255,255,0.35)" }}>
                                  {canRedeem ? "Disponible !" : `${reward.points - (loyaltyData?.availablePoints || 0)} pts restants`}
                                </span>
                                <button
                                  onClick={() => redeemMutation.mutate(reward.type)}
                                  disabled={!canRedeem || redeemMutation.isPending}
                                  className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                                  style={canRedeem ? { background: "linear-gradient(135deg, #E91E8C, #f43f5e)", color: "white" } : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", cursor: "not-allowed" }}
                                  data-testid={`button-redeem-${reward.type}`}
                                >
                                  {redeemMutation.isPending ? "..." : "Échanger"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {loyaltyData?.rewards && loyaltyData.rewards.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5" style={{ color: "#E91E8C" }} /> Mes Codes Promo
                      </h3>
                      <div className="space-y-2">
                        {loyaltyData.rewards.map((reward: any) => (
                          <div key={reward.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties} data-testid={`promo-${reward.id}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">-{reward.discountPercent}%</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={reward.used ? { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" } : { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                                  {reward.used ? "Utilisé" : "Actif"}
                                </span>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                {reward.createdAt ? format(new Date(reward.createdAt), "d MMM yyyy", { locale: fr }) : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(reward.discountCode);
                                toast({ title: "Code copié !", description: `${reward.discountCode} — mentionnez-le dans votre commande WhatsApp` });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                              style={{ background: "rgba(233,30,140,0.1)", color: "#f9a8d4", border: "1px solid rgba(233,30,140,0.2)" }}
                              data-testid={`button-copy-${reward.id}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {reward.discountCode}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {loyaltyData?.history && loyaltyData.history.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color: "#E91E8C" }} /> Historique des Points
                      </h3>
                      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties}>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" } as React.CSSProperties}>
                          {loyaltyData.history.slice(0, 20).map((entry: any) => (
                            <div key={entry.id} className="px-4 py-3 flex items-center justify-between" data-testid={`history-${entry.id}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={entry.reason === "analyse" ? { background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.2)" } : { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                                  {entry.reason === "analyse" ? <ScanFace className="w-4 h-4" style={{ color: "#E91E8C" }} /> : <Share2 className="w-4 h-4" style={{ color: "#8b5cf6" }} />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {entry.reason === "analyse" ? "Analyse IA" : "Partage du score"}
                                  </p>
                                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    {entry.createdAt ? format(new Date(entry.createdAt), "d MMM yyyy • HH:mm", { locale: fr }) : ""}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-bold" style={{ color: entry.points > 0 ? "#10b981" : "#f43f5e" }}>
                                +{entry.points} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Code de parrainage */}
                  <div className="rounded-2xl p-5" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }} data-testid="card-referral">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                      <h3 className="text-sm font-black text-white">Ton code de parrainage</h3>
                    </div>
                    <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>Partage ce lien avec tes amis. Chaque filleul qui scanne t'aide à développer GlowScan !</p>
                    {referralData ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.3)" }}>
                            <span className="text-xl font-black tracking-widest" style={{ color: "#c4b5fd" }} data-testid="text-referral-code">{referralData.code}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(referralData.code);
                              toast({ title: "Code copié !", description: "Partage-le avec tes amis 🎉" });
                            }}
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}
                            data-testid="button-copy-referral"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const text = `🌟 Analyse ta peau gratuitement avec GlowScan !\nObtiens ton Glow Score et une routine personnalisée.\n👉 ${referralData.link}`;
                            if (navigator.share) { navigator.share({ title: "GlowScan", text, url: referralData.link }); }
                            else { navigator.clipboard.writeText(referralData.link); toast({ title: "Lien copié !", description: "Partage-le avec tes amis 🎉" }); }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
                          style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "white" }}
                          data-testid="button-share-referral"
                        >
                          <Link2 className="w-4 h-4" />
                          Partager mon lien
                        </button>
                      </>
                    ) : (
                      <div className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                    )}
                  </div>

                  {(!loyaltyData?.history || loyaltyData.history.length === 0) && (
                    <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                      <Star className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                      <h3 className="text-lg font-bold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>Commencez à gagner des points</h3>
                      <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>Faites une analyse IA pour gagner vos premiers 2 points !</p>
                      <Link href="/analyze">
                        <span className="px-5 py-2 rounded-xl bg-pink-600 text-white font-semibold text-sm cursor-pointer inline-block">
                          Analyser maintenant
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section RGPD : mes données & confidentialité (toujours visible) */}
        <PrivacySettings />
      </main>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        scansThisMonth={scansThisMonth}
        scansLimit={scansLimit}
      />

      {/* Modale détail scan */}
      <AnimatePresence>
        {selectedScan && (
          <ScanDetailModal
            scan={selectedScan}
            onClose={() => setSelectedScan(null)}
          />
        )}
      </AnimatePresence>

      {/* Modale comparaison */}
      <AnimatePresence>
        {compareScans && (
          <CompareModal
            scanA={compareScans.a}
            scanB={compareScans.b}
            onClose={() => { setCompareScans(null); setCompareMode(false); setCompareSelection([]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
