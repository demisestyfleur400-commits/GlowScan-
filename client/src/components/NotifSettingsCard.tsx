import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Carte de réglage des notifications push — PERMANENTE (toujours visible dans
// les réglages), contrairement au bandeau one-shot du dashboard qui peut être
// zappé (redirection reprise auto) ou masqué une fois rejeté.
// Gère explicitement le cas iOS Safari : le web-push n'y marche QUE si l'app est
// installée sur l'écran d'accueil (PWA) → on affiche la consigne au lieu d'un
// bouton inopérant.
// ════════════════════════════════════════════════════════════════════════

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

type NotifState = "loading" | "unsupported" | "ios-install" | "denied" | "enabled" | "available";

export function NotifSettingsCard({ audience = "derm" }: { audience?: "derm" | "patient" }) {
  const [state, setState] = useState<NotifState>("loading");
  const [busy, setBusy] = useState(false);
  // Textes contextualisés selon le destinataire.
  const enabledMsg = audience === "patient"
    ? "✅ Notifications activées — tu seras prévenu dès que ton dermatologue répond à ta consultation."
    : "✅ Notifications activées sur cet appareil — tu seras alerté dès qu'un patient te consulte ou t'écrit.";
  const availableMsg = audience === "patient"
    ? "Active les notifications pour être prévenu dès que ton dermatologue te répond, même app fermée."
    : "Active les notifications pour être alerté d'une nouvelle consultation ou d'un nouveau message, même app fermée.";

  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = typeof window !== "undefined" &&
    ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone === true);

  const refresh = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // iOS en onglet Safari ne supporte pas le push → consigne d'installation PWA.
      setState(isIos && !isStandalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "enabled" : "available");
    } catch { setState("available"); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "available"); return; }
      const reg = await navigator.serviceWorker.ready;
      const resp = await fetch("/api/push/vapid-key");
      const { publicKey } = await resp.json();
      if (!publicKey) { console.error("[notif] VAPID public key absente"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), morningReminder: false, eveningReminder: false }),
      });
      setState("enabled");
    } catch (e) { console.error("[notif] activation échouée:", e); }
    finally { setBusy(false); }
  };

  const NAVY = "#7c3aed";
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: "16px 18px" };
  const title = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 18 }}>🔔</span>
      <h2 style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", margin: 0 }}>Notifications</h2>
    </div>
  );

  if (state === "loading") return null;

  return (
    <div style={card} data-testid="notif-settings">
      {title}
      {state === "enabled" && (
        <p style={{ fontSize: 12.5, color: "#047857", margin: 0, lineHeight: 1.5 }}>
          {enabledMsg}
        </p>
      )}
      {state === "available" && (
        <div>
          <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
            {availableMsg}
          </p>
          <button onClick={enable} disabled={busy} data-testid="button-enable-notif"
            style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 9999, padding: "9px 16px", fontSize: 12.5, fontWeight: 800, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Activation…" : "Activer les notifications"}
          </button>
        </div>
      )}
      {state === "denied" && (
        <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          🔕 Les notifications sont <strong style={{ color: "#b91c1c" }}>bloquées</strong> pour ce site. Réactive-les dans les réglages de ton navigateur
          (icône 🔒 / « aA » à côté de l'adresse → Notifications → Autoriser), puis reviens ici.
        </p>
      )}
      {state === "ios-install" && (
        <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          📱 Sur iPhone, les notifications ne fonctionnent qu'avec l'app installée. Dans Safari : bouton <strong style={{ color: "#0F172A" }}>Partager</strong> → <strong style={{ color: "#0F172A" }}>« Sur l'écran d'accueil »</strong>, ouvre GlowScan depuis l'icône, puis reviens ici pour activer.
        </p>
      )}
      {state === "unsupported" && (
        <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          Ton navigateur ne prend pas en charge les notifications push. Essaie Chrome (Android/ordinateur) ou installe l'app.
        </p>
      )}
    </div>
  );
}
