import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════════
// Landing GlowScan DERM — glow-scan.com/derm
// Thème clair, médical (blanc + dégradé teal→bleu, identité logo).
// Illustrations SVG dessinées (pas d'emoji-icônes). Mobile-first.
// ════════════════════════════════════════════════════════════════════════════

const C = {
  white: "#FFFFFF",
  paleTeal: "#F6FBFA",
  paleTeal2: "#E4FBF5",
  paleTeal3: "#F1FBF9",
  accentFrom: "#00E6B8",
  accentTo: "#2E9FD6",
  gradient: "linear-gradient(135deg, #00E6B8, #2E9FD6)",
  teal: "#00937A",
  tealIcon: "#00B894",
  ink: "#0B1220",
  inkMuted: "#475569",
  inkSoft: "#64748B",
  border: "#E7EEF0",
  borderSoft: "#EEF2F2",
  neutralBorder: "#E2E8ED",
  alertBg: "#FEF3F0",
  alertText: "#C2410C",
  successBg: "#ECFDF5",
  successText: "#059669",
};

const sora = "'Sora', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const jakarta = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay },
});

// ── Icônes ligne (dessinées, style Monetbil) ─────────────────────────────────
function Ico({ name, size = 24, color = C.teal }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, ReactNode> = {
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
    doc: <><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
    chat: <path d="M4 5h16v11H9l-4 3v-3H4z" />,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
    pin: <><path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" /><circle cx="12" cy="11" r="2.4" /></>,
    star: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />,
    check: <path d="M4 12l5 5 11-11" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    phone: <><rect x="7" y="3" width="10" height="18" rx="3" /><path d="M11 18h2" /></>,
    money: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function IcoBox({ name, tone = "teal" }: { name: string; tone?: "teal" | "orange" }) {
  const col = tone === "orange" ? C.alertText : C.teal;
  const bg = tone === "orange" ? C.alertBg : C.paleTeal2;
  return <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name={name} color={col} size={24} /></div>;
}

// ── Logo GlowScan (marque officielle) ─────────────────────────────────────
function LogoMark({ showDerm = true }: { showDerm?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
      <img src="/glowscan-mark.png" width={26} height={26} alt="GlowScan" style={{ display: "block", flexShrink: 0 }} />
      <span style={{ fontFamily: sora, fontSize: "clamp(14px, 2vw, 16px)", fontWeight: 800, color: C.ink, whiteSpace: "nowrap" }}>
        GlowScan{showDerm && <span style={{ color: C.inkMuted, fontWeight: 700 }}> DERM</span>}
      </span>
    </div>
  );
}

// ── Photo héro : visuel de marque GlowScan Africa (bords fondus dans la page) ─
function HeroArt() {
  return (
    <img
      src="/glowscan-derm-hero-full.webp"
      alt="GlowScan Africa — la HealthTech africaine n'est plus une promesse, c'est un mouvement"
      style={{ display: "block", width: "100%", maxWidth: 640, height: "auto" }}
    />
  );
}

const FEATURES = [
  { icon: "folder", title: "Dossier patient numérisé", text: "Créez et retrouvez chaque dossier en 10 secondes." },
  { icon: "mic", title: "Dictée vocale", text: "Parlez, GlowScan transcrit vos notes cliniques." },
  { icon: "shield", title: "Aide au diagnostic", text: "Suggestion indicative — vous restez décisionnaire." },
  { icon: "doc", title: "Rapport PDF automatique", text: "Rapport professionnel généré en 1 clic, à votre nom." },
  { icon: "chat", title: "Envoi WhatsApp", text: "Le patient reçoit son rapport automatiquement." },
  { icon: "globe", title: "Profil public sur Google", text: "Vos patients vous trouvent. Vos confrères vous rejoignent." },
  { icon: "users", title: "Second avis entre confrères", text: "Un cas difficile ? Envoyez-le, anonymisé, à un confrère du réseau." },
];

const FAQS = [
  { q: "L'IA va-t-elle remplacer mon diagnostic ?", a: "Non. Le diagnostic IA est marqué « indicatif » dans GlowScan. Seule votre validation apparaît dans le rapport final signé de votre nom. Vous êtes et restez le médecin décisionnaire." },
  { q: "Comment mes patients me trouvent-ils ?", a: "Via votre profil public GlowScan visible sur Google, et via les patients B2C dont le score est faible — GlowScan les oriente automatiquement vers un dermatologue disponible dans leur région." },
  { q: "Est-ce que je peux consulter des patients hors de ma ville ?", a: "Oui. Les consultations en ligne vous permettent de recevoir des patients de Douala, Yaoundé, Cotonou, Kinshasa — partout où GlowScan est actif. Vous consultez, vous signez, vous êtes payé directement sur Mobile Money." },
  { q: "Le « second avis entre confrères », c'est quoi exactement ?", a: "Quand un cas vous laisse un doute, vous l'envoyez à un confrère dermatologue du réseau GlowScan pour avoir son avis. Vous partagez seulement la photo, l'âge et le sexe du patient — jamais son nom ni son téléphone. Le confrère vous répond dans l'application. Vous restez le médecin traitant : c'est un deuxième regard entre spécialistes, pas une délégation. Rien n'est visible du patient." },
  { q: "Que se passe-t-il après les 14 jours gratuits ?", a: "Vous choisissez de continuer. Aucun prélèvement automatique. Aucune carte bancaire. Vous payez quand vous voulez, par Mobile Money." },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 2px", textAlign: "left" }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{q}</span>
        <span style={{ fontSize: 18, color: C.teal, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>⌄</span>
      </button>
      {open && <p style={{ fontSize: 13.5, color: C.inkMuted, lineHeight: 1.65, margin: "0 2px 16px" }}>{a}</p>}
    </div>
  );
}

export default function DermLanding() {
  useSEO({
    title: "GlowScan DERM — Vos patients viennent à vous, partout en Afrique",
    description: "L'outil des dermatologues africains : dossier patient numérisé, rapport PDF en 1 clic envoyé sur WhatsApp, profil public sur Google et consultations en ligne dans toute l'Afrique. 14 jours gratuits.",
    canonical: "https://glow-scan.com/derm",
  });

  const [, setLocation] = useLocation();
  const { data: accData } = useProAccount();
  useEffect(() => {
    if (accData?.account) setLocation("/derm/dashboard");
    else if (accData?.user?.role === "secretary") setLocation("/derm/patients");
  }, [accData]);

  const [dermCount, setDermCount] = useState<number>(4);
  useEffect(() => {
    fetch("/api/pro/partners-count").then((r) => r.json()).then((d) => { if (typeof d.count === "number" && d.count > 0) setDermCount(d.count); }).catch(() => {});
  }, []);

  const wrap: React.CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 clamp(14px, 4vw, 40px)" };
  const cardGrid = (min = 260): React.CSSProperties => ({ display: "grid", gap: "clamp(14px, 2vw, 22px)", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` });
  const btnPrimary: React.CSSProperties = { display: "inline-block", background: C.gradient, color: "#fff", fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 12, textDecoration: "none", textAlign: "center", boxShadow: "0 14px 26px -10px rgba(0,150,128,.5)" };
  const btnOutline: React.CSSProperties = { display: "inline-block", background: "#fff", color: C.ink, fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 12, border: `1.5px solid ${C.neutralBorder}`, textDecoration: "none", textAlign: "center" };
  const kicker = (t: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.teal });
  const h2: React.CSSProperties = { fontFamily: sora, fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 };
  const gradientText: React.CSSProperties = { background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

  return (
    <div style={{ fontFamily: jakarta, background: C.white, color: C.ink, overflowX: "hidden" }}>

      {/* Header */}
      <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: "clamp(62px, 7vw, 78px)", position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)" }}>
        <LogoMark />
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 22px)" }}>
          <Link href="/derm/connexion"><span style={{ fontSize: "clamp(12px, 1.6vw, 13.5px)", fontWeight: 700, color: C.inkMuted, cursor: "pointer", whiteSpace: "nowrap" }}>Connexion</span></Link>
          <Link href="/derm/inscription"><span style={{ ...btnPrimary, padding: "9px clamp(10px, 2vw, 16px)", fontSize: "clamp(11.5px, 1.6vw, 13px)", whiteSpace: "nowrap" }}>14 jours gratuits</span></Link>
        </div>
      </div>

      {/* ══ 1. HERO ══ */}
      <section style={{ background: C.white, paddingTop: "clamp(32px, 7vw, 96px)", paddingBottom: "clamp(48px, 9vw, 120px)" }}>
        <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "clamp(24px, 4vw, 40px)" }}>
          <motion.div {...fade()} style={{ maxWidth: 720 }}>
            <p style={kicker("")}>Dermatologie numérique · Afrique</p>
            <h1 style={{ fontFamily: sora, fontSize: "clamp(34px, 4.5vw, 54px)", lineHeight: 1.14, fontWeight: 900, margin: "16px 0 18px", letterSpacing: "-1px", color: C.ink }}>
              Vos patients viennent à vous.<br /><span style={gradientText}>Votre expertise va partout en Afrique.</span>
            </h1>
            <p style={{ fontSize: 15.5, lineHeight: 1.65, color: C.inkMuted, maxWidth: 640, margin: "0 auto" }}>
              GlowScan DERM numérise votre cabinet et génère votre rapport médical en 3 minutes — envoyé sur le WhatsApp du patient. Vous consultez, GlowScan documente.
            </p>
          </motion.div>
          <motion.div {...fade(0.1)} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link href="/derm/inscription"><span style={btnPrimary}>Créer mon profil gratuitement</span></Link>
          </motion.div>
          <motion.div {...fade(0.2)}><HeroArt /></motion.div>
        </div>
      </section>

      {/* ══ 2. BARRE DE CONFIANCE ══ */}
      <section style={{ background: C.white, padding: "clamp(18px, 3vw, 28px) 0" }}>
        <div style={{ ...wrap, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{dermCount} dermatologues actifs</span>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Cameroun · Bénin · RDC</span>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>Présenté au Congrès SODAF — Ouagadougou 2026</span>
        </div>
      </section>

      {/* ══ 3. LE PROBLÈME ══ */}
      <section style={{ background: C.paleTeal, padding: "clamp(48px, 8vw, 96px) 0" }}>
        <div style={wrap}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", margin: "0 0 8px" }}>Il est 19h. Il vous reste 3 dossiers à écrire à la main.</motion.h2>
          <motion.p {...fade(0.05)} style={{ textAlign: "center", fontSize: 14.5, color: C.inkMuted, margin: "0 auto clamp(28px, 4vw, 44px)", maxWidth: 560 }}>Chaque jour, l'administratif vous vole du temps que vous devriez passer avec vos patients.</motion.p>
          <div style={cardGrid(280)}>
            {[
              { i: "doc", t: "Rédiger vos comptes-rendus à la main", s: "30 minutes par dossier en moyenne." },
              { i: "chat", t: "Répondre aux questions WhatsApp de vos patients", s: "Après 20h, gratuitement, sans structure." },
              { i: "folder", t: "Retrouver un ancien dossier patient", s: "Dans des carnets illisibles depuis 5 ans." },
            ].map((b, k) => (
              <motion.div key={k} {...fade(k * 0.08)} style={{ display: "flex", gap: 14, alignItems: "center", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "clamp(16px, 2vw, 22px)" }}>
                <IcoBox name={b.i} tone="orange" />
                <div><p style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>{b.t}</p><p style={{ fontSize: 13, color: C.inkMuted, margin: "3px 0 0" }}>{b.s}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4. LA SOLUTION — 6 FEATURES ══ */}
      <section style={{ background: C.white, padding: "clamp(52px, 9vw, 104px) 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ textAlign: "center", marginBottom: "clamp(28px, 4vw, 44px)" }}>
            <p style={kicker("")}>Ce que GlowScan DERM fait pour vous</p>
            <h2 style={{ ...h2, margin: "10px 0 0" }}>Tout votre cabinet. Dans votre téléphone.</h2>
          </motion.div>
          <div style={cardGrid(260)}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} {...fade((i % 2) * 0.06)} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "clamp(16px, 2vw, 22px)" }}>
                <IcoBox name={f.icon} />
                <div><p style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>{f.title}</p><p style={{ fontSize: 13, color: C.inkMuted, margin: "3px 0 0", lineHeight: 1.5 }}>{f.text}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8. COMMENT ÇA MARCHE — FLUX 4 ÉTAPES ══ */}
      <section style={{ background: C.white, padding: "clamp(52px, 9vw, 104px) 0" }}>
        <div style={wrap}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", margin: "0 0 clamp(28px, 4vw, 44px)" }}>Comment ça marche</motion.h2>
          <div style={cardGrid(260)}>
            {[
              { n: "1", i: "phone", t: "Le patient fait son analyse (gratuit)", d: "Photo de peau + Glow Score sur son téléphone." },
              { n: "2", i: "shield", t: "GlowScan détecte un cas sérieux", d: "Score faible → recommandation de consulter un dermatologue." },
              { n: "3", i: "pin", t: "Le patient consulte VOTRE profil et paie", d: "Il vous trouve, voit vos avis, et réserve sa consultation." },
              { n: "4", i: "chat", t: "Vous consultez, le PDF part sur WhatsApp", d: "Vous documentez, signez, le patient reçoit son rapport." },
            ].map((s, k) => (
              <motion.div key={k} {...fade(k * 0.07)} style={{ display: "flex", gap: 14, alignItems: "center", background: C.paleTeal, borderRadius: 16, padding: "clamp(16px, 2vw, 22px)" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.gradient, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
                <IcoBox name={s.i} />
                <div><p style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, margin: 0 }}>{s.t}</p><p style={{ fontSize: 12.5, color: C.inkMuted, margin: "2px 0 0" }}>{s.d}</p></div>
              </motion.div>
            ))}
          </div>
          <motion.p {...fade(0.1)} style={{ textAlign: "center", fontSize: 15, fontWeight: 800, color: C.teal, marginTop: "clamp(22px, 3vw, 32px)" }}>
            Tout ça depuis votre téléphone. Sans vous déplacer. Sans paperasse.
          </motion.p>
        </div>
      </section>

      {/* ══ 7. PROFIL PUBLIC DERMATOLOGUE ══ */}
      <section style={{ background: C.paleTeal, padding: "clamp(52px, 9vw, 104px) 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ textAlign: "center", marginBottom: "clamp(26px, 4vw, 40px)" }}>
            <p style={kicker("")}>Inclus dans l'abonnement</p>
            <h2 style={{ ...h2, margin: "10px 0 8px" }}>Votre page professionnelle sur internet</h2>
            <p style={{ fontSize: 14.5, color: C.inkMuted, maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
              Chaque dermatologue GlowScan DERM reçoit une page publique visible sur Google. Vos patients vous trouvent. Vos confrères vous rejoignent.
            </p>
          </motion.div>

          {/* Mockup page profil */}
          <motion.div {...fade(0.08)} style={{ maxWidth: 400, margin: "0 auto clamp(26px, 4vw, 40px)", background: "#fff", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 16px 40px rgba(3,105,161,0.1)" }}>
            <div style={{ height: 70, background: C.gradient }} />
            <div style={{ padding: "0 18px 18px", marginTop: -34 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: C.gradient, border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico name="users" color="#fff" size={30} /></div>
                <div style={{ paddingBottom: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: C.ink, margin: 0 }}>Dr [Votre nom]</p>
                  <p style={{ fontSize: 11, color: C.inkMuted, margin: "2px 0 0" }}>Dermatologie · Douala 🇨🇲</p>
                </div>
              </div>
              <div style={{ marginTop: 12, background: C.paleTeal2, border: "1px solid rgba(0,147,122,0.22)", borderRadius: 10, padding: "8px 10px" }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.teal, margin: 0 }}>✦ Dermatologue Certifié GlowScan</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ color: "#f59e0b", letterSpacing: 1 }}>★★★★★</span>
                <span style={{ fontSize: 11, color: C.inkMuted }}>4,9 · 37 avis</span>
              </div>
              <div style={{ marginTop: 12, background: C.gradient, color: "#fff", textAlign: "center", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 800 }}>Consulter en ligne</div>
            </div>
          </motion.div>

          {/* Bénéfices */}
          <motion.div {...fade(0.12)} style={{ maxWidth: 680, margin: "0 auto" }}>
            {[
              "Visible sur Google quand un patient cherche « dermatologue [ville] »",
              "Les patients GlowScan B2C vous sont envoyés selon votre région",
              "Vos confrères vous trouvent et rejoignent le réseau GlowScan",
              "Badge « Dermatologue Certifié GlowScan » affiché",
              "Statistiques de votre activité chaque mois",
            ].map((b) => (
              <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 9 }}>
                <span style={{ marginTop: 2, flexShrink: 0 }}><Ico name="check" color={C.tealIcon} size={18} /></span>
                <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{b}</span>
              </div>
            ))}
          </motion.div>

          {/* 3 étapes */}
          <motion.div {...fade(0.16)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxWidth: 680, margin: "clamp(22px, 3vw, 32px) auto 0" }}>
            {[["1", "Créer son compte", "2 minutes"], ["2", "Compléter son profil", "photo, spécialités"], ["3", "La page est live", "patients & confrères arrivent"]].map(([n, t, s]) => (
              <div key={n} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.gradient, color: "#fff", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>{n}</div>
                <p style={{ fontSize: 12.5, fontWeight: 800, color: C.ink, margin: 0 }}>{t}</p>
                <p style={{ fontSize: 10.5, color: C.inkMuted, margin: "2px 0 0" }}>{s}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 12. DÉSARMER LA PEUR DE L'IA ══ */}
      <section style={{ background: C.white, padding: "clamp(40px, 7vw, 80px) 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 620, margin: "0 auto", background: C.paleTeal2, border: "1.5px solid rgba(0,230,184,0.35)", borderRadius: 20, padding: "clamp(26px, 4vw, 40px) clamp(24px, 4vw, 36px)", textAlign: "center" }}>
            <p style={{ fontFamily: sora, fontSize: 22, fontWeight: 900, color: C.ink, lineHeight: 1.35, margin: 0 }}>
              GlowScan ne diagnostique pas.<br /><span style={gradientText}>GlowScan documente.</span>
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, color: C.teal, margin: "10px 0 0" }}>Vous restez le médecin. Toujours.</p>
          </motion.div>
        </div>
      </section>

      {/* ══ 11. TARIFICATION ══ */}
      <section style={{ background: C.paleTeal, padding: "clamp(52px, 9vw, 104px) 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1.5px solid rgba(46,159,214,0.35)", borderRadius: 22, padding: "clamp(26px, 4vw, 40px)", textAlign: "center" }}>
            <p style={{ fontFamily: sora, fontSize: 30, fontWeight: 900, color: C.ink, margin: 0, letterSpacing: "-0.5px" }}>Tout votre cabinet numérique</p>
            <p style={{ fontSize: 13.5, color: C.inkMuted, margin: "4px 0 0" }}>Commencez avec <strong style={{ color: C.ink }}>14 jours gratuits</strong>.</p>
            <div style={{ background: C.successBg, border: "1px solid rgba(5,150,105,0.25)", borderRadius: 12, padding: "10px 12px", margin: "16px 0" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.successText, margin: 0 }}>Rentabilisé dès votre première consultation en ligne.</p>
            </div>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Ico name="check" color={C.tealIcon} size={17} />
                  <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{f.title}</span>
                </div>
              ))}
            </div>
            <Link href="/derm/inscription"><span style={{ ...btnPrimary, width: "100%", boxSizing: "border-box" }}>Commencer 14 jours gratuits</span></Link>
            <p style={{ fontSize: 11.5, color: C.inkSoft, margin: "12px 0 0", lineHeight: 1.5 }}>Sans carte bancaire. Sans engagement. Paiement Mobile Money MTN ou Orange.</p>
          </motion.div>
        </div>
      </section>

      {/* ══ 14. FAQ ══ */}
      <section style={{ background: C.white, padding: "clamp(44px, 7vw, 88px) 0" }}>
        <div style={{ ...wrap, maxWidth: 720 }}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", fontSize: "clamp(20px, 2.4vw, 26px)", margin: "0 0 clamp(18px, 3vw, 28px)" }}>Questions fréquentes</motion.h2>
          <motion.div {...fade(0.05)}>{FAQS.map((f, i) => <Faq key={i} q={f.q} a={f.a} />)}</motion.div>
        </div>
      </section>

      {/* ══ 13. CTA FINAL ══ */}
      <section style={{ background: C.gradient, padding: "clamp(50px, 9vw, 110px) 0", textAlign: "center" }}>
        <div style={wrap}>
          <motion.div {...fade()}>
            <h2 style={{ fontFamily: sora, fontSize: "clamp(25px, 3.5vw, 38px)", fontWeight: 900, color: "#fff", margin: "0 0 clamp(20px, 3vw, 28px)", letterSpacing: "-0.5px", lineHeight: 1.3 }}>
              Rejoignez les dermatologues qui consultent<br />déjà toute l'Afrique depuis leur cabinet.
            </h2>
            <Link href="/derm/inscription"><span style={{ display: "inline-block", background: "#fff", color: C.teal, fontWeight: 900, fontSize: 15, padding: "15px 30px", borderRadius: 12, textDecoration: "none" }}>Créer mon profil gratuitement — 14 jours</span></Link>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", margin: "16px auto 0", maxWidth: 420, lineHeight: 1.5 }}>
              Votre profil est en ligne en moins de 5 minutes. Paiement Mobile Money après les 14 jours gratuits.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.white, padding: "clamp(30px, 5vw, 56px) 0", borderTop: `1px solid ${C.border}` }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><LogoMark /></div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <Link href="/derm/connexion"><span style={{ fontSize: 12.5, color: C.inkMuted, cursor: "pointer" }}>Connexion</span></Link>
            <a href="https://wa.me/237674377959" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: C.inkMuted, textDecoration: "none" }}>Support</a>
            <a href="https://glow-scan.com" style={{ fontSize: 12.5, color: C.inkMuted, textDecoration: "none" }}>glow-scan.com</a>
          </div>
          <p style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
            GlowScan DERM est un outil d'aide à la pratique médicale. Il ne se substitue pas au diagnostic médical et à la responsabilité du praticien.
          </p>
          <p style={{ fontSize: 11, color: C.inkSoft, margin: "12px 0 0" }}>
            © {new Date().getFullYear()} <strong>GlowScan Africa</strong> · GlowScan DERM est un produit GlowScan Africa.
          </p>
        </div>
      </footer>
    </div>
  );
}
