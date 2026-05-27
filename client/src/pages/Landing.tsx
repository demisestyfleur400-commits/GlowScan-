import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ScanFace, Sparkles, ShieldCheck, Star, ArrowRight, Zap } from "lucide-react";

const STATS = [
  { value: "30s", label: "Analyse complète" },
  { value: "100%", label: "Privé & sécurisé" },
  { value: "IA", label: "Gpt-4o Vision" },
];

const FEATURES = [
  { icon: ScanFace,  label: "Scan cutané IA",       sub: "Photo → diagnostic en 30 secondes",         color: "#E91E8C" },
  { icon: Star,      label: "Glow Score",             sub: "Ton score de peau personnalisé sur 100",    color: "#f59e0b" },
  { icon: Zap,       label: "Produits adaptés",       sub: "Recommandés pour les peaux africaines",     color: "#a855f7" },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const go = () => setLocation(user ? "/" : "/auth");

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center overflow-hidden relative"
      style={{ background: "#0D0A0E" }}
    >
      {/* ── Orbes d'ambiance ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Glow rose central */}
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(233,30,140,0.22) 0%, transparent 70%)" }}
        />
        {/* Halo violet bas-gauche */}
        <div
          className="absolute bottom-[-5%] left-[-10%] w-[350px] h-[350px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)" }}
        />
        {/* Halo rose bas-droit */}
        <div
          className="absolute bottom-[10%] right-[-10%] w-[280px] h-[280px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)" }}
        />
        {/* Grain subtil */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* ── Status bar ── */}
      <div className="w-full px-6 pt-14 flex justify-between items-center relative z-10">
        <span className="text-[11px] font-bold text-white/30 tracking-widest uppercase">GlowScan</span>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">IA Active</span>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col items-center px-6 pt-10 pb-6 relative z-10">

        {/* Logo flottant */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 relative"
        >
          {/* Halo derrière le logo */}
          <div
            className="absolute inset-0 rounded-3xl blur-2xl scale-110"
            style={{ background: "radial-gradient(circle, rgba(233,30,140,0.5) 0%, transparent 70%)" }}
          />
          <div
            className="w-24 h-24 rounded-[1.75rem] relative flex items-center justify-center border shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
              borderColor: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 40px rgba(233,30,140,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            data-testid="logo-glowscan"
          >
            <img src="/logo-glowscan.jpeg" alt="GlowScan" className="w-16 h-16 rounded-2xl object-cover" />
          </div>
        </motion.div>

        {/* Pill "Nouveau" */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5 border text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, rgba(233,30,140,0.15) 0%, rgba(168,85,247,0.15) 100%)",
              borderColor: "rgba(233,30,140,0.3)",
              color: "#f9a8d4",
            }}
          >
            <Sparkles className="w-3 h-3" />
            Analyse dermatologique IA — Afrique
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-center mb-5"
        >
          <h1
            className="text-[2.4rem] font-black leading-[1.1] tracking-tight mb-4"
            data-testid="text-welcome"
          >
            <span className="text-white">Ta peau,</span>
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #E91E8C 0%, #f43f5e 50%, #fb923c 100%)" }}
            >
              révélée par l'IA
            </span>
          </h1>
          <p
            className="text-sm leading-relaxed max-w-[260px] mx-auto"
            style={{ color: "rgba(255,255,255,0.45)" }}
            data-testid="text-tagline"
          >
            Diagnostic personnalisé pour les peaux d'Afrique centrale. Résultat en 30 secondes.
          </p>
        </motion.div>

        {/* Stats rapides */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center gap-6 mb-10"
        >
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-lg font-black text-white">{s.value}</span>
              <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Feature cards glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full space-y-3 mb-10"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.07 }}
              className="flex items-center gap-4 rounded-2xl px-4 py-3.5 border"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">{f.label}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{f.sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── CTA fixe en bas ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="w-full max-w-sm px-6 pb-12 flex flex-col items-center gap-4 relative z-10"
      >
        <button
          onClick={go}
          data-testid="button-commencer"
          className="w-full h-14 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #E91E8C 0%, #f43f5e 60%, #fb923c 100%)",
            boxShadow: "0 0 40px rgba(233,30,140,0.5), 0 8px 32px rgba(233,30,140,0.3)",
          }}
        >
          {/* Reflet sur le bouton */}
          <div
            className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl"
            style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)" }}
          />
          <Sparkles className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Commencer mon analyse</span>
        </button>

        <div className="flex items-center gap-5">
          {[
            { icon: ShieldCheck, text: "100% privé" },
            { icon: Zap,         text: "30 secondes" },
            { icon: Star,        text: "Gratuit" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <item.icon className="w-3 h-3" />
              <span className="text-[11px] font-semibold">{item.text}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }} data-testid="text-founder">
          Démise Essawe · Fondateur · Douala, Cameroun
        </p>
      </motion.div>
    </div>
  );
}
