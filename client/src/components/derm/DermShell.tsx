import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid, Calendar, User, Folder, Activity, BarChart3, Check, MessageSquare, Settings,
  LogOut, Search, Plus, Menu, X, Globe, Coins, Wallet, ScanLine,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { D, FONT_UI, ensureDermFonts, patientCode } from "./tokens";
import { prefetchDermScreens } from "@/lib/dermPrefetch";

// ════════════════════════════════════════════════════════════════════════
// Cadre de l'espace médical GlowScan Derm (handoff « espace médical », §2).
// Barre latérale fixe 250 px (tiroir sous 768 px), barre du haut avec
// « ← Retour » (historique), recherche patient et « + Nouvelle consultation ».
// Les menus pas encore refaits (D2 à D7) ouvrent les pages actuelles.
// ════════════════════════════════════════════════════════════════════════

export type DermNavKey = "consultation" | "vue" | "agenda" | "patients" | "dossiers" | "suivis" | "activite" | "auto" | "messagerie" | "parametres";
type NavItem = { key: DermNavKey; label: string; href: string; icon: typeof User };

const NAV: NavItem[] = [
  { key: "vue", label: "Vue d'ensemble", href: "/derm/dashboard", icon: LayoutGrid },
  { key: "agenda", label: "Agenda", href: "/derm/agenda", icon: Calendar },
  { key: "patients", label: "Patients", href: "/derm/patients", icon: User },
  { key: "dossiers", label: "Dossiers médicaux", href: "/derm/dossiers", icon: Folder },
  { key: "suivis", label: "Suivis", href: "/derm/suivis", icon: Activity },
  { key: "activite", label: "Votre activité", href: "/derm/activite", icon: BarChart3 },
  { key: "auto", label: "Auto-évaluation", href: "/derm/auto-evaluation", icon: Check },
  { key: "messagerie", label: "Messagerie", href: "/derm/consultations", icon: MessageSquare },
  { key: "parametres", label: "Paramètres", href: "/derm/cabinet", icon: Settings },
];
const SECRETARY_KEYS: DermNavKey[] = ["vue", "agenda", "patients"];

/** Le médecin a déjà vu un autre écran Derm dans cet onglet : « ← Retour » a un sens. */
export function markDermVisited() {
  try { sessionStorage.setItem("derm_hist", "1"); } catch {}
}
const hasDermHistory = () => { try { return sessionStorage.getItem("derm_hist") === "1"; } catch { return false; } };

const initialsOf = (name: string) =>
  name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "GS";

type Hit = { id: number; firstName: string; lastName: string; age?: number | null; sex?: string | null; lastScanAt?: string | null; createdAt?: string | null };

function PatientSearch() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); return; }
    let stop = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/pro/patients?q=${encodeURIComponent(term)}`, { credentials: "include" });
        const d = r.ok ? await r.json() : { patients: [] };
        if (!stop) setHits((d.patients || []).slice(0, 8));
      } catch { if (!stop) setHits([]); }
    }, 250);
    return () => { stop = true; clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const go = (id: number) => { setOpen(false); setQ(""); navigate(`/derm/patient/${id}`); };
  return (
    <div ref={box} className="relative min-w-0 flex-1" style={{ maxWidth: 410 }}>
      <label className="flex items-center" style={{ gap: 9, color: "#91a09c" }}>
        <Search size={15} strokeWidth={1.8} className="flex-none" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && hits?.[0]) go(hits[0].id); if (e.key === "Escape") setOpen(false); }}
          placeholder="Rechercher un patient, un dossier..." data-testid="derm-search"
          className="w-full min-w-0" style={{ border: 0, outline: 0, background: "none", fontSize: 10, color: D.textAlt, fontFamily: FONT_UI }} />
      </label>
      {open && hits && (
        <div className="absolute left-0 right-0 z-40 overflow-hidden" style={{ top: 34, background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(13,41,41,.1)" }}>
          {hits.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 11, color: D.muted }}>
              Aucun patient trouvé. <Link href="/derm/accueil" style={{ color: D.action, fontWeight: 600 }}>Créer une nouvelle fiche →</Link>
            </div>
          ) : hits.map((h) => {
            const last = h.lastScanAt || h.createdAt;
            return (
              <button key={h.id} type="button" onClick={() => go(h.id)} data-testid={`derm-hit-${h.id}`}
                className="flex w-full cursor-pointer items-center justify-between text-left hover:bg-[#f3f7f1]"
                style={{ gap: 12, padding: "10px 16px", border: 0, borderBottom: `1px solid ${D.sep}`, background: "#fff", fontFamily: FONT_UI }}>
                <span className="flex min-w-0 flex-col">
                  <b style={{ fontSize: 11, color: D.text }}>{patientCode(h.id)} · {h.firstName} {h.lastName}</b>
                  <span style={{ fontSize: 9.5, color: D.muted }}>{[h.age ? `${h.age} ans` : null, h.sex === "F" ? "Femme" : h.sex === "M" ? "Homme" : null].filter(Boolean).join(" · ") || "Âge non renseigné"}</span>
                </span>
                {last && <span style={{ fontSize: 9.5, color: D.faint, whiteSpace: "nowrap" }}>Dernière visite {new Date(last).toLocaleDateString("fr-FR")}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Abonnement du cabinet terminé : le serveur refuse les données. On le dit et on propose l'action, au lieu d'un chargement sans fin. */
function SubscriptionGate({ isSecretary }: { isSecretary: boolean }) {
  const wa = `https://wa.me/237674377959?text=${encodeURIComponent("Bonjour, j'ai une question sur mon abonnement GlowScan Derm.")}`;
  return (
    <div style={{ maxWidth: 760, margin: "48px auto", padding: "0 24px", fontFamily: FONT_UI }} data-testid="subscription-gate">
      <div style={{ padding: "32px 32px", borderRadius: 14, background: "#fff", border: `1px solid ${D.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, color: D.warn }}>ABONNEMENT DU CABINET</span>
        <h1 style={{ margin: "12px 0 10px", font: "600 28px/1.15 'DM Sans',sans-serif", letterSpacing: -.5, color: D.text }}>
          {isSecretary ? "L'abonnement du cabinet est terminé." : "Votre période d'essai est terminée."}
        </h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: D.muted }}>
          {isSecretary
            ? "Les patients, l'agenda et les dossiers sont conservés en sécurité. Prévenez le médecin : dès qu'il réactive l'abonnement, l'espace se rouvre."
            : "Vos patients, vos dossiers et vos comptes rendus sont conservés en sécurité. Réactivez votre abonnement pour retrouver tout votre espace : 10 000 FCFA par mois, par Mobile Money."}
        </p>
        {!isSecretary && (
          <div className="flex flex-wrap" style={{ gap: 10, marginTop: 22 }}>
            <Link href="/derm/cabinet-avance" style={{ padding: "12px 20px", borderRadius: 6, background: D.action, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }} data-testid="gate-reactivate">Réactiver mon abonnement →</Link>
            <a href={wa} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 20px", borderRadius: 6, border: `1px solid ${D.borderAlt}`, color: D.text, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Une question ? WhatsApp</a>
          </div>
        )}
      </div>
    </div>
  );
}

/** allowExpired : la page reste accessible même abonnement terminé (page de réactivation). */
export function DermShell({ active, children, showBack, onBack, allowExpired }: { active: DermNavKey; children: ReactNode; showBack?: boolean; onBack?: () => void; allowExpired?: boolean }) {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: accData } = useProAccount();
  const acc = accData?.account as any;
  const isSecretary = accData?.user?.role === "secretary";
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { ensureDermFonts(); }, []);
  useEffect(() => { if (acc) prefetchDermScreens(); }, [acc]);

  const items = isSecretary ? NAV.filter((n) => SECRETARY_KEYS.includes(n.key)) : NAV;
  const meName = isSecretary
    ? [accData?.user?.firstName, accData?.user?.lastName].filter(Boolean).join(" ") || "Secrétaire"
    : acc?.fullName ? (/^dr\.?\s/i.test(acc.fullName) ? acc.fullName : `Dr. ${acc.fullName}`) : "";
  const back = showBack ?? (active !== "vue" || hasDermHistory());

  const side = (
    <aside className="flex flex-col overflow-y-auto" style={{ width: 250, height: "100%", boxSizing: "border-box", padding: "22px 18px 16px", color: D.sideText, background: D.side, fontFamily: FONT_UI }}>
      <div className="flex items-center" style={{ gap: 7, height: 50, margin: "0 8px 27px" }}>
        <img src="/img/glowscan-africa-dark.png" alt="GlowScan Africa" style={{ width: 158, height: "auto" }} />
        <span style={{ color: D.teal4, letterSpacing: 1.4, background: "rgba(22,194,181,.08)", border: "1px solid rgba(46,209,196,.35)", borderRadius: 5, padding: "4px 6px", fontSize: 7, fontWeight: 800 }}>DERM</span>
      </div>
      <span style={{ color: D.sideLabel, letterSpacing: 1.5, padding: "0 12px 10px", fontSize: 8, fontWeight: 700 }}>ESPACE MÉDICAL</span>
      <nav className="grid" style={{ gap: 4 }}>
        {items.map((n) => {
          const on = n.key === active;
          const Icon = n.icon;
          return (
            <Link key={n.key} href={n.href} onClick={() => setDrawer(false)} data-testid={`derm-nav-${n.key}`}
              className={`flex items-center no-underline ${on ? "" : "hover:!bg-white/5 hover:!text-white"}`}
              style={{ gap: 11, height: 43, padding: "0 12px", borderRadius: 9, fontSize: 11, fontWeight: on ? 700 : 500, color: on ? "#fff" : D.sideMuted,
                background: on ? "linear-gradient(90deg,rgba(18,167,160,.23),rgba(18,167,160,.06))" : "transparent", boxShadow: on ? "inset 2px 0 #25c1b8" : "none" }}>
              <Icon size={16} strokeWidth={1.8} className="flex-none" />{n.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: "auto" }} />
      <div className="relative">
        {menu && (
          <div className="absolute left-0 right-0 z-10 flex flex-col overflow-hidden" style={{ bottom: 58, background: "#123433", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 6 }} data-testid="derm-me-menu">
            {!isSecretary && ([
              ["/derm/profil-public", Globe, "Mon profil public"],
              ["/derm/portefeuille", Coins, "Portefeuille"],
              ["/derm/paiements", Wallet, "Paiements"],
              ["/derm/analyse", ScanLine, "Analyse photo"],
            ] as const).map(([href, Icon, label]) => (
              <Link key={href} href={href} className="flex items-center no-underline hover:!bg-white/5" style={{ gap: 9, padding: "9px 10px", borderRadius: 7, fontSize: 10.5, color: D.sideText }}>
                <Icon size={14} strokeWidth={1.8} />{label}
              </Link>
            ))}
            <button type="button" onClick={() => logout()} className="flex cursor-pointer items-center hover:!bg-white/5" style={{ gap: 9, padding: "9px 10px", borderRadius: 7, fontSize: 10.5, color: D.sideText, border: 0, background: "none", fontFamily: FONT_UI }}>
              <LogOut size={14} strokeWidth={1.8} />Déconnexion
            </button>
          </div>
        )}
        <div className="grid items-center" style={{ gridTemplateColumns: "auto 1fr auto", gap: 9, padding: "14px 3px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Mon compte" data-testid="derm-me"
            className="grid cursor-pointer place-items-center" style={{ width: 34, height: 34, borderRadius: "50%", background: D.teal3, color: D.side, fontSize: 9, fontWeight: 800, border: 0 }}>
            {initialsOf(meName)}
          </button>
          <button type="button" onClick={() => setMenu((m) => !m)} className="flex min-w-0 cursor-pointer flex-col text-left" style={{ border: 0, background: "none", padding: 0, color: D.sideText, fontFamily: FONT_UI }}>
            <b className="truncate" style={{ fontSize: 8 }}>{meName}</b>
            <span style={{ marginTop: 2, color: "#78928d", fontSize: 7 }}>{isSecretary ? "Secrétaire" : "Dermatologue"}</span>
          </button>
          <button type="button" onClick={() => logout()} aria-label="Déconnexion" className="cursor-pointer" style={{ border: 0, background: "none", color: "#75918b", padding: 6 }}>
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen" style={{ color: D.textAlt, background: D.page, fontFamily: FONT_UI, WebkitFontSmoothing: "antialiased" }}>
      <div className="fixed inset-y-0 left-0 z-30 hidden md:block">{side}</div>
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(13,41,41,.45)" }} onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0">{side}</div>
          <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer le menu" className="absolute cursor-pointer" style={{ left: 258, top: 14, border: 0, background: "#fff", borderRadius: 8, padding: 6, color: D.text }}><X size={18} /></button>
        </div>
      )}
      <main className="md:ml-[250px]">
        <div className="sticky top-0 z-20 flex items-center px-4 md:px-[35px]" style={{ gap: 14, height: 72, background: "rgba(255,255,255,.82)", borderBottom: "1px solid #e2e8e4", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)" }}>
          <button type="button" onClick={() => setDrawer(true)} aria-label="Menu" className="flex-none cursor-pointer md:hidden" style={{ border: 0, background: "none", color: D.text, padding: 4 }}><Menu size={20} /></button>
          {back && (
            <button type="button" onClick={() => (onBack ? onBack() : window.history.back())} data-testid="derm-back"
              className="flex flex-none cursor-pointer items-center hover:!bg-[#eef6f3]"
              style={{ gap: 6, height: 36, padding: "0 13px", border: "1px solid #dfe7e3", borderRadius: 9, background: "#fff", color: D.cta, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", fontFamily: FONT_UI }}>
              ← Retour
            </button>
          )}
          <PatientSearch />
          <button type="button" onClick={() => navigate(isSecretary ? "/derm/accueil" : "/derm/consultation")} data-testid="derm-new-consult"
            className="ml-auto flex flex-none cursor-pointer items-center justify-center"
            style={{ gap: 7, minHeight: 39, padding: "0 15px", borderRadius: 9, background: D.cta, color: "#fff", fontSize: 9, fontWeight: 700, border: 0, boxShadow: "0 7px 16px rgba(29,112,105,.13)", whiteSpace: "nowrap", fontFamily: FONT_UI }}>
            <Plus size={13} strokeWidth={2} /><span className="hidden sm:inline">Nouvelle consultation</span>
          </button>
        </div>
        {accData && (accData as any).active === false && !allowExpired ? <SubscriptionGate isSecretary={isSecretary} /> : children}
      </main>
    </div>
  );
}
