import { Link, useLocation } from "wouter";
import { ReactNode, useState, useEffect } from "react";
import {
  Home, Users, ScanLine, BarChart3, Settings, ArrowLeft, LogOut, MessageCircle, Calendar, Wallet,
  ArrowLeftRight, Coins, Plus, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { asProProfile, proHomeOf } from "@shared/proProfile";
import { useProNotifications } from "@/hooks/use-realtime";

// ════════════════════════════════════════════════════════════════════════
// Cadre du portail GlowScan Derm (refonte Organic) — maquette « Derm Portal ».
// Ordinateur : barre latérale (8 écrans + section Réseau), carte du praticien
// en bas. Mobile (< 768 px) : barre du bas à 5 onglets (Accueil, Patients,
// Analyse au centre, Messages, Plus) ; « Plus » ouvre une feuille.
// La secrétaire ne voit que Nouveau patient, Mes patients et Agenda.
// ════════════════════════════════════════════════════════════════════════

type NavItem = { href: string; icon: typeof Home; label: string; badge?: "consultations" | "patients" };

const PAGES: NavItem[] = [
  { href: "/derm/dashboard", icon: Home, label: "Tableau de bord" },
  { href: "/derm/patients", icon: Users, label: "Patientèle", badge: "patients" },
  { href: "/derm/analyse", icon: ScanLine, label: "Analyse" },
  { href: "/derm/consultations", icon: MessageCircle, label: "Consultations", badge: "consultations" },
  { href: "/derm/agenda", icon: Calendar, label: "Agenda" },
  { href: "/derm/statistiques", icon: BarChart3, label: "Performances" },
  { href: "/derm/paiements", icon: Wallet, label: "Paiements" },
  { href: "/derm/cabinet", icon: Settings, label: "Cabinet" },
];

const SEC_PAGES: NavItem[] = [
  { href: "/derm/analyse", icon: Plus, label: "Nouveau patient" },
  { href: "/derm/patients", icon: Users, label: "Mes patients", badge: "patients" },
  { href: "/derm/agenda", icon: Calendar, label: "Agenda" },
];

// Section « Réseau » (médecin). Réseau & formation (étape 5) et Pilotage
// (étape 6) s'ajouteront ici quand leurs écrans existeront.
const NETWORK: NavItem[] = [
  { href: "/derm/confreres", icon: ArrowLeftRight, label: "Téléexpertise" },
  { href: "/derm/portefeuille", icon: Coins, label: "Portefeuille" },
];

const MOBILE: (NavItem | { href: "more"; icon: typeof Home; label: string })[] = [
  { href: "/derm/dashboard", icon: Home, label: "Accueil" },
  { href: "/derm/patients", icon: Users, label: "Patients", badge: "patients" },
  { href: "/derm/analyse", icon: ScanLine, label: "Analyse" },
  { href: "/derm/consultations", icon: MessageCircle, label: "Messages", badge: "consultations" },
  { href: "more", icon: Settings, label: "Plus" },
];

const MORE: NavItem[] = [
  { href: "/derm/agenda", icon: Calendar, label: "Agenda" },
  { href: "/derm/statistiques", icon: BarChart3, label: "Performances" },
  { href: "/derm/paiements", icon: Wallet, label: "Paiements" },
  { href: "/derm/cabinet", icon: Settings, label: "Cabinet" },
  ...NETWORK,
];

const initialsOf = (name: string) =>
  name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "GS";

function isActive(location: string, href: string) {
  if (href === "/derm/patients") return location === href || location.startsWith("/derm/patient/");
  return location === href || location.startsWith(href + "?") || location.startsWith(href + "/");
}

interface ProLayoutProps {
  children: ReactNode;
  title?: string;
  back?: string;
  onBack?: () => void; // si fourni, le ← appelle ce callback (retour étape par étape)
  hideBottomNav?: boolean;
  rightAction?: ReactNode;
}

export function ProLayout({ children, title, back, onBack, hideBottomNav, rightAction }: ProLayoutProps) {
  const [location, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: accData } = useProAccount();
  const acc = accData?.account as any;
  // Notifications temps réel (second avis confrères, etc.)
  useProNotifications((accData?.user as any)?.id);

  const isSecretary = accData?.user?.role === "secretary";
  const pages = isSecretary ? SEC_PAGES : PAGES;

  // Profils Relais et ONG : le portail cabinet n'est pas le leur → leur page d'arrivée.
  const profile = asProProfile(acc?.profile);
  useEffect(() => { if (acc && profile !== "derm") navigate(proHomeOf(profile, "doctor")); }, [acc, profile, navigate]);

  // Badges : consultations payées à traiter, dossiers préparés en attente d'analyse.
  const [badges, setBadges] = useState<{ consultations: number; patients: number }>({ consultations: 0, patients: 0 });
  useEffect(() => {
    if (!accData) return;
    let stop = false;
    const get = (url: string) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    const load = async () => {
      const [c, p]: any[] = await Promise.all([
        isSecretary ? Promise.resolve({}) : get("/api/pro/consultations/unread-count"),
        get("/api/pro/pending-patients"),
      ]);
      if (!stop) setBadges({ consultations: Number(c?.count) || 0, patients: Number(p?.count) || 0 });
    };
    load();
    const iv = setInterval(load, 30000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [accData, isSecretary]);

  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [location]);

  const meName = isSecretary
    ? [accData?.user?.firstName, accData?.user?.lastName].filter(Boolean).join(" ") || "Secrétaire"
    : acc?.fullName || "";
  const meSub = isSecretary
    ? "Secrétaire"
    : [acc?.cabinetName, acc?.city].filter(Boolean).join(" · ") || "GlowScan Derm";

  const badgeOf = (item: { badge?: "consultations" | "patients" }) => (item.badge ? badges[item.badge] : 0);

  const sideLink = (item: NavItem) => {
    const on = isActive(location, item.href);
    const b = badgeOf(item);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href}
        className={`flex items-center gap-3 rounded-pill px-3.5 py-2.5 text-[14px] font-semibold no-underline transition-colors hover:bg-organic-neutral-200 ${on ? "bg-organic-surface text-organic-accent-700" : "text-organic-text"}`}
        data-testid={`nav-${item.href.split("/").pop()}`}>
        <Icon size={18} strokeWidth={1.75} className="flex-none" />
        <span className="flex-1">{item.label}</span>
        {b > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-organic-accent px-1.5 text-[11px] font-bold text-organic-bg" data-testid={`badge-${item.badge}`}>{b}</span>}
      </Link>
    );
  };

  const hasHeader = !!(title || back || onBack || rightAction);

  return (
    <div className="flex min-h-screen bg-organic-bg font-body text-organic-text">
      {/* ── Barre latérale (ordinateur) ── */}
      <aside className="sticky top-0 hidden h-screen w-[232px] flex-none flex-col gap-organic-6 overflow-y-auto px-organic-4 py-organic-6 md:flex">
        <Link href="/derm/dashboard?stay=1" className="flex items-center gap-2.5 text-organic-text no-underline">
          <img src="/glowscan-mark.png" alt="GlowScan" width={36} height={36} className="rounded-full object-cover" />
          <span className="flex flex-col">
            <span className="font-heading text-[18px] leading-[1.1]">GlowScan</span>
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-organic-accent-2-700">Derm</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {pages.map(sideLink)}
          {!isSecretary && (
            <>
              <span className="mx-3.5 mb-1 mt-3 text-[10px] font-bold uppercase tracking-[.14em] text-organic-neutral-700">Réseau</span>
              {NETWORK.map(sideLink)}
            </>
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-pill bg-organic-surface p-2.5">
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-organic-accent-2-500 text-[13px] font-bold text-organic-bg">{initialsOf(meName)}</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-bold">{meName}</span>
              <span className="truncate text-[11px] text-organic-neutral-700">{meSub}</span>
            </span>
          </div>
          <button type="button" onClick={() => logout()}
            className="flex cursor-pointer items-center gap-3 rounded-pill border-0 bg-transparent px-3.5 py-2 font-body text-[13px] font-semibold text-organic-neutral-700 hover:bg-organic-neutral-200"
            data-testid="button-logout-side">
            <LogOut size={16} strokeWidth={1.75} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main className={`flex min-w-0 max-w-[1180px] flex-1 flex-col gap-organic-6 px-4 pt-4 md:px-organic-8 md:pl-organic-4 md:pt-organic-6 ${hideBottomNav ? "pb-10" : "pb-[110px] md:pb-organic-8"}`}>
        {hasHeader && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {onBack ? (
                <button type="button" onClick={onBack} data-testid="link-back" aria-label="Retour"
                  className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-organic-surface text-organic-text">
                  <ArrowLeft size={18} strokeWidth={1.75} />
                </button>
              ) : back ? (
                <Link href={back} data-testid="link-back" aria-label="Retour"
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-organic-surface text-organic-text">
                  <ArrowLeft size={18} strokeWidth={1.75} />
                </Link>
              ) : null}
              {title && <h1 className="m-0 truncate text-[clamp(24px,3vw,32px)] leading-tight">{title}</h1>}
            </div>
            {rightAction && <div className="flex items-center gap-2.5">{rightAction}</div>}
          </div>
        )}
        {children}
      </main>

      {/* ── Barre du bas (mobile) ── */}
      {!hideBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-[45] flex items-end justify-around border-t border-organic-divider bg-organic-surface px-1 pb-3 pt-1.5 md:hidden">
          {(isSecretary ? SEC_PAGES : MOBILE).map((item) => {
            const more = item.href === "more";
            const mid = item.href === "/derm/analyse" && !isSecretary;
            const on = more ? moreOpen : isActive(location, item.href);
            const b = badgeOf(item as NavItem);
            const Icon = item.icon;
            const inner = (
              <>
                <span className={`relative flex items-center justify-center rounded-full ${mid ? "h-12 w-12 bg-organic-accent text-organic-bg" : `h-[30px] w-[52px] ${on ? "bg-organic-accent-100" : ""}`}`}>
                  <Icon size={mid ? 22 : 20} strokeWidth={1.75} />
                  {b > 0 && <span className="absolute -top-[3px] right-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-organic-accent px-1 text-[10px] font-bold text-organic-bg">{b}</span>}
                </span>
                <span className="text-[11px] font-bold">{item.label}</span>
              </>
            );
            const cls = `flex flex-1 flex-col items-center gap-[3px] border-0 bg-transparent py-1 font-body no-underline ${on ? "text-organic-accent-700" : "text-organic-neutral-700"}`;
            return more ? (
              <button key="more" type="button" onClick={() => setMoreOpen(true)} className={`${cls} cursor-pointer`} data-testid="navlink-plus">{inner}</button>
            ) : (
              <Link key={item.href} href={item.href} className={cls} data-testid={`navlink-${item.href.split("/").pop()}`}>{inner}</Link>
            );
          })}
        </nav>
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-organic-neutral-900/45 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="box-border flex max-h-[80vh] w-full flex-col gap-0.5 overflow-auto rounded-t-[32px] bg-organic-bg px-4 pb-7 pt-3" onClick={(e) => e.stopPropagation()}>
            <span className="mb-2 h-1 w-10 self-center rounded-pill bg-organic-neutral-300" />
            {MORE.map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.href} href={m.href} className="flex items-center gap-3.5 rounded-pill px-3 py-3.5 text-[15px] font-semibold text-organic-text no-underline hover:bg-organic-surface">
                  <Icon size={18} strokeWidth={1.75} className="text-organic-accent-700" />
                  <span className="flex-1">{m.label}</span>
                  <ChevronRight size={16} className="text-organic-neutral-500" />
                </Link>
              );
            })}
            <button type="button" onClick={() => logout()}
              className="flex cursor-pointer items-center gap-3.5 rounded-pill border-0 bg-transparent px-3 py-3.5 font-body text-[15px] font-semibold text-organic-neutral-700">
              <LogOut size={18} strokeWidth={1.75} /> Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composants partagés du portail (Organic) ───────────────────────────────

export function ProCard({ children, className = "", testid }: { children: ReactNode; className?: string; testid?: string }) {
  return (
    <div className={`overflow-hidden rounded-card bg-organic-surface ${className}`} data-testid={testid}>
      {children}
    </div>
  );
}

export function ProButton({
  children, variant = "primary", className = "", ...props
}: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "success" | "danger"; className?: string; } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, string> = {
    primary: "bg-organic-accent text-organic-neutral-100 hover:bg-organic-accent-600",
    secondary: "border border-organic-divider bg-transparent text-organic-text hover:bg-organic-text/[.07]",
    ghost: "bg-transparent text-organic-accent hover:bg-organic-accent/10",
    success: "bg-organic-accent-2-600 text-organic-bg hover:bg-organic-accent-2-700",
    danger: "bg-organic-accent-700 text-organic-neutral-100 hover:bg-organic-accent-800",
  };
  return (
    <button {...props} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border-0 px-4 py-2.5 font-body text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function ProInput({ label, testid, ...props }: { label?: string; testid?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      {label && <span className="text-[12px] text-organic-neutral-700">{label}</span>}
      <input {...props} data-testid={testid}
        className={`box-border h-11 w-full rounded-pill border border-organic-divider bg-organic-bg px-4 font-body text-[15px] text-organic-text outline-none placeholder:text-organic-neutral-500 focus:border-organic-accent ${props.className || ""}`} />
    </label>
  );
}

// Statuts patient. Ancien système red/yellow/green conservé en base, affiché
// avec les libellés de la maquette (Priorité haute / En suivi / Stable / Résolu).
export type PatientStatus = "priority" | "monitoring" | "stable" | "resolved";
export function patientStatusOf(s: string | null | undefined): PatientStatus {
  if (s === "red" || s === "priority") return "priority";
  if (s === "yellow" || s === "monitoring") return "monitoring";
  if (s === "resolved") return "resolved";
  return "stable";
}
export const PATIENT_STATUS: Record<PatientStatus, { label: string; tag: string }> = {
  priority: { label: "Priorité haute", tag: "bg-organic-accent-200 text-organic-accent-900" },
  monitoring: { label: "En suivi", tag: "bg-organic-neutral-200 text-organic-neutral-900" },
  stable: { label: "Stable", tag: "bg-organic-accent-2-200 text-organic-accent-2-900" },
  resolved: { label: "Résolu", tag: "border border-organic-divider text-organic-text" },
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = PATIENT_STATUS[patientStatusOf(status)];
  return <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-semibold ${s.tag}`}>{s.label}</span>;
}

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <ProButton variant="secondary" onClick={() => logout()} data-testid="button-logout" className="w-full">
      <LogOut size={16} /> Se déconnecter
    </ProButton>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-organic-bg font-body text-organic-text">
      <img src="/glowscan-mark.png" alt="GlowScan" width={56} height={56} className="animate-pulse rounded-full" />
      <span className="font-heading text-[18px]">GlowScan <span className="text-organic-accent-2-700">Derm</span></span>
    </div>
  );
}
