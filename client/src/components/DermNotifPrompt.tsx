import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Prompt d'activation des notifications pour le dermatologue — pour recevoir
// les alertes de consultations en ligne (nouveau patient / nouveau message).
// Réutilise /api/push/vapid-key + /api/push/subscribe (lié à l'utilisateur connecté).
// ════════════════════════════════════════════════════════════════════════

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function DermNotifPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem("derm-push-dismissed")) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (!sub) setShow(true);
    }).catch(() => {});
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { dismiss(); return; }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch("/api/push/vapid-key")).json();
      if (!publicKey) return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await fetch("/api/push/subscribe", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), morningReminder: false, eveningReminder: false }),
      });
      setShow(false);
    } catch (e) { console.error("[derm push] échec:", e); }
    finally { setLoading(false); }
  };

  const dismiss = () => { try { localStorage.setItem("derm-push-dismissed", "1"); } catch {} setShow(false); };

  if (!show) return null;

  return (
    <div style={{ background: "rgba(124,58,237,0.10)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 18, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", margin: 0 }}>Activez les notifications</p>
        <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0", lineHeight: 1.5 }}>
          Pour être alerté dès qu'un patient vous consulte ou vous écrit en ligne.
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={subscribe} disabled={loading}
          style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "…" : "Activer"}
        </button>
        <button onClick={dismiss}
          style={{ background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 9999, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          ✕
        </button>
      </div>
    </div>
  );
}
