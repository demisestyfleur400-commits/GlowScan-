import { useState, useRef, useEffect } from "react";
import html2pdf from "html2pdf.js";
import { catalog, formatPrice, getProductBrand } from "@shared/catalog";
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
  useProAccount,
  useGenerateQuestionnaire,
  useUpdatePatientStatus,
  type QuestionnaireItem,
} from "@/hooks/use-pro";
import { useAnalyze } from "@/hooks/use-scans";
import { useRealtimeScans } from "@/hooks/use-realtime";
import { useQrCode } from "@/hooks/use-qrcode";
import { useClinicalOverride } from "@/hooks/use-pro";
import { ClinicalOverride, type ClinicalOverrideData } from "@/components/ClinicalOverride";
import { lazy, Suspense } from "react";
const ResultCard = lazy(() =>
  import("@/components/ResultCard").then((m) => ({ default: m.ResultCard }))
);
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult, Patient } from "@shared/schema";
import { ProLayout, ProCard, ProInput } from "@/components/ProLayout";
import { ClinicalDossierForm, type ClinicalRecord } from "@/components/pro/ClinicalDossierForm";
import { ExamenPhysiqueForm, EMPTY_EXAMEN, type ExamenData } from "@/components/pro/ExamenPhysiqueForm";
import PDFViewerModal from "@/components/PDFViewerModal";
import { PremiumPdfTemplate } from "@/templates/PremiumPdfTemplate";
import { buildObservationDoc, type ObservationData } from "@/lib/observationPdf";
import { VoiceButton } from "@/components/VoiceButton";
import { ToxicAlert } from "@/components/ToxicAlert";
import { detectToxicProducts } from "@/lib/toxic-products";

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
type PatientStatus = "priority" | "monitoring" | "stable" | "resolved";
type AnswerValue = "oui" | "non" | "nsp";

const STEPS = [
  { n: 1, label: "Patient" },
  { n: 2, label: "Examen" },
  { n: 3, label: "Analyse IA" },
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

// ─────────────────────────────────────────────────────────────────────────────
// QuickAnnotate — Widget 30s d'enrichissement dermatologique
// Les dermatologues croient compléter leur dossier clinique.
// En réalité : ils construisent GlowScan AI dataset — 10 000 cas classés.
// ─────────────────────────────────────────────────────────────────────────────
const PHOTOTYPES = [
  { id: "IV",  label: "IV",  bg: "#c8956c", title: "Phototype IV — Peau brun clair / métissée" },
  { id: "V",   label: "V",   bg: "#8b5e3c", title: "Phototype V — Peau noire / brun foncé" },
  { id: "VI",  label: "VI",  bg: "#3b1f0e", title: "Phototype VI — Peau très foncée / ébène" },
] as const;

const LESION_OPTS = [
  { id: "macule",    label: "Macule" },
  { id: "papule",    label: "Papule" },
  { id: "pustule",   label: "Pustule" },
  { id: "nodule",    label: "Nodule" },
  { id: "comedon",   label: "Comédon" },
  { id: "plaque",    label: "Plaque" },
  { id: "squame",    label: "Squame" },
  { id: "cicatrice", label: "Cicatrice/PIH" },
  { id: "keloide",   label: "Chéloïde" },
];

const ZONE_OPTS = [
  { id: "front",   label: "Front" },
  { id: "joue_d",  label: "Joue D" },
  { id: "joue_g",  label: "Joue G" },
  { id: "nez",     label: "Nez/Zone T" },
  { id: "menton",  label: "Menton" },
  { id: "cou",     label: "Cou" },
  { id: "dos",     label: "Dos" },
  { id: "poitrine",label: "Décolleté" },
];

function QuickAnnotate({ scanId, condition }: { scanId?: number; condition?: string }) {
  const [phototype, setPhototype] = useState<string>("");
  const [lesions, setLesions] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [pihRisk, setPihRisk] = useState<string>("");
  const [keloidRisk, setKeloidRisk] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmit = async () => {
    if (!scanId || !phototype) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/training/annotate/${scanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phototype, lesionTypes: lesions, zonesAffected: zones, pihRisk, keloidRisk }),
      });
      const data = await r.json();
      setScore(data.annotationScore ?? null);
      setSubmitted(true);
    } catch {}
    setSubmitting(false);
  };

  if (!scanId) return null;

  if (submitted) {
    return (
      <div className="rounded-2xl p-3 mb-3 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <p className="text-xs font-extrabold" style={{ color: "#10b981" }}>✅ Données cliniques enregistrées</p>
        {score !== null && <p className="text-[10px] mt-0.5" style={{ color: "#6b7280" }}>Score annotation : {score}/100</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 mb-3 text-left" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[11px] font-extrabold mb-3" style={{ color: "#c4b5fd" }}>
        🧬 Données cliniques complémentaires
      </p>

      {/* Phototype */}
      <p className="text-[10px] font-bold mb-1.5" style={{ color: "#9ca3af" }}>Phototype Fitzpatrick</p>
      <div className="flex gap-2 mb-3">
        {PHOTOTYPES.map(p => (
          <button
            key={p.id}
            title={p.title}
            onClick={() => setPhototype(p.id)}
            className="flex-1 py-2 rounded-xl text-xs font-extrabold transition-all"
            style={{
              background: phototype === p.id ? p.bg : "rgba(255,255,255,0.06)",
              color: phototype === p.id ? "#fff" : "#9ca3af",
              border: phototype === p.id ? `2px solid ${p.bg}` : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Lésions */}
      <p className="text-[10px] font-bold mb-1.5" style={{ color: "#9ca3af" }}>Types de lésions</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {LESION_OPTS.map(l => (
          <button
            key={l.id}
            onClick={() => setLesions(prev => toggleArr(prev, l.id))}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
            style={{
              background: lesions.includes(l.id) ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
              color: lesions.includes(l.id) ? "#c4b5fd" : "#6b7280",
              border: lesions.includes(l.id) ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.08)",
            }}
          >{l.label}</button>
        ))}
      </div>

      {/* Zones */}
      <p className="text-[10px] font-bold mb-1.5" style={{ color: "#9ca3af" }}>Zones affectées</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ZONE_OPTS.map(z => (
          <button
            key={z.id}
            onClick={() => setZones(prev => toggleArr(prev, z.id))}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
            style={{
              background: zones.includes(z.id) ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)",
              color: zones.includes(z.id) ? "#93c5fd" : "#6b7280",
              border: zones.includes(z.id) ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)",
            }}
          >{z.label}</button>
        ))}
      </div>

      {/* Risques */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[10px] font-bold mb-1" style={{ color: "#9ca3af" }}>Risque PIH</p>
          <div className="flex gap-1">
            {["low","medium","high"].map(r => (
              <button key={r} onClick={() => setPihRisk(r)}
                className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                style={{
                  background: pihRisk === r ? (r === "high" ? "rgba(239,68,68,0.3)" : r === "medium" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.2)") : "rgba(255,255,255,0.04)",
                  color: pihRisk === r ? (r === "high" ? "#f87171" : r === "medium" ? "#fcd34d" : "#6ee7b7") : "#6b7280",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >{r === "low" ? "Faible" : r === "medium" ? "Moyen" : "Élevé"}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold mb-1" style={{ color: "#9ca3af" }}>Risque chéloïde</p>
          <div className="flex gap-1">
            {["low","medium","high"].map(r => (
              <button key={r} onClick={() => setKeloidRisk(r)}
                className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                style={{
                  background: keloidRisk === r ? (r === "high" ? "rgba(239,68,68,0.3)" : r === "medium" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.2)") : "rgba(255,255,255,0.04)",
                  color: keloidRisk === r ? (r === "high" ? "#f87171" : r === "medium" ? "#fcd34d" : "#6ee7b7") : "#6b7280",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >{r === "low" ? "Faible" : r === "medium" ? "Moyen" : "Élevé"}</button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!phototype || submitting}
        className="w-full py-2 rounded-xl text-xs font-extrabold transition-all"
        style={{
          background: phototype ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.05)",
          color: phototype ? "#fff" : "#4b5563",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Enregistrement..." : "Valider les données cliniques"}
      </button>
    </div>
  );
}

/**
 * Extrait la liste (dédupliquée) des produits du protocole clinique DERM.
 * En mode DERM, les produits vivent dans clinicalProtocol.morning/evening[].product
 * (et non plus dans recommendations.products comme en B2C).
 */
function getProtocolProducts(r: any): string[] {
  const cp = r?.clinicalProtocol || {};
  const steps = [...(cp.morning || []), ...(cp.evening || [])];
  const names = steps
    .map((s: any) => (typeof s?.product === "string" ? s.product.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(names));
}

export default function ProAnalyze() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createPatient = useCreatePatient();
  const attach = useAttachScanToPatient();
  const validate = useValidateScan();
  const analyze = useAnalyze();
  const genQuestionnaire = useGenerateQuestionnaire();
  const updateStatus = useUpdatePatientStatus();
  const { data: patientsData } = useProPatients("");
  const { data: accountData } = useProAccount();

  // ⚠️ IMPORTANT: TOUS les useState DOIVENT être déclarés AVANT les hooks qui les utilisent
  // Sinon : temporal dead zone error dans les hooks

  // Step 1 : choix patient
  const [step, setStep] = useState<Step>(1);
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
  // Fonction de génération du PDF unifié (B2C + pages médicales), exposée par ResultCard
  const pdfFnRef = useRef<(() => void) | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Step 3 : Diagnostic
  const [result, setResult] = useState<(AnalysisResult & { savedScanId?: number }) | null>(null);

  // Step 4 : Questionnaire IA
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // Step 5 : Confirmation
  const [dossierSaved, setDossierSaved] = useState(false);
  const [datasetSent, setDatasetSent] = useState(false);
  const [savingDossier, setSavingDossier] = useState(false);

  // PDF Viewer
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfHtml, setPdfHtml] = useState("");

  // Antécédents patient (TÂCHE 1)
  const [antecedentsOpen, setAntecedentsOpen] = useState(false);
  const [problemDuration, setProblemDuration] = useState("");
  const [patientRegion, setPatientRegion] = useState("");
  const [previousProducts, setPreviousProducts] = useState("");
  const [allergies, setAllergies] = useState("");
  const [consultMotif, setConsultMotif] = useState("");

  // Examen physique (Étape 2/3) — documenté AVANT la photo et l'IA
  const [examen, setExamen] = useState<ExamenData>({ ...EMPTY_EXAMEN });

  // Dossier clinique structuré (Étape 1) — stocké en JSON, miroir vers le pipeline IA
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecord>({});
  useEffect(() => {
    const cr = clinicalRecord;
    setConsultMotif(cr.motif || "");
    setProblemDuration(cr.hmaDebut || "");
    setPreviousProducts(cr.atcdCosmeto || "");
    setPatientRegion(cr.ville || "");
    setAllergies([cr.allergMedic, cr.allergAlimentaires, cr.allergEnv, cr.atopie].filter(Boolean).join(" ; "));
  }, [clinicalRecord]);

  // Notes cliniques du praticien
  const [practitionerNotes, setPractitionerNotes] = useState("");
  // Étape 7 — choix du rapport remis au patient : fusionné (IA + clinique) / clinique seul / IA seul.
  const [reportMode, setReportMode] = useState<"fusionne" | "clinique" | "ia">("fusionne");

  // Clinical Override
  const [showPartialOverride, setShowPartialOverride] = useState(false);
  const [showFullManual, setShowFullManual] = useState(false);
  const [overrideType, setOverrideType] = useState<"none" | "partial" | "full">("none");
  const [overrideCondition, setOverrideCondition] = useState("");
  const [overrideSeverity, setOverrideSeverity] = useState("Modérée");
  const [overrideScore, setOverrideScore] = useState(70);
  const [overrideSummary, setOverrideSummary] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Clinical override state
  const [override, setOverride] = useState<ClinicalOverrideData | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");

  // Classification (TÂCHE 4)
  const [selectedStatus, setSelectedStatus] = useState<PatientStatus | null>(null);

  // 🔑 Détecter le rôle de l'utilisateur : doctor ou secretary
  const userRole = accountData?.user?.role;
  const isDoctor = userRole === "doctor";

  // ✅ NOW safe to use: useRealtimeScans(patientId), useQrCode(result), etc.
  // Real-time sync: subscribe to scans updates
  useRealtimeScans(patientId || undefined);

  // QR code for PDF
  const { qrSvg } = useQrCode(result?.savedScanId, patientId || undefined);

  // Clinical override
  const clinicalOverride = useClinicalOverride();

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
        loadPatientDossier(p.id);
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
        clinicalRecord,
      });
      // Secrétaire : elle remplit le questionnaire puis ENVOIE au médecin (pas d'examen).
      // Le patient apparaît dans « patients en attente » du dermatologue.
      if (!isDoctor) {
        try {
          await fetch(`/api/pro/patients/${r.patient.id}/submit-for-review`, { method: "POST", credentials: "include" });
        } catch {}
        toast({ title: "Dossier envoyé au médecin ✅", description: `${firstName} ${lastName} est en attente d'analyse.` });
        resetAll();
        return;
      }
      setPatientId(r.patient.id);
      setPatient(r.patient);
      setStep(2);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // Charge le dossier clinique déjà saisi (par la secrétaire ou lors d'une visite
  // précédente) pour que le médecin REPRENNE sans re-saisir. Met à jour clinicalRecord
  // (le useEffect mirroir remplit motif/durée/produits/allergies/région).
  const loadPatientDossier = async (id: number) => {
    try {
      const res = await fetch(`/api/pro/patients/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const d = await res.json();
      const cr = d?.patient?.clinicalRecord;
      if (cr && typeof cr === "object") setClinicalRecord(cr);
    } catch {}
  };

  const selectExisting = (p: Patient) => {
    setPatient(p);
    setPatientId(p.id);
    setLastName(p.lastName);
    setFirstName(p.firstName);
    setAge(p.age?.toString() || "");
    setSex((p.sex as any) || "—");
    setPhone(p.whatsappNumber || "");
    loadPatientDossier(p.id);
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
      const r = await analyze.mutateAsync({
        image: photoBase64,
        area: "face",
        intake: {
          fullName: `${firstName} ${lastName}`.trim() || undefined,
          phone: phone || undefined,
          age: age ? `${age} ans` : undefined,
          duration: problemDuration || undefined,
          previousProducts: previousProducts || undefined,
          allergies: allergies || undefined,
          consultMotif: consultMotif || undefined,
          region: patientRegion || undefined,
          motif: consultMotif || undefined,
          // Examen physique du médecin (documenté AVANT l'IA) → contexte clinique
          examen: {
            phototype: examen.phototype || undefined,
            lesionsElementaires: examen.lesions.length ? examen.lesions.join(", ") : undefined,
            zonesAtteintes: examen.zones.length ? examen.zones.join(", ") : undefined,
            nombre: examen.lesionNombre || undefined,
            morphologie: examen.lesionMorphologie || undefined,
            distribution: examen.lesionDistribution || undefined,
            peau: examen.examPeau || undefined,
            phaneres: examen.examPhaneres || undefined,
            muqueuses: examen.examMuqueuses || undefined,
            ganglions: examen.examGanglions || undefined,
            autresSignes: examen.autresSignes || undefined,
            keloidRisk: examen.keloidRisk || undefined,
            keloidDetails: (examen.keloidAntecedents || examen.keloidLocalisation || examen.keloidAnciennete || examen.keloidSymptomes)
              ? [examen.keloidAntecedents, examen.keloidLocalisation, examen.keloidAnciennete, examen.keloidSymptomes].filter(Boolean).join(" · ")
              : undefined,
          },
        },
      });
      setResult(r as any);
      // Enregistre l'examen physique du médecin comme annotation dataset (fire-and-forget)
      const sid = (r as any).savedScanId;
      if (sid && (examen.phototype || examen.lesions.length > 0)) {
        fetch(`/api/training/annotate/${sid}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ phototype: examen.phototype, lesionTypes: examen.lesions, zonesAffected: examen.zones, pihRisk: examen.pihRisk, keloidRisk: examen.keloidRisk }),
        }).catch(() => {});
      }
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
      toast({
        title: "Erreur de connexion — réessayez",
        description: "Le service IA est momentanément indisponible. Reprends la photo et relance l'analyse.",
        variant: "destructive",
      });
      setStep(2); // retour à la prise de photo
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

  // ─── Step 4 → 5 : sauver dossier (TÂCHE 5 — robuste) ──────────────
  const saveDossier = async () => {
    setStep(5);
    setSavingDossier(true);
    if (!patientId) {
      console.error("[pro/save] ❌ patientId manquant");
      setSavingDossier(false);
      setDossierSaved(true);
      return;
    }

    let scanId = (result as any)?.savedScanId;

    // Tentative 1 : utilise savedScanId si dispo
    if (scanId) {
      try {
        await attach.mutateAsync({
          scanId,
          patientId,
          clinicalContext: {
            questionnaire: answers,
            questionnaireItems: questionnaire,
            antecedents: { problemDuration, previousProducts, allergies, consultMotif }, examen,
            answeredAt: new Date().toISOString(),
          },
        });
      } catch (err: any) {
        console.warn("[pro/save] attach tentative 1 échoué:", err?.message);
        // Tentative 2 : récupère le dernier scan du patient
        try {
          const r = await fetch(`/api/pro/patients/${patientId}`, { credentials: "include" });
          if (r.ok) {
            const d = await r.json();
            const latestScan = d.scans?.[0];
            if (latestScan?.id) {
              scanId = latestScan.id;
              await attach.mutateAsync({ scanId, patientId, clinicalContext: {} });
            }
          }
        } catch (err2: any) {
          console.warn("[pro/save] attach tentative 2 échoué:", err2?.message);
          toast({
            title: "Diagnostic enregistré",
            description: "Attachement manuel requis depuis le dossier patient.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Pas de savedScanId → fetch le dernier scan
      try {
        const r = await fetch(`/api/pro/patients/${patientId}`, { credentials: "include" });
        if (r.ok) {
          const d = await r.json();
          const latestScan = d.scans?.[0];
          if (latestScan?.id) {
            scanId = latestScan.id;
            await attach.mutateAsync({
              scanId,
              patientId,
              clinicalContext: {
                questionnaire: answers,
                questionnaireItems: questionnaire,
                antecedents: { problemDuration, previousProducts, allergies, consultMotif }, examen,
                answeredAt: new Date().toISOString(),
              },
            });
          }
        }
      } catch (err: any) {
        console.warn("[pro/save] fallback attach échoué:", err?.message);
      }
    }

    // Valider pour RLHF si on a un scanId
    if (scanId) {
      try {
        await validate.mutateAsync({ scanId, isVerified: true, expertNote: null });
        setDatasetSent(true);
      } catch {}
    }

    setSavingDossier(false);
    setDossierSaved(true);
    toast({ title: `Dossier de ${firstName || lastName} mis à jour ✅`, description: "Visible dans Patients > Dossier" });
  };

  // ─── Actions finales ──────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!phone) {
      toast({ title: "Pas de téléphone", description: "Patient sans WhatsApp", variant: "destructive" });
      return;
    }
    const products = getProtocolProducts(result).map(p => p.split(" — ")[0]).slice(0, 3).join(", ") || "—";
    const msg = encodeURIComponent(
      `Bonjour ${firstName} ${lastName},\n\n` +
        `Voici votre rapport GlowScan :\n` +
        `• Diagnostic : ${result?.condition || "—"}\n` +
        `• Glow Score : ${result?.score || 0}/100\n` +
        `• Produits recommandés : ${products}\n\n` +
        `— Cabinet GlowScan DERM`
    );
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  // ── Extract PDF data helper ──
  const extractPdfData = () => {
    const r = result as any;
    if (!r) return null;

    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    // Référence TRAÇABLE : basée sur le scan réel (jamais aléatoire).
    const refNum = (r as any).reference
      || ((r as any).savedScanId ? `GS-${new Date().getFullYear()}-${String((r as any).savedScanId).padStart(4, "0")}` : null)
      || (patientId ? `GS-${new Date().getFullYear()}-P${patientId}` : `GS-${new Date().getFullYear()}-PENDING`);
    const protocol = r.clinicalProtocol || {};
    const morning: any[] = protocol.morning || r.protocol?.morning || [];
    const evening: any[] = protocol.evening || r.protocol?.evening || [];

    const effectiveCondition = overrideType !== "none" && overrideCondition ? overrideCondition : r.condition || "—";
    const effectiveSeverity = overrideType !== "none" ? overrideSeverity : r.severity || "—";
    const effectiveScore = overrideType !== "none" ? overrideScore : r.score || "—";

    interface OrderLine { name: string; brand: string; price: number }
    const orderLines: OrderLine[] = [];
    const seenIds = new Set<string>();
    for (const step of [...morning, ...evening]) {
      if (!step?.product) continue;
      const productText = (step.product as string).toLowerCase();
      const match = catalog.find(p => {
        const n = p.name.toLowerCase();
        return productText.includes(n) || n.split(" ").slice(0, 3).every((w: string) => productText.includes(w));
      });
      if (match && !seenIds.has(match.id)) {
        seenIds.add(match.id);
        orderLines.push({ name: match.name, brand: match.brand || getProductBrand(match), price: match.price || 0 });
      }
    }

    return {
      date,
      refNum,
      result: r,
      effectiveCondition,
      effectiveSeverity,
      effectiveScore,
      morning,
      evening,
      orderLines,
      totalEstime: orderLines.reduce((s, l) => s + l.price, 0),
    };
  };

  // ── Generate classic PDF HTML (template clinique complet — utilisé en DERM) ──
  const generateClassicPdfHtml = (qrCodeSvg?: string): string | undefined => {
    const data = extractPdfData();
    if (!data) return undefined;

    const { date, refNum, result: r, effectiveCondition, effectiveSeverity, effectiveScore, morning, evening, orderLines, totalEstime } = data;
    const clinicalSummary: string = r.clinicalSummary || r.details || "";
    // Résumé affiché : note du Clinical Override si présente, sinon résumé clinique IA.
    const effectiveSummary: string = (overrideType !== "none" && overrideSummary) ? overrideSummary : clinicalSummary;
    const zonesAnalysis: any[] = r.zonesAnalysis || [];
    const toxicIngredients: any[] = r.toxicIngredients || [];
    const logistics: string = r.logistics || "";
    const antecedentsIntegration: string = r.antecedentsIntegration || "";
    const prognostic: string = r.prognostic || "";
    const redFlags: string[] = r.redFlags || [];
    const confidence: string = r.confidence || "";
    const followUp: string = r.clinicalProtocol?.followUpWeeks ? `Suivi recommandé dans ${r.clinicalProtocol.followUpWeeks} semaines.` : "";

    // ── Identité du MÉDECIN (depuis le compte cabinet, pas le patient) ──
    const doctorName = accountData?.account?.fullName || "—";
    const doctorCabinet = accountData?.account?.cabinetName || "";
    const doctorCity = accountData?.account?.city || "";
    const doctorLicense = (accountData?.account as any)?.licenseNumber || "";
    // ── Fitzpatrick extrait du skinType (ex : "... · Fitzpatrick V") ──
    const fitzMatch = (r.skinType || "").match(/Fitzpatrick\s+(VI|IV|V|III|II|I)/i);
    const fitzpatrick = fitzMatch ? `Fitzpatrick ${fitzMatch[1].toUpperCase()}` : (r.skinType || "—");
    const sexLabel = sex === "F" ? "Féminin" : sex === "M" ? "Masculin" : "—";

    const overrideBadge = overrideType === "partial"
      ? `<span style="display:inline-block;background:#7c3aed;color:#fff;font-size:8px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px">✓ Révisé par Dr. ${firstName || lastName || "..."}</span>`
      : overrideType === "full"
      ? `<span style="display:inline-block;background:#1a3a3a;color:#fff;font-size:8px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px">📝 Diagnostic établi par Dr. ${firstName || lastName || "..."}</span>`
      : "";

    const TEAL = "#1a3a3a";
    const GOLD_BADGE = "#f59e0b";

    const sectionHeader = (title: string) =>
      `<div style="background:${TEAL};padding:9px 16px;border-radius:4px 4px 0 0"><span style="font-size:10.5px;font-weight:800;color:#fff;letter-spacing:.5px;text-transform:uppercase">${title}</span></div>`;

    const sectionWrap = (title: string, content: string) =>
      `<div style="margin-bottom:18px;border:1px solid #d1d5db;border-radius:4px;overflow:hidden">${sectionHeader(title)}<div style="background:#fff;padding:14px 16px">${content}</div></div>`;

    const infoRowClin = (label: string, value: string) =>
      `<div style="display:flex;gap:0;margin-bottom:6px"><div style="width:200px;font-size:10px;font-weight:700;color:#374151;flex-shrink:0">${label}</div><div style="font-size:10px;color:#1a1a1a;flex:1">${value}</div></div>`;

    const zoneRow = (z: any, i: number) => {
      const statusColor = z.status === "Sévèrement affecté" ? "#dc2626" : z.status === "Modérément affecté" ? "#d97706" : z.status === "Légèrement affecté" ? "#2563eb" : "#059669";
      return `<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e5e7eb"><div style="font-size:10.5px;font-weight:800;color:#1a1a1a;margin-bottom:4px"><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:${TEAL};color:#fff;font-size:9px;font-weight:800;border-radius:50%;margin-right:6px">${i+1}</span>${z.zone || ""} — <span style="color:${statusColor}">${z.status || ""}</span></div>${z.findings ? `<div style="font-size:10px;color:#374151;line-height:1.8;margin-left:26px">${z.findings}</div>` : ""}${z.risk ? `<div style="font-size:9.5px;color:#dc2626;font-weight:700;margin-top:5px;margin-left:26px;padding:5px 8px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:0 4px 4px 0">⚠ Risque : ${z.risk}</div>` : ""}</div>`;
    };

    const toxicRow = (t: any) => {
      const name = typeof t === "string" ? t : (t.ingredient || "");
      const reason = typeof t === "object" ? (t.reason || "") : "";
      return `<div style="display:flex;align-items:flex-start;gap:0;margin-bottom:6px;border:1px solid #fca5a5;border-radius:3px;overflow:hidden"><div style="background:#dc2626;color:#fff;font-size:13px;font-weight:900;padding:8px 11px;flex-shrink:0;display:flex;align-items:center;justify-content:center">✗</div><div style="padding:8px 12px;background:#fef2f2;flex:1"><div style="font-size:10px;font-weight:700;color:#7f1d1d">${name}</div>${reason ? `<div style="font-size:9.5px;color:#991b1b;margin-top:2px;line-height:1.6">${reason}</div>` : ""}</div></div>`;
    };

    const getBadge = (s: any, i: number): string => {
      const freq = (s.frequency || "").toLowerCase();
      if (freq.includes("quotidien") || freq.includes("matin") || freq.includes("soir")) return `<div style="background:#6b7280;color:#fff;font-size:8px;font-weight:700;padding:3px 8px;border-radius:3px;text-align:center;line-height:1.4">Usage<br>quotidien</div>`;
      if (i === 0) return `<div style="background:${TEAL};color:#fff;font-size:8px;font-weight:700;padding:3px 8px;border-radius:3px;text-align:center;line-height:1.4">Obligatoire</div>`;
      return `<div style="background:${GOLD_BADGE};color:#fff;font-size:8px;font-weight:700;padding:3px 8px;border-radius:3px;text-align:center;line-height:1.4">Prioritaire</div>`;
    };

    const stepRow = (s: any, i: number, globalIdx: number) => {
      if (!s) return "";
      const numStr = String(globalIdx + 1).padStart(2, "0");
      return `<div style="display:flex;gap:0;margin-bottom:10px;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;align-items:stretch"><div style="background:${TEAL};color:#fff;font-size:13px;font-weight:900;padding:12px 14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;min-width:42px">${numStr}</div><div style="padding:10px 14px;flex:1"><div style="font-size:10.5px;font-weight:800;color:#1a1a1a;text-transform:uppercase;letter-spacing:.3px">${s.step || ""}</div>${s.product ? `<div style="font-size:9.5px;color:#374151;font-style:italic;margin-top:2px">Usage : ${s.product}${s.concentration ? ` — ${s.concentration}` : ""}${s.frequency ? ` — ${s.frequency}` : ""}</div>` : ""}${s.mechanism ? `<div style="font-size:9.5px;color:#4b5563;line-height:1.7;margin-top:5px">${s.mechanism}</div>` : ""}</div><div style="padding:10px 12px;display:flex;align-items:flex-start;flex-shrink:0">${getBadge(s, i)}</div></div>`;
    };

    // ══ Étape 10 — Rapport « Observation médicale » (trame cabinet, 16 rubriques) ══
    // Reproduit le plan d'observation médicale fourni : champs collectés pré-remplis,
    // rubriques non collectées en lignes vierges. Remplace l'ancien template ci-dessous.
    const cr: any = clinicalRecord || {};
    const joinNZ = (...xs: (string | undefined)[]) => xs.filter((x) => x && String(x).trim()).join("\n");
    const hmaText = joinNZ(
      cr.hmaDebut ? `Début / durée : ${cr.hmaDebut}` : (problemDuration ? `Durée : ${problemDuration}` : ""),
      cr.hmaInstallation ? `Installation : ${cr.hmaInstallation}` : "",
      cr.hmaEvolution ? `Évolution : ${cr.hmaEvolution}` : "",
      cr.hmaSymptomes ? `Symptômes associés : ${cr.hmaSymptomes}` : "",
      cr.hmaTraitements ? `Traitements entrepris : ${cr.hmaTraitements}` : "",
      cr.hmaConsultations ? `Consultations antérieures : ${cr.hmaConsultations}` : "",
      cr.hmaExamens ? `Examens déjà réalisés : ${cr.hmaExamens}` : "",
    );
    const keloidDetails = joinNZ(
      examen.keloidAntecedents ? `Antécédents : ${examen.keloidAntecedents}` : "",
      examen.keloidLocalisation ? `Localisation : ${examen.keloidLocalisation}` : "",
      examen.keloidAnciennete ? `Ancienneté : ${examen.keloidAnciennete}` : "",
      examen.keloidSymptomes ? `Symptômes : ${examen.keloidSymptomes}` : "",
    );
    const wProto: any = r.clinicalProtocol || {};
    const treatHtml = [
      morning.length ? `<div style="font-weight:800;color:${TEAL};font-size:9px;text-transform:uppercase;letter-spacing:.4px;margin:0 0 6px">🌞 Matin</div>` + morning.map((s: any, i: number) => stepRow(s, i, i)).join("") : "",
      evening.length ? `<div style="font-weight:800;color:${TEAL};font-size:9px;text-transform:uppercase;letter-spacing:.4px;margin:10px 0 6px">🌙 Soir</div>` + evening.map((s: any, i: number) => stepRow(s, i, morning.length + i)).join("") : "",
      wProto.weekly ? `<div style="font-weight:800;color:${TEAL};font-size:9px;text-transform:uppercase;letter-spacing:.4px;margin:10px 0 6px">📅 Hebdomadaire</div><div style="font-size:10px;color:#374151;line-height:1.7">${wProto.weekly}</div>` : "",
    ].filter(Boolean).join("") || undefined;

    const obs: ObservationData = {
      date, refNum, doctorName, doctorLicense, cabinetName: doctorCabinet, doctorCity, overrideBadge,
      patientPhoto: photoBase64 || undefined,
      // 1 · Identification
      patientName: `${firstName} ${lastName}`.trim() || undefined,
      dateNaissance: cr.dateNaissance, lieuNaissance: cr.lieuNaissance,
      age: age ? `${age} ans` : undefined, sex: sexLabel !== "—" ? sexLabel : undefined,
      ethnie: cr.ethnie, profession: cr.profession,
      ville: cr.ville || patientRegion || doctorCity, adresse: cr.adresse, phone: phone || undefined,
      email: cr.email, contactUrgence: cr.contactUrgence, religion: cr.religion, statutMarital: cr.statutMarital,
      // 2 · Motif
      motif: consultMotif || cr.motif,
      // 3 · Antécédents
      atcdCosmeto: cr.atcdCosmeto || previousProducts, atcdMedicaux: cr.atcdMedicaux, atcdChirurgicaux: cr.atcdChirurgicaux,
      allergAlimentaires: cr.allergAlimentaires, allergMedic: cr.allergMedic || (allergies || undefined), allergEnv: cr.allergEnv,
      atopie: cr.atopie, groupeSanguin: cr.groupeSanguin, rhesus: cr.rhesus, serologieHiv: cr.serologieHiv,
      gynecoObst: cr.gynecoObst, toxicologiques: cr.toxicologiques, atcdFamiliaux: cr.atcdFamiliaux,
      // 4 · Mode de vie
      modeVie: cr.modeVie,
      // 5 · HMA
      hma: hmaText,
      // 7 · Examen dermatologique
      phototype: examen.phototype ? `Fitzpatrick ${examen.phototype}` : (fitzpatrick !== "—" ? fitzpatrick : undefined),
      lesions: examen.lesions?.length ? examen.lesions.join(", ") : undefined,
      zones: examen.zones?.length ? examen.zones.join(", ") : undefined,
      nombre: examen.lesionNombre, morphologie: examen.lesionMorphologie, distribution: examen.lesionDistribution,
      examPeau: examen.examPeau, examPhaneres: examen.examPhaneres, examMuqueuses: examen.examMuqueuses,
      examGanglions: examen.examGanglions, autresSignes: examen.autresSignes,
      keloidRisk: examen.keloidRisk, keloidDetails,
      // 9 · Résumé syndromique
      resumeSyndromique: effectiveSummary || clinicalSummary,
      // 10 · Hypothèses
      hypotheses: effectiveCondition, hypothesesSecondaire: r.conditionSecondaire || undefined,
      // 11 · Différentiels
      differentiels: Array.isArray(r.differentialDiagnosis) ? r.differentialDiagnosis.join("\n") : undefined,
      // 14 · Traitement
      traitementHtml: treatHtml,
      // 15 · Surveillance
      surveillance: joinNZ(followUp, Array.isArray(redFlags) && redFlags.length ? `Signaux d'alarme : ${redFlags.join(" · ")}` : ""),
      // 16 · Évolution / pronostic
      evolution: prognostic,
      practitionerNotes: practitionerNotes?.trim() || undefined,
    };
    return buildObservationDoc(obs);

    // ── (legacy) ancien template, conservé pour référence, désormais inatteignable ──
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>GlowScan DERM — ${firstName} ${lastName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
  table{border-collapse:collapse;width:100%}
  td,th{vertical-align:top;padding:0}
  p{margin-bottom:5px}
  strong{font-weight:700}
</style>
</head><body>

<!-- ══ PAGE 1 ══ -->

<!-- HEADER CLINIQUE -->
<div style="background:${TEAL};padding:16px 28px;display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;align-items:center;gap:12px">
    <img src="${window.location.origin}/logo-glowscan-square.jpeg" alt="GlowScan" style="width:38px;height:38px;border-radius:8px;object-fit:cover" />
    <div>
      <div style="font-size:19px;font-weight:900;color:#fff;letter-spacing:1px">GlowScan DERM</div>
      <div style="font-size:8.5px;color:rgba(255,255,255,0.7);margin-top:2px">RAPPORT DE CONSULTATION DERMATOLOGIQUE</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="display:inline-block;background:#dc2626;color:#fff;font-size:7.5px;font-weight:800;padding:3px 9px;border-radius:4px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px">🔒 Document médical confidentiel</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.95);font-weight:700">Réf : ${refNum}</div>
    <div style="font-size:8.5px;color:rgba(255,255,255,0.65)">Date : ${date}</div>
  </div>
</div>

<div style="padding:18px 28px 0">

  <!-- BLOC MÉDECIN -->
  ${sectionWrap("Médecin", `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div style="flex:1">
        ${infoRowClin("Praticien", "Dr " + doctorName)}
        ${infoRowClin("Spécialité", "Dermatologue" + (doctorLicense ? " · N° ordre " + doctorLicense : ""))}
        ${doctorCabinet ? infoRowClin("Cabinet", doctorCabinet + (doctorCity ? " — " + doctorCity : "")) : (doctorCity ? infoRowClin("Ville", doctorCity) : "")}
      </div>
      <span style="display:inline-block;background:#059669;color:#fff;font-size:8px;font-weight:800;padding:4px 10px;border-radius:4px;white-space:nowrap;flex-shrink:0">✓ Validé cliniquement</span>
    </div>
  `)}

  <!-- INFORMATIONS PATIENT — 6 champs -->
  ${sectionWrap("Informations Patient", `
    ${infoRowClin("Nom complet", (firstName + " " + lastName).trim() || "—")}
    ${infoRowClin("Âge / Sexe", (age ? age + " ans" : "—") + " · " + sexLabel)}
    ${infoRowClin("Téléphone", phone || "—")}
    ${infoRowClin("Phototype", fitzpatrick)}
    ${infoRowClin("Ville", patientRegion || doctorCity || "—")}
    ${infoRowClin("Date de consultation", date)}
  `)}

  <!-- ANAMNÈSE COMPLÈTE -->
  ${sectionWrap("Anamnèse &amp; Antécédents", `
    ${problemDuration ? infoRowClin("Durée du problème", problemDuration) : ""}
    ${previousProducts ? infoRowClin("Produits déjà utilisés", previousProducts) : ""}
    ${allergies ? "<div style='display:flex;gap:0;margin-bottom:6px'><div style='width:200px;font-size:10px;font-weight:700;color:#374151;flex-shrink:0'>Allergies</div><div style='font-size:10px;color:#dc2626;flex:1;font-weight:700'>⚠ " + allergies + "</div></div>" : ""}
    ${consultMotif ? infoRowClin("Motif (mots du patient)", "« " + consultMotif + " »") : ""}
    ${antecedentsIntegration ? infoRowClin("Intégration clinique", antecedentsIntegration) : ""}
    ${questionnaire.filter((q:any)=>answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "").map((q:any)=>infoRowClin(q.label, String(answers[q.id]))).join("")}
    ${(problemDuration||previousProducts||allergies||consultMotif||antecedentsIntegration||Object.keys(answers||{}).length>0) ? "" : "<p style='font-size:10px;color:#6b7280;font-style:italic'>Aucun antécédent renseigné.</p>"}
  `)}

  <!-- SECTION 2 : DIAGNOSTIC -->
  ${sectionWrap("Diagnostic Clinique Visuel au Pixel (Détaillé)", `
    ${photoBase64 ? `<div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
      <img src="${photoBase64}" alt="Photo clinique" style="width:150px;height:150px;object-fit:cover;border-radius:6px;border:2px solid ${TEAL};flex-shrink:0" />
      <div style="flex:1">
        <div style="font-size:7.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Diagnostic principal</div>
        <div style="font-size:14px;font-weight:900;color:#1a1a1a;margin-bottom:4px">${effectiveCondition}${r.conditionSecondaire ? " + " + r.conditionSecondaire : ""}</div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:8px">${effectiveSeverity} · ${r.skinType || "—"}</div>
        <div style="display:inline-block;border:2px solid ${GOLD_BADGE};border-radius:6px;padding:6px 14px;text-align:center">
          <span style="font-size:7.5px;font-weight:700;color:${GOLD_BADGE};text-transform:uppercase;letter-spacing:.5px">Glow Score</span>
          <div style="font-size:26px;font-weight:900;color:${GOLD_BADGE};line-height:1.1">${effectiveScore}<span style="font-size:11px;color:#6b7280">/100</span></div>
        </div>
      </div>
    </div>` : ""}
    <p style="font-size:10.5px;color:#1a1a1a;line-height:1.8;margin-bottom:14px">
      L'analyse des clichés par l'imagerie GlowScan révèle une
      <strong>${r.skinType || effectiveCondition}</strong>.${overrideBadge}
      <span data-edit="observations">${effectiveSummary}</span>
    </p>
    ${zonesAnalysis.length > 0 ? zonesAnalysis.map(zoneRow).join("") : ""}
    <div style="display:flex;gap:16px;align-items:flex-start;margin-top:12px">
      <div style="border:2px solid ${GOLD_BADGE};border-radius:6px;padding:12px 16px;min-width:115px;text-align:center;flex-shrink:0">
        <div style="font-size:7.5px;font-weight:700;color:${GOLD_BADGE};text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">GLOW SCORE ACTUEL</div>
        <div style="font-size:44px;font-weight:900;color:${GOLD_BADGE};line-height:1">${effectiveScore}</div>
        <div style="font-size:8px;color:#6b7280;margin-top:2px">/100</div>
        ${effectiveScore ? "<div style='font-size:9px;color:#059669;font-weight:700;margin-top:4px'>Potentiel : +" + (100 - Number(effectiveScore)) + " pts</div>" : ""}
      </div>
      <div style="flex:1;font-size:10px;color:#374151;line-height:1.8">
        <strong style="color:#1a1a1a"><span data-edit="diagnostic">${effectiveCondition}</span></strong>${r.conditionSecondaire ? " + " + r.conditionSecondaire : ""}<br>
        <span style="color:#6b7280"><span data-edit="severite">${effectiveSeverity}</span> · ${r.skinType || "—"}</span>
        ${overrideType === "none" && confidence ? "<br><span style='color:#9ca3af;font-style:italic'>Confiance IA : " + confidence + "</span>" : ""}
        ${overrideReason ? "<br><span style='color:#92400e;font-size:9px;font-style:italic'>Note : " + overrideReason + "</span>" : ""}
        ${prognostic ? "<div style='margin-top:6px'>" + prognostic + "</div>" : ""}
      </div>
    </div>
  `)}

  <!-- SECTION 3 : REJET -->
  ${sectionWrap("Protocole de Rejet — Ingrédients Interdits", `
    <p style="font-size:10px;color:#374151;margin-bottom:10px">Vérifiez impérativement les étiquettes de vos produits actuels et bannissez :</p>
    ${toxicIngredients.length > 0
      ? toxicIngredients.map(toxicRow).join("")
      : "<p style='font-size:10px;color:#6b7280;font-style:italic'>Aucun ingrédient toxique critique identifié pour ce profil.</p>"
    }
  `)}

</div>

<!-- ══ PAGE 2 ══ -->
<div style="page-break-before:always;padding:18px 28px 0">

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb">
    <span style="font-size:10px;font-weight:700;color:${TEAL}">✦ GlowScan DERM · Suite du rapport</span>
    <span style="font-size:8.5px;color:#9ca3af">${firstName} ${lastName} · Réf ${refNum}</span>
  </div>

  <!-- SECTION 4 : PRODUITS PRESCRITS -->
  ${sectionWrap("Recommandations Produits — Routine Biologique Prescrite", `
    ${morning.length > 0 ? `
      <div style="font-size:9px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">🌞 Routine du Matin</div>
      ${morning.map((s,i) => stepRow(s, i, i)).join("")}` : ""}
    ${evening.length > 0 ? `
      <div style="font-size:9px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb;margin-top:${morning.length > 0 ? "12px" : "0"}">🌙 Routine du Soir</div>
      ${evening.map((s,i) => stepRow(s, i, morning.length + i)).join("")}` : ""}
    ${protocol.weekly ? `
      <div style="font-size:9px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb;margin-top:12px">📅 Soin Hebdomadaire</div>
      <div style="font-size:10px;color:#374151;line-height:1.7">${protocol.weekly}</div>` : ""}
    ${morning.length === 0 && evening.length === 0 ? "<p style='font-size:10px;color:#6b7280;font-style:italic'>Protocole en cours de génération.</p>" : ""}
  `)}

  <!-- SECTION 5 : BON DE COMMANDE -->
  ${orderLines.length > 0 ? sectionWrap("Bon de Commande — Produits à Commander", `
    <p style="font-size:9.5px;color:#374151;margin-bottom:10px">Commandez directement via WhatsApp GlowScan. Livraison sécurisée avec guide d'utilisation inclus.</p>
    <table style="border:1px solid #e5e7eb">
      <thead>
        <tr style="background:#f0fafa">
          <th style="padding:7px 10px;font-size:9px;font-weight:700;color:${TEAL};text-transform:uppercase;border-bottom:1px solid #e5e7eb;text-align:left">Produit</th>
          <th style="padding:7px 10px;font-size:9px;font-weight:700;color:${TEAL};text-transform:uppercase;border-bottom:1px solid #e5e7eb;text-align:left">Marque</th>
          <th style="padding:7px 10px;font-size:9px;font-weight:700;color:${TEAL};text-transform:uppercase;border-bottom:1px solid #e5e7eb;text-align:right">Prix</th>
        </tr>
      </thead>
      <tbody>
        ${orderLines.map((l: OrderLine, i: number) =>
          "<tr style='border-bottom:1px solid #f3f4f6;background:" + (i%2===0?"#fff":"#f9fafb") + "'>" +
          "<td style='padding:7px 10px;font-size:9.5px;font-weight:600;color:#1a1a1a'>" + l.name + "</td>" +
          "<td style='padding:7px 10px;font-size:9px;color:" + TEAL + ";font-weight:700'>" + l.brand + "</td>" +
          "<td style='padding:7px 10px;font-size:9.5px;font-weight:800;color:#1a1a1a;text-align:right;white-space:nowrap'>" + (l.price ? l.price.toLocaleString("fr-FR") + " FCFA" : "—") + "</td>" +
          "</tr>"
        ).join("")}
        <tr style="background:${TEAL}">
          <td colspan="2" style="padding:8px 10px;font-size:10px;font-weight:800;color:#fff">TOTAL PROTOCOLE COMPLET</td>
          <td style="padding:8px 10px;font-size:12px;font-weight:900;color:#fff;text-align:right">${totalEstime > 0 ? totalEstime.toLocaleString("fr-FR") + " FCFA" : "—"}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:8px;font-size:9px;color:#6b7280">📲 Commander : wa.me/237674377959 · Douala/Yaoundé 24-48h · Autres villes 3-5j via Finexs / General Express</div>
  `) : ""}

  ${redFlags.length > 0 ? sectionWrap("Signaux d'Alarme Cliniques", `
    ${redFlags.map((f:string) =>
      "<div style='display:flex;gap:8px;margin-bottom:6px'><span style='color:#dc2626;font-weight:900;flex-shrink:0'>▶</span><span style='font-size:10px;color:#dc2626;line-height:1.6'>" + f + "</span></div>"
    ).join("")}
  `) : ""}

  ${logistics && patientRegion && !["Douala","Yaoundé"].includes(patientRegion) ? sectionWrap("Logistique &amp; Expédition", `
    ${infoRowClin("Zone de livraison", patientRegion)}
    ${infoRowClin("Agences partenaires", "Finexs / General Express")}
    ${infoRowClin("Délai estimé", "3 à 5 jours ouvrés")}
    ${infoRowClin("Conditionnement", "Produits scellés + guide d'utilisation inclus")}
  `) : ""}

  <!-- PRONOSTIC & SUIVI -->
  ${(prognostic || followUp) ? sectionWrap("Pronostic &amp; Suivi Recommandé", `
    ${prognostic ? "<p style='font-size:10px;color:#374151;line-height:1.8;margin-bottom:" + (followUp ? "8px" : "0") + "'>" + prognostic + "</p>" : ""}
    ${followUp ? "<div style='font-size:10px;font-weight:700;color:" + TEAL + ";padding:8px 12px;background:#f0fafa;border-left:3px solid " + TEAL + ";border-radius:0 4px 4px 0'>📅 " + followUp + "</div>" : ""}
  `) : ""}

  <!-- NOTES PRATICIEN (si remplies) -->
  ${practitionerNotes.trim() ? `
  <div style="margin-bottom:16px;border:1px solid #7c3aed;border-radius:4px;overflow:hidden">
    <div style="background:#7c3aed;padding:9px 16px">
      <span style="font-size:10.5px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.5px">📝 Notes du Praticien</span>
    </div>
    <div style="background:#faf5ff;padding:14px 16px">
      <p style="font-size:10.5px;color:#4c1d95;line-height:1.8;font-style:italic"><span data-edit="notes">${practitionerNotes.replace(/\n/g, "<br>")}</span></p>
    </div>
  </div>` : ""}

  <!-- FOOTER -->
  <div style="border:1px solid #e5e7eb;border-radius:4px;padding:12px 16px;background:#f9fafb;margin-top:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div>
        <div style="font-size:10px;font-weight:800;color:${TEAL}">✦ GlowScan DERM · Analyse IA Dermatologique</div>
        <div style="font-size:8.5px;color:#6b7280;margin-top:2px">Spécialisé Peaux Africaines · Cameroun</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:9px;font-weight:700;color:#374151">Valable 3 mois · ${date}</div>
        <div style="font-size:8.5px;color:#9ca3af">Réf : ${refNum}</div>
      </div>
    </div>
    ${qrCodeSvg ? `<div style="text-align:center;margin-top:14px">
      <div style="font-size:8px;color:#6b7280;margin-bottom:4px">Suivi / vérification du dossier patient</div>
      <div style="display:inline-block;width:84px;height:84px">${qrCodeSvg}</div>
    </div>` : ""}

    <!-- BLOC SIGNATURE PRATICIEN -->
    <div style="margin-top:18px;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;background:#f9fafb">
      <div style="font-size:9px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">Signature du praticien</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <div style="font-size:8.5px;color:#6b7280;margin-bottom:4px">Signature :</div>
          <div style="height:40px;border-bottom:1px solid #d1d5db;margin-bottom:6px"></div>
          <div style="font-size:9px;font-weight:700;color:#374151">Dr ${doctorName}</div>
          <div style="font-size:8.5px;color:#6b7280">Dermatologue${doctorCabinet ? " · " + doctorCabinet : ""}${doctorLicense ? " · N° ordre " + doctorLicense : ""}</div>
        </div>
        <div>
          <div style="font-size:8.5px;color:#6b7280;margin-bottom:4px">Cachet du cabinet :</div>
          <div style="height:40px;border:1px dashed #d1d5db;border-radius:4px;display:flex;align-items:center;justify-content:center;margin-bottom:6px">
            <span style="font-size:8px;color:#d1d5db">Tampon ici</span>
          </div>
          <div style="font-size:8.5px;color:#6b7280">Date : ${date}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;line-height:1.7">
      🔒 Document médical confidentiel établi et validé par le praticien soussigné · Réf ${refNum} · À usage strictement professionnel et personnel au patient. GlowScan DERM © ${new Date().getFullYear()}.
    </div>
  </div>

</div>
</body></html>`;
    return html;
  };

  // ── Generate premium PDF HTML (with QR code) ──
  const generatePremiumPdfHtml = (qrCodeSvg?: string): string | undefined => {
    const data = extractPdfData();
    if (!data) return undefined;

    // Use premium template with QR code if available
    const patientObj: Patient = {
      id: patientId || 0,
      firstName,
      lastName,
      age: age ? parseInt(age) : undefined,
      sex: (sex as any) || "—",
      whatsappNumber: phone || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const override = overrideType !== "none" ? {
      condition: overrideCondition || data.result.condition,
      score: overrideScore || data.result.score || 50,
      explanation: overrideReason || overrideSummary || "Correction clinique",
    } : undefined;

    const html = PremiumPdfTemplate({
      patient: patientObj,
      analysis: data.result,
      doctorName: `${firstName} ${lastName}`.trim() || "Dermatologue",
      cabinetName: "GlowScan DERM",
      patientPhoto: photoBase64 || undefined,
      override,
      referenceNumber: data.refNum,
      qrCodeSvg,
    });

    return html;
  };

  // ── Main PDF export function ──
  const exportPdf = (returnHtml = false, qrCodeSvg?: string): string | undefined => {
    const r = result as any;
    if (!r) return returnHtml ? "" : undefined;
    if (!returnHtml && (!r.condition || r.condition === "Examen clinique en cours")) {
      alert("Attendez la fin de l'analyse IA avant de télécharger.");
      return undefined;
    }

    // DERM : toujours le template clinique complet (classic enrichi), avec le QR
    // intégré s'il est disponible. (Le template premium minimal n'est plus utilisé.)
    const html = generateClassicPdfHtml(qrCodeSvg);
    if (!html) return undefined;
    if (returnHtml) return html;

    // Generate PDF
    const data = extractPdfData();
    if (!data) return undefined;

    const element = document.createElement("div");
    element.innerHTML = html;
    html2pdf()
      .set({
        margin: 0,
        filename: `GlowScan-Pro-${data.result.firstName || firstName}-${data.result.lastName || lastName}-${data.refNum}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  const openPdfViewer = () => {
    const r = result as any;
    if (!r?.condition || r.condition === "Examen clinique en cours") {
      toast({ title: "Analyse non terminée", description: "Attendez la fin de l'analyse IA.", variant: "destructive" });
      return;
    }
    const html = exportPdf(true, qrSvg || undefined);
    if (!html) return;
    setPdfHtml(html);
    setShowPdfViewer(true);
  };

  const resetAll = () => {
    setStep(1);
    setPatientMode("choice");
    setPatient(null); setPatientId(null);
    setLastName(""); setFirstName(""); setAge(""); setSex("—"); setPhone("");
    setPhotoBase64(null); setPhotoSize(0);
    setResult(null);
    setQuestionnaire([]); setAnswers({});
    setDossierSaved(false); setDatasetSent(false); setSavingDossier(false);
    setProblemDuration(""); setPreviousProducts(""); setAllergies(""); setConsultMotif("");
    setClinicalRecord({});
    setExamen({ ...EMPTY_EXAMEN });
    setPractitionerNotes("");
    setSelectedStatus(null); setAntecedentsOpen(false);
  };

  const zones = result ? buildMockZones(result) : [];
  const allAnswered = questionnaire.length > 0 && questionnaire.every((q) => answers[q.id]);
  const patientLabel = `${firstName} ${lastName}`.trim() || "—";

  return (
    <ProLayout title="Analyser un patient" back="/derm/dashboard">
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
                  {/* ─── Dossier clinique structuré (démarche médicale) ─── */}
                  <div>
                    <p className="text-xs font-extrabold mb-2 px-1" style={{ color: "#a78bfa" }}>
                      🩺 Dossier clinique
                    </p>
                    <ClinicalDossierForm value={clinicalRecord} onChange={setClinicalRecord} />
                  </div>

                  <button
                    type="submit"
                    disabled={createPatient.isPending}
                    data-testid="button-create-patient"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-white text-sm font-extrabold disabled:opacity-50 active:scale-[0.98] transition-all"
                    style={{ background: NAVY }}
                  >
                    {createPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (isDoctor ? <>Créer & continuer <ArrowRight className="w-4 h-4" /></> : <>Envoyer au médecin <ArrowRight className="w-4 h-4" /></>)}
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
            <StepHeader n={2} title={`Examen de ${patientLabel}`} subtitle="Documentez votre examen physique, PUIS ajoutez la photo (l'IA vient après)." />

            {/* ── Récapitulatif du dossier saisi (ex. par la secrétaire) — repliable ── */}
            {(() => {
              const cr: any = clinicalRecord || {};
              const LABELS: [string, string][] = [
                ["motif", "Motif"],
                ["hmaDebut", "Début / durée"], ["hmaInstallation", "Installation"], ["hmaEvolution", "Évolution"],
                ["hmaSymptomes", "Symptômes"], ["hmaTraitements", "Traitements entrepris"],
                ["hmaConsultations", "Consultations antérieures"], ["hmaExamens", "Examens réalisés"],
                ["atcdCosmeto", "Antéc. cosmétologiques"], ["atcdMedicaux", "Antéc. médicaux"], ["atcdChirurgicaux", "Antéc. chirurgicaux"],
                ["allergAlimentaires", "Allergies alimentaires"], ["allergMedic", "Allergies médic."], ["allergEnv", "Allergies environ."],
                ["atopie", "Atopie"], ["groupeSanguin", "Groupe sanguin"], ["rhesus", "Rhésus"], ["serologieHiv", "Sérologie HIV"],
                ["gynecoObst", "Gynéco-obstétrical"], ["toxicologiques", "Toxicologiques"], ["atcdFamiliaux", "Antéc. familiaux"],
                ["modeVie", "Mode de vie"], ["profession", "Profession"], ["ethnie", "Ethnie"], ["ville", "Ville"],
              ];
              const rows = LABELS.filter(([k]) => (cr[k] || "").trim());
              if (rows.length === 0) return null;
              return (
                <details open className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
                  <summary className="cursor-pointer text-[12px] font-extrabold px-3 py-2.5" style={{ color: "#6ee7b7" }}>
                    📋 Dossier déjà rempli — {rows.length} champ{rows.length > 1 ? "s" : ""} (relire avant l'examen)
                  </summary>
                  <div className="px-3 pb-3 space-y-1.5">
                    {rows.map(([k, label]) => (
                      <div key={k} className="flex gap-2 text-[11.5px]">
                        <span className="font-extrabold flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)", minWidth: 130 }}>{label}</span>
                        <span style={{ color: "#f3f0ff" }}>{cr[k]}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })()}

            {/* ── Examen physique du médecin — AVANT la photo et l'IA (§2, §3) ── */}
            <div className="mb-4">
              <ExamenPhysiqueForm value={examen} onChange={setExamen} />
            </div>

            <p className="text-xs font-extrabold mb-2 px-1" style={{ color: "#a78bfa" }}>📷 Photo clinique</p>
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
                  accept="image/jpeg,image/png,image/webp,image/*"
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
              {isDoctor ? (
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
              ) : (
                <button
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-white text-sm font-extrabold opacity-40"
                  title="Seules les dermatologues peuvent lancer une analyse"
                  style={{ background: NAVY }}
                >
                  Analyse réservée au médecin
                  <Activity className="w-4 h-4" />
                </button>
              )}
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
                {/* ⚠️ Produit nocif identifié dans l'anamnèse (produits déclarés) */}
                <ToxicAlert
                  title="Produit nocif identifié dans l'anamnèse"
                  products={detectToxicProducts([previousProducts, clinicalRecord?.atcdCosmeto].filter(Boolean).join(", "))}
                />
                <Suspense fallback={
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
                  </div>
                }>
                  <ResultCard
                    result={result}
                    imageUrl={photoBase64}
                    userFirstName={firstName || lastName || undefined}
                    area="face"
                    isPro={true}
                    doctorName={accountData?.account?.fullName || undefined}
                    doctorLicense={(accountData?.account as any)?.licenseNumber || undefined}
                    cabinetName={accountData?.account?.cabinetName || undefined}
                    practitionerNotes={practitionerNotes || undefined}
                    overrideNote={overrideType !== "none" ? `${overrideCondition || ""}${overrideReason ? " — " + overrideReason : (overrideSummary ? " — " + overrideSummary : "")}`.trim() : undefined}
                    patientIntake={{
                      fullName: `${firstName} ${lastName}`.trim() || undefined,
                      phone: phone || undefined,
                      age: age ? `${age} ans` : undefined,
                      duration: problemDuration || undefined,
                      previousProducts: previousProducts || undefined,
                      allergies: allergies || undefined,
                      region: patientRegion || undefined,
                      motif: consultMotif || undefined,
                    }}
                    reportMode={reportMode}
                    clinicalRecord={clinicalRecord}
                    examen={examen}
                    onPdfReady={(fn) => { pdfFnRef.current = fn; }}
                  />
                </Suspense>

                {/* Notes cliniques praticien */}
                <div className="mt-5 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.15)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "rgba(167,139,250,0.5)" }}>
                      📝 Notes cliniques du praticien (optionnel) — incluses dans le PDF du patient
                    </p>
                    <VoiceButton value={practitionerNotes} onChange={(t) => setPractitionerNotes(t)} />
                  </div>
                  <textarea
                    value={practitionerNotes}
                    onChange={e => setPractitionerNotes(e.target.value)}
                    placeholder="Observations personnelles, recommandations complémentaires, notes de suivi..."
                    rows={4}
                    className="w-full outline-none resize-none"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(167,139,250,0.2)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "#f3f0ff",
                      minHeight: 100,
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* ══ CLINICAL OVERRIDE ══ */}
                <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.2)" }}>
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(124,58,237,0.08)" }}>
                    <div>
                      <p className="text-xs font-extrabold" style={{ color: "#a78bfa" }}>
                        ✏️ Clinical Override
                        {overrideType !== "none" && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#7c3aed", color: "#fff" }}>
                            {overrideType === "partial" ? "Corrigé partiellement" : "Diagnostic manuel"}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>Modifiez ou remplacez le diagnostic IA</p>
                    </div>
                    {overrideType !== "none" && (
                      <button onClick={() => { setOverrideType("none"); setShowPartialOverride(false); setShowFullManual(false); }}
                        className="text-[10px] font-bold" style={{ color: "rgba(167,139,250,0.6)" }}>
                        Annuler
                      </button>
                    )}
                  </div>

                  {/* Actions si pas encore d'override */}
                  {overrideType === "none" && !showPartialOverride && !showFullManual && (
                    <div className="px-4 py-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => { setShowPartialOverride(true); setOverrideCondition(result?.condition || ""); setOverrideScore(result?.score || 70); setOverrideSummary((result as any)?.clinicalSummary || result?.details || ""); }}
                        className="flex-1 text-xs font-extrabold py-2 rounded-xl transition-all active:scale-95"
                        style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
                      >
                        ✏️ Corriger le diagnostic IA
                      </button>
                      <button
                        onClick={() => { setShowFullManual(true); }}
                        className="flex-1 text-xs font-extrabold py-2 rounded-xl transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: DS.muted }}
                      >
                        📝 Diagnostic manuel complet
                      </button>
                    </div>
                  )}

                  {/* Formulaire correction partielle */}
                  {showPartialOverride && overrideType !== "full" && (
                    <div className="px-4 py-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Condition corrigée</label>
                        <input type="text" value={overrideCondition} onChange={e => setOverrideCondition(e.target.value)}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Sévérité</label>
                          <select value={overrideSeverity} onChange={e => setOverrideSeverity(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }}>
                            {["Légère", "Modérée", "Sévère", "Critique"].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Score ({overrideScore}/100)</label>
                          <input type="range" min={0} max={100} value={overrideScore} onChange={e => setOverrideScore(Number(e.target.value))}
                            className="w-full mt-2" style={{ accentColor: "#7c3aed" }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Évaluation clinique corrigée</label>
                        <textarea value={overrideSummary} onChange={e => setOverrideSummary(e.target.value)}
                          rows={3} className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Motif de correction (optionnel)</label>
                        <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                          placeholder="Ex: aspect clinique non capté par la photo..."
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }} />
                      </div>
                      <button onClick={() => { setOverrideType("partial"); setShowPartialOverride(false); }}
                        className="w-full py-2.5 rounded-full text-sm font-extrabold" style={{ background: "#7c3aed", color: "#fff" }}>
                        ✓ Valider ma correction
                      </button>
                    </div>
                  )}

                  {/* Formulaire diagnostic manuel complet */}
                  {showFullManual && overrideType !== "partial" && (
                    <div className="px-4 py-4 space-y-3">
                      <p className="text-[11px] font-bold" style={{ color: "#fbbf24" }}>
                        📝 Votre diagnostic remplace entièrement celui de l'IA dans le PDF
                      </p>
                      <div>
                        <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Diagnostic principal</label>
                        <input type="text" value={overrideCondition} onChange={e => setOverrideCondition(e.target.value)}
                          placeholder="Ex: Dermatite séborrhéique modérée..."
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Sévérité</label>
                          <select value={overrideSeverity} onChange={e => setOverrideSeverity(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }}>
                            {["Légère", "Modérée", "Sévère", "Critique"].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Score ({overrideScore}/100)</label>
                          <input type="range" min={0} max={100} value={overrideScore} onChange={e => setOverrideScore(Number(e.target.value))}
                            className="w-full mt-2" style={{ accentColor: "#7c3aed" }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1" style={{ color: DS.muted }}>Évaluation clinique complète</label>
                        <textarea value={overrideSummary} onChange={e => setOverrideSummary(e.target.value)}
                          rows={5} className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                          placeholder="Rédigez votre diagnostic complet ici..."
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: "#f3f0ff" }} />
                      </div>
                      <button onClick={() => { setOverrideType("full"); setShowFullManual(false); }}
                        className="w-full py-2.5 rounded-full text-sm font-extrabold" style={{ background: "#7c3aed", color: "#fff" }}>
                        ✓ Valider mon diagnostic
                      </button>
                    </div>
                  )}

                  {/* Confirmation override validé */}
                  {overrideType !== "none" && !showPartialOverride && !showFullManual && (
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(16,185,129,0.06)", borderTop: "1px solid rgba(16,185,129,0.2)" }}>
                      <span style={{ color: "#6ee7b7", fontSize: 14 }}>✓</span>
                      <p className="text-xs font-bold" style={{ color: "#6ee7b7" }}>
                        {overrideType === "partial" ? `Corrigé partiellement — "${overrideCondition}"` : `Diagnostic manuel — "${overrideCondition}"`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
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
                    Continuer vers l'anamnèse
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
                    {getProtocolProducts(result).length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] mt-1" style={{ color: DS.muted }}>
                        <CheckCircle2 className="w-3 h-3" style={{ color: "#6ee7b7" }} />
                        {getProtocolProducts(result).length} produit(s) recommandé(s)
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

                  {/* ─── Classification patient (TÂCHE 4) ─── */}
                  <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.15)" }}>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider mb-3" style={{ color: DS.muted }}>Classer ce patient :</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { v: "priority" as PatientStatus, label: "Priorité haute", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
                        { v: "monitoring" as PatientStatus, label: "En suivi", color: NAVY, bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)" },
                        { v: "stable" as PatientStatus, label: "Stable", color: GREEN, bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
                        { v: "resolved" as PatientStatus, label: "Résolu", color: DS.muted, bg: "rgba(255,255,255,0.04)", border: DS.border },
                      ]).map(opt => {
                        const on = selectedStatus === opt.v;
                        return (
                          <button
                            key={opt.v}
                            onClick={async () => {
                              setSelectedStatus(opt.v);
                              if (patientId) {
                                try { await updateStatus.mutateAsync({ id: patientId, status: opt.v }); }
                                catch {}
                              }
                            }}
                            className="py-2 px-3 rounded-xl text-xs font-extrabold transition-all active:scale-[0.97]"
                            style={on
                              ? { background: opt.bg, border: `1.5px solid ${opt.border}`, color: opt.color }
                              : { background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}`, color: DS.muted }
                            }
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedStatus && (
                      <p className="text-[10px] mt-2 text-center" style={{ color: DS.muted }}>
                        ✓ Statut mis à jour
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {/* ── Choix du rapport (Étape 7) ── */}
                  <div className="mb-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: DS.muted }}>
                      Type de rapport remis au patient
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { v: "fusionne", label: "Fusionné", sub: "IA + clinique" },
                        { v: "clinique", label: "Clinique", sub: "médecin seul" },
                        { v: "ia", label: "IA", sub: "analyse seule" },
                      ] as const).map((opt) => {
                        const on = reportMode === opt.v;
                        return (
                          <button
                            key={opt.v}
                            onClick={() => setReportMode(opt.v)}
                            data-testid={`report-mode-${opt.v}`}
                            className="py-2 px-2 rounded-xl text-center transition-all active:scale-[0.97]"
                            style={on
                              ? { background: "rgba(16,185,129,0.12)", border: "1.5px solid rgba(16,185,129,0.5)" }
                              : { background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}` }}
                          >
                            <span className="block text-xs font-extrabold" style={{ color: on ? "#6ee7b7" : DS.body }}>{opt.label}</span>
                            <span className="block text-[9px] mt-0.5" style={{ color: DS.muted }}>{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Bouton principal PDF ── */}
                  <button
                    onClick={() => {
                      // Clinique seul → template clinique pur (generateClassicPdfHtml via openPdfViewer).
                      // Fusionné / IA seul → PDF ResultCard (la section médicale est omise en mode IA).
                      if (reportMode === "clinique") { openPdfViewer(); }
                      else if (pdfFnRef.current) { pdfFnRef.current(); }
                      else { openPdfViewer(); } // filet de secours
                    }}
                    data-testid="button-pdf"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full text-white font-extrabold active:scale-[0.98] transition-all mb-3"
                    style={{ background: NAVY, fontSize: 14 }}
                  >
                    <FileText className="w-4 h-4" />
                    {reportMode === "clinique" ? "Voir le rapport clinique" : reportMode === "ia" ? "Voir le rapport IA" : "Voir le rapport complet"}
                  </button>
                  <p className="text-[11px] text-center mb-4" style={{ color: DS.muted }}>
                    Résultats de la consultation · Dr {lastName || "..."} — Modifier · Envoyer · Télécharger
                  </p>

                  {/* Examen physique désormais collecté AVANT l'analyse (étape 2) */}

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => patientId && setLocation(`/derm/patient/${patientId}`)}
                      data-testid="button-view-dossier"
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Voir le dossier
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
                  <p className="text-sm font-extrabold" style={{ color: INK }}>Enregistrement en cours...</p>
                  <p className="text-xs mt-1" style={{ color: DS.muted }}>Rattachement du diagnostic au dossier patient</p>
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

      {/* ── PDF Viewer Modal ── */}
      <PDFViewerModal
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        htmlContent={pdfHtml}
        filename={`GlowScan_${firstName || lastName}_${new Date().toISOString().slice(0,10)}.pdf`}
        patientFirstName={firstName || lastName || "Patient"}
        patientPhone={phone || undefined}
        dermatologue={`Dr. ${lastName} ${firstName}`.trim()}
      />
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
  const [progress, setProgress] = useState(0);
  const phases = [
    "Préparation de l'image…",
    "Analyse des zones cutanées…",
    "Calibration Fitzpatrick IV–VI…",
    "Détection des lésions et de la pigmentation…",
    "Intégration des antécédents patient…",
    "Génération du rapport clinique…",
  ];
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % phases.length), 2200);
    // Progression "asymptotique" : monte vite puis ralentit vers ~92% sans jamais
    // atteindre 100% tant que l'IA n'a pas répondu (honnête, pas de fausse fin).
    const pr = setInterval(() => setProgress((v) => v + (92 - v) * 0.06), 400);
    return () => { clearInterval(t); clearInterval(pr); };
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

        {/* Barre de progression */}
        <div className="w-full max-w-xs mx-auto h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(92, Math.round(progress))}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", transition: "width 0.4s ease-out" }}
          />
        </div>

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Analyse Llama 4 · peut prendre jusqu'à 1 minute</p>
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
