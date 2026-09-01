import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Tooltip contextuel — s'affiche UNE SEULE FOIS au premier usage d'une
// fonctionnalité. Persisté en base (pro_accounts.tooltips_seen JSONB).
// Non bloquant : un bouton « Compris » le ferme définitivement.
// ════════════════════════════════════════════════════════════════════════
export function ContextualTip({ tipKey, title, body }: { tipKey: string; title: string; body: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pro/onboarding", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && !(d.tooltipsSeen || {})[tipKey]) setShow(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tipKey]);

  const dismiss = () => {
    setShow(false);
    fetch("/api/pro/onboarding", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tooltipSeen: tipKey }),
    }).catch(() => {});
  };

  if (!show) return null;

  return (
    <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: "11px 13px", margin: "10px 0" }}>
      <p style={{ fontSize: 12.5, fontWeight: 800, color: "#7c3aed", margin: "0 0 3px" }}>{title}</p>
      <p style={{ fontSize: 12, color: "#475569", margin: "0 0 8px", lineHeight: 1.5 }}>{body}</p>
      <button onClick={dismiss}
        style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
        Compris →
      </button>
    </div>
  );
}
