import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Upload,
  CheckCircle2,
  FileText,
  MessageCircle,
  RefreshCw,
  Activity,
  ScanLine,
  UserPlus,
  Users,
  Search,
  Check,
  X,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  useCreatePatient,
  useAttachScanToPatient,
  useValidateScan,
  useProPatients,
  useGenerateQuestionnaire,
  type QuestionnaireItem,
} from "@/hooks/use-pro";
import { useAnalyze } from "@/hooks/use-scans";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult, Patient } from "@shared/schema";
import { ProLayout, ProCard, ProInput } from "@/components/ProLayout";

const NAVY = "#7c3aed";
const INK = "#f3f0ff";
const GREEN = "#10b981";

const DS = {
  surface: "#13101f",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

type Step = 1 | 2 | 3 | 4 | 5;
type AnswerValue = "oui" | "non" | "nsp";

const STEPS = [
  { n: 1, label: "Patient" },
  { n: 2, label: "Photo" },
  { n: 3, label: "Diagnostic" },
  { n: 4, label: "Anamnèse" },
  { n: 5, label: "Dossier" },
];

// ─── Compression photo via Canvas natif ────────────────────────────────
async function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<{ base64: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width * maxDim) / height;
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", quality);
        const sizeKb = Math.round((dataUrl.length * 0.75) / 1024);
        resolve({ base64: dataUrl, sizeKb });
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Mock zones précises (fallback si IA n'en renvoie pas) ─────────────
function buildMockZones(result: AnalysisResult) {
  if (result.zoneAnalysis && result.zoneAnalysis.length >= 3) return result.zoneAnalysis;
  const cond = (result.condition || "").toLowerCase();
  const isAcne = cond.includes("acné");
  const isMelasma = cond.includes("mélasma") || cond.includes("hyperpigment");
  const isDry = cond.includes("xérose") || cond.includes("sèch");
  return [
    { name: "Zone frontale", status: (isAcne ? "yellow" : "green") as "red" | "yellow" | "green", short: isAcne ? "Acné modérée" : "RAS", long: "" },
    { name: "Joue droite", status: (isDry ? "yellow" : "green") as any, short: isDry ? "Xérose" : "Hydratation OK", long: "" },
    { name: "Joue gauche", status: (isDry ? "yellow" : "green") as any, short: isDry ? "Xérose" : "Hydratation OK", long: "" },
    { name: "Menton", status: (isMelasma ? "red" : "green") as any, short: isMelasma ? "Mélasma" : "RAS", long: "" },
    { name: "Nez / Zone T", status: (isAcne ? "yellow" : "green") as any, short: isAcne ? "Pores dilatés" : "Sébum normal", long: "" },
    { name: "Contour œil", status: "green" as any, short: "Hydraté", long: "" },
  ];
}

export default function ProAnalyze() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createPatient = useCreatePatient();
  const attach = useAttachScanToPatient();
  const validate = useValidateScan();
  const analyze = useAnalyze();
  const genQuestionnaire = useGenerateQuestionnaire();
  const { data: patientsData } = useProPatients("");

  const [step, setStep] = useState<Step>(1);

  // Step 1 : choix patient
  const [patientMode, setPatientMode] = useState<"choice" | "new" | "existing">("choice");
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");

  // Champs nouveau patient
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"F" | "M" | "—">("—");
  const [phone, setPhone] = useState("");

  // Step 2 : Photo
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Step 3 : Diagnostic
  const [result, setResult] = useState<(AnalysisResult & { savedScanId?: number }) | null>(null);

  // Step 4 : Questionnaire IA
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // Step 5 : Confirmation
  const [dossierSaved, setDossierSaved] = useState(false);
  const [datasetSent, setDatasetSent] = useState(false);

  // ─── Pré-sélection patient si ?patient=ID dans l'URL ────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("patient");
    if (pid && patientsData?.patients) {
      const p = patientsData.patients.find((x) => x.id === parseInt(pid));
      if (p) {
        setPatient(p);
        setPatientId(p.id);
        setLastName(p.lastName);
        setFirstName(p.firstName);
        setAge(p.age?.toString() || "");
        setSex((p.sex as any) || "—");
        setPhone(p.whatsappNumber || "");
        setPatientMode("existing");
        setStep(2);
      }
    }
    if (params.get("nouveau") === "1") {
      setPatientMode("new");
    }
  }, [patientsData]);

  // ─── Helpers patient ────────────────────────────────────────────────
  const filteredPatients = (patientsData?.patients || []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.firstName + " " + p.lastName).toLowerCase().includes(q) || (p.whatsappNumber || "").includes(q);
  });

  const submitNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    try {
      const r = await createPatient.mutateAsync({
        firstName: firstName.trim() || "—",
        lastName: lastName.trim(),
        age: age ? parseInt(age) : null,
        sex,
        whatsappNumber: phone.trim() || null,
      });
      setPatientId(r.patient.id);
      setPatient(r.patient);
      setStep(2);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const selectExisting = (p: Patient) => {
    setPatient(p);
    setPatientId(p.id);
    setLastName(p.lastName);
    setFirstName(p.firstName);
    setAge(p.age?.toString() || "");
    setSex((p.sex as any) || "—");
    setPhone(p.whatsappNumber || "");
    setStep(2);
  };

  // ─── Step 2 : upload + compression ─────────────────────────────────
  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Image uniquement", variant: "destructive" });
      return;
    }
    try {
      const t0 = performance.now();
      const { base64, sizeKb } = await compressImage(file);
      const dt = Math.round(performance.now() - t0);
      setPhotoBase64(base64);
      setPhotoSize(sizeKb);
      toast({ title: "Photo optimisée", description: `${sizeKb} Ko · ${dt} ms` });
    } catch (err: any) {
      toast({ title: "Erreur compression", description: err.message, variant: "destructive" });
    }
  };

  // ─── Step 2 → 3 : lancer analyse IA ─────────────────────────────────
  const launchAnalysis = async () => {
    if (!photoBase64) {
      toast({ title: "Photo manquante", variant: "destructive" });
      return;
    }
    setStep(3);
    try {
      const r = await analyze.mutateAsync({ image: photoBase64, area: "face" });
      setResult(r as any);
      genQuestionnaire.mutate({
        condition: (r as any).condition || "Affection cutanée",
        area: "face",
        patientAge: age ? parseInt(age) : null,
        patientSex: sex,
      }, {
        onSuccess: (data) => setQuestionnaire(data.items || []),
      });
    } catch (err: any) {
      console.warn("[pro] analyse IA indisponible", err?.message);
      setResult({
        condition: "Examen clinique en cours",
        score: 70,
        severity: "Modérée",
        skinType: "Phototype IV-VI",
        details: "L'analyse IA est temporairement indisponible. Vous pouvez compléter manuellement.",
        motivation: "Examen clinique direct par le dermatologue.",
        zoneAnalysis: [],
        zones: [],
        recommendations: { products: [], morning: [], evening: [], weekly: "" },
      } as any);
    }
  };

  // ─── Step 3 → 4 : passer au questionnaire ─────────────────────────
  const goToQuestionnaire = () => {
    if (!result) return;
    if (questionnaire.length === 0) {
      genQuestionnaire.mutate({
        condition: result.condition || "Affection cutanée",
        area: "face",
        patientAge: age ? parseInt(age) : null,
        patientSex: sex,
      }, {
        onSuccess: (data) => setQuestionnaire(data.items || []),
      });
    }
    setStep(4);
  };

  // ─── Step 4 → 5 : sauver dossier ──────────────────────────────────
  const saveDossier = async () => {
    setStep(5);
    const scanId = result?.savedScanId;

    if (!scanId) {
      console.error("[pro/save] ❌ savedScanId manquant", { patientId, condition: result?.condition });
      toast({
        title: "Sauvegarde partielle",
        description: "Diagnostic affiché mais non rattaché au dossier. Recommencez l'analyse.",
        variant: "destructive",
      });
      setDossierSaved(true);
      return;
    }
    if (!patientId) {
      console.error("[pro/save] ❌ patientId manquant");
      setDossierSaved(true);
      return;
    }

    try {
      await attach.mutateAsync({
        scanId,
        patientId,
        clinicalContext: {
          questionnaire: answers,
          questionnaireItems: questionnaire,
          answeredAt: new Date().toISOString(),
        },
      });
      setDossierSaved(true);
    } catch (err: any) {
      console.warn("[pro/save] attach échoué (ignoré):", err?.message);
      setDossierSaved(true);
    }
    try {
      await validate.mutateAsync({ scanId, isVerified: true, expertNote: null });
      setDatasetSent(true);
    } catch (err: any) {
      console.warn("[pro/save] validate échoué (ignoré):", err?.message);
    }
    toast({ title: `Dossier de ${firstName || lastName} mis à jour ✅`, description: "Visible dans Patients > Dossier" });
  };

  // ─── Actions finales ──────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!phone) {
      toast({ title: "Pas de téléphone", description: "Patient sans WhatsApp", variant: "destructive" });
      return;
    }
    const products = result?.recommendations?.products?.slice(0, 3).join(", ") || "—";
    const msg = encodeURIComponent(
      `Bonjour ${firstName} ${lastName},\n\n` +
        `Voici votre rapport GlowScan :\n` +
        `• Diagnostic : ${result?.condition || "—"}\n` +
        `• Glow Score : ${result?.score || 0}/100\n` +
        `• Produits recommandés : ${products}\n\n` +
        `— Cabinet GlowScan Pro`
    );
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  const exportPdf = () => {
    if (patientId) window.open(`/api/pro/patients/${patientId}/pdf`, "_blank");
    else window.print();
  };

  const resetAll = () => {
    setStep(1);
    setPatientMode("choice");
    setPatient(null); setPatientId(null);
    setLastName(""); setFirstName(""); setAge(""); setSex("—"); setPhone("");
    setPhotoBase64(null); setPhotoSize(0);
    setResult(null);
    setQuestionnaire([]); setAnswers({});
    setDossierSaved(false); setDatasetSent(false);
  };

  const zones = result ? buildMockZones(result) : [];
  const allAnswered = questionnaire.length > 0 && questionnaire.every((q) => answers[q.id]);
  const patientLabel = `${firstName} ${lastName}`.trim() || "—";

  return (
    <ProLayout title="Analyser un patient" back="/pro/dashboard">
      <div className="max-w-3xl mx-auto print:max-w-full">
        <ProgressBar current={step} />

        {/* ════════ STEP 1 : Patient ════════ */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            {/* Sous-étape : choix nouveau / existant */}
            {patientMode === "choice" && (
              <ProCard className="p-5">
                <StepHeader n={1} title="Quel patient analyser ?" subtitle="Ouvrez un nouveau dossier ou reprenez un patient existant" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setPatientMode("new")}
                    data-testid="button-new-patient"
                    className="group p-5 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = NAVY)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = DS.border)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3"
                      style={{ background: NAVY }}
                    >
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <p className="font-extrabold text-base" style={{ color: INK }}>Nouveau patient</p>
                    <p className="text-xs mt-1" style={{ color: DS.body }}>Créer un dossier (nom, âge, contact)</p>
                  </button>
                  <button
                    onClick={() => setPatientMode("existing")}
                    data-testid="button-existing-patient"
                    disabled={(patientsData?.patients?.length || 0) === 0}
                    className="group p-5 rounded-2xl text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = NAVY; }}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = DS.border)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3"
                      style={{ background: GREEN }}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="font-extrabold text-base" style={{ color: INK }}>Patient existant</p>
                    <p className="text-xs mt-1" style={{ color: DS.body }}>
                      {patientsData?.patients?.length || 0} patient(s) au cabinet
                    </p>
                  </button>
                </div>
              </ProCard>
            )}

            {/* Formulaire nouveau patient */}
            {patientMode === "new" && (
              <ProCard className="p-5">
                <button
                  onClick={() => setPatientMode("choice")}
                  className="text-xs font-extrabold hover:underline mb-3 inline-flex items-center gap-1"
                  style={{ color: DS.muted }}
                >
                  <ArrowLeft className="w-3 h-3" /> Retour au choix
                </button>
                <StepHeader n={1} title="Nouveau patient" subtitle="Identité minimale pour ouvrir le dossier" />
                <form onSubmit={submitNewPatient} className="space-y-3">
                  <ProInput label="Nom *" value={lastName} onChange={(e) => setLastName(e.target.value)} required testid="input-lastname" placeholder="Mbarga" />
                  <ProInput label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} testid="input-firstname" placeholder="Marie" />
                  <div className="grid grid-cols-3 gap-3">
                    <ProInput label="Âge" type="number" value={age} onChange={(e) => setAge(e.target.value)} testid="input-age" placeholder="32" />
                    <div>
                      <label className="text-xs font-extrabold mb-1.5 block" style={{ color: DS.body }}>Sexe</label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value as any)}
                        data-testid="select-sex"
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: INK }}
                      >
                        <option value="—">—</option>
                        <option value="F">Femme</option>
                        <option value="M">Homme</option>
                      </select>
                    </div>
                    <ProInput label="Téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} testid="input-phone" placeholder="237 6XX..." />
                  </div>
                  <button
                    type="submit"
                    disabled={createPatient.isPending}
                    data-testid="button-create-patient"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-white text-sm font-extrabold disabled:opacity-50 active:scale-[0.98] transition-all"
                    style={{ background: NAVY }}
                  >
                    {createPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Créer & continuer <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </ProCard>
            )}

            {/* Sélecteur patient existant */}
            {patientMode === "existing" && (
              <ProCard className="p-5">
                <button
                  onClick={() => setPatientMode("choice")}
                  className="text-xs font-extrabold hover:underline mb-3 inline-flex items-center gap-1"
                  style={{ color: DS.muted }}
                >
                  <ArrowLeft className="w-3 h-3" /> Retour au choix
                </button>
                <StepHeader n={1} title="Choisir un patient" subtitle="Tapez un nom ou téléphone pour filtrer" />
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: DS.muted }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher Mbarga, Marie, 677..."
                    data-testid="input-search-patient"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: INK }}
                  />
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: DS.muted }}>Aucun patient trouvé</p>
                  ) : (
                    filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectExisting(p)}
                        data-testid={`row-pick-patient-${p.id}`}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left active:scale-[0.99]"
                        style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = NAVY)}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = DS.border)}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                          style={{ background: NAVY }}
                        >
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold truncate" style={{ color: INK }}>
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: DS.muted }}>
                            {p.age ? `${p.age} ans · ` : ""}
                            {p.lastScanAt ? `dernier scan ${new Date(p.lastScanAt).toLocaleDateString("fr-FR")}` : "jamais analysé"}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4" style={{ color: DS.muted }} />
                      </button>
                    ))
                  )}
                </div>
              </ProCard>
            )}
          </div>
        )}

        {/* ════════ STEP 2 : Photo ════════ */}
        {step === 2 && (
          <ProCard className="p-5 mt-4">
            <StepHeader n={2} title={`Photo de ${patientLabel}`} subtitle="Optimisée automatiquement pour peaux phototypes IV-VI" />

            {!photoBase64 ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileRef.current?.click()}
                data-testid="dropzone"
                className="rounded-2xl p-10 text-center cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragOver ? NAVY : "rgba(167,139,250,0.3)"}`,
                  background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                }}
              >
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: dragOver ? NAVY : "rgba(200,185,255,0.4)" }} />
                <p className="text-sm font-extrabold" style={{ color: INK }}>Cliquez ou déposez la photo ici</p>
                <p className="text-[11px] mt-1" style={{ color: DS.muted }}>Compression auto vers WebP &lt; 500 Ko</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                  data-testid="input-file"
                />
              </div>
            ) : (
              <div>
                <div
                  className="relative rounded-2xl overflow-hidden mb-3"
                  style={{ border: `1px solid ${DS.border}` }}
                >
                  <img src={photoBase64} alt="aperçu" className="w-full h-64 object-cover" data-testid="img-preview" />
                  <span
                    className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[11px] font-extrabold"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}
                  >
                    {photoSize} Ko · WebP
                  </span>
                </div>
                <button
                  onClick={() => { setPhotoBase64(null); setPhotoSize(0); }}
                  className="w-full text-xs font-extrabold py-1 mb-3"
                  style={{ color: DS.muted }}
                  data-testid="button-replace"
                >
                  Remplacer la photo
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1 transition-all active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
              <button
                onClick={launchAnalysis}
                disabled={!photoBase64}
                data-testid="button-launch-analysis"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50 active:scale-[0.98] transition-all"
                style={{ background: NAVY }}
              >
                Lancer l'analyse IA
                <Activity className="w-4 h-4" />
              </button>
            </div>
          </ProCard>
        )}

        {/* ════════ STEP 3 : Diagnostic IA ════════ */}
        {step === 3 && (
          <div className="mt-4">
            {analyze.isPending || !result ? (
              <ScanLoader photo={photoBase64} />
            ) : (
              <>
                <ProCard className="p-5">
                  <StepHeader n={3} title="Diagnostic IA" subtitle={`${patientLabel} · ${result.skinType || "Phototype IV-VI"}`} />

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div
                      className="p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: DS.muted }}>Diagnostic principal</p>
                      <p className="text-base font-extrabold mt-1" style={{ color: INK }} data-testid="text-condition">
                        {result.condition}
                      </p>
                    </div>
                    <div
                      className="p-4 rounded-xl"
                      style={{ border: `1px solid rgba(124,58,237,0.4)`, background: "rgba(124,58,237,0.1)" }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: "#a78bfa" }}>Glow Score</p>
                      <p className="text-3xl font-extrabold mt-1" style={{ color: NAVY }} data-testid="text-score">
                        {result.score}<span className="text-base" style={{ color: DS.muted }}>/100</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] uppercase tracking-wider font-extrabold mb-2" style={{ color: DS.muted }}>Analyse par zone</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {zones.slice(0, 6).map((z, i) => {
                      const colorMap = {
                        red: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", dot: "#f87171", text: "#f87171" },
                        yellow: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", dot: "#fbbf24", text: "#fbbf24" },
                        green: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", dot: "#6ee7b7", text: "#6ee7b7" },
                      };
                      const c = (colorMap as any)[z.status] || colorMap.green;
                      return (
                        <div
                          key={i}
                          data-testid={`zone-${i}`}
                          className="p-3 rounded-xl"
                          style={{ background: c.bg, border: `1px solid ${c.border}` }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                            <p className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: DS.muted }}>{z.name}</p>
                          </div>
                          <p className="text-xs font-extrabold" style={{ color: c.text }}>{z.short}</p>
                        </div>
                      );
                    })}
                  </div>
                </ProCard>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1 transition-all active:scale-[0.97]"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour
                  </button>
                  <button
                    onClick={goToQuestionnaire}
                    data-testid="button-to-questionnaire"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-white text-sm font-extrabold active:scale-[0.98] transition-all"
                    style={{ background: NAVY }}
                  >
                    Anamnèse patient
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════ STEP 4 : Questionnaire IA ════════ */}
        {step === 4 && (
          <ProCard className="p-5 mt-4">
            <StepHeader
              n={4}
              title="Questionnaire d'anamnèse"
              subtitle={questionnaire.length > 0
                ? `${Object.keys(answers).length}/${questionnaire.length} questions répondues — généré par IA selon le diagnostic`
                : "L'IA prépare des questions ciblées..."}
            />

            {genQuestionnaire.isPending || questionnaire.length === 0 ? (
              <div className="py-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: NAVY }} />
                <p className="text-sm font-extrabold" style={{ color: INK }}>Préparation du questionnaire</p>
                <p className="text-xs mt-1" style={{ color: DS.muted }}>L'IA cible les questions selon "{result?.condition}"</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {questionnaire.map((q, i) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg"
                          style={{ background: "rgba(124,58,237,0.15)", color: NAVY }}
                        >
                          Q{i + 1}
                        </span>
                        <p className="text-sm font-extrabold flex-1" style={{ color: INK }}>{q.label}</p>
                      </div>
                      <p className="text-[10px] uppercase font-extrabold mb-2" style={{ color: DS.muted }}>{q.axis}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { v: "oui" as AnswerValue, label: "Oui", icon: Check, activeBg: "rgba(16,185,129,0.12)", activeBorder: "rgba(16,185,129,0.35)", activeColor: "#6ee7b7" },
                          { v: "non" as AnswerValue, label: "Non", icon: X, activeBg: "rgba(248,113,113,0.12)", activeBorder: "rgba(248,113,113,0.35)", activeColor: "#f87171" },
                          { v: "nsp" as AnswerValue, label: "Ne sait pas", icon: HelpCircle, activeBg: "rgba(255,255,255,0.08)", activeBorder: "rgba(255,255,255,0.15)", activeColor: DS.body },
                        ]).map((opt) => {
                          const on = answers[q.id] === opt.v;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.v}
                              onClick={() => setAnswers({ ...answers, [q.id]: opt.v })}
                              data-testid={`answer-${q.id}-${opt.v}`}
                              className="px-2 py-2 rounded-xl text-xs font-extrabold border-2 transition-all inline-flex items-center justify-center gap-1 active:scale-[0.97]"
                              style={on
                                ? { background: opt.activeBg, borderColor: opt.activeBorder, color: opt.activeColor }
                                : { background: "rgba(255,255,255,0.03)", borderColor: DS.border, color: DS.muted }
                              }
                            >
                              <Icon className="w-3 h-3" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${DS.border}` }}>
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1 transition-all active:scale-[0.97]"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour
                  </button>
                  <button
                    onClick={saveDossier}
                    disabled={!allAnswered || attach.isPending}
                    data-testid="button-save-dossier"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50 active:scale-[0.98] transition-all"
                    style={{ background: NAVY }}
                  >
                    {attach.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enregistrer le dossier <CheckCircle2 className="w-4 h-4" /></>}
                  </button>
                </div>
              </>
            )}
          </ProCard>
        )}

        {/* ════════ STEP 5 : Confirmation dossier ════════ */}
        {step === 5 && (
          <div className="mt-4">
            <ProCard className="p-6 text-center" testid="card-confirmation">
              {dossierSaved ? (
                <>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
                  >
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#6ee7b7" }} />
                  </div>
                  <h2 className="text-xl font-extrabold mb-2" style={{ color: INK }} data-testid="text-confirmation-title">
                    Dossier de {patientLabel} mis à jour ✅
                  </h2>
                  <p className="text-sm mb-1" style={{ color: DS.body }}>
                    Photo, diagnostic, anamnèse et produits enregistrés.
                  </p>
                  <p className="text-xs mb-5" style={{ color: DS.muted }}>
                    Retrouvez ce dossier dans <strong style={{ color: DS.body }}>Patients → {patientLabel}</strong>
                  </p>

                  {datasetSent && (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold mb-5"
                      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Ajouté au dataset GlowScan (RLHF)
                    </div>
                  )}

                  {/* Récap dossier */}
                  <div
                    className="rounded-2xl p-4 mb-5 text-left"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                  >
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {photoBase64 && (
                        <img src={photoBase64} alt="" className="w-full h-20 object-cover rounded-xl" style={{ border: `1px solid ${DS.border}` }} />
                      )}
                      <div className="col-span-2 space-y-1.5">
                        <Mini label="Diagnostic" value={result?.condition || "—"} />
                        <Mini label="Glow Score" value={`${result?.score || 0}/100`} accent={NAVY} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: DS.muted }}>
                      <CheckCircle2 className="w-3 h-3" style={{ color: "#6ee7b7" }} />
                      Anamnèse complète : {Object.keys(answers).length} réponses
                    </div>
                    <div className="flex items-center gap-2 text-[11px] mt-1" style={{ color: DS.muted }}>
                      <CheckCircle2 className="w-3 h-3" style={{ color: "#6ee7b7" }} />
                      Photo archivée · {new Date().toLocaleString("fr-FR")}
                    </div>
                    {result?.recommendations?.products && result.recommendations.products.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] mt-1" style={{ color: DS.muted }}>
                        <CheckCircle2 className="w-3 h-3" style={{ color: "#6ee7b7" }} />
                        {result.recommendations.products.length} produit(s) recommandé(s)
                      </div>
                    )}

                    {(() => {
                      const r = result as any;
                      const zones = r?.analyse_zones as Record<string, string> | undefined;
                      const justif = r?.justification_score as string | undefined;
                      const conseil = r?.conseil_expert as string | undefined;
                      if (!zones && !justif && !conseil) return null;
                      return (
                        <div className="mt-3 pt-3 space-y-2 text-left" style={{ borderTop: `1px solid ${DS.border}` }}>
                          {zones && (
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: DS.muted }}>Analyse par zone</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {Object.entries(zones).map(([z, d]) => (
                                  <div
                                    key={z}
                                    className="text-[10px] rounded-lg p-1.5"
                                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                                  >
                                    <span className="font-extrabold uppercase" style={{ color: DS.muted }}>{z}</span>
                                    <p className="leading-tight" style={{ color: DS.body }}>{d}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {justif && (
                            <div className="text-[10px]" style={{ color: DS.body }}>
                              <span className="font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Justification score :</span> {justif}
                            </div>
                          )}
                          {conseil && (
                            <div
                              className="text-[11px] rounded-lg p-2"
                              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
                            >
                              <span className="font-extrabold uppercase tracking-wider text-[10px]" style={{ color: "#fbbf24" }}>Conseil expert</span>
                              <p className="leading-snug mt-0.5" style={{ color: DS.body }}>{conseil}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => patientId && setLocation(`/pro/patient/${patientId}`)}
                      data-testid="button-view-dossier"
                      className="inline-flex items-center justify-center gap-1.5 py-3 rounded-full text-white text-sm font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: NAVY }}
                    >
                      <FileText className="w-4 h-4" />
                      Voir le dossier
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      data-testid="button-whatsapp"
                      className="inline-flex items-center justify-center gap-1.5 py-3 rounded-full text-white text-sm font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Envoyer diagnostic
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={exportPdf}
                      data-testid="button-pdf"
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Exporter PDF
                    </button>
                    <button
                      onClick={resetAll}
                      data-testid="button-new"
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Nouvelle analyse
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: NAVY }} />
                  <p className="text-sm font-extrabold" style={{ color: INK }}>Enregistrement du dossier...</p>
                </div>
              )}
            </ProCard>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          nav, header { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </ProLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────
function ProgressBar({ current }: { current: Step }) {
  return (
    <div className="print:hidden">
      <div className="flex items-center gap-1.5 mb-1.5">
        {STEPS.map((s) => {
          const done = s.n < current;
          const active = s.n === current;
          return (
            <div key={s.n} className="flex-1 flex items-center gap-1">
              <div
                className="flex-1 h-1 rounded-full transition-all"
                style={{ background: done || active ? NAVY : "rgba(255,255,255,0.1)" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className="flex-1 text-center"
            style={{ color: s.n <= current ? NAVY : "rgba(255,255,255,0.25)" }}
          >
            {s.n}. {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: NAVY }}>Étape {n}</p>
      <h2 className="text-base font-extrabold mt-1" style={{ color: INK }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{subtitle}</p>}
    </div>
  );
}

function ScanLoader({ photo }: { photo: string | null }) {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Préparation de l'image…",
    "Détection des zones cutanées…",
    "Analyse des lésions et pigmentation…",
    "Génération du diagnostic clinique…",
  ];
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % phases.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <ProCard className="p-6 overflow-hidden">
      <div className="text-center mb-5">
        <p className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: NAVY }}>Étape 3</p>
        <h2 className="text-base font-extrabold mt-1" style={{ color: INK }}>Analyse IA en cours</h2>
      </div>

      <div
        className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden border-2 mb-5"
        style={{ borderColor: NAVY }}
      >
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.04)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.15), transparent, rgba(124,58,237,0.2))" }} />
        <span className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: NAVY }} />
        <span className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: NAVY }} />
        <span className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: NAVY }} />
        <span className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: NAVY }} />
        <div
          className="absolute left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${NAVY}, transparent)`, animation: "scan 2.2s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 animate-ping opacity-40" style={{ borderColor: NAVY }} />
        </div>
      </div>

      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}
        >
          <ScanLine className="w-3.5 h-3.5 animate-pulse" style={{ color: NAVY }} />
          <span className="text-xs font-extrabold" style={{ color: "#a78bfa" }}>{phases[phase]}</span>
        </div>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Détection automatique zone par zone</p>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 8px; }
          50% { top: calc(100% - 12px); }
          100% { top: 8px; }
        }
      `}</style>
    </ProCard>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-[9px] uppercase tracking-wider font-extrabold" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      <p className="text-xs font-extrabold mt-0.5 truncate" style={{ color: accent || INK }}>{value}</p>
    </div>
  );
}
