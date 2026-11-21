import { Link } from "wouter";
import { GsTopBar } from "@/components/GsTopBar";
import { ArrowLeft, FileText, ScrollText } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { CGU_INTRO, CGU_SECTIONS, CGU_VERSION_LABEL, CguBody, type CguTheme } from "@/content/CguText";

// Conditions générales d'utilisation — appli patient (/cgu). Même style que /confidentialite.
const DS = { base: "#f8f8f6", text: "#17392c", body: "#3d4f48", muted: "#5f6f69" };
const ACCENT = "#164034";
const THEME: CguTheme = { ink: DS.text, body: DS.body, accent: ACCENT };

export default function Cgu() {
  useSEO({
    title: "Conditions générales d'utilisation | GlowScan",
    description: "Conditions générales d'utilisation de GlowScan et GlowScan Derm, édités par GlowScan Africa (Douala, Cameroun).",
    canonical: "https://glow-scan.com/cgu",
  });

  return (
    <div className="b2c-theme min-h-screen pb-24" style={{ background: DS.base, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <GsTopBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/profile">
          <button className="flex items-center gap-2 text-sm font-medium mb-6 active:scale-95 transition-all" style={{ color: ACCENT }} data-testid="link-back-profile">
            <ArrowLeft className="w-4 h-4" /> Retour au profil
          </button>
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#e7eedc", border: "1px solid #cfdfc4" }}>
            <ScrollText className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: DS.text, fontFamily: "Manrope, 'DM Sans', sans-serif" }} data-testid="text-cgu-title">
              Conditions générales d'utilisation — GlowScan Africa
            </h1>
            <div className="text-xs mt-0.5" style={{ color: DS.muted }}><CguBody body={CGU_VERSION_LABEL} theme={THEME} /></div>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: DS.body }}>{CGU_INTRO}</p>

        {CGU_SECTIONS.map((s) => (
          <section key={s.n} className="mb-5 rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid #e3e8e2" }} data-testid={`section-${s.n}`}>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" style={{ color: ACCENT }} />
              <h2 className="text-[15px] font-bold" style={{ color: DS.text, fontFamily: "Manrope, 'DM Sans', sans-serif" }}>{s.n}. {s.title}</h2>
            </div>
            <div className="text-[14px] leading-relaxed" style={{ color: DS.body }}><CguBody body={s.body} theme={THEME} /></div>
          </section>
        ))}

        <p className="text-xs mt-6" style={{ color: DS.muted }}>
          Voir aussi la <Link href="/confidentialite"><span className="font-bold underline cursor-pointer" style={{ color: ACCENT }}>Politique de confidentialité</span></Link>.
        </p>
      </main>
    </div>
  );
}
