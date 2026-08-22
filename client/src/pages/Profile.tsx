import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Navbar } from "@/components/Navbar";
import { ResultCard } from "@/components/ResultCard";
import { PrivacySettings } from "@/components/PrivacySettings";
import { TwoFASettings } from "@/components/TwoFASettings";
import {
  Loader2, Calendar, ChevronRight, Star, Gift, Trophy, Share2,
  ScanFace, Sparkles, Check, Copy, Bell, Flame, Target, Bot,
  Link2, Crown, Zap, X, Filter, GitCompare, TrendingUp, TrendingDown,
  Minus, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult } from "@shared/schema";

// ─────────────────────────────────────────────────────────────────────
//  Design tokens (inline, no tailwind conflict)
// ─────────────────────────────────────────────────────────────────────
const DS = {
  bg: "#fbfbfe",
  surface: "#ffffff",
  element: "#f3f1fb",
  textPrimary: "#1f1a2e",
  textBody: "#5a5470",
  textMuted: "#8b86a0",
  textHint: "#a8a3ba",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  pink: "#E91E8C",
  pinkLight: "#f9a8d4",
  green: "#6ee7b7",
  amber: "#fbbf24",
  subtleCard: {
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 24,
  },
  violetCard: {
    background: "rgba(167,139,250,0.06)",
    border: "1px solid rgba(167,139,250,0.18)",
    borderRadius: 24,
  },
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
};

// ─────────────────────────────────────────────────────────────────────
//  Score helpers
// ─────────────────────────────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 75) return "#6ee7b7";
  if (score >= 50) return DS.violetLight;
  return "#fbbf24";
}

function getScoreBg(score: number): React.CSSProperties {
  if (score >= 75) return { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12 };
  if (score >= 50) return { background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: 12 };
  return { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12 };
}

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-4xl font-800" : size === "sm" ? "text-lg font-700" : "text-2xl font-800";
  return (
    <div className="px-3 py-1 text-center" style={getScoreBg(score)}>
      <span className={sz} style={{ color: getScoreColor(score) }}>{score}</span>
      <span className="text-xs" style={{ color: DS.textMuted }}>/100</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Score chart
// ─────────────────────────────────────────────────────────────────────
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
  const trendColor = latest >= prev ? "#6ee7b7" : "#fbbf24";

  return (
    <div className="p-5 mb-6" style={{ ...DS.subtleCard } as React.CSSProperties} data-testid="card-score-chart">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-700 uppercase tracking-wider" style={{ color: DS.textMuted }}>Évolution du score</p>
          <p className="text-sm font-700 mt-0.5" style={{ color: DS.textPrimary }}>{pts.length} analyses</p>
        </div>
        <div className="flex items-center gap-1 text-lg font-800" style={{ color: trendColor }}>
          {trend} <span className="text-base">{latest}/100</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="1" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1={pad} y1={toY(v)} x2={W - pad} y2={toY(v)}
            stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        ))}
        <path d={path} fill="none" stroke="url(#chartGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.score)} r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? "#6ee7b7" : "#a78bfa"}
            stroke="rgba(13,10,14,0.8)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: DS.textHint }}>
          {pts[0]?.createdAt ? format(new Date(pts[0].createdAt), "d MMM", { locale: fr }) : ""}
        </span>
        <span className="text-[10px]" style={{ color: DS.textHint }}>
          {pts[pts.length - 1]?.createdAt ? format(new Date(pts[pts.length - 1].createdAt!), "d MMM", { locale: fr }) : "Auj."}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Routine shortcut
// ─────────────────────────────────────────────────────────────────────
function RoutineShortcut() {
  return (
    <Link href="/routine">
      <div
        className="flex items-center justify-between p-4 mb-6 cursor-pointer active:scale-[0.98] transition-all"
        style={{ ...DS.subtleCard } as React.CSSProperties}
        data-testid="card-routine-shortcut"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.3)",
              borderRadius: "12px",
            }}
          >
            <Check className="w-5 h-5" style={{ color: DS.violetLight }} />
          </div>
          <div>
            <p className="text-sm font-700" style={{ color: DS.textPrimary }}>Ma routine</p>
            <p className="text-xs" style={{ color: DS.textBody }}>Matin & soir, étape par étape</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" style={{ color: DS.textMuted }} />
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

// ─────────────────────────────────────────────────────────────────────
//  Scan detail modal
// ─────────────────────────────────────────────────────────────────────
function ScanDetailModal({ scan, onClose }: { scan: ScanRecord; onClose: () => void }) {
  const { user } = useAuth();
  const result = scanToAnalysisResult(scan);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: DS.bg, fontFamily: DS.font } as React.CSSProperties}
    >
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(251,251,254,0.9)", borderBottom: "1px solid rgba(0,0,0,0.07)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "9999px", color: DS.textBody }}
          data-testid="button-close-scan-detail"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-700 truncate" style={{ color: DS.textPrimary }}>
            {AREA_EMOJI[scan.area] || "🔬"} {scan.condition || "Analyse"}
          </p>
          <p className="text-xs" style={{ color: DS.textMuted }}>
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

// ─────────────────────────────────────────────────────────────────────
//  Compare modal
// ─────────────────────────────────────────────────────────────────────
function CompareModal({ scanA, scanB, onClose }: { scanA: ScanRecord; scanB: ScanRecord; onClose: () => void }) {
  const delta = (scanB.score || 0) - (scanA.score || 0);
  const deltaColor = delta > 0 ? "#6ee7b7" : delta < 0 ? "#fbbf24" : DS.textMuted;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  const recA = (scanA.recommendations as any) || {};
  const recB = (scanB.recommendations as any) || {};
  const morningA: string[] = Array.isArray(recA.morning) ? recA.morning : [];
  const morningB: string[] = Array.isArray(recB.morning) ? recB.morning : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: DS.bg, fontFamily: DS.font } as React.CSSProperties}
    >
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(251,251,254,0.9)", borderBottom: "1px solid rgba(0,0,0,0.07)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "9999px", color: DS.textBody }}
          data-testid="button-close-compare"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-700 flex-1" style={{ color: DS.textPrimary }}>Comparaison de scans</h2>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Score comparison */}
        <div className="p-5" style={{ ...DS.subtleCard } as React.CSSProperties}>
          <h3 className="text-xs font-700 uppercase tracking-wider mb-4" style={{ color: DS.textMuted }}>Évolution du glow score</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: DS.textMuted }}>
                {scanA.createdAt ? format(new Date(scanA.createdAt), "d MMM yyyy", { locale: fr }) : "Scan A"}
              </p>
              <ScoreBadge score={scanA.score || 0} size="lg" />
              <p className="text-xs mt-1" style={{ color: DS.textMuted }}>{AREA_EMOJI[scanA.area]} {AREA_LABELS[scanA.area]}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <DeltaIcon className="w-6 h-6" style={{ color: deltaColor } as React.CSSProperties} />
              <span className="text-lg font-800" style={{ color: deltaColor }}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
              <span className="text-[10px]" style={{ color: DS.textMuted }}>pts</span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: DS.textMuted }}>
                {scanB.createdAt ? format(new Date(scanB.createdAt), "d MMM yyyy", { locale: fr }) : "Scan B"}
              </p>
              <ScoreBadge score={scanB.score || 0} size="lg" />
              <p className="text-xs mt-1" style={{ color: DS.textMuted }}>{AREA_EMOJI[scanB.area]} {AREA_LABELS[scanB.area]}</p>
            </div>
          </div>
          {scanA.createdAt && scanB.createdAt && (
            <p className="text-center text-xs mt-3" style={{ color: DS.textMuted }}>
              {Math.abs(differenceInDays(new Date(scanB.createdAt), new Date(scanA.createdAt)))} jours entre les deux analyses
            </p>
          )}
        </div>

        {/* Conditions */}
        <div className="p-5" style={{ ...DS.subtleCard } as React.CSSProperties}>
          <h3 className="text-xs font-700 uppercase tracking-wider mb-3" style={{ color: DS.textMuted }}>Condition détectée</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16 }}>
              <p className="text-[10px] mb-1" style={{ color: DS.textMuted }}>
                {scanA.createdAt ? format(new Date(scanA.createdAt), "d MMM", { locale: fr }) : "Avant"}
              </p>
              <p className="text-sm font-700" style={{ color: DS.textPrimary }}>{scanA.condition || "–"}</p>
            </div>
            <div className="p-3" style={{ ...DS.violetCard, borderRadius: 16 } as React.CSSProperties}>
              <p className="text-[10px] mb-1" style={{ color: DS.violetLight }}>
                {scanB.createdAt ? format(new Date(scanB.createdAt), "d MMM", { locale: fr }) : "Après"}
              </p>
              <p className="text-sm font-700" style={{ color: DS.violetLight }}>{scanB.condition || "–"}</p>
            </div>
          </div>
        </div>

        {/* Routine matin comparison */}
        {(morningA.length > 0 || morningB.length > 0) && (
          <div className="p-5" style={{ ...DS.subtleCard } as React.CSSProperties}>
            <h3 className="text-xs font-700 uppercase tracking-wider mb-3" style={{ color: DS.textMuted }}>Routine du matin</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-2" style={{ color: DS.textMuted }}>Avant</p>
                <ul className="space-y-1">
                  {morningA.map((s, i) => (
                    <li key={i} className="text-xs flex items-start gap-1" style={{ color: DS.textBody }}>
                      <span style={{ color: DS.textHint }} className="flex-shrink-0">·</span>{s}
                    </li>
                  ))}
                  {morningA.length === 0 && <li className="text-xs" style={{ color: DS.textHint }}>Aucune donnée</li>}
                </ul>
              </div>
              <div>
                <p className="text-[10px] mb-2" style={{ color: DS.violetLight }}>Après</p>
                <ul className="space-y-1">
                  {morningB.map((s, i) => (
                    <li key={i} className="text-xs flex items-start gap-1" style={{ color: DS.violetLight }}>
                      <span style={{ color: DS.violetMid }} className="flex-shrink-0">·</span>{s}
                    </li>
                  ))}
                  {morningB.length === 0 && <li className="text-xs" style={{ color: DS.textHint }}>Aucune donnée</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* AI analysis text */}
        {(scanA.analysis || scanB.analysis) && (
          <div className="p-5" style={{ ...DS.subtleCard } as React.CSSProperties}>
            <h3 className="text-xs font-700 uppercase tracking-wider mb-3" style={{ color: DS.textMuted }}>Analyse IA</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-2" style={{ color: DS.textMuted }}>Avant</p>
                <p className="text-xs leading-relaxed line-clamp-6" style={{ color: DS.textBody }}>{scanA.analysis || "–"}</p>
              </div>
              <div>
                <p className="text-[10px] mb-2" style={{ color: DS.violetLight }}>Après</p>
                <p className="text-xs leading-relaxed line-clamp-6" style={{ color: DS.violetLight }}>{scanB.analysis || "–"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Loyalty rewards
// ─────────────────────────────────────────────────────────────────────
const REWARDS = [
  { type: "discount_5", points: 100, discount: 5, label: "-5% sur vos produits" },
  { type: "discount_10", points: 200, discount: 10, label: "-10% sur vos produits" },
  { type: "discount_15", points: 350, discount: 15, label: "-15% sur vos produits" },
  { type: "discount_20", points: 500, discount: 20, label: "-20% sur vos produits" },
];

// ─────────────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: DS.bg, fontFamily: DS.font } as React.CSSProperties}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: DS.violetMid }} />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: DS.bg, fontFamily: DS.font } as React.CSSProperties}>
      {/* Glow orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: 420,
            height: 420,
            background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
            borderRadius: "9999px",
          }}
        />
      </div>

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-800" style={{ color: DS.textPrimary }} data-testid="text-profile-title">
              Mon espace
            </h1>
            <p className="text-sm mt-0.5" style={{ color: DS.textBody }}>
              Bon retour, {user.firstName}
            </p>
          </div>
          <Link href="/analyze">
            <span
              className="px-5 py-2.5 text-sm font-700 cursor-pointer inline-block transition-all active:scale-[0.98]"
              style={{ background: DS.violet, borderRadius: "9999px", color: "#fff" }}
              data-testid="button-new-analysis"
            >
              + Nouvelle analyse
            </span>
          </Link>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center gap-1 p-1 w-fit mb-6"
          style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px" }}
        >
          {(["profil", "fidelite"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-5 py-2 text-sm font-700 transition-all"
              style={
                activeTab === tab
                  ? { background: "rgba(124,58,237,0.2)", color: DS.violetLight, border: "1px solid rgba(124,58,237,0.35)", borderRadius: "10px" }
                  : { color: DS.textMuted, borderRadius: "10px" }
              }
              data-testid={`tab-${tab}`}
            >
              {tab === "profil" ? <ScanFace className="w-4 h-4" /> : <Star className="w-4 h-4" />}
              {tab === "profil" ? "Mon profil" : "Fidélité"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "profil" ? (
            <motion.div key="profil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Stat tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    label: "Total analyses",
                    value: String(scans?.length || 0),
                    testid: "text-total-scans",
                  },
                  {
                    label: "Dernière analyse",
                    value: scans && scans.length > 0
                      ? format(new Date(scans[0].createdAt!), "d MMMM yyyy", { locale: fr })
                      : "Aucune analyse",
                    testid: "text-last-scan",
                  },
                  {
                    label: "Zone ciblée",
                    value: scans && scans.length > 0
                      ? (scans[0].area === "face" ? "Visage" : scans[0].area === "body" ? "Corps" : "Cheveux")
                      : "N/A",
                    testid: "text-last-area",
                  },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="p-5"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: "16px",
                      padding: "14px",
                    }}
                  >
                    <p className="text-xs font-700 uppercase tracking-wider" style={{ color: DS.textMuted }}>
                      {tile.label}
                    </p>
                    <p className="text-2xl font-800 mt-2" style={{ color: DS.textPrimary }} data-testid={tile.testid}>
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Subscription card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 mb-5 flex items-center justify-between"
                style={
                  isPremium
                    ? { background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: 24 }
                    : { ...DS.subtleCard } as React.CSSProperties
                }
                data-testid="card-subscription"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={
                      isPremium
                        ? { background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px" }
                        : { background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "12px" }
                    }
                  >
                    {isPremium
                      ? <Crown className="w-5 h-5" style={{ color: DS.violetLight }} />
                      : <Zap className="w-5 h-5" style={{ color: DS.textMuted }} />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-700" style={{ color: DS.textPrimary }}>
                      {isPremium ? "Abonnement Premium actif" : "Forfait gratuit"}
                    </p>
                    <p className="text-xs" style={{ color: DS.textBody }}>
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
                    className="text-xs font-700 px-3 py-1.5"
                    style={{
                      background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  >
                    Passer Premium
                  </a>
                )}
                {isPremium && (
                  <span
                    className="text-xs font-700 px-2.5 py-1"
                    style={{
                      color: DS.violetLight,
                      background: "rgba(167,139,250,0.15)",
                      border: "1px solid rgba(167,139,250,0.3)",
                      borderRadius: "8px",
                    }}
                  >
                    Actif
                  </span>
                )}
              </motion.div>

              {/* Referral card */}
              {referralData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 mb-6"
                  style={{ ...DS.violetCard } as React.CSSProperties}
                  data-testid="card-referral-profil"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: "12px" }}
                    >
                      <Link2 className="w-5 h-5" style={{ color: DS.violetLight }} />
                    </div>
                    <div>
                      <p className="text-sm font-700" style={{ color: DS.textPrimary }}>Ton code de parrainage</p>
                      <p className="text-xs" style={{ color: DS.textBody }}>Partage et aide tes amis à prendre soin de leur peau</p>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between px-4 py-3 mb-3"
                    style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "16px" }}
                  >
                    <span
                      className="text-2xl font-800 tracking-[0.15em]"
                      style={{ color: DS.textPrimary }}
                      data-testid="text-referral-code-profil"
                    >
                      {referralData.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.code);
                        toast({ title: "Code copié !", description: "Colle-le dans ton message WhatsApp" });
                      }}
                      className="flex items-center gap-1.5 text-xs font-700 px-3 py-1.5 transition-all"
                      style={{ background: "rgba(167,139,250,0.2)", borderRadius: "10px", color: DS.violetLight }}
                      data-testid="button-copy-referral-profil"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </button>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {[
                      { step: "1", text: "Copie ton code ou ton lien ci-dessous" },
                      { step: "2", text: "Envoie-le à une amie via WhatsApp ou Story" },
                      { step: "3", text: "Elle scanne sa peau et découvre sa routine" },
                    ].map(({ step, text }) => (
                      <div key={step} className="flex items-center gap-2.5">
                        <div
                          className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(167,139,250,0.2)", borderRadius: "9999px" }}
                        >
                          <span className="text-[10px] font-800" style={{ color: DS.violetLight }}>{step}</span>
                        </div>
                        <span className="text-xs font-500" style={{ color: DS.textBody }}>{text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.link);
                        toast({ title: "Lien copié !", description: "Colle-le dans ton WhatsApp" });
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 text-xs font-700 transition-all"
                      style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px", color: DS.violetLight }}
                      data-testid="button-copy-link-profil"
                    >
                      <Link2 className="w-4 h-4" />
                      Copier le lien
                    </button>
                    <button
                      onClick={() => {
                        const text = `Analyse ta peau gratuitement avec GlowScan !\n\nObtiens ton Glow Score + une routine 100% personnalisée en 10 secondes\n\n${referralData.link}`;
                        if (navigator.share) {
                          navigator.share({ title: "GlowScan", text, url: referralData.link });
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 text-xs font-700 transition-all"
                      style={{ background: DS.violet, borderRadius: "12px", color: "#fff" }}
                      data-testid="button-share-whatsapp-referral"
                    >
                      <Share2 className="w-4 h-4" />
                      Partager
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Streak / countdown */}
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
                    className="p-5 mb-6"
                    style={
                      isDue
                        ? { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 24 }
                        : { ...DS.subtleCard } as React.CSSProperties
                    }
                    data-testid="card-streak"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 flex items-center justify-center"
                          style={
                            isDue
                              ? { background: "rgba(245,158,11,0.12)", borderRadius: "10px", color: DS.amber }
                              : { background: "rgba(167,139,250,0.12)", borderRadius: "10px", color: DS.violetMid }
                          }
                        >
                          {isDue ? <Bell className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        </div>
                        <p className="text-sm font-700" style={{ color: DS.textPrimary }}>
                          {isDue ? "Rescan recommandé !" : `Prochain scan dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4" style={{ color: DS.violetMid }} />
                        <span className="text-sm font-700" style={{ color: DS.violetLight }}>
                          {scans?.length || 0} scan{(scans?.length || 0) > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(0,0,0,0.07)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, background: isDue ? DS.amber : DS.violet }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs mb-3" style={{ color: DS.textMuted }}>
                      <span>Dernier scan : {format(new Date(lastScan.createdAt!), "d MMM", { locale: fr })}</span>
                      <span className="font-700" style={{ color: isDue ? DS.amber : DS.violetLight }}>
                        {isDue ? `+${daysSince - 7}j de retard` : `J+${daysSince}`}
                      </span>
                    </div>

                    {isDue && (
                      <Link href="/analyze">
                        <button
                          data-testid="button-rescan-now"
                          className="w-full py-2.5 text-sm font-700 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                          style={{ background: "linear-gradient(135deg,#E91E8C,#f43f5e)", borderRadius: "12px", color: "#fff" }}
                        >
                          <ScanFace className="w-4 h-4" />
                          Rescanner maintenant
                        </button>
                      </Link>
                    )}
                  </motion.div>
                );
              })()}

              {/* Score chart */}
              {scans && scans.length >= 2 && <ScoreChart scans={scans as any} />}

              {/* Routine shortcut */}
              <RoutineShortcut />

              {/* Chat IA shortcut */}
              <Link href="/chat">
                <div
                  className="flex items-center justify-between p-4 mb-6 cursor-pointer active:scale-[0.98] transition-all"
                  style={{ ...DS.violetCard } as React.CSSProperties}
                  data-testid="card-chat-shortcut"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: "12px" }}
                    >
                      <Bot className="w-5 h-5" style={{ color: DS.violetLight }} />
                    </div>
                    <div>
                      <p className="text-sm font-700" style={{ color: DS.textPrimary }}>Poser une question à SkinBot</p>
                      <p className="text-xs" style={{ color: DS.textBody }}>Conseils IA personnalisés sur ta peau</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: DS.textMuted }} />
                </div>
              </Link>

              {/* History header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-700" style={{ color: DS.textPrimary }}>Historique des analyses</h2>
                {scans && scans.length >= 2 && (
                  <button
                    onClick={() => { setCompareMode(v => !v); setCompareSelection([]); }}
                    data-testid="button-toggle-compare"
                    className="flex items-center gap-1.5 text-xs font-700 px-3 py-1.5 transition-all"
                    style={
                      compareMode
                        ? { background: DS.violet, color: "#fff", borderRadius: "9999px" }
                        : { background: "rgba(0,0,0,0.08)", color: DS.textBody, border: "1px solid rgba(0,0,0,0.15)", borderRadius: "9999px" }
                    }
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    {compareMode ? "Annuler" : "Comparer"}
                  </button>
                )}
              </div>

              {/* Area filters */}
              {scans && scans.length > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                  {(["all", "face", "body", "hair"] as const).map(area => (
                    <button
                      key={area}
                      onClick={() => setFilterArea(area)}
                      data-testid={`filter-area-${area}`}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-700 px-3 py-1.5 transition-all"
                      style={
                        filterArea === area
                          ? { background: DS.violet, color: "#fff", borderRadius: "9999px" }
                          : { background: "rgba(0,0,0,0.06)", color: DS.textMuted, border: "1px solid rgba(0,0,0,0.08)", borderRadius: "9999px" }
                      }
                    >
                      {area === "all" ? "Tous" : `${AREA_EMOJI[area]} ${AREA_LABELS[area]}`}
                      {area !== "all" && scans && (
                        <span
                          className="text-[10px] px-1.5 py-0.5"
                          style={
                            filterArea === area
                              ? { background: "rgba(0,0,0,0.2)", borderRadius: "9999px" }
                              : { background: "rgba(0,0,0,0.08)", color: DS.textHint, borderRadius: "9999px" }
                          }
                        >
                          {scans.filter(s => s.area === area).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Compare floating bar */}
              <AnimatePresence>
                {compareMode && compareSelection.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3"
                    style={{ background: DS.surface, border: "1px solid rgba(167,139,250,0.25)", borderRadius: "24px" }}
                  >
                    <span className="text-sm font-700" style={{ color: DS.textPrimary }}>
                      {compareSelection.length}/2 scan{compareSelection.length > 1 ? "s" : ""} sélectionné{compareSelection.length > 1 ? "s" : ""}
                    </span>
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
                      className="px-4 py-1.5 text-sm font-700 transition-all disabled:opacity-40"
                      style={{ background: DS.violet, color: "#fff", borderRadius: "12px" }}
                    >
                      Comparer
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scan list */}
              {scans && (() => {
                const filtered = filterArea === "all" ? scans : scans.filter(s => s.area === filterArea);
                if (filtered.length === 0) return (
                  <div
                    className="text-center py-10"
                    style={{ background: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 24 }}
                  >
                    <Filter className="w-10 h-10 mx-auto mb-2" style={{ color: DS.textHint }} />
                    <p className="text-sm font-500" style={{ color: DS.textMuted }}>
                      Aucun scan {AREA_LABELS[filterArea as string]?.toLowerCase()} pour l'instant
                    </p>
                    <button
                      onClick={() => setFilterArea("all")}
                      className="text-xs font-700 mt-2"
                      style={{ color: DS.violetMid }}
                    >
                      Voir tous les scans
                    </button>
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
                          className="p-4 transition-all cursor-pointer group"
                          style={
                            isSelected
                              ? { background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 24 }
                              : { ...DS.subtleCard } as React.CSSProperties
                          }
                        >
                          <div className="flex items-center gap-3">
                            {compareMode ? (
                              <div
                                className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all"
                                style={
                                  isSelected
                                    ? { background: DS.violet, border: `2px solid ${DS.violet}`, borderRadius: "10px" }
                                    : { border: "2px solid rgba(0,0,0,0.2)", background: "rgba(0,0,0,0.04)", borderRadius: "10px" }
                                }
                              >
                                {isSelected && <Check className="w-4 h-4" style={{ color: "#fff" }} />}
                              </div>
                            ) : (
                              <div
                                className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-xl"
                                style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "12px" }}
                              >
                                {AREA_EMOJI[scan.area] || "🔬"}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span
                                  className="px-2 py-0.5 text-[10px] font-700 uppercase"
                                  style={{
                                    background: "rgba(167,139,250,0.15)",
                                    color: DS.violetLight,
                                    border: "1px solid rgba(167,139,250,0.3)",
                                    borderRadius: "8px",
                                  }}
                                >
                                  {AREA_LABELS[scan.area] || scan.area}
                                </span>
                                <span className="text-[11px] flex items-center gap-1" style={{ color: DS.textMuted }}>
                                  <Calendar className="w-3 h-3" />
                                  {scan.createdAt ? format(new Date(scan.createdAt), "d MMM yyyy", { locale: fr }) : ""}
                                </span>
                              </div>
                              <h3 className="text-sm font-700 truncate" style={{ color: DS.textPrimary }}>{scan.condition || "Analyse"}</h3>
                              <p className="text-xs truncate" style={{ color: DS.textBody }}>{scan.analysis}</p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-center px-2 py-1" style={getScoreBg(scoreVal)}>
                                <span className="text-sm font-800" style={{ color: getScoreColor(scoreVal) }}>{scoreVal}</span>
                                <span className="text-[9px] block leading-none" style={{ color: DS.textHint }}>/100</span>
                              </div>
                              {!compareMode && <ChevronRight className="w-4 h-4" style={{ color: DS.textHint }} />}
                            </div>
                          </div>

                          <div className="mt-3 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
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

              {/* Empty state */}
              {scans && scans.length === 0 && (
                <div
                  className="text-center py-16"
                  style={{ background: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 24 }}
                >
                  <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: DS.textHint }} />
                  <h3 className="text-lg font-700 mb-2" style={{ color: DS.textBody }}>Aucun historique</h3>
                  <p className="text-sm mb-5" style={{ color: DS.textMuted }}>
                    Commencez votre première analyse pour suivre votre santé cutanée.
                  </p>
                  <Link href="/analyze">
                    <span
                      className="px-5 py-2 text-sm font-700 cursor-pointer inline-block"
                      style={{ background: DS.violet, borderRadius: "9999px", color: "#fff" }}
                    >
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
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: DS.violetMid }} />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Points hero */}
                  <div
                    className="p-6 relative overflow-hidden"
                    style={{ ...DS.violetCard } as React.CSSProperties}
                  >
                    <div
                      className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)", borderRadius: "9999px", transform: "translate(30%,-30%)" }}
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-5 h-5" style={{ color: DS.violetMid }} />
                        <span className="text-xs font-700 uppercase tracking-wider" style={{ color: DS.textBody }}>
                          Programme de fidélité
                        </span>
                      </div>
                      <p className="text-4xl font-800 mt-2" style={{ color: DS.textPrimary }} data-testid="text-points-balance">
                        {loyaltyData?.availablePoints || 0}{" "}
                        <span className="text-lg font-700" style={{ color: DS.textBody }}>pts</span>
                      </p>
                      <p className="text-sm mt-1" style={{ color: DS.textBody }}>Points disponibles</p>
                      {(loyaltyData?.totalPoints || 0) > (loyaltyData?.availablePoints || 0) && (
                        <p className="text-xs mt-1" style={{ color: DS.textMuted }}>
                          {loyaltyData?.totalPoints} pts gagnés · {(loyaltyData?.totalPoints || 0) - (loyaltyData?.availablePoints || 0)} pts utilisés
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Earn points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        icon: <ScanFace className="w-5 h-5" style={{ color: DS.violetLight }} />,
                        title: "Analyse IA",
                        subtitle: "Faites une analyse de peau",
                        pts: "+2 pts",
                        color: DS.violetLight,
                        bg: "rgba(167,139,250,0.12)",
                        border: "rgba(167,139,250,0.25)",
                      },
                      {
                        icon: <Share2 className="w-5 h-5" style={{ color: DS.green }} />,
                        title: "Partage ton score",
                        subtitle: "Partagez à 3 amies",
                        pts: "+15 pts",
                        color: DS.green,
                        bg: "rgba(16,185,129,0.08)",
                        border: "rgba(16,185,129,0.2)",
                      },
                    ].map((item) => (
                      <div key={item.title} className="p-4" style={{ ...DS.subtleCard } as React.CSSProperties}>
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-10 h-10 flex items-center justify-center"
                            style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: "12px" }}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-sm font-700" style={{ color: DS.textPrimary }}>{item.title}</p>
                            <p className="text-xs" style={{ color: DS.textBody }}>{item.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                          <span className="text-lg font-800" style={{ color: item.color }}>{item.pts}</span>
                          <span className="text-xs" style={{ color: DS.textMuted }}>par action</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rewards */}
                  <div>
                    <h3 className="text-lg font-700 mb-3 flex items-center gap-2" style={{ color: DS.textPrimary }}>
                      <Gift className="w-5 h-5" style={{ color: DS.violetMid }} /> Récompenses
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {REWARDS.map((reward) => {
                        const canRedeem = (loyaltyData?.availablePoints || 0) >= reward.points;
                        const progress = Math.min(100, Math.round(((loyaltyData?.availablePoints || 0) / reward.points) * 100));
                        return (
                          <div
                            key={reward.type}
                            className="overflow-hidden"
                            style={{ ...DS.subtleCard } as React.CSSProperties}
                            data-testid={`reward-${reward.type}`}
                          >
                            <div className="h-1" style={{ background: DS.violet, borderRadius: "24px 24px 0 0", opacity: progress / 100 }} />
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-base font-700" style={{ color: DS.textPrimary }}>{reward.label}</span>
                                <span
                                  className="text-xs font-700 px-2 py-0.5"
                                  style={
                                    canRedeem
                                      ? { background: "rgba(16,185,129,0.1)", color: DS.green, border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px" }
                                      : { background: "rgba(0,0,0,0.05)", color: DS.textMuted, borderRadius: "8px" }
                                  }
                                >
                                  {reward.points} pts
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(0,0,0,0.07)" }}>
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%`, background: DS.violet }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: canRedeem ? DS.green : DS.textMuted }}>
                                  {canRedeem ? "Disponible !" : `${reward.points - (loyaltyData?.availablePoints || 0)} pts restants`}
                                </span>
                                <button
                                  onClick={() => redeemMutation.mutate(reward.type)}
                                  disabled={!canRedeem || redeemMutation.isPending}
                                  className="px-4 py-1.5 text-xs font-700 transition-all active:scale-95"
                                  style={
                                    canRedeem
                                      ? { background: "linear-gradient(135deg,#E91E8C,#f43f5e)", color: "#fff", borderRadius: "10px" }
                                      : { background: "rgba(0,0,0,0.07)", color: DS.textHint, borderRadius: "10px", cursor: "not-allowed" }
                                  }
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

                  {/* Promo codes */}
                  {loyaltyData?.rewards && loyaltyData.rewards.length > 0 && (
                    <div>
                      <h3 className="text-lg font-700 mb-3 flex items-center gap-2" style={{ color: DS.textPrimary }}>
                        <Trophy className="w-5 h-5" style={{ color: DS.violetMid }} /> Mes codes promo
                      </h3>
                      <div className="space-y-2">
                        {loyaltyData.rewards.map((reward: any) => (
                          <div
                            key={reward.id}
                            className="p-4 flex items-center justify-between"
                            style={{ ...DS.subtleCard } as React.CSSProperties}
                            data-testid={`promo-${reward.id}`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-700" style={{ color: DS.textPrimary }}>-{reward.discountPercent}%</span>
                                <span
                                  className="text-xs font-700 px-2 py-0.5"
                                  style={
                                    reward.used
                                      ? { background: "rgba(0,0,0,0.07)", color: DS.textMuted, borderRadius: "8px" }
                                      : { background: "rgba(16,185,129,0.1)", color: DS.green, border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px" }
                                  }
                                >
                                  {reward.used ? "Utilisé" : "Actif"}
                                </span>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                                {reward.createdAt ? format(new Date(reward.createdAt), "d MMM yyyy", { locale: fr }) : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(reward.discountCode);
                                toast({ title: "Code copié !", description: `${reward.discountCode} — mentionnez-le dans votre commande WhatsApp` });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-700 transition-all"
                              style={{ background: "rgba(167,139,250,0.1)", color: DS.violetLight, border: "1px solid rgba(167,139,250,0.25)", borderRadius: "10px" }}
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

                  {/* Points history */}
                  {loyaltyData?.history && loyaltyData.history.length > 0 && (
                    <div>
                      <h3 className="text-lg font-700 mb-3 flex items-center gap-2" style={{ color: DS.textPrimary }}>
                        <Sparkles className="w-5 h-5" style={{ color: DS.violetMid }} /> Historique des points
                      </h3>
                      <div className="overflow-hidden" style={{ ...DS.subtleCard } as React.CSSProperties}>
                        <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" } as React.CSSProperties}>
                          {loyaltyData.history.slice(0, 20).map((entry: any) => (
                            <div key={entry.id} className="px-4 py-3 flex items-center justify-between" data-testid={`history-${entry.id}`}>
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 flex items-center justify-center"
                                  style={
                                    entry.reason === "analyse"
                                      ? { background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "10px" }
                                      : { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px" }
                                  }
                                >
                                  {entry.reason === "analyse"
                                    ? <ScanFace className="w-4 h-4" style={{ color: DS.violetLight }} />
                                    : <Share2 className="w-4 h-4" style={{ color: DS.green }} />
                                  }
                                </div>
                                <div>
                                  <p className="text-sm font-500" style={{ color: DS.textPrimary }}>
                                    {entry.reason === "analyse" ? "Analyse IA" : "Partage du score"}
                                  </p>
                                  <p className="text-xs" style={{ color: DS.textMuted }}>
                                    {entry.createdAt ? format(new Date(entry.createdAt), "d MMM yyyy · HH:mm", { locale: fr }) : ""}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-700" style={{ color: entry.points > 0 ? DS.green : DS.amber }}>
                                +{entry.points} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Referral card in loyalty tab */}
                  <div className="p-5" style={{ ...DS.violetCard } as React.CSSProperties} data-testid="card-referral">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-4 h-4" style={{ color: DS.violetMid }} />
                      <h3 className="text-sm font-700" style={{ color: DS.textPrimary }}>Ton code de parrainage</h3>
                    </div>
                    <p className="text-xs mb-3" style={{ color: DS.textBody }}>
                      Partage ce lien avec tes amies. Chaque filleule qui scanne t'aide à développer GlowScan !
                    </p>
                    {referralData ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="flex-1 px-4 py-3 text-center"
                            style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "16px" }}
                          >
                            <span className="text-xl font-800 tracking-widest" style={{ color: DS.violetLight }} data-testid="text-referral-code">
                              {referralData.code}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(referralData.code);
                              toast({ title: "Code copié !", description: "Partage-le avec tes amies" });
                            }}
                            className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "14px", color: DS.violetLight }}
                            data-testid="button-copy-referral"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const text = `Analyse ta peau gratuitement avec GlowScan !\nObtiens ton Glow Score et une routine personnalisée.\n${referralData.link}`;
                            if (navigator.share) { navigator.share({ title: "GlowScan", text, url: referralData.link }); }
                            else { navigator.clipboard.writeText(referralData.link); toast({ title: "Lien copié !", description: "Partage-le avec tes amies" }); }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 font-700 text-sm transition-all active:scale-[0.98]"
                          style={{ background: DS.violet, color: "#fff", borderRadius: "12px" }}
                          data-testid="button-share-referral"
                        >
                          <Link2 className="w-4 h-4" />
                          Partager mon lien
                        </button>
                      </>
                    ) : (
                      <div className="h-16 animate-pulse" style={{ background: "rgba(0,0,0,0.06)", borderRadius: "12px" }} />
                    )}
                  </div>

                  {/* Empty loyalty */}
                  {(!loyaltyData?.history || loyaltyData.history.length === 0) && (
                    <div
                      className="text-center py-12"
                      style={{ background: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 24 }}
                    >
                      <Star className="w-12 h-12 mx-auto mb-3" style={{ color: DS.textHint }} />
                      <h3 className="text-lg font-700 mb-2" style={{ color: DS.textBody }}>Commencer à gagner des points</h3>
                      <p className="text-sm mb-5" style={{ color: DS.textMuted }}>
                        Faites une analyse IA pour gagner vos premiers 2 points !
                      </p>
                      <Link href="/analyze">
                        <span
                          className="px-5 py-2 text-sm font-700 cursor-pointer inline-block"
                          style={{ background: DS.violet, borderRadius: "9999px", color: "#fff" }}
                        >
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

        {/* Sécurité — 2FA optionnelle */}
        <TwoFASettings />

        {/* GDPR privacy settings */}
        <PrivacySettings />
      </main>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        scansThisMonth={scansThisMonth}
        scansLimit={scansLimit}
      />

      {/* Scan detail modal */}
      <AnimatePresence>
        {selectedScan && (
          <ScanDetailModal
            scan={selectedScan}
            onClose={() => setSelectedScan(null)}
          />
        )}
      </AnimatePresence>

      {/* Compare modal */}
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
