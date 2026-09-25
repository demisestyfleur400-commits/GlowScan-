import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSEO } from "@/hooks/useSEO";
import { trackPageVisit } from "@/lib/analytics";
import { fetchWithRetry } from "@/lib/imageUtils";
import { triggerPWAInstallPrompt } from "@/hooks/use-pwa-install";
import { useSubscription } from "@/hooks/use-subscription";
import { GsTopBar } from "@/components/GsTopBar";
import { FileUpload } from "@/components/FileUpload";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ConsentBanner, hasUserConsented, getDatasetConsent, PRIVACY_POLICY_VERSION } from "@/components/ConsentBanner";
import { ToxicAlert } from "@/components/ToxicAlert";
import { PRODUCT_SUGGESTIONS, detectToxicProducts } from "@/lib/toxic-products";
import { TriageBadge } from "@/components/TriageBadge";
import { classifyTriage } from "@/lib/clinicalRules";

import { ResultB2C } from "@/components/b2c/ResultB2C";
import { ScanCamera, type LightLevel } from "@/components/b2c/ScanCamera";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { OPERATORS, cmNational, opOf } from "@shared/phone";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Lock, ChevronRight, HelpCircle, Scissors, Camera, User, PersonStanding, ArrowRight } from "lucide-react";
import { GS, GsButton, GsMono, GsSteps, GsCheck, GsOption, GsMarks } from "@/lib/gs-ui";
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
  email: string;
  age: string;
  sexe: string;
  duration: string;
  previousProducts: string;
  allergies: string;
  /** Consentement explicite à recevoir le compte rendu par email (décoché par défaut). */
  emailConsent: boolean;
  /** « J'accepte d'être recontacté par GlowScan sur WhatsApp » (décoché par défaut). */
  whatsappConsent: boolean;
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
  const [uploadedRight, setUploadedRight] = useState<string | null>(null); // profil droit (optionnel)
  const [uploadedLeft, setUploadedLeft] = useState<string | null>(null);   // profil gauche (optionnel)
  const extraRightRef = useRef<HTMLInputElement>(null);
  const extraLeftRef = useRef<HTMLInputElement>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingTip, setLoadingTip] = useState(0);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [showProdSug, setShowProdSug] = useState(false);
  const pendingImageRef = useRef<string | null>(null);
  const cancelledRef = useRef(false); // « Annuler l'analyse » — empêche un résultat tardif de forcer la navigation
  const cancelAnalysis = () => { cancelledRef.current = true; setIsAnalyzing(false); setStep("intake"); };
  const [photoUnusable, setPhotoUnusable] = useState(false); // état 05 (photo inexploitable)
  // Scanner (refonte Organic) : « Ma peau » ou « Un produit », et prise en cours (0..N).
  const [scanMode, setScanMode] = useState<"skin" | "product">("skin");
  const [shotIdx, setShotIdx] = useState(0);
  const [, setLocation] = useLocation();

  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // ── Formulaire d'intake patient ────────────────────────────────────────
  const [intake, setIntake] = useState<PatientIntake>({
    fullName: user?.firstName || "",
    phone: "",
    email: (user as any)?.email || "",
    age: "",
    sexe: "",
    duration: "",
    previousProducts: "",
    allergies: "",
    emailConsent: false,
    whatsappConsent: false,
  });
  const updateIntake = <K extends keyof PatientIntake>(k: K, v: PatientIntake[K]) =>
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

  const shotsNeeded = selectedArea === "face" ? 3 : 1;

  // Range la photo dans son emplacement. Tête tournée à gauche → on voit la joue
  // DROITE du patient ; tête à droite → joue gauche.
  const handleFileSelect = (base64: string) => {
    if (!base64) return;
    if (!hasUserConsented(user?.id)) {
      pendingImageRef.current = base64;
      setNeedsConsent(true);
      return;
    }
    if (shotIdx === 0) setUploadedImage(base64);
    else if (shotIdx === 1) setUploadedRight(base64);
    else setUploadedLeft(base64);
    const next = shotIdx + 1;
    setShotIdx(next);
    if (next >= shotsNeeded) setStep("intake");
  };

  const handleCapture = (dataUrl: string, light: LightLevel) => {
    if (light === "dark" || light === "bright") {
      toast({
        title: light === "dark" ? "Photo trop sombre" : "Trop de lumière",
        description: "Placez-vous face à une fenêtre, sans flash, puis reprenez la photo.",
        variant: "destructive",
      });
      return;
    }
    handleFileSelect(dataUrl);
  };

  const skipShot = () => {
    const next = shotIdx + 1;
    setShotIdx(next);
    if (next >= shotsNeeded) setStep("intake");
  };

  const resetShots = () => {
    setUploadedImage(null); setUploadedRight(null); setUploadedLeft(null);
    setShotIdx(0);
    setStep("select");
  };

  // Photo supplémentaire (profil) — compression légère puis stockage.
  const handleExtraPhoto = async (file: File | undefined | null, slot: "right" | "left") => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
      let { width, height } = img; const max = 1000;
      if (width > max || height > max) { const s = max / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
      const cv = document.createElement("canvas"); cv.width = width; cv.height = height;
      cv.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const out = cv.toDataURL("image/jpeg", 0.72);
      if (slot === "right") setUploadedRight(out); else setUploadedLeft(out);
    } catch {}
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage) return;
    // Formulaire court (refonte Organic) : âge et sexe restent obligatoires, ils
    // alimentent l'IA et les étiquettes démographiques du dataset. Durée, produits
    // et allergies sont demandés au moment d'une consultation.
    if (!intake.age) {
      toast({ title: "Champ requis", description: "Indiquez votre âge.", variant: "destructive" });
      return;
    }
    if (!intake.sexe) {
      toast({ title: "Champ requis", description: "Indiquez votre sexe.", variant: "destructive" });
      return;
    }
    if (intake.phone.trim() && !cmNational(intake.phone)) {
      toast({ title: "Numéro WhatsApp invalide", description: "Saisissez un numéro camerounais à 9 chiffres, par exemple 677 12 45 90.", variant: "destructive" });
      return;
    }
    cancelledRef.current = false;
    setPhotoUnusable(false);
    setIsAnalyzing(true);

    try {
      const analyzeRes = await fetchWithRetry("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          image: uploadedImage,
          images: [uploadedImage, uploadedRight, uploadedLeft].filter(Boolean),
          area: selectedArea,
          reponses: answers,
          intake: {
            fullName: intake.fullName.trim() || undefined,
            phone: intake.phone.trim() || undefined,
            whatsappConsent: !!cmNational(intake.phone) && intake.whatsappConsent,
            age: intake.age || undefined,
            sexe: intake.sexe || undefined,
            duration: intake.duration || undefined,
            previousProducts: intake.previousProducts.trim() || undefined,
            allergies: intake.allergies.trim() || undefined,
          },
          // Consentement recherche (choix explicite du patient) + version de la politique.
          datasetConsent: getDatasetConsent(user?.id),
          consentPolicyVersion: PRIVACY_POLICY_VERSION,
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
          setPhotoUnusable(true); // état 05 — écran « photo inexploitable »
          return;
        }
        if (analyzeRes.status === 429 && errBody.code === "AI_QUOTA") {
          setIsAnalyzing(false);
          toast({
            title: "Service saturé — réessaie bientôt",
            description: errBody.message || "Le service d'analyse est momentanément saturé. Réessaie dans quelques minutes.",
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
      if (cancelledRef.current) { cancelledRef.current = false; return; } // annulé pendant l'analyse
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
            value: data.score ?? 0,
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

  // Soumission du questionnaire complémentaire → lance l'analyse (les réponses
  // `answers` sont déjà incluses dans le POST /api/analyze de handleIntakeSubmit).
  // Corrige le bug : cette fonction était référencée mais non définie.
  const handleConsultationSubmit = handleIntakeSubmit;

  const reset = () => {
    setResult(null);
    setSavedScanId(null);
    setConsultationData(null);
    setAnswers({});
    setUploadedImage(null); setUploadedRight(null); setUploadedLeft(null);
    setIntake({ fullName: user?.firstName || "", phone: "", email: (user as any)?.email || "", age: "", sexe: "", duration: "", previousProducts: "", allergies: "", emailConsent: false, whatsappConsent: false });
    setShotIdx(0);
    setStep("select");
  };

  const onConsentGiven = (_datasetConsent: boolean) => {
    // Le choix (contribuer ou non à la recherche) est déjà stocké par ConsentBanner.
    setNeedsConsent(false);
    if (pendingImageRef.current) {
      const img = pendingImageRef.current;
      pendingImageRef.current = null;
      handleFileSelect(img);
    }
  };

  const HINTS = selectedArea === "face"
    ? ["Regardez l'écran, visage dans l'ovale", "Tournez la tête vers la gauche", "Tournez la tête vers la droite"]
    : selectedArea === "hair"
      ? ["Cuir chevelu bien dégagé, de près"]
      : ["Zone bien centrée, de près"];
  const photoCount = [uploadedImage, uploadedRight, uploadedLeft].filter(Boolean).length;
  const chip = (on: boolean) => cn(
    "whitespace-nowrap rounded-pill border px-4 py-[9px] text-[14px] font-semibold",
    on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text",
  );
  const seg = (on: boolean) => cn(
    "flex-1 rounded-pill border-0 p-2.5 text-[14px] font-bold",
    on ? "bg-organic-accent text-organic-bg" : "bg-transparent text-organic-text",
  );

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto max-w-[480px] px-5 pb-6 pt-4">
        <AnimatePresence mode="wait">

          {/* ══════════ ANALYSE EN COURS ══════════ */}
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-organic-bg px-6"
              data-testid="screen-analyzing"
            >
              <div className="flex items-center justify-center gap-3 rounded-pill bg-organic-accent-2-100 px-5 py-3.5 text-[14px] font-bold text-organic-accent-2-900">
                <span className="h-4 w-4 animate-pulse rounded-pill bg-organic-accent-2-600" />
                Analyse de vos {photoCount} photo{photoCount > 1 ? "s" : ""}…
              </div>
              <button type="button" onClick={cancelAnalysis} className="rounded-pill border border-organic-divider bg-transparent px-4 py-2 text-[14px] font-bold hover:bg-organic-text/[.07]">
                Annuler l'analyse
              </button>
            </motion.div>
          )}

          {/* ══════════ PHOTO INEXPLOITABLE (refus de l'IA) ══════════ */}
          {photoUnusable && !isAnalyzing && (
            <motion.div key="photo-unusable" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ResultB2C
                result={{ condition: "Image non exploitable", score: null } as unknown as AnalysisResult}
                area={selectedArea}
                photoCount={photoCount}
                onRetake={() => { setPhotoUnusable(false); resetShots(); }}
              />
            </motion.div>
          )}

          {/* ══════════ SCANNER ══════════ */}
          {(step === "select" || step === "upload") && !isAnalyzing && !photoUnusable && (
            <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4">
              <h1 className="m-0 text-[28px]">Scanner</h1>
              <div className="flex gap-1.5 rounded-pill bg-organic-surface p-1">
                <button type="button" onClick={() => setScanMode("skin")} className={seg(scanMode === "skin")}>Ma peau</button>
                <button type="button" onClick={() => setScanMode("product")} className={seg(scanMode === "product")}>Un produit</button>
              </div>

              {scanMode === "skin" ? (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-bold">Quelle zone ?</span>
                    <div className="flex flex-wrap gap-1.5">
                      {([["face", "Visage"], ["body", "Corps"], ["hair", "Cuir chevelu"]] as const).map(([k, l]) => (
                        <button key={k} type="button" className={chip(selectedArea === k)}
                          onClick={() => { if (selectedArea !== k) { setSelectedArea(k); setUploadedImage(null); setUploadedRight(null); setUploadedLeft(null); setShotIdx(0); } }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {shotIdx < shotsNeeded ? (
                    <>
                      <ScanCamera
                        key={`${selectedArea}-${shotIdx}`}
                        shotLabel={`Photo ${shotIdx + 1} / ${shotsNeeded}`}
                        hint={HINTS[shotIdx] || HINTS[0]}
                        oval={selectedArea === "face"}
                        onCapture={handleCapture}
                      />
                      {shotsNeeded > 1 && (
                        <div className="flex justify-center gap-2.5">
                          {Array.from({ length: shotsNeeded }, (_, i) => (
                            <span key={i} className="h-3 w-3 rounded-pill" style={{ background: i < shotIdx ? "var(--color-accent-2-600)" : i === shotIdx ? "var(--color-accent)" : "var(--color-neutral-300)" }} />
                          ))}
                        </div>
                      )}
                      {shotIdx > 0 && (
                        <button type="button" onClick={skipShot} className="self-center rounded-pill border-0 bg-transparent px-2 py-1 text-[13px] font-bold text-organic-neutral-700 hover:bg-organic-text/[.07]">
                          Passer cette photo
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => setStep("intake")} className="inline-flex items-center justify-center rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">
                        Continuer
                      </button>
                      <button type="button" onClick={resetShots} className="rounded-pill border-0 bg-transparent px-2 py-1 text-[14px] font-bold text-organic-accent hover:bg-organic-accent/10">
                        Reprendre les photos
                      </button>
                    </div>
                  )}
                  <span className="text-center text-[12px] text-organic-neutral-700">Vos photos restent privées. Résultat indicatif, pas un diagnostic.</span>
                </>
              ) : (
                <>
                  <div className="flex h-[300px] flex-none items-center justify-center rounded-card bg-organic-neutral-800">
                    <span className="h-[140px] w-[240px] rounded-[20px] border-[3px] border-organic-accent-300" />
                  </div>
                  <span className="text-center text-[14px]">Visez la <b>liste des ingrédients</b> au dos du produit.</span>
                  <button type="button" onClick={() => setLocation("/product-scan-camera")} className="inline-flex items-center justify-center rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">
                    Scanner le produit
                  </button>
                  {/* Le quota gratuit (3 scans / semaine) arrive avec l'écran Scan produit ;
                      d'ici là, on affiche l'accès réel. */}
                  <span className="text-center text-[12px] text-organic-neutral-700">
                    {isPremium ? "Scans illimités avec Premium" : "Scan produit réservé aux membres Premium"}
                  </span>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════ FORMULAIRE COURT (après les photos) ══════════ */}
          {step === "intake" && !isAnalyzing && !photoUnusable && (
            <motion.div key="intake" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <form onSubmit={handleConsultationSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <button type="button" onClick={() => setStep("select")} aria-label="Retour" className="border-0 bg-transparent p-0 pr-1 text-organic-accent-700">
                    <ArrowLeft size={21} strokeWidth={1.75} />
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-neutral-700">
                    {photoCount} photo{photoCount > 1 ? "s" : ""} prise{photoCount > 1 ? "s" : ""}
                  </span>
                </div>
                <h1 className="m-0 text-[28px]">Encore deux questions</h1>

                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold">Votre âge</span>
                  <div className="flex flex-wrap gap-1.5">
                    {([["moins de 15 ans", "Moins de 15 ans"], ["15-19 ans", "15 – 19 ans"], ["20-25 ans", "20 – 25 ans"], ["26-30 ans", "26 – 30 ans"], ["31-40 ans", "31 – 40 ans"], ["41-50 ans", "41 – 50 ans"], ["plus de 50 ans", "Plus de 50 ans"]] as const).map(([v, l]) => (
                      <button key={v} type="button" className={chip(intake.age === v)} onClick={() => updateIntake("age", v)}>{l}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold">Vous êtes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {([["femme", "Une femme"], ["homme", "Un homme"], ["autre", "Je préfère ne pas dire"]] as const).map(([v, l]) => (
                      <button key={v} type="button" className={chip(intake.sexe === v)} onClick={() => updateIntake("sexe", v)}>{l}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-lg bg-organic-surface p-4">
                  <label htmlFor="intake-email" className="text-[13px] font-bold">Recevoir le compte rendu <span className="font-normal text-organic-neutral-700">(facultatif)</span></label>
                  <input
                    id="intake-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Votre adresse email"
                    value={intake.email}
                    onChange={e => updateIntake("email", e.target.value)}
                    className="h-11 w-full rounded-pill border border-organic-divider bg-organic-bg px-3.5 text-[15px] text-organic-text caret-organic-accent placeholder:text-organic-text/55 hover:border-organic-text/45 focus-visible:border-organic-accent focus-visible:outline-none"
                  />
                  <label className="flex items-start gap-2.5 text-[13px] leading-snug">
                    <input
                      type="checkbox"
                      checked={intake.emailConsent}
                      onChange={e => updateIntake("emailConsent", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
                      data-testid="checkbox-email-consent"
                    />
                    <span>M'envoyer le compte rendu par email</span>
                  </label>
                </div>

                <div className="flex flex-col gap-2 rounded-lg bg-organic-surface p-4">
                  <label htmlFor="intake-phone" className="text-[13px] font-bold">Numéro WhatsApp <span className="font-normal text-organic-neutral-700">(facultatif)</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-organic-neutral-700">+237</span>
                    <input
                      id="intake-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="677 12 45 90"
                      value={intake.phone}
                      onChange={e => updateIntake("phone", e.target.value)}
                      className="h-11 w-full rounded-pill border border-organic-divider bg-organic-bg pl-[62px] pr-28 text-[15px] text-organic-text caret-organic-accent placeholder:text-organic-text/55 hover:border-organic-text/45 focus-visible:border-organic-accent focus-visible:outline-none"
                    />
                    {(() => {
                      const op = opOf(intake.phone);
                      return op && intake.phone.replace(/\D/g, "").length >= 3 ? (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill px-2.5 py-[3px] text-[11px] font-bold" style={{ background: OPERATORS[op].bg, color: OPERATORS[op].fg }}>
                          {OPERATORS[op].name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <span className="text-[12px] text-organic-neutral-700">Pour recevoir votre résultat et un rappel de suivi.</span>
                  <label className="flex items-start gap-2.5 text-[13px] leading-snug">
                    <input
                      type="checkbox"
                      checked={intake.whatsappConsent}
                      onChange={e => updateIntake("whatsappConsent", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
                      data-testid="checkbox-whatsapp-consent"
                    />
                    <span>J'accepte d'être recontacté par GlowScan sur WhatsApp</span>
                  </label>
                </div>

                <button type="submit" className="inline-flex items-center justify-center rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">
                  Voir mon résultat
                </button>
                <span className="text-center text-[12px] text-organic-neutral-700">Vos photos restent privées. Résultat indicatif, pas un diagnostic.</span>
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
              style={{ fontFamily: GS.sans, color: GS.ink }}
            >
              {/* Première observation — présentée comme aide, pas comme verdict */}
              <div style={{ border: `1px solid ${GS.line}`, padding: 14, marginBottom: 16 }}>
                <GsMono style={{ display: "block", marginBottom: 6 }}>Première observation</GsMono>
                <div style={{ fontSize: 12.5, color: GS.muted, lineHeight: 1.55, fontStyle: "italic" }}>« {consultationData.observations_visuelles} »</div>
              </div>

              <form onSubmit={handleConsultationSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <GsMono>Quelques questions pour affiner</GsMono>

                {consultationData.questions.map((q) => (
                  <div key={q.id}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: GS.ink, letterSpacing: "-.2px", lineHeight: 1.25, marginBottom: 8 }}>{q.label}</div>
                    <textarea
                      required
                      rows={2}
                      placeholder="Votre réponse…"
                      value={answers[q.id] || ""}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${GS.ink}`, padding: 13, fontFamily: GS.sans, fontSize: 14, color: GS.ink, outline: "none", resize: "vertical", borderRadius: 0 }}
                    />
                  </div>
                ))}

                <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted }}>Une réponse par question suffit — écrivez « je ne sais pas » si besoin.</div>
                <GsButton type="submit" icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>Générer mon compte rendu</GsButton>
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
              {/* Bandeau "Niveau de triage" retiré du B2C : il contredisait le Glow Score
                  (ex. "Suivi standard" affiché au-dessus d'un score bas). La page
                  commence désormais par le Glow Score — le triage clinique reste en DERM. */}
              {/* Résultat patient (refonte Organic). L'état « urgent » vient du seul
                  champ `urgent` renvoyé par l'IA (plus des redFlags génériques). */}
              <ResultB2C
                result={result}
                area={selectedArea}
                imageUrl={uploadedImage}
                createdAt={new Date()}
                photoCount={[uploadedImage, uploadedRight, uploadedLeft].filter(Boolean).length}
                scanId={savedScanId}
                autoEmailTo={intake.emailConsent ? intake.email : null}
                whatsappAvailable={!!cmNational(intake.phone)}
                onRetake={() => { setResult(null); setStep("upload"); }}
              />
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

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
      {needsConsent && <ConsentBanner onAccept={onConsentGiven} userId={user?.id?.toString()} />}
    </div>
  );
}
