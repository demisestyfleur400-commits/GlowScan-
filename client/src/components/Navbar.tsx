import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, User, LogOut, Menu, X, Crown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/analyze", label: "Analyse Faciale" },
    { href: "/shop", label: "Boutique" },
    { href: "/pro", label: "GlowScan Pro", premium: true }, // Badge premium optionnel
  ];

  if (user) {
    navLinks.push({ href: "/profile", label: "Mon Profil" });
  }

  return (
    <nav className="sticky top-0 z-[200] w-full bg-slate-950/80 backdrop-blur-md border-b border-gray-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Zone */}
          <Link href="/" className="flex items-center group transition-transform active:scale-95" data-testid="logo-glowscan">
            <div className="bg-white rounded-xl p-1 shadow-sm group-hover:shadow-md transition-shadow border border-gray-100">
              <img
                src="/logo-glowscan.jpeg"
                alt="GlowScan Logo"
                className="h-9 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation (Épurée & Tech) */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1 bg-slate-900/40 p-1 rounded-xl border border-gray-900/50">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-lg flex items-center gap-1.5 ${
                      isActive 
                        ? "text-white bg-slate-900 shadow-sm border border-gray-800" 
                        : "text-gray-400 hover:text-white"
                    }`}
                    data-testid={`nav-link-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                    {link.premium && (
                      <Crown className={`w-3 h-3 ${isActive ? "text-pink-500" : "text-amber-500"}`} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Hub Utilisateur Profil / Connexion */}
            <div className="pl-4 border-l border-gray-900">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white text-xs font-black uppercase shadow-md border border-white/10 group-hover:opacity-90 transition-opacity">
                      {user.firstName?.[0] || <User className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wide hidden lg:block text-gray-300 group-hover:text-white transition-colors">
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
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-600/10 hover:opacity-95 active:scale-[0.98] transition-all"
                  data-testid="button-connexion"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Action Button */}
          <button
            className="md:hidden w-10 h-10 rounded-xl bg-slate-900/60 border border-gray-900 flex items-center justify-center text-white active:scale-90 transition-transform"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-mobile-menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Glassmorphism Menu Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="md:hidden border-b border-gray-900 bg-slate-950/95 backdrop-blur-xl overflow-hidden fixed left-0 right-0 top-16 shadow-2xl"
          >
            <div className="px-4 py-5 space-y-2">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-pink-600/10 to-purple-600/10 text-pink-500 border border-pink-500/20"
                        : "text-gray-300 hover:bg-slate-900/50"
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.premium && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </Link>
                );
              })}
              
              <div className="pt-4 mt-2 border-t border-gray-900/80">
                {user ? (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 bg-red-500/5 border border-red-500/10"
                  >
                    <span>Déconnexion</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-600/10"
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
