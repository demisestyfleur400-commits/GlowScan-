import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare, Zap, HardDrive } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export default function PWAInstallBanner() {
  const { showBanner, install, dismiss, isIos } = usePWAInstall();

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="fixed bottom-4 left-4 right-4 z-[250] max-w-sm mx-auto"
        data-testid="pwa-install-banner"
      >
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "#13101f",
            border: "1px solid rgba(167,139,250,0.2)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          }}
        >
          {/* Glow */}
          <div
            className="pointer-events-none absolute -top-8 -right-8 w-32 h-32"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }}
          />

          {/* Badge recommandé */}
          <div
            className="absolute top-0 right-12 text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-bl-xl"
            style={{ background: "rgba(167,139,250,0.15)", border: "0 0 1px 1px", borderColor: "rgba(167,139,250,0.3)", color: "#c4b5fd" }}
          >
            Recommandé
          </div>

          {/* En-tête */}
          <div className="px-4 pt-5 pb-3 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white p-0.5"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <img src="/logo-glowscan.jpeg" alt="GlowScan" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold" style={{ color: "#f3f0ff" }}>Application GlowScan</p>
              <p className="text-[11px] font-bold mt-0.5 flex items-center gap-1" style={{ color: "#a78bfa" }}>
                <Zap className="w-3 h-3" /> Accès instantané & économie de data
              </p>
            </div>
            <button
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isIos ? (
            <div className="px-4 pb-4">
              <div
                className="rounded-xl p-3.5 space-y-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Configuration Safari requise :
                </p>

                {[
                  {
                    n: 1, color: "#a78bfa",
                    title: <span className="flex items-center gap-1.5">Appuie sur Partager <Share className="w-3.5 h-3.5 inline" style={{ color: "#60a5fa" }} /></span>,
                    sub: "Situé dans la barre d'outils en bas de Safari.",
                  },
                  {
                    n: 2, color: "#a78bfa",
                    title: <span className="flex items-center gap-1.5">Sélectionne <span style={{ color: "#c4b5fd" }}>« Sur l'écran d'accueil »</span> <PlusSquare className="w-3.5 h-3.5 inline" style={{ color: "rgba(255,255,255,0.5)" }} /></span>,
                    sub: "Fais défiler les options vers le bas.",
                  },
                  {
                    n: 3, color: "#c4b5fd",
                    title: "Clique sur « Ajouter » en haut à droite",
                    sub: "L'icône GlowScan apparaîtra comme une vraie appli.",
                  },
                ].map(({ n, color, title, sub }) => (
                  <div key={n} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                      style={{ background: color + "15", border: `1px solid ${color}40`, color }}
                    >
                      {n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: "#f3f0ff" }}>{title}</p>
                      <p className="text-[10px]" style={{ color: "rgba(200,185,255,0.65)" }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={dismiss}
                className="w-full mt-3 py-3 rounded-full text-xs font-extrabold text-white active:scale-[0.98] transition-transform"
                style={{ background: "#7c3aed" }}
              >
                Prêt, je le fais !
              </button>
            </div>
          ) : (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between text-[10px] font-bold mb-3 px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" style={{ color: "#fbbf24" }} /> Chargement 3× plus rapide</span>
                <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" style={{ color: "#6ee7b7" }} /> Seulement 1.5 Mo</span>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={dismiss}
                  className="flex-1 py-3 rounded-full text-xs font-bold active:scale-95 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                >
                  Plus tard
                </button>
                <button
                  onClick={install}
                  data-testid="button-pwa-install"
                  className="flex-1 py-3 rounded-full text-xs font-extrabold text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  style={{ background: "#7c3aed" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Installer l'app
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
