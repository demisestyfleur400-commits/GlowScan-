import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Notifications du dermatologue sur cet ordinateur (web push) : patient en
// attente, message, paiement, compte rendu à envoyer… Fonctionne dans le
// logiciel installé comme dans le navigateur (Chrome / Edge), même fenêtre fermée
// tant que le navigateur tourne.
// ════════════════════════════════════════════════════════════════════════

export type DermPushState = "loading" | "unsupported" | "ios-install" | "denied" | "enabled" | "available";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/** Service worker prêt, sans jamais bloquer l'écran : l'enregistre si besoin, abandonne après 4 s. */
async function swReady(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!(await navigator.serviceWorker.getRegistration())) await navigator.serviceWorker.register("/service-worker.js").catch(() => null);
    return await Promise.race([navigator.serviceWorker.ready, new Promise<null>((ok) => setTimeout(() => ok(null), 4000))]);
  } catch { return null; }
}

export function useDermPush() {
  const [state, setState] = useState<DermPushState>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(isIos && !standalone ? "ios-install" : "unsupported"); return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    try {
      const reg = await swReady();
      setState(reg && (await reg.pushManager.getSubscription()) ? "enabled" : "available");
    } catch { setState("available"); }
  };
  useEffect(() => { refresh(); }, []);

  /** Demande l'autorisation, abonne cet appareil, puis envoie une notification de test. */
  const enable = async (): Promise<string | null> => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "available"); return "Autorisation refusée."; }
      const reg = await swReady();
      if (!reg) return "Le service de notifications ne s'est pas lancé. Rechargez la page puis réessayez.";
      const { publicKey } = await (await fetch("/api/push/vapid-key")).json();
      if (!publicKey) return "Notifications indisponibles pour le moment (configuration du serveur).";
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await fetch("/api/push/subscribe", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), morningReminder: false, eveningReminder: false }),
      });
      setState("enabled");
      await test();
      return null;
    } catch (e: any) { return e?.message || "Activation impossible."; }
    finally { setBusy(false); }
  };

  const test = async (): Promise<boolean> => {
    try { return (await fetch("/api/push/test", { method: "POST", credentials: "include" })).ok; } catch { return false; }
  };

  return { state, busy, enable, test };
}
