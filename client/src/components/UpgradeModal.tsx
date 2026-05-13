import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Zap, Infinity, Star, MessageCircle, CheckCircle2 } from "lucide-react";

const ADMIN_WHATSAPP = "+237674377959";

const PLANS = [
  {
    id: "weekly",
    label: "Hebdomadaire",
    price: 500,
    period: "semaine",
    tag: null,
    color: "border-gray-200",
    highlight: false,
  },
  {
    id: "monthly",
    label: "Mensuel",
    price: 2000,
    period: "mois",
    tag: "Meilleur rapport",
    color: "border-pink-500",
    highlight: true,
  },
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scansThisMonth?: number;
  scansLimit?: number;
}

export function UpgradeModal({ isOpen, onClose, scansThisMonth = 1, scansLimit = 1 }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("monthly");
  const plan = PLANS.find(p => p.id === selectedPlan)!;

  const handleWhatsApp = () => {
    const periodLabel = selectedPlan === "weekly" ? "semaine" : "mois";
    const text = `🌟 Bonjour ! Je souhaite activer GlowScan Premium.\n\n💳 *Formule :* ${plan.label} — ${plan.price.toLocaleString()} FCFA / ${periodLabel}\n📲 *Paiement :* Orange Money ou MTN MoMo au *674 37 79 59*\n\nJe vous envoie la capture d'écran du paiement.\n\nMerci !`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div className="bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 px-6 pt-8 pb-10 relative">
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center justify-center mb-3">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Crown className="w-9 h-9 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-white text-center">GlowScan Premium</h2>
              <p className="text-white/80 text-sm text-center mt-1">Tu as utilisé tes {scansLimit} analyses gratuites ce mois</p>
            </div>

            {/* Sélecteur de plan */}
            <div className="-mt-5 mx-6 mb-5">
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id as "weekly" | "monthly")}
                    data-testid={`plan-${p.id}`}
                    className={`relative rounded-2xl border-2 p-3.5 text-left transition-all ${
                      selectedPlan === p.id
                        ? p.highlight
                          ? "border-pink-500 bg-pink-50 shadow-lg shadow-pink-100"
                          : "border-pink-400 bg-pink-50 shadow-md"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    {p.tag && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                        {p.tag}
                      </span>
                    )}
                    <p className="text-[10px] font-bold text-gray-500 mb-1">{p.label}</p>
                    <p className={`text-xl font-black leading-none ${selectedPlan === p.id && p.highlight ? "text-pink-700" : "text-gray-900"}`}>
                      {p.price.toLocaleString()}
                      <span className="text-xs font-bold text-gray-400 ml-0.5">FCFA</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">/{p.period}</p>
                    {selectedPlan === p.id && (
                      <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center ${p.highlight ? "bg-pink-500" : "bg-pink-500"}`}>
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Avantages */}
            <div className="px-6 space-y-3 mb-5">
              {[
                { icon: Zap, text: "Analyses illimitées", color: "text-pink-500" },
                { icon: Star, text: "+100 points de fidélité offerts", color: "text-violet-500" },
                { icon: CheckCircle2, text: "Historique complet de tes scans", color: "text-pink-500" },
                { icon: Infinity, text: "Routine & produits personnalisés", color: "text-pink-500" },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{text}</span>
                </div>
              ))}
            </div>

            {/* Instructions paiement */}
            <div className="mx-6 mb-4 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-600 mb-2">Comment payer :</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🟠</span>
                  <span className="text-xs text-gray-600"><span className="font-semibold">Orange Money</span> → 674 37 79 59</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🟡</span>
                  <span className="text-xs text-gray-600"><span className="font-semibold">MTN MoMo</span> → 674 37 79 59</span>
                </div>
              </div>
            </div>

            {/* CTA WhatsApp */}
            <div className="px-6 pb-8">
              <button
                onClick={handleWhatsApp}
                data-testid="button-upgrade-whatsapp"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-green-200"
              >
                <MessageCircle className="w-5 h-5" />
                Confirmer {plan.price.toLocaleString()} FCFA via WhatsApp
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Envoie le reçu de paiement → compte activé en moins de 5 min ⚡
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
