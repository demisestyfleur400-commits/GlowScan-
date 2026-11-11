import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useProAccount } from "@/hooks/use-pro";
import { proHomeOf } from "@shared/proProfile";
import { PRO_SUBSCRIPTION_FCFA } from "@shared/premium";
import { ensureDermFonts, FONT_UI } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Landing GlowScan Derm (maquette « Le soin au centre », novembre 2026).
// glow-scan.com/derm. Captures réelles de l'espace médical (données de
// démonstration). « Demander une démo » ouvre WhatsApp.
// Tarif : shared/premium.ts.
// ════════════════════════════════════════════════════════════════════════

const SIGNUP = "/derm/inscription";
const LOGIN = "/derm/connexion";
const DEMO_WA = `https://wa.me/237674377959?text=${encodeURIComponent("Bonjour, je suis dermatologue et je souhaite une démonstration de GlowScan Derm.")}`;
const C = { dark: "#183a32", darker: "#14322b", text: "#17392c", muted: "#3d4f48", line: "#e3e8e2", sage: "#e8eddf", soft: "#f3f5f1", lime: "#e6ec9c", accent: "#2a6b4f" };
const price = PRO_SUBSCRIPTION_FCFA.toLocaleString("fr-FR");

const FAQ: [string, string][] = [
  ["L'analyse Glow remplace-t-elle mon examen ?", "Non. Elle fournit une proposition indicative. Le dermatologue examine le patient, confirme ou corrige, puis relit le compte rendu."],
  ["Mon équipe peut-elle préparer la consultation ?", "Oui. La secrétaire ou l'infirmière peut renseigner le motif, les zones et les 3 photos, avant l'analyse Glow et la salle d'attente."],
  ["Comment sont confirmés les rendez-vous ?", "L'agenda centralise le planning et les statuts des rendez-vous, avec les confirmations des patients par WhatsApp."],
  ["Comment le compte rendu est-il remis au patient ?", "Le compte rendu est relu, signé par code, puis remis au patient. Les comptes rendus partagés conservent un format A4 cohérent."],
  ["Combien coûte GlowScan Derm ?", `14 jours gratuits, sans carte bancaire. Ensuite ${price} FCFA par mois, payés par Mobile Money ou déduits de vos gains de consultations en ligne.`],
];

const Kicker = ({ children, light }: { children: React.ReactNode; light?: boolean }) => <span style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: light ? C.lime : C.accent }}>{children}</span>;
const H2 = ({ children, light, size = 44 }: { children: React.ReactNode; light?: boolean; size?: number }) => <h2 style={{ margin: "14px 0 0", font: `600 clamp(30px,4vw,${size}px)/1.12 ${FONT_UI}`, letterSpacing: -1, color: light ? "#fff" : C.text }}>{children}</h2>;
function Shot({ src, label, alt }: { src: string; label: string; alt: string }) {
  return (
    <figure style={{ margin: 0, padding: 14, borderRadius: 14, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)" }}>
      <span style={{ display: "block", marginBottom: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.lime }}>{label}</span>
      <img src={src} alt={alt} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderRadius: 8, boxShadow: "0 20px 50px rgba(0,0,0,.25)" }} />
      <figcaption style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.85)" }}>Interface du logiciel · Données de démonstration</figcaption>
    </figure>
  );
}
function LightShot({ src, label, alt }: { src: string; label: string; alt: string }) {
  return (
    <figure style={{ margin: 0, padding: 14, borderRadius: 14, background: C.sage }}>
      <span style={{ display: "block", marginBottom: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.accent }}>{label}</span>
      <img src={src} alt={alt} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderRadius: 8, boxShadow: "0 14px 40px rgba(23,57,44,.14)" }} />
      <figcaption style={{ marginTop: 10, fontSize: 12, color: C.muted }}>Interface du logiciel · Données de démonstration</figcaption>
    </figure>
  );
}

export default function DermLanding() {
  useSEO({
    title: "GlowScan Derm · Le logiciel du cabinet dermatologique",
    description: "Agenda, dossiers, suivis et consultations : GlowScan Derm réunit le quotidien du cabinet dermatologique pour garder le fil de chaque patient. 14 jours gratuits.",
    canonical: "https://glow-scan.com/derm",
  });
  // Déjà connecté : on va directement à la page de son rôle.
  const [, setLocation] = useLocation();
  const { data: accData } = useProAccount();
  useEffect(() => {
    if (accData?.account) setLocation(proHomeOf((accData.account as any).profile, "doctor"));
    else if (accData?.user?.role === "secretary") setLocation(proHomeOf(null, "secretary"));
  }, [accData, setLocation]);
  useEffect(() => { ensureDermFonts(); }, []);

  const wrap: React.CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "0 24px" };
  const nav = [["#fonctionnalites", "Fonctionnalités"], ["#consultation", "Consultation"], ["#faq", "Questions fréquentes"]];

  return (
    <div style={{ fontFamily: FONT_UI, color: C.text, background: "#fff" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(255,255,255,.95)", borderBottom: `1px solid ${C.line}`, backdropFilter: "blur(10px)" }}>
        <div className="flex items-center justify-between" style={{ ...wrap, height: 64, gap: 16 }}>
          <Link href="/derm" className="flex items-center no-underline" style={{ gap: 10, color: C.text }}>
            <span className="flex flex-col" style={{ lineHeight: 1 }}><b style={{ fontSize: 20, fontWeight: 700, letterSpacing: -.5 }}>glowscan</b><span style={{ fontSize: 9, letterSpacing: 2.5, color: C.muted, marginTop: 3 }}>AFRICA</span></span>
            <span style={{ padding: "3px 8px", borderRadius: 4, background: C.sage, fontSize: 8.5, fontWeight: 700, color: C.accent }}>DERM</span>
          </Link>
          <nav className="hidden items-center md:flex" style={{ gap: 30, fontSize: 14.5 }}>
            {nav.map(([h, l]) => <a key={h} href={h} style={{ color: C.text, textDecoration: "none" }}>{l}</a>)}
            <Link href={LOGIN} style={{ color: C.text, textDecoration: "none" }} data-testid="nav-login">Se connecter</Link>
          </nav>
          <a href={DEMO_WA} target="_blank" rel="noopener noreferrer" className="flex items-center" style={{ gap: 8, padding: "10px 16px", borderRadius: 6, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }} data-testid="cta-demo-header">
            Demander une démo <ArrowRight size={14} />
          </a>
        </div>
      </header>

      {/* Héros */}
      <section style={{ background: C.dark, color: "#fff" }}>
        <div className="grid items-center" style={{ ...wrap, gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 48, padding: "72px 24px 64px" }}>
          <div>
            <Kicker light>LE LOGICIEL DU CABINET DERMATOLOGIQUE</Kicker>
            <h1 style={{ margin: "20px 0 22px", font: `600 clamp(36px,5vw,56px)/1.08 ${FONT_UI}`, letterSpacing: -1.6 }}>Le soin au centre.<br />Votre cabinet,<br />en un seul espace.</h1>
            <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.65, color: "#e4ede9" }}>Agenda, dossiers, suivis et consultations : GlowScan Derm réunit votre quotidien pour garder le fil de chaque patient.</p>
            <div className="flex flex-col items-start" style={{ gap: 18, marginTop: 32 }}>
              <a href={DEMO_WA} target="_blank" rel="noopener noreferrer" className="flex items-center" style={{ gap: 10, padding: "14px 22px", borderRadius: 6, background: C.lime, color: C.text, fontSize: 15, fontWeight: 700, textDecoration: "none" }} data-testid="cta-demo-hero">Demander une démo <ArrowRight size={15} /></a>
              <a href="#fonctionnalites" style={{ color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>Explorer les fonctionnalités ↓</a>
            </div>
            <p style={{ margin: "44px 0 0", fontSize: 13, lineHeight: 1.6, color: "#d6e2dd" }}>Dès l'ouverture : rendez-vous du jour,<br />patients actifs et suivis à examiner.</p>
          </div>
          <Shot src="/img/derm/agenda.webp" label="GLOWSCAN DERM / AGENDA" alt="Agenda de la semaine dans GlowScan Derm" />
        </div>
      </section>

      <section style={{ background: C.sage, borderTop: "1px solid #d6dfcb" }}>
        <div className="grid" style={{ ...wrap, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, padding: "22px 24px" }}>
          {["Le quotidien du cabinet", "La continuité des soins", "Le regard sur votre pratique"].map((t, i) => <span key={t} style={{ fontSize: 15, fontWeight: 600 }}><span style={{ marginRight: 14, fontSize: 12.5, color: C.muted }}>0{i + 1}</span>{t}</span>)}
        </div>
      </section>

      {/* Quotidien réuni */}
      <section id="fonctionnalites" style={{ padding: "84px 0" }}>
        <div style={wrap}>
          <div className="flex flex-wrap items-end justify-between" style={{ gap: 20 }}>
            <div><Kicker>VOTRE QUOTIDIEN, RÉUNI</Kicker><H2>Moins de dispersion.<br />Plus de continuité.</H2></div>
            <p style={{ margin: 0, maxWidth: 300, fontSize: 15, color: C.muted, lineHeight: 1.6 }}>De la première prise de rendez-vous au suivi après la consultation.</p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginTop: 40 }}>
            {([["01 / AGENDA", "Une semaine lisible, des patients informés.", "Planning, statuts des rendez-vous et confirmations des patients par WhatsApp.", false],
              ["02 / PATIENTS", "Chaque patient trouve sa place.", "Recherchez, filtrez et créez les fiches des patients du cabinet depuis un même espace.", false],
              ["03 / SUIVIS", "Le soin continue après le rendez-vous.", "Prochain contrôle, rappels et évolution : gardez le fil du suivi dans la durée.", true],
              ["04 / MESSAGERIE", "Un échange relié au parcours de soin.", "Échangez avec vos patients et remettez vos comptes rendus dans un format A4 cohérent.", false]] as const).map(([k, t, p, hl]) => (
              <div key={k} style={{ padding: "26px 26px", borderRadius: 10, background: hl ? C.sage : C.soft }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: .8, color: C.muted }}>{k}</span>
                <h3 style={{ fontFamily: FONT_UI, margin: "12px 0 10px", fontSize: 18, fontWeight: 600, letterSpacing: -.3 }}>{t}</h3>
                <p style={{ margin: 0, maxWidth: 380, fontSize: 15, lineHeight: 1.6, color: C.muted }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Histoire clinique */}
      <section style={{ padding: "20px 0 84px", background: "#fff" }}>
        <div className="grid items-center" style={{ ...wrap, gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 56 }}>
          <LightShot src="/img/derm/dossiers.webp" label="GLOWSCAN DERM / DOSSIERS MÉDICAUX" alt="Dossiers médicaux dans GlowScan Derm" />
          <div>
            <Kicker>LA MÉMOIRE CLINIQUE DU CABINET</Kicker>
            <H2>Toute l'histoire clinique, au même endroit.</H2>
            <p style={{ margin: "18px 0 28px", maxWidth: 380, fontSize: 15, lineHeight: 1.65, color: C.muted }}>Retrouvez le contexte dont vous avez besoin pour préparer l'examen et poursuivre le suivi.</p>
            {["Consultations et documents", "Allergies et prescriptions", "Photos du parcours patient"].map((t, i) => (
              <div key={t} className="flex items-center" style={{ gap: 22, padding: "16px 0", borderTop: `1px solid ${C.line}`, fontSize: 15.5, fontWeight: 500 }}><span style={{ fontSize: 12.5, color: C.muted }}>0{i + 1}</span>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Nouvelle consultation */}
      <section id="consultation" style={{ background: C.dark, color: "#fff", padding: "72px 0" }}>
        <div style={wrap}>
          <Kicker light>NOUVELLE CONSULTATION</Kicker>
          <H2 light>Accueillir. Examiner. Documenter.</H2>
          <p style={{ margin: "16px 0 44px", fontSize: 15.5, color: "#e4ede9" }}>Un parcours commun à l'équipe, du premier accueil au compte rendu signé.</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 28, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.14)" }}>
            {([["Le patient", "Patient du cabinet ou nouvelle fiche avec consentement."], ["L'accueil et les photos", "Motif, zones et 3 photos, recueillis par la secrétaire ou l'infirmière."], ["L'analyse Glow", "Proposition indicative, puis passage en salle d'attente."], ["L'examen médical", "Le dermatologue examine, confirme ou corrige la proposition."], ["Le compte rendu", "Relu, signé par code, puis remis au patient."]] as const).map(([t, p], i) => (
              <div key={t}><span style={{ fontSize: 26, fontWeight: 600, color: C.lime }}>0{i + 1}</span><h3 style={{ fontFamily: FONT_UI, margin: "12px 0 10px", fontSize: 15.5, fontWeight: 700 }}>{t}</h3><p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "#e4ede9" }}>{p}</p></div>
            ))}
          </div>
          <p style={{ margin: "40px 0 0", padding: "16px 20px", borderRadius: 6, background: "rgba(255,255,255,.08)", fontSize: 14.5, color: "#e3ece8" }}>L'analyse Glow reste indicative. Vous gardez la main sur l'examen et la validation du compte rendu.</p>
        </div>
      </section>

      {/* Activité */}
      <section style={{ padding: "84px 0" }}>
        <div className="grid items-center" style={{ ...wrap, gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 56 }}>
          <div>
            <Kicker>ACTIVITÉ & AUTO-ÉVALUATION</Kicker>
            <H2>Prenez du recul.<br />Faites évoluer votre pratique.</H2>
            <p style={{ margin: "18px 0 30px", maxWidth: 320, fontSize: 15, lineHeight: 1.65, color: C.muted }}>Une lecture du cabinet, au-delà du rendez-vous du jour.</p>
            {[["Votre activité, en un regard", "Consultations par mois et par pathologie, pour mieux lire l'activité du cabinet."], ["Chaque retour fait progresser", "Bilan hebdomadaire, retours patients et pistes de progression."]].map(([t, p]) => (
              <div key={t} style={{ padding: "18px 0", borderTop: `1px solid ${C.line}` }}><b style={{ fontSize: 15, fontWeight: 600 }}>{t}</b><p style={{ margin: "8px 0 0", maxWidth: 360, fontSize: 15, lineHeight: 1.6, color: C.muted }}>{p}</p></div>
            ))}
          </div>
          <LightShot src="/img/derm/activite.webp" label="GLOWSCAN DERM / VOTRE ACTIVITÉ" alt="Votre activité dans GlowScan Derm" />
        </div>
      </section>

      {/* Paramètres + tarif */}
      <section style={{ background: C.sage, padding: "72px 0" }}>
        <div className="flex flex-wrap items-start" style={{ ...wrap, gap: 40 }}>
          <div style={{ flex: "1 1 300px" }}>
            <Kicker>PARAMÈTRES DU CABINET</Kicker>
            <H2 size={40}>Votre cabinet,<br />à votre façon.</H2>
            <p style={{ margin: "18px 0 22px", maxWidth: 300, fontSize: 15, lineHeight: 1.6, color: C.muted }}>Un cadre de travail à configurer avec votre équipe.</p>
            <div style={{ padding: "16px 18px", borderRadius: 8, background: "#fff", maxWidth: 330 }} data-testid="landing-price">
              <b style={{ fontSize: 15, fontWeight: 700 }}>{price} FCFA par mois</b>
              <p style={{ margin: "6px 0 12px", fontSize: 14, lineHeight: 1.55, color: C.muted }}>14 jours gratuits, sans carte bancaire. Paiement Mobile Money, ou déduit de vos gains de consultations en ligne.</p>
              <Link href={SIGNUP} style={{ color: C.accent, fontSize: 14.5, fontWeight: 700, textDecoration: "none" }} data-testid="cta-signup-price">Créer mon espace →</Link>
            </div>
          </div>
          <div className="grid" style={{ flex: "2 1 560px", minWidth: 0, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            {([["Votre organisation", ["Profil du cabinet", "Équipe", "Agenda et rappels"]], ["Vos documents", ["Tarifs", "Signature", "Comptes rendus A4"]], ["Vos paramètres", ["Confidentialité", "Réglages du cabinet", "Préférences de rappel"]]] as const).map(([t, l], i) => (
              <div key={t} style={{ padding: "24px 22px", borderRadius: 10, background: "#fff" }}>
                <span style={{ fontSize: 12, color: C.muted }}>0{i + 1}</span>
                <h3 style={{ fontFamily: FONT_UI, margin: "14px 0 16px", fontSize: 16, fontWeight: 600 }}>{t}</h3>
                {l.map((x) => <p key={x} style={{ margin: "0 0 8px", fontSize: 14.5, color: C.muted }}>{x}</p>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "84px 0" }}>
        <div className="grid" style={{ ...wrap, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 56 }}>
          <div>
            <Kicker>QUESTIONS DES PRATICIENS</Kicker>
            <H2 size={40}>Les bons repères pour votre cabinet.</H2>
            <p style={{ margin: "28px 0 0", maxWidth: 300, fontSize: 15, lineHeight: 1.6, color: C.muted }}>Un logiciel pour organiser la pratique, sans remplacer le regard clinique.</p>
          </div>
          <div>
            {FAQ.map(([q, a]) => (
              <div key={q} style={{ padding: "22px 0", borderTop: `1px solid ${C.line}` }}><b style={{ fontSize: 15, fontWeight: 600 }}>{q}</b><p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.65, color: C.muted }}>{a}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Appel final */}
      <section style={{ background: C.dark, color: "#fff", padding: "72px 0" }}>
        <div style={wrap}>
          <Kicker light>DÉCOUVREZ GLOWSCAN DERM</Kicker>
          <H2 light>Votre prochain rendez-vous :<br />une nouvelle façon de travailler.</H2>
          <p style={{ margin: "18px 0 30px", fontSize: 15.5, color: "#e4ede9" }}>Explorez les outils du cabinet et le parcours de consultation lors d'une démonstration.</p>
          <div className="flex flex-wrap" style={{ gap: 14 }}>
            <a href={DEMO_WA} target="_blank" rel="noopener noreferrer" className="flex items-center" style={{ gap: 10, padding: "14px 24px", borderRadius: 6, background: C.lime, color: C.text, fontSize: 15, fontWeight: 700, textDecoration: "none" }} data-testid="cta-demo-final">Demander une démonstration <ArrowRight size={15} /></a>
            <Link href={LOGIN} style={{ padding: "14px 22px", borderRadius: 6, background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>Se connecter</Link>
          </div>
        </div>
      </section>

      <footer style={{ background: C.soft, padding: "48px 0 28px" }}>
        <div style={wrap}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 30 }}>
            <div><b style={{ fontSize: 20, fontWeight: 700, letterSpacing: -.5 }}>glowscan</b><span style={{ display: "block", fontSize: 9, letterSpacing: 2.5, color: C.muted, marginTop: 4 }}>AFRICA / DERM</span><p style={{ margin: "14px 0 0", fontSize: 14, color: C.muted }}>L'espace médical du dermatologue.</p></div>
            <div className="flex flex-col" style={{ gap: 8, fontSize: 14 }}><span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.muted }}>LE LOGICIEL</span>
              <a href="#fonctionnalites" style={{ color: C.text, textDecoration: "none" }}>Fonctionnalités</a><a href="#consultation" style={{ color: C.text, textDecoration: "none" }}>Parcours de consultation</a><a href={DEMO_WA} target="_blank" rel="noopener noreferrer" style={{ color: C.text, textDecoration: "none" }}>Demander une démo</a></div>
            <div className="flex flex-col" style={{ gap: 8, fontSize: 14 }}><span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.muted }}>EN SAVOIR PLUS</span>
              <a href="#faq" style={{ color: C.text, textDecoration: "none" }}>Questions fréquentes</a><Link href="/derm/conditions" style={{ color: C.text, textDecoration: "none" }}>Confidentialité et conditions</Link><Link href={LOGIN} style={{ color: C.text, textDecoration: "none" }}>Se connecter</Link></div>
          </div>
          <div className="flex flex-wrap justify-between" style={{ gap: 10, marginTop: 36, paddingTop: 18, borderTop: `1px solid ${C.line}`, fontSize: 13, color: C.muted }}>
            <span>© {new Date().getFullYear()} GlowScan Africa · Derm</span><span>La technologie accompagne. Le dermatologue décide.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
