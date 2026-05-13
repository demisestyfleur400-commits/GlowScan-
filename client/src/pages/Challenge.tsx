import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ScanFace, Trophy, Flame, ArrowRight, Loader2, Medal } from "lucide-react";

interface ChallengeData {
  challengerName: string | null;
  score: number;
  condition: string | null;
  area: string | null;
  acceptedCount: number;
}

const AREA_LABELS: Record<string, string> = {
  face: "Visage",
  body: "Corps",
  hair: "Cheveux",
};

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <p className="text-4xl font-black text-white leading-none">{score}</p>
        <p className="text-white/50 text-sm font-medium">/100</p>
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-white text-lg font-bold">Défi introuvable</p>
        <p className="text-white/50 text-sm">Ce lien a peut-être expiré.</p>
        <Link href="/analyze">
          <button className="mt-4 px-6 py-3 bg-green-500 text-black font-bold rounded-full">
            Faire mon analyse
          </button>
        </Link>
      </div>
    );
  }

  const challengerName = data.challengerName || "Quelqu'un";
  const areaLabel = AREA_LABELS[data.area || ""] || data.area || "Peau";
  const scoreColor = data.score >= 70 ? "text-green-400" : data.score >= 50 ? "text-pink-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full flex flex-col items-center gap-6 text-center"
      >
        {/* Logo */}
        <div>
          <p className="text-green-500 text-3xl font-black tracking-wide">GLOW</p>
          <p className="text-white text-3xl font-black -mt-1 tracking-wide">SCAN</p>
        </div>

        {/* Challenge badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-full">
          <Flame className="w-4 h-4 text-pink-400" />
          <p className="text-pink-400 text-sm font-bold">Tu es défié(e) !</p>
        </div>

        {/* Challenger intro */}
        <div>
          <p className="text-white/60 text-sm mb-1">
            <span className="text-white font-bold">{challengerName}</span> t'envoie ce défi
          </p>
          <p className="text-white/40 text-xs">Zone : {areaLabel}</p>
        </div>

        {/* Score display */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
            <Trophy className="w-4 h-4 text-pink-400" />
            Son Glow Score
          </div>
          <ScoreCircle score={data.score} />
          {data.condition && (
            <div>
              <p className="text-white/40 text-xs mb-1">Diagnostic</p>
              <p className="text-white font-bold text-sm">{data.condition}</p>
            </div>
          )}
          <p className={`text-2xl font-black ${scoreColor}`}>
            {data.score >= 70 ? "Excellent !" : data.score >= 50 ? "Pas mal !" : "À battre 💪"}
          </p>
        </div>

        {/* Challenge count */}
        {data.acceptedCount > 0 && (
          <p className="text-white/30 text-xs">
            {data.acceptedCount} personne{data.acceptedCount > 1 ? "s ont" : " a"} déjà relevé ce défi
          </p>
        )}

        {/* CTA */}
        <div className="w-full space-y-3">
          <p className="text-white font-bold text-lg">
            Peux-tu faire mieux que {data.score}/100 ?
          </p>
          <Link href="/analyze">
            <motion.button
              whileTap={{ scale: 0.97 }}
              data-testid="button-accept-challenge"
              className="w-full flex items-center justify-center gap-2 py-4 bg-green-500 text-black font-black text-base rounded-2xl shadow-lg shadow-green-500/30"
            >
              <ScanFace className="w-5 h-5" />
              Relever le défi
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
          <p className="text-white/30 text-xs">Analyse gratuite · Résultat en 10 secondes</p>
        </div>

        {/* Classement */}
        {leaderboard.length > 0 && (
          <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-5" data-testid="leaderboard-section">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-pink-400" />
              <p className="text-white font-bold text-sm uppercase tracking-wider">Classement des Challengers</p>
            </div>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => {
                const medalColor = i === 0 ? "text-pink-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-pink-600" : "text-white/30";
                const scoreColor = entry.score >= 70 ? "text-green-400" : entry.score >= 50 ? "text-pink-400" : "text-red-400";
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-testid={`leaderboard-entry-${i}`}>
                    <div className={`w-6 text-center font-black text-sm ${medalColor}`}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : `${i+1}.`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{entry.challengerName || "Anonyme"}</p>
                      <p className="text-white/40 text-[10px] truncate">{entry.condition || (entry.area === "hair" ? "Cheveux" : entry.area === "body" ? "Corps" : "Visage")}</p>
                    </div>
                    <span className={`text-sm font-black ${scoreColor}`}>{entry.score}</span>
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
