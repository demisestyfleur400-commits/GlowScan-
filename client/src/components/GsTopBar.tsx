import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { GS, useGsFonts } from "@/lib/gs-ui";

// ════════════════════════════════════════════════════════════════════════
// Barre du haut B2C — langage design (gs-ui) : fond blanc, encre/turquoise,
// angles droits, IBM Plex. Remplace l'ancienne Navbar violette sombre.
// Reprend la logique existante : liens de navigation, badge messages non lus,
// avatar → profil, déconnexion.
// ════════════════════════════════════════════════════════════════════════

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/analyze", label: "Analyse" },
  { href: "/shop", label: "Boutique" },
  { href: "/premium", label: "Premium" },
];

export function GsTopBar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  useGsFonts();

  // Badge « Messages » : réponses dermato non lues (montage + polling 20s + focus).
  useEffect(() => {
    if (!user) { setUnreadTotal(0); return; }
    let alive = true;
    const load = () => fetch("/api/consultations/unread-total", { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (alive) setUnreadTotal(Number(d.total) || 0); })
      .catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [user, location]);

  const links = [...LINKS];
  if (user) links.push({ href: "/consultations", label: "Messages" });

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 200, width: "100%", background: "#fff", borderBottom: `1px solid ${GS.line}`, fontFamily: GS.sans }}>
      <style>{`
        @media (min-width: 768px) { .gstb-desk { display: flex !important; } .gstb-burger { display: none !important; } }
        @media (max-width: 767px) { .gstb-desk { display: none !important; } .gstb-burger { display: flex !important; } }
      `}</style>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 60 }}>

          {/* Logo mark + wordmark */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <img
              src="/glowscan-mark.png"
              alt="GlowScan"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }}
              style={{ width: 30, height: 30, objectFit: "contain", display: "block" }}
            />
            <span style={{ fontSize: 15, fontWeight: 600, color: GS.ink, letterSpacing: "-.3px" }}>GlowScan</span>
          </Link>

          {/* Desktop nav */}
          <div className="gstb-desk" style={{ display: "none", alignItems: "center", gap: 4 }}>
            {links.map((link) => {
              const active = location === link.href;
              const badge = link.href === "/consultations";
              return (
                <Link key={link.href} href={link.href}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", textDecoration: "none", fontFamily: GS.mono, fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: active ? GS.ink : GS.faint, borderBottom: `2px solid ${active ? GS.accent : "transparent"}` }}>
                  {badge && <MessageSquare size={13} style={{ color: active ? GS.teal : GS.faint }} />}
                  {link.label}
                  {badge && unreadTotal > 0 && (
                    <span style={{ minWidth: 15, height: 15, padding: "0 4px", background: GS.red, color: "#fff", fontFamily: GS.mono, fontSize: 9, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unreadTotal > 9 ? "9+" : unreadTotal}</span>
                  )}
                </Link>
              );
            })}
            {/* User hub */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8, paddingLeft: 14, borderLeft: `1px solid ${GS.line}` }}>
              {user ? (
                <>
                  <Link href="/profile" aria-label="Mon dossier"
                    style={{ width: 32, height: 32, border: `1px solid ${GS.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.mono, fontSize: 12, fontWeight: 600, color: GS.ink, textDecoration: "none" }}>
                    {(user.firstName || "U").charAt(0).toUpperCase()}
                  </Link>
                  <button onClick={() => logout()} title="Déconnexion"
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: GS.mono, fontSize: 9, fontWeight: 600, letterSpacing: ".06em", color: GS.faint, padding: "4px 2px" }}>
                    SORTIR
                  </button>
                </>
              ) : (
                <Link href="/auth" style={{ background: GS.ink, color: "#fff", padding: "8px 16px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Connexion</Link>
              )}
            </div>
          </div>

          {/* Mobile burger */}
          <button className="gstb-burger" onClick={() => setIsOpen((v) => !v)} aria-label="Menu"
            style={{ display: "none", width: 38, height: 38, border: `1px solid ${GS.line}`, background: "#fff", alignItems: "center", justifyContent: "center", color: GS.ink, cursor: "pointer", position: "relative" }}>
            {isOpen ? <X size={19} /> : <Menu size={19} />}
            {!isOpen && unreadTotal > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, padding: "0 4px", background: GS.red, color: "#fff", fontFamily: GS.mono, fontSize: 9, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{unreadTotal > 9 ? "9+" : unreadTotal}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isOpen && (
        <div style={{ position: "fixed", left: 0, right: 0, top: 60, background: "#fff", borderBottom: `1px solid ${GS.line}`, boxShadow: "0 12px 30px rgba(0,0,0,0.08)", zIndex: 50 }}>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {links.map((link) => {
              const active = location === link.href;
              const badge = link.href === "/consultations";
              return (
                <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 12px", textDecoration: "none", border: `1px solid ${active ? GS.ink : "transparent"}`, background: active ? GS.mintBg : "transparent", fontFamily: GS.mono, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: active ? GS.ink : GS.muted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{badge && <MessageSquare size={14} style={{ color: GS.teal }} />}{link.label}</span>
                  {badge && unreadTotal > 0 && <span style={{ minWidth: 17, height: 17, padding: "0 5px", background: GS.red, color: "#fff", fontFamily: GS.mono, fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unreadTotal > 9 ? "9+" : unreadTotal}</span>}
                </Link>
              );
            })}
            <div style={{ paddingTop: 10, marginTop: 6, borderTop: `1px solid ${GS.line}` }}>
              {user ? (
                <button onClick={() => { setIsOpen(false); logout(); }}
                  style={{ width: "100%", textAlign: "left", padding: "13px 12px", border: `1px solid ${GS.line}`, background: "#fff", fontFamily: GS.mono, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: GS.muted, cursor: "pointer" }}>Déconnexion</button>
              ) : (
                <Link href="/auth" onClick={() => setIsOpen(false)}
                  style={{ display: "block", width: "100%", boxSizing: "border-box", textAlign: "center", padding: "13px", background: GS.ink, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Se connecter</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
