import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSEO } from "@/hooks/useSEO";
import { trackPageVisit } from "@/lib/analytics";
import { fetchWithRetry } from "@/lib/imageUtils";
import { triggerPWAInstallPrompt } from "@/hooks/use-pwa-install";
import { useSubscription } from "@/hooks/use-subscription";
import { Navbar } from "@/components/Navbar";
import { FileUpload } from "@/components/FileUpload";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ConsentBanner, hasUserConsented } from "@/components/ConsentBanner";
import { ToxicAlert } from "@/components/ToxicAlert";
import { PostAnalysisDecision } from "@/components/PostAnalysisDecision";
import { PRODUCT_SUGGESTIONS, detectToxicProducts } from "@/lib/toxic-products";

// ResultCard est énorme (~1900 lignes) — on le charge seulement quand on en a besoin
const ResultCard = lazy(() =>
  import("@/components/ResultCard").then((m) => ({ default: m.ResultCard }))
);
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Lock, ChevronRight, HelpCircle, ScanLine, Scissors } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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
  "L'hydratation cellulaire continue maintient la pression osmotique cutanée.",
  "Le rayonnement UV traverse 80% de la couverture nuageuse : le SPF est obligatoire.",
  "Le pic de régénération cellulaire s'effectue entre 23h et 4h du matin.",
  "Un apport de 1,5L d'eau par jour est requis pour l'homéostasie du film hydrolipidique.",
  "Les molécules pures comme le Niacinamide stabilisent l'excrétion de sébum sans xérose.",
];

type AnalysisArea = "face" | "body" | "hair";
type AnalysisStep = "select" | "upload" | "intake" | "questionnaire" | "result" | "anon_limit";

interface PatientIntake {
  fullName: string;
  phone: string;
  age: string;
  duration: string;
  previousProducts: string;
  allergies: string;
}

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

  useSEO({
    title: "Analyser ma peau gratuitement — Diagnostic IA | GlowScan",
    description: "Faites votre diagnostic peau IA gratuit en 30 secondes. Obtenez votre Glow Score, découvrez votre type de peau et votre routine skincare sur mesure.",
    canonical: "https://glow-scan.com/analyze",
  });
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
  const [showProdSug, setShowProdSug] = useState(false);
  const pendingImageRef = useRef<string | null>(null);

  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // ── Formulaire d'intake patient ────────────────────────────────────────
  const [intake, setIntake] = useState<PatientIntake>({
    fullName: user?.firstName || "",
    phone: "",
    age: "",
    duration: "",
    previousProducts: "",
    allergies: "",
  });
  const updateIntake = (k: keyof PatientIntake, v: string) =>
    setIntake(prev => ({ ...prev, [k]: v }));

  // ── Sauvegarde de l'état du questionnaire dans sessionStorage ──────
  const SESSION_KEY = "glowscan_questionnaire_draft";

  const saveQuestionnaireDraft = (
    data: ConsultationData,
    area: AnalysisArea,
    img: string,
    ans: Record<number, string>
  ) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        consultationData: data,
        selectedArea: area,
        // On ne stocke pas l'image (trop lourde) — on garde une flag
        hasImage: !!img,
        answers: ans,
        savedAt: Date.now(),
      }));
    } catch {}
  };

  const clearQuestionnaireDraft = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

  // ── Restauration après auth ────────────────────────────────────────
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
              clearQuestionnaireDraft();
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

  const handleFileSelect = (base64: string) => {
    if (!base64) return;
    if (!hasUserConsented(user?.id)) {
      pendingImageRef.current = base64;
      setNeedsConsent(true);
      return;
    }
    setUploadedImage(base64);
    // Précharger ResultCard en arrière-plan
    import("@/components/ResultCard").catch(() => {});
    // Aller directement au formulaire patient (plus d'appel generate-consultation)
    setStep("intake");
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage) return;
    // Champ produits utilisés = obligatoire (alimente l'IA + l'alerte produits nocifs)
    if (!intake.previousProducts.trim()) {
      toast({ title: "Champ requis", description: "Indiquez les produits que vous utilisez actuellement (ou écrivez « Aucun »).", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);

    try {
      const analyzeRes = await fetchWithRetry("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          image: uploadedImage,
          area: selectedArea,
          reponses: answers,
          intake: {
            fullName: intake.fullName.trim() || undefined,
            phone: intake.phone.trim() || undefined,
            age: intake.age || undefined,
            duration: intake.duration || undefined,
            previousProducts: intake.previousProducts.trim() || undefined,
            allergies: intake.allergies.trim() || undefined,
          },
        }),
        maxRetries: 2,
        baseDelayMs: 800,
        retryOn5xx: true,
      });

      // Gestion des statuts d'erreur connus
      if (!analyzeRes.ok) {
        let errBody: any = {};
        try { errBody = await analyzeRes.json(); } catch {}

        if (analyzeRes.status === 403 && errBody.code === "QUOTA_EXCEEDED") {
          setIsAnalyzing(false);
          setShowUpgrade(true);
          setStep("upload");
          return;
        }
        if (analyzeRes.status === 401) {
          setIsAnalyzing(false);
          // Sauvegarder les réponses avant de rediriger
          if (consultationData) {
            saveQuestionnaireDraft(consultationData, selectedArea, uploadedImage || "", answers);
          }
          localStorage.setItem("glowscan_after_auth", "restore_questionnaire");
          toast({
            title: "Session expirée",
            description: "Connecte-toi pour continuer — tes réponses sont sauvegardées.",
          });
          setTimeout(() => { window.location.href = "/auth"; }, 1500);
          return;
        }
        if (analyzeRes.status === 422 && errBody.code === "AI_REFUSED") {
          setIsAnalyzing(false);
          toast({
            title: "Photo difficile à analyser",
            description: errBody.message || "Essaie avec une photo plus nette, bien éclairée et de face.",
            variant: "destructive",
          });
          setStep("upload");
          return;
        }
        if (analyzeRes.status === 503 && errBody.code === "AI_UNAVAILABLE") {
          setIsAnalyzing(false);
          toast({
            title: "Erreur de connexion — réessayez",
            description: errBody.detail
              ? `Service IA indisponible. Détail : ${errBody.detail}`
              : "Le service IA est momentanément indisponible. Reprends une photo et relance l'analyse.",
            variant: "destructive",
          });
          setStep("upload");
          return;
        }
        // Erreur inattendue → retour photo
        setIsAnalyzing(false);
        toast({
          title: "Erreur de connexion — réessayez",
          description: errBody.message || "Une erreur s'est produite. Reprends une photo et réessaie.",
          variant: "destructive",
        });
        setStep("upload");
        return;
      }

      const data = await analyzeRes.json() as AnalysisResult & { savedScanId?: number; isAnonymous?: boolean; _fallback?: boolean };
      setIsAnalyzing(false);
      setResult(data);
      setStep("result");
      clearQuestionnaireDraft();

      // _fallback supprimé — le serveur renvoie désormais une erreur 503 claire

      // Meta Pixel — analyse complétée
      try {
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "ViewContent", {
            content_name: "Analyse peau GlowScan",
            content_category: selectedArea ?? "visage",
            value: data.glowScore ?? 0,
            currency: "XAF",
          });
        }
      } catch {}

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
    } catch (err: any) {
      setIsAnalyzing(false);
      toast({
        title: "Analyse temporairement indisponible",
        description: err?.message || "Réessaie dans quelques secondes.",
        variant: "destructive",
      });
      setStep("intake");
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
    setUploadedImage(null);
    setIntake({ fullName: user?.firstName || "", phone: "", age: "", duration: "", previousProducts: "", allergies: "" });
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
    <div
      className="min-h-screen pb-24"
      style={{
        background: "#fbfdfb",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <Navbar />

      <main className="max-w-xl mx-auto px-4 pt-8">
        <AnimatePresence mode="wait">

          {/* ══════════ LOADING SCREEN ══════════ */}
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5"
              style={{ background: "#fbfdfb" }}
              data-testid="screen-analyzing"
            >
              {/* Ambient glow */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(47,158,110,0.15), transparent)" }}
                />
              </div>

              <div className="w-full max-w-xs text-center space-y-6 relative z-10">
                {/* Status badge */}
                <div className="flex items-center justify-center">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide animate-pulse"
                    style={{
                      background: "rgba(47,158,110,0.15)",
                      border: "1px solid rgba(47,158,110,0.3)",
                      color: "#c4b5fd",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#a78bfa" }} />
                    Diagnostic en cours
                  </div>
                </div>

                {/* Scan frame */}
                <div
                  className="relative w-56 h-56 mx-auto rounded-2xl overflow-hidden"
                  style={{
                    border: "1px solid rgba(47,158,110,0.25)",
                    background: "rgba(14,11,26,1)",
                  }}
                >
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Scanning"
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                      data-testid="img-scanning"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">🔬</div>
                  )}
                  {/* Grid overlay */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: "linear-gradient(rgba(47,158,110,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(47,158,110,0.6) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  {/* Scan line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5"
                    style={{ background: "linear-gradient(90deg, transparent, #a78bfa, transparent)" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                  />
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div
                    className="flex justify-between text-[10px] font-medium"
                    style={{ color: "#4a5a52" }}
                  >
                    <span>{LOADING_STEPS[loadingStep].icon} {LOADING_STEPS[loadingStep].msg}</span>
                    <span style={{ color: "#c4b5fd" }}>{LOADING_STEPS[loadingStep].pct}%</span>
                  </div>
                  <div
                    className="w-full h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.06)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #2f9e6e, #a78bfa)" }}
                      animate={{ width: `${LOADING_STEPS[loadingStep].pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                {/* Tip */}
                <p
                  className="text-xs leading-relaxed font-medium p-4 rounded-2xl min-h-[64px] flex items-center justify-center"
                  style={{
                    color: "#4a5a52",
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  {LOADING_TIPS[loadingTip]}
                </p>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 1 : AREA SELECTION ══════════ */}
          {step === "select" && !isAnalyzing && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Ambient glow */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(47,158,110,0.15), transparent)" }}
                />
              </div>

              <div className="text-center pt-4 relative z-10">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wide mb-4"
                  style={{
                    background: "rgba(47,158,110,0.15)",
                    border: "1px solid rgba(47,158,110,0.3)",
                    color: "#c4b5fd",
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  Nouveau diagnostic
                </div>
                <h1 className="text-xl font-bold" style={{ color: "#1f2a26" }}>
                  Que veux-tu analyser ?
                </h1>
                <p className="text-xs mt-1" style={{ color: "rgba(0,0,0,0.35)" }}>
                  Choisis une zone pour commencer
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 relative z-10">
                {([
                  {
                    id: "face" as AnalysisArea,
                    label: "Visage et teint",
                    desc: "Analyse des pores, sébum, acné, taches et uniformité mélanique",
                    icon: <ScanLine className="w-5 h-5" style={{ color: "#a78bfa" }} />,
                  },
                  {
                    id: "hair" as AnalysisArea,
                    label: "Cheveux et cuir chevelu",
                    desc: "Analyse capillaire : chute, pellicules, sécheresse, densité et santé du cuir chevelu",
                    icon: <Scissors className="w-5 h-5" style={{ color: "#f9a8d4" }} />,
                  },
                ] as { id: AnalysisArea; label: string; desc: string; icon: React.ReactNode }[]).map(area => (
                  <button
                    key={area.id}
                    onClick={() => handleAreaSelect(area.id)}
                    className="rounded-2xl p-5 text-left flex items-start gap-4 transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(47,158,110,0.06)",
                      border: "1px solid rgba(47,158,110,0.18)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(47,158,110,0.15)",
                        border: "1px solid rgba(47,158,110,0.25)",
                      }}
                    >
                      {area.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold" style={{ color: "#1f2a26" }}>
                        {area.label}
                      </h3>
                      <p className="text-xs mt-0.5 leading-normal" style={{ color: "#4a5a52" }}>
                        {area.desc}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 self-center" style={{ color: "rgba(0,0,0,0.25)" }} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 2 : PHOTO UPLOAD ══════════ */}
          {step === "upload" && !isAnalyzing && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep("select")}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.07)",
                    color: "#4a5a52",
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold" style={{ color: "#1f2a26" }}>
                  {selectedArea === "hair" ? "Photo du cuir chevelu" : "Capture faciale"}
                </span>
              </div>

              {/* ── Guidage photo ── */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.2)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5">📸</span>
                  <div>
                    <p className="text-xs font-bold mb-1.5" style={{ color: "#fbbf24" }}>
                      Pour une analyse précise, ta photo doit :
                    </p>
                    <ul className="space-y-1">
                      {(selectedArea === "hair"
                        ? [
                            "Montrer clairement le cuir chevelu ou la longueur des cheveux",
                            "Être prise dans une bonne lumière naturelle",
                            "Être nette — pas floue ni trop sombre",
                          ]
                        : [
                            "Être un selfie bien éclairé, visage centré et de face",
                            "Montrer ton visage de près (pas en plein pied)",
                            "Être nette — pas floue, pas de filtre",
                          ]
                      ).map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "rgba(251,191,36,0.85)" }}>
                          <span className="mt-px">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] mt-2 font-medium" style={{ color: "rgba(0,0,0,0.35)" }}>
                      Une photo floue ou trop éloignée empêche l'analyse — l'IA a besoin de voir ta peau clairement.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.07)",
                }}
              >
                {/* autoStart=true : la caméra démarre seulement quand cette section est montée */}
                <FileUpload onFileSelect={handleFileSelect} autoStart={true} />
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 3 : FORMULAIRE PATIENT ══════════ */}
          {step === "intake" && !isAnalyzing && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep("upload")}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", color: "#4a5a52" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1f2a26" }}>Votre dossier de consultation</p>
                  <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Pour personnaliser votre diagnostic</p>
                </div>
              </div>

              {/* Aperçu photo */}
              {uploadedImage && (
                <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(47,158,110,0.06)", border: "1px solid rgba(47,158,110,0.18)" }}>
                  <img src={uploadedImage} alt="Photo" className="w-12 h-12 rounded-xl object-cover border-2" style={{ borderColor: "#2f9e6e" }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>Photo reçue ✓</p>
                    <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Analyse prête — complète le dossier</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleIntakeSubmit} className="space-y-3">
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(0,0,0,0.35)" }}>
                    Informations personnelles
                  </p>

                  {/* Nom et Prénom */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      👤 Nom et Prénom <span style={{ color: "rgba(0,0,0,0.35)", fontWeight: 400 }}>(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex : Aminata Diallo"
                      value={intake.fullName}
                      onChange={e => updateIntake("fullName", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors"
                      style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "10px", color: "#1f2a26" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(47,158,110,0.5)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(47,158,110,0.2)")}
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      📞 Numéro de téléphone <span style={{ color: "rgba(0,0,0,0.35)", fontWeight: 400 }}>(optionnel)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex : +237 6XX XXX XXX"
                      value={intake.phone}
                      onChange={e => updateIntake("phone", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors"
                      style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "10px", color: "#1f2a26" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(47,158,110,0.5)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(47,158,110,0.2)")}
                    />
                  </div>

                  {/* Âge */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      ⏳ Âge <span style={{ color: "#2f9e6e" }}>*</span>
                    </label>
                    <select
                      required
                      value={intake.age}
                      onChange={e => updateIntake("age", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors"
                      style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "10px", color: intake.age ? "#1f2a26" : "rgba(0,0,0,0.35)" }}
                    >
                      <option value="" disabled>Sélectionne ton âge</option>
                      <option value="moins de 15 ans">Moins de 15 ans</option>
                      <option value="15-19 ans">15 – 19 ans</option>
                      <option value="20-25 ans">20 – 25 ans</option>
                      <option value="26-30 ans">26 – 30 ans</option>
                      <option value="31-40 ans">31 – 40 ans</option>
                      <option value="41-50 ans">41 – 50 ans</option>
                      <option value="plus de 50 ans">Plus de 50 ans</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(0,0,0,0.35)" }}>
                    Antécédents et symptômes
                  </p>

                  {/* Durée du problème */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      🩺 Depuis combien de temps avez-vous ce problème ? <span style={{ color: "#2f9e6e" }}>*</span>
                    </label>
                    <select
                      required
                      value={intake.duration}
                      onChange={e => updateIntake("duration", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors"
                      style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "10px", color: intake.duration ? "#1f2a26" : "rgba(0,0,0,0.35)" }}
                    >
                      <option value="" disabled>Sélectionne la durée</option>
                      <option value="quelques jours">Quelques jours (moins d'une semaine)</option>
                      <option value="quelques semaines (1-3 semaines)">Quelques semaines (1 – 3 sem.)</option>
                      <option value="1 à 3 mois">1 à 3 mois</option>
                      <option value="3 à 6 mois">3 à 6 mois</option>
                      <option value="plus de 6 mois">Plus de 6 mois</option>
                      <option value="plus d'un an">Plus d'un an (problème chronique)</option>
                      <option value="depuis toujours (peau naturellement ainsi)">Depuis toujours</option>
                    </select>
                  </div>

                  {/* Produits utilisés — OBLIGATOIRE (alimente l'IA + alerte produits nocifs) */}
                  <div style={{ position: "relative" }}>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      🛍️ Quels produits utilisez-vous actuellement sur votre peau ? <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <textarea
                      placeholder="Ex : Nivea, CeraVe, savon noir, crème de ma tante... (ou « Aucun »)"
                      value={intake.previousProducts}
                      onChange={e => { updateIntake("previousProducts", e.target.value); setShowProdSug(true); }}
                      onFocus={e => { setShowProdSug(true); e.target.style.borderColor = "rgba(47,158,110,0.5)"; }}
                      onBlur={e => { setTimeout(() => setShowProdSug(false), 150); e.target.style.borderColor = "rgba(47,158,110,0.2)"; }}
                      rows={2}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors resize-none"
                      style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "10px", color: "#1f2a26" }}
                    />
                    {/* Suggestions d'auto-complétion */}
                    {showProdSug && (() => {
                      const q = intake.previousProducts.toLowerCase();
                      const last = q.split(/[,;]/).pop()?.trim() || "";
                      const list = PRODUCT_SUGGESTIONS.filter(s => !last || s.toLowerCase().includes(last));
                      if (list.length === 0) return null;
                      return (
                        <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
                          {list.map(s => (
                            <button
                              key={s} type="button"
                              onMouseDown={(e) => { e.preventDefault(); updateIntake("previousProducts", s === "Aucun produit actuellement" ? "Aucun" : s); setShowProdSug(false); }}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12.5, color: "#1f2a26" }}
                              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(47,158,110,0.08)")}
                              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {/* Alerte en direct si produit nocif tapé */}
                    {detectToxicProducts(intake.previousProducts).length > 0 && (
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginTop: 6 }}>
                        ⚠️ Produit à risque détecté — une alerte détaillée s'affichera avec ton résultat.
                      </p>
                    )}
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      ⚠️ Avez-vous des allergies cutanées connues ?
                    </label>
                    <input
                      type="text"
                      placeholder="Ex : Allergie au parfum, à la lanoline... (ou écris 'Aucune')"
                      value={intake.allergies}
                      onChange={e => updateIntake("allergies", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors"
                      style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "10px", color: "#1f2a26" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(47,158,110,0.5)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(47,158,110,0.2)")}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 text-sm font-extrabold transition-all active:scale-[0.98] relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #2f9e6e, #f43f5e)", borderRadius: "14px", color: "#fff" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)", borderRadius: "14px 14px 0 0" }} />
                  <span className="relative z-10">✦ Lancer mon analyse GlowScan</span>
                </button>

                <p className="text-center text-[10px]" style={{ color: "rgba(0,0,0,0.25)" }}>
                  Tes données restent privées · Analyse en 30 secondes
                </p>
              </form>
            </motion.div>
          )}

          {/* ══════════ STEP 3 : QUESTIONNAIRE (legacy) ══════════ */}
          {step === "questionnaire" && consultationData && !isAnalyzing && (
            <motion.div
              key="questionnaire"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* AI observation card */}
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: "rgba(47,158,110,0.06)",
                  border: "1px solid rgba(47,158,110,0.18)",
                }}
              >
                <div
                  className="pointer-events-none absolute top-0 right-0 w-32 h-32 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(47,158,110,0.15), transparent)" }}
                />
                <div className="flex items-center gap-2 mb-2" style={{ color: "#a78bfa" }}>
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wide">Première observation IA</span>
                </div>
                <p className="text-xs font-medium leading-relaxed italic" style={{ color: "#4a5a52" }}>
                  "{consultationData.observations_visuelles}"
                </p>
              </div>

              {/* Question form */}
              <form
                onSubmit={handleConsultationSubmit}
                className="space-y-4 rounded-2xl p-5"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.07)",
                }}
              >
                <span
                  className="text-[10px] font-bold tracking-wide block mb-1"
                  style={{ color: "rgba(0,0,0,0.35)" }}
                >
                  Quelques questions pour affiner le diagnostic
                </span>

                {consultationData.questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-xs font-bold leading-normal block" style={{ color: "#1f2a26" }}>
                      {q.label}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Saisis ta réponse ici..."
                      value={answers[q.id] || ""}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium outline-none transition-colors"
                      style={{
                        background: "#ffffff",
                        border: "1px solid rgba(47,158,110,0.2)",
                        borderRadius: "12px",
                        color: "#1f2a26",
                      }}
                      onFocus={e => (e.target.style.borderColor = "rgba(47,158,110,0.5)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(47,158,110,0.2)")}
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  className="w-full py-3.5 text-sm font-bold mt-2 transition-all active:scale-[0.98]"
                  style={{
                    background: "#2f9e6e",
                    borderRadius: "9999px",
                    color: "#fff",
                  }}
                >
                  Générer mon ordonnance finale
                </button>
              </form>
            </motion.div>
          )}

          {/* ══════════ STEP 4 : RESULTS ══════════ */}
          {step === "result" && result && !isAnalyzing && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* ⚠️ Alerte produits nocifs — en haut du résultat, additionnelle */}
              <ToxicAlert products={detectToxicProducts(intake.previousProducts)} />
              {/* Bandeau de décision post-analyse (« et maintenant ? ») */}
              <PostAnalysisDecision score={result.score} severity={(result as any).severity} redFlags={(result as any).redFlags} isLoggedIn={!!user} />
              <div id="gs-analysis" />
              <Suspense fallback={
                <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                  <div style={{ width: "32px", height: "32px", border: "3px solid rgba(47,158,110,0.3)", borderTopColor: "#a78bfa", borderRadius: "9999px", animation: "spin 0.8s linear infinite" }} />
                </div>
              }>
                <ResultCard
                  result={result}
                  savedScanId={savedScanId}
                  area={selectedArea}
                  imageUrl={uploadedImage}
                  userFirstName={intake.fullName || user?.firstName || null}
                  patientIntake={{
                    fullName: intake.fullName || user?.firstName || undefined,
                    phone: intake.phone || undefined,
                    age: intake.age || undefined,
                    duration: intake.duration || undefined,
                    previousProducts: intake.previousProducts || undefined,
                    allergies: intake.allergies || undefined,
                  }}
                />
              </Suspense>
            </motion.div>
          )}

          {/* ══════════ STEP 5 : ANONYMOUS QUOTA LIMIT ══════════ */}
          {step === "anon_limit" && !isAnalyzing && (
            <motion.div
              key="anon_limit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 text-center space-y-5"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.07)",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{
                  background: "rgba(47,158,110,0.12)",
                  border: "1px solid rgba(47,158,110,0.25)",
                }}
              >
                <Lock className="w-6 h-6" style={{ color: "#a78bfa" }} />
              </div>

              <div>
                <h3 className="text-base font-bold" style={{ color: "#1f2a26" }}>
                  Garde ta peau en mémoire
                </h3>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: "#4a5a52" }}>
                  Crée ton compte gratuit pour sauvegarder tes analyses, suivre l'évolution de ta peau et accéder à ton historique à tout moment.
                </p>
              </div>

              <button
                onClick={() => (window.location.href = "/auth")}
                className="w-full py-3.5 text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  background: "#2f9e6e",
                  borderRadius: "9999px",
                  color: "#fff",
                }}
              >
                Créer mon compte — c'est gratuit
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
      {needsConsent && <ConsentBanner onAccept={onConsentGiven} userId={user?.id?.toString()} />}
    </div>
  );
}
