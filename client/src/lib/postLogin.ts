// Retour au bon endroit après connexion / inscription.
// On mémorise le chemin (interne uniquement) avant d'envoyer vers /auth.
const KEY = "postLoginRedirect";

const isInternal = (p: string) => p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\");

/** Mémorise le chemin courant (ou celui fourni) pour y revenir après la connexion. */
export function rememberReturnPath(path?: string) {
  try {
    const p = path ?? window.location.pathname + window.location.search;
    if (isInternal(p) && !p.startsWith("/auth")) sessionStorage.setItem(KEY, p);
  } catch {}
}

/** Chemin où aller après une connexion réussie (efface la clé). Par défaut : "/". */
export function takeReturnPath(): string {
  try {
    const p = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (p && isInternal(p) && !p.startsWith("/auth")) return p;
  } catch {}
  return "/";
}
