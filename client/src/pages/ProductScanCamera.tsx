import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, Camera, Upload, X, ShieldCheck, Sparkles, AlertTriangle, CheckCircle2, ShoppingBag, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 70 70" className="w-16 h-16 -rotate-90">
          <circle cx="35" cy="35" r={r} fill="none" stroke="#F1F5F9" strokeWidth="5.5" />
          <circle
            cx="35" cy="35" r={r} fill="none"
            stroke={color} strokeWidth="5.5"
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900 font-mono">
          {score}%
        </span>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  );
}

export default function ProductScanCamera() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToRoutine, setAddedToRoutine] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      setResult(null);
      setError(null);
      setAddedToRoutine(false);
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
        throw new Error(err.message || "Erreur de décodage des ingrédients");
      }
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Impossible de joindre le serveur d'analyse");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToRoutine = () => {
    setAddedToRoutine(true);
    toast({
      title: "Routine synchronisée ⚡",
      description: `${result?.productName} a été planifié dans tes rappels quotidiens.`,
    });
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setAddedToRoutine(false);
  };

  const matchColor = (s: number) => s >= 75 ? "#10B981" : s >= 50 ? "#F59E0B" : "#EF4444";
  const safetyColor = (s: number) => s >= 80 ? "#10B981" : s >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 antialiased" data-testid="page-product-scan-camera">

      {/* ── HEADER PREMIUM ── */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100 flex items-center gap-3.5 sticky top-0 z-40 shadow-xs">
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center active:scale-90 transition-all"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">Analyse de Molécule</h1>
          <p className="text-[11px] text-slate-400 font-medium">Scanner et valider la toxicité ou compatibilité</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">

        {/* ── ZONE DE CAPTURE ET DROPZONE ── */}
        {!result && (
          <div>
            {!preview ? (
              <div
                {...getRootProps()}
                data-testid="dropzone-product"
                className={`relative rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 p-6 text-center ${
                  isDragActive
                    ? "border-slate-950 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                style={{ height: 290 }}
              >
                <input {...getInputProps()} />
                <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-md shadow-slate-950/10">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {isDragActive ? "Dépose le flacon" : "Soumettre un produit"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium max-w-[240px] mx-auto leading-normal">
                    Prends en photo la liste des ingrédients (INCI) à l'arrière ou l'étiquette avant.
                  </p>
                </div>
                
                <div className="flex gap-2 w-full max-w-[260px] pt-2">
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all"
                    data-testid="button-upload-product"
                  >
                    <Upload className="w-3.5 h-3.5" /> Galerie
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all shadow-sm"
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
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-200 p-2">
                <img src={preview} alt="Produit scanné" className="w-full object-cover rounded-2xl" style={{ maxHeight: 280 }} />
                <button
                  onClick={reset}
                  className="absolute top-5 window-right right-5 w-8 h-8 rounded-xl bg-slate-950/80 backdrop-blur-xs flex items-center justify-center border border-white/10 active:scale-90 transition-all"
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
                className="w-full mt-4 py-4 rounded-2xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all hover:bg-slate-900"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Lancer le décodage IA
              </motion.button>
            )}

            {/* ── CHARGEMENT CLINIQUE ── */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 bg-white rounded-3xl p-8 flex flex-col items-center gap-4 border border-slate-200 shadow-xs"
                >
                  <div className="relative w-12 h-12">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-950 anonymity-spin animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-slate-950" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-900">Isolément des actifs…</p>
                    <p className="text-[11px] text-slate-400 font-medium max-w-[240px] leading-relaxed">Vérification de la cytotoxicité et calcul du taux de concordance cutanée.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── COMPOSANT D'ERREUR ── */}
            {error && (
              <div className="mt-4 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-rose-800">Anomalie Diagnostic</p>
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PANNEAU DES RÉSULTATS D'ANALYSE ── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {/* Carte Principale d'Identité du Produit */}
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
                <div className="flex gap-4 p-4 items-center">
                  {preview && (
                    <div className="w-20 h-20 flex-shrink-0 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                      <img src={preview} alt="Produit" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    {result.brand && (
                      <span className="inline-block text-[9px] font-black uppercase tracking-widest text-slate-400">{result.brand}</span>
                    )}
                    <p className="text-sm font-black text-slate-900 leading-tight">{result.productName}</p>
                    <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {result.category}
                    </span>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  <p className="text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100/60 leading-relaxed">
                    <span className="font-bold text-slate-900">Verdict :</span> {result.verdict}
                  </p>
                </div>

                {/* Grille des Scores Cliniques */}
                <div className="grid grid-cols-2 py-4 border-t border-slate-100 bg-slate-50/40 divide-x divide-slate-100">
                  <ScoreCircle score={result.matchScore} color={matchColor(result.matchScore)} label="Concordance Peau" />
                  <ScoreCircle score={result.safetyScore} color={safetyColor(result.safetyScore)} label="Indice de Sécurité" />
                </div>
              </div>

              {/* Composition Moléculaire (Ingrédients) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-950" /> Molécules Clés Détectées
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.mainIngredients.map(ing => (
                    <span key={ing} className="text-[10px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Propriétés Cliniques (Bénéfices) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-950" /> Actions Cutanées Visées
                </p>
                <div className="space-y-2">
                  {result.benefits.map(b => (
                    <div key={b} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600 font-medium leading-normal">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contre-indications / Avertissements */}
              {result.warnings && result.warnings.length > 0 && result.warnings[0] && (
                <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/60 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Facteurs de vigilance / Risques
                  </p>
                  <div className="space-y-1">
                    {result.warnings.map(w => (
                      <p key={w} className="text-xs text-rose-700 font-medium leading-relaxed">• {w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Le Conseil Personnalisé IA */}
              {result.note && (
                <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/70 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">💡 Recommandation d'usage</p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">{result.note}</p>
                </div>
              )}

              {/* ── MODULE DE CONVERSION ET STRATÉGIE ROUTINE ── */}
              <div className="bg-slate-950 text-white rounded-3xl p-5 border border-slate-900 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Planification Chrono-Soin</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Automatiser les rappels pour ce produit</p>
                  </div>
                </div>

                {!addedToRoutine ? (
                  <button
                    onClick={handleAddToRoutine}
                    className="w-full bg-white hover:bg-slate-100 text-slate-950 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                  >
                    Intégrer à mes rappels quotidiens
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Produit ajouté à ton calendrier de soins
                  </div>
                )}
              </div>

              {/* Boutons d'Actions de Navigation Bas de Page */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  data-testid="button-scan-new"
                  className="flex-1 py-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-xs"
                >
                  Nouveau Scan
                </button>
                <button
                  onClick={() => setLocation("/scan-product")}
                  data-testid="button-voir-boutique"
                  className="flex-1 py-4 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-md hover:bg-slate-900"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Boutique Glow
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
