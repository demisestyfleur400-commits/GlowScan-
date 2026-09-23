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
import { ConsentBanner, hasUserConsented, getDatasetConsent, PRIVACY_POLICY_VERSION } from "@/components/ConsentBanner";
import { ToxicAlert } from "@/components/ToxicAlert";
import { PRODUCT_SUGGESTIONS, detectToxicProducts } from "@/lib/toxic-products";
import { TriageBadge } from "@/components/TriageBadge";
import { classifyTriage } from "@/lib/clinicalRules";

// ResultCard est énorme (~1900 lignes) — on le charge seulement quand on en a besoin
const ResultCard = lazy(() =>
  import("@/components/ResultCard").then((m) => ({ default: m.ResultCard }))
);
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
    // Champ produits utilisés = obligatoire (alimente l'IA + l'alerte produits nocifs)
    if (!intake.previousProducts.trim()) {
      toast({ title: "Champ requis", description: "Indiquez les produits que vous utilisez actuellement (ou écrivez « Aucun »).", variant: "destructive" });
      return;
    }
    // Sexe + durée passés en choix unique (design 02C) → on garde la validation
    // que <select required> assurait auparavant.
    if (!intake.sexe) {
      toast({ title: "Champ requis", description: "Sélectionnez votre sexe.", variant: "destructive" });
      return;
    }
    if (!intake.duration) {
      toast({ title: "Champ requis", description: "Indiquez depuis combien de temps.", variant: "destructive" });
      return;
    }
    cancelledRef.current = false;
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
          toast({
            title: "Photo difficile à analyser",
            description: errBody.message || "Essaie avec une photo plus nette, bien éclairée et de face.",
            variant: "destructive",
          });
          setStep("upload");
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
    setIntake({ fullName: user?.firstName || "", phone: "", email: (user as any)?.email || "", age: "", sexe: "", duration: "", previousProducts: "", allergies: "" });
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
              className="fixed inset-0 z-50"
              style={{ background: "#fff", fontFamily: GS.sans, overflowY: "auto" }}
              data-testid="screen-analyzing"
            >
              <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", padding: "22px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                <GsMono>Dossier en cours d'analyse</GsMono>
                <div style={{ fontSize: 24, fontWeight: 600, color: GS.ink, letterSpacing: "-.7px", marginTop: 8 }}>Analyse en cours</div>

                {/* Carte de progression (repères +) */}
                <div style={{ position: "relative", marginTop: 26, border: `1px solid ${GS.line}`, padding: 24 }}>
                  <GsMarks />
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                    <GsMono style={{ letterSpacing: ".14em" }}>Progression</GsMono>
                    <span style={{ fontFamily: GS.mono, fontSize: 22, fontWeight: 600, color: GS.ink, fontVariantNumeric: "tabular-nums" }}>{LOADING_STEPS[loadingStep].pct} %</span>
                  </div>
                  <div style={{ height: 6, background: GS.panel, border: `1px solid ${GS.line}`, position: "relative" }}>
                    <motion.div style={{ position: "absolute", top: 0, left: 0, bottom: 0, background: GS.grad }} animate={{ width: `${LOADING_STEPS[loadingStep].pct}%` }} transition={{ duration: 0.4 }} />
                  </div>
                  <div style={{ fontFamily: GS.mono, fontSize: 10, color: GS.faint, marginTop: 8 }}>{LOADING_STEPS[loadingStep].msg}</div>
                </div>

                {/* Étapes du pipeline (état réel selon loadingStep) */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
                  {LOADING_STEPS.map((s, i) => {
                    const done = i < loadingStep;
                    const current = i === loadingStep;
                    return (
                      <div key={i} style={{ display: "flex", gap: 13, alignItems: "center", padding: "12px 0", borderBottom: i < LOADING_STEPS.length - 1 ? `1px solid ${GS.hair}` : "none" }}>
                        {done
                          ? <span style={{ color: GS.teal, fontSize: 15, width: 16, textAlign: "center", flex: "none" }}>✓</span>
                          : current
                            ? <span style={{ width: 16, height: 16, border: `1px solid ${GS.accent}`, background: GS.mintTint, flex: "none" }} />
                            : <span style={{ width: 16, height: 16, border: `1px solid ${GS.line}`, flex: "none" }} />}
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: done || current ? GS.ink : GS.faint }}>{s.msg}</span>
                        {done && <span style={{ fontFamily: GS.mono, fontSize: 10, color: GS.teal }}>OK</span>}
                        {current && <span style={{ fontFamily: GS.mono, fontSize: 10, color: GS.teal }}>EN COURS</span>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 20 }}>
                  <div style={{ borderLeft: `2px solid ${GS.accent}`, paddingLeft: 14, fontSize: 12, lineHeight: 1.6, color: GS.muted, marginBottom: 16 }}>
                    Vous pouvez fermer l'application. Nous vous prévenons dès que le résultat est prêt.
                  </div>
                  <GsButton variant="secondary" onClick={cancelAnalysis}>Annuler l'analyse</GsButton>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 1 : AREA SELECTION ══════════ */}
          {step === "select" && !isAnalyzing && (
            <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ fontFamily: GS.sans, color: GS.ink, paddingTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <GsSteps total={3} current={1} />
                <span style={{ fontFamily: GS.mono, fontSize: 10, fontWeight: 600, color: GS.teal }}>1/3</span>
              </div>
              <GsMono style={{ display: "block", marginBottom: 9 }}>Étape 1 · zone</GsMono>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.85px", lineHeight: 1.15, color: GS.ink }}>Qu'est-ce qu'on analyse ?</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: GS.muted, marginTop: 10 }}>Le modèle et les mesures changent selon la zone. Une analyse porte sur une seule zone.</div>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                {([
                  { key: "face", Icon: User, title: "Visage", desc: "Acné, taches, pores, âge cutané — grille GEA incluse", shots: "3 PHOTOS · FACE + 2 PROFILS" },
                  { key: "body", Icon: PersonStanding, title: "Corps", desc: "Lésion isolée, eczéma, psoriasis, grain de beauté", shots: "3 PHOTOS · MACRO + LARGE + PROFIL" },
                  { key: "hair", Icon: Scissors, title: "Cheveux & cuir chevelu", desc: "Chute, alopécie de traction, pellicules, sécheresse", shots: "3 PHOTOS · RAIE + SOMMET + NUQUE" },
                ] as const).map((c) => {
                  const on = selectedArea === c.key;
                  return (
                    <button key={c.key} onClick={() => setSelectedArea(c.key)}
                      style={{ textAlign: "left", cursor: "pointer", background: on ? GS.mintBg : "#fff", border: `1px solid ${on ? GS.ink : GS.line}`, padding: 13, display: "flex", gap: 13, alignItems: "center" }}>
                      <span style={{ width: 74, height: 74, flex: "none", border: `1px solid ${on ? GS.line : GS.hair}`, background: GS.panel, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <c.Icon size={30} strokeWidth={1.4} style={{ color: GS.teal }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: GS.ink }}>{c.title}</span>
                        <span style={{ display: "block", fontSize: 11, color: GS.muted, marginTop: 4, lineHeight: 1.45 }}>{c.desc}</span>
                        <span style={{ display: "block", marginTop: 6 }}><GsMono color={on ? GS.teal : GS.faint} style={{ letterSpacing: ".06em" }}>{c.shots}</GsMono></span>
                      </span>
                      <GsCheck checked={on} size={20} />
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, border: `1px solid ${GS.line}`, padding: 13, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <HelpCircle size={17} style={{ color: GS.teal, marginTop: 1, flexShrink: 0 }} strokeWidth={1.8} />
                <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted }}>Lésion qui saigne, change vite ou fait mal ? Ne perdez pas de temps avec l'analyse — <a href="/derm" style={{ color: GS.teal, fontWeight: 600 }}>écrivez à un médecin</a>.</div>
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ marginBottom: 12 }}><GsMono style={{ letterSpacing: ".05em" }}>Zone choisie · {selectedArea === "face" ? "Visage" : selectedArea === "body" ? "Corps" : "Cheveux"}</GsMono></div>
                <GsButton onClick={() => handleAreaSelect(selectedArea)} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>Passer aux photos</GsButton>
                <p style={{ textAlign: "center", fontSize: 11, color: GS.faint, marginTop: 12 }}>🔒 Confidentiel · aucun humain ne voit votre photo · sans engagement</p>
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
            >
              {/* Écran de capture guidée — fond sombre, langage instrument (design 02) */}
              <div style={{ background: GS.deep, fontFamily: GS.sans }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                  <button onClick={() => setStep("select")} aria-label="Retour"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#fff", display: "flex" }}>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span style={{ fontFamily: GS.mono, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", color: GS.accent }}>
                    {selectedArea === "hair" ? "Cuir chevelu · macro" : selectedArea === "body" ? "Lésion · macro" : "Visage · macro"}
                  </span>
                  <span style={{ width: 20 }} />
                </div>

                {/* Conseils de prise de vue — rangées « instrument » */}
                <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {(selectedArea === "hair"
                    ? ["Montrez le cuir chevelu ou la longueur, bien dégagé", "Lumière du jour, dos à la fenêtre", "Image nette — ni floue ni sombre"]
                    : ["Zone bien centrée et de près (plan macro)", "Lumière du jour, dos à la fenêtre", "Image nette — ni floue ni filtre"]
                  ).map((tip, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(18,216,190,.4)", background: "rgba(18,216,190,.08)", padding: "11px 13px" }}>
                      <span style={{ color: GS.accent, fontSize: 14, lineHeight: 1 }}>✓</span>
                      <span style={{ fontFamily: GS.sans, fontSize: 12, color: "#9FEFE2", lineHeight: 1.4 }}>{tip}</span>
                    </div>
                  ))}
                </div>

                {/* Viseur caméra (composant existant, déjà sombre) */}
                <div style={{ padding: "14px 16px 0" }}>
                  <FileUpload onFileSelect={handleFileSelect} autoStart={true} />
                </div>

                <div style={{ textAlign: "center", padding: "12px 16px 18px" }}>
                  <span style={{ fontFamily: GS.mono, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.55)" }}>
                    Votre photo n'est envoyée qu'après validation
                  </span>
                </div>
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
                <div data-clarity-mask="true" className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(47,158,110,0.06)", border: "1px solid rgba(47,158,110,0.18)" }}>
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

                  {/* Email — pour recevoir le rapport automatiquement */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      📧 Email <span style={{ color: "rgba(0,0,0,0.35)", fontWeight: 400 }}>(pour recevoir ton rapport)</span>
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Ex : aminata@email.com"
                      value={intake.email}
                      onChange={e => updateIntake("email", e.target.value)}
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

                  {/* Sexe — choix unique (gabarit design 02C) */}
                  <div>
                    <label className="block mb-2" style={{ fontFamily: GS.mono, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", color: GS.faint }}>Sexe *</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {([["femme", "Femme"], ["homme", "Homme"], ["autre", "Autre / je préfère ne pas dire"]] as const).map(([v, l]) => (
                        <GsOption key={v} label={l} selected={intake.sexe === v} onClick={() => updateIntake("sexe", v)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(0,0,0,0.35)" }}>
                    Antécédents et symptômes
                  </p>

                  {/* Durée du problème — choix unique (gabarit design 02C) */}
                  <div>
                    <label className="block mb-2" style={{ fontFamily: GS.mono, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", color: GS.faint }}>Depuis combien de temps ? *</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {([
                        ["quelques jours", "Quelques jours (moins d'une semaine)"],
                        ["quelques semaines (1-3 semaines)", "Quelques semaines (1 – 3 sem.)"],
                        ["1 à 3 mois", "1 à 3 mois"],
                        ["3 à 6 mois", "3 à 6 mois"],
                        ["plus de 6 mois", "Plus de 6 mois"],
                        ["plus d'un an", "Plus d'un an (chronique)"],
                        ["depuis toujours (peau naturellement ainsi)", "Depuis toujours"],
                      ] as const).map(([v, l]) => (
                        <GsOption key={v} label={l} selected={intake.duration === v} onClick={() => updateIntake("duration", v)} />
                      ))}
                    </div>
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

                  {/* Photos supplémentaires (profils) — optionnel, pour un meilleur diagnostic */}
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#1f2a26" }}>
                      📸 Ajouter les profils (optionnel — améliore le diagnostic)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { label: "Profil droit", src: uploadedRight, ref: extraRightRef, slot: "right" as const, clear: () => setUploadedRight(null) },
                        { label: "Profil gauche", src: uploadedLeft, ref: extraLeftRef, slot: "left" as const, clear: () => setUploadedLeft(null) },
                      ]).map((s) => (
                        <div key={s.slot}>
                          <button type="button" onClick={() => s.ref.current?.click()}
                            className="w-full rounded-xl overflow-hidden relative"
                            style={{ aspectRatio: "3/4", border: s.src ? "1px solid rgba(0,0,0,0.1)" : "2px dashed rgba(47,158,110,0.3)", background: "#fff" }}>
                            {s.src ? <img src={s.src} alt={s.label} className="w-full h-full object-cover" /> : (
                              <div className="flex flex-col items-center justify-center h-full">
                                <span style={{ fontSize: 20 }}>＋</span>
                                <span className="text-[10px] font-extrabold" style={{ color: "#6b7280" }}>{s.label}</span>
                              </div>
                            )}
                          </button>
                          <input ref={s.ref} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { handleExtraPhoto(e.target.files?.[0], s.slot); if (e.currentTarget) e.currentTarget.value = ""; }} />
                          {s.src && <button type="button" onClick={s.clear} className="w-full text-[10px] font-extrabold mt-0.5" style={{ color: "#9ca3af" }}>Retirer</button>}
                        </div>
                      ))}
                    </div>
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
                  autoEmailTo={intake.email || undefined}
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

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
      {needsConsent && <ConsentBanner onAccept={onConsentGiven} userId={user?.id?.toString()} />}
    </div>
  );
}
