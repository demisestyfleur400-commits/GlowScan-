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
type AnalysisStep = "select" | "upload" | "result" | "anon_limit";

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
  // RGPD : consentement requis avant le 1er scan (mention OpenAI USA, etc.)
  const [needsConsent, setNeedsConsent] = useState(false);
  const pendingImageRef = useRef<string | null>(null);

  // Restaurer le scan en attente après connexion (seulement si l'utilisateur voulait sauvegarder)
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
          // Venu pour faire un NOUVEAU scan → on nettoie et on reste sur "select"
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

  const analyzeMutation = useAnalyze();

  const handleAreaSelect = (area: AnalysisArea) => {
    setSelectedArea(area);
    setStep("upload");
  };

  const handleFileSelect = async (base64: string) => {
    if (!base64) return;
    // RGPD : si l'utilisateur n'a pas encore consenti, on garde la photo en attente
    // et on affiche le bandeau de consentement avant tout envoi à l'API.
    if (!hasUserConsented(user?.id)) {
      pendingImageRef.current = base64;
      setNeedsConsent(true);
      return;
    }
    setUploadedImage(base64);
    setIsAnalyzing(true);

    try {
      // Appel avec retry automatique (réseaux 3G/4G instables au Cameroun) :
      // - 2 retries max avec backoff exponentiel (0.8s, 1.6s)
      // - retry sur erreurs réseau (TypeError) et 5xx
      // - PAS de retry sur 401/403/422 (erreurs métier renvoyées telles quelles)
      const analyzeRes = await fetchWithRetry("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: base64, area: selectedArea }),
        maxRetries: 2,
        baseDelayMs: 800,
        retryOn5xx: true,
      });

      if (analyzeRes.status === 401) {
        const errData = await analyzeRes.json();
        setIsAnalyzing(false);
        if (errData.code === "ANON_QUOTA_EXCEEDED") {
          // A déjà fait son analyse gratuite → invitation à créer un compte
          setStep("anon_limit");
          return;
        }
        window.location.href = "/auth";
        return;
      }

      if (analyzeRes.status === 403) {
        const errData = await analyzeRes.json();
        if (errData.code === "QUOTA_EXCEEDED") {
          setIsAnalyzing(false);
          setShowUpgrade(true);
          setStep("upload");
          return;
        }
      }

      if (analyzeRes.status === 422) {
        const errData = await analyzeRes.json().catch(() => ({}));
        setIsAnalyzing(false);
        toast({
          title: "Photo non analysable",
          description: errData.message || "Essaie avec une photo plus nette, bien éclairée, où la zone est bien visible.",
          variant: "destructive",
        });
        setStep("upload");
        return;
      }

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.message || `${analyzeRes.status}`);
      }

      const data = await analyzeRes.json() as AnalysisResult & { savedScanId?: number; isAnonymous?: boolean };
      setIsAnalyzing(false);
      setResult(data);
      setStep("result");
      // Marquer le 1er scan + proposer l'installation de l'appli sur le home.
      // On laisse 2.5 s pour que l'utilisateur découvre son résultat avant.
      try {
        const wasFirst = !localStorage.getItem("glowscan_first_scan_done");
        localStorage.setItem("glowscan_first_scan_done", "1");
        if (wasFirst) {
          setTimeout(() => triggerPWAInstallPrompt(), 2500);
        }
      } catch {}

      // Si analyse anonyme → stocker le résultat COMPLET dans localStorage pour récupération après inscription
      if (data.isAnonymous) {
        try {
          localStorage.setItem("glowscan_pending_scan", JSON.stringify({
            area: selectedArea,
            condition: data.condition,
            analysis: data.details,
            recommendations: data.recommendations,
            score: data.score,
            motivation: data.motivation,
            _fullResult: data, // résultat complet pour restauration
          }));
        } catch {}
      }

      // Le scan est déjà sauvegardé côté serveur — on récupère juste l'ID
      if (data.savedScanId) {
        setSavedScanId(data.savedScanId);
      }

      // Récompense de parrainage (une seule fois, non bloquant)
      const referralCode = localStorage.getItem("glowscan_referral");
      if (referralCode && user) {
        fetch("/api/referral/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: referralCode }),
        }).then(resp => {
          if (resp.ok || resp.status === 409) localStorage.removeItem("glowscan_referral");
          if (resp.ok) toast({ title: "Bienvenue dans GlowScan !", description: "Tu as reçu 10 pts de bienvenue grâce au parrainage ✨" });
        }).catch(() => {});
      }
    } catch (err) {
      setIsAnalyzing(false);
      toast({
        title: "Analyse impossible",
        description: "Une erreur est survenue. Vérifie ta connexion et réessaie.",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  const reset = () => {
    setResult(null);
    setSavedScanId(null);
    setStep("select");
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">

          {/* LOADING SCREEN — refonte stylée avec photo scannée */}
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gradient-to-br from-[#1a0b2e] via-[#0f0a1f] to-[#2a0f3e] flex items-center justify-center px-4 py-8 overflow-y-auto"
              data-testid="screen-analyzing"
            >
              {/* Particules flottantes en fond */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-pink-400/40 rounded-full"
                    style={{ left: `${(i * 53) % 100}%`, top: `${(i * 31) % 100}%` }}
                    animate={{
                      y: [0, -30, 0],
                      opacity: [0.2, 0.8, 0.2],
                    }}
                    transition={{
                      duration: 3 + (i % 3),
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>

              <div className="relative w-full max-w-sm mx-auto">
                {/* Badge Glow */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 mb-6"
                >
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-2 h-2 bg-emerald-400 rounded-full"
                    />
                    <span className="text-xs font-bold text-white tracking-wider uppercase">IA Active</span>
                  </div>
                </motion.div>

                {/* Photo scannée avec laser */}
                <div className="relative w-64 h-64 mx-auto mb-8 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.4)] border-2 border-white/20">
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Analyse en cours"
                      className="absolute inset-0 w-full h-full object-cover"
                      data-testid="img-scanning"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 to-violet-900/40 flex items-center justify-center">
                      <span className="text-6xl">🔬</span>
                    </div>
                  )}

                  {/* Overlay sombre subtil */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />

                  {/* Grille de scan */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(236,72,153,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.4) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />

                  {/* Ligne laser qui scanne haut→bas */}
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_20px_rgba(236,72,153,0.9)]"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Cibles d'analyse qui pulsent */}
                  {[
                    { top: "22%", left: "30%", delay: 0 },
                    { top: "55%", left: "65%", delay: 0.6 },
                    { top: "70%", left: "28%", delay: 1.2 },
                    { top: "35%", left: "70%", delay: 1.8 },
                  ].map((dot, idx) => (
                    <motion.div
                      key={idx}
                      className="absolute w-3 h-3 -ml-1.5 -mt-1.5"
                      style={{ top: dot.top, left: dot.left }}
                      animate={{ scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: dot.delay }}
                    >
                      <div className="absolute inset-0 rounded-full bg-pink-400/40" />
                      <div className="absolute inset-1 rounded-full bg-pink-300" />
                    </motion.div>
                  ))}

                  {/* Coins de cadre style camera */}
                  {[
                    "top-2 left-2 border-t-2 border-l-2 rounded-tl-xl",
                    "top-2 right-2 border-t-2 border-r-2 rounded-tr-xl",
                    "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-xl",
                    "bottom-2 right-2 border-b-2 border-r-2 rounded-br-xl",
                  ].map((cls, idx) => (
                    <div key={idx} className={`absolute w-6 h-6 border-pink-300 ${cls}`} />
                  ))}
                </div>

                {/* Étape en cours */}
                <div className="text-center mb-6 min-h-[60px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={loadingStep}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <span className="text-2xl">{LOADING_STEPS[loadingStep].icon}</span>
                      <p className="text-base font-bold text-white" data-testid="text-loading-step">
                        {LOADING_STEPS[loadingStep].msg}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                  <p className="text-xs text-pink-200/70 mt-2 font-mono tracking-wider">
                    {String(LOADING_STEPS[loadingStep].pct).padStart(2, "0")} % — étape {loadingStep + 1}/{LOADING_STEPS.length}
                  </p>
                </div>

                {/* Barre de progression glassy */}
                <div className="relative w-full bg-white/10 backdrop-blur-sm rounded-full h-3 overflow-hidden mb-6 border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-violet-500 rounded-full relative overflow-hidden"
                    animate={{ width: `${LOADING_STEPS[loadingStep].pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </div>

                {/* Tip rotatif */}
                <motion.div
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4 min-h-[64px] flex items-center"
                >
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingTip}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.4 }}
                      className="text-sm text-white/90 leading-relaxed text-center w-full"
                      data-testid="text-loading-tip"
                    >
                      {LOADING_TIPS[loadingTip]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>

                {/* Footer trust */}
                <p className="text-[11px] text-white/50 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Ta photo est traitée de façon sécurisée et confidentielle
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Select Area */}
          {!isAnalyzing && step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              {/* Titre */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-full px-4 py-1.5 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-xs font-bold text-pink-700">Étape 1 sur 2</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Quelle zone veux-tu analyser ?</h1>
                <p className="text-sm text-gray-400">Choisis une zone ci-dessous — l'IA t'aidera en 10 secondes</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "face",
                    emoji: "😊",
                    label: "Visage",
                    tagline: "Le plus populaire",
                    desc: "Acné, boutons, taches sombres, rides, pores, excès de sébum...",
                    tags: ["Acné", "Taches", "Rides", "Pores"],
                    color: "from-rose-50 to-pink-50",
                    border: "border-rose-100",
                    badge: "bg-rose-100 text-rose-600",
                  },
                  {
                    id: "body",
                    emoji: "🧍",
                    label: "Corps",
                    tagline: "Peau du corps",
                    desc: "Eczéma, sécheresse, éruptions, taches, vergetures, irritations...",
                    tags: ["Eczéma", "Sécheresse", "Irritations"],
                    color: "from-pink-50 to-emerald-50",
                    border: "border-pink-100",
                    badge: "bg-pink-100 text-pink-600",
                  },
                  {
                    id: "hair",
                    emoji: "👩‍🦱",
                    label: "Cheveux",
                    tagline: "Cuir chevelu & cheveux",
                    desc: "Pellicules, chute, sécheresse, excès de sébum, cassure, frisottis...",
                    tags: ["Pellicules", "Chute", "Frisottis"],
                    color: "from-violet-50 to-purple-50",
                    border: "border-violet-100",
                    badge: "bg-violet-100 text-violet-600",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAreaSelect(item.id as AnalysisArea)}
                    data-testid={`button-area-${item.id}`}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r ${item.color} border ${item.border} active:scale-[0.98] transition-all text-left shadow-sm`}
                  >
                    <span className="text-4xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base font-black text-gray-900">{item.label}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.badge}`}>{item.tagline}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">{item.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-bold bg-white/70 text-gray-600 px-2 py-0.5 rounded-full border border-white">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-2" />
                  </button>
                ))}
              </div>

              <p className="mt-6 text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
                Ta photo est analysée puis supprimée immédiatement — jamais stockée
              </p>
            </motion.div>
          )}

          {/* STEP 2: Upload */}
          {!isAnalyzing && step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <button
                onClick={() => setStep("select")}
                data-testid="button-back"
                className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la sélection
              </button>

              {/* Bandeau gratuité — analyses illimitées pour tous */}
              {user && (
                <div className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-2 border bg-pink-50 border-pink-100">
                  {isPremium ? (
                    <Crown className="w-4 h-4 text-pink-500" />
                  ) : (
                    <Zap className="w-4 h-4 text-pink-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-700">
                    Analyses illimitées · 100% gratuit
                  </span>
                </div>
              )}

              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-black/5 border border-border">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Télécharger Photo {selectedArea === 'face' ? 'Visage' : selectedArea === 'body' ? 'Corps' : 'Cheveux'}</h2>
                  <p className="text-muted-foreground text-sm mb-3">
                    Assure-toi d'avoir un bon éclairage et une mise au point nette pour de meilleurs résultats.
                  </p>
                  <div className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-100 text-pink-700 rounded-xl px-3 py-1.5 text-xs font-semibold">
                    <Lock className="w-3 h-3" />
                    Photo analysée puis supprimée immédiatement — jamais stockée, jamais partagée
                  </div>
                </div>

                <FileUpload
                  onFileSelect={handleFileSelect}
                  isProcessing={isAnalyzing}
                />
              </div>
            </motion.div>
          )}

          {/* ÉCRAN : Limite anonyme atteinte */}
          {step === "anon_limit" && (
            <motion.div
              key="anon_limit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center py-12"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-emerald-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔓</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Crée ton compte pour continuer</h2>
              <p className="text-gray-500 text-sm mb-2 leading-relaxed">
                Tu as utilisé ton analyse gratuite. Avec un compte, tu obtiens :
              </p>
              <div className="bg-pink-50 rounded-2xl px-4 py-3 mb-6 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-pink-800">
                  <span>✅</span><span><strong>1 analyse gratuite</strong> pour découvrir l'app</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-pink-800">
                  <span>✅</span><span>Historique et suivi de l'évolution de ta peau</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-pink-800">
                  <span>✅</span><span>Routine beauté personnalisée sauvegardée</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-pink-800">
                  <span>✅</span><span>Accès à la boutique et au SkinBot IA</span>
                </div>
              </div>
              <div className="space-y-3">
                <a
                  href="/auth"
                  onClick={() => {
                    try { localStorage.setItem("glowscan_after_auth", "new_scan"); } catch {}
                  }}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-pink-500 to-emerald-500 text-white font-bold text-base rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95"
                  data-testid="button-create-account-limit"
                >
                  <Sparkles className="w-5 h-5" />
                  Créer mon compte — c'est gratuit
                </a>
                <a
                  href="/auth#login"
                  onClick={() => {
                    try { localStorage.setItem("glowscan_after_auth", "new_scan"); } catch {}
                  }}
                  className="w-full py-3 text-sm text-pink-600 font-semibold text-center block hover:underline transition-colors"
                  data-testid="button-login-limit"
                >
                  J'ai déjà un compte — Me connecter
                </a>
                <button
                  onClick={() => setStep("select")}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Pas maintenant
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Results */}
          {step === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Résultats de l'Analyse</h1>
                <button
                  onClick={reset}
                  data-testid="button-new-analysis"
                  className="px-4 py-2 rounded-full border border-border bg-white hover:bg-muted text-sm font-medium transition-colors"
                >
                  Nouvelle Analyse
                </button>
              </div>

              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-pink-50 border border-pink-100 flex items-center gap-3"
                >
                  <div className="text-2xl flex-shrink-0">✨</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-pink-800 mb-0.5">Envie de faire une 2ème analyse ?</p>
                    <p className="text-xs text-pink-600">Crée un compte gratuit pour continuer et sauvegarder tes résultats.</p>
                  </div>
                  <a
                    href="/auth"
                    onClick={() => {
                      try { localStorage.setItem("glowscan_after_auth", "restore"); } catch {}
                    }}
                    className="flex-shrink-0 px-4 py-2 bg-pink-600 text-white font-bold text-xs rounded-xl hover:bg-pink-700 transition-colors whitespace-nowrap"
                    data-testid="button-login-save"
                  >
                    Créer un compte
                  </a>
                </motion.div>
              )}
              <ResultCard
                result={result}
                scanId={savedScanId}
                area={selectedArea}
                imageUrl={uploadedImage}
                userFirstName={(user as any)?.firstName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        scansThisMonth={scansThisMonth}
        scansLimit={scansLimit}
      />

      {needsConsent && (
        <ConsentBanner
          userId={user?.id}
          onAccept={() => {
            setNeedsConsent(false);
            const pending = pendingImageRef.current;
            pendingImageRef.current = null;
            if (pending) {
              // Relance l'analyse maintenant que le consentement est donné
              handleFileSelect(pending);
            }
          }}
          onDecline={() => {
            setNeedsConsent(false);
            pendingImageRef.current = null;
            toast({
              title: "Analyse annulée",
              description: "Tu peux changer d'avis à tout moment depuis ton profil.",
            });
          }}
        />
      )}
    </div>
  );
}
