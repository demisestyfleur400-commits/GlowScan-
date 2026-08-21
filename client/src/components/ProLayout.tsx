import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Stethoscope, Home, Users, ScanLine, BarChart3, Settings, ArrowLeft, LogOut, Clock, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { useProNotifications } from "@/hooks/use-realtime";

// Thème CLAIR médical (blanc + bleu #0369A1). Violet #7C3AED réservé aux CTA.
const BLUE = "#0369A1";
const INK = "#0F172A";
const BODY = "#475569";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const PAGE = "#F6FAFD";
const CARD = "#FFFFFF";

const NAV_ITEMS = [
  { href: "/derm/dashboard", icon: Home, label: "Tableau de bord" },
  { href: "/derm/patients", icon: Users, label: "Patientèle" },
  { href: "/derm/analyse", icon: ScanLine, label: "Analyse", primary: true },
  { href: "/derm/consultations", icon: MessageCircle, label: "Consultations" },
  { href: "/derm/statistiques", icon: BarChart3, label: "Performances" },
  { href: "/derm/cabinet", icon: Settings, label: "Cabinet" },
];

interface ProLayoutProps {
  children: ReactNode;
  title?: string;
  back?: string;
  hideBottomNav?: boolean;
  rightAction?: ReactNode;
}

export function ProLayout({ children, title, back, hideBottomNav, rightAction }: ProLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: accData } = useProAccount();
  const acc = accData?.account;
  const isTrial = acc?.subscriptionStatus === "trial";
  // Notifications temps réel (second avis confrères, etc.)
  useProNotifications((accData?.user as any)?.id);

  const isSecretary = accData?.user?.role === "secretary";
  const navItems = isSecretary
    ? [
        { href: "/derm/analyse", icon: ScanLine, label: "Nouveau patient", primary: true },
        { href: "/derm/patients", icon: Users, label: "Mes patients" },
      ]
    : NAV_ITEMS;

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row antialiased"
      style={{ background: PAGE, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', color: INK }}
    >
      {/* ── SIDEBAR DESKTOP ── */}
      <aside
        className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-40"
        style={{ background: CARD, borderRight: `1px solid ${BORDER}` }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <Link href="/derm/dashboard" className="flex items-center gap-3">
              <img src="/logo-glowscan-square.jpeg" alt="GlowScan" className="w-8 h-8 rounded-xl object-cover" style={{ border: `1px solid ${BORDER}` }} />
              <div className="leading-tight">
                <p className="text-sm font-extrabold" style={{ color: INK }}>GlowScan DERM</p>
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: BLUE }}>Clinical Engine</p>
              </div>
            </Link>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href === "/derm/analyse" && location.startsWith("/derm/analyse"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all"
                  style={isActive
                    ? { background: "rgba(3,105,161,0.1)", border: "1px solid rgba(3,105,161,0.25)", color: BLUE }
                    : { color: BODY }
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            {isTrial && accData && (
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)" }}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#b45309" }} />
                <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "#b45309" }}>
                  Essai : {accData.daysLeftTrial} jours
                </p>
              </div>
            )}
            <button onClick={() => logout()} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-opacity hover:opacity-70" style={{ color: MUTED }}>
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col md:pl-60 min-w-0">
        <header className="sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {back ? (
                <Link href={back} data-testid="link-back" className="p-2 rounded-xl transition-opacity hover:opacity-70 active:scale-95" style={{ background: "#F1F5F9", border: `1px solid ${BORDER}`, color: BODY }}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : (
                <div className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(3,105,161,0.1)", border: "1px solid rgba(3,105,161,0.25)" }}>
                  <Stethoscope className="w-4 h-4" style={{ color: BLUE }} />
                </div>
              )}
              {title && <h1 className="text-sm font-extrabold truncate" style={{ color: INK }}>{title}</h1>}
            </div>

            <div className="flex items-center gap-2.5">
              {rightAction}
              {isTrial && accData && (
                <Link href="/derm/cabinet" data-testid="badge-trial" className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#b45309" }}>
                  <Clock className="w-3 h-3" />
                  {accData.daysLeftTrial}j restants
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── BOTTOM NAV MOBILE ── */}
      {!hideBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderTop: `1px solid ${BORDER}` }}>
          <div className="max-w-md mx-auto grid h-16 px-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || (item.href === "/derm/analyse" && location.startsWith("/derm/analyse"));
              if (item.primary) {
                return (
                  <Link key={item.href} href={item.href} className="flex items-center justify-center" data-testid={`navlink-${item.label.toLowerCase()}`}>
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl -mt-5 transition-transform active:scale-90" style={{ background: "#7c3aed", boxShadow: "0 6px 16px rgba(124,58,237,0.35)" }}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </Link>
                );
              }
              return (
                <Link key={item.href} href={item.href} data-testid={`navlink-${item.label.toLowerCase()}`} className="flex flex-col items-center justify-center gap-1 transition-all" style={{ color: active ? BLUE : MUTED }}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-bold">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

export function ProCard({ children, className = "", testid }: { children: ReactNode; className?: string; testid?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }} data-testid={testid}>
      {children}
    </div>
  );
}

export function ProButton({
  children, variant = "primary", className = "", ...props
}: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "success" | "danger"; className?: string; } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#7c3aed", color: "#fff" },
    secondary: { background: "#F1F5F9", border: `1px solid ${BORDER}`, color: INK },
    ghost: { color: BLUE },
    success: { background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", color: "#047857" },
    danger: { background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" },
  };
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-extrabold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`} style={styles[variant]}>
      {children}
    </button>
  );
}

export function ProInput({ label, testid, ...props }: { label?: string; testid?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>{label}</label>}
      <input {...props} data-testid={testid} className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${props.className || ""}`} style={{ background: CARD, border: `1px solid #CBD5E1`, color: INK }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: "red" | "yellow" | "green" | string | null | undefined }) {
  const map: Record<string, { label: string; style: React.CSSProperties; dot: string }> = {
    red: { label: "Suivi critique", style: { background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }, dot: "#dc2626" },
    yellow: { label: "Vigilance requise", style: { background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#b45309" }, dot: "#d97706" },
    green: { label: "Évolution stable", style: { background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", color: "#047857" }, dot: "#059669" },
  };
  const s = map[status || "green"] || map.green;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider" style={s.style}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button onClick={() => logout()} data-testid="button-logout" className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-xs font-extrabold transition-opacity hover:opacity-70" style={{ background: "#F1F5F9", border: `1px solid ${BORDER}`, color: MUTED }}>
      <LogOut className="w-4 h-4" />
      Se déconnecter
    </button>
  );
}
