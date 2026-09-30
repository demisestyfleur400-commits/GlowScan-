import { activeLines, LINE_STATUS_LABEL, DEFAULT_SPECIALTY, type ReportPayload } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Rendu des 3 documents (maquette « Derm Compte Rendu ») depuis la même saisie :
//  1a Patient (chat et WhatsApp) · 1c Dossier du cabinet · 1d Ordonnance ONMC.
// Pages HTML servies par le serveur, couleurs en hexadécimal (impression et
// html2pdf), bouton « Télécharger le PDF ». Aucun émoji.
// ════════════════════════════════════════════════════════════════════════

export type ReportDoctor = {
  name: string; cabinetName: string | null; city: string | null; licenseNumber: string | null;
  specialtyTitle: string | null; cabinetAddress: string | null; cabinetPhone: string | null;
};
export type ReportPatient = { firstName: string; lastName: string; age: number | null; sex: string | null };
export type ReportDoc = {
  id: number; ref: string; source: "consultation" | "visit"; payload: ReportPayload;
  signedAt: string | null; createdAt: string; sentPatientAt: string | null; viewedBy: string[];
  visitNumber: number | null;
};
export type ReportPrescription = { ref: string; status: "valid" | "revoked"; signedAt: string; qrDataUrl: string; verifyUrl: string } | null;
export type ReportEvolution = { date: string; score: number | null; photo: string | null }[];

const C = {
  bg: "#f5ead8", paper: "#fffaf2", text: "#201e1d", muted: "#645c50", line: "#e0d3bd",
  accent: "#c67139", accent700: "#8c491a", accent100: "#fff2eb", green: "#728157", green100: "#f0fae1", green800: "#3d472b",
};
const TZ = "Africa/Douala";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
const dr = (n: string) => `Dr ${String(n || "").replace(/^(dr|pr)\.?\s+/i, "").trim()}`;
const dLong = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }) : "");
const dDayMonth = (v: string | null | undefined) => (v ? new Date(`${v.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: TZ }) : "");
const dShort = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }) : "");
const hm = (v: string) => new Date(v).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).replace(":", " h ");
const shortDoc = (n: string) => {
  const parts = String(n || "").replace(/^(dr|pr)\.?\s+/i, "").trim().split(/\s+/);
  return parts.length > 1 ? `Dr ${parts[0][0]}. ${parts.slice(1).join(" ")}` : dr(n);
};
const P = `font-size:14px;line-height:1.6;margin:0 0 10px;color:${C.text}`;
const H = `font-family:'Caprasimo',Georgia,serif;font-weight:400;font-size:19px;margin:22px 0 8px;color:${C.text}`;
const LABEL = `font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.accent700}`;

function stamp(d: ReportDoctor, extra = "") {
  return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;border:2px solid ${C.accent700};border-radius:12px;padding:8px 16px;color:${C.accent700};transform:rotate(-2deg)">
    <b style="font-size:13px">${esc(shortDoc(d.name))}</b>${extra}
    <span style="font-size:12px">ONMC ${esc(d.licenseNumber || "—")}</span></div>`;
}

function shell(title: string, body: string, fileName: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box} body{margin:0;background:${C.bg};font-family:'Figtree',system-ui,sans-serif;color:${C.text}}
  .sheet{background:${C.paper};max-width:760px;margin:24px auto;padding:36px 40px;border-radius:18px}
  .page2{page-break-before:always;break-before:page}
  @media (max-width:600px){.sheet{margin:0;border-radius:0;padding:22px 18px}}
  @media print{body{background:#fff}.sheet{margin:0;border-radius:0;max-width:none}.no-print{display:none!important}}
</style></head><body>
<div id="doc">${body}</div>
<div class="no-print" style="text-align:center;margin:0 0 32px">
  <button id="dl" style="background:${C.accent};color:#fff;border:0;border-radius:999px;padding:13px 26px;font:700 15px 'Figtree',sans-serif;cursor:pointer">Télécharger le PDF</button>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
  document.getElementById("dl").addEventListener("click", function () {
    if (!window.html2pdf) { window.print(); return; }
    window.html2pdf().set({ margin: 0, filename: ${JSON.stringify(fileName)}, image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4" }, pagebreak: { mode: ["css"] } })
      .from(document.getElementById("doc")).save();
  });
</script></body></html>`;
}

// ── 1a · Au patient ──────────────────────────────────────────────────────
function patientSheet(d: ReportDoctor, pt: ReportPatient, r: ReportDoc, rx: ReportPrescription) {
  const p = r.payload;
  const hello = pt.sex === "F" ? `Chère ${esc(pt.firstName)},` : pt.sex === "M" ? `Cher ${esc(pt.firstName)},` : `Bonjour ${esc(pt.firstName)},`;
  const plain = esc(p.diagnosisPlain);
  const named = p.diagnosis && !p.diagnosisPlain.toLowerCase().includes(p.diagnosis.toLowerCase())
    ? `<p style="${P}">Le nom médical est <b>${esc(p.diagnosis)}</b>.</p>` : "";
  const todo = [
    ...activeLines(p).map((l) => `<li style="margin:0 0 8px"><b>${esc(l.when || l.name)}</b> : ${esc(l.when ? l.name : "")}${l.when && l.how ? ", " : ""}${esc(l.how)}${l.duration && !/long cours/i.test(l.duration) ? `, pendant ${esc(l.duration)}` : ""}.</li>`),
    ...p.lines.filter((l) => l.status === "arrete").map((l) => `<li style="margin:0 0 8px"><b>Arrêtez</b> ${esc(l.name)}${l.reason ? ` : ${esc(l.reason)}` : ""}.</li>`),
    ...(p.avoid ? [`<li style="margin:0 0 8px"><b>N'utilisez pas</b> : ${esc(p.avoid)}.</li>`] : []),
  ];
  const chips = [
    p.controlPhotoDate ? `Photo de contrôle le ${esc(dDayMonth(p.controlPhotoDate))}` : "",
    p.controlPhotoDate ? "Rappel WhatsApp" : "",
    rx ? "Ordonnance jointe (page 2)" : "",
  ].filter(Boolean).map((t) => `<span style="display:inline-block;background:${C.green100};color:${C.green800};border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;margin:0 6px 6px 0">${t}</span>`).join("");

  return `<div class="sheet">
  <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid ${C.line};padding-bottom:14px">
    <div><div style="font-family:'Caprasimo',serif;font-size:22px">${esc(dr(d.name))}</div>
      <div style="font-size:13px;color:${C.muted}">Dermatologue${d.cabinetName ? ` · ${esc(d.cabinetName)}` : ""}${d.city ? `, ${esc(d.city)}` : ""}</div>
      ${d.licenseNumber ? `<div style="font-size:13px;color:${C.muted}">N° ONMC ${esc(d.licenseNumber)}</div>` : ""}</div>
    <div style="text-align:right;font-size:13px;color:${C.muted}">${r.source === "consultation" ? "Consultation en ligne" : "Consultation au cabinet"}<br/><b style="color:${C.text}">${esc(dLong(r.signedAt || r.createdAt))}</b></div>
  </div>
  <p style="${P};margin-top:18px">${hello}</p>
  ${p.personalNote ? `<p style="${P};white-space:pre-wrap">${esc(p.personalNote)}</p>` : ""}
  <h2 style="${H}">Ce que j'ai vu</h2>
  <p style="${P};white-space:pre-wrap">${plain}</p>${named}
  ${todo.length ? `<h2 style="${H}">Ce que vous devez faire</h2><ul style="padding-left:18px;margin:0 0 10px;font-size:14px;line-height:1.6">${todo.join("")}</ul>` : ""}
  ${p.expect ? `<h2 style="${H}">À quoi vous attendre</h2><p style="${P};white-space:pre-wrap">${esc(p.expect)}</p>` : ""}
  ${p.alertIf ? `<p style="${P};background:${C.accent100};border-radius:12px;padding:12px 14px"><b>Écrivez-moi tout de suite si</b> ${esc(p.alertIf)}</p>` : ""}
  ${chips ? `<div style="margin-top:14px">${chips}</div>` : ""}
  ${p.aiSuggestion ? `<p style="font-size:12px;color:${C.muted};margin:14px 0 0">L'analyse GlowScan est indicative. Ce compte rendu est celui de votre dermatologue.</p>` : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:22px;border-top:1px solid ${C.line};padding-top:14px">
    <span style="font-size:12px;color:${C.muted}">${r.signedAt ? "Signé électroniquement" : "Brouillon non signé"} · réf. ${esc(r.ref)}</span>
    ${stamp(d)}
  </div>
</div>`;
}

// ── 1d · Ordonnance aux normes de l'ONMC ─────────────────────────────────
function prescriptionSheet(d: ReportDoctor, pt: ReportPatient, r: ReportDoc, rx: NonNullable<ReportPrescription>, pageBreak: boolean) {
  const p = r.payload;
  const civ = pt.sex === "F" ? "Mme " : pt.sex === "M" ? "M. " : "";
  const who = `${civ}${esc(pt.firstName)} ${esc(String(pt.lastName || "").toUpperCase())}`;
  const meta = [pt.age != null ? `${pt.age} ans` : "", p.weightKg ? `${p.weightKg} kg` : ""].filter(Boolean).join(" · ");
  const items = activeLines(p).map((l, i) => `<div style="margin:0 0 14px">
      <div style="font-weight:700;font-size:15px">${i + 1}. ${esc(l.name)}${l.qty ? `, ${esc(l.qty)}` : ""}</div>
      <div style="font-size:14px;line-height:1.55">${esc([l.when, l.how].filter(Boolean).join(", "))}${l.when || l.how ? ". " : ""}Durée : ${esc(l.duration)}.</div></div>`).join("");
  const revoked = rx.status === "revoked"
    ? `<div style="border:2px solid #b42318;color:#b42318;border-radius:12px;padding:10px 14px;font-weight:700;margin-bottom:16px;text-align:center">ORDONNANCE ANNULÉE PAR LE MÉDECIN</div>` : "";
  return `<div class="sheet${pageBreak ? " page2" : ""}">
  ${revoked}
  <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:2px solid ${C.text};padding-bottom:14px">
    <div style="font-size:13px;line-height:1.5">
      <div style="font-family:'Caprasimo',serif;font-size:20px">${esc(d.cabinetName || "Cabinet de dermatologie")}</div>
      <div style="font-weight:700;font-size:15px">${esc(dr(d.name))}</div>
      <div>${esc(d.specialtyTitle || DEFAULT_SPECIALTY)}</div>
      <div>${esc(d.cabinetAddress || "")}${d.city && !(d.cabinetAddress || "").includes(d.city) ? `, ${esc(d.city)}` : ""}</div>
      ${d.cabinetPhone ? `<div>Tél. ${esc(d.cabinetPhone)}</div>` : ""}
    </div>
    <div style="text-align:right;font-size:13px;line-height:1.5">Inscription à l'Ordre National<br/>des Médecins du Cameroun<br/><b style="font-size:15px">N° ONMC ${esc(d.licenseNumber || "")}</b></div>
  </div>
  <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0;font-size:14px">
    <span>Patient${pt.sex === "F" ? "e" : ""} : <b>${who}</b>${meta ? `, ${esc(meta)}` : ""}</span>
    <span>${esc(d.city || "")}${d.city ? ", " : ""}le ${esc(dShort(rx.signedAt))}</span>
  </div>
  <div style="font-family:'Caprasimo',serif;font-size:24px;text-align:center;margin:8px 0 18px">Ordonnance</div>
  ${items}
  ${p.avoid ? `<p style="${P};margin-top:6px"><b>Ne pas utiliser</b> : ${esc(p.avoid)}.</p>` : ""}
  <p style="${P};font-weight:700">Ordonnance non renouvelable</p>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:26px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${rx.qrDataUrl}" alt="QR code" width="96" height="96"/>
      <span style="font-size:12px;color:${C.muted};line-height:1.5">Réf. ${esc(rx.ref)}<br/>vérifiable sur ${esc(rx.verifyUrl.replace(/^https?:\/\//, "").replace(/\/[^/]*$/, ""))}</span>
    </div>
    <div style="text-align:center;font-size:12px;color:${C.muted}">
      <div style="margin-bottom:6px">Signature et cachet</div>
      ${stamp(d, `<span style="font-size:12px">Dermatologue</span>`)}
      <div style="margin-top:8px">Signé électroniquement le ${esc(dShort(rx.signedAt))} à ${esc(hm(rx.signedAt))}</div>
    </div>
  </div>
</div>`;
}

export function renderPatientReport(d: ReportDoctor, pt: ReportPatient, r: ReportDoc, rx: ReportPrescription) {
  const body = patientSheet(d, pt, r, rx) + (rx ? prescriptionSheet(d, pt, r, rx, true) : "");
  return shell(`Compte rendu ${r.ref}`, body, `${r.ref}.pdf`);
}

export function renderPrescription(d: ReportDoctor, pt: ReportPatient, r: ReportDoc, rx: NonNullable<ReportPrescription>) {
  return shell(`Ordonnance ${rx.ref}`, prescriptionSheet(d, pt, r, rx, false), `${rx.ref}.pdf`);
}

// ── 1c · Dossier du cabinet ──────────────────────────────────────────────
export function renderCabinetReport(d: ReportDoctor, pt: ReportPatient, r: ReportDoc, rx: ReportPrescription, evo: ReportEvolution) {
  const p = r.payload;
  const cell = (k: string, v: string) => `<div><div style="font-size:11px;color:${C.muted};text-transform:uppercase;letter-spacing:.08em">${k}</div><div style="font-size:14px;font-weight:600">${esc(v)}</div></div>`;
  const first = evo[0], last = evo[evo.length - 1];
  const weeks = first && last && evo.length > 1 ? Math.max(1, Math.round((+new Date(last.date) - +new Date(first.date)) / (7 * 86400000))) : 0;
  const delta = first?.score != null && last?.score != null && evo.length > 1 ? last.score - first.score : null;
  const evoHtml = evo.length ? `<h2 style="${H}">Évolution</h2>
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
      ${(evo.length > 1 ? [first, last] : [first]).map((e) => `<div style="text-align:center;font-size:12px;color:${C.muted}">
        ${e.photo ? `<img src="${esc(e.photo)}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:12px;display:block;margin-bottom:4px"/>` : ""}
        ${esc(dLong(e.date))}${e.score != null ? ` · score ${e.score}` : ""}</div>`).join("")}
      ${delta != null ? `<div style="font-size:14px"><b style="font-size:22px;color:${delta >= 0 ? C.green : "#b42318"}">${delta >= 0 ? "+" : ""}${delta}</b> en ${weeks} semaine${weeks > 1 ? "s" : ""}</div>` : ""}
    </div>` : "";
  const aiLine = p.aiSuggestion
    ? `<div style="font-size:12px;color:${C.muted};margin-top:4px">Suggestion IA (analyse indicative) : ${esc(p.aiSuggestion)} (${p.aiSuggestion.trim().toLowerCase() === p.diagnosis.trim().toLowerCase() ? "validée par le médecin" : "non retenue par le médecin"})</div>` : "";
  const lines = p.lines.map((l) => {
    const tone = l.status === "arrete" ? `background:#fde8e7;color:#b42318` : l.status === "ajoute" ? `background:${C.accent100};color:${C.accent700}` : `background:${C.green100};color:${C.green800}`;
    return `<div style="display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;font-size:14px">
      <span style="flex:none;${tone};border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700">${LINE_STATUS_LABEL[l.status]}</span>
      <span>${esc(l.name)}${l.qty ? `, ${esc(l.qty)}` : ""}${l.when ? `, ${esc(l.when.toLowerCase())}` : ""}${l.how ? ` : ${esc(l.how)}` : ""}${l.duration ? ` (durée : ${esc(l.duration)})` : ""}${l.reason ? ` · ${esc(l.reason)}` : ""}</span></div>`;
  }).join("");
  const next = [[pt.sex === "F" ? "Patiente" : "Patient", p.next.patient], ["Secrétariat", p.next.secretariat], ["Médecin", p.next.doctor]].filter(([, v]) => v);
  const visit = r.source === "consultation" ? "Consultation en ligne" : r.visitNumber && r.visitNumber > 1 ? `Visite de suivi n° ${r.visitNumber - 1}` : "Première visite";

  const body = `<div class="sheet">
  <div style="border-bottom:1px solid ${C.line};padding-bottom:14px">
    <div style="${LABEL}">Dossier du cabinet · réf. ${esc(r.ref)}</div>
    <div style="font-family:'Caprasimo',serif;font-size:24px;margin-top:4px">Compte rendu de consultation</div>
    <div style="font-size:13px;color:${C.muted}">${esc(d.cabinetName || "Cabinet")} · ${esc(shortDoc(d.name))}, dermatologue${d.licenseNumber ? ` · ONMC ${esc(d.licenseNumber)}` : ""}</div>
    <div style="font-size:13px;margin-top:4px"><b>${esc(visit)}</b> · ${esc(dLong(r.signedAt || r.createdAt))}</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0">
    ${cell(pt.sex === "F" ? "Patiente" : "Patient", `${pt.firstName} ${pt.lastName}${pt.age != null ? `, ${pt.age} ans` : ""}`)}
    ${cell("Phototype", p.phototype || "—")}
    ${cell("Allergies", p.allergies || "Aucune connue")}
    ${cell("Antécédent", p.antecedents || "—")}
  </div>
  ${p.motif ? `<h2 style="${H}">Motif</h2><p style="${P};white-space:pre-wrap">${esc(p.motif)}</p>` : ""}
  ${p.exam ? `<h2 style="${H}">Examen</h2><p style="${P};white-space:pre-wrap">${esc(p.exam)}</p>` : ""}
  ${evoHtml}
  <h2 style="${H}">Diagnostic</h2><p style="${P};font-weight:700;margin:0">${esc(p.diagnosis)}</p>${aiLine}
  ${lines ? `<h2 style="${H}">Traitement</h2>${lines}` : ""}
  ${p.avoid ? `<p style="${P}"><b>Ne pas utiliser</b> : ${esc(p.avoid)}</p>` : ""}
  ${next.length ? `<h2 style="${H}">Suite : qui fait quoi, quand</h2>${next.map(([k, v]) => `<p style="${P}"><b>${k}</b> : ${esc(v)}</p>`).join("")}` : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:22px;border-top:1px solid ${C.line};padding-top:14px;font-size:12px;color:${C.muted}">
    <div style="line-height:1.6">
      ${r.sentPatientAt ? `Copie envoyée ${pt.sex === "F" ? "à la patiente" : "au patient"} (version 1a)<br/>` : ""}
      ${rx ? `Ordonnance ${esc(rx.ref)}${rx.status === "revoked" ? " (annulée)" : ""}<br/>` : ""}
      ${r.viewedBy.length ? `Consulté par : ${esc(r.viewedBy.join(", "))}` : ""}
      ${r.signedAt ? "" : "<b>Brouillon non signé</b>"}
    </div>
    ${stamp(d)}
  </div>
</div>`;
  return shell(`Dossier ${r.ref}`, body, `${r.ref}-dossier.pdf`);
}
