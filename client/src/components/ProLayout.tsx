import { Link, useLocation } from "wouter";
import { ReactNode, useState } from "react";
import { Stethoscope, Home, Users, ScanLine, BarChart3, Settings, ArrowLeft, LogOut, Clock, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";

// Items de navigation partagés entre Mobile et Desktop
const NAV_ITEMS = [
  { href: "/pro/dashboard", icon: Home, label: "Tableau de bord" },
  { href: "/pro/patients", icon: Users, label: "Patientèle" },
  { href: "/pro/analyse", icon: ScanLine, label: "Nouvelle Analyse", primary: true },
  { href: "/pro/statistiques", icon: BarChart3, label: "Performances" },
  { href: "/pro/cabinet", icon: Settings, label: "Mon Cabinet" },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const acc = accData?.account;
  const isTrial = acc?.subscriptionStatus === "trial";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col md:flex-row">
      
      {/* ── SIDEBAR DESKTOP (Visible uniquement sur PC & Tablette) ── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950 text-white z-40 border-r border-slate-900 shadow-xl">
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Logo Cabinet */}
          <div className="flex items-center h-16 flex-shrink-0 px-5 bg-slate-950 border-b border-slate-900">
            <Link href="/pro/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-black tracking-wide text-white">GlowScan <span className="text-blue-500">Pro</span></p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Clinical Engine</p>
              </div>
            </Link>
          </div>

          {/* Liens de la Sidebar */}
          <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href === "/pro/analyse" && location.startsWith("/pro/analyse"));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10 border border-blue-500/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Pied de la Sidebar (Infos compte & Déconnexion) */}
          <div className="p-4 bg-slate-950 border-t border-slate-900 space-y-3">
            {isTrial && accData && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-wider">Essai : {accData.daysLeftTrial} jours restants</p>
              </div>
            )}
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-400 rounded-xl hover:bg-red-500/5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── ZONE DE CONTENU PRINCIPALE (Ajustée selon la Sidebar sur PC) ── */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        
        {/* HEADER TOP-BAR */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center px-4 sm:px-6 shadow-sm">
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3 min-w-0">
              {back ? (
                <Link
                  href={back}
                  data-testid="link-back"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 border border-transparent hover:border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : (
                /* Bouton Home discret visible sur mobile uniquement dans le header */
                <div className="md:hidden w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
              )}

              {title && (
                <h1 className="text-sm font-black uppercase tracking-wider text-slate-800 truncate">{title}</h1>
              )}
            </div>

            {/* Actions Droite (Badge Trial, Actions custom) */}
            <div className="flex items-center gap-2.5">
              {rightAction}
              {isTrial && accData && (
                <Link
                  href="/pro/cabinet"
                  data-testid="badge-trial"
                  className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-800"
                >
                  <Clock className="w-3 h-3" />
                  {accData.daysLeftTrial}j restants
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* CONTAINER MAIN CONTENT */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── BOTTOM BAR NAVIGATION MOBILE (Sticky en bas sur smartphone) ── */}
      {!hideBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.04)]">
          <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
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
                    <div className="flex flex-col items-center justify-center -mt-6 w-13 h-13 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-90 border border-blue-500/20">
                      <Icon className="w-4 h-4" />
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
                    active ? "text-blue-600" : "text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-wide">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

// ── HELPERS UI ASSORTIS (Refondus pour le standard Pro) ──────────────────
export function ProCard({ children, className = "", testid }: { children: ReactNode; className?: string; testid?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden ${className}`} data-testid={testid}>
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
    primary: "bg-blue-600 text-white shadow-md shadow-blue-600/5 hover:bg-blue-700 border border-blue-600/10",
    secondary: "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-50",
    success: "bg-emerald-600 text-white shadow-md shadow-emerald-600/5 hover:bg-emerald-700",
    danger: "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100/60",
  };
  
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ProInput({ label, testid, ...props }: { label?: string; testid?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      )}
      <input
        {...props}
        data-testid={testid}
        className={`w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all ${props.className || ""}`}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: "red" | "yellow" | "green" | string | null | undefined }) {
  const map: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    red: { label: "Suivi Critique", bg: "bg-red-50 border-red-100", text: "text-red-700", dot: "bg-red-500" },
    yellow: { label: "Vigilance Requise", bg: "bg-amber-50 border-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
    green: { label: "Évolution Stable", bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  };
  const s = map[status || "green"] || map.green;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
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
      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50 text-xs font-black uppercase tracking-wider transition-all"
    >
      <LogOut className="w-4 h-4" />
      Se déconnecter
    </button>
  );
}
