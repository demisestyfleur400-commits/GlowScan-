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
  Sparkles,
  Layers,
  ArrowUpRight
} from "lucide-react";

export default function Pro() {
  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div
      className="min-h-screen bg-[#090d16] text-slate-100 antialiased font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* ── NAV TOP ────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#090d16]/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/pro" className="flex items-center gap-2.5" data-testid="link-pro-home">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600/10 border border-blue-500/20">
              <Stethoscope className="w-4 h-4 text-blue-400" />
            </div>
            <div className="leading-tight">
              <p className="text-white font-black text-sm tracking-wide uppercase font-display">GlowScan Pro</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-bold">Clinical Engine</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <a href="#educ" className="hover:text-white transition-colors">Infrastructure</a>
            <a href="#features" className="hover:text-white transition-colors">Spécifications</a>
            <a href="#pricing" className="hover:text-white transition-colors">Licences B2B</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/pro/connexion"
              className="hidden sm:inline-flex text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white"
              data-testid="link-login-top"
            >
              Portail
            </Link>
            <Link
              href="/pro/inscription"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
              data-testid="link-trial-top"
            >
              Essai Clinique
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          1. HERO — Mode Laboratoire Clinique Dark Tech
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center justify-center py-32 px-6 lg:px-8 overflow-hidden border-b border-slate-900"
      >
        {/* Grille et Halos Lumineux Laser */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[140px] opacity-10 bg-blue-600 pointer-events-none" />
        <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 bg-emerald-500 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800"
            data-testid="badge-pro"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Système d'Imagerie Algorithmique Dermatologique
            </span>
          </motion.div>

          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase font-display max-w-4xl mx-auto leading-none"
              data-testid="text-hero-title"
            >
              L'IA au service de la <span className="text-blue-500">dermatologie noire</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-medium"
              data-testid="text-hero-subtitle"
            >
              Prédiagnostic, cartographie d'imperfections et redirection de flux patients. Conçu spécifiquement pour les phototypes V & VI en Afrique Centrale.
            </motion.p>
          </div>

          {/* Simulateur Terminal Clinique */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden border border-slate-800 bg-slate-950 text-left"
            data-testid="hero-demo"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              </div>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">CORE_ENGINE // core-ai.glowscan.pro</span>
              <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-0 text-[9px] font-black tracking-widest uppercase py-0.5">
                Secure Stack
              </Badge>
            </div>

            <div className="p-6 space-y-3 font-mono text-xs text-slate-400">
              {[
                { step: "01", label: "Acquisition de la matrice d'imagerie HD (Phototype V/VI)", status: "COMPLETED", time: "0.8s", color: "text-blue-400" },
                { step: "02", label: "Filtrage et élimination des reflets lumineux (Spécificité équatoriale)", status: "COMPLETED", time: "1.1s", color: "text-blue-400" },
                { step: "03", label: "Segmentation neuronale : Acné inf., Hyperpigmentation, Chéloïdes", status: "PROCESSING", time: "2.3s", color: "text-amber-400 animate-pulse" },
                { step: "04", label: "Compilation du rapport technique au format PDF clinique", status: "PENDING", time: "wait", color: "text-slate-600" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-900 gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-[10px] ${s.color}`}>[{s.step}]</span>
                    <span className="text-slate-300 font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-[10px]">
                    <span className={`font-bold ${s.color}`}>{s.status}</span>
                    <span className="text-slate-600 font-bold">{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
          >
            <Link
              href="/pro/inscription"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/10 transition-all inline-flex items-center justify-center gap-2"
              data-testid="button-trial-hero"
            >
              Activer l'essai 14 jours
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#pricing"
              className="border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all inline-flex items-center justify-center"
              data-testid="button-demo"
            >
              Grille tarifaire
            </a>
          </motion.div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            Zéro engagement · Hébergement Chiffré · Architecture PWA Intégrée
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. SECTION INFRASTRUCTURE / ROI (ÉDUC)
          ═══════════════════════════════════════════════════════════════ */}
      <section id="educ" className="py-24 px-6 lg:px-8 border-b border-slate-900 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 block mb-2">
              Biais Clinique Résolu
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white font-display">
              Pourquoi GlowScan Pro ?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: <Database className="w-4 h-4" />,
                tag: "La Réalité du Terrain",
                title: "Datasets Peaux Noires",
                body: "Les modèles globaux sont entraînés à 90 % sur des peaux claires. GlowScan intègre un dataset calibré pour la physiologie cutanée d'Afrique Centrale.",
                color: "border-blue-500/20"
              },
              {
                icon: <TrendingUp className="w-4 h-4" />,
                tag: "Modèle B2B SaaS",
                title: "Génération de Flux & ROI",
                body: "Redirection automatisée des patients de notre app B2C vers votre cabinet. Encaissez de nouvelles consultations privées chaque mois.",
                color: "border-emerald-500/20"
              },
              {
                icon: <ShieldCheck className="w-4 h-4" />,
                tag: "Sécurité Médicale",
                title: "Anonymisation Absolue",
                body: "Données patients hautement chiffrées. Traçabilité complète des dossiers médicaux pour une confidentialité réglementaire stricte.",
                color: "border-slate-800"
              },
            ].map((c, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`bg-slate-950 rounded-2xl p-6 border ${c.color} flex flex-col justify-between`}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 text-white mb-5 border border-slate-800">
                    {c.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">{c.tag}</span>
                  <h3 className="text-base font-black uppercase tracking-tight text-white mb-3 font-display">{c.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{c.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. FEATURES — La Suite Logicielle Clinique
          ═══════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6 lg:px-8 bg-slate-950/40 border-b border-slate-900">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 block mb-2">
              Spécifications Pro
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white font-display">
              Outils d'Analyse Intégrés
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {[
              { icon: <Microscope className="w-4 h-4" />, title: "Prédiagnostic Instantané", desc: "Scan d'image à haute résolution. Identification des pathologies majeures en 5 secondes." },
              { icon: <BarChart3 className="w-4 h-4" />, title: "Console Praticien", desc: "Suivi chronologique des fiches patients, historique des scores d'évolution cutanée." },
              { icon: <FileText className="w-4 h-4" />, title: "Export PDF Signé", desc: "Génération automatique de comptes-rendus cliniques avec le logo de votre cabinet." },
              { icon: <Smartphone className="w-4 h-4" />, title: "Passerelle de Prise de RDV", desc: "Synchronisation native avec la file d'attente et l'agenda de votre structure médicale." },
              { icon: <Lock className="w-4 h-4" />, title: "Chiffrement End-to-End", desc: "Sécurisation des photos et diagnostics. Zéro fuite de données confidentielles." },
              { icon: <Cog className="w-4 h-4" />, title: "Intégration API REST", desc: "Endpoints documentés pour connecter GlowScan Pro à vos logiciels internes existants." },
            ].map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-slate-950 rounded-2xl p-6 border border-slate-900 hover:border-slate-800 transition-all flex flex-col justify-between"
                data-testid={`card-feature-${i}`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600/10 text-blue-400 mb-4 border border-blue-500/10">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-white mb-2 font-display">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. PRICING — Grille des Licences SaaS (Monétisation)
          ═══════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 block mb-2">
              Tarification B2B
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white font-display">
              Sélectionnez votre licence
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {[
              {
                name: "Découverte",
                price: "0",
                unit: "FCFA",
                period: "/ à vie",
                desc: "Pour évaluer l'outil en cabinet",
                features: ["50 scans d'imagerie / mois", "Console patient standard", "Support communautaire"],
                cta: "Démarrer",
                highlight: false,
              },
              {
                name: "Cabinet Pro",
                price: "15 000",
                unit: "FCFA",
                period: "/ mois",
                desc: "Pour praticiens indépendants",
                features: ["Scans et analyses illimités", "Rapports cliniques PDF brandés", "Génération de flux patients B2C", "Accès API standard", "Support technique prioritaire"],
                cta: "Activer la licence Pro",
                highlight: true,
              },
              {
                name: "Clinique / Labo",
                price: "30 000",
                unit: "FCFA",
                period: "/ mois",
                desc: "Pour structures multi-praticiens",
                features: ["Tout le plan Cabinet Pro", "Comptes praticiens multiples", "Intégration sur-mesure", "Onboarding sur site à Douala/Yaoundé", "Garantie de disponibilité (SLA)"],
                cta: "Ouvrir un compte Clinique",
                highlight: false,
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative bg-slate-950 rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                  p.highlight
                    ? "border-blue-500 shadow-2xl shadow-blue-600/5 md:scale-[1.03] z-10"
                    : "border-slate-900 hover:border-slate-800"
                }`}
                data-testid={`card-pricing-${p.name.toLowerCase()}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white bg-blue-600 shadow-md">
                    Licence recommandée
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">{p.name}</span>
                    <p className="text-xs text-slate-400 font-medium leading-normal">{p.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1 pt-2 border-b border-slate-900 pb-4">
                    <span className="text-3xl font-black text-white font-mono">{p.price}</span>
                    <span className="text-xs font-black text-slate-300">{p.unit}</span>
                    <span className="text-xs font-bold text-slate-500 ml-1">{p.period}</span>
                  </div>

                  <ul className="space-y-3 pt-2">
                    {p.features.map((feat, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-xs font-medium text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-900">
                  {p.name === "Clinique / Labo" ? (
                    <a
                      href="https://wa.me/237674377959?text=Bonjour%20GlowScan%20Pro%20-%20Plan%20Clinique"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-3.5 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-1.5"
                      data-testid={`button-pricing-${p.name.toLowerCase()}`}
                    >
                      <span>Contacter l'équipe</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <Link
                      href="/pro/inscription"
                      className={`block w-full text-center py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        p.highlight
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/10"
                          : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                      data-testid={`button-pricing-${p.name.toLowerCase()}`}
                    >
                      {p.cta}
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Validation Metrics Bottom */}
          <motion.div {...fadeUp} className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mt-20 pt-10 border-t border-slate-900">
            {[
              { v: "10 000+", l: "Dataset Localisé", icon: <Layers className="w-4 h-4" /> },
              { v: "95 %", l: "Précision Validée", icon: <Activity className="w-4 h-4" /> },
              { v: "Secured", l: "Chiffrement Chiffres", icon: <Lock className="w-4 h-4" /> },
            ].map((m, i) => (
              <div key={i} className="text-center space-y-1">
                <div className="inline-flex w-8 h-8 rounded-lg items-center justify-center bg-slate-900 text-blue-400 border border-slate-800 mx-auto">
                  {m.icon}
                </div>
                <p className="text-xl font-black text-white font-mono">{m.v}</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{m.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. FOOTER — Cohérence de l'infrastructure
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-16 px-6 lg:px-8 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600/10 border border-blue-500/20">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="leading-tight">
                  <p className="font-black text-sm uppercase tracking-wide text-white">GlowScan Pro</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-bold">Clinical Engine</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-medium">
                Infrastructure d'imagerie faciale algorithmique et de redirection de flux patients. Déployé à Douala, Cameroun.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-white">Canal Praticien</p>
              <a
                href="https://wa.me/237674377959?text=Bonjour%20GlowScan%20Pro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                data-testid="link-whatsapp"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                +237 674 377 959
              </a>
              <p className="text-[10px] font-medium text-slate-500">Support opérationnel permanent · Lun-Sam 8h-18h</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-white">Sécurité</p>
              <ul className="space-y-2 text-xs font-medium text-slate-400">
                <li><Link href="/confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                <li><Link href="/confidentialite" className="hover:text-white transition-colors">Réglementation des Données</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-slate-500">
            <p>© {new Date().getFullYear()} GlowScan. Tous droits réservés.</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Chiffrement de bout en bout conforme MINSANTÉ
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
