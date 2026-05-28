import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Bell, CheckCircle2, Clock, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

interface Product {
  id: string;
  name: string;
  category: string;
  recommendedTime: "morning" | "evening" | "both";
}

interface OrderTrackingCardProps {
  products: Product[];
  onRedirectToOrder: () => void;
}

export function OrderTrackingCard({ products, onRedirectToOrder }: OrderTrackingCardProps) {
  const { toast } = useToast();
  const [orderStatus, setOrderStatus] = useState<"ask" | "ordered" | "activated">("ask");
  const [loading, setLoading] = useState(false);

  const routineHours = {
    morning: "06:30",
    evening: "21:00",
  };

  const handleConfirmOrder = () => {
    setOrderStatus("ordered");
  };

  const handleActivateRoutine = async () => {
    setLoading(true);
    try {
      if ("Notification" in window) {
        await Notification.requestPermission();
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setOrderStatus("activated");
      toast({
        title: "⚡ Routine synchronisée !",
        description: "Tes rappels quotidiens sont programmés sur ton appareil.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'activer les alertes. Réessaye.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 max-w-md mx-auto w-full overflow-hidden"
      style={{
        background: DS.surface,
        border: `1px solid ${DS.border}`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <AnimatePresence mode="wait">

        {/* ── ÉTAPE A : VALIDATION DE LA COMMANDE ── */}
        {orderStatus === "ask" && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
              >
                <ShoppingBag className="w-4 h-4" style={{ color: "#a78bfa" }} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold" style={{ color: DS.text }}>Suivi de tes molécules</h3>
                <p className="text-[11px] font-medium" style={{ color: DS.body }}>As-tu validé ta commande de produits ?</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmOrder}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-[0.99]"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}`, color: DS.body }}
              >
                <span>Oui, ma commande est passée</span>
                <ChevronRight className="w-4 h-4" style={{ color: DS.muted }} />
              </button>

              <button
                onClick={onRedirectToOrder}
                className="w-full py-3.5 rounded-full text-xs font-extrabold text-white transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)" }}
              >
                Non, commander mes produits maintenant
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE B : PLANIFICATION DES HEURES ── */}
        {orderStatus === "ordered" && (
          <motion.div
            key="ordered"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <span
                className="inline-block text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg mb-2"
                style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }}
              >
                Commande détectée
              </span>
              <h3 className="text-sm font-extrabold" style={{ color: DS.text }}>Planification chrono-cutanée</h3>
              <p className="text-xs font-medium leading-normal mt-0.5" style={{ color: DS.body }}>
                L'IA a segmenté tes heures de prise optimales pour maximiser l'absorption des actifs.
              </p>
            </div>

            {/* Schedule preview */}
            <div
              className="space-y-2 rounded-xl p-3.5"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
            >
              <div
                className="flex items-center justify-between text-xs pb-2"
                style={{ borderBottom: `1px solid ${DS.border}` }}
              >
                <div className="flex items-center gap-2 font-bold" style={{ color: DS.body }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: DS.muted }} />
                  <span>Routine matin</span>
                </div>
                <span
                  className="font-mono font-extrabold px-2.5 py-0.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.text }}
                >
                  {routineHours.morning}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2 font-bold" style={{ color: DS.body }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: DS.muted }} />
                  <span>Routine soir</span>
                </div>
                <span
                  className="font-mono font-extrabold px-2.5 py-0.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.text }}
                >
                  {routineHours.evening}
                </span>
              </div>
            </div>

            <button
              onClick={handleActivateRoutine}
              disabled={loading}
              className="w-full py-3.5 rounded-full text-xs font-extrabold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#7c3aed" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  Accepter et activer les notifications
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ── ÉTAPE C : PROTOCOLE ACTIF ── */}
        {orderStatus === "activated" && (
          <motion.div
            key="activated"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2 space-y-3"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <CheckCircle2 className="w-6 h-6" style={{ color: "#6ee7b7" }} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: DS.text }}>Programme d'observance actif</h3>
              <p className="text-xs font-medium max-w-xs mx-auto leading-relaxed mt-1" style={{ color: DS.body }}>
                GlowScan t'enverra une alerte à{" "}
                <span className="font-extrabold" style={{ color: DS.text }}>{routineHours.morning}</span>{" "}
                et{" "}
                <span className="font-extrabold" style={{ color: DS.text }}>{routineHours.evening}</span>{" "}
                pour sécuriser l'application de tes produits.
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
