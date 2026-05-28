import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ScanFace, Trophy, Flame, ArrowRight, Loader2, Target, ShieldAlert } from "lucide-react";

interface ChallengeData {
  challengerName: string | null;
  score: number;
  condition: string | null;
  area: string | null;
  acceptedCount: number;
}

const AREA_LABELS: Record<string, string> = {
  face: "Zone faciale",
  body: "Zone corporelle",
  hair: "Système capillaire",
};

// ─────────────────────────────────────────────────────────────────────
//  Score circle
// ─────────────────────────────────────────────────────────────────────
function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="text-center">
        <p className="text-4xl font-extrabold leading-none" style={{ color: "#f3f0ff", fontWeight: 800 }}>{score}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Glow Index</p>
      </div>
    </div>
  );
}

interface LeaderboardEntry {
  id: number;
  challengerName: string | null;
  score: number;
  condition: string | null;
  area: string | null;
  acceptedCount: number;
}

export default function Challenge() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch("/api/challenges/leaderboard")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLeaderboard(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return; }
    fetch(`/api/challenge/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0a0e" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a78bfa" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.22)" }}
        >
          <ShieldAlert className="w-5 h-5" style={{ color: "#f43f5e" }} />
        </div>
        <p className="text-sm font-bold" style={{ color: "#f3f0ff" }}>Lien non répertorié</p>
        <p className="text-xs mt-1 max-w-[240px]" style={{ color: "rgba(200,185,255,0.65)" }}>
          Ce défi a expiré ou la session d'analyse est invalide.
        </p>
        <Link href="/analyze">
          <button
            className="mt-6 px-5 py-3 text-sm font-extrabold transition-transform active:scale-95"
            style={{
              background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
              borderRadius: "12px",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            Lancer un diagnostic
          </button>
        </Link>
      </div>
    );
  }

  const challengerName = data.challengerName || "Un utilisateur";
  const areaLabel = AREA_LABELS[data.area || ""] || data.area || "Cutanée";
  const scoreColor = data.score >= 70 ? "#10b981" : data.score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: "fixed",
          top: "-80px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative max-w-sm w-full flex flex-col items-center gap-6 text-center"
        style={{ zIndex: 1 }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>Protocol System</span>
          <span className="text-sm font-extrabold tracking-widest" style={{ color: "#f3f0ff", fontWeight: 800 }}>GlowScan</span>
        </div>

        {/* Challenge badge */}
        <div
          className="flex items-center gap-2 px-3.5 py-1.5"
          style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)", borderRadius: "9999px" }}
        >
          <Flame className="w-3.5 h-3.5 animate-pulse" style={{ color: "#f9a8d4" }} />
          <p className="text-[10px] font-bold tracking-widest" style={{ color: "#f9a8d4" }}>Comparatif reçu</p>
        </div>

        {/* Challenger info */}
        <div>
          <p className="text-xs font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>
            Défi initié par <span className="font-extrabold" style={{ color: "#f3f0ff", fontWeight: 800 }}>{challengerName}</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Secteur : {areaLabel}
          </p>
        </div>

        {/* Score card */}
        <div
          className="w-full flex flex-col items-center gap-4 p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "24px",
          }}
        >
          <div
            className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <Target className="w-3.5 h-3.5" />
            Données biométriques cibles
          </div>

          <ScoreCircle score={data.score} />

          {data.condition && (
            <div
              className="px-3 py-2 max-w-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Observation</p>
              <p className="text-xs font-bold truncate px-1" style={{ color: "rgba(200,185,255,0.65)" }}>{data.condition}</p>
            </div>
          )}

          <p className="text-base font-extrabold" style={{ color: scoreColor, fontWeight: 800 }}>
            {data.score >= 70 ? "Seuil d'excellence" : data.score >= 50 ? "Seuil intermédiaire" : "Index critique — continue !"}
          </p>
        </div>

        {/* Acceptance counter */}
        {data.acceptedCount > 0 && (
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>
            [{data.acceptedCount}] confrontation{data.acceptedCount > 1 ? "s enregistrées" : " enregistrée"}
          </p>
        )}

        {/* CTA block */}
        <div className="w-full space-y-3">
          <p className="text-sm font-extrabold" style={{ color: "#f3f0ff", fontWeight: 800 }}>
            Surpasser la mesure de {data.score}/100 ?
          </p>
          <Link href="/analyze">
            <motion.button
              whileTap={{ scale: 0.98 }}
              data-testid="button-accept-challenge"
              className="w-full flex items-center justify-center gap-2.5 py-4 text-sm font-extrabold transition-all"
              style={{
                background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
                borderRadius: "12px",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              <ScanFace className="w-4 h-4" />
              Soumettre mon analyse
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            Indexation instantanée par IA en 10 secondes.
          </p>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div
            className="w-full p-5 text-left"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
            data-testid="leaderboard-section"
          >
            <div
              className="flex items-center gap-2 mb-4 pb-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c4b5fd" }}>Matrice des scores</p>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, i) => {
                const isTop3 = i < 3;
                const entryScoreColor = entry.score >= 70 ? "#10b981" : entry.score >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={entry.id} className="flex items-center gap-3" data-testid={`leaderboard-entry-${i}`}>
                    <div
                      className="w-5 text-xs font-extrabold text-center"
                      style={{ color: isTop3 ? "#a78bfa" : "rgba(255,255,255,0.35)", fontWeight: 800 }}
                    >
                      {isTop3 ? ["01", "02", "03"][i] : `${i + 1 < 10 ? "0" : ""}${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: "#f3f0ff" }}>
                        {entry.challengerName || "Anonyme"}
                      </p>
                      <p className="text-[9px] truncate uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {entry.condition || (entry.area === "hair" ? "Capillaire" : entry.area === "body" ? "Corporel" : "Facial")}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold" style={{ color: entryScoreColor, fontWeight: 800 }}>{entry.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
