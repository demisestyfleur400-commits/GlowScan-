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
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Glow Index</p>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 bg-slate-900 border border-gray-800 rounded-xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-white text-sm font-black uppercase tracking-widest">Lien non répertorié</p>
        <p className="text-slate-500 text-xs mt-1 max-w-[240px]">Ce défi a expiré ou la session d'analyse est invalide.</p>
        <Link href="/analyze">
          <button className="mt-6 px-5 py-3 bg-white text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition-transform active:scale-95">
            Lancer un diagnostic
          </button>
        </Link>
      </div>
    );
  }

  const challengerName = data.challengerName || "Un utilisateur";
  const areaLabel = AREA_LABELS[data.area || ""] || data.area || "Cutanée";
  const scoreColor = data.score >= 70 ? "text-emerald-400" : data.score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 selection:bg-white selection:text-slate-950">
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
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Comparatif Reçu</p>
        </div>

        {/* Émetteur du défi */}
        <div>
          <p className="text-slate-400 text-xs font-medium">
            Défi initié par <span className="text-white font-black">{challengerName}</span>
          </p>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mt-1 font-mono">Secteur : {areaLabel}</p>
        </div>

        {/* Console centrale du score */}
        <div className="bg-slate-900/40 border border-gray-900 rounded-3xl p-6 w-full flex flex-col items-center gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-widest font-mono">
            <Target className="w-3.5 h-3.5 text-slate-500" />
Données biométriques cibles
          </div>
          
          <ScoreCircle score={data.score} />
          
          {data.condition && (
            <div className="px-3 py-1.5 bg-slate-950 border border-gray-900 rounded-xl max-w-full">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono mb-0.5">Observation</p>
              <p className="text-xs font-bold text-slate-300 truncate px-1">{data.condition}</p>
            </div>
          )}
          
          <p className={`text-base font-black uppercase tracking-wider ${scoreColor}`}>
            {data.score >= 70 ? "Seuil d'excellence" : data.score >= 50 ? "Seuil intermédiaire" : "Index critique 💪"}
          </p>
        </div>

        {/* Compteur d'acceptation discret */}
        {data.acceptedCount > 0 && (
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-wide">
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
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-white text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xl transition-all hover:bg-gray-100"
            >
              <ScanFace className="w-4 h-4 text-slate-950" />
              Soumettre mon analyse
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </motion.button>
          </Link>
          <p className="text-slate-500 font-medium text-[10px]">Indexation instantanée par IA en 10 secondes.</p>
        </div>

        {/* Classement des challengers */}
        {leaderboard.length > 0 && (
          <div className="w-full bg-slate-900/20 border border-gray-900 rounded-3xl p-5 text-left" data-testid="leaderboard-section">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-900/60 pb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-white text-[10px] font-black uppercase tracking-widest">Matrice des scores</p>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, i) => {
                const isTop3 = i < 3;
                const scoreColor = entry.score >= 70 ? "text-emerald-400" : entry.score >= 50 ? "text-amber-400" : "text-red-400";
                return (
                  <div key={entry.id} className="flex items-center gap-3" data-testid={`leaderboard-entry-${i}`}>
                    <div className="w-5 font-mono text-xs font-black text-slate-500 text-center">
                      {isTop3 ? ["01", "02", "03"][i] : `${i + 1 < 10 ? "0" : ""}${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{entry.challengerName || "Anonyme"}</p>
                      <p className="text-slate-500 font-mono text-[9px] truncate uppercase tracking-wider">
                        {entry.condition || (entry.area === "hair" ? "Capillaire" : entry.area === "body" ? "Corporel" : "Facial")}
                      </p>
                    </div>
                    <span className={`text-xs font-mono font-black ${scoreColor}`}>{entry.score}</span>
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
