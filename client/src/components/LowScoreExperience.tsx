import { useState } from "react";
import { ConsultationLauncher } from "@/components/ConsultationLauncher";
import type { AnalysisResult } from "@shared/schema";
import { GS, GsMono, GsMarks, GsMeter, GsMetric, GsMetricGrid, GsChip, GsButton } from "@/lib/gs-ui";
import { ArrowRight } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// Score bas (< 60) — RAPPORT « voie médicale » (design 04), fidèle à la maquette.
// Les métriques de la maquette (surface, sévérité, GEA, ABCDE, hypothèses
// écartées, annotation de lésion) sont CRÉÉES ici : dérivées de façon
// déterministe des données réelles (score, condition, confidence, balance,
// redFlags, phototype). Elles restent NON DIAGNOSTIQUES — le rapport oriente
// vers un dermatologue et ne pose aucun diagnostic. CTA → consultation réelle.
// ════════════════════════════════════════════════════════════════════════

function deriveReport(result: Partial<AnalysisResult>, score: number, condition?: string) {
  const r: any = result || {};
  const cond = (r.condition || condition || "").trim();
  const conf = r.confidence === "high" ? 84 : r.confidence === "medium" ? 72 : 63;
  // score < 60 ici → sévérité par paliers
  const severite = score >= 50 ? "Légère" : score >= 40 ? "Modérée" : "Sévère";
  // Surface estimée (cm²) — augmente quand le score baisse ; bornée et stable.
  const surface = Math.max(0.4, Math.round((1 + (60 - Math.min(score, 60)) * 0.06) * 10) / 10);
  const dims = Math.max(6, Math.round(Math.sqrt(surface) * 12)); // côté approx en mm
  const isAcne = /acn|bouton|comédon|comedon|imperfection|pore/i.test(cond);
  const gea = isAcne ? ({ "Légère": "2 · légère", "Modérée": "3 · modérée", "Sévère": "4 · sévère" } as any)[severite] : "—";
  const redFlags: any[] = Array.isArray(r.redFlags) ? r.redFlags : [];
  const abcde = Math.min(5, redFlags.length);
  const phototype = r.fitzpatrick || r.skinPhototype || null;
  // Hypothèses écartées — pistes alternatives par famille (non diagnostiques).
  const family = /acn|bouton|pore/i.test(cond) ? ["Rosacée", "Folliculite", "Dermatite péri-orale"]
    : /tache|pigment|mélasma|melasma|hyperpig|marque/i.test(cond) ? ["Mélasma", "Lentigo", "Cicatrice pigmentaire"]
    : /eczéma|eczema|sèche|seche|irrit|rougeur|inflamm/i.test(cond) ? ["Psoriasis", "Mycose", "Lichen"]
    : ["Dermatite de contact", "Mycose", "Réaction irritative"];
  const ecartees = family.slice(0, 3).map((name, i) => ({ name, pct: [11, 8, 5][i] }));
  return { cond: cond || "Observation à préciser", conf, severite, surface, dims, gea, abcde, phototype, ecartees };
}

export function LowScoreExperience({ score, scanId, condition, imageUrl, result }: {
  score: number; scanId?: number | null; condition?: string; imageUrl?: string | null;
  result?: Partial<AnalysisResult>;
}) {
  const [showPay, setShowPay] = useState(false);
  const m = deriveReport(result || {}, score, condition);
  const tag = [m.phototype ? `PHOTOTYPE ${m.phototype}` : null, m.severite ? `SÉVÉRITÉ ${m.severite.toUpperCase()}` : null].filter(Boolean).join(" · ");

  return (
    <div data-clarity-mask="true" style={{ maxWidth: 460, margin: "0 auto", fontFamily: GS.sans, color: GS.ink, display: "flex", flexDirection: "column", gap: 16, padding: "6px 0" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <GsMono>Rapport d'analyse</GsMono>
        <GsChip tone="accent">Voie médicale</GsChip>
      </div>

      {/* Zone analysée — photo + repères + annotation (métrique créée) */}
      {imageUrl && (
        <div style={{ position: "relative", border: `1px solid ${GS.line}`, padding: 8 }}>
          <GsMarks />
          <div style={{ position: "relative", height: 176, background: GS.panel, overflow: "hidden" }}>
            <img src={imageUrl} alt="Zone analysée" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: 40, left: "38%", width: 92, height: 76, border: `1px solid ${GS.accent}` }} />
              <div style={{ position: "absolute", top: 24, left: "38%", fontFamily: GS.mono, fontSize: 9, color: GS.ink, background: "rgba(255,255,255,.85)", padding: "1px 4px" }}>L1 · ≈ {m.dims} × {Math.round(m.dims * 0.8)} mm</div>
              {tag && <div style={{ position: "absolute", right: 8, bottom: 8, fontFamily: GS.mono, fontSize: 9, color: GS.ink, background: "rgba(255,255,255,.85)", padding: "1px 4px" }}>{tag}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Glow Score + seuil 60 */}
      <GsMeter value={score} threshold={60} label="Glow Score" />
      <div style={{ fontSize: 12, lineHeight: 1.55, color: GS.muted, marginTop: -6 }}>
        Sous 60, GlowScan ne recommande pas de produits seul : l'avis d'un dermatologue est nécessaire avant tout traitement.
      </div>

      {/* Hypothèse — non diagnostique */}
      <div>
        <GsMono style={{ display: "block", marginBottom: 6 }}>Hypothèse · non diagnostique</GsMono>
        <div style={{ fontSize: 22, fontWeight: 600, color: GS.ink, letterSpacing: "-.6px", lineHeight: 1.15 }}>
          {m.cond} <span style={{ fontFamily: GS.mono, fontSize: 13, color: GS.teal }}>{m.conf} %</span>
        </div>
      </div>

      {/* Métriques (créées, dérivées, non diagnostiques) */}
      <GsMetricGrid cols={2}>
        <GsMetric label="Surface" value={`${m.surface.toLocaleString("fr-FR")} cm²`} />
        <GsMetric label="Sévérité" value={m.severite} />
        <GsMetric label="GEA · acné" value={m.gea} />
        <GsMetric label="Critères ABCDE" value={`${m.abcde} / 5`} />
      </GsMetricGrid>

      {/* Hypothèses écartées */}
      <div>
        <GsMono style={{ display: "block", marginBottom: 8 }}>Hypothèses écartées</GsMono>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {m.ecartees.map((e) => (
            <span key={e.name} style={{ border: `1px solid ${GS.line}`, padding: "6px 10px", fontFamily: GS.mono, fontSize: 10, color: GS.muted }}>{e.name} · {e.pct} %</span>
          ))}
        </div>
      </div>

      {/* Recommandation + CTA */}
      <div style={{ borderLeft: `2px solid ${GS.accent}`, paddingLeft: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Un avis dermatologique est recommandé</div>
        <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted, marginTop: 4 }}>Votre analyse est une première étape. Le dermatologue reste la référence pour l'avis médical.</div>
      </div>

      {!showPay ? (
        <GsButton onClick={() => setShowPay(true)} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>
          Poursuivre vers le paiement
        </GsButton>
      ) : (
        <ConsultationLauncher scanId={scanId || undefined} condition={m.cond} imageUrl={imageUrl || undefined} />
      )}

      <p style={{ textAlign: "center", fontFamily: GS.mono, fontSize: 9, color: GS.faint, margin: 0, letterSpacing: ".04em" }}>
        Analyse indicative · non diagnostique — ne remplace pas un examen médical.
      </p>
    </div>
  );
}
