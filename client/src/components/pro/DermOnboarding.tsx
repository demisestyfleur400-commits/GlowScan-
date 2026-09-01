import { useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Onboarding DERM — écran de bienvenue (Étape 0) + tour guidé 6 étapes.
// Non bloquant : « Passer » à tout moment. Persisté en base à la fin.
// Style : plein écran sombre pour l'accueil, coach card en bas pour le tour.
// ════════════════════════════════════════════════════════════════════════

const TOUR: { icon: string; title: string; body: string }[] = [
  { icon: "🏠", title: "Votre tableau de bord", body: "Vous voyez en un coup d'œil vos patients, vos consultations en attente et vos analyses du jour." },
  { icon: "🌐", title: "Votre profil public", body: "C'est votre vitrine. Complétez-le pour apparaître sur GlowScan et être trouvé par vos futurs patients. Les dermatos avec profil complet reçoivent 3× plus de patients." },
  { icon: "🔬", title: "Analyser un patient", body: "Ici commence chaque consultation. En 5 étapes guidées, vous créez le dossier, analysez la peau avec l'IA et générez le rapport PDF automatiquement." },
  { icon: "💬", title: "Consultations en ligne", body: "Des patients de GlowScan vous consultent directement en ligne. Vous êtes payé sur Mobile Money." },
  { icon: "🗓️", title: "Votre agenda", body: "Gérez vos rendez-vous. L'IA classe automatiquement vos RDV, et vous recevez un rappel 2 heures avant chaque consultation." },
  { icon: "📱", title: "La navigation", body: "La barre du bas vous donne accès à tout GlowScan DERM : Dashboard · Patients · Analyse · Consultations · Agenda." },
];

async function persistDone() {
  try { await fetch("/api/pro/onboarding", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: true }) }); } catch {}
}

export function DermOnboarding({ dermName, onDone }: { dermName?: string; onDone: () => void }) {
  const [phase, setPhase] = useState<"welcome" | "tour">("welcome");
  const [step, setStep] = useState(0);

  const finish = async () => { await persistDone(); onDone(); };
  const name = (dermName || "").replace(/^dr\.?\s*/i, "").trim();

  // ── Étape 0 : écran de bienvenue plein écran ──
  if (phase === "welcome") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "linear-gradient(160deg,#0d0a1e,#1a1230)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        <div style={{ maxWidth: 380, width: "100%" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#a78bfa", letterSpacing: 1, margin: "0 0 18px" }}>✦ GlowScan DERM</p>
          <p style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 10px" }}>Bienvenue{name ? ` Dr ${name}` : ""} 👋</p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: "0 0 6px" }}>Votre cabinet numérique est prêt.</p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: "0 0 28px" }}>On vous montre comment en tirer le meilleur en 2 minutes.</p>
          <button onClick={() => setPhase("tour")}
            style={{ width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "15px", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 14 }}>
            Commencer la visite →
          </button>
          <button onClick={finish} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Passer pour l'instant
          </button>
        </div>
      </div>
    );
  }

  // ── Étape 1 : tour guidé (coach card en bas) ──
  const t = TOUR[step];
  const last = step === TOUR.length - 1;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(10,8,20,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#171226", borderRadius: 22, padding: 22, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>{t.icon}</div>
        <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: "0 0 6px" }}>{t.title}</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: "0 0 16px" }}>{t.body}</p>

        {/* Indicateur de progression ● ● ○ ○ ○ ○ */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
          {TOUR.map((_, i) => (
            <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 9999, background: i === step ? "#a78bfa" : "rgba(255,255,255,0.25)", transition: "all .2s" }} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {step > 0 ? (
            <button onClick={() => setStep((s) => s - 1)} style={{ flex: "0 0 auto", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", borderRadius: 9999, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Précédent</button>
          ) : (
            <button onClick={finish} style={{ flex: "0 0 auto", background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Passer</button>
          )}
          <button onClick={() => (last ? finish() : setStep((s) => s + 1))}
            style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "12px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            {last ? "Terminer la visite ✓" : "Suivant →"}
          </button>
        </div>
      </div>
    </div>
  );
}
