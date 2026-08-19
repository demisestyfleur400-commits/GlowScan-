import { useEffect, useState } from "react";
import { Link } from "wouter";

// Page de confirmation post-paiement d'une consultation.
// Atteinte via le return_url du fournisseur de paiement (?id=<consultationId>).

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function ConsultationConfirmee() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("paid") || "";
  const [derm, setDerm] = useState<string | null>(null);
  const [paid, setPaid] = useState<boolean | null>(null);
  const [pushState, setPushState] = useState<"idle" | "on" | "denied">("idle");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/consultations/${id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setDerm(d.doctor?.fullName ? d.doctor.fullName.replace(/^dr\.?\s*/i, "") : null);
        setPaid(d.consultation?.paymentStatus === "paid");
      })
      .catch(() => {});
  }, [id]);

  const enablePush = async () => {
    try {
      if (!("Notification" in window) || !navigator.serviceWorker) { setPushState("denied"); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch("/api/push/vapid-key")).json();
      if (!publicKey) return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await fetch("/api/push/subscribe", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      setPushState("on");
    } catch { setPushState("denied"); }
  };

  const VIOLET = "#7c3aed";
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", fontFamily: '-apple-system, system-ui, sans-serif', display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 22, padding: 28, textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 14px" }}>✅</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", margin: "0 0 6px" }}>
          {paid === false ? "Paiement en cours de confirmation" : "Paiement reçu"}
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: "0 0 18px" }}>
          {derm ? <>Dr <strong>{derm}</strong> a été notifié{paid === false ? " dès confirmation du paiement" : ""}.</> : "Ton dermatologue a été notifié."}
          <br />Il répond généralement <strong>sous 30 minutes</strong>.
        </p>

        {/* Activer notifications */}
        {pushState !== "on" ? (
          <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, padding: 14, marginBottom: 14, textAlign: "left" }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}>🔔 Sois prévenu(e) dès qu'il répond</p>
            <button onClick={enablePush} style={{ width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 9999, padding: "11px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              Activer les notifications
            </button>
            {pushState === "denied" && <p style={{ fontSize: 10.5, color: "#dc2626", margin: "6px 0 0" }}>Notifications bloquées — active-les dans les réglages du navigateur.</p>}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#059669", fontWeight: 700, marginBottom: 14 }}>✅ Notifications activées</p>
        )}

        <Link href={id ? `/consultations` : "/consultations"} style={{ display: "block", background: VIOLET, color: "#fff", borderRadius: 9999, padding: "13px", fontSize: 14, fontWeight: 800, textDecoration: "none", marginBottom: 8 }}>
          Ouvrir la conversation →
        </Link>
        <Link href="/" style={{ fontSize: 12, color: "#9ca3af", textDecoration: "none" }}>Retour à l'accueil</Link>
      </div>
    </div>
  );
}
