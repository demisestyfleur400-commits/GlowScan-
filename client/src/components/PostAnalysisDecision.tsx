// ════════════════════════════════════════════════════════════════════════
// Bandeau de DÉCISION post-analyse (B2C) — « et maintenant ? »
// Transforme l'écran de résultat en page de décision : niveau de risque +
// une action principale personnalisée selon le risque, + actions secondaires.
// ════════════════════════════════════════════════════════════════════════

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PostAnalysisDecision({
  score, severity, redFlags, isLoggedIn,
}: {
  score?: number; severity?: string; redFlags?: string[]; isLoggedIn?: boolean;
}) {
  const s = typeof score === "number" ? score : 65;
  const high = (redFlags && redFlags.length > 0) || /s[ée]v[èe]re/i.test(severity || "") || s < 40;
  const medium = !high && (s < 70 || /mod[ée]r/i.test(severity || ""));
  const level: "low" | "medium" | "high" = high ? "high" : medium ? "medium" : "low";

  const RISK = {
    high: { label: "Attention requise", color: "#dc2626", bg: "#fef2f2", emoji: "🔴" },
    medium: { label: "À surveiller", color: "#d97706", bg: "#fffbeb", emoji: "🟠" },
    low: { label: "Faible risque", color: "#059669", bg: "#ecfdf5", emoji: "🟢" },
  }[level];

  // CTA principal personnalisé selon le niveau (verbe + bénéfice).
  const primary = {
    high: { label: "Consulter un dermatologue maintenant", target: "gs-consult" },
    medium: { label: "Parler à un dermatologue", target: "gs-consult" },
    low: { label: "Voir mes recommandations", target: "gs-analysis" },
  }[level];

  const VIOLET = "#7c3aed";

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 22, padding: 18, marginBottom: 16, boxShadow: "0 8px 30px rgba(124,58,237,0.08)" }}>
      <p style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", margin: 0 }}>Votre analyse est prête.</p>
      <p style={{ fontSize: 12.5, color: "#6b7280", margin: "3px 0 14px" }}>Voici ce que nous vous recommandons maintenant.</p>

      {/* Niveau de risque */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: RISK.bg, borderRadius: 14, padding: "10px 14px", marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{RISK.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: RISK.color, margin: 0 }}>Niveau de risque</p>
          <p style={{ fontSize: 14, fontWeight: 900, color: RISK.color, margin: "1px 0 0" }}>{RISK.label}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", margin: 0, lineHeight: 1 }}>{s}<span style={{ fontSize: 11, color: "#9ca3af" }}>/100</span></p>
        </div>
      </div>

      {/* Action principale personnalisée */}
      <button onClick={() => scrollToId(primary.target)}
        style={{ width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontSize: 14.5, fontWeight: 800, cursor: "pointer", marginBottom: 8 }}>
        {primary.label} →
      </button>

      {/* Actions secondaires */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={() => scrollToId("gs-analysis")}
          style={{ background: "#f3f0ff", color: VIOLET, border: "none", borderRadius: 12, padding: "11px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
          🧴 Produits recommandés
        </button>
        <a href={isLoggedIn ? "/profile" : "/auth"}
          style={{ background: "#f6f7fb", color: "#374151", borderRadius: 12, padding: "11px", fontSize: 12.5, fontWeight: 800, textDecoration: "none", textAlign: "center", display: "block" }}>
          {isLoggedIn ? "🔔 Suivre l'évolution" : "💾 Sauvegarder mon résultat"}
        </a>
      </div>

      {/* Réassurance */}
      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "12px 0 0", textAlign: "center", lineHeight: 1.5 }}>
        Analyse indicative — elle ne remplace pas l'examen d'un dermatologue.
      </p>
    </div>
  );
}
