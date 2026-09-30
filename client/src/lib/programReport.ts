import html2pdf from "html2pdf.js";
import type { ProgramDashboard } from "@/components/pro/PilotageView";

// ════════════════════════════════════════════════════════════════════════
// Rapport mensuel au bailleur (README §4 point 10). Construit à partir du
// tableau de bord ANONYMISÉ (effectifs < 5 masqués, aucune donnée patient),
// relu par GlowScan dans /admin avant envoi. Couleurs en hexadécimal (PDF).
// ════════════════════════════════════════════════════════════════════════

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const m = (n: number | null | undefined) => (n == null ? "&lt; 5" : String(n));
const f = (n: number) => `${n.toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;

export function buildProgramReportHtml(d: ProgramDashboard, monthLabel: string): string {
  const kpi = (label: string, value: string, note: string) =>
    `<td style="padding:10px;background:#ebddc5;border-radius:12px;vertical-align:top;width:25%"><div style="font-size:10px;color:#645c50;font-weight:700">${label}</div><div style="font-size:22px;font-weight:800;margin:4px 0">${value}</div><div style="font-size:9px;color:#645c50">${note}</div></td>`;
  const table = (head: string[], rows: string[][]) => `
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:6px">
      <tr>${head.map((h) => `<th style="text-align:left;padding:5px 6px;border-bottom:1px solid #c0b6a5;color:#645c50">${h}</th>`).join("")}</tr>
      ${rows.map((r) => `<tr>${r.map((c) => `<td style="padding:5px 6px;border-bottom:1px solid #eee7db">${c}</td>`).join("")}</tr>`).join("")}
    </table>`;
  const section = (title: string, body: string) => `<div style="margin-top:18px"><div style="font-size:13px;font-weight:800;color:#8c491a;margin-bottom:4px">${title}</div>${body}</div>`;
  const shared = d.agents.filter((a) => a.shared);
  const hidden = d.agents.length - shared.length;
  const levelName = ["Observateur", "Relais", "Relais autonome", "Formateur"];

  return `<div style="font-family:Arial,sans-serif;color:#201e1d;background:#f5ead8;padding:28px 30px;width:760px;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#8c491a;text-transform:uppercase">Rapport mensuel · ${esc(monthLabel)}</div>
        <div style="font-size:24px;font-weight:800;margin-top:4px">${esc(d.program.name)}</div>
        <div style="font-size:11px;color:#645c50;margin-top:2px">${esc([d.program.funder, d.program.district].filter(Boolean).join(" · "))}</div>
      </div>
      <div style="font-size:14px;font-weight:800">GlowScan <span style="color:#56633f">Derm</span></div>
    </div>
    <div style="margin-top:12px;padding:8px 12px;background:#eee7db;border-radius:10px;font-size:10px">Données anonymisées : aucun nom, téléphone ni photo de patient. Effectifs inférieurs à 5 masqués.</div>

    ${section("Chiffres clés", `<table style="width:100%;border-spacing:6px 0"><tr>
      ${kpi("Cas validés", String(d.kpis.validated), "par un dermatologue")}
      ${kpi("Délai moyen", d.kpis.delayHours == null ? "—" : `${d.kpis.delayHours} h`, "objectif : moins de 24 h")}
      ${kpi("Agents autonomes", `${d.kpis.agentsAutonomous} / ${d.kpis.agentsTotal}`, "sur au moins une affection")}
      ${kpi("Orientés en urgence", m(d.kpis.urgent), "sur avis du dermatologue")}
    </tr></table>`)}

    ${d.alerts.length ? section("Hausse inhabituelle", d.alerts.map((a) => `<div style="font-size:11px">${esc(a.disease)} : +${a.pct} % en 3 semaines${a.district ? ` (surtout ${esc(a.district)})` : ""}</div>`).join("")) : ""}

    ${section("Par district", d.districts.length ? table(["District", "Cas", "Délai", "1re cause"], d.districts.map((x) => [esc(x.name), m(x.cases), x.delayHours == null ? "—" : `${x.delayHours} h`, esc(x.top || "—")])) : `<div style="font-size:11px">Pas encore de cas validés.</div>`)}

    ${section("Maladies du programme", d.diseases.length ? table(["Maladie", "Cas"], d.diseases.map((x) => [esc(x.name), m(x.n)])) : `<div style="font-size:11px">Pas encore de cas validés.</div>`)}

    ${section("Accord avec le dermatologue (seuil d'autonomie : 85 %)", d.agreement.length ? table(["Mois", "Cas", "Accord"], d.agreement.map((a) => [esc(a.month), m(a.n >= 5 ? a.n : null), a.pct == null ? "—" : `${a.pct} %`])) : `<div style="font-size:11px">Pas encore de données.</div>`)}

    ${section("Progression des agents (avec leur accord)", (shared.length ? table(["Agent", "Lieu", "Niveau", "Accord"], shared.map((a) => [esc(a.name), esc(a.city || ""), levelName[a.level ?? 0], a.accuracy == null ? "—" : `${a.accuracy} % sur ${a.cases} cas`])) : "") + (hidden ? `<div style="font-size:10px;color:#645c50;margin-top:4px">${hidden} agent(s) n'ont pas souhaité partager leur progression.</div>` : ""))}

    ${d.lessons?.length ? section("Cas d'école (validés par un dermatologue)", d.lessons.map((l) => `<div style="font-size:11px;margin-top:6px"><b>${esc(l.relayDx)} → ${esc(l.dermDx)}</b><br/>${esc(l.note)}</div>`).join("")) : ""}

    ${section("Budget", d.budget.total ? `<div style="font-size:11px">${f(d.budget.used)} consommés sur ${f(d.budget.total)} · reste ${f(Math.max(0, d.budget.total - d.budget.used))}</div>` : `<div style="font-size:11px">Budget non renseigné.</div>`)}

    <div style="margin-top:22px;font-size:9px;color:#645c50">Ces indicateurs servent à la formation des agents, pas à leur évaluation disciplinaire. Rapport établi par GlowScan à partir des cas validés par les dermatologues du réseau.</div>
  </div>`;
}

/** PDF (base64, sans préfixe) prêt à être joint à l'email du bailleur. */
export async function buildProgramReportPdf(d: ProgramDashboard, monthLabel: string): Promise<string> {
  const el = document.createElement("div");
  el.innerHTML = buildProgramReportHtml(d, monthLabel);
  const blob: Blob = await (html2pdf() as any)
    .set({ margin: 0, image: { type: "jpeg", quality: 0.9 }, html2canvas: { scale: 2, backgroundColor: "#f5ead8" }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, pagebreak: { mode: ["css", "legacy"] } })
    .from(el).output("blob");
  const dataUrl: string = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(blob); });
  return dataUrl.replace(/^data:application\/pdf;base64,/, "");
}
