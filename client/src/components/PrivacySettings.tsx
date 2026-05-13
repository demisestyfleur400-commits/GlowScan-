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

  // Accessibilité : Escape ferme la modale (sauf pendant la suppression).
  // Listener attaché au document en capture phase pour être déclenché avant
  // tout handler bloquant côté input/framer-motion.
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
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `glowscan-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Export téléchargé",
        description: "Tes données sont dans le fichier JSON téléchargé.",
      });
    } catch (err) {
      toast({
        title: "Export impossible",
        description: "Une erreur est survenue. Réessaie ou contacte le support.",
        variant: "destructive",
      });
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
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      toast({
        title: "Compte supprimé",
        description: "Toutes tes données ont été effacées définitivement. À bientôt.",
      });
      // Redirige vers l'accueil après un court délai
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err: any) {
      toast({
        title: "Suppression impossible",
        description: err?.message || "Réessaie ou contacte le support.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6" data-testid="card-privacy-settings">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Mes données & confidentialité</h3>
            <p className="text-[10px] text-gray-400">Conforme RGPD & loi camerounaise</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Politique de confidentialité */}
          <Link href="/confidentialite">
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition-all" data-testid="link-privacy">
              <span className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-700">Politique de confidentialité</span>
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </Link>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition-all disabled:opacity-60"
            data-testid="button-export-data"
          >
            <span className="flex items-center gap-3">
              {isExporting ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" /> : <Download className="w-4 h-4 text-gray-500" />}
              <span className="text-sm font-bold text-gray-700">Exporter mes données (JSON)</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {/* Supprimer compte */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-[0.99] transition-all"
            data-testid="button-open-delete-account"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="text-sm font-bold text-rose-700">Supprimer mon compte</span>
            </span>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Modale de confirmation suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
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
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h2 id="delete-modal-title" className="text-base font-black text-gray-900 leading-tight">
                    Supprimer définitivement ton compte ?
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Cette action est irréversible</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <p>Tu vas perdre <strong>définitivement</strong> :</p>
                <ul className="list-disc ml-5 space-y-1 text-xs text-gray-600">
                  <li>Ton profil, ton email, ton mot de passe</li>
                  <li>Tous tes scans et diagnostics</li>
                  <li>Ta routine, ton historique bien-être, tes points de fidélité</li>
                  <li>Tes commandes et leur historique</li>
                  <li>Toutes tes sessions actives (déconnexion sur tous tes appareils)</li>
                  <li>Ton abonnement Premium éventuel (sans remboursement automatique)</li>
                </ul>
                <p className="text-xs text-gray-500 italic mt-3">
                  Astuce : pense à <strong>exporter tes données</strong> avant si tu veux les conserver.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Pour confirmer, tape <span className="font-mono text-rose-600">SUPPRIMER</span> ci-dessous :
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-rose-400 focus:outline-none text-sm font-bold tracking-wider"
                  data-testid="input-confirm-delete"
                  disabled={isDeleting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== "SUPPRIMER" || isDeleting}
                  className="w-full py-3 rounded-2xl bg-rose-600 text-white font-black text-sm shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  className="w-full py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50"
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
