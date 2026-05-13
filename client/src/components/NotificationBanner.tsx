import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBanner() {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // N'afficher qu'après la première analyse
    const firstScanDone = localStorage.getItem("glowscan_first_scan_done");
    if (!firstScanDone) return;

    const dismissed = localStorage.getItem("push-dismissed");
    if (dismissed) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscribed(true);
      } else {
        setTimeout(() => setShow(true), 800);
      }
    });
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          morningReminder: true,
          eveningReminder: true,
        }),
      });

      setSubscribed(true);
      setShow(false);
      // Déclenche la bannière PWA juste après
      try { localStorage.setItem("glowscan_push_done", "1"); } catch {}
    } catch (err) {
      console.error("Push subscription failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem("push-dismissed", "true");
    // Déclenche la bannière PWA juste après
    try { localStorage.setItem("glowscan_push_done", "1"); } catch {}
    setShow(false);
  }

  if (!show || subscribed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-md"
        data-testid="notification-banner"
      >
        <div className="rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 p-4 shadow-2xl text-white ring-1 ring-white/20">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white/30 p-2.5 shadow-lg">
              <Bell className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Rappels de routine</p>
              <p className="text-xs text-white/90 mt-0.5">
                Recevez des rappels matin et soir pour ne jamais oublier votre routine skincare !
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={subscribe}
                  disabled={loading}
                  className="rounded-full bg-white text-pink-600 px-4 py-1.5 text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
                  data-testid="button-enable-notifications"
                >
                  {loading ? "Activation..." : "Activer"}
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium hover:bg-white/30 transition-colors"
                  data-testid="button-dismiss-notifications"
                >
                  Plus tard
                </button>
              </div>
            </div>
            <button onClick={dismiss} className="text-white/60 hover:text-white" data-testid="button-close-notification-banner">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
