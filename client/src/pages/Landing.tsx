import { useLocation } from "wouter";
import { Check, ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

// ════════════════════════════════════════════════════════════════════════
// Page d'accueil B2C (glow-scan.com) — écran de bienvenue
// Design "Accueil dermatologie africaine" (handoff). Mobile-first, centré web.
// ════════════════════════════════════════════════════════════════════════

const C = {
  bodyBg: "#fbfdfb",
  heroFrom: "#173a2c",
  heroTo: "#1f4a39",
  ctaFrom: "#2f9e6e",
  ctaTo: "#1f7a52",
  ctaShadow: "rgba(47,158,110,0.4)",
  iconPill: "#e6f4ec",
  check: "#2f9e6e",
  dot: "#3fbf86",
  textDark: "#283330",
  textSecondary: "#6b7d76",
  font: "'Plus Jakarta Sans', system-ui, sans-serif",
};

const BENEFITS = [
  "Résultat en quelques secondes",
  "Pensé pour les peaux africaines",
  "100 % confidentiel",
];

export default function Landing() {
  const [, setLocation] = useLocation();

  useSEO({
    title: "GlowScan — Analyse de peau IA pour peaux africaines | Glow Score",
    description:
      "Analysez votre peau en quelques secondes avec l'IA. Diagnostic dermatologique et routine personnalisée pour peaux africaines. Gratuit pour commencer.",
    canonical: "https://glow-scan.com/",
  });

  // « Commencer maintenant » → début du flux d'analyse (1 analyse gratuite anonyme)
  const onStart = () => setLocation("/analyze");

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        background:
          "radial-gradient(120% 90% at 50% 0%, #e8f5ee 0%, #f7fbf8 55%, #fbfdfb 100%)",
        fontFamily: C.font,
      }}
    >
      {/* Colonne centrale (mobile-first, max 440px sur desktop) */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: C.bodyBg,
          boxShadow: "0 0 60px rgba(23,58,44,0.06)",
        }}
      >
        {/* ── ZONE 1 : Héro photo ── */}
        <div
          style={{
            position: "relative",
            height: 392,
            flex: "none",
            overflow: "hidden",
            borderRadius: "0 0 34px 34px",
            background: `linear-gradient(180deg, ${C.heroFrom} 0%, ${C.heroTo} 100%)`,
          }}
        >
          <img
            src="/glowscan-hero.jpeg"
            alt="Femme appliquant un soin de la peau devant un miroir GlowScan"
            style={{
              position: "absolute",
              top: 52,
              left: 0,
              width: "100%",
              height: 340,
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />
          {/* Voile dégradé pour lisibilité du texte */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, transparent 52%, rgba(20,40,30,0.55) 78%, rgba(15,32,24,0.9) 100%)",
              pointerEvents: "none",
            }}
          />
          {/* Texte ancré en bas */}
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 26 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 11px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                marginBottom: 12,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.dot }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff" }}>
                Analyse dermatologique par IA
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 31,
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#fff",
              }}
            >
              Bienvenue sur GlowScan
            </h1>
          </div>
        </div>

        {/* ── ZONE 2 : Corps ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "20px 22px 26px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.45,
              fontWeight: 500,
              color: C.textSecondary,
            }}
          >
            Photographiez votre peau et obtenez une analyse claire en quelques secondes.
          </p>

          {/* Liste d'avantages */}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {BENEFITS.map((label) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    flex: "none",
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: C.iconPill,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={17} strokeWidth={2.6} color={C.check} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>{label}</div>
              </div>
            ))}
          </div>

          {/* CTA collé en bas */}
          <div style={{ marginTop: "auto", paddingTop: 20 }}>
            <button
              onClick={onStart}
              data-testid="button-start"
              style={{
                width: "100%",
                border: "none",
                cursor: "pointer",
                height: 58,
                borderRadius: 18,
                background: `linear-gradient(150deg, ${C.ctaFrom}, ${C.ctaTo})`,
                boxShadow: `0 12px 26px ${C.ctaShadow}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                fontFamily: "inherit",
                transition: "transform 0.08s ease",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <span style={{ fontSize: 16.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                Commencer maintenant
              </span>
              <ArrowRight size={20} strokeWidth={2.4} color="#fff" />
            </button>
            <div
              style={{
                marginTop: 11,
                textAlign: "center",
                fontSize: 12.5,
                fontWeight: 500,
                color: C.textSecondary,
              }}
            >
              Gratuit pour commencer · Aucune carte requise
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
