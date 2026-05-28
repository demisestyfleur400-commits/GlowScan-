import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, Camera, Upload, X, ShieldCheck, Sparkles, AlertTriangle, CheckCircle2, ShoppingBag, Calendar, Crown, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

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
          <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5.5" />
          <circle
            cx="35" cy="35" r={r} fill="none"
            stroke={color} strokeWidth="5.5"
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold font-mono" style={{ color: DS.text }}>
          {score}%
        </span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight max-w-[80px]" style={{ color: DS.muted }}>{label}</span>
    </div>
  );
}

const pageFont = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

function PremiumGate({ setLocation }: { setLocation: (to: string) => void }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: DS.base, fontFamily: pageFont }}
    >
      {/* Ambient orb */}
      <div
        style={{
          position: "fixed", top: "-80px", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(124,58,237,0.12), transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(233,30,140,0.1)", border: "1px solid rgba(233,30,140,0.3)" }}
      >
        <Lock className="w-7 h-7" style={{ color: "#f9a8d4" }} />
      </div>

      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 mb-4"
        style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.3)", borderRadius: "9999px" }}
      >
        <Crown className="w-3 h-3" style={{ color: "#f9a8d4" }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: "#f9a8d4" }}>FONCTIONNALITÉ PREMIUM</span>
      </div>

      <h1 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: DS.text, fontWeight: 800 }}>
        Scan Produit IA
      </h1>
      <p className="text-xs max-w-xs mx-auto mb-2 leading-relaxed" style={{ color: DS.body }}>
        Prends en photo n'importe quel cosmétique — l'IA analyse les ingrédients, évalue la compatibilité avec ta peau et te dit si c'est safe.
      </p>
      <p className="text-[11px] max-w-[220px] mx-auto mb-8 font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
        Tes analyses faciales restent gratuites et illimitées.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => setLocation("/premium")}
          className="w-full py-4 text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#E91E8C,#f43f5e)", borderRadius: "12px", color: "#fff", fontWeight: 800 }}
        >
          <Crown className="w-4 h-4" />
          Débloquer pour 2 000 FCFA
        </button>
        <button
          onClick={() => setLocation("/")}
          className="w-full py-3 text-xs font-bold transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: DS.body }}
        >
          Retour à l'accueil
        </button>
      </div>

      {/* Teaser features */}
      <div className="mt-8 w-full max-w-xs space-y-2">
        {[
          "Détection des ingrédients irritants / perturbateurs",
          "Score de compatibilité avec ton profil de peau",
          "Conseil personnalisé usage & application",
        ].map(f => (
          <div key={f} className="flex items-center gap-2.5 text-[11px]" style={{ color: "rgba(200,185,255,0.5)" }}>
            <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: "#a78bfa" }} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductScanCamera() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToRoutine, setAddedToRoutine] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Loading ──
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DS.base }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(167,139,250,0.15)", borderTopColor: "#7c3aed" }} />
      </div>
    );
  }

  // ── Gate : connexion requise ──
  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: DS.base, fontFamily: pageFont }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.3)" }}>
          <Sparkles className="w-6 h-6" style={{ color: "#a78bfa" }} />
        </div>
        <h2 className="text-sm font-extrabold mb-1" style={{ color: DS.text }}>Connexion requise</h2>
        <p className="text-xs max-w-[260px] mx-auto leading-relaxed mb-6" style={{ color: DS.body }}>
          Connecte-toi pour accéder au Scan Produit IA.
        </p>
        <button
          onClick={() => setLocation("/auth")}
          className="px-6 py-3 rounded-full text-xs font-extrabold text-white"
          style={{ background: "#7c3aed" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  // ── Gate : premium requis ──
  if (!isPremium) {
    return <PremiumGate setLocation={setLocation} />;
  }

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

  const matchColor = (s: number) => s >= 75 ? "#6ee7b7" : s >= 50 ? "#fbbf24" : "#f9a8d4";
  const safetyColor = (s: number) => s >= 80 ? "#6ee7b7" : s >= 60 ? "#fbbf24" : "#f9a8d4";

  return (
    <div
      className="min-h-screen pb-12 antialiased"
      style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      data-testid="page-product-scan-camera"
    >
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 flex items-center gap-3.5 sticky top-0 z-40"
        style={{ background: "rgba(13,10,14,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${DS.border}` }}
      >
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}` }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" style={{ color: DS.body }} />
        </button>
        <div>
          <h1 className="text-sm font-extrabold" style={{ color: DS.text }}>Analyse de molécule</h1>
          <p className="text-[11px] font-medium" style={{ color: DS.muted }}>Scanner et valider la toxicité ou compatibilité</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">

        {/* Zone de capture */}
        {!result && (
          <div>
            {!preview ? (
              <div
                {...getRootProps()}
                data-testid="dropzone-product"
                className="relative rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 p-6 text-center"
                style={{
                  height: 290,
                  borderColor: isDragActive ? "#7c3aed" : "rgba(167,139,250,0.2)",
                  background: isDragActive ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                }}
              >
                <input {...getInputProps()} />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
                >
                  <Camera className="w-6 h-6" style={{ color: "#a78bfa" }} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: DS.text }}>
                    {isDragActive ? "Dépose le flacon" : "Soumettre un produit"}
                  </p>
                  <p className="text-[11px] font-medium max-w-[240px] mx-auto leading-normal" style={{ color: DS.muted }}>
                    Prends en photo la liste des ingrédients (INCI) à l'arrière ou l'étiquette avant.
                  </p>
                </div>

                <div className="flex gap-2 w-full max-w-[260px] pt-2">
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider py-3 rounded-full active:scale-95 transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.body }}
                    data-testid="button-upload-product"
                  >
                    <Upload className="w-3.5 h-3.5" /> Galerie
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider py-3 rounded-full active:scale-95 transition-all text-white"
                    style={{ background: "#7c3aed" }}
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
              <div
                className="relative rounded-3xl overflow-hidden p-2"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
              >
                <img src={preview} alt="Produit scanné" className="w-full object-cover rounded-2xl" style={{ maxHeight: 280 }} />
                <button
                  onClick={reset}
                  className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
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
                className="w-full mt-4 py-4 rounded-full text-white text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{ background: "#7c3aed" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "#c4b5fd" }} />
                Lancer le décodage IA
              </motion.button>
            )}

            {/* Loading */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-3xl p-8 flex flex-col items-center gap-4"
                  style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
                >
                  <div className="relative w-12 h-12">
                    <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#7c3aed" }} />
                    <Sparkles className="absolute inset-0 m-auto w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: DS.text }}>Isolement des actifs…</p>
                    <p className="text-[11px] font-medium max-w-[240px] leading-relaxed" style={{ color: DS.muted }}>Vérification de la cytotoxicité et calcul du taux de concordance cutanée.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div
                className="mt-4 rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)" }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f9a8d4" }} />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#f9a8d4" }}>Anomalie diagnostic</p>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: DS.body }}>{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Résultats */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {/* Identité produit */}
              <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <div className="flex gap-4 p-4 items-center">
                  {preview && (
                    <div
                      className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}` }}
                    >
                      <img src={preview} alt="Produit" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    {result.brand && (
                      <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest" style={{ color: DS.muted }}>{result.brand}</span>
                    )}
                    <p className="text-sm font-extrabold leading-tight" style={{ color: DS.text }}>{result.productName}</p>
                    <span
                      className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider"
                      style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }}
                    >
                      {result.category}
                    </span>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  <p className="text-xs font-medium p-3 rounded-xl leading-relaxed" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}`, color: DS.body }}>
                    <span className="font-extrabold" style={{ color: DS.text }}>Verdict :</span> {result.verdict}
                  </p>
                </div>

                {/* Score circles */}
                <div
                  className="grid grid-cols-2 py-4"
                  style={{ borderTop: `1px solid ${DS.border}`, background: "rgba(255,255,255,0.02)" }}
                >
                  <ScoreCircle score={result.matchScore} color={matchColor(result.matchScore)} label="Concordance peau" />
                  <ScoreCircle score={result.safetyScore} color={safetyColor(result.safetyScore)} label="Indice de sécurité" />
                </div>
              </div>

              {/* Molécules clés */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: DS.text }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: "#a78bfa" }} /> Molécules clés détectées
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.mainIngredients.map(ing => (
                    <span
                      key={ing}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.body }}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions cutanées */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: DS.text }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} /> Actions cutanées visées
                </p>
                <div className="space-y-2">
                  {result.benefits.map(b => (
                    <div key={b} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#6ee7b7" }} />
                      <span className="text-xs font-medium leading-normal" style={{ color: DS.body }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avertissements */}
              {result.warnings && result.warnings.length > 0 && result.warnings[0] && (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(233,30,140,0.06)", border: "1px solid rgba(233,30,140,0.18)" }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: "#f9a8d4" }}>
                    <AlertTriangle className="w-4 h-4" /> Facteurs de vigilance / Risques
                  </p>
                  <div className="space-y-1">
                    {result.warnings.map(w => (
                      <p key={w} className="text-xs font-medium leading-relaxed" style={{ color: "#f9a8d4" }}>• {w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommandation */}
              {result.note && (
                <div className="rounded-2xl p-4 space-y-1" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#fbbf24" }}>💡 Recommandation d'usage</p>
                  <p className="text-xs font-medium leading-relaxed" style={{ color: DS.body }}>{result.note}</p>
                </div>
              )}

              {/* Planification */}
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
                    <Calendar className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold" style={{ color: DS.text }}>Planification chrono-soin</h4>
                    <p className="text-[10px] font-medium" style={{ color: DS.muted }}>Automatiser les rappels pour ce produit</p>
                  </div>
                </div>

                {!addedToRoutine ? (
                  <button
                    onClick={handleAddToRoutine}
                    className="w-full py-3.5 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all active:scale-[0.98] text-white"
                    style={{ background: "#7c3aed" }}
                  >
                    Intégrer à mes rappels quotidiens
                  </button>
                ) : (
                  <div
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Produit ajouté à ton calendrier de soins
                  </div>
                )}
              </div>

              {/* Actions bas de page */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  data-testid="button-scan-new"
                  className="flex-1 py-4 rounded-xl text-xs font-extrabold uppercase tracking-wider active:scale-95 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}`, color: DS.body }}
                >
                  Nouveau scan
                </button>
                <button
                  onClick={() => setLocation("/scan-product")}
                  data-testid="button-voir-boutique"
                  className="flex-1 py-4 rounded-xl text-xs font-extrabold uppercase tracking-wider active:scale-95 transition-all text-white"
                  style={{ background: "#7c3aed" }}
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
