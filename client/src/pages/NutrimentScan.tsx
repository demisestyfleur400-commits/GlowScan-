import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, Camera, Upload, X, Sparkles, AlertTriangle, CheckCircle2, Leaf, Zap, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

interface NutrimentResult {
  foodName: string;
  emoji: string;
  category: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
  vitamins: string[];
  minerals: string[];
  skinScore: number;
  skinLabel: string;
  skinBenefits: string[];
  skinWarnings: string[];
  verdict: string;
  tip: string;
}

const DS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

function ScoreArc({ score }: { score: number }) {
  const ARC_LEN = 251.33;
  const filled = (score / 100) * ARC_LEN;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Super pour ta peau" : score >= 45 ? "Correct avec modération" : "À limiter pour ta peau";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 115" className="w-44">
        <defs>
          <linearGradient id="nutr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <path d="M 20,100 A 80,80 0 0 1 180,100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20,100 A 80,80 0 0 1 180,100"
          fill="none"
          stroke="url(#nutr-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${ARC_LEN}`}
        />
        <text x="100" y="88" fill="#f3f0ff" fontSize="28" fontWeight="800" textAnchor="middle">{score}</text>
        <text x="100" y="102" fill="rgba(200,185,255,0.65)" fontSize="7" textAnchor="middle">Score peau</text>
      </svg>
      <span className="text-xs font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function MacroBar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(200,185,255,0.65)" }}>{label}</span>
        <span className="text-[10px] font-extrabold" style={{ color: "#f3f0ff", fontWeight: 800 }}>{value}g</span>
      </div>
      <div className="overflow-hidden" style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px" }}>
        <motion.div
          className="h-full"
          style={{ background: color, borderRadius: "9999px" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function NutrimentScan() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutrimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      setPreview(e.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop: files => files[0] && processFile(files[0]),
  });

  const analyze = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/nutriment-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: preview }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur d'analyse");
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  if (false && !subLoading && !isPremium) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
        style={{ background: "#0d0a0e", fontFamily: DS }}
      >
        <div
          className="w-20 h-20 flex items-center justify-center mb-6 text-4xl"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: "24px" }}
        >
          🥗
        </div>
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-4"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "9999px" }}
          >
            <Crown className="w-4 h-4" style={{ color: "#c4b5fd" }} />
            <span className="text-xs font-bold" style={{ color: "#c4b5fd" }}>Fonctionnalité premium</span>
          </div>
          <h1 className="text-2xl font-extrabold mb-3" style={{ color: "#f3f0ff", fontWeight: 800, fontFamily: DS }}>
            Scan nutriment
          </h1>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(200,185,255,0.65)" }}>
            Découvre si ce que tu manges est bon pour ta peau. Analyse IA de tes plats et aliments, avec score cutané personnalisé.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3 mb-8">
          {[
            "Analyses de peau illimitées",
            "SkinBot IA — assistant peau 24h/24",
            "Scan produit — vérifier tes cosmétiques",
            "Scan nutriment — impact de l'alimentation",
            "Boutique — accès aux produits recommandés",
          ].map(item => (
            <div
              key={item}
              className="flex items-center gap-3 p-3.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px" }}
            >
              <div
                className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(167,139,250,0.15)", borderRadius: "8px" }}
              >
                <span className="text-xs font-bold" style={{ color: "#c4b5fd" }}>✓</span>
              </div>
              <span className="text-sm font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>{item}</span>
            </div>
          ))}
        </div>
        <a
          href="/premium"
          className="w-full max-w-sm flex items-center justify-center gap-2 py-4 font-extrabold text-sm"
          style={{
            background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
            borderRadius: "12px",
            color: "#fff",
            fontWeight: 800,
          }}
        >
          <Crown className="w-5 h-5" />
          Passer premium — 2 000 FCFA à vie
        </a>
        <a href="/" className="mt-4 text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
          ← Retour à l'accueil
        </a>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-10"
      style={{ background: "#0d0a0e", fontFamily: DS }}
      data-testid="page-nutriment-scan"
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

      {/* Header */}
      <div
        className="px-5 pt-14 pb-4 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px" }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
        </button>
        <div>
          <h1 className="text-base font-extrabold flex items-center gap-2" style={{ color: "#f3f0ff", fontWeight: 800 }}>
            <Leaf className="w-4 h-4" style={{ color: "#a78bfa" }} /> Scan nutriment
          </h1>
          <p className="text-[11px]" style={{ color: "rgba(200,185,255,0.65)" }}>
            L'IA analyse l'impact de tes aliments sur ta peau
          </p>
        </div>
      </div>

      <div className="relative px-4 pt-5 space-y-4" style={{ zIndex: 1 }}>

        {/* Upload zone */}
        {!result && (
          <div>
            {!preview ? (
              <div
                {...getRootProps()}
                data-testid="dropzone-nutriment"
                className="relative border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
                style={{
                  height: 280,
                  borderRadius: "24px",
                  borderColor: isDragActive ? "rgba(124,58,237,0.6)" : "rgba(167,139,250,0.2)",
                  background: isDragActive ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                }}
              >
                <input {...getInputProps()} />
                <div
                  className="w-16 h-16 flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: "20px" }}
                >
                  <span className="text-3xl">🥗</span>
                </div>
                <div className="text-center px-6">
                  <p className="text-sm font-extrabold" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                    {isDragActive ? "Dépose l'aliment ici" : "Photo d'un plat ou d'une étiquette"}
                  </p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Prends en photo ce que tu manges — plat, fruit, étiquette nutritionnelle, emballage
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 transition-all active:scale-95"
                    style={{ background: "#7c3aed", borderRadius: "9999px", color: "#fff", fontWeight: 700 }}
                    data-testid="button-upload-nutriment"
                  >
                    <Upload className="w-3.5 h-3.5" /> Galerie
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "9999px", color: "#f3f0ff", fontWeight: 700 }}
                  >
                    <Camera className="w-3.5 h-3.5" /> Caméra
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="relative overflow-hidden" style={{ borderRadius: "24px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <img src={preview} alt="Aliment" className="w-full object-cover" style={{ maxHeight: 300 }} />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center"
                  style={{ background: "rgba(13,10,14,0.7)", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <X className="w-4 h-4" style={{ color: "#f3f0ff" }} />
                </button>
              </div>
            )}

            {preview && !loading && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={analyze}
                data-testid="button-analyze-nutriment"
                className="w-full mt-4 py-4 text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                  borderRadius: "12px",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                <Sparkles className="w-5 h-5" />
                Analyser l'impact sur ma peau
              </motion.button>
            )}

            {/* Loading */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-8 flex flex-col items-center gap-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
                >
                  <div className="relative w-16 h-16">
                    <div
                      className="w-16 h-16 animate-spin"
                      style={{
                        borderRadius: "9999px",
                        border: "4px solid rgba(167,139,250,0.15)",
                        borderTopColor: "#7c3aed",
                      }}
                    />
                    <span className="absolute inset-0 m-auto w-8 h-8 flex items-center justify-center text-2xl">🔬</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-extrabold" style={{ color: "#f3f0ff", fontWeight: 800 }}>Analyse nutritionnelle…</p>
                    <p className="text-[11px] mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
                      L'IA détecte les nutriments et leur impact sur ta peau
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div
                className="mt-4 p-4 flex items-start gap-3"
                style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "16px" }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#f43f5e" }} />
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "#f3f0ff" }}>Erreur d'analyse</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(200,185,255,0.65)" }}>{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Main identity + skin score card */}
              <div
                className="overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
              >
                <div className="flex gap-0">
                  {preview && (
                    <div className="w-28 flex-shrink-0 overflow-hidden" style={{ minHeight: 140 }}>
                      <img src={preview} alt="Aliment" className="w-full h-full object-cover" style={{ maxHeight: 160 }} />
                    </div>
                  )}
                  <div className="flex-1 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{result.emoji}</span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                          {result.category}
                        </p>
                        <p className="text-sm font-extrabold leading-snug" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                          {result.foodName}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-snug italic" style={{ color: "rgba(200,185,255,0.65)" }}>
                      "{result.verdict}"
                    </p>
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5"
                      style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "8px" }}
                    >
                      <Zap className="w-3 h-3" style={{ color: "#c4b5fd" }} />
                      <span className="text-[11px] font-extrabold" style={{ color: "#c4b5fd", fontWeight: 800 }}>{result.calories} kcal</span>
                      <span className="text-[9px] font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>/ 100g</span>
                    </div>
                  </div>
                </div>

                {/* Skin score arc */}
                <div
                  className="flex flex-col items-center py-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                >
                  <ScoreArc score={result.skinScore} />
                </div>
              </div>

              {/* Macronutrients */}
              <div
                className="p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
              >
                <p className="text-[11px] font-extrabold mb-3 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                  <Leaf className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} /> Macronutriments / 100g
                </p>
                <div className="space-y-3">
                  <MacroBar label="Protéines" value={result.proteins} color="linear-gradient(90deg,#7c3aed,#a78bfa)" max={30} />
                  <MacroBar label="Glucides" value={result.carbs} color="linear-gradient(90deg,#7c3aed,#a78bfa)" max={60} />
                  <MacroBar label="Lipides" value={result.fats} color="linear-gradient(90deg,#7c3aed,#a78bfa)" max={30} />
                  <MacroBar label="Fibres" value={result.fiber} color="linear-gradient(90deg,#10b981,#6ee7b7)" max={15} />
                </div>

                {/* Vitamins & minerals */}
                {(result.vitamins.length > 0 || result.minerals.length > 0) && (
                  <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    {result.vitamins.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Vitamines
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {result.vitamins.map(v => (
                            <span
                              key={v}
                              className="text-[10px] font-bold px-2 py-0.5"
                              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "8px", color: "#c4b5fd" }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.minerals.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Minéraux
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {result.minerals.map(m => (
                            <span
                              key={m}
                              className="text-[10px] font-bold px-2 py-0.5"
                              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "8px", color: "#fbbf24" }}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Skin benefits */}
              {result.skinBenefits.length > 0 && (
                <div
                  className="p-4"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "24px" }}
                >
                  <p className="text-[11px] font-extrabold mb-2.5 flex items-center gap-1.5" style={{ color: "#6ee7b7", fontWeight: 800 }}>
                    <Sparkles className="w-3.5 h-3.5" /> Bienfaits pour ta peau
                  </p>
                  <div className="space-y-1.5">
                    {result.skinBenefits.map(b => (
                      <div key={b} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#6ee7b7" }} />
                        <span className="text-[11px] leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.skinWarnings && result.skinWarnings.length > 0 && result.skinWarnings[0] && (
                <div
                  className="p-4"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "24px" }}
                >
                  <p className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5" style={{ color: "#fbbf24" }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Points de vigilance
                  </p>
                  {result.skinWarnings.map(w => (
                    <div key={w} className="flex items-start gap-2">
                      <span className="text-xs flex-shrink-0" style={{ color: "#fbbf24" }}>•</span>
                      <p className="text-[11px] leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Personalized tip */}
              {result.tip && (
                <div
                  className="p-4"
                  style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: "24px" }}
                >
                  <p className="text-[11px] font-extrabold mb-1 flex items-center gap-1.5" style={{ color: "#c4b5fd", fontWeight: 800 }}>
                    <Zap className="w-3.5 h-3.5" /> Conseil personnalisé
                  </p>
                  <p className="text-[11px] leading-snug" style={{ color: "rgba(200,185,255,0.65)" }}>{result.tip}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pb-4">
                <button
                  onClick={reset}
                  data-testid="button-scan-new-nutriment"
                  className="flex-1 py-3.5 text-sm font-bold transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "9999px", color: "#f3f0ff", fontWeight: 700 }}
                >
                  Scanner autre chose
                </button>
                <button
                  onClick={() => setLocation("/")}
                  data-testid="button-back-home"
                  className="flex-1 py-3.5 text-sm font-extrabold transition-all active:scale-95"
                  style={{ background: "#7c3aed", borderRadius: "9999px", color: "#fff", fontWeight: 800 }}
                >
                  Retour accueil
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
