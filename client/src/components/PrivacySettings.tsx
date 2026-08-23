import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ShieldCheck, Download, Trash2, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export function PrivacySettings() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  // Consentement dataset (séparé du consentement d'usage)
  const [datasetConsent, setDatasetConsent] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/me/dataset-consent", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { consent: false })
      .then((d) => setDatasetConsent(!!d.consent))
      .catch(() => setDatasetConsent(false));
  }, []);
  const toggleDatasetConsent = async () => {
    const next = !datasetConsent;
    setDatasetConsent(next);
    try {
      await fetch("/api/me/dataset-consent", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ consent: next }),
      });
    } catch { setDatasetConsent(!next); }
  };

  useEffect(() => {
    if (!showDeleteModal) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "Esc") && !isDeleting) {
        e.preventDefault();
        setShowDeleteModal(false);
        setConfirmText("");
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [showDeleteModal, isDeleting]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/user/me/export", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `glowscan-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export téléchargé", description: "Tes données sont dans le fichier JSON téléchargé." });
    } catch {
      toast({ title: "Export impossible", description: "Une erreur est survenue. Réessaie ou contacte le support.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "SUPPRIMER") return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: "SUPPRIMER" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || `HTTP ${res.status}`);
      }
      toast({ title: "Compte supprimé", description: "Toutes tes données ont été effacées définitivement. À bientôt." });
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (err: any) {
      toast({ title: "Suppression impossible", description: err?.message || "Réessaie ou contacte le support.", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const ds = {
    font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  };

  return (
    <>
      <div
        className="rounded-2xl p-5 mb-6"
        style={{
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.18)",
          borderRadius: 24,
          fontFamily: ds.font,
        }}
        data-testid="card-privacy-settings"
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(167,139,250,0.06)",
              border: "1px solid rgba(167,139,250,0.18)",
            }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "#f3f0ff" }}>
              Mes données &amp; confidentialité
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Conforme RGPD &amp; loi camerounaise
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Link href="/confidentialite">
            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.99] transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              data-testid="link-privacy"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" style={{ color: "#a78bfa" }} />
                <span className="text-sm font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>
                  Politique de confidentialité
                </span>
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} />
            </button>
          </Link>

          {/* Consentement dataset (opt-in séparé) */}
          <div
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="flex items-start gap-3 pr-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
              <span>
                <span className="text-sm font-medium block" style={{ color: "rgba(200,185,255,0.65)" }}>
                  Aider à améliorer l'IA GlowScan
                </span>
                <span className="text-[10px] block mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Autoriser l'usage de mes images anonymisées. Facultatif, révocable à tout moment.
                </span>
              </span>
            </span>
            <button
              role="switch"
              aria-checked={datasetConsent === true}
              onClick={toggleDatasetConsent}
              data-testid="toggle-dataset-consent"
              className="flex-shrink-0 rounded-full transition-all"
              style={{
                width: 42, height: 24, padding: 3,
                background: datasetConsent ? "#2f9e6e" : "rgba(255,255,255,0.15)",
                display: "flex", justifyContent: datasetConsent ? "flex-end" : "flex-start",
                cursor: "pointer", border: "none",
              }}
            >
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
            </button>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.99] transition-all disabled:opacity-60"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            data-testid="button-export-data"
          >
            <span className="flex items-center gap-3">
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#a78bfa" }} />
              ) : (
                <Download className="w-4 h-4" style={{ color: "#a78bfa" }} />
              )}
              <span className="text-sm font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>
                Exporter mes données (JSON)
              </span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.99] transition-all"
            style={{
              background: "rgba(233,30,140,0.08)",
              border: "1px solid rgba(233,30,140,0.2)",
            }}
            data-testid="button-open-delete-account"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="w-4 h-4" style={{ color: "#f9a8d4" }} />
              <span className="text-sm font-medium" style={{ color: "#f9a8d4" }}>
                Supprimer mon compte
              </span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(249,168,212,0.5)" }} />
          </button>
        </div>
      </div>

      {/* Modale suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && setShowDeleteModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            data-testid="modal-delete-account"
          >
            <motion.div
              className="w-full max-w-md p-6"
              style={{
                background: "#13101f",
                border: "1px solid rgba(233,30,140,0.2)",
                borderRadius: 28,
                fontFamily: ds.font,
              }}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
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

              <div className="flex items-start gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(233,30,140,0.08)",
                    border: "1px solid rgba(233,30,140,0.2)",
                  }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: "#f9a8d4" }} />
                </div>
                <div className="flex-1">
                  <h2
                    id="delete-modal-title"
                    className="text-base font-bold leading-tight"
                    style={{ color: "#f3f0ff" }}
                  >
                    Supprimer définitivement ton compte ?
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Cette action est irréversible
                  </p>
                </div>
              </div>

              <div
                className="space-y-2 text-sm mb-5"
                style={{ color: "rgba(200,185,255,0.65)" }}
              >
                <p>
                  Tu vas perdre{" "}
                  <strong style={{ color: "#f3f0ff", fontWeight: 700 }}>définitivement</strong> :
                </p>
                <ul
                  className="list-disc ml-5 space-y-1 text-xs"
                  style={{ color: "rgba(200,185,255,0.65)" }}
                >
                  <li>Ton profil, ton email, ton mot de passe</li>
                  <li>Tous tes scans et diagnostics</li>
                  <li>Ta routine, ton historique bien-être, tes points de fidélité</li>
                  <li>Tes commandes et leur historique</li>
                  <li>Toutes tes sessions actives (déconnexion sur tous tes appareils)</li>
                  <li>Ton abonnement Premium éventuel (sans remboursement automatique)</li>
                </ul>
                <p className="text-xs italic mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Astuce : pense à{" "}
                  <strong style={{ color: "#f3f0ff", fontWeight: 700 }}>exporter tes données</strong>{" "}
                  avant si tu veux les conserver.
                </p>
              </div>

              <div className="mb-5">
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "rgba(200,185,255,0.65)" }}
                >
                  Pour confirmer, tape{" "}
                  <span className="font-mono font-bold" style={{ color: "#f9a8d4" }}>
                    SUPPRIMER
                  </span>{" "}
                  ci-dessous :
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full px-4 py-2.5 text-sm font-bold tracking-wider focus:outline-none transition-colors"
                  style={{
                    background: "#13101f",
                    border: `1px solid ${confirmText === "SUPPRIMER" ? "rgba(233,30,140,0.4)" : "rgba(167,139,250,0.2)"}`,
                    borderRadius: 12,
                    color: "#f3f0ff",
                  }}
                  data-testid="input-confirm-delete"
                  disabled={isDeleting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== "SUPPRIMER" || isDeleting}
                  className="w-full py-3 text-white font-extrabold text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
                    borderRadius: 12,
                  }}
                  data-testid="button-confirm-delete"
                >
                  {isDeleting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Oui, supprimer mon compte</>
                  )}
                </button>
                <button
                  onClick={() => { setShowDeleteModal(false); setConfirmText(""); }}
                  disabled={isDeleting}
                  className="w-full py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  data-testid="button-cancel-delete"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
