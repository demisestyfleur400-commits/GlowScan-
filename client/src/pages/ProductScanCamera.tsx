import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, Camera, Upload, X, ShieldCheck, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ProductScanResult {
  productName: string;
  brand: string | null;
  category: string;
  mainIngredients: string[];
  benefits: string[];
  suitableFor: string[];
  warnings: string[];
  matchScore: number;
  matchLabel: string;
  verdict: string;
  safetyScore: number;
  note: string;
}

function ScoreCircle({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 70 70" className="w-16 h-16 -rotate-90">
          <circle cx="35" cy="35" r={r} fill="none" stroke="#FCE4F1" strokeWidth="6" />
          <circle
            cx="35" cy="35" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-black text-gray-900">
          {score}
        </span>
      </div>
      <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function ProductScanCamera() {
  const [, setLocation] = useLocation();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target?.result as string;
      setPreview(base64);
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
      const res = await fetch("/api/product-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: preview }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur d'analyse");
      }
      const data = await res.json();
      setResult(data);
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

  const matchColor = (s: number) => s >= 75 ? "#1B5E20" : s >= 50 ? "#f59e0b" : "#ef4444";
  const safetyColor = (s: number) => s >= 80 ? "#1B5E20" : s >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f8f8f6" }} data-testid="page-product-scan-camera">

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-gray-900">Scanner un produit</h1>
          <p className="text-[11px] text-gray-400">L'IA analyse n'importe quel produit pour toi</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* ── Zone upload/preview ── */}
        {!result && (
          <div>
            {!preview ? (
              <div
                {...getRootProps()}
                data-testid="dropzone-product"
                className={`relative rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                  isDragActive
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-200 bg-white"
                }`}
                style={{ height: 280 }}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-pink-500" />
                </div>
                <div className="text-center px-6">
                  <p className="text-[14px] font-bold text-gray-800">
                    {isDragActive ? "Dépose le produit ici" : "Prends ou importe une photo"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Vise le produit avec ta caméra ou importe une photo depuis ta galerie
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 bg-pink-500 text-white text-[12px] font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm"
                    data-testid="button-upload-product"
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
                <img src={preview} alt="Produit" className="w-full object-cover" style={{ maxHeight: 300 }} />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {preview && !loading && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={analyze}
                data-testid="button-analyze-product"
                className="w-full mt-4 py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(135deg, #d4a017 0%, #b8860b 100%)" }}
              >
                <Sparkles className="w-5 h-5" />
                Analyser ce produit
              </motion.button>
            )}

            {/* ── Loading ── */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-sm"
                >
                  <div className="relative w-16 h-16">
                    <div className="w-16 h-16 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-pink-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-gray-900">Analyse en cours…</p>
                    <p className="text-[11px] text-gray-400 mt-1">L'IA examine les ingrédients et vérifie la compatibilité avec ta peau</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Erreur ── */}
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

        {/* ── Résultat ── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Carte principale */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                {/* Top — image + scores */}
                <div className="flex gap-0">
                  {preview && (
                    <div className="w-28 flex-shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden" style={{ minHeight: 140 }}>
                      <img src={preview} alt="Produit" className="w-full h-full object-cover" style={{ maxHeight: 160 }} />
                    </div>
                  )}
                  <div className="flex-1 p-4 space-y-1.5">
                    {result.brand && (
                      <p className="text-[9px] font-bold text-pink-600 uppercase tracking-widest">{result.brand}</p>
                    )}
                    <p className="text-[13px] font-bold text-gray-900 leading-snug">{result.productName}</p>
                    <span className="inline-block text-[9px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {result.category}
                    </span>
                    <p className="text-[11px] text-gray-600 leading-snug mt-1 italic">"{result.verdict}"</p>
                  </div>
                </div>

                {/* Scores */}
                <div className="flex justify-around py-4 border-t border-gray-100 bg-gray-50/50">
                  <ScoreCircle score={result.matchScore} color={matchColor(result.matchScore)} label="Compatibilité peau" />
                  <div className="w-px bg-gray-100" />
                  <ScoreCircle score={result.safetyScore} color={safetyColor(result.safetyScore)} label="Sécurité ingrédients" />
                </div>
              </div>

              {/* Ingrédients principaux */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-pink-500" /> Ingrédients principaux
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.mainIngredients.map(ing => (
                    <span key={ing} className="text-[10px] font-medium text-pink-700 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-full">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bénéfices */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Bénéfices
                </p>
                <div className="space-y-1.5">
                  {result.benefits.map(b => (
                    <div key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-gray-700">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Convient à */}
              {result.suitableFor.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-900 mb-2">Convient pour</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suitableFor.map(s => (
                      <span key={s} className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Avertissements */}
              {result.warnings && result.warnings.length > 0 && result.warnings[0] && (
                <div className="bg-pink-50 rounded-2xl p-4 border border-pink-200">
                  <p className="text-[11px] font-bold text-pink-700 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Mises en garde
                  </p>
                  {result.warnings.map(w => (
                    <p key={w} className="text-[10px] text-pink-700 leading-snug">{w}</p>
                  ))}
                </div>
              )}

              {/* Note personnalisée */}
              {result.note && (
                <div className="rounded-2xl p-4 border border-pink-200" style={{ background: "linear-gradient(135deg, #fef9e7 0%, #fdf3c0 100%)" }}>
                  <p className="text-[11px] font-bold text-pink-700 mb-1">💡 Conseil personnalisé</p>
                  <p className="text-[11px] text-pink-700 leading-snug">{result.note}</p>
                </div>
              )}

              {/* Boutons action */}
              <div className="flex gap-3 pb-4">
                <button
                  onClick={reset}
                  data-testid="button-scan-new"
                  className="flex-1 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-700 text-[13px] font-bold active:scale-95 transition-all"
                >
                  Scanner un autre
                </button>
                <button
                  onClick={() => setLocation("/scan-product")}
                  data-testid="button-voir-boutique"
                  className="flex-1 py-3.5 rounded-2xl text-white text-[13px] font-bold active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, #d4a017 0%, #b8860b 100%)" }}
                >
                  Voir la boutique
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
