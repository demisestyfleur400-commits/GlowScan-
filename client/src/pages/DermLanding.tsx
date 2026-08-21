import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════════
// Landing GlowScan DERM — glow-scan.com/derm
// Thème clair, médical (blanc + bleu), violet réservé aux CTA.
// Illustrations SVG dessinées (pas d'emoji-icônes). Mobile-first.
// ════════════════════════════════════════════════════════════════════════════

const C = {
  white: "#FFFFFF", lightBlue: "#F0F9FF", blue: "#0369A1", blueBright: "#0891B2",
  violet: "#7C3AED", ink: "#0F0A1E", inkMuted: "#475569", inkSoft: "#94A3B8",
  border: "#E2ECF5", green: "#10B981",
};

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay },
});

// ── Icônes ligne (dessinées, style Monetbil) ─────────────────────────────────
function Ico({ name, size = 24, color = C.blue }: { name: string; size?: number; color?: string }) {
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

function IcoBox({ name, tone = "blue" }: { name: string; tone?: "blue" | "violet" | "green" }) {
  const col = tone === "violet" ? C.violet : tone === "green" ? C.green : C.blue;
  const bg = tone === "violet" ? "rgba(124,58,237,0.08)" : tone === "green" ? "rgba(16,185,129,0.1)" : "rgba(8,145,178,0.08)";
  return <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name={name} color={col} size={24} /></div>;
}

// ── Illustration héro : dermatologue au travail (flat, simple) ────────────────
function HeroArt() {
  return (
    <svg viewBox="0 0 300 240" width="100%" style={{ maxWidth: 340, height: "auto" }} aria-hidden>
      <circle cx="150" cy="120" r="104" fill="#E0F2FE" />
      {/* personnage : blouse */}
      <path d="M96 220 q0 -58 54 -58 q54 0 54 58 z" fill="#0369A1" />
      <rect x="140" y="150" width="20" height="22" fill="#F1C6A0" />
      {/* tête */}
      <circle cx="150" cy="128" r="26" fill="#8B5E3C" />
      <path d="M126 122 q24 -26 48 0 q0 -20 -24 -22 q-24 2 -24 22z" fill="#241a12" />
      {/* stéthoscope */}
      <path d="M138 168 q-14 22 4 30 q18 8 18 -12" fill="none" stroke="#0891B2" strokeWidth="4" strokeLinecap="round" />
      <circle cx="160" cy="186" r="6" fill="#0891B2" />
      {/* tablette / dossier tenu */}
      <rect x="176" y="176" width="52" height="66" rx="8" fill="#fff" stroke="#0369A1" strokeWidth="2.5" transform="rotate(-8 202 209)" />
      <line x1="184" y1="194" x2="220" y2="188" stroke="#7C3AED" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-8 202 209)" />
      <line x1="184" y1="206" x2="216" y2="200" stroke="#cfe3f2" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-8 202 209)" />
      <line x1="184" y1="218" x2="220" y2="212" stroke="#cfe3f2" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-8 202 209)" />
      {/* pastille check */}
      <circle cx="86" cy="96" r="17" fill="#10B981" />
      <path d="M79 96l5 5 9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES = [
  { icon: "folder", title: "Dossier patient numérisé", text: "Créez et retrouvez chaque dossier en 10 secondes." },
  { icon: "mic", title: "Dictée vocale", text: "Parlez, GlowScan transcrit vos notes cliniques." },
  { icon: "shield", title: "Aide au diagnostic", text: "Suggestion indicative — vous restez décisionnaire." },
  { icon: "doc", title: "Rapport PDF automatique", text: "Rapport professionnel généré en 1 clic, à votre nom." },
  { icon: "chat", title: "Envoi WhatsApp", text: "Le patient reçoit son rapport automatiquement." },
  { icon: "globe", title: "Profil public sur Google", text: "Vos patients vous trouvent. Vos confrères vous rejoignent." },
];

const FAQS = [
  { q: "L'IA va-t-elle remplacer mon diagnostic ?", a: "Non. Le diagnostic IA est marqué « indicatif » dans GlowScan. Seule votre validation apparaît dans le rapport final signé de votre nom. Vous êtes et restez le médecin décisionnaire." },
  { q: "Comment mes patients me trouvent-ils ?", a: "Via votre profil public GlowScan visible sur Google, et via les patients B2C dont le score est faible — GlowScan les oriente automatiquement vers un dermatologue disponible dans leur région." },
  { q: "Est-ce que je peux consulter des patients hors de ma ville ?", a: "Oui. Les consultations en ligne vous permettent de recevoir des patients de Douala, Yaoundé, Cotonou, Kinshasa — partout où GlowScan est actif. Vous consultez, vous signez, vous êtes payé directement sur Mobile Money." },
  { q: "Que se passe-t-il après les 14 jours gratuits ?", a: "Vous choisissez de continuer à 10 000 FCFA/mois. Aucun prélèvement automatique. Aucune carte bancaire. Vous payez quand vous voulez, par Mobile Money." },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 2px", textAlign: "left" }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{q}</span>
        <span style={{ fontSize: 18, color: C.blue, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>⌄</span>
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

  const wrap: React.CSSProperties = { maxWidth: 980, margin: "0 auto", padding: "0 20px" };
  const btnViolet: React.CSSProperties = { display: "inline-block", background: C.violet, color: "#fff", fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 12, textDecoration: "none", textAlign: "center" };
  const btnOutline: React.CSSProperties = { display: "inline-block", background: "#fff", color: C.blue, fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 12, border: `1.5px solid ${C.border}`, textDecoration: "none", textAlign: "center" };
  const kicker = (t: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.blueBright });
  const h2: React.CSSProperties = { fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 };

  const Logo = (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 20, color: C.blueBright }}>✦</span>
      <span style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>GlowScan <span style={{ color: C.blue }}>DERM</span></span>
    </div>
  );

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', background: C.white, color: C.ink, overflowX: "hidden" }}>

      {/* Header */}
      <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 62, position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)" }}>
        {Logo}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/derm/connexion"><span style={{ fontSize: 13.5, fontWeight: 700, color: C.inkMuted, cursor: "pointer" }}>Connexion</span></Link>
          <Link href="/derm/inscription"><span style={{ ...btnViolet, padding: "9px 16px", fontSize: 13 }}>14 jours gratuits</span></Link>
        </div>
      </div>

      {/* ══ 1. HERO ══ */}
      <section style={{ background: C.white, paddingTop: 26, paddingBottom: 40 }}>
        <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>
          <motion.div {...fade()} style={{ maxWidth: 680 }}>
            <p style={kicker("")}>Dermatologie numérique · Afrique</p>
            <h1 style={{ fontSize: 36, lineHeight: 1.14, fontWeight: 900, margin: "12px 0 14px", letterSpacing: "-1px", color: C.ink }}>
              Vos patients viennent à vous.<br /><span style={{ color: C.blue }}>Votre expertise va partout en Afrique.</span>
            </h1>
            <p style={{ fontSize: 15.5, lineHeight: 1.65, color: C.inkMuted, maxWidth: 580, margin: "0 auto" }}>
              GlowScan DERM numérise votre cabinet et génère votre rapport médical en 3 minutes — envoyé sur le WhatsApp du patient. Vous consultez, GlowScan documente.
            </p>
          </motion.div>
          <motion.div {...fade(0.1)} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link href="/derm/inscription"><span style={btnViolet}>Créer mon profil gratuitement</span></Link>
            <Link href="/derm/demo"><span style={btnOutline}>Voir comment ça marche</span></Link>
          </motion.div>
          <motion.div {...fade(0.2)}><HeroArt /></motion.div>
        </div>
      </section>

      {/* ══ 3 MOTS CLÉS ══ */}
      <section style={{ background: C.blue, padding: "26px 0" }}>
        <div style={{ ...wrap, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {["Numérisé", "Connecté", "Africain"].map((w, i) => (
            <div key={w} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{w}</span>
              {i < 2 && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 22 }}>·</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ══ 2. BARRE DE CONFIANCE ══ */}
      <section style={{ background: C.white, padding: "18px 0" }}>
        <div style={{ ...wrap, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{dermCount} dermatologues actifs</span>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Cameroun · Bénin · RDC</span>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>Présenté au Congrès SODAF — Ouagadougou 2026</span>
        </div>
      </section>

      {/* ══ 3. LE PROBLÈME ══ */}
      <section style={{ background: C.lightBlue, padding: "48px 0" }}>
        <div style={wrap}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", margin: "0 0 6px" }}>Il est 19h. Il vous reste 3 dossiers à écrire à la main.</motion.h2>
          <motion.p {...fade(0.05)} style={{ textAlign: "center", fontSize: 14.5, color: C.inkMuted, margin: "0 auto 26px", maxWidth: 560 }}>Chaque jour, l'administratif vous vole du temps que vous devriez passer avec vos patients.</motion.p>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}>
            {[
              { i: "doc", t: "Rédiger vos comptes-rendus à la main", s: "30 minutes par dossier en moyenne." },
              { i: "chat", t: "Répondre aux questions WhatsApp de vos patients", s: "Après 20h, gratuitement, sans structure." },
              { i: "folder", t: "Retrouver un ancien dossier patient", s: "Dans des carnets illisibles depuis 5 ans." },
            ].map((b, k) => (
              <motion.div key={k} {...fade(k * 0.08)} style={{ display: "flex", gap: 14, alignItems: "center", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                <IcoBox name={b.i} />
                <div><p style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>{b.t}</p><p style={{ fontSize: 13, color: C.inkMuted, margin: "3px 0 0" }}>{b.s}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4. LA SOLUTION — 6 FEATURES ══ */}
      <section style={{ background: C.white, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ textAlign: "center", marginBottom: 28 }}>
            <p style={kicker("")}>Ce que GlowScan DERM fait pour vous</p>
            <h2 style={{ ...h2, margin: "10px 0 0" }}>Tout votre cabinet. Dans votre téléphone.</h2>
          </motion.div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} {...fade((i % 2) * 0.06)} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                <IcoBox name={f.icon} tone={f.icon === "globe" ? "violet" : "blue"} />
                <div><p style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>{f.title}</p><p style={{ fontSize: 13, color: C.inkMuted, margin: "3px 0 0", lineHeight: 1.5 }}>{f.text}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 6. POURQUOI GLOWSCAN DERM ══ */}
      <section style={{ background: C.lightBlue, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", margin: "0 0 28px" }}>Pourquoi des dermatologues choisissent GlowScan DERM ?</motion.h2>
          {[
            { i: "clock", t: "Gagner du temps", d: "Vous passez 30 minutes à rédiger chaque compte-rendu. GlowScan DERM le génère en 3 minutes. Avec votre nom. Avec votre signature. Professionnel." },
            { i: "users", t: "Recevoir des patients via GlowScan", d: "Des patients africains font leur analyse sur GlowScan chaque jour. Quand leur score est faible, GlowScan leur propose de consulter un dermatologue. Ce dermatologue, c'est vous." },
            { i: "globe", t: "Consulter dans toute l'Afrique", d: "Votre expertise ne s'arrête pas à votre ville. Avec les consultations en ligne, vous consultez un patient à Douala, Cotonou, Kinshasa ou Dakar — depuis votre cabinet. 2 000 FCFA par consultation, payé via Mobile Money." },
          ].map((r, k) => (
            <motion.div key={k} {...fade(k * 0.08)} style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, marginBottom: 12 }}>
              <IcoBox name={r.i} tone={k === 2 ? "violet" : "blue"} />
              <div>
                <p style={{ fontSize: 16.5, fontWeight: 900, color: C.ink, margin: "0 0 4px" }}>{r.t}</p>
                <p style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.6, margin: 0 }}>{r.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ 8. COMMENT ÇA MARCHE — FLUX 4 ÉTAPES ══ */}
      <section style={{ background: C.white, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", margin: "0 0 30px" }}>Comment ça marche</motion.h2>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}>
            {[
              { n: "1", i: "phone", t: "Le patient fait son analyse (gratuit)", d: "Photo de peau + Glow Score sur son téléphone." },
              { n: "2", i: "shield", t: "GlowScan détecte un cas sérieux", d: "Score faible → recommandation de consulter un dermatologue." },
              { n: "3", i: "pin", t: "Le patient consulte VOTRE profil et paie", d: "Il vous trouve, voit vos avis, et réserve — 2 000 FCFA." },
              { n: "4", i: "chat", t: "Vous consultez, le PDF part sur WhatsApp", d: "Vous documentez, signez, le patient reçoit son rapport." },
            ].map((s, k) => (
              <motion.div key={k} {...fade(k * 0.07)} style={{ display: "flex", gap: 14, alignItems: "center", background: C.lightBlue, borderRadius: 16, padding: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.blue, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
                <IcoBox name={s.i} />
                <div><p style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, margin: 0 }}>{s.t}</p><p style={{ fontSize: 12.5, color: C.inkMuted, margin: "2px 0 0" }}>{s.d}</p></div>
              </motion.div>
            ))}
          </div>
          <motion.p {...fade(0.1)} style={{ textAlign: "center", fontSize: 15, fontWeight: 800, color: C.blue, marginTop: 22 }}>
            Tout ça depuis votre téléphone. Sans vous déplacer. Sans paperasse.
          </motion.p>
        </div>
      </section>

      {/* ══ 7. PROFIL PUBLIC DERMATOLOGUE ══ */}
      <section style={{ background: C.lightBlue, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ textAlign: "center", marginBottom: 26 }}>
            <p style={kicker("")}>Inclus dans l'abonnement</p>
            <h2 style={{ ...h2, margin: "10px 0 8px" }}>Votre page professionnelle sur internet</h2>
            <p style={{ fontSize: 14.5, color: C.inkMuted, maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
              Chaque dermatologue GlowScan DERM reçoit une page publique visible sur Google. Vos patients vous trouvent. Vos confrères vous rejoignent.
            </p>
          </motion.div>

          {/* Mockup page profil */}
          <motion.div {...fade(0.08)} style={{ maxWidth: 380, margin: "0 auto 26px", background: "#fff", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 16px 40px rgba(3,105,161,0.1)" }}>
            <div style={{ height: 70, background: "linear-gradient(135deg,#0369A1,#0891B2)" }} />
            <div style={{ padding: "0 18px 18px", marginTop: -34 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#94c9e8,#0369A1)", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico name="users" color="#fff" size={30} /></div>
                <div style={{ paddingBottom: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: C.ink, margin: 0 }}>Dr [Votre nom]</p>
                  <p style={{ fontSize: 11, color: C.inkMuted, margin: "2px 0 0" }}>Dermatologie · Douala 🇨🇲</p>
                </div>
              </div>
              <div style={{ marginTop: 12, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "8px 10px" }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.violet, margin: 0 }}>✦ Dermatologue Certifié GlowScan</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ color: "#f59e0b", letterSpacing: 1 }}>★★★★★</span>
                <span style={{ fontSize: 11, color: C.inkMuted }}>4,9 · 37 avis</span>
              </div>
              <div style={{ marginTop: 12, background: C.violet, color: "#fff", textAlign: "center", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 800 }}>Consulter en ligne — 2 000 FCFA</div>
            </div>
          </motion.div>

          {/* Bénéfices */}
          <motion.div {...fade(0.12)} style={{ maxWidth: 620, margin: "0 auto" }}>
            {[
              "Visible sur Google quand un patient cherche « dermatologue [ville] »",
              "Les patients GlowScan B2C vous sont envoyés selon votre région",
              "Vos confrères vous trouvent et rejoignent le réseau GlowScan",
              "Badge « Dermatologue Certifié GlowScan » affiché",
              "Statistiques de votre activité chaque mois",
            ].map((b) => (
              <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 9 }}>
                <span style={{ marginTop: 2, flexShrink: 0 }}><Ico name="check" color={C.green} size={18} /></span>
                <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{b}</span>
              </div>
            ))}
          </motion.div>

          {/* 3 étapes */}
          <motion.div {...fade(0.16)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxWidth: 620, margin: "22px auto 0" }}>
            {[["1", "Créer son compte", "2 minutes"], ["2", "Compléter son profil", "photo, spécialités"], ["3", "La page est live", "patients & confrères arrivent"]].map(([n, t, s]) => (
              <div key={n} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.blue, color: "#fff", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>{n}</div>
                <p style={{ fontSize: 12.5, fontWeight: 800, color: C.ink, margin: 0 }}>{t}</p>
                <p style={{ fontSize: 10.5, color: C.inkMuted, margin: "2px 0 0" }}>{s}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 12. DÉSARMER LA PEUR DE L'IA ══ */}
      <section style={{ background: C.white, padding: "40px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 560, margin: "0 auto", background: C.lightBlue, border: `1.5px solid ${C.blueBright}`, borderRadius: 20, padding: "26px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.ink, lineHeight: 1.35, margin: 0 }}>
              GlowScan ne diagnostique pas.<br /><span style={{ color: C.blue }}>GlowScan documente.</span>
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, color: C.violet, margin: "10px 0 0" }}>Vous restez le médecin. Toujours.</p>
          </motion.div>
        </div>
      </section>

      {/* ══ 11. TARIFICATION ══ */}
      <section style={{ background: C.lightBlue, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 460, margin: "0 auto", background: "#fff", border: `2px solid ${C.blue}`, borderRadius: 22, padding: 26, textAlign: "center" }}>
            <p style={{ fontSize: 40, fontWeight: 900, color: C.ink, margin: 0, letterSpacing: "-1px" }}>10 000 <span style={{ fontSize: 17, color: C.inkMuted }}>FCFA / mois</span></p>
            <p style={{ fontSize: 13.5, color: C.inkMuted, margin: "4px 0 0" }}>Soit <strong style={{ color: C.ink }}>333 FCFA par jour</strong> — moins cher qu'une consultation physique.</p>
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: "10px 12px", margin: "16px 0" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#047857", margin: 0 }}>1 seule consultation en ligne par mois = abonnement rentabilisé.</p>
            </div>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Ico name="check" color={C.green} size={17} />
                  <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{f.title}</span>
                </div>
              ))}
            </div>
            <Link href="/derm/inscription"><span style={{ ...btnViolet, width: "100%", boxSizing: "border-box" }}>Commencer 14 jours gratuits</span></Link>
            <p style={{ fontSize: 11.5, color: C.inkSoft, margin: "12px 0 0", lineHeight: 1.5 }}>Sans carte bancaire. Sans engagement. Paiement Mobile Money MTN ou Orange.</p>
          </motion.div>
        </div>
      </section>

      {/* ══ 14. FAQ ══ */}
      <section style={{ background: C.white, padding: "44px 0" }}>
        <div style={{ ...wrap, maxWidth: 660 }}>
          <motion.h2 {...fade()} style={{ ...h2, textAlign: "center", fontSize: 22, margin: "0 0 18px" }}>Questions fréquentes</motion.h2>
          <motion.div {...fade(0.05)}>{FAQS.map((f, i) => <Faq key={i} q={f.q} a={f.a} />)}</motion.div>
        </div>
      </section>

      {/* ══ 13. CTA FINAL ══ */}
      <section style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueBright})`, padding: "50px 0", textAlign: "center" }}>
        <div style={wrap}>
          <motion.div {...fade()}>
            <h2 style={{ fontSize: 25, fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.5px", lineHeight: 1.3 }}>
              Rejoignez les dermatologues qui consultent<br />déjà toute l'Afrique depuis leur cabinet.
            </h2>
            <Link href="/derm/inscription"><span style={{ display: "inline-block", background: "#fff", color: C.violet, fontWeight: 900, fontSize: 15, padding: "15px 30px", borderRadius: 12, textDecoration: "none" }}>Créer mon profil gratuitement — 14 jours</span></Link>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", margin: "16px auto 0", maxWidth: 420, lineHeight: 1.5 }}>
              Votre profil est en ligne en moins de 5 minutes. Paiement Mobile Money après les 14 jours gratuits.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.white, padding: "30px 0", borderTop: `1px solid ${C.border}` }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>{Logo}</div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <Link href="/derm/connexion"><span style={{ fontSize: 12.5, color: C.inkMuted, cursor: "pointer" }}>Connexion</span></Link>
            <a href="https://wa.me/237674377959" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: C.inkMuted, textDecoration: "none" }}>Support</a>
            <a href="https://glow-scan.com" style={{ fontSize: 12.5, color: C.inkMuted, textDecoration: "none" }}>glow-scan.com</a>
          </div>
          <p style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
            GlowScan DERM est un outil d'aide à la pratique médicale. Il ne se substitue pas au diagnostic médical et à la responsabilité du praticien.
          </p>
        </div>
      </footer>
    </div>
  );
}
