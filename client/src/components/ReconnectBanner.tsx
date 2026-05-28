import { motion, AnimatePresence } from "framer-motion";
import { CloudLightning, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function ReconnectBanner() {
  const { user, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || user || dismissed) return null;

  let hadAccount = false;
  try {
    hadAccount = localStorage.getItem("glowscan_had_account") === "1";
  } catch {}

  if (!hadAccount) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="fixed top-4 left-4 right-4 z-[260] max-w-md mx-auto"
        data-testid="reconnect-banner"
      >
        <div
          className="px-4 py-3.5 rounded-2xl flex items-center gap-3 relative overflow-hidden"
          style={{
            background: "#13101f",
            border: "1px solid rgba(167,139,250,0.2)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          }}
        >
          {/* Accent left strip */}
          <div
            className="absolute left-0 top-0 w-[3px] h-full rounded-l-2xl"
            style={{ background: "linear-gradient(to bottom, #7c3aed, #a78bfa)" }}
          />

          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-1"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <CloudLightning className="w-4 h-4" style={{ color: "#a78bfa" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                Synchronisation cloud
              </p>
              <ShieldCheck className="w-3 h-3" style={{ color: "#6ee7b7" }} />
            </div>
            <p className="text-xs font-medium mt-0.5 leading-normal" style={{ color: "rgba(200,185,255,0.65)" }}>
              Restaure ton historique d'analyses et tes objectifs de peau en un clic.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="/auth"
              data-testid="button-reconnect"
              className="text-[10px] font-extrabold px-3.5 py-2 rounded-full transition-all active:scale-95 text-white"
              style={{ background: "#7c3aed" }}
            >
              Synchroniser
            </a>

            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.3)" }}
              data-testid="button-dismiss-reconnect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
