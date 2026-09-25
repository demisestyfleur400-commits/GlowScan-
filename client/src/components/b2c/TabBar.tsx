import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { House, ChartLine, ScanFace, Droplet, MessageCircle, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Barre d'onglets patient (refonte Organic) — maquette « GlowScan App ».
// Accueil · Ma peau · Scanner (bouton central) · Soins · Messages.
// Remplace le menu « Explorer » et les liens des en-têtes.
// ════════════════════════════════════════════════════════════════════════

type Tab = { key: string; label: string; href: string; icon: LucideIcon; match: string[] };

// Ma peau, Soins et Messages pointent vers les écrans existants en attendant
// leurs versions Organic (sous-étapes suivantes de l'étape 2).
const TABS: Tab[] = [
  { key: "home", label: "Accueil", href: "/", icon: House, match: ["/"] },
  { key: "skin", label: "Ma peau", href: "/ma-peau", icon: ChartLine, match: ["/ma-peau", "/profile"] },
  { key: "scan", label: "Scanner", href: "/analyze", icon: ScanFace, match: ["/analyze", "/product-scan-camera"] },
  { key: "care", label: "Soins", href: "/routine", icon: Droplet, match: ["/routine", "/shop", "/commande"] },
  { key: "msg", label: "Messages", href: "/consultations", icon: MessageCircle, match: ["/consultations", "/chat", "/dermatologues", "/dr/"] },
];

/** Routes de l'appli patient où la barre s'affiche. */
const B2C_ROUTES = ["/", "/analyze", "/ma-peau", "/profile", "/shop", "/routine", "/consultations", "/chat", "/premium", "/product-scan-camera", "/dermatologues", "/commande"];

export const TAB_BAR_HEIGHT = 84;

/** Réponses dermato non lues (montage + toutes les 20 s + retour sur l'onglet). */
function useUnreadTotal(enabled: boolean, location: string) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!enabled) { setTotal(0); return; }
    let alive = true;
    const load = () => fetch("/api/consultations/unread-total", { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (alive) setTotal(Number(d.total) || 0); })
      .catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    window.addEventListener("focus", load);
    return () => { alive = false; clearInterval(iv); window.removeEventListener("focus", load); };
  }, [enabled, location]);
  return total;
}

function isActive(tab: Tab, location: string) {
  return tab.match.some((m) => (m.endsWith("/") && m !== "/" ? location.startsWith(m) : location === m));
}

export function TabBar() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const onB2C = B2C_ROUTES.includes(location) || location.startsWith("/dr/");
  const unread = useUnreadTotal(!!user && onB2C, location);

  if (!onB2C) return null;
  // Sur « / », un visiteur non connecté voit la landing : pas de barre.
  if (location === "/" && (isLoading || !user)) return null;

  return (
    <>
      <div aria-hidden style={{ height: TAB_BAR_HEIGHT }} />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-organic-divider bg-organic-surface px-2 pt-2 font-body"
        style={{ paddingBottom: "max(22px, env(safe-area-inset-bottom))" }}
      >
        {TABS.map((tab) => {
          const on = isActive(tab, location);
          const mid = tab.key === "scan";
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setLocation(tab.href)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-w-[60px] flex-col items-center gap-[3px] border-0 bg-transparent py-1.5",
                on ? "text-organic-text" : "text-organic-neutral-700",
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-pill",
                  mid
                    ? "h-[50px] w-[50px] bg-organic-neutral-900 text-organic-neutral-100"
                    : cn("h-[30px] w-[52px]", on ? "bg-organic-accent-100 text-organic-accent-800" : "bg-transparent"),
                )}
              >
                <Icon size={mid ? 24 : 21} strokeWidth={1.75} />
                {tab.key === "msg" && unread > 0 && (
                  <span
                    aria-label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}
                    className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-organic-accent px-1 text-[10px] font-bold text-organic-neutral-100"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className={cn("text-[11px]", on ? "font-bold" : "font-semibold")}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
