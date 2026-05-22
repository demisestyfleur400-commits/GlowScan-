import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleStart = () => {
    if (user) {
      setLocation("/");
    } else {
      setLocation("/auth");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between px-6 py-16 overflow-hidden relative">
      {/* Matrice de lumière clinique subtile en arrière-plan */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(37, 99, 235, 0.08) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* Zone de marquage réglementaire supérieure */}
      <div className="w-full max-w-sm flex justify-between items-center opacity-40 relative z-10">
        <span className="text-[9px] font-black tracking-widest uppercase font-display">GlowScan v2.1</span>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span className="text-[9px] font-black tracking-widest uppercase font-display">Secure Core</span>
        </div>
      </div>

      {/* ── Bloc Central : Identité Technologique ── */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full max-w-sm">
        
        {/* Logo Container Style Clinique */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl pointer-events-none" />
          <div className="bg-white rounded-2xl p-4 border border-slate-800 shadow-2xl relative z-10" data-testid="logo-glowscan">
            <img
              src="/logo-glowscan.jpeg"
              alt="GlowScan Core"
              className="h-20 md:h-24 w-auto object-contain"
            />
          </div>
        </motion.div>

        {/* Titre Principal */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl font-black uppercase tracking-tight text-white mb-3 font-display"
          data-testid="text-welcome"
        >
          Analyseur Cutané IA
        </motion.h1>

        {/* Tagline / Mission de la startup */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xs md:text-sm text-slate-400 font-medium max-w-xs leading-relaxed"
          data-testid="text-tagline"
        >
          Imagerie faciale algorithmique et protocoles sur-mesure pour les peaux d'Afrique centrale.
        </motion.p>
      </div>

      {/* ── Bloc Inférieur : Action & Signature de Marque ── */}
      <div className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10">
        
        {/* Bouton d'entrée unifié utilisant tes primitives */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="w-full"
        >
          <Button
            onClick={handleStart}
            data-testid="button-commencer"
            variant="premium"
            size="lg"
            className="w-full py-6 text-xs uppercase tracking-widest font-black"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Initialiser le diagnostic
          </Button>
        </motion.div>

        {/* Signature Institutionnelle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col items-center gap-1 text-center"
        >
          <span
            className="text-[9px] text-slate-500 font-black tracking-widest uppercase font-display"
          >
            Infrastructure Déployée à Douala
          </span>
          <span
            className="text-[10px] text-slate-300 font-bold tracking-wide font-display"
            data-testid="text-founder"
          >
            Démise Essawe · Fondateur
          </span>
        </motion.div>
      </div>
    </div>
  );
}
