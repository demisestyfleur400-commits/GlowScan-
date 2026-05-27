import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ScanFace, Sparkles, ShieldCheck, ChevronRight, Star, Zap } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleStart = () => setLocation(user ? "/" : "/auth");

  const features = [
    {
      icon: ScanFace,
      label: "Scan en 30 secondes",
      sub: "Une photo suffit",
      color: "from-pink-500 to-rose-500",
      bg: "bg-pink-50",
    },
    {
      icon: Star,
      label: "Glow Score personnalisé",
      sub: "Évalué sur 100 points",
      color: "from-amber-400 to-orange-400",
      bg: "bg-amber-50",
    },
    {
      icon: Zap,
      label: "Produits sur-mesure",
      sub: "Pour les peaux d'Afrique",
      color: "from-violet-500 to-purple-500",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden relative">
      {/* Fond dégradé Apple Health */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[45vh] bg-gradient-to-b from-rose-50 via-pink-50/60 to-transparent" />
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #E91E8C 0%, transparent 70%)" }}
        />
      </div>

      {/* Status bar safe area */}
      <div className="w-full px-6 pt-14 pb-2 flex justify-between items-center relative z-10">
        <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">GlowScan</span>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">IA Active</span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center px-6 pt-8 relative z-10">
        {/* Logo card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-rose-500 rounded-[2rem] blur-2xl opacity-25 scale-90" />
            <div className="w-24 h-24 rounded-[1.75rem] bg-white shadow-2xl shadow-pink-100 flex items-center justify-center border border-pink-100/50 relative">
              <img
                src="/logo-glowscan.jpeg"
                alt="GlowScan"
                className="w-[4.5rem] h-[4.5rem] rounded-2xl object-cover"
                data-testid="logo-glowscan"
              />
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="text-center mb-10 space-y-3"
        >
          <h1
            className="text-[2.1rem] font-black leading-[1.15] tracking-tight text-gray-900"
            data-testid="text-welcome"
          >
            Ta peau mérite<br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #E91E8C, #f43f5e)" }}
            >
              le meilleur soin
            </span>
          </h1>
          <p
            className="text-sm text-gray-500 leading-relaxed max-w-[260px] mx-auto"
            data-testid="text-tagline"
          >
            Diagnostic IA personnalisé pour les peaux d'Afrique centrale. Gratuit et privé.
          </p>
        </motion.div>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="w-full max-w-sm space-y-3 mb-10"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38 + i * 0.08 }}
              className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0 shadow-sm`}
              >
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-gray-900">{f.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA bas de page */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55 }}
        className="w-full px-6 pb-12 flex flex-col items-center gap-4 relative z-10"
      >
        <button
          onClick={handleStart}
          data-testid="button-commencer"
          className="w-full max-w-sm h-14 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg, #E91E8C 0%, #f43f5e 100%)", boxShadow: "0 12px 32px rgba(233,30,140,0.35)" }}
        >
          <Sparkles className="w-4 h-4" />
          Commencer mon analyse
        </button>

        <div className="flex items-center gap-5">
          {[
            { icon: ShieldCheck, text: "100% privé" },
            { icon: Zap, text: "Résultats en 30s" },
            { icon: Star, text: "Gratuit" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1 text-gray-400">
              <item.icon className="w-3 h-3" />
              <span className="text-[11px] font-semibold">{item.text}</span>
            </div>
          ))}
        </div>

        <p
          className="text-[11px] text-gray-400 text-center"
          data-testid="text-founder"
        >
          Démise Essawe · Fondateur · Douala
        </p>
      </motion.div>
    </div>
  );
}
