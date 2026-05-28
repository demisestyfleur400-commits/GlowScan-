import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { User, LogOut, Menu, X, Crown, ScanLine } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // 1. INJECTION DE "SCANNER PRODUIT" DANS LE ROUTAGE MAÎTRE
  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/analyze", label: "Analyse Faciale" },
    { href: "/product-scan", label: "Scanner Produit", highlight: true }, // Notre module retrouvé
    { href: "/shop", label: "Boutique" },
    { href: "/pro", label: "GlowScan Pro", premium: true },
  ];

  if (user) {
    navLinks.push({ href: "/profile", label: "Mon Profil" });
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        width: "100%",
        background: "rgba(13,10,14,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px" }}>

          {/* Logo */}
          <Link href="/" data-testid="logo-glowscan" style={{ display: "flex", alignItems: "center", transition: "transform 0.15s", textDecoration: "none" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "4px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <img
                src="/logo-glowscan.jpeg"
                alt="GlowScan Logo"
                style={{ height: "36px", width: "auto", objectFit: "contain", borderRadius: "8px" }}
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div style={{ display: "none" }} className="md-flex-nav">
            <style>{`
              @media (min-width: 768px) {
                .md-flex-nav { display: flex !important; align-items: center; gap: 24px; }
                .md-hidden { display: none !important; }
              }
              @media (max-width: 767px) {
                .md-flex-nav { display: none !important; }
                .md-hidden { display: flex !important; }
              }
            `}</style>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(19,16,31,0.8)",
                padding: "4px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-testid={`nav-link-${link.label.toLowerCase()}`}
                    style={{
                      position: "relative",
                      padding: "8px 14px",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      transition: "all 0.15s",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                      background: isActive ? "rgba(124,58,237,0.18)" : "transparent",
                      border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
                      color: isActive
                        ? "#c4b5fd"
                        : link.highlight
                        ? "#E91E8C"
                        : "rgba(200,185,255,0.65)",
                    }}
                  >
                    {link.highlight && <ScanLine style={{ width: "12px", height: "12px", color: "#E91E8C" }} />}
                    {link.label}
                    {link.premium && (
                      <Crown style={{ width: "12px", height: "12px", color: isActive ? "#a78bfa" : "#fbbf24" }} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Hub */}
            <div style={{ paddingLeft: "16px", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: "rgba(124,58,237,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#c4b5fd",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "1px solid rgba(124,58,237,0.3)",
                      }}
                    >
                      {user.firstName?.[0] || <User style={{ width: "14px", height: "14px" }} />}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(200,185,255,0.65)" }}>
                      {user.firstName || "Profil"}
                    </span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    data-testid="button-logout"
                    title="Déconnexion"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "6px",
                      borderRadius: "8px",
                      color: "rgba(255,255,255,0.35)",
                      display: "flex",
                      alignItems: "center",
                      transition: "color 0.15s",
                    }}
                  >
                    <LogOut style={{ width: "16px", height: "16px" }} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  data-testid="button-connexion"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "9999px",
                    background: "#7c3aed",
                    color: "#f3f0ff",
                    fontSize: "11px",
                    fontWeight: 800,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    transition: "opacity 0.15s",
                  }}
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md-hidden"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-mobile-menu"
            aria-label="Menu de navigation"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f3f0ff",
              cursor: "pointer",
              transition: "transform 0.1s",
            }}
          >
            {isOpen ? <X style={{ width: "20px", height: "20px", color: "rgba(200,185,255,0.65)" }} /> : <Menu style={{ width: "20px", height: "20px" }} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              top: "64px",
              background: "rgba(13,10,14,0.98)",
              backdropFilter: "blur(24px)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      textDecoration: "none",
                      transition: "all 0.12s",
                      background: isActive
                        ? "rgba(124,58,237,0.15)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(124,58,237,0.3)"
                        : "1px solid transparent",
                      color: isActive
                        ? "#c4b5fd"
                        : link.highlight
                        ? "#E91E8C"
                        : "rgba(200,185,255,0.65)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {link.highlight && <ScanLine style={{ width: "14px", height: "14px", color: "#E91E8C" }} />}
                      <span>{link.label}</span>
                    </div>
                    {link.premium && <Crown style={{ width: "14px", height: "14px", color: "#fbbf24" }} />}
                  </Link>
                );
              })}

              <div style={{ paddingTop: "12px", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {user ? (
                  <button
                    onClick={() => { setIsOpen(false); logout(); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      background: "rgba(233,30,140,0.08)",
                      border: "1px solid rgba(233,30,140,0.2)",
                      color: "#f9a8d4",
                      cursor: "pointer",
                    }}
                  >
                    <span>Déconnexion</span>
                    <LogOut style={{ width: "14px", height: "14px" }} />
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "center",
                      padding: "12px 16px",
                      borderRadius: "9999px",
                      background: "#7c3aed",
                      color: "#f3f0ff",
                      fontSize: "13px",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    Se connecter
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
