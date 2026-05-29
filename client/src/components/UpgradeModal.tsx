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
    const text = `🌟 *ACTIVATION GLOWSCAN PREMIUM*\n\nJe souhaite activer mon abonnement GlowScan Premium.\n\n💵 *Tarif :* ${PREMIUM_PRICE.toLocaleString()} FCFA/mois\n📲 *Paiement :* Orange Money ou MTN MoMo au *674 37 79 59*\n\nJe vous envoie la capture d'écran de mon reçu de paiement pour activer mon accès immédiatement ! ✨`;

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
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col max-h-[95vh]"
            style={{
              background: "#13101f",
              border: "1px solid rgba(167,139,250,0.18)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-4 pb-1 flex-shrink-0">
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Header */}
            <div
              className="px-6 pt-5 pb-6 relative flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <X className="w-4 h-4" style={{ color: "rgba(200,185,255,0.65)" }} />
              </button>

              <div className="flex justify-center mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(167,139,250,0.06)",
                    border: "1px solid rgba(167,139,250,0.18)",
                  }}
                >
                  <Crown className="w-6 h-6" style={{ color: "#a78bfa" }} />
                </div>
              </div>

              <h2
                className="text-xl font-bold text-center"
                style={{ color: "#f3f0ff" }}
              >
                Débloque l'accès Premium
              </h2>
              <p
                className="text-xs text-center font-medium mt-1"
                style={{ color: "rgba(200,185,255,0.65)" }}
              >
                GlowScan AI &amp; Scan Nutritionnel
              </p>
            </div>

            {/* Corps défilant */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">

              {/* Prix */}
              <div
                className="rounded-2xl p-4 text-center relative overflow-hidden"
                style={{
                  background: "rgba(167,139,250,0.06)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: 24,
                }}
              >
                <div
                  className="absolute top-0 right-0 text-[8px] font-extrabold px-2.5 py-1 rounded-bl-xl tracking-widest"
                  style={{
                    background: "rgba(167,139,250,0.15)",
                    border: "1px solid rgba(167,139,250,0.3)",
                    borderRadius: 8,
                    color: "#c4b5fd",
                  }}
                >
                  Offre de lancement
                </div>
                <p
                  className="text-xs font-medium tracking-wide"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Accès privé unique
                </p>
                <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl font-extrabold" style={{ color: "#f3f0ff" }}>
                    {PREMIUM_PRICE.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "#f3f0ff" }}>FCFA</span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 ml-1"
                    style={{
                      color: "#c4b5fd",
                      background: "rgba(167,139,250,0.15)",
                      border: "1px solid rgba(167,139,250,0.3)",
                      borderRadius: 8,
                    }}
                  >
                    /mois
                  </span>
                </div>
                <p
                  className="text-[10px] mt-1.5 font-medium"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Paye une seule fois, utilise ces outils avancés sans limite pour toujours. Aucun abonnement caché.
                </p>
              </div>

              {/* Bénéfices */}
              <div className="space-y-2.5">
                <p
                  className="text-[10px] font-bold tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Ce que tu débloques immédiatement :
                </p>

                {[
                  { icon: Bot, text: "GlowScan AI : Ton coach personnel anti-boutons disponible 24h/24" },
                  { icon: Sparkles, text: "Le Scan Nutritionnel : Découvre l'impact direct de ton alimentation sur tes imperfections" },
                  { icon: Zap, text: "Adaptation intelligente de tes conseils selon la météo et l'humidité locale" },
                  { icon: ShieldCheck, text: "Suivi d'évolution rigoureux et analyse comparative de tes boutons à J+7" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-start gap-3 p-3 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "rgba(167,139,250,0.06)",
                        border: "1px solid rgba(167,139,250,0.18)",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                    </div>
                    <p
                      className="text-xs font-medium leading-snug"
                      style={{ color: "rgba(200,185,255,0.65)" }}
                    >
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Comptes Mobile Money */}
              <div
                className="rounded-2xl p-4 space-y-2.5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 24,
                }}
              >
                <p
                  className="text-[10px] font-bold tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Comptes de dépôt officiels GlowScan :
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{
                      background: "rgba(167,139,250,0.06)",
                      border: "1px solid rgba(167,139,250,0.18)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟠</span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "rgba(200,185,255,0.65)" }}
                      >
                        Orange Money
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-1"
                      style={{
                        color: "#c4b5fd",
                        background: "rgba(167,139,250,0.15)",
                        border: "1px solid rgba(167,139,250,0.3)",
                        borderRadius: 8,
                      }}
                    >
                      674 37 79 59
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{
                      background: "rgba(167,139,250,0.06)",
                      border: "1px solid rgba(167,139,250,0.18)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟡</span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "rgba(200,185,255,0.65)" }}
                      >
                        MTN MoMo
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-1"
                      style={{
                        color: "#c4b5fd",
                        background: "rgba(167,139,250,0.15)",
                        border: "1px solid rgba(167,139,250,0.3)",
                        borderRadius: 8,
                      }}
                    >
                      674 37 79 59
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div
              className="px-6 pb-8 pt-4 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                onClick={handleWhatsApp}
                disabled={loading}
                data-testid="button-upgrade-whatsapp"
                className="w-full text-white font-extrabold text-sm py-4 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
                  borderRadius: 12,
                }}
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                {loading ? "Ouverture de WhatsApp…" : "Activer mon abonnement — 2 000 FCFA/mois"}
              </button>
              <p
                className="text-[10px] text-center mt-2.5 font-medium"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Envoie ton reçu par WhatsApp — Activation validée par notre équipe en 5 min.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
