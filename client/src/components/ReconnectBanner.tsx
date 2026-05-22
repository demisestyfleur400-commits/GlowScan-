import { motion, AnimatePresence } from "framer-motion";
import { CloudLightning, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function ReconnectBanner() {
  const { user, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || user || dismissed) return null;

  let hadAccount = false;
  try { 
    hadAccount = localStorage.getItem("glowscan_had_account") === "1"; 
  } catch {}
  
  if (!hadAccount) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        // Transformation en carte flottante premium centrée au lieu d'un bloc figé
        className="fixed top-4 left-4 right-4 z-[260] max-w-md mx-auto"
        data-testid="reconnect-banner"
      >
        <div className="bg-slate-950/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10 relative overflow-hidden">
          
          {/* Effet de lueur d'arrière-plan discret pour l'aspect technologique */}
          <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-pink-500 to-purple-600" />

          {/* Icône de statut de synchronisation */}
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-pink-400">
            <CloudLightning className="w-4 h-4 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Synchronisation Cloud</p>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <p className="text-xs text-gray-200 font-medium mt-0.5 leading-normal">
              Restaure ton historique d'analyses et tes objectifs de peau en un clic.
            </p>
          </div>

          {/* Bouton d'action chirurgical */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="/auth"
              data-testid="button-reconnect"
              className="bg-white text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all active:scale-95 hover:bg-gray-100 shadow-lg"
            >
              Synchroniser
            </a>
            
            {/* Fermeture discrète */}
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors"
              data-testid="button-dismiss-reconnect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
