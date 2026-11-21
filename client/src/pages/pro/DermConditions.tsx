import { useEffect } from "react";
import { useLocation } from "wouter";
import { CGU_VERSION } from "@shared/cgu";
import { CGU_INTRO, CGU_SECTIONS, CGU_VERSION_LABEL, CguBody, type CguTheme } from "@/content/CguText";

// ════════════════════════════════════════════════════════════════════════
// Conditions générales d'utilisation — GlowScan Derm (/derm/conditions).
// Même texte que /cgu (source unique : content/CguText.tsx), style de l'espace pro.
// Le professionnel les accepte à l'inscription ; la version est enregistrée.
// ════════════════════════════════════════════════════════════════════════

export const DERM_TERMS_VERSION = CGU_VERSION;

const INK = "#0F172A";
const BODY = "#475569";
const MUTED = "#64748B";
const VIOLET = "#0369A1";
const CARD = "#F1F5F9";
const BORDER = "rgba(167,139,250,0.18)";
const THEME: CguTheme = { ink: INK, body: BODY, accent: VIOLET };

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 8px" }}>
        <span style={{ color: VIOLET }}>{n}.</span> {title}
      </h2>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: BODY }}>{children}</div>
    </div>
  );
}

export default function DermConditions() {
  const [, setLocation] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F6FAFD", color: INK, padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(13,10,14,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${BORDER}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => history.length > 1 ? history.back() : setLocation("/derm")}
          style={{ background: "#F1F5F9", border: "none", color: INK, borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>←</button>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Conditions générales d'utilisation</p>
          <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>GlowScan Derm · {DERM_TERMS_VERSION}</p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 18px 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: INK, margin: "0 0 4px" }}>Conditions générales d'utilisation — GlowScan Africa</h1>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 16 }}><CguBody body={CGU_VERSION_LABEL} theme={THEME} /></div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: BODY, margin: 0 }}>{CGU_INTRO}</p>
        </div>

        {CGU_SECTIONS.map((s) => (
          <Section key={s.n} n={String(s.n)} title={s.title}><CguBody body={s.body} theme={THEME} /></Section>
        ))}

        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 24, lineHeight: 1.6 }}>
          Voir aussi la <a href="/confidentialite" style={{ color: VIOLET, fontWeight: 700 }}>Politique de confidentialité</a>.
        </p>
      </div>
    </div>
  );
}
