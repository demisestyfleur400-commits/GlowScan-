import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Stethoscope, Home, Users, ScanLine, BarChart3, Settings, ArrowLeft, LogOut, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";

export const NAVY = "#1E40AF";
export const NAVY_DARK = "#1E3A8A";
export const SKY = "#0EA5E9";
export const GREEN = "#10B981";
export const BG = "#F8FAFC";
export const INK = "#1E293B";

const NAV_ITEMS = [
  { href: "/pro/dashboard", icon: Home, label: "Accueil" },
  { href: "/pro/patients", icon: Users, label: "Patients" },
  { href: "/pro/analyse", icon: ScanLine, label: "Analyser", primary: true },
  { href: "/pro/statistiques", icon: BarChart3, label: "Stats" },
  { href: "/pro/cabinet", icon: Settings, label: "Cabinet" },
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

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: BG, color: INK, fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {back ? (
            <Link
              href={back}
              data-testid="link-back"
              className="p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : (
            <Link href="/pro/dashboard" className="flex items-center gap-2.5" data-testid="link-pro-home">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: NAVY }}>
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-tight">GlowScan <span style={{ color: NAVY }}>Pro</span></p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Clinical AI</p>
              </div>
            </Link>
          )}

          {title && (
            <h1 className="text-sm font-semibold text-slate-700 truncate flex-1">{title}</h1>
          )}
          {!title && back && <div className="flex-1" />}
          {!title && !back && <div className="flex-1" />}

          <div className="flex items-center gap-2">
            {rightAction}
            {isTrial && accData && (
              <Link
                href="/pro/cabinet"
                data-testid="badge-trial"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <Clock className="w-3 h-3" />
                Essai · {accData.daysLeftTrial}j
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5">{children}</main>

      {/* BOTTOM NAV (mobile-first, sticky) */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          <div className="max-w-6xl mx-auto px-2 grid grid-cols-5 h-16">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || (item.href === "/pro/analyse" && location.startsWith("/pro/analyse"));
              if (item.primary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`navlink-${item.label.toLowerCase()}`}
                    className="flex items-center justify-center"
                  >
                    <div
                      className="flex flex-col items-center justify-center gap-0.5 -mt-5 w-14 h-14 rounded-full text-white shadow-lg transition-all hover:-translate-y-0.5"
                      style={{ background: NAVY }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] font-bold">{item.label}</span>
                    </div>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`navlink-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                    active ? "" : "text-slate-500 hover:text-slate-900"
                  }`}
                  style={active ? { color: NAVY } : {}}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

// ── Helpers UI réutilisables ─────────────────────────────────────────────
export function ProCard({
  children,
  className = "",
  testid,
}: {
  children: ReactNode;
  className?: string;
  testid?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 ${className}`}
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
  const styles: Record<string, string> = {
    primary: "text-white shadow-sm hover:shadow-md",
    secondary: "bg-white border border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    success: "text-white shadow-sm hover:shadow-md",
    danger: "bg-white border border-red-200 text-red-700 hover:bg-red-50",
  };
  const inlineStyle: React.CSSProperties =
    variant === "primary"
      ? { background: NAVY }
      : variant === "success"
      ? { background: GREEN }
      : {};
  return (
    <button
      {...props}
      style={{ ...inlineStyle, ...(props.style || {}) }}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ProInput({
  label,
  testid,
  ...props
}: { label?: string; testid?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      )}
      <input
        {...props}
        data-testid={testid}
        className={`w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition-all ${
          props.className || ""
        }`}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: "red" | "yellow" | "green" | string | null | undefined }) {
  const map: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    red: { label: "Cas urgent", bg: "bg-red-50 border-red-200", text: "text-red-700", dot: "bg-red-500" },
    yellow: { label: "À surveiller", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    green: { label: "Évolution positive", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  };
  const s = map[status || "green"] || map.green;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
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
      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-sm font-semibold transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Se déconnecter
    </button>
  );
}
