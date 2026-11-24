import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Check, ShieldCheck, FileText, Menu, X,
  ScanFace, Stethoscope, ScanBarcode, Clock, TrendingUp, ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Page d'accueil visiteur (glow-scan.com, non connecté) — maquettes Main / Mobile.
// Une seule page responsive (flex-wrap / grid auto-fit). Règles : aucun chiffre de
// traction, pas de « 100 % confidentiel », pas de nom de dermatologue inventé.
// ════════════════════════════════════════════════════════════════════════

const C = {
  green: "#0F3B32", bg: "#F6F8F7", card: "#FFFFFF", line: "#E2E8E5", pale: "#E3EFE9", band: "#E9F1ED",
  text: "#10231E", sub: "#4E6159", sub2: "#3F524B", accent: "#1E6F61", accentDark: "#9FD3C1", onDark: "#D3E4DD",
};
const FONT = "'DM Sans', system-ui, sans-serif";
// CGU : /derm/conditions tant que la page /cgu (branche cgu-v2) n'est pas en ligne.
const CGU_HREF = "/derm/conditions";
const CONTACT_HREF = "mailto:demiseessawe12@gmail.com";

const NAV: { label: string; href: string; hash?: boolean }[] = [
  { label: "Comment ça marche", href: "#comment", hash: true },
  { label: "Dermatologues", href: "#dermatologues", hash: true },
  { label: "Boutique", href: "/shop" },
  { label: "Espace dermatologue", href: "/derm" },
  { label: "Se connecter", href: "/auth" },
];

const TRUST: [string, string][] = [
  ["Dermatologues en exercice", "Au Cameroun et en Afrique francophone"],
  ["Peaux noires et métissées", "Phototypes IV à VI au cœur du produit"],
  ["Ordonnance signée", "Par le dermatologue, envoyée sur WhatsApp"],
  ["Données protégées", "Selon la loi camerounaise n° 2024/017"],
];

// [titre, texte ordinateur, texte téléphone (plus court, maquette Mobile)]
const STEPS: [string, string, string][] = [
  ["Photographiez votre peau", "Une photo avec votre téléphone suffit. Répondez à quelques questions : depuis quand, ce que vous avez déjà essayé.", "Une photo avec votre téléphone et quelques questions."],
  ["L'IA prépare votre dossier", "Elle décrit ce qu'elle observe, zone par zone, et vous donne une première analyse gratuite en quelques secondes.", "Une première analyse gratuite, zone par zone, en quelques secondes."],
  ["Un dermatologue valide et prescrit", "Il relit votre dossier, confirme ou corrige, et vous envoie un compte rendu signé et une ordonnance si besoin.", "Compte rendu signé et ordonnance si besoin."],
];

const FEATURES: { icon: LucideIcon; title: string; text: string; href: string }[] = [
  { icon: ScanFace, title: "Analyse de peau par IA", text: "Une photo, une première analyse gratuite en quelques secondes, zone par zone.", href: "/analyze" },
  { icon: Stethoscope, title: "Consultation dermatologue", text: "Un dermatologue vérifie votre dossier et vous envoie compte rendu et ordonnance.", href: "/dermatologues" },
  { icon: ScanBarcode, title: "Scan de produit", text: "Photographiez la liste d'ingrédients d'une crème : GlowScan repère l'hydroquinone, les corticoïdes et le mercure.", href: "/product-scan-camera" },
  { icon: Clock, title: "Ma routine", text: "Votre routine du matin et du soir, avec des rappels pour ne rien oublier.", href: "/routine" },
  { icon: TrendingUp, title: "Suivi de ma peau", text: "Refaites une analyse dans quelques semaines et voyez l'évolution de votre peau.", href: "/ma-peau" },
  { icon: ShoppingBag, title: "Boutique skincare", text: "Le kit adapté à votre peau, produits de marques reconnues, livrés chez vous.", href: "/shop" },
];

const eyebrow: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent };
const h2: React.CSSProperties = { margin: 0, fontSize: "clamp(26px, 3.6vw, 40px)", lineHeight: 1.12, letterSpacing: "-0.02em", color: C.green, fontWeight: 700 };
const wrap: React.CSSProperties = { maxWidth: 1200, margin: "0 auto", paddingLeft: "clamp(20px, 3vw, 32px)", paddingRight: "clamp(20px, 3vw, 32px)", boxSizing: "border-box" };
const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 52, textDecoration: "none", background: C.green, color: "#fff", fontSize: 16, fontWeight: 600, padding: "14px 24px", borderRadius: 12, boxSizing: "border-box" };
const btnSecondary: React.CSSProperties = { ...btnPrimary, background: "#fff", color: C.green, border: `1.5px solid ${C.green}` };

function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minHeight: 44 }}>
      <img src="/glowscan-mark.png" alt="GlowScan Africa" width={40} height={40} style={{ width: 40, height: 40, objectFit: "contain" }} />
      <span style={{ fontSize: 20, fontWeight: 700, color: C.green, letterSpacing: "-0.01em" }}>GlowScan</span>
    </Link>
  );
}

function NavLink({ l, onClick }: { l: (typeof NAV)[number]; onClick?: () => void }) {
  const s: React.CSSProperties = { textDecoration: "none", color: "#34463F", minHeight: 44, display: "inline-flex", alignItems: "center" };
  return l.hash ? <a href={l.href} style={s} onClick={onClick}>{l.label}</a> : <Link href={l.href} style={s} onClick={onClick}>{l.label}</Link>;
}

function CheckLine({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Check size={16} strokeWidth={2.2} color={C.accent} aria-hidden />{children}</span>;
}

export default function Landing() {
  const [menu, setMenu] = useState(false);
  useEffect(() => { ensureDermFonts(); }, []);

  useSEO({
    title: "GlowScan Africa — Dermatologue en ligne et analyse de peau IA",
    description:
      "Analyse de peau par IA et consultation dermatologique dans l'app : l'IA prépare le dossier, le dermatologue valide et prescrit. Pensé pour les peaux africaines.",
    canonical: "https://glow-scan.com/",
  });

  return (
    <div className="gs-landing" style={{ fontFamily: FONT, color: C.text, background: C.bg, minWidth: 0, overflowX: "hidden" }}>
      <style>{`
        .gs-landing h1, .gs-landing h2, .gs-landing h3 { font-family: ${FONT}; }
        .gs-landing a:hover { color: #0A2A24; }
        .gs-landing .gs-nav { display: flex; }
        .gs-landing .gs-menu-btn { display: none; }
        .gs-landing .gs-float { display: flex; }
        .gs-landing .gs-hero-img { height: 560px; }
        .gs-landing .only-m { display: none; }
        @media (max-width: 900px) {
          .gs-landing .gs-nav { display: none; }
          .gs-landing .gs-menu-btn { display: flex; }
          .gs-landing .gs-float { display: none; }
          .gs-landing .gs-hero-img { height: 320px; }
        }
        /* Téléphone : maquette « Mobile » (390 px) */
        @media (max-width: 640px) {
          .gs-landing .only-d { display: none !important; }
          .gs-landing .only-m { display: revert; }
          .gs-landing .gs-hero-media { display: none; }
          .gs-landing .gs-hero-btns > a { flex: 1 1 100% !important; max-width: none !important; height: 54px; padding: 0 16px !important; }
          .gs-landing .gs-trust { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 18px !important; padding-top: 24px !important; padding-bottom: 24px !important; }
          .gs-landing .gs-trust b { font-size: 14px !important; }
          .gs-landing .gs-trust span { font-size: 13px !important; }
          .gs-landing .gs-step { flex-direction: row !important; gap: 14px !important; padding: 20px !important; border-radius: 16px !important; }
          .gs-landing .gs-step h3 { font-size: 17px !important; }
          .gs-landing .gs-step p { font-size: 14px !important; line-height: 1.5 !important; }
          .gs-landing .gs-feature { border-radius: 16px !important; padding: 18px !important; flex-wrap: nowrap !important; }
          .gs-landing .gs-feature b { font-size: 16px !important; }
          .gs-landing .gs-feature span span { font-size: 13.5px !important; }
          .gs-landing .gs-section-p { font-size: 15px !important; }
          .gs-landing .gs-pro-btn { width: 100%; height: 48px; font-size: 15px !important; }
          .gs-landing .gs-pro p { display: none; }
          .gs-landing footer { font-size: 13px; }
        }
        .gs-landing .gs-card-link { transition: border-color .15s, box-shadow .15s; }
        .gs-landing .gs-card-link:hover { border-color: ${C.green}; box-shadow: 0 6px 18px rgba(15,59,50,.08); }
      `}</style>

      {/* En-tête */}
      <header style={{ background: "#fff", borderBottom: `1px solid ${C.line}`, position: "relative", zIndex: 20 }}>
        <div style={{ ...wrap, paddingTop: 12, paddingBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Logo />
          <nav aria-label="Navigation principale" className="gs-nav" style={{ flexWrap: "wrap", alignItems: "center", gap: 26, fontSize: 15, fontWeight: 500 }}>
            {NAV.map((l) => <NavLink key={l.href} l={l} />)}
            <Link href="/analyze" style={{ ...btnPrimary, minHeight: 44, fontSize: 15, padding: "10px 20px", borderRadius: 10 }} data-testid="button-start">Analyser ma peau</Link>
          </nav>
          <button type="button" className="gs-menu-btn" aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menu} onClick={() => setMenu((v) => !v)}
            style={{ width: 44, height: 44, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer" }}>
            {menu ? <X size={20} color={C.green} /> : <Menu size={20} color={C.green} />}
          </button>
        </div>
        {menu && (
          <nav aria-label="Menu" style={{ borderTop: `1px solid ${C.line}`, background: "#fff", padding: "8px clamp(20px, 3vw, 32px) 16px", display: "flex", flexDirection: "column", fontSize: 16, fontWeight: 500 }}>
            {NAV.map((l) => <NavLink key={l.href} l={l} onClick={() => setMenu(false)} />)}
            <Link href="/analyze" style={{ ...btnPrimary, marginTop: 8 }}>Analyser ma peau</Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section style={{ ...wrap, paddingTop: "clamp(28px, 6vw, 72px)", paddingBottom: "clamp(32px, 5vw, 56px)", display: "flex", flexWrap: "wrap", gap: "clamp(24px, 4.5vw, 56px)", alignItems: "center" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: "clamp(18px, 2vw, 24px)" }}>
          <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: C.pale, color: C.green, fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 999, lineHeight: 1.35 }}>
            <ShieldCheck size={16} strokeWidth={2} aria-hidden style={{ flex: "none" }} className="only-d" />
            <span className="only-d">Un mini dermatologue pour tous, pensé pour les peaux africaines</span>
            <span className="only-m">Un mini dermatologue pour tous</span>
          </span>
          <h1 style={{ margin: 0, fontSize: "clamp(34px, 4.6vw, 56px)", lineHeight: 1.06, fontWeight: 700, letterSpacing: "-0.025em", color: C.green }}>
            Un avis dermatologique fiable, sans faire la queue.
          </h1>
          <p style={{ margin: 0, fontSize: "clamp(16px, 1.6vw, 19px)", lineHeight: 1.55, color: C.sub2, maxWidth: 560 }}>
            Photographiez votre peau. Notre IA prépare votre dossier, un dermatologue le vérifie et vous prescrit le bon traitement.<span className="only-d"> Tout se passe dans l'application.</span>
          </p>
          {/* Téléphone : l'image vient avant les boutons, comme sur la maquette mobile */}
          <img src="/img/accueil-dermatologue.webp" alt="Une dermatologue examine la peau d'une patiente" className="only-m"
            fetchPriority="high" decoding="async" width={1600} height={1986}
            style={{ width: "100%", height: 300, objectFit: "cover", objectPosition: "center 25%", borderRadius: 20 }} />
          <div className="gs-hero-btns" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/analyze" style={{ ...btnPrimary, flex: "1 1 260px", maxWidth: 360 }}>Analyser ma peau gratuitement <ArrowRight size={18} aria-hidden /></Link>
            <Link href="/dermatologues" style={{ ...btnSecondary, flex: "1 1 260px", maxWidth: 360 }}>Consulter un dermatologue · 5 000 FCFA</Link>
          </div>
          <div className="only-d" style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", fontSize: 14, color: C.sub2 }}>
            <CheckLine>Analyse gratuite</CheckLine>
            <CheckLine>Réponse d'un dermatologue sous 24 h</CheckLine>
            <CheckLine>Paiement Mobile Money</CheckLine>
          </div>
          <span className="only-m" style={{ fontSize: 13, color: C.sub, textAlign: "center" }}>Données protégées selon la loi camerounaise n° 2024/017</span>
        </div>

        <div className="gs-hero-media" style={{ flex: "1 1 400px", minWidth: 0, position: "relative" }}>
          <img src="/img/accueil-dermatologue.webp" alt="Une dermatologue examine la peau d'une patiente" className="gs-hero-img"
            fetchPriority="high" decoding="async" width={1600} height={1986}
            style={{ display: "block", width: "100%", objectFit: "cover", objectPosition: "center 30%", borderRadius: 24 }} />
          <div className="gs-float" style={{ position: "absolute", left: -28, bottom: 36, width: 300, background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 12px 32px rgba(15,59,50,0.14)", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5B6E66" }}>Votre dossier</span>
            {["Dossier préparé par l'IA", "Vérifié par un dermatologue"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: C.pale, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Check size={15} strokeWidth={2.2} color={C.green} aria-hidden /></span>{t}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: C.green }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><FileText size={15} color="#fff" aria-hidden /></span>Ordonnance prête
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau confiance */}
      <section style={{ background: "#fff", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div className="gs-trust" style={{ ...wrap, paddingTop: 28, paddingBottom: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 24 }}>
          {TRUST.map(([t, s]) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 16, color: C.green }}>{t}</b><span style={{ fontSize: 14, color: C.sub }}>{s}</span></div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" style={{ ...wrap, paddingTop: "clamp(48px, 8vw, 96px)", paddingBottom: "clamp(40px, 6vw, 72px)", display: "flex", flexDirection: "column", gap: "clamp(24px, 3vw, 40px)", scrollMarginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={eyebrow}>Comment ça marche</span>
          <h2 style={h2}><span className="only-d">L'IA fait le travail préparatoire. Le dermatologue décide.</span><span className="only-m">L'IA prépare. Le dermatologue décide.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "clamp(12px, 1.6vw, 20px)" }}>
          {STEPS.map(([t, p, pm], i) => {
            const dark = i === 2;
            return (
              <div key={t} className="gs-step" style={{ background: dark ? C.green : "#fff", border: dark ? "none" : `1px solid ${C.line}`, borderRadius: 20, padding: "clamp(20px, 2.4vw, 28px)", display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: dark ? C.accentDark : C.accent }}>{i + 1}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: "clamp(18px, 1.8vw, 22px)", color: dark ? "#fff" : C.green }}>{t}</h3>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: dark ? C.onDark : C.sub }}><span className="only-d">{p}</span><span className="only-m">{pm}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mini dermatologue */}
      <section style={{ background: C.band }}>
        <div style={{ ...wrap, paddingTop: "clamp(48px, 7vw, 88px)", paddingBottom: "clamp(48px, 7vw, 88px)", display: "flex", flexDirection: "column", gap: "clamp(24px, 3vw, 40px)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={eyebrow}>Tout dans une seule application</span>
              <h2 style={h2}>Un mini dermatologue dans votre poche.</h2>
            </div>
            <p className="gs-section-p" style={{ flex: "1 1 340px", minWidth: 0, margin: 0, fontSize: 17, lineHeight: 1.6, color: C.sub2 }}>
              Comprendre sa peau, choisir les bons produits, éviter les dangereux et suivre ses progrès<span className="only-d"> : GlowScan vous accompagne au quotidien, et un dermatologue prend le relais quand il le faut</span>.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: "clamp(12px, 1.6vw, 20px)" }}>
            {FEATURES.map(({ icon: Icon, title, text, href }) => (
              <Link key={title} href={href} className="gs-card-link gs-feature" style={{ textDecoration: "none", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 20, padding: "clamp(18px, 2.4vw, 28px)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: C.pale, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon size={22} color={C.green} strokeWidth={2} aria-hidden /></span>
                <span style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <b style={{ fontSize: "clamp(16px, 1.6vw, 20px)", color: C.green }}>{title}</b>
                  <span style={{ fontSize: 15, lineHeight: 1.55, color: C.sub }}>{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi GlowScan */}
      <section id="dermatologues" style={{ ...wrap, paddingTop: "clamp(40px, 6vw, 96px)", paddingBottom: "clamp(40px, 8vw, 96px)", display: "flex", flexWrap: "wrap", gap: "clamp(20px, 4vw, 48px)", alignItems: "center", scrollMarginTop: 16 }}>
        <img src="/img/accueil-scan-selfie.webp" alt="Un homme photographie sa peau avec son téléphone" loading="lazy" decoding="async" width={1600} height={1600}
          style={{ flex: "1 1 380px", minWidth: 0, width: "100%", height: "clamp(280px, 34vw, 440px)", objectFit: "cover", borderRadius: 24 }} />
        <div style={{ flex: "1 1 440px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={eyebrow}>Pourquoi GlowScan</span>
          <h2 style={h2}>Les outils dermatologiques<span className="only-d"> du monde</span> voient très peu de peaux comme la vôtre.</h2>
          <p className="gs-section-p" style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: C.sub2 }}>La plupart des IA de dermatologie ont été entraînées presque sans peaux noires.<span className="only-d"> Une tache, un eczéma ou une acné ne se présentent pas de la même façon sur une peau foncée.</span> GlowScan apprend à partir de cas vérifiés par des dermatologues africains.</p>
          <p className="gs-section-p" style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: C.sub2 }}><span className="only-d">Et nous ne vendons aucun produit éclaircissant</span><span className="only-m">Aucun produit éclaircissant</span> : pas d'hydroquinone, pas de corticoïdes, pas de mercure.</p>
        </div>
      </section>

      {/* Ce que vous obtenez */}
      <section id="boutique" style={{ background: "#fff", borderTop: `1px solid ${C.line}` }}>
        <div style={{ ...wrap, paddingTop: "clamp(48px, 8vw, 96px)", paddingBottom: "clamp(48px, 8vw, 96px)", display: "flex", flexDirection: "column", gap: "clamp(24px, 3vw, 40px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
            <span style={eyebrow}>Ce que vous obtenez</span>
            <h2 style={h2} className="only-d">Commencez gratuitement, allez plus loin si besoin.</h2>
          </div>
          {/* Téléphone : offres en lignes compactes (maquette Mobile) */}
          <div className="only-m" style={{ marginTop: -10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Link href="/analyze" style={{ textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, background: C.bg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 17, color: C.green }}>Analyse IA</b><span style={{ fontSize: 13, color: C.sub }}>En quelques secondes</span></span>
                <b style={{ fontSize: 18, color: C.green }}>Gratuit</b>
              </Link>
              <div style={{ border: `2px solid ${C.green}`, borderRadius: 16, padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><b style={{ fontSize: 17, color: C.green }}>Consultation dermatologue</b><b style={{ fontSize: 18, color: C.green, whiteSpace: "nowrap" }}>5 000 FCFA</b></div>
                <span style={{ fontSize: 13, lineHeight: 1.5, color: C.sub }}>Compte rendu signé et ordonnance, sur WhatsApp. Réponse sous 24 h, ou remboursé.</span>
                <Link href="/dermatologues" style={{ ...btnPrimary, fontSize: 15, minHeight: 48 }}>Consulter un dermatologue</Link>
              </div>
              <Link href="/shop" style={{ textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, background: C.bg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 17, color: C.green }}>Kits de soins</b><span style={{ fontSize: 13, color: C.sub }}>Adaptés à votre analyse, livrés</span></span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.green, whiteSpace: "nowrap" }}>Voir →</span>
              </Link>
            </div>
          </div>
          <div className="only-d" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 20 }}>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 20, padding: "clamp(20px, 2.4vw, 28px)", display: "flex", flexDirection: "column", gap: 12, background: C.bg }}>
              <h3 style={{ margin: 0, fontSize: 21, color: C.green }}>Analyse IA</h3>
              <b style={{ fontSize: "clamp(24px, 2.6vw, 32px)", color: C.green }}>Gratuit</b>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.sub }}>Une première analyse de votre peau en quelques secondes, avec les zones à surveiller.</p>
              <Link href="/analyze" style={{ marginTop: "auto", textDecoration: "none", fontWeight: 600, fontSize: 15, color: C.green, minHeight: 44, display: "inline-flex", alignItems: "center" }}>Analyser ma peau →</Link>
            </div>
            <div style={{ border: `2px solid ${C.green}`, borderRadius: 20, padding: "clamp(20px, 2.4vw, 28px)", display: "flex", flexDirection: "column", gap: 12, background: "#fff" }}>
              <h3 style={{ margin: 0, fontSize: 21, color: C.green }}>Consultation dermatologue</h3>
              <b style={{ fontSize: "clamp(24px, 2.6vw, 32px)", color: C.green }}>5 000 FCFA</b>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.sub }}>Compte rendu signé et ordonnance si besoin, envoyés sur WhatsApp. Réponse sous 24 h, ou vous êtes remboursé.</p>
              <Link href="/dermatologues" style={{ ...btnPrimary, marginTop: "auto", fontSize: 15 }}>Consulter un dermatologue</Link>
            </div>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 20, padding: "clamp(20px, 2.4vw, 28px)", display: "flex", flexDirection: "column", gap: 12, background: C.bg }}>
              <h3 style={{ margin: 0, fontSize: 21, color: C.green }}>Kits de soins</h3>
              <b style={{ fontSize: "clamp(24px, 2.6vw, 32px)", color: C.green }}>Selon votre peau</b>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.sub }}>Le kit adapté à votre analyse : acné, taches, peau sèche… Produits de marques reconnues, livrés chez vous.</p>
              <Link href="/shop" style={{ marginTop: "auto", textDecoration: "none", fontWeight: 600, fontSize: 15, color: C.green, minHeight: 44, display: "inline-flex", alignItems: "center" }}>Voir les kits →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Espace dermatologue */}
      <section id="pro" style={{ ...wrap, paddingTop: "clamp(32px, 8vw, 96px)", paddingBottom: "clamp(32px, 8vw, 96px)" }}>
        <div className="gs-pro" style={{ background: C.green, borderRadius: "clamp(20px, 2.4vw, 28px)", padding: "clamp(26px, 4.6vw, 56px)", display: "flex", flexWrap: "wrap", gap: "20px 32px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 440px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ ...eyebrow, color: C.accentDark }}>Vous êtes dermatologue ?</span>
            <h2 style={{ ...h2, fontSize: "clamp(21px, 3vw, 36px)", lineHeight: 1.2, color: "#fff" }}><span className="only-d">GlowScan Derm : vos</span><span className="only-m">Vos</span> dossiers prêts, vos ordonnances en quelques secondes.</h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: C.onDark }}>Recevez des patients déjà documentés, suivez-les dans le temps et consultez à distance.</p>
          </div>
          <Link href="/derm" className="gs-pro-btn" style={{ ...btnPrimary, background: "#fff", color: C.green, flex: "0 1 auto" }}>Découvrir GlowScan Derm</Link>
        </div>
      </section>

      {/* Pied de page */}
      <footer style={{ borderTop: `1px solid ${C.line}`, background: "#fff" }}>
        <div style={{ ...wrap, paddingTop: "clamp(28px, 4vw, 40px)", paddingBottom: "clamp(28px, 4vw, 40px)", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", fontSize: 14, color: C.sub }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
            <b style={{ color: C.green, fontSize: 16 }}>GlowScan Africa · Douala</b>
            <span style={{ lineHeight: 1.55 }}>L'analyse IA ne remplace pas un diagnostic médical. En cas de douleur forte, de fièvre ou de lésion qui saigne, consultez un médecin sans attendre.</span>
          </div>
          <nav aria-label="Liens du pied de page" style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", alignItems: "flex-start" }}>
            <Link href={CGU_HREF} style={{ color: C.sub, minHeight: 44, display: "inline-flex", alignItems: "center" }}>Conditions d'utilisation</Link>
            <Link href="/confidentialite" style={{ color: C.sub, minHeight: 44, display: "inline-flex", alignItems: "center" }}>Confidentialité</Link>
            <a href={CONTACT_HREF} style={{ color: C.sub, minHeight: 44, display: "inline-flex", alignItems: "center" }}>Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
