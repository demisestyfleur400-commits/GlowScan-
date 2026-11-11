import { useEffect, useState } from "react";
import { useRoute } from "wouter";

// ════════════════════════════════════════════════════════════════════════
// Avis d'un patient du cabinet (D6), sans compte : /avis/:token. Note de 1 à 5
// et commentaire facultatif. Affiché au médecin sans l'identité du patient.
// ════════════════════════════════════════════════════════════════════════

const C = { bg: "#f3f6f3", card: "#fff", text: "#17392c", muted: "#66766f", action: "#2a6b4f", border: "#e4e8e3" };

export default function AvisPatient() {
  const [, params] = useRoute("/avis/:token");
  const token = params?.token || "";
  const [info, setInfo] = useState<{ doctor: string; cabinet: string | null; answered: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    fetch(`/api/avis/${encodeURIComponent(token)}`).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d?.message || "Lien invalide."); setInfo(d); }).catch((e) => setErr(e.message));
  }, [token]);
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/avis/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Envoi impossible.");
      setSent(true);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const done = sent || info?.answered;
  return (
    <main style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 16, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <div style={{ width: "100%", maxWidth: 440, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: .8, color: C.action }}>GLOWSCAN · VOTRE AVIS</span>
        {err && !info ? <p style={{ margin: 0, fontSize: 14 }}>{err}</p> : !info ? <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Chargement…</p> : done ? (
          <>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: "inherit", fontWeight: 700 }}>Merci pour votre avis.</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Il aide {info.doctor} à améliorer ses consultations. Votre identité n'est pas affichée.</p>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.25, fontFamily: "inherit", fontWeight: 700 }}>Comment s'est passée votre consultation avec {info.doctor} ?</h1>
            {info.cabinet && <span style={{ fontSize: 12, color: C.muted }}>{info.cabinet}</span>}
            <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label="Note de 1 à 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)}
                  style={{ flex: 1, height: 48, borderRadius: 8, border: `1px solid ${rating >= n ? C.action : C.border}`, background: rating >= n ? C.action : "#fff", color: rating >= n ? "#fff" : C.text, fontSize: 17, fontWeight: 700, cursor: "pointer" }}>{n}</button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: C.muted }}>1 = pas satisfait · 5 = très satisfait</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={1000} placeholder="Un commentaire ? (facultatif)"
              style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "#f8faf7", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
            {err && <span style={{ fontSize: 12, color: "#9b3a28" }}>{err}</span>}
            <button type="button" disabled={!rating || busy} onClick={submit}
              style={{ height: 46, border: 0, borderRadius: 8, background: rating ? C.action : "#d5ddd9", color: "#fff", fontSize: 15, fontWeight: 700, cursor: rating ? "pointer" : "default" }}>{busy ? "Envoi…" : "Envoyer mon avis"}</button>
            <span style={{ fontSize: 11, color: C.muted }}>Votre avis est anonyme pour le médecin. Il ne remplace pas un avis médical : en cas d'aggravation, contactez votre cabinet.</span>
          </>
        )}
      </div>
    </main>
  );
}
