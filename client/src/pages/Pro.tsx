import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Microscope,
  BarChart3,
  FileText,
  Smartphone,
  Lock,
  Cog,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Database,
  TrendingUp,
  Activity,
  Stethoscope,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
//  GLOWSCAN PRO — Landing dermatologues — Style Skinive / Autoderm.ai
//  Couleurs : Primary #1E40AF · Secondary #0EA5E9 · Accent #10B981
//             BG #F8FAFC · Text #1E293B · Font Inter
// ─────────────────────────────────────────────────────────────────────────
export default function Pro() {
  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5 },
  };

  return (
    <div
      className="min-h-screen bg-white text-slate-800 antialiased"
      style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", color: "#1E293B" }}
    >
      {/* ── NAV TOP ────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/pro" className="flex items-center gap-2.5" data-testid="link-pro-home">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold text-base tracking-tight">GlowScan Pro</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-blue-200 font-semibold">Clinical AI</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-blue-100">
            <a href="#educ" className="hover:text-white transition-colors">Pourquoi</a>
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/pro/connexion"
              className="hidden sm:inline-flex text-sm font-medium text-white/90 hover:text-white"
              data-testid="link-login-top"
            >
              Connexion
            </Link>
            <Link
              href="/pro/inscription"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-white text-blue-900 hover:bg-blue-50 transition-colors"
              data-testid="link-trial-top"
            >
              Essai 14 j
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          1. HERO — h-screen gradient bleu, vidéo, double CTA
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center justify-center text-white py-24 px-6 lg:px-8 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #312E81 100%)" }}
      >
        {/* Grille hi-tech subtile */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Halos décoratifs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: "#0EA5E9" }} />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#10B981" }} />

        <div className="relative max-w-4xl mx-auto text-center w-full">
          {/* Badge top */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
            data-testid="badge-pro"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
              Plateforme dermatologique professionnelle
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.05]"
            data-testid="text-hero-title"
          >
            GlowScan Pro
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl mb-10 opacity-90 font-normal max-w-2xl mx-auto"
            data-testid="text-hero-subtitle"
          >
            IA Dermatologique Spécialisée Peaux Noires
          </motion.p>

          {/* "Vidéo" hero — démo workflow IA (mockup animé professionnel, pas de cartoon) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full max-w-2xl mx-auto rounded-xl shadow-2xl mb-10 overflow-hidden border border-white/10 bg-slate-900"
            data-testid="hero-demo"
          >
            {/* Barre fenêtre style logiciel médical */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 border-b border-white/5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 text-[11px] font-mono text-slate-400">app.glowscan.cm/pro/analyse</span>
              <span className="ml-auto text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Workflow animé */}
            <div className="p-5 sm:p-7 space-y-2.5 bg-gradient-to-b from-slate-900 to-slate-950">
              {[
                { step: "01", label: "Acquisition photo HD", time: "0.8s", color: "#0EA5E9" },
                { step: "02", label: "Analyse IA — détection multi-pathologies", time: "4.2s", color: "#0EA5E9" },
                { step: "03", label: "Validation dermatologue", time: "30s", color: "#10B981" },
                { step: "04", label: "Rapport PDF clinique généré", time: "auto", color: "#10B981" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10"
                >
                  <span
                    className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                    style={{ background: s.color + "22", color: s.color }}
                  >
                    {s.step}
                  </span>
                  <span className="flex-1 text-sm text-white/90 font-medium text-left">{s.label}</span>
                  <span className="text-[11px] font-mono text-slate-400">{s.time}</span>
                </motion.div>
              ))}

              {/* Métriques bottom */}
              <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-white/5">
                {[
                  { v: "95%", l: "Précision" },
                  { v: "5s", l: "Latence" },
                  { v: "10k+", l: "Dataset" },
                ].map((m) => (
                  <div key={m.l} className="text-center">
                    <p className="text-lg font-bold text-white">{m.v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{m.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/pro/inscription"
              className="bg-emerald-500 hover:bg-emerald-600 px-8 py-4 rounded-lg font-semibold text-lg text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
              data-testid="button-trial-hero"
            >
              Essai Gratuit 14j
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="border-2 border-white hover:bg-white hover:text-blue-900 px-8 py-4 rounded-lg font-semibold transition-all inline-flex items-center justify-center"
              data-testid="button-demo"
            >
              Demo Live
            </a>
          </motion.div>

          <p className="text-xs text-blue-200/80 mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sans carte bancaire · RGPD compliant · Résiliable à tout moment
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. SECTION ÉDUC — bg-white py-20, 3 cards
          ═══════════════════════════════════════════════════════════════ */}
      <section id="educ" className="bg-white py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#1E40AF" }}>
              Pourquoi GlowScan Pro
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#1E293B" }}>
              Conçu pour la dermatologie africaine
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: <Database className="w-5 h-5" />,
                tag: "Problème",
                title: "Datasets biaisés",
                body: "Les modèles dermato globaux sont entraînés à 90 % sur peaux claires. GlowScan : 100 % data africaine, validée en continu par votre feedback.",
                accent: "#1E40AF",
              },
              {
                icon: <TrendingUp className="w-5 h-5" />,
                tag: "Bénéfice",
                title: "ROI +50 000 FCFA / mois",
                body: "Patients redirigés depuis l'app B2C (commission 2 000 FCFA / consultation) + temps gagné en consultation grâce au prédiagnostic IA.",
                accent: "#10B981",
              },
              {
                icon: <ShieldCheck className="w-5 h-5" />,
                tag: "Conformité",
                title: "Sécurisé RGPD",
                body: "Données patients anonymisées, hébergement chiffré, conformité RGPD. Partenariat MinSanté Cameroun en cours.",
                accent: "#0EA5E9",
              },
            ].map((c, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="max-w-md mx-auto w-full bg-white rounded-xl p-7 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-white mb-4"
                  style={{ background: c.accent }}
                >
                  {c.icon}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{c.tag}</p>
                <h3 className="text-lg font-bold mb-2.5" style={{ color: "#1E293B" }}>{c.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. FEATURES — bg-gray-50 py-20, 6 cards w-80
          ═══════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 px-6 lg:px-8" style={{ background: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#1E40AF" }}>
              Suite clinique complète
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#1E293B" }}>
              Tout ce dont votre cabinet a besoin
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-5">
            {[
              { icon: <Microscope className="w-5 h-5" />, title: "Prédiagnostic IA", desc: "Upload photo → détection acné, xérose, pigmentation en 5 secondes. Précision validée 95 %." },
              { icon: <BarChart3 className="w-5 h-5" />, title: "Dashboard patients", desc: "Suivi GlowScore, évolution dans le temps et prédiction de churn par patient." },
              { icon: <FileText className="w-5 h-5" />, title: "Rapports PDF", desc: "Modèles brandés à votre cabinet, export en 1 clic, partage sécurisé chiffré." },
              { icon: <Smartphone className="w-5 h-5" />, title: "Intégration RDV", desc: "Booking direct depuis l'app patient B2C — commission par consultation." },
              { icon: <Lock className="w-5 h-5" />, title: "Analytics sécurisés", desc: "ROI, statistiques pathologies, exports CSV chiffrés. Conformité RGPD totale." },
              { icon: <Cog className="w-5 h-5" />, title: "API custom", desc: "Endpoints REST pour intégrer GlowScan à votre logiciel cabinet existant." },
            ].map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                className="w-80 h-64 bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-700 hover:shadow-lg transition-all flex flex-col"
                data-testid={`card-feature-${i}`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white mb-4"
                  style={{ background: "#1E40AF" }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "#1E293B" }}>{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. PRICING — bg-white py-20, 3 columns
          ═══════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="bg-white py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#1E40AF" }}>
              Tarification transparente
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: "#1E293B" }}>
              Choisissez votre plan
            </h2>
            <p className="text-slate-600">14 jours d'essai gratuit · Sans carte bancaire</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "0",
                unit: "FCFA",
                period: "à vie",
                desc: "Pour découvrir la plateforme",
                features: ["50 prédiagnostics / mois", "Dashboard basique", "Support communauté"],
                cta: "Commencer",
                highlight: false,
              },
              {
                name: "Pro",
                price: "15 000",
                unit: "FCFA",
                period: "/ mois",
                desc: "Pour dermatologues indépendants",
                features: ["Prédiagnostics illimités", "Rapports PDF brandés", "Tracking patients complet", "API custom", "Support prioritaire"],
                cta: "Démarrer l'essai 14 j",
                highlight: true,
              },
              {
                name: "Clinic",
                price: "30 000",
                unit: "FCFA",
                period: "/ mois",
                desc: "Pour cabinets multi-praticiens",
                features: ["Tout le plan Pro", "Comptes multi-utilisateurs", "Support dédié", "Onboarding personnalisé", "SLA premium"],
                cta: "Contacter l'équipe",
                highlight: false,
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative bg-white rounded-2xl p-7 border-2 transition-all ${
                  p.highlight
                    ? "shadow-2xl scale-[1.03]"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}
                style={p.highlight ? { borderColor: "#1E40AF" } : {}}
                data-testid={`card-pricing-${p.name.toLowerCase()}`}
              >
                {p.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: "#1E40AF" }}
                  >
                    Recommandé
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{p.name}</p>
                  <p className="text-sm text-slate-600 mb-4">{p.desc}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold" style={{ color: "#1E293B" }}>{p.price}</span>
                    <span className="text-sm font-semibold text-slate-600">{p.unit}</span>
                    <span className="text-sm text-slate-500">{p.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {p.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#10B981" }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {p.name === "Clinic" ? (
                  <a
                    href="https://wa.me/237674377959?text=Bonjour%20GlowScan%20Pro%20-%20plan%20Clinic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-3 rounded-lg font-semibold text-sm transition-all ${
                      p.highlight ? "text-white" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}
                    data-testid={`button-pricing-${p.name.toLowerCase()}`}
                  >
                    {p.cta}
                  </a>
                ) : (
                  <Link
                    href="/pro/inscription"
                    className={`block w-full text-center py-3 rounded-lg font-semibold text-sm transition-all ${
                      p.highlight ? "text-white hover:opacity-90" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}
                    style={p.highlight ? { background: "#1E40AF" } : {}}
                    data-testid={`button-pricing-${p.name.toLowerCase()}`}
                  >
                    {p.cta}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          {/* Social proof bar */}
          <motion.div {...fadeUp} className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mt-16 pt-10 border-t border-slate-200">
            {[
              { v: "10 000+", l: "Photos peaux noires", icon: <Database className="w-4 h-4" /> },
              { v: "95 %", l: "Précision validée", icon: <Activity className="w-4 h-4" /> },
              { v: "+50 %", l: "Patients en moyenne", icon: <TrendingUp className="w-4 h-4" /> },
            ].map((m) => (
              <div key={m.l} className="text-center">
                <div className="inline-flex w-9 h-9 rounded-lg items-center justify-center text-white mb-2" style={{ background: "#10B981" }}>
                  {m.icon}
                </div>
                <p className="text-2xl font-bold" style={{ color: "#1E293B" }}>{m.v}</p>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-1">{m.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. FOOTER — bg-blue-900 py-12 text-white
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-12 px-6 lg:px-8 text-white" style={{ background: "#1E3A8A" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-md flex items-center justify-center bg-white/10 border border-white/20">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <div className="leading-tight">
                  <p className="font-bold text-base">GlowScan Pro</p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-blue-200">Clinical AI</p>
                </div>
              </div>
              <p className="text-sm text-blue-100 leading-relaxed max-w-xs">
                IA dermatologique professionnelle conçue pour les peaux noires. Yaoundé · Douala · Cameroun.
              </p>
            </div>

            {/* Contact */}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-4 text-white">Contact</p>
              <a
                href="https://wa.me/237674377959?text=Bonjour%2C%20je%20souhaite%20une%20demo%20GlowScan%20Pro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors mb-2"
                data-testid="link-whatsapp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                +237 674 377 959
              </a>
              <p className="text-xs text-blue-200/80 mt-3">Réponse sous 1 h ouvrée · Lun-Sam 8h-18h</p>
            </div>

            {/* Légal */}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-4 text-white">Légal</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/confidentialite" className="text-blue-100 hover:text-white transition-colors">Politique de confidentialité</Link></li>
                <li><Link href="/confidentialite" className="text-blue-100 hover:text-white transition-colors">Conditions d'utilisation</Link></li>
                <li><Link href="/confidentialite" className="text-blue-100 hover:text-white transition-colors">Mentions légales</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200">
            <p>© {new Date().getFullYear()} GlowScan. Tous droits réservés.</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Hébergement chiffré · Données médicales sécurisées
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
