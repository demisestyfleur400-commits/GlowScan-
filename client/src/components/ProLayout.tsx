import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Stethoscope, Home, Users, ScanLine, BarChart3, Settings, ArrowLeft, LogOut, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";

const NAV_ITEMS = [
  { href: "/derm/dashboard", icon: Home, label: "Tableau de bord" },
  { href: "/derm/patients", icon: Users, label: "Patientèle" },
  { href: "/derm/analyse", icon: ScanLine, label: "Analyse", primary: true },
  { href: "/derm/statistiques", icon: BarChart3, label: "Performances" },
  { href: "/derm/cabinet", icon: Settings, label: "Cabinet" },
];

const SURFACE = { background: "#13101f", border: "1px solid rgba(255,255,255,0.07)" };
const VIOLET_ACCENT = { background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" };

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

  // 🔑 Navigation filtrée par rôle : une secrétaire ne voit QUE ses deux accès
  // autorisés (créer un patient + sa liste de patients). Le médecin voit tout.
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
      style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', color: "#f3f0ff" }}
    >
      {/* ── SIDEBAR DESKTOP ── */}
      <aside
        className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-40"
        style={{ background: "#13101f", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div
            className="flex items-center h-16 flex-shrink-0 px-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Link href="/derm/dashboard" className="flex items-center gap-3">
              <img
                src="/logo-glowscan-square.jpeg"
                alt="GlowScan"
                className="w-8 h-8 rounded-xl object-cover"
                style={{ border: "1px solid rgba(124,58,237,0.3)" }}
              />
              <div className="leading-tight">
                <p className="text-sm font-extrabold" style={{ color: "#f3f0ff" }}>GlowScan DERM</p>
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#a78bfa" }}>Clinical Engine</p>
              </div>
            </Link>
          </div>

          {/* Nav links */}
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
                    ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }
                    : { color: "rgba(200,185,255,0.65)" }
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Footer sidebar */}
          <div className="p-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {isTrial && accData && (
              <div
                className="p-3 rounded-xl flex items-center gap-2"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
                <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "#fbbf24" }}>
                  Essai : {accData.daysLeftTrial} jours
                </p>
              </div>
            )}
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col md:pl-60 min-w-0">
        {/* Header */}
        <header
          className="sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6"
          style={{ background: "rgba(13,10,14,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {back ? (
                <Link
                  href={back}
                  data-testid="link-back"
                  className="p-2 rounded-xl transition-opacity hover:opacity-70 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(200,185,255,0.65)" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : (
                <div
                  className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
                >
                  <Stethoscope className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
              )}

              {title && (
                <h1 className="text-sm font-extrabold truncate" style={{ color: "#f3f0ff" }}>{title}</h1>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {rightAction}
              {isTrial && accData && (
                <Link
                  href="/derm/cabinet"
                  data-testid="badge-trial"
                  className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}
                >
                  <Clock className="w-3 h-3" />
                  {accData.daysLeftTrial}j restants
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── BOTTOM NAV MOBILE ── */}
      {!hideBottomNav && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{ background: "rgba(19,16,31,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="max-w-md mx-auto grid h-16 px-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || (item.href === "/derm/analyse" && location.startsWith("/derm/analyse"));

              if (item.primary) {
                return (
                  <Link key={item.href} href={item.href} className="flex items-center justify-center" data-testid={`navlink-${item.label.toLowerCase()}`}>
                    <div
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl -mt-5 transition-transform active:scale-90"
                      style={{ background: "#7c3aed" }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`navlink-${item.label.toLowerCase()}`}
                  className="flex flex-col items-center justify-center gap-1 transition-all"
                  style={{ color: active ? "#a78bfa" : "rgba(255,255,255,0.35)" }}
                >
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
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      data-testid={testid}
    >
      {children}
    </div>
  );
}

export function ProButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#7c3aed", color: "#fff" },
    secondary: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#f3f0ff" },
    ghost: { color: "#c4b5fd" },
    success: { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" },
    danger: { background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)", color: "#f9a8d4" },
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-extrabold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

export function ProInput({ label, testid, ...props }: { label?: string; testid?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          {label}
        </label>
      )}
      <input
        {...props}
        data-testid={testid}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${props.className || ""}`}
        style={{
          background: "#13101f",
          border: "1px solid rgba(167,139,250,0.2)",
          color: "#f3f0ff",
        }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: "red" | "yellow" | "green" | string | null | undefined }) {
  const map: Record<string, { label: string; style: React.CSSProperties; dot: string }> = {
    red: { label: "Suivi critique", style: { background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)", color: "#f9a8d4" }, dot: "#f43f5e" },
    yellow: { label: "Vigilance requise", style: { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }, dot: "#fbbf24" },
    green: { label: "Évolution stable", style: { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }, dot: "#10b981" },
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
    <button
      onClick={() => logout()}
      data-testid="button-logout"
      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-xs font-extrabold transition-opacity hover:opacity-70"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
    >
      <LogOut className="w-4 h-4" />
      Se déconnecter
    </button>
  );
}
