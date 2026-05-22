import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, User, LogOut, Menu, X, Crown, ScanLine } from "lucide-react";
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
    <nav className="sticky top-0 z-[200] w-full bg-slate-950/90 backdrop-blur-md border-b border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Zone Logo */}
          <Link href="/" className="flex items-center group transition-transform active:scale-95" data-testid="logo-glowscan">
            <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-800">
              <img
                src="/logo-glowscan.jpeg"
                alt="GlowScan Logo"
                className="h-9 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation (Épurée & Style Labo Technique) */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-gray-800/80">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3.5 py-2 text-[11px] font-black uppercase tracking-wider transition-all rounded-lg flex items-center gap-1.5 ${
                      isActive 
                        ? "text-white bg-slate-950 shadow-md border border-gray-800" 
                        : link.highlight 
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-gray-400 hover:text-white"
                    }`}
                    data-testid={`nav-link-${link.label.toLowerCase()}`}
                  >
                    {link.highlight && <ScanLine className="w-3 h-3 text-emerald-400" />}
                    {link.label}
                    {link.premium && (
                      <Crown className={`w-3 h-3 ${isActive ? "text-emerald-400" : "text-amber-500"}`} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Hub Utilisateur (Profil / Connexion Neutre) */}
            <div className="pl-4 border-l border-gray-900">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black uppercase border border-gray-800 group-hover:border-slate-700 transition-colors">
                      {user.firstName?.[0] || <User className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider hidden lg:block text-gray-400 group-hover:text-white transition-colors">
                      {user.firstName || "Profil"}
                    </span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900/50 transition-all active:scale-90"
                    title="Déconnexion"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-950 text-[11px] font-black uppercase tracking-widest shadow-xs hover:bg-gray-100 active:scale-[0.98] transition-all"
                  data-testid="button-connexion"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>

          {/* Bouton Technique 3 Traits (Mobile) */}
          <button
            className="md:hidden w-10 h-10 rounded-xl bg-slate-900 border border-gray-800 flex items-center justify-center text-white active:scale-90 transition-transform"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-mobile-menu"
            aria-label="Menu de navigation"
          >
            {isOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Menu Déroulant Mobile Clinique */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            className="md:hidden border-b border-gray-900 bg-slate-950/98 backdrop-blur-xl overflow-hidden fixed left-0 right-0 top-16 shadow-2xl z-50"
          >
            <div className="px-4 py-4 space-y-1.5">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? "bg-slate-900 text-white border border-gray-800"
                        : link.highlight
                          ? "bg-emerald-500/5 text-emerald-400 border border-emerald-500/10"
                          : "text-gray-300 hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {link.highlight && <ScanLine className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{link.label}</span>
                    </div>
                    {link.premium && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </Link>
                );
              })}
              
              <div className="pt-3 mt-1 border-t border-gray-900">
                {user ? (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-red-400 bg-red-950/20 border border-red-900/30"
                  >
                    <span>Déconnexion</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-4 py-3.5 rounded-xl bg-white text-slate-950 text-[11px] font-black uppercase tracking-widest shadow-md"
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
