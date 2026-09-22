import { ScanLine, ShoppingBag, ArrowRight, Stethoscope, Home as HomeIcon, FolderClosed } from "lucide-react";
import { GS, GsScreen, GsMono, GsMarks, GsButton } from "@/lib/gs-ui";

// ════════════════════════════════════════════════════════════════════════
// Refonte B2C — Écran « 01F Accueil » (parcours patient), bâti sur la
// fondation partagée gs-ui. Câblé aux vraies données (prénom, nb d'analyses
// du mois) et à la navigation existante. Logique métier non touchée.
// ════════════════════════════════════════════════════════════════════════

export function HomeAccueil({ firstName, monthCount, go }: { firstName: string; monthCount: number; go: (path: string) => void }) {
  const shortcuts = [
    { icon: <ScanLine size={19} strokeWidth={1.6} style={{ color: GS.ink }} />, label: "Scan produit", desc: "Bon pour vous ?", descColor: GS.muted, path: "/scan-product" },
    { icon: <ShoppingBag size={19} strokeWidth={1.6} style={{ color: GS.ink }} />, label: "Boutique", desc: "Livraison Douala", descColor: GS.muted, path: "/shop" },
    { icon: <Stethoscope size={19} strokeWidth={1.6} style={{ color: GS.ink }} />, label: "Dermatologues", desc: "Téléconsultation", descColor: GS.teal, path: "/derm" },
  ];
  const nav = [
    { icon: HomeIcon, label: "ACCUEIL", path: "/", active: true },
    { icon: ScanLine, label: "SCAN", path: "/analyze", active: false },
    { icon: ShoppingBag, label: "BOUTIQUE", path: "/shop", active: false },
    { icon: FolderClosed, label: "DOSSIER", path: "/profile", active: false },
  ];

  return (
    <GsScreen>
      {/* En-tête : logo · compteur · avatar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <img
          src="/glowscan-mark.png"
          alt="GlowScan"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }}
          style={{ width: 32, height: 32, display: "block", objectFit: "contain" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ border: `1px solid ${GS.line}`, padding: "6px 9px" }}>
            <GsMono color={GS.teal} style={{ letterSpacing: ".06em" }}>{monthCount} ANALYSE{monthCount > 1 ? "S" : ""} CE MOIS</GsMono>
          </span>
          <button onClick={() => go("/profile")} aria-label="Mon dossier"
            style={{ width: 34, height: 34, border: `1px solid ${GS.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.mono, fontSize: 13, fontWeight: 600, color: GS.ink, cursor: "pointer", padding: 0 }}>
            {(firstName || "U").charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {/* Salutation */}
      <GsMono>Dossier ouvert aujourd'hui</GsMono>
      <div style={{ fontSize: 26, fontWeight: 600, color: GS.ink, letterSpacing: "-.9px", lineHeight: 1.15, marginTop: 6 }}>Bonjour {firstName}</div>

      {/* Carte « Première analyse » */}
      <div style={{ marginTop: 18, position: "relative", border: `1px solid ${GS.ink}`, padding: 18 }}>
        <GsMarks />
        <GsMono color={GS.teal} style={{ letterSpacing: ".14em", display: "block", marginBottom: 8 }}>{monthCount > 0 ? "Nouvelle analyse" : "Première analyse"}</GsMono>
        <div style={{ fontSize: 19, fontWeight: 600, color: GS.ink, letterSpacing: "-.5px", lineHeight: 1.25 }}>Trois photos, deux minutes, un résultat</div>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: GS.muted, marginTop: 8 }}>Visage, corps ou cheveux — vous choisissez la zone juste après.</div>
        <GsButton onClick={() => go("/analyze")} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />} style={{ marginTop: 16, padding: 15 }}>
          Lancer une analyse
        </GsButton>
      </div>

      {/* Raccourcis */}
      <GsMono style={{ display: "block", marginTop: 18, marginBottom: 9 }}>Raccourcis</GsMono>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: GS.line, border: `1px solid ${GS.line}` }}>
        {shortcuts.map((s) => (
          <button key={s.label} onClick={() => go(s.path)}
            style={{ background: "#fff", padding: "13px 10px", display: "flex", flexDirection: "column", gap: 7, minHeight: 94, boxSizing: "border-box", border: "none", textAlign: "left", cursor: "pointer" }}>
            {s.icon}
            <div style={{ fontSize: 12, fontWeight: 600, color: GS.ink, lineHeight: 1.3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: s.descColor, lineHeight: 1.35 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Bandeau Premium */}
      <button onClick={() => go("/premium")}
        style={{ marginTop: 16, width: "100%", border: `1px solid ${GS.accent}`, background: GS.mintBg, padding: 15, display: "flex", alignItems: "center", gap: 13, cursor: "pointer", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Passer Premium · 2 000 F/mois</div>
          <div style={{ fontSize: 11, color: GS.muted, marginTop: 4, lineHeight: 1.45 }}>Analyses, scans produit et routine sans limite.</div>
        </div>
        <span style={{ background: GS.ink, color: "#fff", padding: "11px 14px", fontSize: 12, fontWeight: 600, flex: "none" }}>Voir</span>
      </button>

      {/* Barre de navigation */}
      <div style={{ marginTop: "auto", paddingBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${GS.hair}` }}>
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <button key={n.label} onClick={() => go(n.path)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Icon size={19} strokeWidth={1.6} style={{ color: n.active ? GS.ink : GS.faint }} />
                <span style={{ fontFamily: GS.mono, fontSize: 8, fontWeight: 600, color: n.active ? GS.ink : GS.faint, letterSpacing: ".06em" }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </GsScreen>
  );
}
