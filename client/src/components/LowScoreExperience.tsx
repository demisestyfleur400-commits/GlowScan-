import { useState } from "react";
import { ConsultationLauncher } from "@/components/ConsultationLauncher";

// ════════════════════════════════════════════════════════════════════════
// Score bas (< 60) — expérience confiance (B2C). Au lieu d'un renvoi abrupt
// vers un dermatologue payant, on reformule sans alarmer, on explique
// exactement ce qui se passe AVANT de montrer le prix, on rassure, puis on
// propose. Option « je préfère attendre » (rappel 24 h). Zéro pression.
// ════════════════════════════════════════════════════════════════════════

const DS = {
  ink: "#1a1a2e", body: "#374151", muted: "#6b7280", violet: "#7c3aed",
};

export function LowScoreExperience({ score, scanId, condition, imageUrl }: {
  score: number; scanId?: number | null; condition?: string; imageUrl?: string | null;
}) {
  const [phase, setPhase] = useState<"reframe" | "explainer">("reframe");
  const [waited, setWaited] = useState(false);

  const remindLater = async () => {
    setWaited(true);
    try {
      await fetch("/api/b2c/remind-later", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
    } catch {}
  };

  // ── ÉTAPE 1 — Reformulation empathique ──
  if (phase === "reframe") {
    return (
      <div data-testid="lowscore-reframe" style={{ maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22, padding: "8px 0", fontFamily: "-apple-system, system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 96, height: 96, borderRadius: "50%", background: "rgba(220,38,38,0.06)", border: "2px solid rgba(220,38,38,0.3)" }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#b91c1c", letterSpacing: "0.1em", marginTop: 2 }}>GLOW SCORE</span>
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "0 6px" }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: DS.ink, lineHeight: 1.35, margin: "0 0 12px" }}>
            Ta peau mérite une attention particulière. 🩺
          </p>
          <p style={{ fontSize: 14.5, fontWeight: 500, color: DS.body, lineHeight: 1.6, margin: 0 }}>
            Ton Glow Score indique des signes que seul un dermatologue peut évaluer correctement.
          </p>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: DS.ink, lineHeight: 1.6, margin: "10px 0 0" }}>
            Ce n'est pas grave — mais c'est important.
          </p>
        </div>
        <button onClick={() => setPhase("explainer")}
          style={{ width: "100%", minHeight: 56, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: 15.5, fontWeight: 800, cursor: "pointer" }}>
          Voir comment ça marche →
        </button>
        <p style={{ textAlign: "center", fontSize: 9.5, color: DS.muted, margin: 0 }}>
          Analyse indicative — ne remplace pas un diagnostic médical.
        </p>
      </div>
    );
  }

  // ── ÉTAPE 2 — Explication du process (confiance) + preuve sociale + CTA ──
  const steps = [
    { n: "①", t: "Tu paies via MTN ou Orange Money", d: "Sécurisé · pas de carte bancaire requise." },
    { n: "②", t: "Ton dossier va à un dermatologue certifié", d: "Un vrai médecin, humain et qualifié. Pas un robot." },
    { n: "③", t: "Il analyse ta peau et te répond", d: "Un rapport médical complet, en moins d'1 heure." },
  ];
  return (
    <div data-testid="lowscore-explainer" style={{ maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, padding: "8px 0", fontFamily: "-apple-system, system-ui, sans-serif" }}>
      <style>{`@keyframes gsStepIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <p style={{ fontSize: 16, fontWeight: 800, color: DS.ink, textAlign: "center", margin: 0 }}>
        Voici ce qui se passe si tu consultes :
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#faf9ff", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 14, padding: "12px 14px", animation: `gsStepIn .35s ease both`, animationDelay: `${i * 0.3}s` }}>
            <span style={{ fontSize: 20, color: DS.violet, flexShrink: 0, lineHeight: 1.2 }}>{s.n}</span>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 800, color: DS.ink, margin: 0 }}>{s.t}</p>
              <p style={{ fontSize: 12, color: DS.muted, margin: "2px 0 0", lineHeight: 1.5 }}>{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preuve sociale */}
      <p style={{ textAlign: "center", fontSize: 12.5, fontWeight: 600, color: DS.body, margin: 0 }}>
        Déjà utilisé par des patients au Cameroun, au Bénin et en RDC. 🇨🇲🇧🇯🇨🇩
      </p>

      {/* Garantie remboursement — signal de confiance */}
      <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#047857", margin: 0, lineHeight: 1.5 }}>
          🛡️ Remboursé si aucun dermatologue ne répond sous 2 h.
        </p>
      </div>

      {/* Le vrai lanceur de consultation (dermatologues + paiement Mobile Money) */}
      <ConsultationLauncher scanId={scanId || undefined} condition={condition || ""} imageUrl={imageUrl || undefined} />

      {/* Option secondaire — aucune pression */}
      {waited ? (
        <p style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#047857", margin: 0 }}>
          ✅ On garde ton analyse. On te rappelle demain.
        </p>
      ) : (
        <button onClick={remindLater}
          style={{ background: "none", border: "none", color: DS.muted, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>
          Je préfère attendre →
        </button>
      )}
    </div>
  );
}
