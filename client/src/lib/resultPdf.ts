import type { AnalysisResult } from "@shared/schema";
import { FACE_ZONES, RESULT_DISCLAIMER } from "@shared/resultB2C";
import { HEX, WAIT_TIPS, ZONE_COLOR, ZONE_UNSEEN, ZONE_WORD, buildResultView, subtitleOf } from "@/lib/resultView";

// ════════════════════════════════════════════════════════════════════════
// Compte rendu PDF du Résultat patient (refonte Organic).
// Même contenu que l'écran : état, score, zones numérotées, indicateurs
// réels, mention « Analyse indicative… ». Aucun produit sous 60 ni en urgent.
// ════════════════════════════════════════════════════════════════════════

export type ResultPdfInput = {
  result: AnalysisResult;
  area?: string;
  imageUrl?: string | null;
  createdAt?: string | Date | null;
  photoCount?: number;
  scanId?: number | null;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function buildResultPdfHtml({ result, area = "face", imageUrl, createdAt, photoCount, scanId }: ResultPdfInput): string {
  const v = buildResultView(result, area);
  const sub = subtitleOf(area, createdAt ?? new Date(), photoCount);
  const card = `background:${HEX.surface};border-radius:18px;padding:14px 16px;margin:0 0 12px`;
  const h = (t: string) => `<div style="font-size:13px;font-weight:700;margin:0 0 8px">${t}</div>`;

  const photo = v.usable && imageUrl ? `
    <div style="position:relative;width:100%;height:260px;border-radius:18px;overflow:hidden;background:#7a5234;margin:0 0 12px">
      <img src="${esc(imageUrl)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block" />
      ${v.zones ? FACE_ZONES.map((z, i) => {
        const zi = v.zones![z.key];
        return `<span style="position:absolute;left:${z.x};top:${z.y};transform:translate(-50%,-50%);width:24px;height:24px;border-radius:999px;border:2px solid ${HEX.n100};background:${zi ? ZONE_COLOR[zi.status] : ZONE_UNSEEN};color:${HEX.n100};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">${i + 1}</span>`;
      }).join("") : ""}
    </div>` : "";

  const zonesList = v.zones ? `
    <div style="${card}">
      ${h("Zones du visage")}
      ${FACE_ZONES.map((z, i) => {
        const zi = v.zones![z.key];
        return `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:12px;border-top:${i ? `1px solid rgba(32,30,29,.1)` : "0"}">
          <span style="flex:none;width:20px;height:20px;border-radius:999px;background:${zi ? ZONE_COLOR[zi.status] : ZONE_UNSEEN};color:${HEX.n100};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${i + 1}</span>
          <span style="flex:none;width:92px;font-weight:700">${z.label}</span>
          <span style="flex:none;width:130px;color:${HEX.n800}">${zi ? ZONE_WORD[zi.status] : "Non visible"}</span>
          <span style="flex:1">${zi ? esc(zi.note) || "Rien de particulier" : "Zone non visible sur les photos"}</span>
        </div>`;
      }).join("")}
    </div>` : "";

  const score = v.usable ? `
    <div style="display:flex;align-items:center;gap:16px;margin:0 0 12px">
      <div style="flex:none;width:84px;height:84px;border-radius:999px;border:8px solid ${v.copy.ring};display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box">
        <span style="font-family:Caprasimo,Georgia,serif;font-size:26px;line-height:1">${v.score}</span>
        <span style="font-size:9px;color:${HEX.n700}">Glow Score</span>
      </div>
      <div style="flex:1">
        <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;background:${v.copy.tag === "accent-2" ? HEX.a2_100 : HEX.accent100};color:${v.copy.tag === "accent-2" ? HEX.a2_800 : HEX.accent800}">${v.copy.level}</span>
        ${v.title ? `<div style="font-family:Caprasimo,Georgia,serif;font-size:21px;line-height:1.15;margin-top:4px">${esc(v.title)}</div>` : ""}
        ${v.deltaLabel ? `<div style="font-size:12px;font-weight:700;color:${HEX.n800};margin-top:2px">${v.deltaLabel}</div>` : ""}
      </div>
    </div>` : "";

  const verdict = `
    <div style="background:${v.copy.vBg};color:${v.copy.vFg};border-radius:18px;padding:14px 16px;margin:0 0 12px">
      <div style="font-size:15px;font-weight:700;margin:0 0 6px">${v.copy.vTitle}</div>
      <div style="font-size:12px;line-height:1.5">${v.copy.vText}</div>
      ${v.flags.length ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:12px;font-weight:600">${v.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
    </div>`;

  const obs = v.showObservations && v.observations.length ? `
    <div style="${card}">${h("Ce que l'analyse a observé")}
      ${v.observations.map((o) => `<div style="display:flex;align-items:center;gap:10px;font-size:12px;padding:4px 0"><span style="flex:none;width:20px;height:20px;border-radius:999px;background:${o.c};color:${HEX.n100};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${o.n}</span>${esc(o.text)}</div>`).join("")}
    </div>` : "";

  const tiles = v.usable && v.tiles.length ? `
    <div style="display:flex;gap:8px;margin:0 0 12px">
      ${v.tiles.map(([k, val]) => `<div style="flex:1;background:${HEX.surface};border-radius:14px;padding:10px 12px"><div style="font-size:10px;color:${HEX.n700}">${k}</div><div style="font-size:14px;font-weight:700">${esc(val)}</div></div>`).join("")}
    </div>` : "";

  const bars = v.bars.length ? `
    <div style="${card}">
      ${v.bars.map((b) => `<div style="margin:0 0 8px"><div style="display:flex;justify-content:space-between;font-size:12px"><span style="font-weight:600">${b.name}</span><span style="font-weight:700">${b.word}</span></div><div style="height:7px;border-radius:999px;background:${HEX.n200};margin-top:3px"><div style="height:100%;width:${b.v}%;border-radius:999px;background:${b.c}"></div></div></div>`).join("")}
    </div>` : "";

  const products = v.products.length ? `
    <div style="${card}">${h("Votre routine conseillée")}
      ${v.products.map((p) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:4px 0"><span><b>${esc(p.name)}</b><br><span style="color:${HEX.a2_800}">${esc(p.description).slice(0, 110)}</span></span><b style="white-space:nowrap">${esc(p.price || "")}</b></div>`).join("")}
    </div>` : "";

  const wait = v.showWaitTips ? `
    <div style="margin:0 0 12px">${h("En attendant le médecin")}
      <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5">${WAIT_TIPS.map((t) => `<li>${t}</li>`).join("")}</ul>
    </div>` : "";

  const unusable = !v.usable ? `<div style="${card}"><b>Photo trop sombre ou floue</b><br><span style="font-size:12px">Le visage n'est pas lisible : l'analyse serait fausse.</span></div>` : "";

  return `
  <div style="width:720px;padding:32px 36px;box-sizing:border-box;background:${HEX.bg};color:${HEX.text};font-family:Figtree,Helvetica,Arial,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:0 0 16px">
      <div>
        <div style="font-family:Caprasimo,Georgia,serif;font-size:22px">GlowScan</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${HEX.accent700};margin-top:2px">Compte rendu d'analyse</div>
      </div>
      <div style="text-align:right;font-size:12px;font-weight:700">${esc(sub)}${scanId ? `<br><span style="font-weight:400;color:${HEX.n700}">Réf. GS-${scanId}</span>` : ""}</div>
    </div>
    ${[photo, unusable, score, verdict, obs, zonesList, tiles, bars, products, wait]
      .filter(Boolean).map((b) => `<div class="pdf-block">${b}</div>`).join("")}
    <div class="pdf-block" style="font-size:10px;line-height:1.5;color:${HEX.n700};border-top:1px solid rgba(32,30,29,.16);padding-top:10px;margin-top:4px">${RESULT_DISCLAIMER}</div>
  </div>`;
}

const PDF_OPTS = {
  margin: 0,
  image: { type: "jpeg", quality: 0.92 },
  html2canvas: { scale: 2, useCORS: true, backgroundColor: HEX.bg, windowWidth: 720 },
  jsPDF: { unit: "px", format: [720, 1018], orientation: "portrait", hotfixes: ["px_scaling"] },
  // Un bloc (zones, verdict, indicateurs…) n'est jamais coupé entre deux pages.
  pagebreak: { mode: ["css", "legacy"], avoid: [".pdf-block"] },
};

function fileName(input: ResultPdfInput) {
  const d = new Date(input.createdAt ?? Date.now()).toISOString().slice(0, 10);
  return `compte-rendu-glowscan-${d}${input.scanId ? `-${input.scanId}` : ""}.pdf`;
}

/** Télécharge le compte rendu PDF. */
export async function downloadResultPdf(input: ResultPdfInput): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;
  await (html2pdf() as any).set({ ...PDF_OPTS, filename: fileName(input) }).from(buildResultPdfHtml(input)).save();
}

/** PDF en base64 (sans préfixe data:), pour la pièce jointe de l'email. */
export async function resultPdfBase64(input: ResultPdfInput): Promise<string> {
  const html2pdf = (await import("html2pdf.js")).default;
  const uri: string = await (html2pdf() as any).set(PDF_OPTS).from(buildResultPdfHtml(input)).outputPdf("datauristring");
  return uri.split(",")[1] || "";
}
