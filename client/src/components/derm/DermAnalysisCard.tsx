// ════════════════════════════════════════════════════════════════════════
// Nouvelle consultation · étape « Analyse IA » : lecture de l'analyse au style
// de l'espace médical (remplace la carte B2C ResultCard dans GlowScan Derm).
// Tout est présenté comme une proposition indicative : le diagnostic final
// appartient au médecin (validation / correction plus bas dans la page).
// ════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { D, FONT_UI } from "./tokens";

const box: React.CSSProperties = { background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12 };
const kick: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: .8, color: D.muted, textTransform: "uppercase" };

const sevTone = (s: string) => {
  const v = (s || "").toLowerCase();
  if (/s[ée]v[èe]re|grave|urgent/.test(v)) return { c: D.err, bg: D.errBg };
  if (/mod[ée]r/.test(v)) return { c: D.warn, bg: D.warnBg };
  return { c: D.action, bg: D.tintActive };
};
const confLabel = { low: "Confiance faible", medium: "Confiance moyenne", high: "Confiance élevée" } as const;

export function DermAnalysisCard({ result, imageUrl, patientName, age, duration, finalDx }: {
  result: AnalysisResult; imageUrl?: string | null; patientName?: string; age?: string | number; duration?: string; finalDx?: string | null;
}) {
  const [care, setCare] = useState(false);
  const r = result as AnalysisResult & Record<string, any>;
  const sev = sevTone(r.severityLabel || r.severity);
  const flags = [...(r.redFlags || []), ...(r.urgentSigns || [])].filter((x, i, a) => x && a.indexOf(x) === i);
  const synth = r.conclusion?.long || r.details || "";
  const key = r.conclusion?.short || r.motivation || "";
  const stats: [string, string | undefined][] = [
    ["Type de peau", r.skinType], ["Lésions", r.stats?.lesions], ["Pores", r.stats?.pores],
    ["Marques", r.stats?.marks], ["Zones", r.stats?.zones], ["Gravité", r.severityLabel || r.severity],
  ];
  const zones = (r.zoneAnalysis || []).filter((z) => z?.name);
  const steps = (k: "morning" | "evening") =>
    (r.protocol?.[k]?.length ? r.protocol[k].map((s: any) => [s.step, s.product, s.why]) :
      (k === "morning" ? r.morningProtocol : r.eveningProtocol)?.map((s: any) => [s.step, s.product, s.why]) ||
      (r.recommendations?.[k] || []).map((s: string) => [s, "", ""])) as [string, string, string][];
  const morning = steps("morning"), evening = steps("evening");
  const products = r.recommendations?.products || [];
  const hasCare = morning.length + evening.length + products.length > 0;
  const corrected = finalDx && finalDx.trim().toLowerCase() !== (r.condition || "").trim().toLowerCase();
  const dot = (s: string) => (s === "red" ? D.err : s === "yellow" ? D.warn : D.action);

  return (
    <div className="flex flex-col" style={{ gap: 14, fontFamily: FONT_UI, color: D.text }} data-testid="derm-analysis-card">
      {/* En-tête : photo, patient, proposition de l'IA, Glow Score */}
      <div className="flex flex-wrap items-start" style={{ ...box, gap: 18, padding: 20 }}>
        {imageUrl && <img src={imageUrl} alt="Photo clinique" style={{ width: 112, height: 112, objectFit: "cover", borderRadius: 10, border: `1px solid ${D.border}`, flex: "none" }} />}
        <div className="flex flex-col" style={{ flex: "1 1 260px", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: D.muted }}>{[patientName, age ? `${age} ans` : "", duration ? `Depuis ${duration}` : ""].filter(Boolean).join(" · ")}</span>
          <span style={{ ...kick, color: D.action, marginTop: 2 }}>Proposition indicative de l'IA</span>
          <b style={{ fontSize: 22, fontWeight: 600, letterSpacing: -.3, lineHeight: 1.2 }}>{r.condition || "Analyse non concluante"}</b>
          <span className="flex flex-wrap items-center" style={{ gap: 8 }}>
            {(r.severityLabel || r.severity) && <span style={{ padding: "3px 10px", borderRadius: 999, background: sev.bg, color: sev.c, fontSize: 12.5, fontWeight: 600 }}>{r.severityLabel || r.severity}</span>}
            {r.conditionSecondaire && <span style={{ padding: "3px 10px", borderRadius: 999, background: D.infoBg, color: D.info, fontSize: 12.5, fontWeight: 600 }}>Secondaire : {r.conditionSecondaire}</span>}
            {r.confidence && <span style={{ fontSize: 12.5, color: D.muted }}>{confLabel[r.confidence]}</span>}
          </span>
        </div>
        <div className="grid place-items-center" style={{ flex: "none", width: 96, padding: "12px 0", borderRadius: 10, background: D.tintActive, textAlign: "center" }}>
          <b style={{ fontSize: 30, fontWeight: 700, color: D.actionDark, lineHeight: 1 }}>{r.score ?? "–"}</b>
          <span style={{ fontSize: 11.5, color: D.muted, marginTop: 4 }}>Glow Score /100</span>
        </div>
      </div>

      {corrected && (
        <div style={{ ...box, padding: "14px 18px", background: D.tintChip, border: `1px solid ${D.borderAlt}` }}>
          <span style={{ ...kick, color: D.actionDark }}>Diagnostic retenu par vous</span>
          <b style={{ display: "block", marginTop: 4, fontSize: 17, fontWeight: 600 }}>{finalDx}</b>
          <span style={{ fontSize: 13, color: D.muted }}>Il remplace la proposition de l'IA dans le dossier et le compte rendu.</span>
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ ...box, padding: "14px 18px", background: D.errBg, border: "1px solid #f0cfc6" }}>
          <span className="flex items-center" style={{ ...kick, display: "flex", color: D.err, gap: 6 }}><AlertTriangle size={14} />Signaux à surveiller</span>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: "#6e2a1c" }}>{flags.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}

      {/* Profil cutané */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        {stats.filter(([, v]) => v && String(v).trim()).map(([k, v]) => (
          <div key={k} style={{ ...box, padding: "12px 14px" }}>
            <span style={kick}>{k}</span>
            <b style={{ display: "block", marginTop: 5, fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>{v}</b>
          </div>
        ))}
      </div>

      {zones.length > 0 && (
        <div style={{ ...box, padding: "14px 18px" }}>
          <span style={kick}>Zones examinées</span>
          <div className="flex flex-col" style={{ gap: 8, marginTop: 8 }}>
            {zones.map((z) => (
              <div key={z.name} className="flex" style={{ gap: 10, fontSize: 14, lineHeight: 1.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: dot(z.status), marginTop: 7, flex: "none" }} />
                <span><b style={{ fontWeight: 600 }}>{z.name}</b>{z.short ? ` · ${z.short}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(synth || key) && (
        <div style={{ ...box, padding: "16px 18px" }}>
          <span className="flex items-center justify-between" style={{ gap: 10 }}>
            <span className="flex items-center" style={{ ...kick, display: "flex", gap: 6 }}><Sparkles size={14} color={D.action} />Synthèse de l'analyse</span>
            <span style={{ fontSize: 11.5, color: D.muted }}>Générée par l'IA · indicative</span>
          </span>
          {key && <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{key}</p>}
          {synth && synth !== key && <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#3d4f48" }}>{synth}</p>}
        </div>
      )}

      {hasCare && (
        <div style={{ ...box, padding: "4px 18px" }}>
          <button type="button" onClick={() => setCare(!care)} className="flex w-full cursor-pointer items-center justify-between" style={{ padding: "12px 0", background: "none", border: 0, fontFamily: FONT_UI, color: D.text }} data-testid="analysis-care-toggle">
            <span style={kick}>Soins suggérés par l'IA · à valider par vous</span>
            <ChevronDown size={16} style={{ transform: care ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {care && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, paddingBottom: 16 }}>
              {([["Matin", morning], ["Soir", evening]] as const).filter(([, l]) => l.length).map(([t, l]) => (
                <div key={t}>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</b>
                  <ol style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6, color: "#3d4f48" }}>
                    {l.map(([s, p, w], i) => <li key={i}><b style={{ fontWeight: 600, color: D.text }}>{s}</b>{p ? ` : ${p}` : ""}{w ? <span style={{ color: D.muted }}> ({w})</span> : null}</li>)}
                  </ol>
                </div>
              ))}
              {products.length > 0 && (
                <div>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>Produits cités</b>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6, color: "#3d4f48" }}>{products.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <span className="flex items-center" style={{ gap: 6, fontSize: 12.5, color: D.muted }}>
        <AlertTriangle size={13} />Analyse indicative générée par GlowScan. Votre examen et votre diagnostic priment.
      </span>
    </div>
  );
}
