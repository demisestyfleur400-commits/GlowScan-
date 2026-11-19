import { useEffect, useState } from "react";

// « Continuer avec Google » — affiché seulement si la connexion Google est configurée
// sur le serveur (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Sinon : rien, aucun bouton mort.
let cached: boolean | null = null;

export function useGoogleEnabled() {
  const [on, setOn] = useState<boolean>(cached ?? false);
  useEffect(() => {
    if (cached !== null) return;
    fetch("/api/auth/google/enabled").then((r) => r.json()).then((d) => { cached = !!d?.enabled; setOn(cached); }).catch(() => { cached = false; });
  }, []);
  return on;
}

const G = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export function GoogleButton({ target, next, label = "Continuer avec Google", style }: { target: "derm" | "patient"; next?: string; label?: string; style?: React.CSSProperties }) {
  const on = useGoogleEnabled();
  if (!on) return null;
  // Patient : retour à la page de réservation mémorisée avant la connexion (postLogin).
  let n = next;
  if (!n && target === "patient") { try { n = sessionStorage.getItem("postLoginRedirect") || undefined; } catch {} }
  const href = `/api/auth/google/start?for=${target}${n ? `&next=${encodeURIComponent(n)}` : ""}`;
  return (
    <a href={href} data-testid={`google-${target}`}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: 46, borderRadius: 10, border: "1px solid #d9dfdc", background: "#fff",
        color: "#1f2b27", fontSize: 15, fontWeight: 600, textDecoration: "none", ...style }}>
      <G />{label}
    </a>
  );
}

/** Séparateur « ou » entre Google et le formulaire, affiché seulement si Google est actif. */
export function OrDivider() {
  const on = useGoogleEnabled();
  if (!on) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#7b8a85", fontSize: 13 }}>
      <span style={{ flex: 1, height: 1, background: "#e3e8e2" }} />ou<span style={{ flex: 1, height: 1, background: "#e3e8e2" }} />
    </div>
  );
}

/** Message après un retour Google en échec (?google=…). */
export function googleErrorMessage(): string | null {
  try {
    const g = new URLSearchParams(window.location.search).get("google");
    if (!g) return null;
    return ({
      indisponible: "La connexion Google n'est pas encore disponible. Utilisez votre email.",
      expire: "La connexion Google a expiré. Réessayez.",
      annule: "Connexion Google annulée.",
      email: "Votre adresse Google n'est pas vérifiée. Utilisez votre email.",
      erreur: "La connexion Google n'a pas abouti. Réessayez ou utilisez votre email.",
    } as Record<string, string>)[g] || null;
  } catch { return null; }
}
