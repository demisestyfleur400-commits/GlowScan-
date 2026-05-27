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
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden flex flex-col max-h-[95vh]"
            style={{ background: "#0D0A0E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Header */}
            <div className="px-6 pt-5 pb-6 relative flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(233,30,140,0.15) 0%, rgba(139,92,246,0.1) 100%)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>

              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E91E8C, #8b5cf6)", boxShadow: "0 0 20px rgba(233,30,140,0.4)" }}>
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>

              <h2 className="text-xl font-black text-white text-center uppercase tracking-wide">Débloque l'accès Premium</h2>
              <p className="text-xs text-center font-bold mt-1" style={{ color: "#f9a8d4" }}>
                GlowScan AI & Scan Nutritionnel
              </p>
            </div>

            {/* Corps défilant */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

              {/* Prix */}
              <div className="rounded-2xl p-4 text-center relative overflow-hidden" style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.25)" }}>
                <div className="absolute top-0 right-0 text-white text-[8px] font-black px-2.5 py-1 rounded-bl-xl uppercase tracking-widest" style={{ background: "#E91E8C" }}>
                  Offre de Lancement
                </div>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>Accès Privé Unique</p>
                <div className="mt-1 flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl font-black text-white">{PREMIUM_PRICE.toLocaleString()}</span>
                  <span className="text-sm font-black text-white">FCFA</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md ml-1" style={{ color: "#E91E8C", background: "rgba(233,30,140,0.15)" }}>À VIE</span>
                </div>
                <p className="text-[10px] mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Paye une seule fois, utilise ces outils avancés sans limite pour toujours. Aucun abonnement caché.
                </p>
              </div>

              {/* Bénéfices */}
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Ce que tu débloques immédiatement :</p>

                {[
                  { icon: Bot, text: "GlowScan AI : Ton coach personnel anti-boutons disponible 24h/24" },
                  { icon: Sparkles, text: "Le Scan Nutritionnel : Découvre l'impact direct de ton alimentation sur tes imperfections" },
                  { icon: Zap, text: "Adaptation intelligente de tes conseils selon la météo et l'humidité locale" },
                  { icon: ShieldCheck, text: "Suivi d'évolution rigoureux et analyse comparative de tes boutons à J+7" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.2)" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: "#E91E8C" }} />
                    </div>
                    <p className="text-xs font-bold leading-tight text-white">{text}</p>
                  </div>
                ))}
              </div>

              {/* Comptes Mobile Money */}
              <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Comptes de dépôt officiels GlowScan :</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟠</span>
                      <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>Orange Money</span>
                    </div>
                    <span className="text-xs font-black px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.08)" }}>674 37 79 59</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟡</span>
                      <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>MTN MoMo</span>
                    </div>
                    <span className="text-xs font-black px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.08)" }}>674 37 79 59</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-8 pt-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={handleWhatsApp}
                disabled={loading}
                data-testid="button-upgrade-whatsapp"
                className="w-full text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #E91E8C 0%, #f43f5e 60%, #fb923c 100%)", boxShadow: "0 0 30px rgba(233,30,140,0.4)" }}
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                {loading ? "Ouverture de WhatsApp..." : "Activer mon accès à vie à 2 000 FCFA"}
              </button>
              <p className="text-[10px] text-center mt-2.5 font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
                ⚡ Envoie ton reçu par WhatsApp — Activation validée par notre équipe en 5 min.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
