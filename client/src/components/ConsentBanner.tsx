import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ShieldCheck, Globe, Lock } from "lucide-react";

const CONSENT_KEY_BASE = "glowscan_consent_v1";
// Version de la politique de confidentialité acceptée (à incrémenter si la politique change).
export const PRIVACY_POLICY_VERSION = "2026-09-07";

// Choix explicite de contribution au dataset de recherche anonymisé (true = accepté).
export function getDatasetConsent(userId?: string | null): boolean {
  try { return localStorage.getItem(`${consentKey(userId)}_dataset`) === "yes"; } catch { return false; }
}
function setDatasetConsent(accepted: boolean, userId?: string | null) {
  try {
    localStorage.setItem(`${consentKey(userId)}_dataset`, accepted ? "yes" : "no");
    localStorage.setItem(`${consentKey(userId)}_dataset_at`, new Date().toISOString());
    localStorage.setItem(`${consentKey(userId)}_dataset_ver`, PRIVACY_POLICY_VERSION);
  } catch {}
}

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
  onAccept: (datasetConsent: boolean) => void; // datasetConsent = contribution recherche
  onDecline?: () => void;
  userId?: string | null;
}

export function ConsentBanner({ onAccept, onDecline, userId }: ConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  // Consentement au traitement (requis pour analyser) + choix explicite de
  // contribution au dataset de recherche. Le REFUS de contribuer ne bloque PAS
  // l'analyse : seule la contribution change.
  const proceed = (datasetConsent: boolean) => {
    setUserConsent("accepted", userId);
    setDatasetConsent(datasetConsent, userId);
    setVisible(false);
    setTimeout(() => onAccept(datasetConsent), 200);
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
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          data-testid="consent-banner"
        >
          <motion.div
            className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-6"
            style={{
              background: "#13101f",
              border: "1px solid rgba(167,139,250,0.18)",
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-5 -mt-1">
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
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(167,139,250,0.06)",
                  border: "1px solid rgba(167,139,250,0.18)",
                }}
              >
                <ShieldCheck className="w-5 h-5" style={{ color: "#a78bfa" }} />
              </div>
              <div className="flex-1">
                <h2
                  id="consent-title"
                  className="text-sm font-bold leading-tight"
                  style={{ color: "#f3f0ff" }}
                  data-testid="text-consent-title"
                >
                  Respect de ta vie privée
                </h2>
                <p
                  className="text-[11px] font-medium mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Loi camerounaise n° 2010-012 &amp; RGPD
                </p>
              </div>
            </div>

            {/* Contenu */}
            <div
              className="space-y-3 text-xs mb-5 leading-relaxed"
              style={{ color: "rgba(200,185,255,0.65)" }}
            >
              <p>
                Ta photo est analysée de manière strictement confidentielle par notre technologie de{" "}
                <strong style={{ color: "#f3f0ff", fontWeight: 700 }}>
                  cartographie faciale GlowScan AI
                </strong>{" "}
                pour générer ton score et ta routine de soins.
              </p>

              <div
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#6ee7b7" }} />
                <p
                  className="text-[11px] leading-normal"
                  style={{ color: "#6ee7b7" }}
                >
                  Sécurisé : ta photo est conservée de façon chiffrée et à accès restreint pour ton suivi.
                  Aucun humain ne la consulte hors d'une consultation que tu demandes. Tu peux la supprimer à tout moment.
                </p>
              </div>

              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}
              >
                <p className="text-[11px] leading-normal" style={{ color: "rgba(200,185,255,0.85)" }}>
                  <strong style={{ color: "#f3f0ff" }}>Aider la recherche (optionnel).</strong> Ta photo <strong>anonymisée</strong> (sans nom, sans localisation) peut servir à améliorer l'IA pour les peaux africaines. C'est <strong>ton choix</strong> — le refus ne change rien à ton analyse.
                </p>
              </div>

              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                Tu gardes le contrôle total. Tu peux exporter ou supprimer définitivement tes données
                à tout moment depuis ton profil.{" "}
                <Link href="/confidentialite">
                  <span
                    className="font-bold underline cursor-pointer"
                    style={{ color: "#c4b5fd" }}
                    data-testid="link-privacy-policy"
                  >
                    Lire notre politique de confidentialité
                  </span>
                </Link>
              </p>
            </div>

            {/* Boutons CTA — deux vrais choix, les deux lancent l'analyse */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => proceed(true)}
                className="w-full py-3.5 text-white font-extrabold text-sm active:scale-[0.98] transition-transform"
                style={{
                  background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
                  borderRadius: 12,
                }}
                data-testid="button-consent-accept"
              >
                J'accepte et j'aide la recherche
              </button>
              <button
                onClick={() => proceed(false)}
                className="w-full py-3 text-sm font-extrabold active:scale-[0.98] transition-transform"
                style={{ color: "#f3f0ff", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}
                data-testid="button-consent-analyze-only"
              >
                Analyser sans partager pour la recherche
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-2 text-xs font-bold transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
                data-testid="button-consent-decline"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
