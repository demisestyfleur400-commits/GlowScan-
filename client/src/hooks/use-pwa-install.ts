import { useState, useEffect } from "react";

const DISMISSED_KEY = "glowscan_pwa_dismissed";
const FORCE_KEY     = "glowscan_pwa_force_show";

export function triggerPWAInstallPrompt() {
  try { localStorage.setItem(FORCE_KEY, "1"); } catch {}
  window.dispatchEvent(new CustomEvent("glowscan:show-pwa-install"));
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner,     setShowBanner]     = useState(false);
  const [showIOSModal,   setShowIOSModal]   = useState(false);
  const [isIos,          setIsIos]          = useState(false);

  useEffect(() => {
    // Jamais si déjà installé ou déjà refusé
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ios = isIOS();
    setIsIos(ios);

    // Afficher après 1 seconde (aucun impact sur le chargement initial)
    const timer = setTimeout(() => {
      if (isInStandaloneMode()) return;
      if (localStorage.getItem(DISMISSED_KEY)) return;

      if (ios) {
        setShowBanner(true);
        return;
      }

      // Android/Chrome → attendre l'événement natif beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
    }, 1000);

    // Déclencheur manuel (après scan, etc.)
    const showHandler = () => {
      if (isInStandaloneMode()) return;
      if (localStorage.getItem(DISMISSED_KEY)) return;
      if (ios) { setShowBanner(true); return; }
      if (deferredPrompt) setShowBanner(true);
    };
    window.addEventListener("glowscan:show-pwa-install", showHandler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("glowscan:show-pwa-install", showHandler);
    };
  }, []);

  /** Chrome/Android — déclenche le prompt natif */
  const install = async () => {
    if (isIos) {
      // iOS → ouvrir la modale d'instructions
      setShowIOSModal(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setShowBanner(false);
    setShowIOSModal(false);
  };

  const closeIOSModal = () => setShowIOSModal(false);

  return {
    showBanner,
    showIOSModal,
    install,
    dismiss,
    closeIOSModal,
    isIos,
    canInstall: !!deferredPrompt || isIos,
  };
}
