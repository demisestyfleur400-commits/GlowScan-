// ════════════════════════════════════════════════════════════════════════
// Après un déploiement, les anciens fichiers du site (ex. ResultCard-XXXX.js)
// n'existent plus. Un onglet resté ouvert qui essaie de les charger échoue
// ("Failed to fetch dynamically imported module"). Dans ce cas on recharge la
// page automatiquement : le navigateur récupère la nouvelle version, sans écran
// d'erreur. Garde-fou : au plus un rechargement automatique par 30 secondes.
// ════════════════════════════════════════════════════════════════════════
import { lazy } from "react";

const KEY = "gs_chunk_reload_at";

export function isChunkLoadError(err: unknown): boolean {
  const m = String((err as any)?.message || err || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(m);
}

/** Recharge la page si aucun rechargement automatique n'a eu lieu depuis 30 s. Renvoie true si la page recharge. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* stockage indisponible : on recharge quand même une fois */ }
  window.location.reload();
  return true;
}

export function lazyWithRetry(factory: () => Promise<any>) {
  return lazy(() =>
    factory().catch((err: any) => {
      if (isChunkLoadError(err) && reloadForNewVersion()) return new Promise<any>(() => {}); // la page recharge
      throw err;
    })
  );
}

/** Vite signale aussi les préchargements ratés : même traitement. */
export function installChunkReloadHandler() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (e: any) => {
    if (reloadForNewVersion()) e?.preventDefault?.();
  });
}
