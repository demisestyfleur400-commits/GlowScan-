import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/analyze", label: "Analyse" },
    { href: "/shop", label: "Boutique" },
    { href: "/pro", label: "GlowScan Pro" },
  ];

  if (user) {
    navLinks.push({ href: "/profile", label: "Profil" });
  }

  return (
    <nav className="sticky top-0 z-50 w-full glow-bg-dark border-b border-pink-600/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group" data-testid="logo-glowscan">
            <div className="bg-white rounded-xl p-1 shadow-sm group-hover:shadow-md transition-shadow">
              <img
                src="/logo-glowscan.jpeg"
                alt="GlowScan"
                className="h-10 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-bold transition-colors ${
                    location === link.href ? "glow-text-pink" : "text-white/70 hover:text-white"
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pl-6 border-l border-white/20">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full glow-bg-pink flex items-center justify-center text-white font-bold">
                      {user.firstName?.[0] || <User className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium hidden lg:block text-white">
                      {user.firstName || "Utilisateur"}
                    </span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="text-white/70 hover:text-white transition-colors"
                    title="Déconnexion"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/auth"
                  className="px-5 py-2.5 rounded-lg glow-bg-pink text-white text-sm font-bold shadow-lg hover:opacity-90 transition-all duration-200"
                  data-testid="button-connexion"
                >
                  Connexion
                </a>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-mobile-menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/10 overflow-hidden glow-bg-dark"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-base font-bold transition-colors ${
                    location === link.href
                      ? "bg-pink-500/20 glow-text-pink"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 mt-2 border-t border-white/10">
                {user ? (
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 text-white/80 hover:text-white font-medium"
                  >
                    Déconnexion
                  </button>
                ) : (
                  <a
                    href="/auth"
                    className="block w-full text-center px-4 py-2 rounded-lg glow-bg-pink text-white font-bold"
                  >
                    Connexion
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
