import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ScanFace, Sparkles, ShieldCheck, Star, ArrowRight, Zap } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const STATS = [
  { value: "100%", label: "Gratuit pour toi" },
  { value: "30s", label: "Résultat rapide" },
  { value: "✓", label: "Peaux africaines" },
];

const FEATURES = [
  {
    icon: ScanFace,
    label: "Bilan peau personnalisé",
    sub: "Une photo suffit — reçois ton diagnostic complet en 30 secondes",
    color: "#a78bfa",
    colorBg: "rgba(167,139,250,0.12)",
    colorBorder: "rgba(167,139,250,0.25)",
  },
  {
    icon: Star,
    label: "Ton score de peau sur 100",
    sub: "Suis l'évolution de ta peau semaine après semaine",
    color: "#fbbf24",
    colorBg: "rgba(245,158,11,0.1)",
    colorBorder: "rgba(245,158,11,0.25)",
  },
  {
    icon: Zap,
    label: "Les bons soins pour ta peau",
    sub: "Produits et routines adaptés aux peaux noires et métissées",
    color: "#c4b5fd",
    colorBg: "rgba(167,139,250,0.08)",
    colorBorder: "rgba(167,139,250,0.2)",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useSEO({
    title: "GlowScan — Analyse de peau IA pour peaux africaines | Glow Score",
    description: "Analysez votre peau en 30 secondes avec l'IA. Diagnostic dermatologique, Glow Score et routine skincare personnalisée pour peaux africaines. Gratuit.",
    canonical: "https://glow-scan.com/",
  });
  const go = () => setLocation(user ? "/" : "/auth");

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center overflow-hidden relative"
      style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* ── Glow orbs (radial-gradient only, no box-shadow) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[-8%] left-1/2 -translate-x-1/2 w-[520px] h-[520px]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-5%] left-[-12%] w-[340px] h-[340px]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[15%] right-[-8%] w-[260px] h-[260px]"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)" }}
        />
        {/* Subtle grain */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" aria-hidden="true">
          <filter id="gs-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#gs-noise)" />
        </svg>
      </div>

      {/* ── Status bar ── */}
      <div className="w-full px-6 pt-14 flex justify-between items-center relative z-10">
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase"
          style={{ color: "rgba(255,255,255,0.35)", cursor: "default" }}
        >
          GlowScan
        </span>
        {/* Badge IA Active → cliquable, emmène vers l'inscription */}
        <button
          onClick={go}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 active:scale-95 transition-transform"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            cursor: "pointer",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span
            className="text-[9px] font-bold tracking-[0.18em] uppercase"
            style={{ color: "#6ee7b7" }}
          >
            En ligne — Essayer gratuitement
          </span>
        </button>
      </div>

      {/* ── Main body ── */}
      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col items-center px-6 pt-10 pb-6 relative z-10">

        {/* Floating logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 relative"
        >
          {/* Glow behind logo — radial-gradient div, no box-shadow */}
          <div
            className="absolute inset-0 scale-150 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)" }}
          />
          <div
            className="w-24 h-24 rounded-[1.75rem] relative flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(167,139,250,0.2)",
              backdropFilter: "blur(20px)",
            }}
            data-testid="logo-glowscan"
          >
            <img src="/logo-glowscan.jpeg" alt="GlowScan" className="w-16 h-16 rounded-2xl object-cover" />
          </div>
        </motion.div>

        {/* Eyebrow pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              background: "rgba(167,139,250,0.06)",
              border: "1px solid rgba(167,139,250,0.18)",
              color: "#c4b5fd",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            <Sparkles className="w-3 h-3" />
            Soins dermato · Peaux africaines · Gratuit
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
            className="text-[2.1rem] font-extrabold leading-[1.15] tracking-tight mb-4"
            data-testid="text-welcome"
            style={{ color: "#f3f0ff" }}
          >
            Ton bilan peau gratuit,{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #f9a8d4 0%, #E91E8C 100%)" }}
            >
              fait pour ta peau
            </span>
          </h1>
          <p
            className="text-sm leading-relaxed max-w-[270px] mx-auto"
            style={{ color: "rgba(200,185,255,0.65)" }}
            data-testid="text-tagline"
          >
            Tes taches, tes boutons, ta sécheresse — tout expliqué avec les soins qu'il te faut vraiment. Sans rendez-vous, sans payer.
          </p>
        </motion.div>

        {/* ── CTA visible sans scroll — au-dessus du fold ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.55 }}
          className="w-full mb-8"
        >
          <button
            onClick={go}
            data-testid="button-commencer-top"
            className="w-full h-14 font-extrabold text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
              borderRadius: "16px",
              color: "#f3f0ff",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1/2"
              style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)", borderRadius: "16px 16px 0 0" }}
            />
            <Sparkles className="w-4 h-4 relative z-10" strokeWidth={1.5} />
            <span className="relative z-10">Obtenir mon bilan gratuit</span>
          </button>
          <p className="text-center text-[10px] mt-2 font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
            Gratuit · 30 secondes · Tes données restent chez toi
          </p>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center gap-8 mb-8"
        >
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className="text-lg font-extrabold leading-none"
                style={{ color: "#f3f0ff" }}
              >
                {s.value}
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full space-y-3 mb-10"
        >
          {FEATURES.map((f, i) => (
            <motion.button
              key={i}
              onClick={go}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.07 }}
              className="w-full flex items-center gap-4 px-4 py-3.5 active:scale-[0.98] transition-transform text-left"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "24px",
                cursor: "pointer",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: f.colorBg, border: `1px solid ${f.colorBorder}` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: "#f3f0ff" }}>{f.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(200,185,255,0.65)" }}>{f.sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={1.5} />
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Fixed bottom CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="w-full max-w-sm px-6 pb-12 flex flex-col items-center gap-4 relative z-10"
      >
        {/* Primary CTA — rose gradient (purchase/hero CTA only) */}
        <button
          onClick={go}
          data-testid="button-commencer"
          className="w-full h-14 font-extrabold text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
            borderRadius: "12px",
            color: "#f3f0ff",
          }}
        >
          {/* Specular highlight */}
          <div
            className="absolute top-0 left-0 right-0 h-1/2"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)",
              borderRadius: "12px 12px 0 0",
            }}
          />
          <Sparkles className="w-4 h-4 relative z-10" strokeWidth={1.5} />
          <span className="relative z-10">Commencer mon analyse</span>
        </button>

        {/* Trust signals — non-cliquables (cursor:default) */}
        <div className="flex items-center gap-5" style={{ cursor: "default", userSelect: "none" }}>
          {[
            { icon: ShieldCheck, text: "100% privé" },
            { icon: Zap, text: "30 secondes" },
            { icon: Star, text: "Gratuit" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <item.icon className="w-3 h-3" strokeWidth={1.5} />
              <span className="text-[10px] font-bold">{item.text}</span>
            </div>
          ))}
        </div>

        <p
          className="text-[10px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
          data-testid="text-founder"
        >
          Démise Essawe · Fondateur · Douala, Cameroun
        </p>
      </motion.div>
    </div>
  );
}
