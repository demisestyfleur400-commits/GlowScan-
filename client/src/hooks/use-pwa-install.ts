import { useState, useEffect } from "react";

const VISIT_KEY = "glowscan_visit_count";
const DISMISSED_KEY = "glowscan_pwa_dismissed";
const PUSH_DONE_KEY = "glowscan_push_done";
const FORCE_KEY = "glowscan_pwa_force_show";

// Permet à n'importe quel composant de demander l'affichage immédiat de la
// bannière d'installation (utilisé après le premier scan réussi).
export function triggerPWAInstallPrompt() {
  try { localStorage.setItem(FORCE_KEY, "1"); } catch {}
  window.dispatchEvent(new CustomEvent("glowscan:show-pwa-install"));
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const ios = isIOS();
    setIsIos(ios);

    // ── Déclencheur explicite (après 1er scan, etc.) ──
    let bipHandler: ((e: Event) => void) | null = null;
    const showHandler = () => {
      if (isInStandaloneMode()) return;
      if (localStorage.getItem(DISMISSED_KEY)) return;
      if (ios) {
        setShowBanner(true);
      } else if (deferredPrompt) {
        setShowBanner(true);
      } else {
        // Sur Android, il se peut que beforeinstallprompt soit arrivé après
        // notre 1er listener — on en pose un nouveau au cas où.
        bipHandler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e);
          setShowBanner(true);
        };
        window.addEventListener("beforeinstallprompt", bipHandler);
      }
    };
    window.addEventListener("glowscan:show-pwa-install", showHandler);

    // Si un autre composant a déjà demandé l'affichage avant qu'on soit monté
    if (localStorage.getItem(FORCE_KEY)) {
      try { localStorage.removeItem(FORCE_KEY); } catch {}
      setTimeout(showHandler, 200);
    }

    // Afficher si la bannière push a déjà été traitée
    const pushDone = localStorage.getItem(PUSH_DONE_KEY);
    if (pushDone) {
      // Petit délai pour ne pas superposer les bannières
      setTimeout(() => {
        if (ios) {
          setShowBanner(true);
        } else {
          // Sur Android/Desktop, attendre l'événement beforeinstallprompt
          const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
          };
          window.addEventListener("beforeinstallprompt", handler);
        }
      }, 800);
      return;
    }

    // Fallback: afficher après 2+ visites (ancien comportement)
    const raw = localStorage.getItem(VISIT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    const newCount = count + 1;
    localStorage.setItem(VISIT_KEY, String(newCount));

    if (newCount < 2) return;

    if (ios) {
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("glowscan:show-pwa-install", showHandler);
      if (bipHandler) window.removeEventListener("beforeinstallprompt", bipHandler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowBanner(false);
  };

  return { showBanner, install, dismiss, isIos, canInstall: !!deferredPrompt || isIos };
}
