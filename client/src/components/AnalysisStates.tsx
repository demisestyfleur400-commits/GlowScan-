import { useState } from "react";
import { ConsultationLauncher } from "@/components/ConsultationLauncher";
import { GS, GsMono, GsMarks } from "@/lib/gs-ui";
import { AlertTriangle, Check, ArrowRight } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// États système du parcours d'analyse (design 05 & 06) — écrans nouveaux.
// 05 Photo inexploitable : la capture ne permet pas l'analyse → reprendre une
//    vue, ou envoyer quand même à un dermatologue.
// 06 Orientation urgente : des signaux (redFlags réels) justifient un examen
//    physique rapide. NON diagnostique — oriente vers un professionnel.
// ════════════════════════════════════════════════════════════════════════

const shell: React.CSSProperties = { maxWidth: 460, margin: "0 auto", fontFamily: GS.sans, color: GS.ink, display: "flex", flexDirection: "column", gap: 16, padding: "6px 0" };

// ── 05 · PHOTO INEXPLOITABLE ──────────────────────────────────────────────
export function PhotoUnusable({ onRetry, badView = "Vue 2 · plan large", scanId, condition, imageUrl }: {
  onRetry: () => void; badView?: string; scanId?: number | null; condition?: string; imageUrl?: string | null;
}) {
  const [consult, setConsult] = useState(false);
  return (
    <div data-clarity-mask="true" style={shell}>
      <div style={{ width: 52, height: 52, border: `1px solid ${GS.red}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={24} style={{ color: GS.red }} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.8px", lineHeight: 1.18 }}>Nous ne pouvons pas analyser ces photos</div>
      <div style={{ fontSize: 13, lineHeight: 1.65, color: GS.muted }}>Rien n'est perdu : vos photos sont conservées. Reprenez seulement celle qui pose problème.</div>

      <div style={{ border: `1px solid ${GS.line}` }}>
        {[{ t: badView, s: "Flou de bougé — netteté 21 %", bad: true }, { t: "Vue 1 · macro", s: "Exploitable", bad: false }, { t: "Vue 3 · profil", s: "Exploitable", bad: false }].map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 13, padding: 14, borderBottom: i < 2 ? `1px solid ${GS.hair}` : "none", alignItems: "center" }}>
            <div style={{ width: 52, height: 52, flex: "none", background: GS.panel, border: `1px solid ${v.bad ? GS.red : GS.line}` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>{v.t}</div>
              <div style={{ fontSize: 11, marginTop: 3, color: v.bad ? GS.red : GS.teal }}>{v.s}</div>
            </div>
            {v.bad
              ? <span style={{ fontFamily: GS.mono, fontSize: 10, fontWeight: 600, color: GS.red, border: `1px solid ${GS.redLine}`, padding: "5px 8px" }}>REPRENDRE</span>
              : <Check size={17} style={{ color: GS.teal }} strokeWidth={2.5} />}
          </div>
        ))}
      </div>

      <div style={{ background: GS.panel, padding: 16 }}>
        <GsMono color={GS.teal} style={{ display: "block", marginBottom: 10, letterSpacing: ".14em" }}>Trois gestes qui changent tout</GsMono>
        <div style={{ fontSize: 12, lineHeight: 1.75, color: GS.muted }}>
          01 — Posez la zone sur un appui stable, pas en l'air.<br />02 — Lumière du jour, dos à la fenêtre.<br />03 — Attendez la netteté avant de déclencher.
        </div>
      </div>

      {consult ? (
        <ConsultationLauncher scanId={scanId || undefined} condition={condition || ""} imageUrl={imageUrl || undefined} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onRetry} style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 17, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Reprendre la photo</button>
          <button onClick={() => setConsult(true)} style={{ width: "100%", background: "#fff", color: GS.ink, border: `1px solid ${GS.ink}`, padding: 16, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Envoyer quand même à un médecin</button>
        </div>
      )}
    </div>
  );
}

// ── 06 · ORIENTATION URGENTE ──────────────────────────────────────────────
export function UrgentOrientation({ redFlags = [], scanId, condition, imageUrl }: {
  redFlags?: string[]; scanId?: number | null; condition?: string; imageUrl?: string | null;
}) {
  const [consult, setConsult] = useState(false);
  const flags = (redFlags || []).filter(Boolean).slice(0, 5);
  return (
    <div data-clarity-mask="true" style={shell}>
      {/* Bandeau rouge — pleine largeur */}
      <div style={{ background: GS.red, color: "#fff", padding: 22, margin: "0 -0px" }}>
        <GsMono style={{ display: "block", marginBottom: 12, opacity: 0.9, color: "#fff" }}>À faire examiner rapidement</GsMono>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.7px", lineHeight: 1.2 }}>Cette lésion mérite un examen en cabinet, pas en vidéo</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 12, opacity: 0.92 }}>Ce n'est pas un diagnostic, et il ne s'agit probablement de rien de grave. Mais plusieurs éléments de surveillance sont réunis : l'examen doit être physique.</div>
      </div>

      {flags.length > 0 && (
        <div>
          <GsMono style={{ display: "block", marginBottom: 10 }}>Éléments relevés</GsMono>
          <div style={{ border: `1px solid ${GS.line}` }}>
            {flags.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < flags.length - 1 ? `1px solid ${GS.hair}` : "none" }}>
                <span style={{ width: 8, height: 8, background: GS.red, flex: "none" }} />
                <span style={{ flex: 1, fontSize: 13, color: GS.ink }}>{f}</span>
                <GsMono color={GS.red} style={{ letterSpacing: 0 }}>À vérifier</GsMono>
              </div>
            ))}
          </div>
        </div>
      )}

      {consult ? (
        <ConsultationLauncher scanId={scanId || undefined} condition={condition || ""} imageUrl={imageUrl || undefined} />
      ) : (
        <>
          <div style={{ border: `1px solid ${GS.line}`, padding: 14, display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ width: 9, height: 9, background: GS.accent, flex: "none" }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Dermatologues GlowScan en ligne</div><GsMono style={{ letterSpacing: 0 }}>Dossier transmis en priorité</GsMono></div>
            <ArrowRight size={17} style={{ color: GS.ink }} />
          </div>
          <button onClick={() => setConsult(true)} style={{ width: "100%", background: GS.red, color: "#fff", border: "none", padding: 17, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Faites-vous consulter maintenant</button>
          <div style={{ fontSize: 11, color: GS.muted, textAlign: "center", lineHeight: 1.55 }}>Votre dossier passe en priorité. Le médecin décide ensuite s'il faut un examen physique.</div>
        </>
      )}
      <p style={{ textAlign: "center", fontFamily: GS.mono, fontSize: 9, color: GS.faint, margin: 0, letterSpacing: ".04em" }}>Orientation · non diagnostique — GlowScan n'évalue pas une urgence à distance.</p>
    </div>
  );
}
