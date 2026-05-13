import { motion, AnimatePresence } from "framer-motion";
import { LogIn, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function ReconnectBanner() {
  const { user, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || user || dismissed) return null;

  let hadAccount = false;
  try { hadAccount = localStorage.getItem("glowscan_had_account") === "1"; } catch {}
  if (!hadAccount) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed top-0 left-0 right-0 z-50 bg-violet-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
        data-testid="reconnect-banner"
      >
        <LogIn className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1 text-sm font-semibold leading-snug">
          Tu as un compte — reconnecte-toi pour voir ta routine
        </p>
        <a
          href="/auth"
          data-testid="button-reconnect"
          className="bg-white text-violet-700 text-xs font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0"
        >
          Se connecter
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white flex-shrink-0"
          data-testid="button-dismiss-reconnect"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
