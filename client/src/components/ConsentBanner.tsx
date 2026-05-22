import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ShieldCheck, Globe, Lock } from "lucide-react";

const CONSENT_KEY_BASE = "glowscan_consent_v1";

/**
 * Clé scopée par utilisateur. Pour les visiteurs anonymes, on utilise "anon"
 */
function consentKey(userId: string | null | undefined): string {
  return `${CONSENT_KEY_BASE}_${userId || "anon"}`;
}

export function hasUserConsented(userId?: string | null): boolean {
  try {
    return localStorage.getItem(consentKey(userId)) === "accepted";
  } catch {
    return false;
  }
}

export function setUserConsent(value: "accepted" | "declined", userId?: string | null) {
  try {
    const key = consentKey(userId);
    localStorage.setItem(key, value);
    localStorage.setItem(`${key}_at`, new Date().toISOString());
  } catch {}
}

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline?: () => void;
  userId?: string | null;
}

export function ConsentBanner({ onAccept, onDecline, userId }: ConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleAccept = () => {
    setUserConsent("accepted", userId);
    setVisible(false);
    setTimeout(() => onAccept(), 200);
  };

  const handleDecline = () => {
    setUserConsent("declined", userId);
    setVisible(false);
    setTimeout(() => onDecline?.(), 200);
  };

  // Accessibilité : Escape ferme = refuse
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        handleDecline();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          data-testid="consent-banner"
        >
          <motion.div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0 border border-pink-100">
                <ShieldCheck className="w-5 h-5 text-pink-600" />
              </div>
              <div className="flex-1">
                <h2 id="consent-title" className="text-sm font-black text-gray-950 leading-tight uppercase tracking-wide" data-testid="text-consent-title">
                  Respect de ta vie privée
                </h2>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">Loi camerounaise n° 2010-012 & RGPD</p>
              </div>
            </div>

            {/* Contenu */}
            <div className="space-y-3 text-xs text-gray-700 mb-5 leading-relaxed font-medium">
              <p>
                Ta photo est analysée de manière strictement confidentielle par notre technologie de <strong>cartographie faciale GlowScan AI</strong> pour générer ton score et ta routine de soins.
              </p>
              
              {/* Bloc de réassurance vert (confidentialité) à la place du bloc orange OpenAI */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100/60">
                <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-950 font-semibold leading-normal">
                  Sécurisé & Anonyme : Aucun humain ne consulte ta photo. Elle est immédiatement supprimée après l'analyse et n'est jamais sauvegardée sans ton accord.
                </p>
              </div>
              
              <p className="text-[11px] text-gray-400 font-normal">
                Tu gardes le contrôle total. Tu peux exporter ou supprimer définitivement tes données à tout moment depuis ton profil.{" "}
                <Link href="/confidentialite">
                  <span className="text-pink-600 font-bold underline cursor-pointer" data-testid="link-privacy-policy">
                    Lire notre politique de confidentialité
                  </span>
                </Link>
              </p>
            </div>

            {/* Boutons CTA */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAccept}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-600/10 active:scale-[0.98] transition-transform"
                data-testid="button-consent-accept"
              >
                J'accepte, lancer l'analyse
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="button-consent-decline"
              >
                Plus tard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
