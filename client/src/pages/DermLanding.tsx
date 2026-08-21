import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════════
// Landing GlowScan DERM — glow-scan.com/derm
// Style : professionnel & crédible (ePresc) + visuel simple & lisible (Monetbil).
// Cible : dermatologue africain, travaille sur papier, veut être respecté.
// ════════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#0F0A1E", violet: "#7C3AED", violetL: "#A78BFA", violetX: "#C4B5FD",
  green: "#10B981", greenL: "#6EE7B7", white: "#FFFFFF",
  ink: "#1a1a2e", inkMuted: "#5b6472", inkSoft: "#8a93a3",
  onDark: "#F3F0FF", onDarkMuted: "rgba(200,185,255,0.72)",
  yellow: "#FFFBEB", yellowBorder: "#FCD34D",
};

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay },
});

// ── Illustration héro (vectorielle, style Monetbil : lignes simples) ──────────
function HeroArt() {
  return (
    <svg viewBox="0 0 260 220" width="100%" style={{ maxWidth: 320, height: "auto" }} aria-hidden>
      {/* halo */}
      <circle cx="130" cy="105" r="98" fill="#7C3AED" opacity="0.10" />
      {/* dossier / rapport */}
      <rect x="34" y="52" width="104" height="128" rx="12" fill="#1A1030" stroke="#7C3AED" strokeWidth="2.5" />
      <rect x="52" y="40" width="68" height="20" rx="6" fill="#7C3AED" />
      <line x1="50" y1="86" x2="122" y2="86" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="104" x2="112" y2="104" stroke="#4b3f66" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="120" x2="122" y2="120" stroke="#4b3f66" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="136" x2="98" y2="136" stroke="#4b3f66" strokeWidth="3" strokeLinecap="round" />
      {/* pastille check vert */}
      <circle cx="112" cy="158" r="15" fill="#10B981" />
      <path d="M105 158 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* téléphone (WhatsApp) */}
      <rect x="150" y="70" width="78" height="128" rx="16" fill="#0F0A1E" stroke="#10B981" strokeWidth="2.5" />
      <rect x="160" y="86" width="58" height="88" rx="8" fill="#1A1030" />
      <circle cx="189" cy="188" r="4" fill="#10B981" />
      {/* bulle message */}
      <rect x="167" y="98" width="44" height="20" rx="8" fill="#10B981" opacity="0.9" />
      <rect x="167" y="126" width="34" height="16" rx="7" fill="#7C3AED" opacity="0.85" />
      <rect x="177" y="148" width="34" height="16" rx="7" fill="#7C3AED" opacity="0.5" />
      {/* sparkles */}
      <path d="M212 52 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#C4B5FD" />
    </svg>
  );
}

// ── Petit pictogramme rond (problème / feature) ───────────────────────────────
function Bubble({ emoji, tone = "violet" }: { emoji: string; tone?: "violet" | "green" | "light" }) {
  const bg = tone === "green" ? "rgba(16,185,129,0.12)" : tone === "light" ? "#f1eefb" : "rgba(124,58,237,0.12)";
  const bd = tone === "green" ? "rgba(16,185,129,0.3)" : tone === "light" ? "#e4dcfa" : "rgba(124,58,237,0.28)";
  return (
    <div style={{ width: 54, height: 54, borderRadius: 16, background: bg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{emoji}</div>
  );
}

const FEATURES = [
  { icon: "📁", title: "Dossier patient numérisé", text: "Créez et retrouvez chaque dossier en 10 secondes." },
  { icon: "🎙️", title: "Dictée vocale", text: "Parlez, GlowScan transcrit vos notes cliniques." },
  { icon: "🤖", title: "Aide au diagnostic", text: "Suggestion indicative — vous restez décisionnaire." },
  { icon: "📄", title: "Rapport PDF automatique", text: "Rapport professionnel généré en 1 clic, à votre nom." },
  { icon: "📱", title: "Envoi WhatsApp", text: "Le patient reçoit son rapport automatiquement." },
  { icon: "👥", title: "Dashboard patients", text: "Suivez l'évolution de chaque patient dans le temps." },
];

const FAQS = [
  { q: "L'IA va-t-elle remplacer mon diagnostic ?", a: "Non. La suggestion IA est marquée « indicative ». Seule votre validation apparaît dans le rapport final. GlowScan vous assiste, il ne décide jamais à votre place." },
  { q: "Comment mes patients reçoivent-ils le rapport ?", a: "Automatiquement sur WhatsApp dès que vous clôturez la consultation." },
  { q: "Est-ce que mes données patients sont sécurisées ?", a: "Oui. Chaque dossier est chiffré et accessible uniquement depuis votre compte." },
  { q: "Puis-je utiliser GlowScan sans connexion internet ?", a: "Une connexion est nécessaire. La plateforme fonctionne sur tout smartphone avec une connexion 3G minimum." },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #ececf2" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 2px", textAlign: "left" }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{q}</span>
        <span style={{ fontSize: 18, color: C.violet, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>⌄</span>
      </button>
      {open && <p style={{ fontSize: 13.5, color: C.inkMuted, lineHeight: 1.6, margin: "0 2px 16px" }}>{a}</p>}
    </div>
  );
}

export default function DermLanding() {
  useSEO({
    title: "GlowScan DERM — Votre cabinet de dermatologie numérisé",
    description: "GlowScan DERM génère votre rapport PDF médical en 3 minutes et l'envoie automatiquement à votre patient sur WhatsApp. Dossier patient, dictée vocale, aide au diagnostic. 14 jours gratuits.",
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

  const wrap: React.CSSProperties = { maxWidth: 960, margin: "0 auto", padding: "0 20px" };
  const btnPrimary: React.CSSProperties = { display: "inline-block", background: C.violet, color: "#fff", fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 9999, textDecoration: "none", textAlign: "center" };
  const btnGhost: React.CSSProperties = { display: "inline-block", background: "transparent", color: "#fff", fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 9999, border: "1.5px solid rgba(255,255,255,0.5)", textDecoration: "none", textAlign: "center" };
  const kicker = (t: string, color = C.violet): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color });

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', background: C.bg, overflowX: "hidden" }}>

      {/* ══════ 1. HERO ══════ */}
      <section style={{ background: C.bg, position: "relative", paddingTop: 22, paddingBottom: 44 }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>GlowScan <span style={{ color: C.violetL }}>DERM</span></span>
          </div>
          <Link href="/derm/connexion"><span style={{ fontSize: 13, fontWeight: 700, color: C.onDarkMuted, cursor: "pointer" }}>Connexion</span></Link>
        </div>

        <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: 26, alignItems: "center", textAlign: "center", paddingTop: 28 }}>
          <motion.div {...fade()} style={{ maxWidth: 640 }}>
            <p style={kicker(C.violetL)}>Outil pour dermatologues · Afrique</p>
            <h1 style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 900, color: "#fff", margin: "12px 0 14px", letterSpacing: "-0.5px" }}>
              Votre cabinet numérisé.<br /><span style={{ color: C.violetL }}>Vos patients connectés.</span>
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: C.onDarkMuted, maxWidth: 560, margin: "0 auto" }}>
              GlowScan DERM génère votre rapport PDF médical en 3 minutes et l'envoie automatiquement à votre patient sur WhatsApp. Pendant que vous consultez.
            </p>
          </motion.div>

          <motion.div {...fade(0.1)} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link href="/derm/inscription"><span style={btnPrimary}>Commencer 14 jours gratuits</span></Link>
            <Link href="/derm/demo"><span style={btnGhost}>Voir la démo</span></Link>
          </motion.div>

          <motion.div {...fade(0.2)} style={{ marginTop: 6 }}><HeroArt /></motion.div>
        </div>
      </section>

      {/* ══════ 2. BARRE DE CONFIANCE ══════ */}
      <section style={{ background: C.white, padding: "22px 0" }}>
        <div style={{ ...wrap, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{dermCount} dermatologues actifs</span>
          <span style={{ color: "#d5d5df" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>3 pays</span>
          <span style={{ color: "#d5d5df" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.violet }}>Présenté au Congrès SODAF — Ouagadougou 2026</span>
          <span style={{ color: "#d5d5df" }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.inkMuted }}>Validé par Dr Chiago Tietche Sonia, Dermatologue</span>
        </div>
      </section>

      {/* ══════ 3. LE PROBLÈME ══════ */}
      <section style={{ background: C.white, padding: "48px 0 8px" }}>
        <div style={wrap}>
          <motion.h2 {...fade()} style={{ fontSize: 24, fontWeight: 900, color: C.ink, textAlign: "center", margin: "0 0 8px" }}>Combien de temps perdez-vous chaque jour ?</motion.h2>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr", marginTop: 28 }}>
            {[
              { e: "📝", t: "Rédiger vos comptes-rendus à la main", s: "30 minutes par dossier en moyenne." },
              { e: "📞", t: "Répondre aux questions WhatsApp de vos patients", s: "Après 20h, gratuitement, sans structure." },
              { e: "🗂️", t: "Retrouver un ancien dossier patient", s: "Dans des carnets illisibles depuis 5 ans." },
            ].map((b, i) => (
              <motion.div key={i} {...fade(i * 0.08)} style={{ display: "flex", gap: 14, alignItems: "center", background: "#faf9fe", border: "1px solid #efeaf9", borderRadius: 16, padding: 16 }}>
                <Bubble emoji={b.e} tone="light" />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>{b.t}</p>
                  <p style={{ fontSize: 13, color: C.inkMuted, margin: "3px 0 0" }}>{b.s}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 4. LA SOLUTION ══════ */}
      <section style={{ background: C.bg, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ textAlign: "center", marginBottom: 30 }}>
            <p style={kicker(C.violetL)}>La solution</p>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: "10px 0 0", letterSpacing: "-0.5px" }}>
              Simple. <span style={{ color: C.violetL }}>Rapide.</span> <span style={{ color: C.greenL }}>Médical.</span>
            </h2>
          </motion.div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} {...fade((i % 3) * 0.06)} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#1A1030", border: "1px solid rgba(167,139,250,0.18)", borderRadius: 16, padding: 16 }}>
                <Bubble emoji={f.icon} tone={i === 4 ? "green" : "violet"} />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: C.onDark, margin: 0 }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: C.onDarkMuted, margin: "3px 0 0", lineHeight: 1.5 }}>{f.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 5. SCREENSHOT PRODUIT ══════ */}
      <section style={{ background: C.white, padding: "48px 0" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <motion.div {...fade()}>
            {/* maquette dashboard (mockup vectoriel — pas de photo) */}
            <div style={{ maxWidth: 560, margin: "0 auto", background: C.bg, borderRadius: 20, padding: 14, border: "1px solid #ece7f8", boxShadow: "0 20px 50px rgba(124,58,237,0.12)" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, paddingLeft: 4 }}>
                {["#f87171", "#fbbf24", "#34d399"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />)}
              </div>
              <div style={{ background: "#140d24", borderRadius: 14, padding: 16, textAlign: "left" }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: C.violetL, margin: "0 0 10px" }}>TABLEAU DE BORD DERM</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[["Patients", "128"], ["Cette semaine", "12"], ["Priorité", "3"]].map(([l, v]) => (
                    <div key={l} style={{ background: "#1A1030", borderRadius: 10, padding: "10px 8px" }}>
                      <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: 0 }}>{v}</p>
                      <p style={{ fontSize: 9, color: C.onDarkMuted, margin: 0 }}>{l}</p>
                    </div>
                  ))}
                </div>
                {[["👩🏾‍⚕️", "Aminata K. · Acné rétentionnelle", "#10B981"], ["🧑🏾", "Prince T. · Hyperpigmentation", "#fbbf24"], ["👩🏾", "Reine N. · Dermatite", "#f87171"]].map(([e, t, c], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1A1030", borderRadius: 10, padding: "9px 10px", marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{e}</span>
                    <span style={{ flex: 1, fontSize: 11.5, color: C.onDark }}>{t}</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} />
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.inkMuted, marginTop: 16 }}>Interface conçue pour les dermatologues africains.</p>
          </motion.div>
        </div>
      </section>

      {/* ══════ 6. LIMITE MÉDICALE ══════ */}
      <section style={{ background: C.yellow, padding: "36px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 620, margin: "0 auto", background: "#fff", border: `1.5px solid ${C.yellowBorder}`, borderRadius: 18, padding: "20px 22px", textAlign: "center" }}>
            <p style={{ fontSize: 15.5, fontWeight: 800, color: "#92400e", lineHeight: 1.6, margin: 0 }}>
              ⚠️ GlowScan DERM <span style={{ color: C.violet }}>assiste</span> le dermatologue. Il ne remplace jamais votre diagnostic.
            </p>
            <p style={{ fontSize: 13.5, color: "#a16207", margin: "6px 0 0", fontWeight: 700 }}>Vous êtes et restez le médecin.</p>
          </motion.div>
        </div>
      </section>

      {/* ══════ 7. PREUVE SOCIALE ══════ */}
      <section style={{ background: C.bg, padding: "48px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 620, margin: "0 auto", background: "#1A1030", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 12px" }}>👩🏾‍⚕️</div>
            <p style={{ fontSize: 16, fontWeight: 600, fontStyle: "italic", color: C.onDark, lineHeight: 1.6, margin: "0 0 14px" }}>
              « GlowScan m'a permis de me concentrer sur mes patients plutôt que sur la paperasse. »
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0 }}>Dr Chiago Tietche Sonia</p>
            <p style={{ fontSize: 11.5, color: C.violetL, fontWeight: 700, margin: "3px 0 12px" }}>Medical Advisor GlowScan · Yaoundé, Cameroun</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 22 }}><span>🇨🇲</span><span>🇧🇯</span><span>🇨🇩</span></div>
          </motion.div>
        </div>
      </section>

      {/* ══════ 8. TARIFICATION ══════ */}
      <section style={{ background: C.white, padding: "52px 0" }}>
        <div style={wrap}>
          <motion.div {...fade()} style={{ maxWidth: 460, margin: "0 auto", background: "#faf9fe", border: `2px solid ${C.violet}`, borderRadius: 22, padding: 26, textAlign: "center" }}>
            <p style={kicker(C.violet)}>Une offre, tout inclus</p>
            <p style={{ fontSize: 40, fontWeight: 900, color: C.ink, margin: "10px 0 0", letterSpacing: "-1px" }}>10 000 <span style={{ fontSize: 18, color: C.inkMuted }}>FCFA / mois</span></p>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: C.green, margin: "6px 0 18px" }}>14 jours d'essai gratuit — sans carte bancaire</p>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ color: C.green, fontWeight: 900 }}>✓</span>
                  <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{f.title}</span>
                </div>
              ))}
            </div>
            <Link href="/derm/inscription"><span style={{ ...btnPrimary, width: "100%", boxSizing: "border-box" }}>Commencer gratuitement</span></Link>
            <p style={{ fontSize: 11.5, color: C.inkSoft, margin: "12px 0 0" }}>Paiement par Mobile Money MTN ou Orange.</p>
          </motion.div>
        </div>
      </section>

      {/* ══════ 9. FAQ ══════ */}
      <section style={{ background: C.white, padding: "8px 0 52px" }}>
        <div style={{ ...wrap, maxWidth: 640 }}>
          <motion.h2 {...fade()} style={{ fontSize: 22, fontWeight: 900, color: C.ink, textAlign: "center", margin: "0 0 18px" }}>Questions fréquentes</motion.h2>
          <motion.div {...fade(0.05)}>
            {FAQS.map((f, i) => <Faq key={i} q={f.q} a={f.a} />)}
          </motion.div>
        </div>
      </section>

      {/* ══════ 10. CTA FINAL ══════ */}
      <section style={{ background: C.violet, padding: "48px 0", textAlign: "center" }}>
        <div style={wrap}>
          <motion.div {...fade()}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.5px" }}>Commencez à gagner du temps dès aujourd'hui</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", margin: "0 0 22px", lineHeight: 1.55 }}>
              14 jours gratuits. Sans engagement. Paiement Mobile Money.
            </p>
            <Link href="/derm/inscription"><span style={{ display: "inline-block", background: "#fff", color: C.violet, fontWeight: 900, fontSize: 15, padding: "15px 30px", borderRadius: 9999, textDecoration: "none" }}>Créer mon compte gratuitement</span></Link>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: "16px 0 0" }}>glow-scan.com/derm</p>
          </motion.div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ background: C.bg, padding: "32px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>GlowScan <span style={{ color: C.violetL }}>DERM</span></span>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <Link href="/derm/connexion"><span style={{ fontSize: 12.5, color: C.onDarkMuted, cursor: "pointer" }}>Connexion</span></Link>
            <a href="https://wa.me/237674377959" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: C.onDarkMuted, textDecoration: "none" }}>Support</a>
            <a href="https://glow-scan.com" style={{ fontSize: 12.5, color: C.onDarkMuted, textDecoration: "none" }}>glow-scan.com</a>
          </div>
          <p style={{ fontSize: 11, color: "rgba(200,185,255,0.45)", lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
            GlowScan DERM est un outil d'aide à la pratique médicale. Il ne se substitue pas au diagnostic médical et à la responsabilité du praticien.
          </p>
        </div>
      </footer>
    </div>
  );
}
