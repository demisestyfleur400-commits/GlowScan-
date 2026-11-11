// ════════════════════════════════════════════════════════════════════════
// Espace médical : une fois connecté, on télécharge en arrière-plan le code
// des autres écrans. Passer d'un menu à l'autre devient alors immédiat (plus
// d'attente ni d'écran de transition à chaque changement de page).
// ════════════════════════════════════════════════════════════════════════

let done = false;

export function prefetchDermScreens() {
  if (done || typeof window === "undefined") return;
  done = true;
  const load = () => {
    const pages = [
      () => import("@/pages/derm/DermVue"),
      () => import("@/pages/derm/DermAgenda"),
      () => import("@/pages/derm/DermPatients"),
      () => import("@/pages/derm/DermPatientFiche"),
      () => import("@/pages/derm/DermDossiers"),
      () => import("@/pages/derm/DermDossier"),
      () => import("@/pages/derm/DermCompteRendu"),
      () => import("@/pages/derm/DermSuivis"),
      () => import("@/pages/derm/DermSuivi"),
      () => import("@/pages/derm/DermActivite"),
      () => import("@/pages/derm/DermAuto"),
      () => import("@/pages/derm/DermMessagerie"),
      () => import("@/pages/derm/DermParametres"),
      () => import("@/pages/pro/ProAnalyze"),
    ];
    // Un écran à la fois, pour ne pas gêner l'écran affiché.
    pages.reduce((p, f) => p.then(() => f().then(() => undefined, () => undefined)), Promise.resolve());
  };
  const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => void) | undefined;
  if (idle) idle(load, { timeout: 3000 }); else setTimeout(load, 1500);
}
