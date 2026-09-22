import { useEffect } from "react";
import { ScanLine, ShoppingBag, ArrowRight, Stethoscope, Home as HomeIcon, FolderClosed } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// Refonte B2C — Écran « 01F Accueil » (parcours patient).
// Langage visuel du design : blanc + turquoise #12D8BE, encre #0B1719, angles
// carrés, filets 1px, repères « + », IBM Plex Sans/Mono. Reproduit fidèlement
// la maquette, câblé aux vraies données (prénom, nb d'analyses du mois) et à la
// navigation existante. La logique métier n'est pas touchée.
// ════════════════════════════════════════════════════════════════════════

// Palette du design
const INK = "#0B1719";
const MUTED = "#5D6E71";
const FAINT = "#8C9C9E";
const LINE = "#DCE4E5";
const LINE2 = "#D3DDDE";
const ACCENT = "#12D8BE";
const TEAL = "#0A6E72";
const MINT_BG = "#F4FEFC";
const HAIR = "#EEF2F2";
const SANS = "'IBM Plex Sans',system-ui,-apple-system,sans-serif";
const MONO = "'IBM Plex Mono',ui-monospace,monospace";

// Charge IBM Plex (Sans + Mono) une seule fois — n'affecte que ce qui l'utilise.
function useGsFonts() {
  useEffect(() => {
    if (document.getElementById("gs-plex-fonts")) return;
    const l = document.createElement("link");
    l.id = "gs-plex-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(l);
  }, []);
}

// Repères de calage « + » aux quatre coins d'une figure.
function Marks() {
  const base: React.CSSProperties = { position: "absolute", font: `400 12px ${MONO}`, color: "#A9BCBE", lineHeight: 1 };
  return (
    <>
      <span style={{ ...base, top: -7, left: -5 }}>+</span>
      <span style={{ ...base, top: -7, right: -5 }}>+</span>
      <span style={{ ...base, bottom: -7, left: -5 }}>+</span>
      <span style={{ ...base, bottom: -7, right: -5 }}>+</span>
    </>
  );
}

export function HomeAccueil({ firstName, monthCount, go }: { firstName: string; monthCount: number; go: (path: string) => void }) {
  useGsFonts();
  const mono9: React.CSSProperties = { fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".16em", color: FAINT };

  return (
    <div style={{ minHeight: "100dvh", background: "#fff", fontFamily: SANS, WebkitFontSmoothing: "antialiased", color: INK, display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", padding: "14px 24px 0", boxSizing: "border-box" }}>

        {/* En-tête : logo · compteur · avatar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <img
            src="/glowscan-mark.png"
            alt="GlowScan"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }}
            style={{ width: 32, height: 32, display: "block", objectFit: "contain" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ border: `1px solid ${LINE}`, padding: "6px 9px", fontFamily: MONO, fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: ".06em" }}>
              {monthCount} ANALYSE{monthCount > 1 ? "S" : ""} CE MOIS
            </span>
            <button onClick={() => go("/profile")} aria-label="Mon dossier"
              style={{ width: 34, height: 34, border: `1px solid ${LINE}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 13, fontWeight: 600, color: INK, cursor: "pointer", padding: 0 }}>
              {(firstName || "U").charAt(0).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Salutation */}
        <div style={mono9}>Dossier ouvert aujourd'hui</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: INK, letterSpacing: "-.9px", lineHeight: 1.15, marginTop: 6 }}>Bonjour {firstName}</div>

        {/* Carte « Première analyse » */}
        <div style={{ marginTop: 18, position: "relative", border: `1px solid ${INK}`, padding: 18 }}>
          <Marks />
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", color: TEAL, marginBottom: 8 }}>
            {monthCount > 0 ? "Nouvelle analyse" : "Première analyse"}
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, color: INK, letterSpacing: "-.5px", lineHeight: 1.25 }}>Trois photos, deux minutes, un résultat</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: MUTED, marginTop: 8 }}>Visage, corps ou cheveux — vous choisissez la zone juste après.</div>
          <button onClick={() => go("/analyze")}
            style={{ width: "100%", background: INK, color: "#fff", border: "none", padding: 15, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, fontFamily: SANS, cursor: "pointer" }}>
            Lancer une analyse <ArrowRight size={16} style={{ color: ACCENT }} strokeWidth={2} />
          </button>
        </div>

        {/* Raccourcis */}
        <div style={{ ...mono9, marginTop: 18, marginBottom: 9 }}>Raccourcis</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: LINE, border: `1px solid ${LINE}` }}>
          {[
            { icon: <ScanLine size={19} strokeWidth={1.6} style={{ color: INK }} />, label: "Scan produit", desc: "Bon pour vous ?", descColor: MUTED, path: "/scan-product" },
            { icon: <ShoppingBag size={19} strokeWidth={1.6} style={{ color: INK }} />, label: "Boutique", desc: "Livraison Douala", descColor: MUTED, path: "/shop" },
            { icon: <Stethoscope size={19} strokeWidth={1.6} style={{ color: INK }} />, label: "Dermatologues", desc: "Téléconsultation", descColor: TEAL, path: "/derm" },
          ].map((s) => (
            <button key={s.label} onClick={() => go(s.path)}
              style={{ background: "#fff", padding: "13px 10px", display: "flex", flexDirection: "column", gap: 7, minHeight: 94, boxSizing: "border-box", border: "none", textAlign: "left", cursor: "pointer" }}>
              {s.icon}
              <div style={{ fontSize: 12, fontWeight: 600, color: INK, lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: s.descColor, lineHeight: 1.35 }}>{s.desc}</div>
            </button>
          ))}
        </div>

        {/* Bandeau Premium */}
        <button onClick={() => go("/premium")}
          style={{ marginTop: 16, width: "100%", border: `1px solid ${ACCENT}`, background: MINT_BG, padding: 15, display: "flex", alignItems: "center", gap: 13, cursor: "pointer", textAlign: "left" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>Passer Premium · 2 000 F/mois</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>Analyses, scans produit et routine sans limite.</div>
          </div>
          <span style={{ background: INK, color: "#fff", padding: "11px 14px", fontSize: 12, fontWeight: 600, flex: "none" }}>Voir</span>
        </button>

        {/* Barre de navigation */}
        <div style={{ marginTop: "auto", paddingBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${HAIR}` }}>
            {[
              { icon: HomeIcon, label: "ACCUEIL", path: "/", active: true },
              { icon: ScanLine, label: "SCAN", path: "/analyze", active: false },
              { icon: ShoppingBag, label: "BOUTIQUE", path: "/shop", active: false },
              { icon: FolderClosed, label: "DOSSIER", path: "/profile", active: false },
            ].map((n) => {
              const Icon = n.icon;
              return (
                <button key={n.label} onClick={() => go(n.path)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <Icon size={19} strokeWidth={1.6} style={{ color: n.active ? INK : FAINT }} />
                  <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 600, color: n.active ? INK : FAINT, letterSpacing: ".06em" }}>{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
