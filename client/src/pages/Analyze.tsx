import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trackPageVisit } from "@/lib/analytics";
import { fetchWithRetry } from "@/lib/imageUtils";
import { triggerPWAInstallPrompt } from "@/hooks/use-pwa-install";
import { useAnalyze } from "@/hooks/use-scans";
import { useSubscription } from "@/hooks/use-subscription";
import { Navbar } from "@/components/Navbar";
import { FileUpload } from "@/components/FileUpload";
import { ResultCard } from "@/components/ResultCard";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ConsentBanner, hasUserConsented } from "@/components/ConsentBanner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Sparkles, Droplets, Scissors, Crown, Zap, Lock, ShieldCheck, ChevronRight } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const LOADING_STEPS = [
  { msg: "Réception de ta photo", icon: "📸", pct: 10 },
  { msg: "Détection du type de peau", icon: "🔍", pct: 22 },
  { msg: "Analyse des pores et imperfections", icon: "🔬", pct: 36 },
  { msg: "Évaluation de la sévérité", icon: "🩺", pct: 50 },
  { msg: "Calcul de ton Glow Score", icon: "✨", pct: 65 },
  { msg: "Sélection des meilleurs produits", icon: "💊", pct: 78 },
  { msg: "Préparation de ta routine", icon: "🌿", pct: 90 },
  { msg: "Finalisation", icon: "💎", pct: 98 },
];

const LOADING_TIPS = [
  "💡 Une bonne hydratation = ton Glow Score grimpe vite",
  "🌞 La protection solaire prévient 80 % des taches sombres",
  "🌙 Le sommeil régénère ta peau pendant 6 à 8 heures",
  "💧 Boire 1,5 L d'eau par jour booste ton éclat naturel",
  "🥑 L'avocat et la patate douce nourrissent la peau de l'intérieur",
  "🧴 Les actifs doux (acide hyaluronique, niacinamide) sont tes alliés",
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
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isPremium, scansThisMonth, scansRemaining, scansLimit } = useSubscription();
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

  // NOUVEAUX ÉTATS POUR LA CONSULTATION INTERACTIVE
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

  useEffect(() => {
    trackPageVisit("/analyze");
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      setLoadingStep(0);
      setLoadingTip(0);
      let i = 0;
      loadingIntervalRef.current = setInterval(() => {
        i++;
        if (i < LOADING_STEPS.length - 1) setLoadingStep(i);
      }, 2000);
      let t = 0;
      tipIntervalRef.current = setInterval(() => {
        t = (t + 1) % LOADING_TIPS.length;
        setLoadingTip(t);
      }, 3500);
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

  // ÉTAPE 1 : ENVOI DE LA PHOTO ET RÉCEPTION DES QUESTIONS SUR MESURE
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
      // On appelle la nouvelle route backend que nous avons créée
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

      if (!response.ok) {
        throw new Error("Erreur de génération des questions");
      }

      const data = await response.json() as ConsultationData;
      setConsultationData(data);
      setIsAnalyzing(false);
      setStep("questionnaire"); // On passe à l'affichage des questions !

    } catch (err) {
      setIsAnalyzing(false);
      toast({
        title: "Analyse visuelle impossible",
        description: "Une erreur est survenue. Vérifie ton réseau et réessaie.",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  // ÉTAPE 2 : ENVOI DES RÉPONSES POUR OBTENIR LE DIAGNOSTIC FINAL
  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage) return;
    setIsAnalyzing(true);

    try {
      // On appelle ton ancienne route de diagnostic en lui transmettant l'image et les réponses
      const analyzeRes = await fetchWithRetry("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          image: uploadedImage, 
          area: selectedArea,
          reponses: answers // Transmis au serveur pour affiner le diagnostic
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

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.message || `${analyzeRes.status}`);
      }

      const data = await analyzeRes.json() as AnalysisResult & { savedScanId?: number; isAnonymous?: boolean };
      setIsAnalyzing(false);
      setResult(data);
      setStep("result");

      try {
        const wasFirst = !localStorage.getItem("glowscan_first_scan_done");
        localStorage.setItem("glowscan_first_scan_done", "1");
        if (wasFirst) {
          setTimeout(() => triggerPWAInstallPrompt(), 2500);
        }
      } catch {}

      if (data.isAnonymous) {
        try {
          localStorage.setItem("glowscan_pending_scan", JSON.stringify({
            area: selectedArea,
            condition: data.condition,
            analysis: data.details,
            recommendations: data.recommendations,
            score: data.score,
            motivation: data.motivation,
            _fullResult: data,
          }));
        } catch {}
      }

      if (data.savedScanId) {
        setSavedScanId(data.savedScanId);
      }
    } catch (err) {
      setIsAnalyzing(false);
      toast({
        title: "Diagnostic impossible",
        description: "Une erreur est survenue lors de la validation clinique.",
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

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">

          {/* LOADING SCREEN */}
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gradient-to-br from-[#1a0b2e] via-[#0f0a1f] to-[#2a0f3e] flex items-center justify-center px-4 py-8 overflow-y-auto"
              data-testid="screen-analyzing"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-pink-400/40 rounded-full"
                    style={{ left: `${(i * 53) % 100}%`, top: `${(i * 31) % 100}%` }}
                    animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>

              <div className="relative w-full max-w-sm mx-auto">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 mb-6">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-xs font-bold text-white tracking-wider uppercase">IA Active</span>
                  </div>
                </motion.div>

                <div className="relative w-64 h-64 mx-auto mb-8 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.4)] border-2 border-white/20">
                  {uploadedImage ? (
                    <img src={uploadedImage} alt="Analyse en cours" className="absolute inset-0 w-full h-full object-cover" data-testid="img-scanning" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 to-violet-900/40 flex items-center justify-center">
                      <span className="text-6xl">🔬</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(236,72,153,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.4) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                        <motion.div 
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_20px_rgba(236,72,153,0.9)]" 
        animate={{ top: ["0%", "100%", "0%"] }} 
        transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }} 
      />
    </div>
  );
}

