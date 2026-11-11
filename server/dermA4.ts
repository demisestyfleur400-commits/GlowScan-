// ════════════════════════════════════════════════════════════════════════
// Compte rendu A4 de l'espace médical (maquette « Le compte rendu remis au
// patient » et handoff §4). Un seul modèle, partout : Dossiers médicaux,
// Messagerie, Nouvelle consultation. Brouillon : filigrane, non transmissible.
// Un champ vide affiche « Non renseigné. » ; la prescription n'est jamais
// déduite : seules les lignes saisies par le médecin sont imprimées.
// ════════════════════════════════════════════════════════════════════════

import { a4Meds, reportRef, suiviDate, type ReportPayload } from "@shared/report";

export type A4Doctor = {
  name: string; cabinetName: string | null; city: string | null; licenseNumber: string | null;
  cabinetAddress: string | null; cabinetPhone: string | null; email: string | null;
  signatureText?: string | null; // Paramètres › Profil & cabinet (D7)
};
export type A4Patient = { firstName: string; lastName: string; sex: string | null; age: number | null; birthDate: string | null };
export type A4Doc = { id: number; payload: ReportPayload; signedAt: string | null; createdAt: string };

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const frDate = (iso: string | null | undefined, long = false) => {
  if (!iso) return "";
  const d = new Date(iso);
  return long ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : d.toLocaleDateString("fr-FR");
};
const drName = (n: string) => `Dr ${String(n || "").replace(/^(dr|pr)\.?\s+/i, "").trim()}`;

/** Texte du suivi tel qu'il apparaît sur le document. */
export function a4SuiviText(p: ReportPayload, from: string | null): string {
  const extra = p.suiviText.trim();
  if (p.suiviChoice === "Aucun suivi") return ["Pas de suivi programmé.", extra].filter(Boolean).join(" ");
  if (!p.suiviChoice) return extra;
  const at = suiviDate(p.suiviChoice, from ? new Date(from) : new Date());
  return [`Contrôle à ${p.suiviChoice}${at ? `, le ${frDate(at, true)}` : ""}.`, extra].filter(Boolean).join(" ");
}

export function renderDermA4(d: A4Doctor, pt: A4Patient, doc: A4Doc): string {
  const p = doc.payload;
  const draft = !doc.signedAt;
  const dateRef = doc.signedAt || doc.createdAt;
  const patientLabel = pt.sex === "F" ? "PATIENTE" : "PATIENT";
  const patientName = `${pt.firstName} ${pt.lastName}`.trim() || "Non renseigné";
  const birthLabel = pt.birthDate ? "DATE DE NAISSANCE" : "ÂGE";
  const birth = pt.birthDate ? frDate(pt.birthDate) : pt.age ? `${pt.age} ans` : "Non renseigné";
  const sec = (t: string, v: string) => `<section><h3>${t}</h3><p>${v.trim() ? esc(v).replace(/\n/g, "<br>") : '<span class="nd">Non renseigné.</span>'}</p></section>`;
  const meds = a4Meds(p);
  const rx = meds.length
    ? meds.map((m) => `<table class="rx">${([["MÉDICAMENT / SOIN", m.m], ["FORME / DOSAGE", m.f], ["VOIE D'ADMINISTRATION", m.v], ["POSOLOGIE", m.p], ["DURÉE", m.d], ["CONSIGNES", m.c]] as const)
        .filter(([, v]) => String(v || "").trim()).map(([l, v]) => `<tr><th>${l}</th><td>${esc(v)}</td></tr>`).join("")}</table>`).join("")
    : '<p><span class="nd">Aucune prescription retenue.</span></p>';
  const cab = d.cabinetName || "Cabinet de dermatologie";
  const contact = [d.cabinetPhone ? `Tél. ${esc(d.cabinetPhone)}` : "", d.email ? esc(d.email) : ""].filter(Boolean).join(" · ");
  const ref = reportRef(doc.id);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Compte rendu de consultation · ${esc(patientName)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600&display=swap">
<style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#f1f3f1}body{font-family:Inter,Arial,sans-serif;color:#1f2f2b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:794px;min-height:1123px;margin:24px auto;padding:54px 62px 110px;background:#fffdfb;overflow:hidden;box-shadow:0 10px 30px rgba(13,41,41,.08)}
header{display:flex;justify-content:space-between;gap:24px;padding-bottom:20px;border-bottom:2px solid #1f5c4f}
.k{display:block;color:#2a6b4f;font-size:9px;font-weight:700;letter-spacing:1.2px}
.cab{display:block;margin:6px 0 6px;font:500 22px/1.2 Lora,Georgia,serif;color:#1f2f2b}
.small{color:#6b7a75;font-size:10px;line-height:1.6}.dr{text-align:right}.dr b{font-size:12px}
h1{margin:30px 0 4px;font:500 26px/1.2 Lora,Georgia,serif;color:#1f2f2b}.when{color:#6b7a75;font-size:10.5px}
.pt{display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin:22px 0 8px;padding:13px 16px;background:#e8f0ec}
.pt span{display:block;color:#56665f;font-size:8px;font-weight:600;letter-spacing:.9px;margin-bottom:4px}.pt b{font-size:12px;font-weight:600}
section{margin-top:20px}h3{margin:0 0 5px;font-size:12px;font-weight:600;color:#1f2f2b}p{margin:0;font-size:11px;line-height:1.65}.nd{color:#8a9894}
.rx{width:100%;border-collapse:collapse;margin-top:4px;font-size:10.5px}.rx+.rx{margin-top:12px}
.rx th{width:28%;text-align:left;padding:3px 10px 3px 0;color:#56665f;font-size:8px;font-weight:600;letter-spacing:.7px;vertical-align:top}.rx td{padding:3px 0;line-height:1.5}
.sign{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:32px}.verif{color:#8a9894;font-size:9px;line-height:1.55}
.sig{min-width:220px}.sig b{font-size:11.5px}.sig .s{display:block;margin:6px 0 2px;font:italic 20px Georgia,serif;color:#1f5c48}
footer{position:absolute;left:62px;right:62px;bottom:40px;padding-top:10px;border-top:1px solid #e4e8e3;display:flex;justify-content:space-between;gap:16px;color:#8a9894;font-size:8.5px}
.wm{position:absolute;top:44%;left:-10%;right:-10%;text-align:center;transform:rotate(-24deg);color:rgba(176,101,42,.13);font:800 60px Inter,sans-serif;letter-spacing:4px;pointer-events:none}
.note{width:794px;margin:0 auto 30px;color:#6b7a75;font-size:10px}
@media print{html,body{background:#fff}.page{margin:0;box-shadow:none}.note{display:none}}
@media screen and (max-width:640px){.page{width:auto;min-height:0;margin:0;padding:28px 22px 90px}footer{left:22px;right:22px}.note{width:auto;padding:0 22px}}</style></head>
<body><div class="page">
${draft ? '<div class="wm">BROUILLON · NON TRANSMISSIBLE</div>' : ""}
<header><div><span class="k">DERMATOLOGIE</span><b class="cab">${esc(cab)}</b><div class="small">${[d.cabinetAddress, d.city].filter(Boolean).map(esc).join("<br>")}${contact ? `<br>${contact}` : ""}</div></div>
<div class="dr"><b>${esc(drName(d.name))}</b><div class="small">Dermatologue${d.licenseNumber ? `<br>N° d'ordre ONMC : ${esc(d.licenseNumber)}` : ""}</div></div></header>
<h1>Compte rendu de consultation</h1><div class="when">Consultation du ${frDate(dateRef)}${d.city ? ` · ${esc(d.city)}` : ""}</div>
<div class="pt"><div><span>${patientLabel}</span><b>${esc(patientName)}</b></div><div><span>${birthLabel}</span><b>${esc(birth)}</b></div></div>
${sec("Motif de consultation", p.motif)}${sec("Observations cliniques", p.exam)}${sec("Conclusion du dermatologue", p.conclusion)}${sec("Conduite à tenir", p.conduite)}
<section><h3>Prescription</h3>${rx}</section>${sec("Suivi", a4SuiviText(p, dateRef))}
<div class="sign"><div class="verif">${draft ? "Document non signé · non transmissible." : `Document vérifiable<br>glow-scan.com/verif/${ref}`}</div>
<div class="sig"><b>${esc(drName(d.name))}</b>${draft ? '<span class="small" style="display:block;margin-top:6px">En attente de validation</span>' : `<span class="small" style="display:block">Validé le ${frDate(doc.signedAt, true)}</span><span class="s">${esc(d.signatureText || drName(d.name))}</span>`}</div></div>
<footer><span>Document médical confidentiel · Remis au patient</span><span>1 / 1</span></footer>
</div><p class="note">Seuls les éléments confirmés figurent dans la version remise. Aucun brouillon n'est transmis.</p></body></html>`;
}
