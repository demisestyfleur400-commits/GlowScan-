import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trackPageVisit } from "@/lib/analytics";
import { fetchWithRetry } from "@/lib/imageUtils";
import { triggerPWAInstallPrompt } from "@/hooks/use-pwa-install";
import { useSubscription } from "@/hooks/use-subscription";
import { Navbar } from "@/components/Navbar";
import { FileUpload } from "@/components/FileUpload";
import { ResultCard } from "@/components/ResultCard";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ConsentBanner, hasUserConsented } from "@/components/ConsentBanner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Sparkles, Shield, Zap, Lock, ShieldCheck, ChevronRight, HelpCircle, ScanLine } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LOADING_STEPS = [
  { msg: "Réception de la matrice de pixels", icon: "📸", pct: 10 },
  { msg: "Segmentation des zones cutanées faciales", icon: "🔍", pct: 22 },
  { msg: "Analyse topographique des pores et imperfections", icon: "🔬", pct: 36 },
  { msg: "Évaluation clinique de la sévérité", icon: "🩺", pct: 50 },
  { msg: "Calcul de l'indice Glow Score", icon: "✨", pct: 65 },
  { msg: "Corrélation avec les molécules actives", icon: "💊", pct: 78 },
  { msg: "Structuration de l'ordonnance matin & soir", icon: "🌿", pct: 90 },
  { msg: "Finalisation du rapport technique", icon: "💎", pct: 98 },
];

const LOADING_TIPS = [
  "💡 L'hydratation cellulaire continue maintient la pression osmotique cutanée.",
  "🌞 Le rayonnement UV traverse 80% de la couverture nuageuse : le SPF est obligatoire.",
  "🌙 Le pic de régénération cellulaire s'effectue entre 23h et 4h du matin.",
  "💧 Un apport de 1,5L d'eau par jour est requis pour l'homéostasie du film hydrolipidique.",
  "🧴 Les molécules pures comme le Niacinamide stabilisent l'excrétion de sébum sans xérose.",
];

type AnalysisArea = "face" | "body" | "hair";
type AnalysisStep = "select" | "upload" | "questionnaire" | "result" | "anon_limit";

interface Question {
  id: number;
  label: string;
}

interface ConsultationData {
  observations_visuelles: string;
  questions: Question[];
}

export default function Analyze() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const urlParams = new URLSearchParams(window.location.search);
  const preArea = urlParams.get("area");
  
  const [step, setStep] = useState<AnalysisStep>(preArea === "hair" ? "upload" : "select");
  const [selectedArea, setSelectedArea] = useState<AnalysisArea>(preArea === "hair" ? "hair" : preArea === "body" ? "body" : "face");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedScanId, setSavedScanId] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingTip, setLoadingTip] = useState(0);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const pendingImageRef = useRef<string | null>(null);

  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (user && result === null && step !== "result") {
      try {
        const intent = localStorage.getItem("glowscan_after_auth");
        if (intent === "restore") {
          const raw = localStorage.getItem("glowscan_pending_scan");
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved._fullResult) {
              setResult(saved._fullResult);
              setSelectedArea(saved.area || "face");
              setStep("result");
              localStorage.removeItem("glowscan_pending_scan");
            }
          }
        } else {
          localStorage.removeItem("glowscan_pending_scan");
        }
        localStorage.removeItem("glowscan_after_auth");
      } catch {}
    }
  }, [user]);

  useEffect(() => { trackPageVisit("/analyze"); }, []);

  useEffect(() => {
    if (isAnalyzing) {
      setLoadingStep(0);
      setLoadingTip(0);
      let i = 0;
      loadingIntervalRef.current = setInterval(() => {
        i++;
        if (i < LOADING_STEPS.length - 1) setLoadingStep(i);
      }, 2200);
      let t = 0;
      tipIntervalRef.current = setInterval(() => {
        t = (t + 1) % LOADING_TIPS.length;
        setLoadingTip(t);
      }, 4000);
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
    };
  }, [isAnalyzing]);

  const handleAreaSelect = (area: AnalysisArea) => {
    setSelectedArea(area);
    setStep("upload");
  };

  const handleFileSelect = async (base64: string) => {
    if (!base64) return;
    if (!hasUserConsented(user?.id)) {
      pendingImageRef.current = base64;
      setNeedsConsent(true);
      return;
    }
    setUploadedImage(base64);
    setIsAnalyzing(true);

    try {
      const response = await fetchWithRetry("/api/generate-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl: base64 }),
        maxRetries: 2,
        baseDelayMs: 800,
        retryOn5xx: true,
      });

      if (response.status === 401) {
        const errData = await response.json();
        setIsAnalyzing(false);
        if (errData.code === "ANON_QUOTA_EXCEEDED") {
          setStep("anon_limit");
          return;
        }
        window.location.href = "/auth";
        return;
      }

      if (!response.ok) throw new Error("Erreur serveur");

      const data = await response.json() as ConsultationData;
      setConsultationData(data);
      setIsAnalyzing(false);
      setStep("questionnaire");
    } catch (err) {
      setIsAnalyzing(false);
      toast({
        title: "Analyse visuelle impossible",
        description: "Vérifie ta connexion réseau à Douala et réessaie.",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage) return;
    setIsAnalyzing(true);

    try {
      const analyzeRes = await fetchWithRetry("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          image: uploadedImage, 
          area: selectedArea,
          reponses: answers 
        }),
        maxRetries: 2,
        baseDelayMs: 800,
        retryOn5xx: true,
      });

      if (analyzeRes.status === 403) {
        const errData = await analyzeRes.json();
        if (errData.code === "QUOTA_EXCEEDED") {
          setIsAnalyzing(false);
          setShowUpgrade(true);
          setStep("upload");
          return;
        }
      }

      if (!analyzeRes.ok) throw new Error("Erreur diagnostic");

      const data = await analyzeRes.json() as AnalysisResult & { savedScanId?: number; isAnonymous?: boolean };
      setIsAnalyzing(false);
      setResult(data);
      setStep("result");

      try {
        const wasFirst = !localStorage.getItem("glowscan_first_scan_done");
        localStorage.setItem("glowscan_first_scan_done", "1");
        if (wasFirst) setTimeout(() => triggerPWAInstallPrompt(), 2500);
      } catch {}

      if (data.isAnonymous) {
        localStorage.setItem("glowscan_pending_scan", JSON.stringify({
          area: selectedArea,
          condition: data.condition,
          analysis: data.details,
          recommendations: data.recommendations,
          score: data.score,
          motivation: data.motivation,
          _fullResult: data,
        }));
      }

      if (data.savedScanId) setSavedScanId(data.savedScanId);
    } catch (err) {
      setIsAnalyzing(false);
      toast({
        title: "Validation clinique impossible",
        description: "Échec de la corrélation des données.",
        variant: "destructive",
      });
      setStep("questionnaire");
    }
  };

  const handleInputChange = (questionId: number, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const reset = () => {
    setResult(null);
    setSavedScanId(null);
    setConsultationData(null);
    setAnswers({});
    setStep("select");
  };

  const onConsentGiven = () => {
    setNeedsConsent(false);
    if (pendingImageRef.current) {
      const img = pendingImageRef.current;
      pendingImageRef.current = null;
      handleFileSelect(img);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 pt-8">
        <AnimatePresence mode="wait">

          {/* ══════════ SCREEN 0 : IS ANALYZING (LOADING INTERFACE) ══════════ */}
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center px-5 text-white"
              data-testid="screen-analyzing"
            >
              <div className="w-full max-w-xs text-center space-y-6">
                <div className="flex items-center justify-center gap-2">
                  <Badge className="bg-blue-600 text-white border-0 text-[9px] font-black tracking-widest py-1 uppercase animate-pulse">
                    Core AI Diagnostic Active
                  </Badge>
                </div>

                {/* Cadre de Scan Laser Clinique */}
                <div className="relative w-56 h-56 mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 shadow-2xl shadow-blue-500/5">
                  {uploadedImage ? (
                    <img src={uploadedImage} alt="Scanning Process" className="absolute inset-0 w-full h-full object-cover opacity-60" data-testid="img-scanning" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">🔬</div>
                  )}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <motion.div 
                    className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,1)]" 
                    animate={{ top: ["0%", "100%", "0%"] }} 
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }} 
                  />
                </div>

                {/* Stepper Progrès */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black font-mono text-slate-500 uppercase tracking-wider">
                    <span>{LOADING_STEPS[loadingStep].icon} {LOADING_STEPS[loadingStep].msg}</span>
                    <span className="text-blue-400">{LOADING_STEPS[loadingStep].pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <motion.div className="h-full bg-blue-600" animate={{ width: `${LOADING_STEPS[loadingStep].pct}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>

                {/* Conseil Scientifique de Remplacement */}
                <p className="text-xs text-slate-400 leading-relaxed font-medium bg-white/[0.02] border border-white/5 p-3.5 rounded-xl min-h-[64px] flex items-center justify-center">
                  {LOADING_TIPS[loadingTip]}
                </p>
              </div>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 1 : SÉLECTION DE LA ZONE ══════════ */}
          {step === "select" && !isAnalyzing && (
            <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              <div className="text-center">
                <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 block mb-1">Nouveau diagnostic</span>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cible d'analyse</h1>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {([
                  { id: "face", label: "Visage & Teint", desc: "Analyse des pores, sébum, acné et uniformité mélanique", icon: <ScanLine className="w-5 h-5 text-slate-900" /> },
                ] as const).map(area => (
                  <button
                    key={area.id}
                    onClick={() => handleAreaSelect(area.id)}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left flex items-start gap-4 hover:border-slate-900 active:scale-[0.99] transition-all shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
                      {area.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{area.label}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-normal font-medium">{area.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 self-center" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 2 : TELECHARGEMENT DE LA PHOTO ══════════ */}
          {step === "upload" && !isAnalyzing && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("select")} className="w-9 h-9 rounded-xl border border-slate-200/60 bg-white flex items-center justify-center text-slate-700 active:scale-95 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Capture Faciale</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 3 : QUESTIONNAIRE INTERACTIF ══════════ */}
          {step === "questionnaire" && consultationData && !isAnalyzing && (
            <motion.div key="questionnaire" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-900 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-[9px] font-black tracking-widest uppercase">Première observation IA</span>
                </div>
                <p className="text-xs font-semibold text-slate-300 leading-relaxed italic">
                  "{consultationData.observations_visuelles}"
                </p>
              </div>

              <form onSubmit={handleConsultationSubmit} className="space-y-4 bg-white rounded-2xl p-5 border border-slate-200/60 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Affinage clinique requis</span>
                
                {consultationData.questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 leading-normal block">
                      {q.label}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Saisis ta réponse ici..."
                      value={answers[q.id] || ""}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-950 outline-none transition-colors"
                    />
                  </div>
                ))}

                <Button type="submit" variant="premium" className="w-full py-5 text-xs uppercase tracking-widest font-black mt-2">
                  Générer mon Ordonnance Finale
                </Button>
              </form>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 4 : CARTES DES RÉSULTATS FINAUX ══════════ */}
          {step === "result" && result && !isAnalyzing && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <ResultCard result={result} savedScanId={savedScanId} area={selectedArea} />
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 5 : ANONYMOUS QUOTA LIMIT LIMITATION ══════════ */}
          {step === "anon_limit" && !isAnalyzing && (
            <motion.div key="anon_limit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-950 text-white rounded-xl flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Quota anonyme saturé</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Pour sécuriser la sauvegarde de tes métriques et continuer à utiliser nos serveurs d'analyse, la création d'un compte sécurisé est obligatoire.
                </p>
              </div>
              <Button onClick={() => window.location.href = "/auth"} variant="premium" className="w-full py-5 text-xs uppercase tracking-widest font-black">
                Créer mon compte GlowScan
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
      {needsConsent && <ConsentBanner onConsent={onConsentGiven} />}
    </div>
  );
}
