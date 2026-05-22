import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Bell, CheckCircle2, Clock, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  category: string; // ex: "Nettoyant", "Sérum", "Crème"
  recommendedTime: "morning" | "evening" | "both";
}

interface OrderTrackingCardProps {
  products: Product[];
  onRedirectToOrder: () => void; // Fonction qui gère la redirection vers la commande directe
}

export function OrderTrackingCard({ products, onRedirectToOrder }: OrderTrackingCardProps) {
  const { toast } = useToast();
  const [orderStatus, setOrderStatus] = useState<"ask" | "ordered" | "activated">("ask");
  const [loading, setLoading] = useState(false);

  // Heures par défaut pour les soins en Afrique Centrale
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
      // 1. Demande de permission pour les notifications de l'appareil (PWA Friendly)
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Notifications bloquées par l'utilisateur");
        }
      }

      // 2. Simulation d'enregistrement de la routine dans la base de données locale/API
      // Ici tu pourras faire ton fetch pour mettre à jour la table routine de l'utilisateur
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setOrderStatus("activated");
      toast({
        title: "⚡ Routine synchronisée !",
        description: "Tes rappels quotidiens sont programmés sur ton appareil.",
      });
    } catch (err) {
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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs max-w-md mx-auto w-full overflow-hidden relative">
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
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-white text-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Suivi de tes Molécules</h3>
                <p className="text-[11px] text-slate-400 font-medium">As-tu validé ta commande de produits ?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <Button 
                onClick={handleConfirmOrder} 
                variant="outline" 
                className="w-full justify-between text-xs font-bold py-5 border-slate-200 hover:border-slate-950 text-slate-900"
              >
                <span>Oui, ma commande est passée</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Button>

              <Button 
                onClick={onRedirectToOrder} 
                variant="premium" 
                className="w-full py-5 text-xs font-black uppercase tracking-widest"
              >
                Non, commander mes produits maintenant
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE B : PLANIFICATION DES HEURES ET RAPPELS ── */}
        {orderStatus === "ordered" && (
          <motion.div
            key="ordered"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/10 border-0 text-[9px] font-black tracking-widest py-0.5 uppercase mb-1.5">
                Commande Détectée
              </Badge>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Planification Chrono-Cutanée</h3>
              <p className="text-xs text-slate-400 font-medium leading-normal">
                L'IA a segmenté tes heures de prise optimales pour maximiser l'absorption des actifs.
              </p>
            </div>

            {/* Aperçu des heures de traitement */}
            <div className="space-y-2 bg-slate-50 border border-slate-200/60 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Routine Matin</span>
                </div>
                <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{routineHours.morning}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Routine Soir</span>
                </div>
                <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{routineHours.evening}</span>
              </div>
            </div>

            <Button 
              onClick={handleActivateRoutine}
              disabled={loading}
              variant="premium" 
              className="w-full py-5 text-xs font-black uppercase tracking-widest"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Accepter et activer les notifications
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* ── ÉTAPE C : PROTOCOLE STRUCTURÉ ET ACTIF ── */}
        {orderStatus === "activated" && (
          <motion.div
            key="activated"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2 space-y-3"
          >
            <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Programme d'observance actif</h3>
              <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed mt-1">
                GlowScan t'enverra une alerte quotidienne à <span className="font-bold text-slate-900">{routineHours.morning}</span> et <span className="font-bold text-slate-900">{routineHours.evening}</span> pour sécuriser l'application de tes produits.
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
