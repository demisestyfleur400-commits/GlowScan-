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
  // Textes contextualisés selon le destinataire (vouvoiement, sans emoji).
  const enabledMsg = audience === "patient"
    ? "Notifications activées : vous serez prévenu dès que votre dermatologue répond à votre consultation."
    : "Notifications activées sur cet appareil : vous serez alerté dès qu'un patient vous consulte ou vous écrit.";
  const availableMsg = audience === "patient"
    ? "Activez les notifications pour être prévenu dès que votre dermatologue vous répond, même appli fermée."
    : "Activez les notifications pour être alerté d'une nouvelle consultation ou d'un nouveau message, même appli fermée.";

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

  if (state === "loading") return null;

  const text = "m-0 text-[13px] leading-normal text-organic-neutral-800";
  return (
    <div className="flex flex-col gap-2 rounded-card bg-organic-surface p-organic-6" data-testid="notif-settings">
      <h3 className="m-0 text-[22px]">Notifications</h3>
      {state === "enabled" && <p className="m-0 text-[13px] leading-normal text-organic-accent-2-800">{enabledMsg}</p>}
      {state === "available" && (
        <>
          <p className={text}>{availableMsg}</p>
          <button type="button" onClick={enable} disabled={busy} data-testid="button-enable-notif"
            className="self-start cursor-pointer rounded-pill border-0 bg-organic-accent px-4 py-2 font-body text-[14px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600 disabled:opacity-50">
            {busy ? "Activation…" : "Activer les notifications"}
          </button>
        </>
      )}
      {state === "denied" && (
        <p className={text}>
          Les notifications sont <b className="text-organic-accent-800">bloquées</b> pour ce site. Réactivez-les dans les réglages de votre navigateur
          (icône du cadenas ou « aA » à côté de l'adresse, puis Notifications, puis Autoriser), puis revenez ici.
        </p>
      )}
      {state === "ios-install" && (
        <p className={text}>
          Sur iPhone, les notifications ne fonctionnent qu'avec l'appli installée. Dans Safari : bouton <b>Partager</b>, puis <b>« Sur l'écran d'accueil »</b> ; ouvrez GlowScan depuis l'icône, puis revenez ici pour activer.
        </p>
      )}
      {state === "unsupported" && (
        <p className={text}>Votre navigateur ne prend pas en charge les notifications. Essayez Chrome (Android ou ordinateur) ou installez l'appli.</p>
      )}
    </div>
  );
}
