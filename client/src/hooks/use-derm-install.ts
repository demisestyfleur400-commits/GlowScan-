import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Installation du logiciel « GlowScan Derm » sur l'ordinateur du cabinet
// (icône sur le bureau, fenêtre à part). L'invitation du navigateur est captée
// dès le chargement par le script de index.html (window.__gsDermInstall).
// ════════════════════════════════════════════════════════════════════════

export type DermInstallState =
  | "installed"   // déjà ouvert comme logiciel installé
  | "ready"       // le navigateur propose l'installation : un clic suffit
  | "manual"      // navigateur compatible mais invitation absente : marche à suivre
  | "unsupported";// navigateur sans installation (Firefox, Safari ancien…)

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

/** Le manifeste Derm est aussi posé quand on arrive dans l'espace médical sans rechargement. */
function ensureDermManifest() {
  const m = document.querySelector('link[rel="manifest"]');
  if (m && m.getAttribute("href") !== "/manifest-derm.json") m.setAttribute("href", "/manifest-derm.json");
}

export function useDermInstall() {
  const [state, setState] = useState<DermInstallState>(() => {
    if (typeof window === "undefined") return "unsupported";
    if (isStandalone()) return "installed";
    if ((window as any).__gsDermInstall) return "ready";
    return /Chrome|Edg\//.test(navigator.userAgent) ? "manual" : "unsupported";
  });

  useEffect(() => {
    ensureDermManifest();
    const onReady = () => { if (!isStandalone()) setState("ready"); };
    const onInstalled = () => { (window as any).__gsDermInstall = null; setState("installed"); };
    // Arrivée dans l'espace médical sans rechargement : le navigateur relance l'invitation
    // avec le manifeste Derm ; on la capte ici aussi.
    const onPrompt = (e: Event) => {
      if (!window.location.pathname.startsWith("/derm") || (window as any).__gsDermInstall === e) return;
      e.preventDefault(); (window as any).__gsDermInstall = e; onReady();
    };
    window.addEventListener("gs:derm-installable", onReady);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { window.removeEventListener("gs:derm-installable", onReady); window.removeEventListener("appinstalled", onInstalled); window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  const install = async (): Promise<boolean> => {
    const ev = (window as any).__gsDermInstall;
    if (!ev) return false;
    ev.prompt();
    const { outcome } = await ev.userChoice;
    (window as any).__gsDermInstall = null;
    if (outcome === "accepted") { setState("installed"); return true; }
    setState("manual");
    return false;
  };

  return { state, install };
}
