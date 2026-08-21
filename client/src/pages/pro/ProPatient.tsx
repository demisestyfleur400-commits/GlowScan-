import { useState } from "react";
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
} from "lucide-react";
import {
  usePatientDossier,
  useValidateScan,
  useDeletePatient,
  useProAccount,
  useUpdatePatientStatus,
  useAddFollowUpPhoto,
} from "@/hooks/use-pro";
import { ProLayout, ProCard, ProInput, StatusBadge } from "@/components/ProLayout";
import { CaseAuditTrail } from "@/components/pro/CaseAuditTrail";
import PDFViewerModal from "@/components/PDFViewerModal";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "./ProDashboard";

const NAVY = "#7c3aed";
const INK = "#0F172A";
const GREEN = "#10b981";

const DS = {
  body: "#64748B",
  muted: "#94A3B8",
  border: "#E2E8F0",
};

export default function ProPatient() {
  const [, params] = useRoute("/derm/patient/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : null;
  const { data, isLoading } = usePatientDossier(id);
  const { data: accData } = useProAccount();
  const validate = useValidateScan();
  const del = useDeletePatient();
  const updateStatus = useUpdatePatientStatus();
  const { toast } = useToast();
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfHtml, setPdfHtml] = useState("");
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [validateNote, setValidateNote] = useState("");
  const [validateCorrection, setValidateCorrection] = useState("");

  if (isLoading || !data) return <LoadingScreen />;

  const { patient: p, scans } = data;
  const lastScan = scans[0];
  const previousScan = scans[1];
  const dermato = accData?.account;

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
    <button class="cta-btn" onclick="window.print()">⬇ Télécharger en PDF</button>
    <p style="font-size:10px;color:#9ca3af">Enregistrer en PDF dans le menu d'impression</p>
  </div>

  <div class="section">
    <div class="sec-title">👤 Informations Patient</div>
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
    <div class="sec-title">📈 Évolution Glow Score</div>
    <div class="evol-box">
      <div style="text-align:center"><div style="font-size:9px;color:#6b7280">${new Date(allScans[allScans.length-1].createdAt!).toLocaleDateString("fr-FR")}</div><div style="font-size:28px;font-weight:900;color:#7c3aed">${allScans[allScans.length-1].score}</div><div style="font-size:8px;color:#6b7280">J0</div></div>
      <div style="flex:1;text-align:center;font-size:22px;color:#9ca3af">→</div>
      <div style="text-align:center"><div style="font-size:9px;color:#6b7280">${new Date(allScans[0].createdAt!).toLocaleDateString("fr-FR")}</div><div style="font-size:28px;font-weight:900;color:${(allScans[0].score||0)>=(allScans[allScans.length-1].score||0)?"#10b981":"#f59e0b"}">${allScans[0].score}</div><div style="font-size:8px;color:#6b7280">JN</div></div>
      <div style="text-align:center;padding:0 12px"><div style="font-size:9px;color:#6b7280">Évolution</div><div style="font-size:22px;font-weight:900;color:${((allScans[0].score||0)-(allScans[allScans.length-1].score||0))>=0?"#10b981":"#f59e0b"}">${((allScans[0].score||0)-(allScans[allScans.length-1].score||0))>=0?"+":""}${(allScans[0].score||0)-(allScans[allScans.length-1].score||0)} pts</div></div>
    </div>
  </div>` : ""}

  <div class="section">
    <div class="sec-title">📋 Historique des Analyses</div>
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
    <div class="sec-title">🔬 Dernier Diagnostic Complet (${new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")})</div>
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
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#059669;margin-bottom:6px">👨‍⚕️ Examen du médecin</div>
        ${rows.map(([k, v]) => `<div style="display:flex;gap:8px;font-size:11px;margin-bottom:3px"><span style="font-weight:800;color:#6b7280;min-width:110px">${k}</span><span style="color:#F6FAFD">${v}</span></div>`).join("")}
      </div>`;
    })()}
    ${lastScan.details ? `<div class="clin-box"><span data-edit="observations">${lastScan.details}</span></div>` : `<span data-edit="observations" style="display:none"></span>`}
  </div>` : ""}

  ${(morning.length > 0 || evening.length > 0) ? `
  <div class="section">
    <div class="sec-title">🌿 Protocole de Traitement</div>
    ${morning.length > 0 ? `<div class="protocol-lbl" style="background:#fffbeb;color:#92400e">☀ Matin</div>${morning.map(renderStep).join("")}` : ""}
    ${evening.length > 0 ? `<div class="protocol-lbl" style="background:#ede9fe;color:#5b21b6;margin-top:8px">🌙 Soir</div>${evening.map(renderStep).join("")}` : ""}
  </div>` : ""}

  <div class="validity">📅 <b>Dossier mis à jour le ${date}</b> · Réf : ${refNum} · Cabinet ${dermato?.cabinetName || "GlowScan DERM"}</div>
</div>
<div class="footer">
  <div class="f-text">🔒 Document médical confidentiel établi et validé par le praticien soussigné · Réf ${refNum} · À usage strictement professionnel. À conserver dans le dossier médical du patient.</div>
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

  return (
    <ProLayout
      title="Dossier patient"
      back="/derm/patients"
      rightAction={
        <button
          onClick={handleDelete}
          data-testid="button-delete"
          className="p-2 rounded-xl transition-colors"
          style={{ color: DS.muted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = DS.muted)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      }
    >
      {/* Patient header */}
      <ProCard className="p-5 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-base flex-shrink-0"
            style={{ background: NAVY }}
          >
            {p.firstName[0]}
            {p.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold" style={{ color: INK }} data-testid="text-patient-name">
              {p.firstName} {p.lastName}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: DS.muted }}>
              {p.age ? `${p.age} ans · ` : ""}
              {p.sex || ""}
              {p.whatsappNumber ? ` · ${p.whatsappNumber}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([
                { v: "priority", label: "Priorité haute", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
                { v: "monitoring", label: "En suivi", color: NAVY, bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)" },
                { v: "stable", label: "Stable", color: GREEN, bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
                { v: "resolved", label: "Résolu", color: DS.muted, bg: "#F1F5F9", border: DS.border },
              ] as { v: string; label: string; color: string; bg: string; border: string }[]).map(opt => {
                const on = p.status === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => updateStatus.mutateAsync({ id: p.id, status: opt.v as any })}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-full transition-all active:scale-95"
                    style={on
                      ? { background: opt.bg, border: `1.5px solid ${opt.border}`, color: opt.color }
                      : { background: "#F1F5F9", border: `1px solid ${DS.border}`, color: DS.muted }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/pro/analyse?patient=${p.id}`}
            data-testid="button-new-scan"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-white text-xs font-extrabold transition-all active:scale-[0.97]"
            style={{ background: NAVY }}
          >
            <ScanLine className="w-3.5 h-3.5" />
            Nouvelle analyse
          </Link>
          <button
            onClick={sendWhatsApp}
            data-testid="button-whatsapp"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-white text-xs font-extrabold transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={openPdfViewer}
            data-testid="button-pdf"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-extrabold transition-all active:scale-[0.97]"
            style={{ background: "#E2E8F0", border: "1px solid #E2E8F0", color: DS.body }}
          >
            <FileText className="w-3.5 h-3.5" />
            Voir rapport
          </button>
        </div>
      </ProCard>

      {/* Reminder 30j */}
      {showReminder && (
        <ProCard className="p-4 mb-4" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
            <div className="flex-1">
              <p className="text-sm font-extrabold" style={{ color: "#fbbf24" }}>Pas de suivi depuis {daysSinceLast} jours</p>
              <p className="text-xs mb-2" style={{ color: DS.body }}>Envoyer un rappel à {p.firstName} ?</p>
              <button
                onClick={sendWhatsApp}
                className="text-xs font-extrabold underline"
                style={{ color: GREEN }}
                data-testid="button-send-reminder"
              >
                Envoyer un rappel WhatsApp
              </button>
            </div>
          </div>
        </ProCard>
      )}

      {/* Comparison avant/après */}
      {lastScan && previousScan && (
        <ProCard className="p-5 mb-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider mb-3" style={{ color: DS.muted }}>
            Comparaison avant / après
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="text-center p-3 rounded-xl"
              style={{ background: "#F1F5F9", border: `1px solid ${DS.border}` }}
            >
              <p className="text-[10px]" style={{ color: DS.muted }}>{new Date(previousScan.createdAt!).toLocaleDateString("fr-FR")}</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: INK }}>
                {previousScan.score}<span className="text-sm" style={{ color: DS.muted }}>/100</span>
              </p>
              <p className="text-[10px] truncate mt-1" style={{ color: DS.body }}>{dxOf(previousScan)}</p>
            </div>
            <div
              className="text-center p-3 rounded-xl"
              style={{
                background: (evolution || 0) >= 0 ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)",
                border: `1px solid ${(evolution || 0) >= 0 ? "rgba(16,185,129,0.25)" : "rgba(251,191,36,0.25)"}`,
              }}
            >
              <p className="text-[10px] font-extrabold" style={{ color: (evolution || 0) >= 0 ? "#6ee7b7" : "#fbbf24" }}>
                {new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")}
              </p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: (evolution || 0) >= 0 ? "#6ee7b7" : "#fbbf24" }}>
                {lastScan.score}<span className="text-sm opacity-70">/100</span>
              </p>
              <p className="text-[10px] truncate mt-1" style={{ color: DS.body }}>{dxOf(lastScan)}</p>
            </div>
          </div>
          <p className="text-xs text-center mt-3" style={{ color: DS.body }}>
            Évolution :{" "}
            <span className="font-extrabold" style={{ color: (evolution || 0) >= 0 ? GREEN : "#fbbf24" }}>
              {(evolution || 0) >= 0 ? "+" : ""}
              {evolution} pts
            </span>
          </p>
        </ProCard>
      )}

      {/* Suivi évolution — photos de contrôle comparées par l'IA */}
      {lastScan && (
        <EvolutionSection scan={lastScan as any} patientId={p.id} />
      )}

      {/* Timeline */}
      <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: DS.muted }}>
        Historique ({scans.length})
      </p>

      {scans.length === 0 ? (
        <ProCard className="p-8 text-center">
          <p className="text-sm mb-3" style={{ color: DS.body }}>Aucune analyse encore</p>
          <Link
            href={`/pro/analyse?patient=${p.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-extrabold active:scale-[0.97] transition-all"
            style={{ background: NAVY }}
            data-testid="link-first-scan"
          >
            <ScanLine className="w-4 h-4" />
            Lancer la 1ère analyse
          </Link>
        </ProCard>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <ProCard key={s.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold" style={{ color: INK }} data-testid={`text-condition-${s.id}`}>
                    {(s.expertCorrectedCondition && String(s.expertCorrectedCondition).trim()) || s.condition || "Diagnostic en attente"}
                  </p>
                  {s.expertCorrectedCondition && String(s.expertCorrectedCondition).trim() && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#6ee7b7" }}>
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
                    <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "#6ee7b7" }}>
                      👨‍⚕️ Examen du médecin
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
                      style={{ color: DS.body, background: "#F1F5F9" }}
                    >
                      Anamnèse ({Object.keys(answers).length} réponses)
                    </summary>
                    <div className="p-3 pt-0 space-y-1.5" style={{ background: "#F8FAFC" }}>
                      {items.map((q) => {
                        const a = answers[q.id];
                        if (!a) return null;
                        const colorMap: any = {
                          oui: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#6ee7b7", label: "Oui" },
                          non: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", text: "#f87171", label: "Non" },
                          nsp: { bg: "#F1F5F9", border: "#E2E8F0", text: DS.muted, label: "NSP" },
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
                      style={{ color: DS.muted, background: "#F1F5F9" }}
                    >
                      🤖 Analyse IA (indicative)
                    </summary>
                    <div className="p-3 pt-0 space-y-2" style={{ background: "#F8FAFC" }}>
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
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: "#fbbf24" }}>Conseil expert</span>
                          <p className="leading-snug mt-0.5" style={{ color: DS.body }}>{conseil}</p>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })()}

              {/* 🔒 Brique 2 — Journal d'audit du cas (traçabilité) */}
              <div className="mt-2">
                <CaseAuditTrail scan={s as any} />
              </div>

              {s.isVerified && (
                <div
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold mt-2 px-2 py-1 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
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
                      background: "#F1F5F9",
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
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => setValidatingId(null)}
                      className="px-3 py-2 rounded-full text-xs font-extrabold"
                      style={{ background: "#F1F5F9", color: DS.muted }}
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
      {/* ── PDF Viewer Modal ── */}
      <PDFViewerModal
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        htmlContent={pdfHtml}
        filename={`GlowScan_${p.firstName}_${new Date().toISOString().slice(0,10)}.pdf`}
        patientFirstName={p.firstName}
        patientPhone={p.whatsappNumber || undefined}
        dermatologue={dermato?.fullName || undefined}
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

  const evoColor = (s: number) => (s > 8 ? GREEN : s < -8 ? "#dc2626" : "#d97706");
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
          style={{ background: busy ? "#E2E8F0" : NAVY, color: busy ? DS.muted : "#fff" }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {busy ? "Analyse…" : "+ Photo de contrôle"}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
            onChange={(e) => handleAdd(e.target.files?.[0])} data-testid="input-followup-photo" />
        </label>
      </div>

      {followUps.length === 0 ? (
        <div className="text-center py-6 px-2 rounded-xl" style={{ background: "#F1F5F9", border: `1px solid ${DS.border}` }}>
          <p className="text-sm font-bold mb-1" style={{ color: INK }}>Suivez l'évolution dans le temps</p>
          <p className="text-xs" style={{ color: DS.body }}>
            Ajoutez une photo de la même zone à J+30, J+60… GlowScan la compare à la photo initiale
            et mesure l'évolution.
          </p>
        </div>
      ) : (
        <>
          {/* Comparateur J0 | Jx avec slider */}
          <div className="relative rounded-xl overflow-hidden select-none" style={{ border: `1px solid ${DS.border}`, aspectRatio: "4/3", background: "#0F172A" }}>
            {j0Url && <img src={j0Url} alt="J0" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
            {latest?.photoUrl && (
              <img src={latest.photoUrl} alt="Jx" className="absolute inset-0 w-full h-full object-cover" draggable={false}
                style={{ clipPath: `inset(0 0 0 ${slider}%)` }} />
            )}
            {/* poignée */}
            <div className="absolute top-0 bottom-0" style={{ left: `${slider}%`, width: 2, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }} />
            <span className="absolute top-2 left-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: "rgba(15,23,42,0.7)", color: "#fff" }}>J0</span>
            <span className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.85)", color: "#fff" }}>J+{latest?.dayOffset ?? 0}</span>
            <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(Number(e.target.value))}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%]" data-testid="slider-evolution" />
          </div>

          {/* Verdict IA */}
          {latest && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "#F1F5F9", border: `1px solid ${DS.border}` }}>
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

function TimelineDot({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className="inline-flex flex-col items-center gap-1 flex-shrink-0">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: active ? NAVY : "#CBD5E1" }} />
      <span className="text-[9px] font-extrabold" style={{ color: active ? NAVY : "#94A3B8" }}>{label}</span>
    </span>
  );
}
