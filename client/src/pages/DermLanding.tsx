import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Clock, FileText, Users, CheckCircle2, MessageCircle, ArrowRight,
  Sparkles, Brain, Shield, TrendingUp, Star,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const DS = {
  bg: "#0d0a0e",
  surface: "#13101f",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  border: "rgba(167,139,250,0.18)",
  text: "#f3f0ff",
  muted: "rgba(200,185,255,0.65)",
  subtle: "rgba(255,255,255,0.35)",
};

const features = [
  "Analyse IA zone par zone (antécédents intégrés)",
  "Clinical Override — modifiez ou remplacez le diagnostic IA",
  "Notes cliniques incluses dans le PDF",
  "Classification patients colorée (Priorité / Suivi / Stable / Résolu)",
  "Suivi évolution GlowScore dans le temps",
  "Consultation en ligne en moins de 30 minutes",
  "Signature & cachet dermatologue sur le PDF",
  "Tableau de bord multi-patients",
];

const benefits = [
  {
    icon: <Clock size={24} color={DS.violet} />,
    title: "Gagnez 30min par consultation",
    desc: "L'IA prépare le pré-diagnostic avant même que le patient arrive. Vous validez, corrigez, et signez.",
  },
  {
    icon: <FileText size={24} color={DS.violet} />,
    title: "Rapport PDF à votre nom",
    desc: "Document médical professionnel avec votre signature et cachet, exportable en 1 clic.",
  },
  {
    icon: <Users size={24} color={DS.violet} />,
    title: "Nouveaux patients qualifiés",
    desc: "Votre profil visible sur toutes les analyses GlowScan. Les patients viennent à vous pré-diagnostiqués.",
  },
];

const pricingTiers = [
  {
    name: "Partenaire Référencé",
    price: "Gratuit",
    period: "",
    accent: DS.violet,
    features: [
      "Profil visible sur toutes les analyses",
      "Patients redirigés vers votre WhatsApp",
      "Commission 2 000 FCFA / consultation",
    ],
    cta: "Devenir partenaire",
    href: "/derm/inscription",
    highlight: false,
  },
  {
    name: "GlowScan DERM",
    price: "30 000",
    period: " FCFA/mois",
    accent: DS.violet,
    features: [
      "Tout le partenariat gratuit inclus",
      "Tableau de bord médical complet",
      "PDF cliniques exportables à votre nom",
      "Clinical Override (correction IA)",
      "Notes praticien dans le PDF",
      "14 jours d'essai gratuit",
    ],
    cta: "Essayer 14 jours gratuit",
    href: "/derm/inscription",
    highlight: true,
  },
  {
    name: "Clinique",
    price: "50 000 – 100 000",
    period: " FCFA/mois",
    accent: "#10b981",
    features: [
      "Tous les dermatologues de la clinique inclus",
      "Tableau de bord directeur médical",
      "Rapport agrégé mensuel automatique",
      "Branding clinique sur les PDFs",
      "1-3 dermatologues : 50 000 FCFA",
      "4-7 dermatologues : 75 000 FCFA",
      "8+ dermatologues : 100 000 FCFA",
    ],
    cta: "Contacter le commercial",
    href: "https://wa.me/237674377959?text=Bonjour%2C+je+suis+int%C3%A9ress%C3%A9+par+GlowScan+DERM+Clinique",
    highlight: false,
    external: true,
  },
];

function Nav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(13,10,14,0.85)", backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${DS.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 24px",
    }}>
      <span style={{ fontSize: 18, fontWeight: 900, color: DS.violet }}>✦ GlowScan DERM</span>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/derm/connexion">
          <span style={{ fontSize: 13, color: DS.muted, cursor: "pointer", fontWeight: 600 }}>Connexion</span>
        </Link>
        <Link href="/derm/inscription">
          <span style={{
            fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer",
            background: DS.violet, padding: "8px 16px", borderRadius: 9999,
          }}>Essai gratuit</span>
        </Link>
      </div>
    </nav>
  );
}

export default function DermLanding() {
  useSEO({
    title: "GlowScan Derm — Outil IA pour Dermatologues et Professionnels de Santé",
    description: "Plateforme IA de diagnostic dermatologique pour professionnels. Analysez les patients, suivez les dossiers et accédez à un dataset de peaux africaines certifié.",
    canonical: "https://glow-scan.com/derm",
  });

  return (
    <div style={{ background: DS.bg, minHeight: "100vh", color: DS.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}>
      <Nav />

      {/* ── HERO ── */}
      <section style={{ paddingTop: 120, paddingBottom: 80, textAlign: "center", maxWidth: 700, margin: "0 auto", padding: "120px 24px 80px" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(124,58,237,0.12)", border: `1px solid ${DS.border}`, borderRadius: 9999, padding: "4px 14px", marginBottom: 20 }}>
            <Sparkles size={12} color={DS.violetMid} />
            <span style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid, letterSpacing: ".5px" }}>PLATEFORME DERMATOLOGIQUE IA</span>
          </div>

          <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1px" }}>
            GlowScan <span style={{ color: DS.violet }}>DERM</span>
          </h1>
          <p style={{ fontSize: 20, fontWeight: 700, color: DS.muted, marginBottom: 12 }}>
            L'IA dermatologique faite pour vous.
          </p>
          <p style={{ fontSize: 16, color: DS.subtle, lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
            Analysez vos patients en 30 minutes. Générez des rapports PDF cliniques à votre nom.
            Recevez des patients qualifiés directement sur WhatsApp.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/derm/inscription">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ background: DS.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "14px 28px", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                Essayer gratuitement 14 jours <ArrowRight size={16} />
              </motion.button>
            </Link>
            <Link href="/derm/demo">
              <button style={{ background: "transparent", color: DS.muted, border: `1px solid ${DS.border}`, borderRadius: 9999, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                ▶ Voir la démo interactive
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── BÉNÉFICES ── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {benefits.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: "24px" }}>
              <div style={{ marginBottom: 12 }}>{b.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: DS.text }}>{b.title}</h3>
              <p style={{ fontSize: 13, color: DS.muted, lineHeight: 1.6 }}>{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 60px" }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: "center", marginBottom: 32 }}>
          Tout ce dont vous avez besoin
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle2 size={16} color={DS.violet} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: DS.muted }}>{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── TARIFS ── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: "center", marginBottom: 8 }}>Tarifs simples et transparents</h2>
        <p style={{ textAlign: "center", color: DS.muted, fontSize: 14, marginBottom: 40 }}>14 jours d'essai gratuit — aucune carte bancaire requise</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {pricingTiers.map((tier, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              style={{
                background: tier.highlight ? "rgba(124,58,237,0.08)" : DS.surface,
                border: `${tier.highlight ? 2 : 1}px solid ${tier.highlight ? tier.accent : DS.border}`,
                borderRadius: 20, padding: "28px 24px", position: "relative",
              }}>
              {tier.highlight && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: DS.violet, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 9999, letterSpacing: ".5px" }}>
                  RECOMMANDÉ
                </div>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: DS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>{tier.name}</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: tier.price === "Gratuit" ? 32 : 26, fontWeight: 900, color: tier.highlight ? DS.violet : DS.text }}>{tier.price}</span>
                <span style={{ fontSize: 13, color: DS.muted }}>{tier.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {tier.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <CheckCircle2 size={14} color={tier.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: DS.muted }}>{f}</span>
                  </div>
                ))}
              </div>
              {(tier as any).external ? (
                <a href={tier.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: tier.highlight ? DS.violet : "rgba(255,255,255,0.06)", border: tier.highlight ? "none" : `1px solid ${DS.border}`, color: tier.highlight ? "#fff" : DS.muted, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                    {tier.cta}
                  </button>
                </a>
              ) : (
                <Link href={tier.href}>
                  <button style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: tier.highlight ? DS.violet : "rgba(255,255,255,0.06)", border: tier.highlight ? "none" : `1px solid ${DS.border}`, color: tier.highlight ? "#fff" : DS.muted, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                    {tier.cta}
                  </button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ textAlign: "center", padding: "60px 24px 100px" }}>
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 24, maxWidth: 560, margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
            {[1, 2, 3].map(i => <Star key={i} size={16} color="#fbbf24" fill="#fbbf24" />)}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>
            3 dermatologues partenaires déjà actifs.
          </h2>
          <p style={{ color: DS.muted, fontSize: 15, marginBottom: 28 }}>
            Rejoignez le réseau GlowScan DERM.
          </p>
          <Link href="/derm/inscription">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ background: DS.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Commencer l'essai gratuit <ArrowRight size={16} />
            </motion.button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${DS.border}`, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: DS.subtle }}>GlowScan DERM © 2026 · Spécialisé Peaux Africaines · <Link href="/confidentialite"><span style={{ color: DS.muted, cursor: "pointer" }}>Confidentialité</span></Link></p>
      </footer>
    </div>
  );
}
