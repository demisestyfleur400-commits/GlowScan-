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

  return (
    <>
      <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="card-privacy-settings">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E91E8C, #8b5cf6)" }}>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Mes données & confidentialité</h3>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Conforme RGPD & loi camerounaise</p>
          </div>
        </div>

        <div className="space-y-2">
          <Link href="/confidentialite">
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.99] transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="link-privacy">
              <span className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>Politique de confidentialité</span>
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
            </button>
          </Link>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.99] transition-all disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
            data-testid="button-export-data"
          >
            <span className="flex items-center gap-3">
              {isExporting
                ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                : <Download className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
              }
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>Exporter mes données (JSON)</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.99] transition-all"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
            data-testid="button-open-delete-account"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="w-4 h-4" style={{ color: "#f43f5e" }} />
              <span className="text-sm font-bold" style={{ color: "#f43f5e" }}>Supprimer mon compte</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(244,63,94,0.5)" }} />
          </button>
        </div>
      </div>

      {/* Modale suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center backdrop-blur-sm px-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
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
              className="rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
              style={{ background: "#0D0A0E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)" }}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center mb-4 -mt-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)" }}>
                  <AlertTriangle className="w-6 h-6" style={{ color: "#f43f5e" }} />
                </div>
                <div className="flex-1">
                  <h2 id="delete-modal-title" className="text-base font-black text-white leading-tight">
                    Supprimer définitivement ton compte ?
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Cette action est irréversible</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                <p>Tu vas perdre <strong className="text-white">définitivement</strong> :</p>
                <ul className="list-disc ml-5 space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <li>Ton profil, ton email, ton mot de passe</li>
                  <li>Tous tes scans et diagnostics</li>
                  <li>Ta routine, ton historique bien-être, tes points de fidélité</li>
                  <li>Tes commandes et leur historique</li>
                  <li>Toutes tes sessions actives (déconnexion sur tous tes appareils)</li>
                  <li>Ton abonnement Premium éventuel (sans remboursement automatique)</li>
                </ul>
                <p className="text-xs italic mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Astuce : pense à <strong className="text-white">exporter tes données</strong> avant si tu veux les conserver.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Pour confirmer, tape <span className="font-mono" style={{ color: "#f43f5e" }}>SUPPRIMER</span> ci-dessous :
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-bold tracking-wider focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${confirmText === "SUPPRIMER" ? "rgba(244,63,94,0.5)" : "rgba(255,255,255,0.1)"}`, color: "rgba(255,255,255,0.8)" }}
                  data-testid="input-confirm-delete"
                  disabled={isDeleting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== "SUPPRIMER" || isDeleting}
                  className="w-full py-3 rounded-2xl text-white font-black text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}
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
