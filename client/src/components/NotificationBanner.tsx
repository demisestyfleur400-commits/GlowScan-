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
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    const firstScanDone = localStorage.getItem("glowscan_first_scan_done");
    if (!firstScanDone) return;

    const dismissed = localStorage.getItem("push-dismissed");
    if (dismissed) return;

    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setSubscribed(true);
        } else {
          setTimeout(() => setShow(true), 1500);
        }
      })
      .catch((err) => console.log("[GlowScan] ServiceWorker non prêt :", err));
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { dismiss(); return; }

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
        body: JSON.stringify({ subscription: sub.toJSON(), morningReminder: true, eveningReminder: true }),
      });

      setSubscribed(true);
      setShow(false);
      try { localStorage.setItem("glowscan_push_done", "1"); } catch {}
    } catch (err) {
      console.error("[GlowScan] Échec de l'abonnement push :", err);
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem("push-dismissed", "true");
    try { localStorage.setItem("glowscan_push_done", "1"); } catch {}
    setShow(false);
  }

  if (!show || subscribed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-6 left-4 right-4 z-[240] mx-auto max-w-sm"
        data-testid="notification-banner"
      >
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "#13101f",
            border: "1px solid rgba(167,139,250,0.2)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          }}
        >
          {/* Glow orb */}
          <div
            className="absolute -right-8 -top-8 w-24 h-24 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)" }}
          />

          <div className="flex items-start gap-3">
            <div
              className="rounded-xl p-2.5 flex-shrink-0"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
            >
              <Bell className="h-4 w-4" style={{ color: "#a78bfa" }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                Suivi de discipline
              </p>
              <p className="text-xs font-medium mt-1 leading-normal" style={{ color: "rgba(200,185,255,0.65)" }}>
                Active tes alertes matin et soir pour suivre l'évolution de tes imperfections et ne rater aucun soin.
              </p>

              <div className="flex gap-2 mt-3.5">
                <button
                  onClick={subscribe}
                  disabled={loading}
                  className="rounded-full px-4 py-2 text-[11px] font-extrabold text-white active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: "#7c3aed" }}
                  data-testid="button-enable-notifications"
                >
                  {loading ? "Activation…" : "Activer"}
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-full px-3 py-2 text-[11px] font-bold active:scale-95 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                  data-testid="button-dismiss-notifications"
                >
                  Plus tard
                </button>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="flex-shrink-0 p-0.5 transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.3)" }}
              data-testid="button-close-notification-banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
