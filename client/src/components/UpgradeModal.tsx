import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, Star, Check, ArrowRight } from "lucide-react";
import { PREMIUM_PERKS, PREMIUM_PLANS } from "@shared/premium";
import { formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Quota d'analyses gratuites atteint → GlowScan Plus. Mêmes avantages et
// mêmes prix que la page Plus (shared/premium) ; le paiement se fait sur la
// page Plus (numéros officiels, suivi de la demande jusqu'à l'activation).
// ════════════════════════════════════════════════════════════════════════

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scansThisMonth?: number;
  scansLimit?: number;
}

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", lime: "#cfe08a" };

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [, setLocation] = useLocation();
  const goPlus = () => { onClose(); setLocation("/premium"); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ background: "rgba(13,38,32,0.55)", backdropFilter: "blur(6px)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
          onClick={onClose}
          role="dialog" aria-modal="true" aria-labelledby="upgrade-title"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="flex max-h-[95vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[24px] sm:rounded-[24px]"
            style={{ background: "#ffffff", border: `1px solid ${G.line}`, color: G.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pb-1 pt-3"><span style={{ width: 40, height: 4, borderRadius: 999, background: G.line }} /></div>

            <div className="relative flex flex-col gap-2 px-6 pb-4 pt-3">
              <button type="button" onClick={onClose} aria-label="Fermer"
                className="absolute right-4 top-1 flex h-8 w-8 items-center justify-center rounded-full border-0" style={{ background: G.sage, color: G.dark }}>
                <X className="h-4 w-4" />
              </button>
              <span className="self-start rounded-pill px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em]" style={{ background: G.sage, color: G.dark }}>Analyses gratuites utilisées</span>
              <h2 id="upgrade-title" className="m-0 text-[24px] font-bold leading-tight" style={{ fontFamily: "Manrope, 'DM Sans', sans-serif", color: G.text }}>
                Continuez avec<br />GlowScan Plus.
              </h2>
              <p className="m-0 text-[14px] leading-relaxed" style={{ color: G.muted }}>
                Vous avez utilisé vos analyses gratuites pour cette période. Plus vous permet de continuer sans limite.
              </p>
            </div>

            <div className="mx-6 flex flex-col gap-1.5 rounded-[18px] p-5 text-white" style={{ background: G.dark }}>
              <span className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[.1em] opacity-80">GlowScan Plus</span>
                <Star className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </span>
              <span className="flex items-baseline gap-1.5">
                <b className="text-[32px] font-bold leading-none" style={{ fontFamily: "Manrope, 'DM Sans', sans-serif" }}>{formatF(PREMIUM_PLANS.month.amountFcfa)}</b>
                <span className="text-[14px] opacity-80">/ mois</span>
              </span>
              <span className="text-[13px] opacity-85">ou {formatF(PREMIUM_PLANS.week.amountFcfa)} / semaine · sans engagement, sans renouvellement automatique</span>
            </div>

            <div className="flex flex-col gap-2.5 px-6 py-5">
              {PREMIUM_PERKS.map((t) => (
                <span key={t} className="flex items-start gap-2.5 text-[14px] leading-snug">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-pill" style={{ background: G.sage, color: G.dark }}><Check className="h-3 w-3" strokeWidth={3} /></span>
                  {t}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-2 px-6 pb-7">
              <button type="button" onClick={goPlus} data-testid="button-upgrade-plus"
                className="flex w-full items-center justify-center gap-2 rounded-[12px] border-0 py-4 text-[15px] font-semibold text-white" style={{ background: G.dark }}>
                Voir GlowScan Plus <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={onClose} className="border-0 bg-transparent py-2 text-[14px] font-semibold" style={{ color: G.muted }}>Plus tard</button>
              <span className="text-center text-[12px]" style={{ color: G.muted }}>Paiement Mobile Money sur la page Plus. Votre accès s'active dès la vérification.</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
