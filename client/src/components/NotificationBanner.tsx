import { useState, useEffect } from "react";
import { Bell, X, Sparkles } from "lucide-react";
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
    // Blindage : Vérification stricte des APIs de notifications (évite les crashs sur les anciens iOS/Android)
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return;
    }

    // Sécurité : Si l'utilisateur a déjà bloqué les notifications au niveau du système, on n'affiche rien
    if (Notification.permission === "denied") return;

    // N'afficher qu'après la première analyse terminée
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
          // Petit délai de 1.5s après le chargement pour laisser respirer l'utilisatrice
          setTimeout(() => setShow(true), 1500);
        }
      })
      .catch((err) => console.log("[GlowScan] ServiceWorker non prêt :", err));
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      // Demande de permission native du navigateur / téléphone
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }

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
        // Positionnement z-[240] juste en dessous des modales principales pour éviter les chevauchements
        className="fixed bottom-6 left-4 right-4 z-[240] mx-auto max-w-sm"
        data-testid="notification-banner"
      >
        <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950 p-4 shadow-2xl text-white border border-white/10 relative overflow-hidden">
          
          {/* Effet lumineux décoratif en arrière-plan */}
          <div className="absolute -right-10 -top-10 w-24 h-24 bg-pink-600/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-3">
            {/* Cloche Premium aux couleurs de la marque */}
            <div className="rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 p-2.5 shadow-lg flex-shrink-0 border border-white/10">
              <Bell className="h-4 w-4 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-white">Suivi de discipline</p>
                <Sparkles className="w-3 h-3 text-pink-400" />
              </div>
              <p className="text-[11px] text-gray-300 mt-1 leading-normal font-medium">
                Active tes alertes matin et soir pour suivre l'évolution de tes imperfections et ne rater aucun soin.
              </p>
              
              {/* Boutons d'actions épurés */}
              <div className="flex gap-2 mt-3.5">
                <button
                  onClick={subscribe}
                  disabled={loading}
                  className="rounded-lg bg-white text-gray-950 px-4 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
                  data-testid="button-enable-notifications"
                >
                  {loading ? "Activation..." : "Activer"}
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-lg bg-white/10 text-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-white/20 active:scale-95 transition-all"
                  data-testid="button-dismiss-notifications"
                >
                  Plus tard
                </button>
              </div>
            </div>

            {/* Bouton fermeture croix discret */}
            <button 
              onClick={dismiss} 
              className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0 p-0.5" 
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
