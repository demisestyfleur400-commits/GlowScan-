import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ScanFace, Trophy, Flame, ArrowRight, Loader2, Target, Terminal, ShieldAlert } from "lucide-react";

interface ChallengeData {
  challengerName: string | null;
  score: number;
  condition: string | null;
  area: string | null;
  acceptedCount: number;
}

const AREA_LABELS: Record<string, string> = {
  face: "Zone Faciale",
  body: "Zone Corporelle",
  hair: "Système Capillaire",
};

// ─────────────────────────────────────────────────────────────────────
//  SCORE CIRCLE CLINIQUE
// ─────────────────────────────────────────────────────────────────────
function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"; // Vert émeraude, Ambre, Rouge
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-36 h-36 flex items-center justify-center font-mono">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
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
        <p className="text-4xl font-black text-white tracking-tighter leading-none">{score}</p>
        <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Glow Index</p>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0A0E" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#E91E8C" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "#0D0A0E" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)" }}>
          <ShieldAlert className="w-5 h-5" style={{ color: "#f43f5e" }} />
        </div>
        <p className="text-white text-sm font-black uppercase tracking-widest">Lien non répertorié</p>
        <p className="text-xs mt-1 max-w-[240px]" style={{ color: "rgba(255,255,255,0.4)" }}>Ce défi a expiré ou la session d'analyse est invalide.</p>
        <Link href="/analyze">
          <button className="mt-6 px-5 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)" }}>
            Lancer un diagnostic
          </button>
        </Link>
      </div>
    );
  }

  const challengerName = data.challengerName || "Un utilisateur";
  const areaLabel = AREA_LABELS[data.area || ""] || data.area || "Cutanée";
  const scoreColor = data.score >= 70 ? "#10b981" : data.score >= 50 ? "#fb923c" : "#f43f5e";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 selection:bg-white selection:text-slate-950" style={{ background: "#0D0A0E" }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-sm w-full flex flex-col items-center gap-6 text-center"
      >
        {/* Identifiant de marque technique */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500">Protocol System</span>
          <span className="text-sm font-black uppercase tracking-widest text-white mt-0.5">GlowScan</span>
        </div>

        {/* Badge d'alerte de défi */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl" style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)" }}>
          <Flame className="w-3.5 h-3.5 animate-pulse" style={{ color: "#E91E8C" }} />
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#E91E8C" }}>Comparatif Reçu</p>
        </div>

        {/* Émetteur du défi */}
        <div>
          <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Défi initié par <span className="text-white font-black">{challengerName}</span>
          </p>
          <p className="text-[10px] font-black uppercase tracking-wider mt-1 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Secteur : {areaLabel}</p>
        </div>

        {/* Console centrale du score */}
        <div className="rounded-3xl p-6 w-full flex flex-col items-center gap-4 shadow-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Target className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
            Données biométriques cibles
          </div>

          <ScoreCircle score={data.score} />

          {data.condition && (
            <div className="px-3 py-1.5 rounded-xl max-w-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest font-mono mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Observation</p>
              <p className="text-xs font-bold truncate px-1" style={{ color: "rgba(255,255,255,0.7)" }}>{data.condition}</p>
            </div>
          )}

          <p className="text-base font-black uppercase tracking-wider" style={{ color: scoreColor }}>
            {data.score >= 70 ? "Seuil d'excellence" : data.score >= 50 ? "Seuil intermédiaire" : "Index critique 💪"}
          </p>
        </div>

        {/* Compteur d'acceptation discret */}
        {data.acceptedCount > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
            [{data.acceptedCount}] confrontation{data.acceptedCount > 1 ? "s enregistrées" : " enregistrée"}
          </p>
        )}

        {/* Bloc d'action principal */}
        <div className="w-full space-y-3">
          <p className="text-white font-black text-sm uppercase tracking-wider">
            Surpasser la mesure de {data.score}/100 ?
          </p>
          <Link href="/analyze">
            <motion.button
              whileTap={{ scale: 0.98 }}
              data-testid="button-accept-challenge"
              className="w-full flex items-center justify-center gap-2.5 py-4 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
              style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)", boxShadow: "0 0 30px rgba(233,30,140,0.4)" }}
            >
              <ScanFace className="w-4 h-4" />
              Soumettre mon analyse
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <p className="font-medium text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Indexation instantanée par IA en 10 secondes.</p>
        </div>

        {/* Classement des challengers */}
        {leaderboard.length > 0 && (
          <div className="w-full rounded-3xl p-5 text-left" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="leaderboard-section">
            <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <Trophy className="w-3.5 h-3.5" style={{ color: "#fb923c" }} />
              <p className="text-white text-[10px] font-black uppercase tracking-widest">Matrice des scores</p>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, i) => {
                const isTop3 = i < 3;
                const entryScoreColor = entry.score >= 70 ? "#10b981" : entry.score >= 50 ? "#fb923c" : "#f43f5e";
                return (
                  <div key={entry.id} className="flex items-center gap-3" data-testid={`leaderboard-entry-${i}`}>
                    <div className="w-5 font-mono text-xs font-black text-center" style={{ color: isTop3 ? "#fb923c" : "rgba(255,255,255,0.3)" }}>
                      {isTop3 ? ["01", "02", "03"][i] : `${i + 1 < 10 ? "0" : ""}${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{entry.challengerName || "Anonyme"}</p>
                      <p className="font-mono text-[9px] truncate uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {entry.condition || (entry.area === "hair" ? "Capillaire" : entry.area === "body" ? "Corporel" : "Facial")}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-black" style={{ color: entryScoreColor }}>{entry.score}</span>
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
