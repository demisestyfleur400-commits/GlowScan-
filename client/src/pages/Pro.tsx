import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Microscope, BarChart3, FileText, Smartphone, Lock, Cog,
  CheckCircle2, ArrowRight, ShieldCheck, Database, TrendingUp,
  Activity, Stethoscope, Layers, ArrowUpRight,
} from "lucide-react";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  border: "rgba(255,255,255,0.07)",
  violetBorder: "rgba(167,139,250,0.18)",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
};

export default function Pro() {
  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', color: DS.text }}
    >
      {/* ── NAV ── */}
      <header
        className="absolute top-0 left-0 right-0 z-50"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(13,10,14,0.5)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/derm" className="flex items-center gap-2.5" data-testid="link-pro-home">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}
            >
              <Stethoscope className="w-4 h-4" style={{ color: "#a78bfa" }} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-extrabold" style={{ color: DS.text }}>GlowScan DERM</p>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#a78bfa" }}>Clinical Engine</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold" style={{ color: DS.muted }}>
            <a href="#educ" className="hover:text-white transition-colors">Infrastructure</a>
            <a href="#features" className="hover:text-white transition-colors">Spécifications</a>
            <a href="#pricing" className="hover:text-white transition-colors">Licences B2B</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/derm/connexion" className="hidden sm:inline-flex text-xs font-bold transition-colors hover:text-white" style={{ color: DS.body }} data-testid="link-login-top">
              Portail
            </Link>
            <Link
              href="/derm/inscription"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-extrabold text-white transition-all active:scale-95"
              style={{ background: "#7c3aed" }}
              data-testid="link-trial-top"
            >
              Essai clinique
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════ 1. HERO ═══════ */}
      <section className="relative min-h-screen flex items-center justify-center py-32 px-6 lg:px-8 overflow-hidden" style={{ borderBottom: `1px solid ${DS.border}` }}>
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "48px 48px" }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />

        <div className="relative max-w-5xl mx-auto text-center w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
            data-testid="badge-pro"
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#6ee7b7" }} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: DS.muted }}>
              Système d'imagerie algorithmique dermatologique
            </span>
          </motion.div>

          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-none"
              style={{ color: DS.text }}
              data-testid="text-hero-title"
            >
              L'IA au service de la <span style={{ color: "#a78bfa" }}>dermatologie noire</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg max-w-2xl mx-auto font-medium"
              style={{ color: DS.body }}
              data-testid="text-hero-subtitle"
            >
              Prédiagnostic, cartographie d'imperfections et redirection de flux patients. Conçu pour les phototypes V & VI en Afrique Centrale.
            </motion.p>
          </div>

          {/* Terminal demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden text-left"
            style={{ background: DS.surface, border: "1px solid rgba(167,139,250,0.15)" }}
            data-testid="hero-demo"
          >
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${DS.border}` }}>
              <div className="flex gap-1.5">
                {["rgba(255,255,255,0.08)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.08)"].map((c, i) => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <span className="text-[10px] font-mono" style={{ color: DS.muted }}>CORE_ENGINE // core-ai.glowscan.pro</span>
              <span
                className="ml-auto px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
              >
                Secure Stack
              </span>
            </div>

            <div className="p-6 space-y-3 font-mono text-xs" style={{ color: DS.body }}>
              {[
                { step: "01", label: "Acquisition matrice d'imagerie HD (Phototype V/VI)", status: "COMPLETED", time: "0.8s", color: "#a78bfa" },
                { step: "02", label: "Filtrage reflets lumineux (spécificité équatoriale)", status: "COMPLETED", time: "1.1s", color: "#a78bfa" },
                { step: "03", label: "Segmentation neuronale : Acné, Hyperpigmentation, Chéloïdes", status: "PROCESSING", time: "2.3s", color: "#fbbf24", pulse: true },
                { step: "04", label: "Compilation rapport technique PDF clinique", status: "PENDING", time: "wait", color: DS.muted },
              ].map((s, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl gap-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}` }}>
                  <div className="flex items-center gap-3">
                    <span className={`font-extrabold text-[10px] ${s.pulse ? "animate-pulse" : ""}`} style={{ color: s.color }}>[{s.step}]</span>
                    <span style={{ color: DS.body }}>{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-[10px]">
                    <span className="font-bold" style={{ color: s.color }}>{s.status}</span>
                    <span className="font-bold" style={{ color: DS.muted }}>{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/derm/inscription"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-extrabold text-xs text-white transition-all active:scale-[0.98]"
              style={{ background: "#7c3aed" }}
              data-testid="button-trial-hero"
            >
              Activer l'essai 14 jours
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-extrabold text-xs transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.body }}
              data-testid="button-demo"
            >
              Grille tarifaire
            </a>
          </motion.div>

          <p className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2" style={{ color: DS.muted }}>
            <ShieldCheck className="w-4 h-4" style={{ color: "#6ee7b7" }} />
            Zéro engagement · Hébergement chiffré · Architecture PWA
          </p>
        </div>
      </section>

      {/* ═══════ 2. POURQUOI ═══════ */}
      <section id="educ" className="py-24 px-6 lg:px-8 relative" style={{ borderBottom: `1px solid ${DS.border}` }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-extrabold uppercase tracking-widest block mb-2" style={{ color: "#a78bfa" }}>Biais clinique résolu</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: DS.text }}>Pourquoi GlowScan DERM ?</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Database, tag: "La réalité du terrain", title: "Datasets peaux noires", body: "Les modèles globaux sont entraînés à 90% sur peaux claires. GlowScan intègre un dataset calibré pour la physiologie cutanée d'Afrique Centrale.", color: "#a78bfa" },
              { icon: TrendingUp, tag: "Modèle B2B SaaS", title: "Génération de flux & ROI", body: "Redirection automatisée des patients de notre app B2C vers votre cabinet. Encaissez de nouvelles consultations privées chaque mois.", color: "#6ee7b7" },
              { icon: ShieldCheck, tag: "Sécurité médicale", title: "Anonymisation absolue", body: "Données patients hautement chiffrées. Traçabilité complète des dossiers médicaux pour une confidentialité réglementaire stricte.", color: "#c4b5fd" },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div key={i} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }} className="rounded-2xl p-6 flex flex-col" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-5" style={{ background: c.color + "15", border: `1px solid ${c.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: c.color }} />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest block mb-1" style={{ color: DS.muted }}>{c.tag}</span>
                  <h3 className="text-base font-extrabold mb-3" style={{ color: DS.text }}>{c.title}</h3>
                  <p className="text-xs leading-relaxed font-medium" style={{ color: DS.body }}>{c.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ 3. FEATURES ═══════ */}
      <section id="features" className="py-24 px-6 lg:px-8" style={{ background: "rgba(255,255,255,0.01)", borderBottom: `1px solid ${DS.border}` }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-extrabold uppercase tracking-widest block mb-2" style={{ color: "#a78bfa" }}>Spécifications pro</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: DS.text }}>Outils d'analyse intégrés</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {[
              { icon: Microscope, title: "Prédiagnostic instantané", desc: "Scan d'image à haute résolution. Identification des pathologies majeures en 5 secondes." },
              { icon: BarChart3, title: "Console praticien", desc: "Suivi chronologique des fiches patients, historique des scores d'évolution cutanée." },
              { icon: FileText, title: "Export PDF signé", desc: "Génération automatique de comptes-rendus cliniques avec le logo de votre cabinet." },
              { icon: Smartphone, title: "Passerelle de prise de RDV", desc: "Synchronisation avec la file d'attente et l'agenda de votre structure médicale." },
              { icon: Lock, title: "Chiffrement end-to-end", desc: "Sécurisation des photos et diagnostics. Zéro fuite de données confidentielles." },
              { icon: Cog, title: "Intégration API REST", desc: "Endpoints documentés pour connecter GlowScan DERM à vos logiciels internes existants." },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }} className="rounded-2xl p-6 flex flex-col" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}` }} data-testid={`card-feature-${i}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
                    <Icon className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                  <h3 className="text-sm font-extrabold mb-2" style={{ color: DS.text }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed font-medium" style={{ color: DS.body }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ 4. PRICING ═══════ */}
      <section id="pricing" className="py-24 px-6 lg:px-8" style={{ borderBottom: `1px solid ${DS.border}` }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-extrabold uppercase tracking-widest block mb-2" style={{ color: "#a78bfa" }}>Tarification B2B</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: DS.text }}>Sélectionnez votre licence</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {[
              { name: "Découverte", price: "0", period: "/ à vie", desc: "Pour évaluer l'outil en cabinet", features: ["50 scans / mois", "Console patient standard", "Support communautaire"], cta: "Démarrer", highlight: false },
              { name: "Cabinet Pro", price: "15 000", period: "/ mois", desc: "Pour praticiens indépendants", features: ["Scans et analyses illimités", "Rapports PDF brandés", "Génération de flux patients B2C", "Accès API standard", "Support technique prioritaire"], cta: "Activer la licence Pro", highlight: true },
              { name: "Clinique / Labo", price: "30 000", period: "/ mois", desc: "Pour structures multi-praticiens", features: ["Tout le plan Cabinet Pro", "Comptes praticiens multiples", "Intégration sur-mesure", "Onboarding sur site", "Garantie de disponibilité (SLA)"], cta: "Ouvrir un compte Clinique", highlight: false },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative rounded-2xl p-6 flex flex-col justify-between"
                style={p.highlight
                  ? { background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.3)", transform: "scale(1.02)" }
                  : { background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}` }
                }
                data-testid={`card-pricing-${p.name.toLowerCase()}`}
              >
                {p.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-white"
                    style={{ background: "#7c3aed" }}
                  >
                    Recommandée
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest block mb-1" style={{ color: DS.muted }}>{p.name}</span>
                    <p className="text-xs font-medium leading-normal" style={{ color: DS.body }}>{p.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1 pt-2 pb-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
                    <span className="text-3xl font-extrabold" style={{ color: DS.text }}>{p.price}</span>
                    <span className="text-xs font-extrabold" style={{ color: DS.body }}>F CFA</span>
                    <span className="text-xs font-bold ml-1" style={{ color: DS.muted }}>{p.period}</span>
                  </div>

                  <ul className="space-y-3 pt-2">
                    {p.features.map((feat, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-xs font-medium" style={{ color: DS.body }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6ee7b7" }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6" style={{ borderTop: `1px solid ${DS.border}` }}>
                  {p.name === "Clinique / Labo" ? (
                    <a
                      href="https://wa.me/237674377959?text=Bonjour%20GlowScan%20Pro%20-%20Plan%20Clinique"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-3.5 rounded-full font-extrabold text-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.body }}
                      data-testid={`button-pricing-${p.name.toLowerCase()}`}
                    >
                      Contacter l'équipe <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <Link
                      href="/derm/inscription"
                      className="block w-full text-center py-3.5 rounded-full font-extrabold text-xs transition-all active:scale-[0.98]"
                      style={p.highlight ? { background: "#7c3aed", color: "#fff" } : { background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.body }}
                      data-testid={`button-pricing-${p.name.toLowerCase()}`}
                    >
                      {p.cta}
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Metrics */}
          <motion.div {...fadeUp} className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mt-20 pt-10" style={{ borderTop: `1px solid ${DS.border}` }}>
            {[
              { v: "10 000+", l: "Dataset localisé", Icon: Layers },
              { v: "95%", l: "Précision validée", Icon: Activity },
              { v: "E2E", l: "Chiffrement", Icon: Lock },
            ].map(({ v, l, Icon }, i) => (
              <div key={i} className="text-center space-y-1">
                <div className="inline-flex w-8 h-8 rounded-xl items-center justify-center mx-auto" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <Icon className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
                <p className="text-xl font-extrabold" style={{ color: DS.text }}>{v}</p>
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: DS.muted }}>{l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="py-16 px-6 lg:px-8" style={{ borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <Stethoscope className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                </div>
                <div className="leading-tight">
                  <p className="font-extrabold text-sm" style={{ color: DS.text }}>GlowScan DERM</p>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#a78bfa" }}>Clinical Engine</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed max-w-xs font-medium" style={{ color: DS.body }}>
                Infrastructure d'imagerie faciale algorithmique et de redirection de flux patients. Déployé à Douala, Cameroun.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: DS.text }}>Canal praticien</p>
              <a
                href="https://wa.me/237674377959?text=Bonjour%20GlowScan%20Pro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ color: DS.body }}
                data-testid="link-whatsapp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#6ee7b7" }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                +237 674 377 959
              </a>
              <p className="text-[10px] font-medium" style={{ color: DS.muted }}>Support permanent · Lun-Sam 8h-18h</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: DS.text }}>Sécurité</p>
              <ul className="space-y-2 text-xs font-medium" style={{ color: DS.body }}>
                <li><Link href="/confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                <li><Link href="/confidentialite" className="hover:text-white transition-colors">Réglementation des données</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium" style={{ borderTop: `1px solid ${DS.border}`, color: DS.muted }}>
            <p>© {new Date().getFullYear()} GlowScan Africa. Tous droits réservés.</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: "#6ee7b7" }} />
              Chiffrement de bout en bout conforme MINSANTÉ
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
