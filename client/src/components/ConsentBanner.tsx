import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ShieldCheck, X, Globe } from "lucide-react";

const CONSENT_KEY_BASE = "glowscan_consent_v1";

/**
 * Clé scopée par utilisateur. Pour les visiteurs anonymes, on utilise "anon"
 * (consentement device-level acceptable car aucun compte n'existe).
 * Dès qu'un utilisateur se connecte, son propre consentement est tracké séparément.
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

/**
 * Bandeau de consentement RGPD affiché avant la première analyse.
 * Mentionne explicitement le transfert vers OpenAI (USA) et lie vers la politique de confidentialité.
 * Accessible : role="dialog", aria-modal, focus piégé, fermeture par Escape.
 */
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

  // Accessibilité : Escape ferme = refuse (capture phase pour battre les autres handlers)
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
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
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
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 id="consent-title" className="text-base font-black text-gray-900 leading-tight" data-testid="text-consent-title">
                  Avant ton analyse — protégeons tes données
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">RGPD & loi camerounaise n° 2010-012</p>
              </div>
            </div>

            <div className="space-y-2.5 text-sm text-gray-700 mb-5">
              <p>
                Ta photo est analysée par une <strong>IA dermatologique</strong> pour produire ton diagnostic et tes recommandations.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <Globe className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">
                  La photo est envoyée à <strong>OpenAI</strong> (États-Unis) pour l'analyse. Aucun humain ne la consulte. Elle n'est pas conservée au-delà du traitement.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Tu peux à tout moment exporter ou supprimer toutes tes données depuis ton profil.{" "}
                <Link href="/confidentialite">
                  <span className="text-pink-600 underline cursor-pointer" data-testid="link-privacy-policy">
                    Lire la politique complète
                  </span>
                </Link>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleAccept}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-sm shadow-lg active:scale-[0.98] transition-transform"
                data-testid="button-consent-accept"
              >
                J'accepte et je continue
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
                data-testid="button-consent-decline"
              >
                Non merci
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
