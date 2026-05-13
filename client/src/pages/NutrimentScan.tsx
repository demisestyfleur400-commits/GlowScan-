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

function ScoreArc({ score }: { score: number }) {
  const ARC_LEN = 251.33;
  const filled = (score / 100) * ARC_LEN;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Super pour ta peau ✨" : score >= 45 ? "Correct avec modération" : "À limiter pour ta peau";

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
        <path d="M 20,100 A 80,80 0 0 1 180,100" fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
        <path d="M 20,100 A 80,80 0 0 1 180,100" fill="none" stroke="url(#nutr-grad)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${filled} ${ARC_LEN}`} />
        <text x="100" y="88" fill="#111827" fontSize="28" fontWeight="900" textAnchor="middle">{score}</text>
        <text x="100" y="102" fill="#9ca3af" fontSize="7" textAnchor="middle">Score Peau</text>
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
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-[10px] font-black text-gray-800">{value}g</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #f5f3ff 100%)" }}>
        <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center mb-6 text-4xl">🥗</div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-full px-4 py-1.5 mb-4">
            <Crown className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-bold text-pink-700">Fonctionnalité Premium</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>Scan Nutriment</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            Découvre si ce que tu manges est bon pour ta peau. Analyse IA de tes plats et aliments, avec score cutané personnalisé. Disponible dès <strong>500 FCFA/semaine</strong>.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3 mb-8">
          {[
            "Analyses de peau illimitées",
            "SkinBot IA — assistant peau 24h/24",
            "Scan Produit — vérifier tes cosmétiques",
            "Scan Nutriment — impact de l'alimentation",
            "Boutique — accès aux produits recommandés",
          ].map(item => (
            <div key={item} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
              <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-500 text-xs font-bold">✓</span>
              </div>
              <span className="text-sm font-medium text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <a href="/premium" className="w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white shadow-lg" style={{ background: "linear-gradient(135deg, #b8860b 0%, #d4a017 50%, #c9a84c 100%)", fontFamily: "'Outfit', sans-serif" }}>
          <Crown className="w-5 h-5" />
          Passer Premium — dès 500 FCFA/semaine
        </a>
        <a href="/" className="mt-4 text-sm text-gray-400 font-medium">← Retour à l'accueil</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f4f9f4" }} data-testid="page-nutriment-scan">

      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-all" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-gray-900 flex items-center gap-2">
            <span>🥗</span> Scan Nutriment
          </h1>
          <p className="text-[11px] text-gray-400">L'IA analyse l'impact de tes aliments sur ta peau</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Zone upload */}
        {!result && (
          <div>
            {!preview ? (
              <div
                {...getRootProps()}
                data-testid="dropzone-nutriment"
                className={`relative rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                  isDragActive ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"
                }`}
                style={{ height: 280 }}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", border: "1px solid #a7f3d0" }}>
                  <span className="text-3xl">🥗</span>
                </div>
                <div className="text-center px-6">
                  <p className="text-[14px] font-bold text-gray-800">
                    {isDragActive ? "Dépose l'aliment ici" : "Photo d'un plat ou d'une étiquette"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Prends en photo ce que tu manges — plat, fruit, étiquette nutritionnelle, emballage
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 text-white text-[12px] font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm"
                    style={{ background: "#10b981" }}
                    data-testid="button-upload-nutriment"
                  >
                    <Upload className="w-3.5 h-3.5" /> Galerie
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 bg-gray-900 text-white text-[12px] font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm"
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
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-sm border border-gray-100">
                <img src={preview} alt="Aliment" className="w-full object-cover" style={{ maxHeight: 300 }} />
                <button onClick={reset} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {preview && !loading && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={analyze}
                data-testid="button-analyze-nutriment"
                className="w-full mt-4 py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
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
                  className="mt-4 bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-sm"
                >
                  <div className="relative w-16 h-16">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
                    <span className="absolute inset-0 m-auto w-8 h-8 flex items-center justify-center text-2xl">🔬</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-gray-900">Analyse nutritionnelle…</p>
                    <p className="text-[11px] text-gray-400 mt-1">L'IA détecte les nutriments et leur impact sur ta peau</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Erreur */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-red-700">Erreur d'analyse</p>
                  <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Résultat */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Carte principale — identité + score peau */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                {/* Top */}
                <div className="flex gap-0">
                  {preview && (
                    <div className="w-28 flex-shrink-0 bg-gray-50 overflow-hidden" style={{ minHeight: 140 }}>
                      <img src={preview} alt="Aliment" className="w-full h-full object-cover" style={{ maxHeight: 160 }} />
                    </div>
                  )}
                  <div className="flex-1 p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{result.emoji}</span>
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{result.category}</p>
                        <p className="text-[14px] font-black text-gray-900 leading-snug">{result.foodName}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug italic">"{result.verdict}"</p>
                    <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 rounded-xl px-2.5 py-1.5">
                      <Zap className="w-3 h-3 text-pink-500" />
                      <span className="text-[11px] font-black text-pink-700">{result.calories} kcal</span>
                      <span className="text-[9px] text-pink-500 font-medium">/ 100g</span>
                    </div>
                  </div>
                </div>

                {/* Score peau */}
                <div className="flex flex-col items-center py-4 border-t border-gray-100 bg-gray-50/50">
                  <ScoreArc score={result.skinScore} />
                </div>
              </div>

              {/* Macronutriments */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[11px] font-black text-gray-900 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Macronutriments / 100g
                </p>
                <div className="space-y-2.5">
                  <MacroBar label="Protéines" value={result.proteins} color="#6366f1" max={30} />
                  <MacroBar label="Glucides" value={result.carbs} color="#f59e0b" max={60} />
                  <MacroBar label="Lipides" value={result.fats} color="#ec4899" max={30} />
                  <MacroBar label="Fibres" value={result.fiber} color="#10b981" max={15} />
                </div>

                {/* Vitamines & Minéraux */}
                {(result.vitamins.length > 0 || result.minerals.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {result.vitamins.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Vitamines</p>
                        <div className="flex flex-wrap gap-1">
                          {result.vitamins.map(v => (
                            <span key={v} className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.minerals.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Minéraux</p>
                        <div className="flex flex-wrap gap-1">
                          {result.minerals.map(m => (
                            <span key={m} className="text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bénéfices peau */}
              {result.skinBenefits.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
                  <p className="text-[11px] font-black text-emerald-800 mb-2.5 flex items-center gap-1.5">
                    <span>✨</span> Bienfaits pour ta peau
                  </p>
                  <div className="space-y-1.5">
                    {result.skinBenefits.map(b => (
                      <div key={b} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-gray-700 leading-snug">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Avertissements */}
              {result.skinWarnings && result.skinWarnings.length > 0 && result.skinWarnings[0] && (
                <div className="bg-pink-50 rounded-2xl p-4 border border-pink-200">
                  <p className="text-[11px] font-bold text-pink-700 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Points de vigilance
                  </p>
                  {result.skinWarnings.map(w => (
                    <div key={w} className="flex items-start gap-2">
                      <span className="text-pink-500 text-xs flex-shrink-0">•</span>
                      <p className="text-[11px] text-pink-700 leading-snug">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Conseil personnalisé */}
              {result.tip && (
                <div className="rounded-2xl p-4 border border-emerald-200" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" }}>
                  <p className="text-[11px] font-black text-emerald-900 mb-1 flex items-center gap-1.5">
                    <span>💡</span> Conseil personnalisé
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-snug">{result.tip}</p>
                </div>
              )}

              {/* Boutons action */}
              <div className="flex gap-3 pb-4">
                <button
                  onClick={reset}
                  data-testid="button-scan-new-nutriment"
                  className="flex-1 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-700 text-[13px] font-bold active:scale-95 transition-all"
                >
                  Scanner autre chose
                </button>
                <button
                  onClick={() => setLocation("/")}
                  data-testid="button-back-home"
                  className="flex-1 py-3.5 rounded-2xl text-white text-[13px] font-bold active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
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
