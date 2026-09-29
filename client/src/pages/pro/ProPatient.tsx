import { followupsStoppedNote } from "@shared/whatsappMessages";
import { useState, useEffect } from "react";
import html2pdf from "html2pdf.js";
import { Link, useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  MessageCircle,
  FileText,
  ScanLine,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  Sparkles,
  Loader2,
  Camera,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  BellRing,
  Send,
  X as XIcon,
  Phone,
} from "lucide-react";
import {
  usePatientDossier,
  useValidateScan,
  useDeletePatient,
  useProAccount,
  useUpdatePatientStatus,
  useAddFollowUpPhoto,
  useFollowUpReminder,
  useCreatePeerReview,
  useTrackPatientOpen,
} from "@/hooks/use-pro";
import { Users, Lock } from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";
import { ProLayout, ProCard, ProInput, PATIENT_STATUS, patientStatusOf, type PatientStatus } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { formatCmPhone } from "@shared/phone";
import { CaseAuditTrail } from "@/components/pro/CaseAuditTrail";
import PDFViewerModal from "@/components/PDFViewerModal";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "./ProDashboard";

const NAVY = "var(--color-accent)";
const INK = "var(--color-text)";
const GREEN = "var(--color-accent-2-600)";

const DS = {
  body: "var(--color-neutral-800)",
  muted: "var(--color-neutral-700)",
  border: "var(--color-divider)",
};

export default function ProPatient() {
  const [, params] = useRoute("/derm/patient/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : null;
  const { data, isLoading } = usePatientDossier(id);
  const { data: accData } = useProAccount();
  // Reprise auto : mémorise ce dossier comme « dernier ouvert » (médecin only,
  // filtré côté serveur). Best-effort, ne bloque jamais l'affichage.
  const trackOpen = useTrackPatientOpen();
  useEffect(() => {
    if (id && Number.isFinite(id)) trackOpen.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const validate = useValidateScan();
  const del = useDeletePatient();
  const updateStatus = useUpdatePatientStatus();
  const { toast } = useToast();
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfHtml, setPdfHtml] = useState("");
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [validateNote, setValidateNote] = useState("");
  const [validateCorrection, setValidateCorrection] = useState("");
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  if (isLoading || !data) return <LoadingScreen />;

  const { patient: p, scans } = data;
  const lastScan = scans[0];
  const previousScan = scans[1];
  const dermato = accData?.account;
  const isSecretary = accData?.user?.role === "secretary";

  // Étape 5 — primauté du diagnostic validé par le médecin. Si le médecin a corrigé
  // (expertCorrectedCondition) on affiche SA correction, sinon le diagnostic IA.
  const dxOf = (s?: { expertCorrectedCondition?: string | null; condition?: string | null } | null) =>
    (s?.expertCorrectedCondition && String(s.expertCorrectedCondition).trim()) || s?.condition || "—";

  const sendWhatsApp = () => {
    if (!p.whatsappNumber) {
      toast({ title: "Pas de WhatsApp", description: "Ce patient n'a pas de numéro enregistré.", variant: "destructive" });
      return;
    }
    if (!lastScan) return;
    const products = (lastScan.recommendations as any)?.products?.slice(0, 3).join(", ") || "";
    const msg = encodeURIComponent(
      `Bonjour ${p.firstName}, suite à votre analyse GlowScan du ${new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")},\n` +
        `voici votre diagnostic : ${dxOf(lastScan)}.\n` +
        (products ? `Produits recommandés : ${products}.\n` : "") +
        `Prochaine étape : ${lastScan.motivation || "rescannez dans 4 semaines pour mesurer votre progression."}\n\n` +
        `— ${dermato?.fullName || "Votre dermato"}\nvia GlowScan DERM`
    );
    const phone = p.whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const exportPdf = (returnHtml = false): string | undefined => {
    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const refNum = `GS-PRO-${new Date().getFullYear()}-${p.id.toString().padStart(5,"0")}`;
    const lastResult = (lastScan?.recommendations as any) || {};
    const morning: any[] = (lastResult as any)?.protocol?.morning || (lastScan as any)?.protocol?.morning || [];
    const evening: any[] = (lastResult as any)?.protocol?.evening || (lastScan as any)?.protocol?.evening || [];
    const allScans = scans || [];

    const renderStep = (s: any, i: number) => {
      const st = typeof s === "object" ? s : { step: String(s) };
      return `<div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start">
        <div style="min-width:20px;height:20px;border-radius:50%;background:#7c3aed;color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
        <div><div style="font-size:11px;font-weight:700;color:#1f2937">${st.step||""}</div>${st.product?`<div style="font-size:10px;color:#7c3aed">${st.product}</div>`:""}</div>
      </div>`;
    };

    const statusLabel = (s: string) => ({
      priority:"Priorité haute", monitoring:"En suivi", stable:"Stable",
      resolved:"Résolu", red:"Attention", yellow:"Suivi", green:"Stable"
    }[s] || s);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>GlowScan DERM — Dossier ${p.firstName} ${p.lastName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;background:#fff;font-size:12px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}@page{margin:0}}
.header{background:#F6FAFD;padding:18px 24px;display:flex;justify-content:space-between}
.brand{font-size:20px;font-weight:900;color:#7c3aed}.pro-badge{font-size:9px;font-weight:700;color:#0369A1;background:rgba(124,58,237,.2);padding:2px 8px;border-radius:4px;margin-top:3px;display:inline-block}
.h-title{font-size:13px;font-weight:700;color:#0F172A;margin:4px 0 2px}.h-sub{font-size:8px;color:#0369A1;margin-bottom:8px}.h-meta{font-size:8px;color:#6b7280}
.stamp{border:2px solid #7c3aed;border-radius:8px;padding:8px 12px;text-align:center;min-width:90px}
.stamp-t{font-size:8px;font-weight:700;color:#0369A1;text-transform:uppercase}.stamp-v{font-size:16px;font-weight:900;color:#7c3aed}
.body{padding:16px 24px}.section{margin-top:14px}
.sec-title{font-size:10px;font-weight:800;color:#7c3aed;letter-spacing:.7px;text-transform:uppercase;padding-bottom:4px;border-bottom:2px solid #e8e3ff;margin-bottom:8px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8f7ff;border:1px solid #e8e3ff;border-radius:8px;padding:12px}
.lbl{font-size:8px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.05em}.val{font-size:12px;font-weight:700;color:#F6FAFD}
.scan-row{display:grid;grid-template-columns:90px 60px 1fr auto;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;border:1px solid #e8e3ff;margin-bottom:4px}
.scan-date{font-size:9px;color:#6b7280}.scan-score{font-size:18px;font-weight:900;color:#7c3aed;text-align:center}
.scan-cond{font-size:10px;font-weight:700;color:#1f2937}.scan-sev{font-size:8px;padding:1px 6px;border-radius:4px}
.evol-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;display:flex;align-items:center;gap:12px}
.clin-box{background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;padding:10px;font-size:10px;line-height:1.7;color:#374151}
.protocol-lbl{font-size:9px;font-weight:700;padding:5px 8px;border-radius:5px;margin-bottom:6px}
.footer{background:#F6FAFD;padding:12px 24px;display:flex;align-items:center;gap:12px;margin-top:16px}
.f-text{flex:1;font-size:7px;color:#0369A1;line-height:1.5}.f-brand{font-size:13px;font-weight:900;color:#7c3aed}
.cta-btn{display:block;text-align:center;background:#7c3aed;color:#fff;padding:10px;border-radius:8px;font-weight:800;font-size:13px;border:none;cursor:pointer;width:100%;margin:12px 0 4px}
.validity{background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:8px 12px;font-size:9px;color:#92400e;margin-top:12px}
</style></head><body>
<div class="header">
  <div>
    <div class="brand">✦ GlowScan</div>
    <div class="pro-badge">PRO — Dossier Patient</div>
    <div class="h-title">Dossier de Consultation — ${p.firstName} ${p.lastName}</div>
    <div class="h-sub">Cabinet ${dermato?.cabinetName || "GlowScan DERM"} · ${dermato?.fullName || "Dermatologue"}</div>
    <div class="h-meta">Généré le : <b style="color:#0369A1">${date}</b> &nbsp;|&nbsp; Réf : <b style="color:#0369A1">${refNum}</b></div>
  </div>
  <div class="stamp"><div class="stamp-t">Dossier</div><div class="stamp-v">Pro</div><div class="stamp-t">GlowScan</div></div>
</div>
<div class="body">
  <div class="no-print" style="text-align:center;padding:12px 0 4px">
    <button class="cta-btn" onclick="window.print()">Télécharger en PDF</button>
    <p style="font-size:10px;color:#9ca3af">Enregistrer en PDF dans le menu d'impression</p>
  </div>

  <div class="section">
    <div class="sec-title">Informations Patient</div>
    <div class="info-grid">
      <div><div class="lbl">Nom complet</div><div class="val">${p.firstName} ${p.lastName}</div></div>
      <div><div class="lbl">Téléphone</div><div class="val">${p.whatsappNumber || "—"}</div></div>
      <div><div class="lbl">Âge</div><div class="val">${p.age ? p.age + " ans" : "—"}</div></div>
      <div><div class="lbl">Sexe</div><div class="val">${p.sex === "F" ? "Femme" : p.sex === "M" ? "Homme" : "—"}</div></div>
      <div><div class="lbl">Statut actuel</div><div class="val">${statusLabel(p.status || "")}</div></div>
      <div><div class="lbl">Consultations</div><div class="val">${allScans.length} analyse(s)</div></div>
    </div>
  </div>

  ${allScans.length >= 2 ? `
  <div class="section">
    <div class="sec-title">Évolution Glow Score</div>
    <div class="evol-box">
      <div style="text-align:center"><div style="font-size:9px;color:#6b7280">${new Date(allScans[allScans.length-1].createdAt!).toLocaleDateString("fr-FR")}</div><div style="font-size:28px;font-weight:900;color:#7c3aed">${allScans[allScans.length-1].score}</div><div style="font-size:8px;color:#6b7280">J0</div></div>
      <div style="flex:1;text-align:center;font-size:22px;color:#9ca3af">→</div>
      <div style="text-align:center"><div style="font-size:9px;color:#6b7280">${new Date(allScans[0].createdAt!).toLocaleDateString("fr-FR")}</div><div style="font-size:28px;font-weight:900;color:${(allScans[0].score||0)>=(allScans[allScans.length-1].score||0)?"#10b981":"#f59e0b"}">${allScans[0].score}</div><div style="font-size:8px;color:#6b7280">JN</div></div>
      <div style="text-align:center;padding:0 12px"><div style="font-size:9px;color:#6b7280">Évolution</div><div style="font-size:22px;font-weight:900;color:${((allScans[0].score||0)-(allScans[allScans.length-1].score||0))>=0?"#10b981":"#f59e0b"}">${((allScans[0].score||0)-(allScans[allScans.length-1].score||0))>=0?"+":""}${(allScans[0].score||0)-(allScans[allScans.length-1].score||0)} pts</div></div>
    </div>
  </div>` : ""}

  <div class="section">
    <div class="sec-title">Historique des Analyses</div>
    ${allScans.map((s, i) => `
    <div class="scan-row" style="${i===0?"background:rgba(124,58,237,.04);border-color:rgba(124,58,237,.3)":""}">
      <div class="scan-date">${new Date(s.createdAt!).toLocaleDateString("fr-FR", {day:"numeric",month:"short",year:"numeric"})}</div>
      <div class="scan-score">${s.score}<span style="font-size:9px;color:#9ca3af">/100</span></div>
      <div><div class="scan-cond">${dxOf(s)}</div></div>
      <div><span class="scan-sev" style="background:${s.severity==="Sévère"?"rgba(239,68,68,.1)":s.severity==="Modérée"?"rgba(251,191,36,.1)":"rgba(16,185,129,.1)"};color:${s.severity==="Sévère"?"#ef4444":s.severity==="Modérée"?"#f59e0b":"#10b981"}">${s.severity||"—"}</span></div>
    </div>`).join("")}
  </div>

  ${lastScan ? `
  <div class="section">
    <div class="sec-title">Dernier Diagnostic Complet (${new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")})</div>
    <div style="display:flex;gap:12px;margin-bottom:10px">
      <div style="flex:1;background:#f8f7ff;border:1px solid #e8e3ff;border-radius:8px;padding:10px">
        <div class="lbl">Condition</div>
        <div style="font-size:14px;font-weight:800;color:#F6FAFD;margin-top:2px"><span data-edit="diagnostic">${dxOf(lastScan)}</span></div>
        <div style="font-size:10px;color:#6b7280;margin-top:2px">${lastScan.skinType||""}</div>
      </div>
      <div style="background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.3);border-radius:8px;padding:10px;text-align:center;min-width:80px">
        <div class="lbl">Score</div>
        <div style="font-size:32px;font-weight:900;color:#7c3aed;line-height:1">${lastScan.score}</div>
        <div style="font-size:9px;color:#6b7280">/100</div>
      </div>
    </div>
    ${(() => {
      const ex = ((lastScan.clinicalContext as any) || {}).examen as any | undefined;
      if (!ex) return "";
      const rows: [string, string][] = [];
      if (ex.phototype) rows.push(["Phototype", `Fitzpatrick ${ex.phototype}`]);
      if (ex.lesions?.length) rows.push(["Lésions élémentaires", ex.lesions.join(", ")]);
      if (ex.zones?.length) rows.push(["Localisation", ex.zones.join(", ")]);
      if (ex.lesionNombre) rows.push(["Nombre", ex.lesionNombre]);
      if (ex.lesionMorphologie) rows.push(["Morphologie", ex.lesionMorphologie]);
      if (ex.lesionDistribution) rows.push(["Distribution", ex.lesionDistribution]);
      if (ex.examPeau) rows.push(["Peau", ex.examPeau]);
      if (ex.examPhaneres) rows.push(["Phanères", ex.examPhaneres]);
      if (ex.examMuqueuses) rows.push(["Muqueuses", ex.examMuqueuses]);
      if (ex.examGanglions) rows.push(["Ganglions", ex.examGanglions]);
      if (ex.autresSignes) rows.push(["Autres signes", ex.autresSignes]);
      if (ex.keloidRisk) rows.push(["Risque chéloïde", ex.keloidRisk]);
      if (ex.keloidAntecedents) rows.push(["Chéloïde — antécédents", ex.keloidAntecedents]);
      if (ex.keloidLocalisation) rows.push(["Chéloïde — localisation", ex.keloidLocalisation]);
      if (ex.keloidAnciennete) rows.push(["Chéloïde — ancienneté", ex.keloidAnciennete]);
      if (ex.keloidSymptomes) rows.push(["Chéloïde — symptômes", ex.keloidSymptomes]);
      if (rows.length === 0) return "";
      return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;margin-bottom:8px">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#059669;margin-bottom:6px">Examen du médecin</div>
        ${rows.map(([k, v]) => `<div style="display:flex;gap:8px;font-size:11px;margin-bottom:3px"><span style="font-weight:800;color:#6b7280;min-width:110px">${k}</span><span style="color:#F6FAFD">${v}</span></div>`).join("")}
      </div>`;
    })()}
    ${lastScan.details ? `<div class="clin-box"><span data-edit="observations">${lastScan.details}</span></div>` : `<span data-edit="observations" style="display:none"></span>`}
  </div>` : ""}

  ${(morning.length > 0 || evening.length > 0) ? `
  <div class="section">
    <div class="sec-title">Protocole de Traitement</div>
    ${morning.length > 0 ? `<div class="protocol-lbl" style="background:#fffbeb;color:#92400e">Matin</div>${morning.map(renderStep).join("")}` : ""}
    ${evening.length > 0 ? `<div class="protocol-lbl" style="background:#ede9fe;color:#5b21b6;margin-top:8px">Soir</div>${evening.map(renderStep).join("")}` : ""}
  </div>` : ""}

  <div class="validity"><b>Dossier mis à jour le ${date}</b> · Réf : ${refNum} · Cabinet ${dermato?.cabinetName || "GlowScan DERM"}</div>
</div>
<div class="footer">
  <div class="f-text">Document médical confidentiel établi et validé par le praticien soussigné · Réf ${refNum} · À usage strictement professionnel. À conserver dans le dossier médical du patient.</div>
  <div class="f-brand">✦ GlowScan DERM</div>
</div></body></html>`;
    if (returnHtml) return html;

    const element = document.createElement("div");
    element.innerHTML = html;
    html2pdf()
      .set({
        margin: 0,
        filename: `GlowScan-Pro-${p.firstName}-${p.lastName}-${refNum}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  const openPdfViewer = () => {
    const html = exportPdf(true);
    if (!html) return;
    setPdfHtml(html);
    setShowPdfViewer(true);
  };

  const handleValidate = async (scanId: number, isVerified: boolean) => {
    try {
      await validate.mutateAsync({ scanId, isVerified, expertNote: validateNote, expertCorrectedCondition: validateCorrection });
      toast({ title: isVerified ? "Diagnostic validé" : "Diagnostic rejeté", description: isVerified ? "Validation enregistrée." : "Sera réévalué." });
      setValidatingId(null);
      setValidateNote("");
      setValidateCorrection("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer le dossier de ${p.firstName} ${p.lastName} ?`)) return;
    await del.mutateAsync(p.id);
    setLocation("/derm/patients");
  };

  const daysSinceLast = lastScan?.createdAt
    ? Math.floor((Date.now() - new Date(lastScan.createdAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const showReminder = daysSinceLast !== null && daysSinceLast >= 30;
  const evolution = lastScan && previousScan ? (lastScan.score || 0) - (previousScan.score || 0) : null;

  const firstScan = scans.length ? scans[scans.length - 1] : null;
  const scoreOf = (s?: any) => (typeof s?.score === "number" && s.score > 0 ? s.score : null);
  const current = scoreOf(lastScan);
  const delta = current != null && scans.length >= 2 && scoreOf(firstScan) != null ? current - (scoreOf(firstScan) as number) : null;
  const sinceMonth = firstScan?.createdAt ? new Date(firstScan.createdAt).toLocaleDateString("fr-FR", { month: "long" }) : "";
  const phototype = ((lastScan?.clinicalContext as any)?.examen?.phototype as string | undefined) || null;
  const phone = p.whatsappNumber ? formatCmPhone(p.whatsappNumber) : null;
  const meta = [p.age ? `${p.age} ans` : null, p.sex === "F" ? "Femme" : p.sex === "M" ? "Homme" : null, phototype ? `Phototype ${phototype}` : null, phone]
    .filter(Boolean).join(" · ");
  const st = patientStatusOf(p.status);
  const reco: any = (lastScan?.recommendations as any) || {};
  const steps: any[] = [...(reco?.protocol?.morning || (lastScan as any)?.protocol?.morning || []), ...(reco?.protocol?.evening || (lastScan as any)?.protocol?.evening || [])];
  const treatment = (steps.length ? steps : (reco?.products || []).map((x: any) => ({ product: x })))
    .map((x: any) => (typeof x === "object" ? { name: x.product || x.step || "", how: x.product ? x.step || "" : "" } : { name: String(x), how: "" }))
    .filter((t: any) => t.name)
    .slice(0, 6);
  const note = noteDraft ?? (lastScan as any)?.dermatoNote ?? "";
  const saveNote = async () => {
    if (!lastScan) return;
    setNoteSaving(true);
    try {
      const r = await fetch(`/api/pro/scans/${(lastScan as any).id}/note`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || "Note non enregistrée");
      (lastScan as any).dermatoNote = note;
      setNoteDraft(null);
      toast({ title: "Note enregistrée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setNoteSaving(false); }
  };
  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";

  return (
    <ProLayout>
      <Link href="/derm/patients" className="text-[13px] font-bold text-organic-accent-700 no-underline" data-testid="link-back">← Patientèle</Link>

      <header className="flex flex-wrap items-center gap-organic-4">
        <span className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full bg-organic-accent-200 font-heading text-[26px] text-organic-accent-800">
          {(p.firstName[0] || "").toUpperCase()}{(p.lastName[0] || "").toUpperCase()}
        </span>
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <h1 className="m-0 text-[clamp(28px,4vw,38px)]" data-testid="text-patient-name">{p.firstName} {p.lastName}</h1>
          <span className="text-[14px] text-organic-neutral-700">{meta}</span>
        </div>
        <div className="flex flex-wrap gap-organic-2">
          <Button variant="secondary" onClick={sendWhatsApp} data-testid="button-whatsapp"><Phone size={16} /> Rappel WhatsApp</Button>
          <Button onClick={() => setLocation(`/derm/analyse?patient=${p.id}`)} data-testid="button-new-scan"><Camera size={16} /> Photo de contrôle</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 self-start rounded-card bg-organic-surface p-1 sm:rounded-pill" role="radiogroup" aria-label="Statut du patient">
        {(Object.keys(PATIENT_STATUS) as PatientStatus[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={st === k} disabled={isSecretary}
            onClick={() => updateStatus.mutateAsync({ id: p.id, status: k as any })}
            className={`cursor-pointer rounded-pill border-0 px-4 py-2 font-body text-[13px] font-bold disabled:cursor-default ${st === k ? "bg-organic-accent text-organic-bg" : "bg-transparent text-organic-text"}`}
            data-testid={`status-${k}`}>
            {PATIENT_STATUS[k].label}
          </button>
        ))}
      </div>

      {showReminder && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-organic-accent-100 px-organic-4 py-3">
          <span className="text-[14px] font-semibold text-organic-accent-900">Pas de contrôle depuis {daysSinceLast} jours.</span>
          <Button variant="ghost" onClick={sendWhatsApp} data-testid="button-send-reminder">Envoyer un rappel WhatsApp</Button>
        </div>
      )}

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-organic-4">
        <div className={`${card} items-start gap-organic-4`}>
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Glow Score actuel</span>
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--color-accent) ${(current ?? 0) * 3.6}deg, var(--color-accent-200) 0)` }}>
            <div className="flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full bg-organic-surface">
              <span className="font-heading text-[48px] leading-none">{current ?? "—"}</span>
              <span className="text-[12px] text-organic-neutral-700">sur 100</span>
            </div>
          </div>
          {delta != null && (
            <span className={`text-[14px] font-bold ${delta >= 0 ? "text-organic-accent-2-700" : "text-organic-accent-700"}`}>
              {delta >= 0 ? `+${delta} points depuis ${sinceMonth}` : `${delta} points depuis ${sinceMonth} — à surveiller`}
            </span>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Diagnostic principal</span>
            <span className="font-heading text-[20px] leading-tight">{lastScan ? dxOf(lastScan) : "Pas encore d'analyse"}</span>
          </div>
        </div>

        <div className={card}>
          <h3 className="m-0 text-[22px]">Historique des analyses</h3>
          {scans.length === 0 && (
            <Link href={`/derm/analyse?patient=${p.id}`} className="text-[14px] font-bold text-organic-accent-700" data-testid="link-first-scan">Lancer la première analyse</Link>
          )}
          {scans.map((s, i) => (
            <a key={s.id} href={`#scan-${s.id}`} className="flex items-center gap-3.5 rounded-pill bg-organic-bg px-2.5 py-2 text-organic-text no-underline">
              <span className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full font-heading text-[17px] ${i === 0 ? "bg-organic-accent text-organic-bg" : "bg-organic-neutral-200"}`}>
                {scoreOf(s) ?? "—"}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-bold">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                <span className="truncate text-[12px] text-organic-neutral-700">{i === scans.length - 1 && scans.length > 1 ? "Première analyse" : dxOf(s)}</span>
              </span>
            </a>
          ))}
        </div>

        <div className={card}>
          <h3 className="m-0 text-[22px]">Traitement en cours</h3>
          {treatment.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun traitement enregistré.</span>}
          {treatment.map((t: any, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-1 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[11px] font-bold text-organic-accent-2-800">{i + 1}</span>
              <span className="flex flex-col">
                <span className="text-[14px] font-bold">{t.name}</span>
                {t.how && <span className="text-[12px] text-organic-neutral-700">{t.how}</span>}
              </span>
            </div>
          ))}
          {lastScan && !isSecretary && (
            <label className="mt-1.5 flex flex-col gap-1.5">
              <span className="text-[12px] text-organic-neutral-700">Note clinique</span>
              <textarea value={note} onChange={(e) => setNoteDraft(e.target.value)} rows={3}
                placeholder="Observation, évolution, prochaine étape…"
                className="min-h-[90px] resize-y rounded-2xl border border-organic-divider bg-organic-bg px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent"
                data-testid="input-clinical-note" />
              {noteDraft != null && noteDraft !== ((lastScan as any)?.dermatoNote ?? "") && (
                <Button onClick={saveNote} isLoading={noteSaving} disabled={noteSaving} className="self-start" data-testid="button-save-note">Enregistrer la note</Button>
              )}
            </label>
          )}
        </div>
      </section>

      {lastScan && <EvolutionSection scan={lastScan as any} patientId={p.id} />}
      {scans.length > 0 && !isSecretary && <FollowUpReminderCard patient={p as any} patientId={p.id} />}
      {lastScan && !isSecretary && <PeerReviewButton scanId={(lastScan as any).id} condition={dxOf(lastScan)} />}

      {scans.length > 0 && (
        <h3 className="m-0 mt-2 text-[22px]">Détail des analyses</h3>
      )}
      {scans.length > 0 && (
        <div className="flex flex-col gap-organic-3">
          {scans.map((s) => (
            <ProCard key={s.id} className="scroll-mt-6 p-organic-4" id={`scan-${s.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold" style={{ color: INK }} data-testid={`text-condition-${s.id}`}>
                    {(s.expertCorrectedCondition && String(s.expertCorrectedCondition).trim()) || s.condition || "Diagnostic en attente"}
                  </p>
                  {s.expertCorrectedCondition && String(s.expertCorrectedCondition).trim() && (
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-accent-2-700)" }}>
                      ✓ Diagnostic validé par le médecin
                      {s.condition && s.condition !== s.expertCorrectedCondition ? ` · IA : ${s.condition}` : ""}
                    </p>
                  )}
                  <p className="text-[11px] mt-0.5" style={{ color: DS.muted }}>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                      : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-2xl font-extrabold" style={{ color: NAVY }}>{s.score}</p>
                  <p className="text-[9px] uppercase font-extrabold tracking-wider" style={{ color: DS.muted }}>Glow</p>
                </div>
              </div>

              {s.imageUrl && (
                <img
                  src={s.imageUrl}
                  alt=""
                  className="w-full h-44 object-cover rounded-xl mb-3"
                  style={{ border: `1px solid ${DS.border}` }}
                />
              )}

              {/* ══ SECTION MÉDECIN (primaire) — examen physique + note, mis en avant ══ */}
              {(() => {
                const ex = ((s.clinicalContext as any) || {}).examen as any | undefined;
                const rows: [string, string][] = [];
                if (ex) {
                  if (ex.phototype) rows.push(["Phototype", `Fitzpatrick ${ex.phototype}`]);
                  if (ex.lesions?.length) rows.push(["Lésions élémentaires", ex.lesions.join(", ")]);
                  if (ex.zones?.length) rows.push(["Localisation", ex.zones.join(", ")]);
                  if (ex.lesionNombre) rows.push(["Nombre", ex.lesionNombre]);
                  if (ex.lesionMorphologie) rows.push(["Morphologie", ex.lesionMorphologie]);
                  if (ex.lesionDistribution) rows.push(["Distribution", ex.lesionDistribution]);
                  if (ex.examPeau) rows.push(["Peau", ex.examPeau]);
                  if (ex.examPhaneres) rows.push(["Phanères", ex.examPhaneres]);
                  if (ex.examMuqueuses) rows.push(["Muqueuses", ex.examMuqueuses]);
                  if (ex.examGanglions) rows.push(["Ganglions", ex.examGanglions]);
                  if (ex.autresSignes) rows.push(["Autres signes", ex.autresSignes]);
                  if (ex.pihRisk) rows.push(["Risque PIH", ex.pihRisk]);
                  if (ex.keloidRisk) rows.push(["Risque chéloïde", ex.keloidRisk]);
                  if (ex.keloidAntecedents) rows.push(["Chéloïde — antécédents", ex.keloidAntecedents]);
                  if (ex.keloidLocalisation) rows.push(["Chéloïde — localisation", ex.keloidLocalisation]);
                  if (ex.keloidAnciennete) rows.push(["Chéloïde — ancienneté", ex.keloidAnciennete]);
                  if (ex.keloidSymptomes) rows.push(["Chéloïde — symptômes", ex.keloidSymptomes]);
                }
                if (rows.length === 0 && !s.dermatoNote) return null;
                return (
                  <div
                    className="rounded-xl p-3 mb-3"
                    style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.3)" }}
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--color-accent-2-700)" }}>
                      Examen du médecin
                    </p>
                    {rows.length > 0 && (
                      <div className="space-y-1.5">
                        {rows.map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-[11px]">
                            <span className="font-extrabold flex-shrink-0" style={{ color: DS.muted, minWidth: 96 }}>{k}</span>
                            <span style={{ color: INK }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {s.dermatoNote && (
                      <p className="text-[11px] leading-relaxed mt-2 pt-2" style={{ color: INK, borderTop: rows.length ? `1px solid ${DS.border}` : "none" }}>
                        <strong style={{ color: DS.body }}>Note :</strong> {s.dermatoNote}
                      </p>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const ctx = (s.clinicalContext as any) || {};
                const answers = ctx.questionnaire as Record<string, string> | undefined;
                const items = ctx.questionnaireItems as { id: string; label: string; axis: string }[] | undefined;
                if (!answers || !items || items.length === 0) return null;
                return (
                  <details
                    className="mb-2 rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${DS.border}` }}
                    data-testid={`questionnaire-${s.id}`}
                  >
                    <summary
                      className="cursor-pointer text-[11px] font-extrabold px-3 py-2 transition-colors"
                      style={{ color: DS.body, background: "var(--color-bg)" }}
                    >
                      Anamnèse ({Object.keys(answers).length} réponses)
                    </summary>
                    <div className="p-3 pt-0 space-y-1.5" style={{ background: "var(--color-bg)" }}>
                      {items.map((q) => {
                        const a = answers[q.id];
                        if (!a) return null;
                        const colorMap: any = {
                          oui: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "var(--color-accent-2-700)", label: "Oui" },
                          non: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", text: "var(--color-accent-700)", label: "Non" },
                          nsp: { bg: "var(--color-bg)", border: "var(--color-divider)", text: DS.muted, label: "NSP" },
                        };
                        const c = colorMap[a] || colorMap.nsp;
                        return (
                          <div key={q.id} className="flex items-start gap-2 text-[11px] pt-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded font-extrabold flex-shrink-0"
                              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                            >
                              {c.label}
                            </span>
                            <span style={{ color: DS.body }}>{q.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })()}

              {/* ══ SECTION IA (secondaire) — repliée, indicative, sous l'examen du médecin ══ */}
              {(() => {
                const fr = (s.recommendations as any)?._fullResult || {};
                const zones = fr.analyse_zones as Record<string, string> | undefined;
                const justif = fr.justification_score as string | undefined;
                const conseil = fr.conseil_expert as string | undefined;
                if (!s.analysis && !zones && !justif && !conseil) return null;
                return (
                  <details
                    className="mb-2 rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${DS.border}`, opacity: 0.92 }}
                    data-testid={`technical-${s.id}`}
                  >
                    <summary
                      className="cursor-pointer text-[11px] font-extrabold px-3 py-2"
                      style={{ color: DS.muted, background: "var(--color-bg)" }}
                    >
                      Analyse IA (indicative)
                    </summary>
                    <div className="p-3 pt-0 space-y-2" style={{ background: "var(--color-bg)" }}>
                      {s.analysis && (
                        <p className="text-[11px] leading-relaxed pt-2" style={{ color: DS.body }}>{s.analysis}</p>
                      )}
                      {zones && Object.entries(zones).map(([zone, desc]) => (
                        <div key={zone} className="text-[11px]">
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>{zone}</span>
                          <p className="leading-snug" style={{ color: DS.body }}>{desc}</p>
                        </div>
                      ))}
                      {justif && (
                        <div className="text-[11px] pt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Justification du score</span>
                          <p className="leading-snug" style={{ color: DS.body }}>{justif}</p>
                        </div>
                      )}
                      {conseil && (
                        <div
                          className="text-[11px] rounded-lg p-2"
                          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
                        >
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: "var(--color-accent-600)" }}>Conseil expert</span>
                          <p className="leading-snug mt-0.5" style={{ color: DS.body }}>{conseil}</p>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })()}

              {/* Brique 2 — Journal d'audit du cas (traçabilité) */}
              <div className="mt-2">
                <CaseAuditTrail scan={s as any} />
              </div>

              {s.isVerified && (
                <div
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold mt-2 px-2 py-1 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--color-accent-2-700)" }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Diagnostic validé {s.expertReviewer ? `· ${s.expertReviewer}` : ""}
                </div>
              )}

              {!s.isVerified && validatingId !== s.id && (
                <button
                  onClick={() => {
                    setValidatingId(s.id);
                    setValidateCorrection(s.expertCorrectedCondition || s.condition || "");
                  }}
                  data-testid={`button-validate-${s.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold hover:underline"
                  style={{ color: NAVY }}
                >
                  <Sparkles className="w-3 h-3" />
                  Valider le diagnostic
                </button>
              )}

              {validatingId === s.id && (
                <div className="mt-3 space-y-2 pt-3" style={{ borderTop: `1px solid ${DS.border}` }}>
                  <ProInput
                    value={validateCorrection}
                    onChange={(e) => setValidateCorrection(e.target.value)}
                    placeholder="Diagnostic corrigé (si nécessaire)"
                    testid={`input-correction-${s.id}`}
                  />
                  <textarea
                    value={validateNote}
                    onChange={(e) => setValidateNote(e.target.value)}
                    placeholder="Note dermato (optionnel)"
                    data-testid={`input-note-${s.id}`}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid rgba(167,139,250,0.2)",
                      color: INK,
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleValidate(s.id, true)}
                      disabled={validate.isPending}
                      data-testid={`button-confirm-validate-${s.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-white text-xs font-extrabold disabled:opacity-50 active:scale-[0.97] transition-all"
                      style={{ background: GREEN }}
                    >
                      {validate.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Valider
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleValidate(s.id, false)}
                      disabled={validate.isPending}
                      data-testid={`button-reject-${s.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "var(--color-accent-700)" }}
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => setValidatingId(null)}
                      className="px-3 py-2 rounded-full text-xs font-extrabold"
                      style={{ background: "var(--color-bg)", color: DS.muted }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </ProCard>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-organic-2">
        <Button variant="secondary" onClick={openPdfViewer} data-testid="button-pdf"><FileText size={16} /> Voir le dossier PDF</Button>
        {!isSecretary && (
          <Button variant="ghost" onClick={handleDelete} data-testid="button-delete"><Trash2 size={16} /> Supprimer le dossier</Button>
        )}
      </div>
      {/* ── PDF Viewer Modal ── */}
      <PDFViewerModal
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        htmlContent={pdfHtml}
        filename={`GlowScan_${p.firstName}_${new Date().toISOString().slice(0,10)}.pdf`}
        patientFirstName={p.firstName}
        patientPhone={p.whatsappNumber || undefined}
        dermatologue={dermato?.fullName || undefined}
        patientId={p.id}
      />
    </ProLayout>
  );
}

// ── Compression légère (canvas) pour les photos de contrôle ────────────────
async function compressForFollowUp(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponible"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Lecture échouée"));
    reader.readAsDataURL(file);
  });
}

// ── Section Suivi évolution : J0 (scan) vs photos de contrôle, comparées par IA ──
function EvolutionSection({ scan, patientId }: { scan: any; patientId: number }) {
  const { toast } = useToast();
  const addPhoto = useAddFollowUpPhoto(patientId);
  const followUps: any[] = Array.isArray(scan.followUpPhotos) ? scan.followUpPhotos : [];
  const j0Url: string = scan.imageUrl || "";
  const latest = followUps[followUps.length - 1] || null;
  // slider comparaison (0 = tout J0, 100 = tout Jx)
  const [slider, setSlider] = useState(50);
  const [busy, setBusy] = useState(false);

  const handleAdd = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Image uniquement", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const image = await compressForFollowUp(file);
      await addPhoto.mutateAsync({ scanId: scan.id, image });
      toast({ title: "Photo de contrôle ajoutée ✅", description: "Comparaison IA générée." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Ajout impossible", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const evoColor = (s: number) => (s > 8 ? GREEN : s < -8 ? "var(--color-accent-800)" : "var(--color-accent-600)");
  const EvoIcon = latest ? (latest.evolutionScore > 8 ? TrendingUp : latest.evolutionScore < -8 ? TrendingDown : Minus) : Minus;

  return (
    <ProCard className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: NAVY }} />
          <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>
            Suivi évolution
          </p>
        </div>
        <label
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold cursor-pointer active:scale-95 transition-all"
          style={{ background: busy ? "var(--color-divider)" : NAVY, color: busy ? DS.muted : "var(--color-neutral-100)" }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {busy ? "Analyse…" : "+ Photo de contrôle"}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
            onChange={(e) => handleAdd(e.target.files?.[0])} data-testid="input-followup-photo" />
        </label>
      </div>

      {followUps.length === 0 ? (
        <div className="text-center py-6 px-2 rounded-xl" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}` }}>
          <p className="text-sm font-bold mb-1" style={{ color: INK }}>Suivez l'évolution dans le temps</p>
          <p className="text-xs" style={{ color: DS.body }}>
            Ajoutez une photo de la même zone à J+30, J+60… GlowScan la compare à la photo initiale
            et mesure l'évolution.
          </p>
        </div>
      ) : (
        <>
          {/* Comparateur J0 | Jx avec slider */}
          <div className="relative rounded-xl overflow-hidden select-none" style={{ border: `1px solid ${DS.border}`, aspectRatio: "4/3", background: "var(--color-text)" }}>
            {j0Url && <img src={j0Url} alt="J0" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
            {latest?.photoUrl && (
              <img src={latest.photoUrl} alt="Jx" className="absolute inset-0 w-full h-full object-cover" draggable={false}
                style={{ clipPath: `inset(0 0 0 ${slider}%)` }} />
            )}
            {/* poignée */}
            <div className="absolute top-0 bottom-0" style={{ left: `${slider}%`, width: 2, background: "var(--color-bg)", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }} />
            <span className="absolute top-2 left-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: "rgba(15,23,42,0.7)", color: "var(--color-neutral-100)" }}>J0</span>
            <span className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.85)", color: "var(--color-neutral-100)" }}>J+{latest?.dayOffset ?? 0}</span>
            <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(Number(e.target.value))}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%]" data-testid="slider-evolution" />
          </div>

          {/* Verdict IA */}
          {latest && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold" style={{ color: evoColor(latest.evolutionScore) }}>
                  <EvoIcon className="w-4 h-4" />
                  {latest.evolutionScore > 0 ? "+" : ""}{latest.evolutionScore}% d'évolution
                </span>
                <span className="text-[10px]" style={{ color: DS.muted }}>{new Date(latest.date).toLocaleDateString("fr-FR")}</span>
              </div>
              <p className="text-xs mb-2" style={{ color: DS.body }}>{latest.aiComparison}</p>
              <p className="text-[11px] font-extrabold" style={{ color: NAVY }}>→ {latest.recommendation}</p>
            </div>
          )}

          {/* Timeline J0 · J+x */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <TimelineDot label="J0" active />
            {followUps.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-4 h-px" style={{ background: DS.border }} />
                <TimelineDot label={`J+${f.dayOffset}`} active={i === followUps.length - 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </ProCard>
  );
}

// ── Consentement dataset (RGPD) — le dermato atteste l'accord du patient ──
function DatasetConsentCard({ patientId, initial }: { patientId: number; initial: boolean }) {
  const { toast } = useToast();
  const [consent, setConsent] = useState(initial);
  const toggle = async () => {
    const next = !consent;
    setConsent(next);
    try {
      await fetch(`/api/pro/patients/${patientId}/dataset-consent`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ consent: next }),
      });
      toast({ title: next ? "Consentement enregistré" : "Consentement retiré" });
    } catch { setConsent(!next); toast({ title: "Erreur", variant: "destructive" }); }
  };
  return (
    <ProCard className="p-4 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold" style={{ color: INK }}>Contribution au dataset GlowScan</p>
          <p className="text-[11px] mt-0.5" style={{ color: DS.muted }}>
            Le patient autorise l'usage de ses images anonymisées pour améliorer l'IA. Facultatif.
          </p>
        </div>
        <button role="switch" aria-checked={consent} onClick={toggle} data-testid="toggle-patient-dataset-consent"
          style={{ flexShrink: 0, width: 44, height: 26, padding: 3, borderRadius: 9999, border: "none", cursor: "pointer",
            background: consent ? "var(--color-accent-2-700)" : "var(--color-divider)", display: "flex", justifyContent: consent ? "flex-end" : "flex-start" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--color-bg)", display: "block" }} />
        </button>
      </div>
    </ProCard>
  );
}

// ── Rappel de contrôle WhatsApp : programmer ou envoyer maintenant ──────────
function FollowUpReminderCard({ patient, patientId }: { patient: any; patientId: number }) {
  const { toast } = useToast();
  const { schedule, cancel } = useFollowUpReminder(patientId);
  const scheduledAt: string | null = patient.followUpAt || null;
  const hasPhone = !!patient.whatsappNumber;
  // date par défaut = J+30
  const defaultDate = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
  const [date, setDate] = useState(defaultDate);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const sendNow = async () => {
    // Pré-ouvre l'onglet DANS le geste de clic → évite le blocage popup après l'await.
    const holder = hasPhone ? window.open("", "_blank") : null;
    try {
      const r = await schedule.mutateAsync({ sendNow: true, message: message || undefined });
      if (r.sent) {
        if (holder) holder.close();
        toast({ title: "Rappel envoyé ✅", description: "Le patient a reçu le message WhatsApp." });
      } else if (r.waLink) {
        if (holder) holder.location.href = r.waLink; else window.open(r.waLink, "_blank");
        toast({ title: "WhatsApp ouvert", description: "Vérifiez le message puis appuyez sur Envoyer." });
      } else {
        if (holder) holder.close();
        toast({ title: "Envoi impossible", description: r.error || "Numéro WhatsApp manquant.", variant: "destructive" });
      }
    } catch (e: any) {
      if (holder) holder.close();
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  // « ARRÊT SUIVI » : note en lecture seule, aucun bouton (seul le patient peut réactiver).
  if (patient.followupsStoppedAt) {
    return (
      <ProCard className="p-5 mb-4" data-testid="card-followups-stopped">
        <div className="flex items-center gap-2 mb-2">
          <BellRing className="w-4 h-4" style={{ color: DS.muted }} />
          <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Rappel de contrôle</p>
        </div>
        <p className="text-sm font-bold" style={{ color: DS.body }}>{followupsStoppedNote(patient.followupsStoppedAt)}</p>
        <p className="text-xs mt-1" style={{ color: DS.muted }}>Seul le patient peut les réactiver, depuis son Profil.</p>
      </ProCard>
    );
  }

  const scheduleIt = async () => {
    try {
      await schedule.mutateAsync({ date: new Date(date).toISOString(), message: message || undefined });
      toast({ title: "Rappel programmé ✅", description: `Le patient sera relancé le ${new Date(date).toLocaleDateString("fr-FR")}.` });
      setOpen(false);
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  return (
    <ProCard className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4" style={{ color: NAVY }} />
          <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>
            Rappel de contrôle
          </p>
        </div>
        {scheduledAt && (
          <button onClick={() => cancel.mutate()} className="inline-flex items-center gap-1 text-[11px] font-extrabold" style={{ color: "var(--color-accent-800)" }} data-testid="button-cancel-reminder">
            <XIcon className="w-3 h-3" /> Annuler
          </button>
        )}
      </div>

      {!hasPhone && (
        <div className="mb-3 p-2.5 rounded-lg text-[11px]" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "var(--color-accent-700)" }}>
          Ce patient n'a pas de numéro WhatsApp. Ajoutez-en un pour activer les rappels.
        </div>
      )}

      {scheduledAt ? (
        <p className="text-xs mb-3" style={{ color: DS.body }}>
          Prochain rappel programmé le{" "}
          <strong style={{ color: INK }}>{new Date(scheduledAt).toLocaleDateString("fr-FR")}</strong>
          {patient.followUpReminderSent ? " · déjà envoyé" : ""}
        </p>
      ) : (
        <p className="text-xs mb-3" style={{ color: DS.body }}>
          Relancez le patient pour une photo de contrôle : à une date programmée, ou tout de suite.
        </p>
      )}

      {open && (
        <div className="mb-3 space-y-2 p-3 rounded-xl" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}` }}>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Date du rappel</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-reminder-date"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}`, color: INK }} />
          <label className="block text-[10px] font-extrabold uppercase tracking-wider mt-2" style={{ color: DS.muted }}>Message (optionnel)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Laisser vide = message par défaut"
            data-testid="input-reminder-message"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}`, color: INK }} />
          <button onClick={scheduleIt} disabled={schedule.isPending}
            className="w-full py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: NAVY }} data-testid="button-confirm-schedule">
            {schedule.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Programmer le rappel"}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {!open && (
          <button onClick={() => setOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-extrabold active:scale-[0.98] transition-all"
            style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}`, color: INK }} data-testid="button-schedule-reminder">
            <Bell className="w-4 h-4" /> {scheduledAt ? "Modifier la date" : "Programmer"}
          </button>
        )}
        <button onClick={sendNow} disabled={schedule.isPending || !hasPhone}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-white text-sm font-extrabold active:scale-[0.98] transition-all disabled:opacity-50"
          style={{ background: "#25d366" }} data-testid="button-send-now">
          <Send className="w-4 h-4" /> Envoyer maintenant
        </button>
      </div>
    </ProCard>
  );
}

// ── Demander un second avis à un confrère (cas anonymisé) ──────────────────
function PeerReviewButton({ scanId, condition }: { scanId: number; condition: string }) {
  const { toast } = useToast();
  const [, navigate] = useWouterLocation();
  const create = useCreatePeerReview();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");

  const submit = async () => {
    if (question.trim().length < 3) { toast({ title: "Précisez votre question", variant: "destructive" }); return; }
    try {
      await create.mutateAsync({ scanId, question: question.trim() });
      toast({ title: "Cas envoyé au réseau ✅", description: "Vous serez notifié des réponses des confrères." });
      setOpen(false); setQuestion("");
      navigate("/derm/confreres");
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  return (
    <ProCard className="p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4" style={{ color: "var(--color-accent-700)" }} />
        <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Second avis confrère</p>
      </div>
      {!open ? (
        <>
          <p className="text-xs mb-3" style={{ color: DS.body }}>
            Cas difficile ? Demandez l'avis d'un confrère du réseau GlowScan. Seuls la photo, l'âge/sexe et
            votre question sont partagés — <strong style={{ color: INK }}>jamais le nom du patient</strong>.
          </p>
          <button onClick={() => setOpen(true)} data-testid="button-ask-peer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white text-sm font-extrabold active:scale-[0.98] transition-all"
            style={{ background: "var(--color-accent-700)" }}>
            <Users className="w-4 h-4" /> Demander un 2ᵉ avis
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold mb-1" style={{ color: "var(--color-accent-2-700)" }}>
            <Lock className="w-3 h-3" /> Cas anonymisé — {condition}
          </div>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} autoFocus
            placeholder="Ex : Lésion pigmentée évoluant depuis 3 mois, avis sur indication de biopsie ?"
            data-testid="input-peer-question"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}`, color: INK }} />
          <div className="flex gap-2">
            <button onClick={submit} disabled={create.isPending}
              className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: "var(--color-accent-700)" }} data-testid="button-submit-peer">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Envoyer au réseau"}
            </button>
            <button onClick={() => { setOpen(false); setQuestion(""); }}
              className="px-4 py-2.5 rounded-full text-sm font-extrabold" style={{ background: "var(--color-bg)", border: `1px solid ${DS.border}`, color: DS.body }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </ProCard>
  );
}

function TimelineDot({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className="inline-flex flex-col items-center gap-1 flex-shrink-0">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: active ? NAVY : "var(--color-divider)" }} />
      <span className="text-[9px] font-extrabold" style={{ color: active ? NAVY : "var(--color-neutral-600)" }}>{label}</span>
    </span>
  );
}
