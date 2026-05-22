import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Zap, MessageCircle, Sparkles, Bot, ShieldCheck } from "lucide-react";

const ADMIN_WHATSAPP = "+237674377959";
const PREMIUM_PRICE = 2000;

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scansThisMonth?: number;
  scansLimit?: number;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleWhatsApp = () => {
    setLoading(true);
    const text = `🌟 *ACTIVATION GLOWSCAN AI & SCAN NUTRITIONNEL*\n\nJe souhaite débloquer l'accès à vie à l'IA GlowScan et au module de Scan Nutritionnel.\n\n💵 *Tarif Unique :* ${PREMIUM_PRICE.toLocaleString()} FCFA (Accès à vie)\n📲 *Paiement :* Orange Money ou MTN MoMo au *674 37 79 59*\n\nJe vous envoie la capture d'écran de mon reçu de paiement pour activer mes accès premium immédiatement ! ✨`;
    
    window.open(`https://wa.me/${ADMIN_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Fiche Modale */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header avec Design Premium Sombre/Pink */}
            <div className="bg-gradient-to-br from-gray-950 via-slate-900 to-pink-950 px-6 pt-8 pb-8 relative border-b border-gray-900 flex-shrink-0">
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-all border border-white/10"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
              
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-pink-50 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 animate-pulse">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h2 className="text-xl font-black text-white text-center uppercase tracking-wide">Débloque l'accès Premium</h2>
              <p className="text-pink-400 text-xs text-center font-bold mt-1">
                GlowScan AI & Scan Nutritionnel
              </p>
            </div>

            {/* Corps défilant */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              
              {/* L'offre Unique Irrésistible */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-100 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-pink-600 text-white text-[8px] font-black px-2.5 py-1 rounded-bl-xl uppercase tracking-widest">
                  Offre de Lancement
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Accès Privé Unique</p>
                <div className="mt-1 flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl font-black text-gray-950">{PREMIUM_PRICE.toLocaleString()}</span>
                  <span className="text-sm font-black text-gray-900">FCFA</span>
                  <span className="text-xs font-bold text-pink-600 bg-pink-100/60 px-1.5 py-0.5 rounded-md ml-1">À VIE</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                  Paye une seule fois, utilise ces outils avancés sans limite pour toujours. Aucun abonnement caché.
                </p>
              </div>

              {/* Les Vrais Bénéfices Orientés Résultats */}
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Ce que tu débloques immédiatement :</p>
                
                {[
                  { icon: Bot, text: "GlowScan AI : Ton coach personnel anti-boutons disponible 24h/24" },
                  { icon: Sparkles, text: "Le Scan Nutritionnel : Découvre l'impact direct de ton alimentation sur tes imperfections" },
                  { icon: Zap, text: "Adaptation intelligente de tes conseils selon la météo et l'humidité locale" },
                  { icon: ShieldCheck, text: "Suivi d'évolution rigoureux et analyse comparative de tes boutons à J+7" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100">
                      <Icon className="w-3.5 h-3.5 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 leading-tight">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Box d'instructions Orange / Mobile Money locale */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200/60 space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Comptes de dépôt officiels GlowScan :</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟠</span>
                      <span className="text-xs font-bold text-gray-700">Orange Money</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 bg-gray-100 px-2 py-1 rounded">674 37 79 59</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟡</span>
                      <span className="text-xs font-bold text-gray-700">MTN MoMo</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 bg-gray-100 px-2 py-1 rounded">674 37 79 59</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA d'action final */}
            <div className="px-6 pb-8 pt-2 border-t border-gray-50 flex-shrink-0 bg-white">
              <button
                onClick={handleWhatsApp}
                disabled={loading}
                data-testid="button-upgrade-whatsapp"
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-xl shadow-pink-600/20 hover:opacity-95"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                {loading ? "Ouverture de WhatsApp..." : "Activer mon accès à vie à 2 000 FCFA"}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-2.5 font-medium">
                ⚡ Envoie ton reçu par WhatsApp — Activation validée par notre équipe en 5 min.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
