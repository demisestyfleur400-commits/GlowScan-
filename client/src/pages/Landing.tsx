import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleStart = () => {
    // Si déjà connecté → directement à l'accueil personnalisé
    // Sinon → page de connexion / création de compte
    if (user) {
      setLocation("/");
    } else {
      setLocation("/auth");
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-between px-6 py-16 overflow-hidden relative">
      {/* Halo subtil en arrière-plan */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      {/* ── Texte principal ── */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 gap-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-light tracking-wide"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.05em" }}
          data-testid="text-welcome"
        >
          Bienvenue
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 1.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="bg-white rounded-2xl p-3 shadow-2xl" data-testid="logo-glowscan">
            <img
              src="/logo-glowscan.jpeg"
              alt="GlowScan"
              className="h-24 md:h-28 w-auto object-contain"
            />
          </div>
          <p
            className="text-base md:text-lg text-white/70 font-light max-w-xs leading-relaxed"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            data-testid="text-tagline"
          >
            ton dermatologue personnel
          </p>
        </motion.div>
      </div>

      {/* ── Bouton + doigt animé ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 3.2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm"
      >
        <button
          onClick={handleStart}
          data-testid="button-commencer"
          className="w-full py-4 px-8 rounded-full bg-white text-black font-semibold text-base tracking-wide shadow-2xl active:scale-[0.98] transition-transform"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Commencer maintenant
        </button>

        {/* Doigt animé qui tape sur le bouton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 4 }}
          className="absolute -top-2 right-8 pointer-events-none"
          aria-hidden
        >
          <motion.div
            animate={{
              y: [0, -10, 0, -10, 0],
              scale: [1, 0.92, 1, 0.92, 1],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.6,
            }}
            className="text-3xl drop-shadow-lg"
          >
            👆
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Petite signature discrète en bas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1, delay: 4.5 }}
        className="mt-6 flex flex-col items-center gap-1 relative z-10"
      >
        <p
          className="text-[10px] text-white/40 tracking-widest uppercase"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Analyse cutanée IA · Cameroun
        </p>
        <p
          className="text-[11px] text-white/60 tracking-wide"
          style={{ fontFamily: "'Outfit', sans-serif" }}
          data-testid="text-founder"
        >
          Fondateur · Démise Essawe
        </p>
      </motion.div>
    </div>
  );
}
