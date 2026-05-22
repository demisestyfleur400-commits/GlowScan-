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
        // Calé à z-[250] pour dominer l'écran proprement au-dessus de la nav-bar et des bannières secondaires
        className="fixed bottom-4 left-4 right-4 z-[250] max-w-sm mx-auto"
        data-testid="pwa-install-banner"
      >
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative">
          
          {/* Badge de mise en avant technologique */}
          <div className="absolute top-0 right-12 bg-gradient-to-r from-pink-600 to-purple-600 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-xl border-l border-b border-white/10">
            Recommandé
          </div>

          {/* En-tête de l'application */}
          <div className="px-4 pt-5 pb-3 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/20 bg-white p-0.5">
              <img src="/logo-glowscan.jpeg" alt="GlowScan App" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-white">Application GlowScan</p>
              <p className="text-[11px] text-pink-400 font-bold mt-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3 animate-pulse" /> Accès instantané & Économie de Data
              </p>
            </div>
            <button
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
              className="p-1.5 text-gray-400 hover:text-white transition-colors flex-shrink-0 rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Zone de contenu adaptative selon l'OS */}
          {isIos ? (
            <div className="px-4 pb-4">
              {/* Étapes visuelles simplifiées et ultra-explicites pour iPhone */}
              <div className="bg-white/5 rounded-xl p-3.5 space-y-3 border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                   CONFIGURATION SAFARI REQUISE :
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-xs font-black flex-shrink-0">1</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      Appuie sur le bouton Partager <Share className="w-3.5 h-3.5 text-blue-400 inline" />
                    </p>
                    <p className="text-[10px] text-gray-400">Situé dans la barre d'outils au bas de ton écran Safari.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-xs font-black flex-shrink-0">2</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      Sélectionne <span className="text-pink-400">« Sur l'écran d'accueil »</span> <PlusSquare className="w-3.5 h-3.5 text-gray-300 inline" />
                    </p>
                    <p className="text-[10px] text-gray-400">Fais défiler les options vers le bas pour le trouver.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-black flex-shrink-0">3</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-200">Clique sur « Ajouter » en haut à droite</p>
                    <p className="text-[10px] text-gray-400">L'icône GlowScan apparaîtra comme une vraie appli.</p>
                  </div>
                </div>
              </div>

              {/* Unique action claire pour iOS : Masquer pour appliquer les consignes */}
              <button
                onClick={dismiss}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-pink-600/10 active:scale-[0.98] transition-transform"
              >
                Prêt, je le fais !
              </button>
            </div>
          ) : (
            /* Layout Android / Chrome standard avec déclenchement automatique */
            <div className="px-4 pb-4">
              {/* Liste d'avantages en puces légères pour Android */}
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-3 px-1">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> Chargement 3x plus rapide</span>
                <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-emerald-400" /> Seulement 1.5 Mo</span>
              </div>
              
              <div className="flex gap-2.5">
                <button
                  onClick={dismiss}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-xs font-black uppercase tracking-wider text-gray-300 hover:bg-white/10 active:scale-95 transition-all"
                >
                  Plus tard
                </button>
                <button
                  onClick={install}
                  data-testid="button-pwa-install"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 shadow-xl shadow-pink-600/10 active:scale-[0.98] transition-transform"
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
