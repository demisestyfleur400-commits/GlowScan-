import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export default function PWAInstallBanner() {
  const { showBanner, install, dismiss, isIos } = usePWAInstall();

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="fixed bottom-20 left-3 right-3 z-50 max-w-sm mx-auto"
          data-testid="pwa-install-banner"
        >
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden border border-white/10">

            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10">
                <img src="/logo-glowscan.jpeg" alt="GlowScan" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-white">Installe GlowScan sur ton téléphone</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Ouvre l'app en 1 tap, sans navigateur</p>
              </div>
              <button
                onClick={dismiss}
                data-testid="button-pwa-dismiss"
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIos ? (
              <div className="px-4 pb-4">
                {/* Visual steps for iOS */}
                <div className="bg-white/8 rounded-xl p-3 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Comment faire :</p>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-xs font-black flex-shrink-0">1</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Appuie sur le bouton Partager</p>
                      <p className="text-[10px] text-gray-400">L'icône <span className="font-bold text-white">⬆️</span> en bas de ton écran Safari</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-xs font-black flex-shrink-0">2</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Fais défiler vers le bas</p>
                      <p className="text-[10px] text-gray-400">Dans le menu qui s'ouvre</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-black flex-shrink-0">3</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Appuie sur <span className="text-pink-400">« Sur l'écran d'accueil »</span></p>
                      <p className="text-[10px] text-gray-400">Puis confirme en appuyant sur Ajouter</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={dismiss}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold text-gray-300"
                  >
                    Pas maintenant
                  </button>
                  <button
                    onClick={dismiss}
                    className="flex-1 py-2 rounded-xl bg-pink-500 text-xs font-extrabold text-white"
                  >
                    ✅ Compris !
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-semibold text-gray-300 hover:bg-white/15 transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={install}
                  data-testid="button-pwa-install"
                  className="flex-1 py-2.5 rounded-xl bg-pink-500 text-xs font-extrabold text-white flex items-center justify-center gap-1.5 hover:bg-pink-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Installer
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
