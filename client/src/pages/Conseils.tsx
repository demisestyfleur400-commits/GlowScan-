import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, ChevronRight, ScanLine, Wand2, ShieldAlert, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";

interface PersonalizedTipsResponse {
  tips: string[];
  hasScan: boolean;
  cached?: boolean;
  error?: string;
}

const SECTIONS: { skin: string; emoji: string; tips: string[] }[] = [
  {
    skin: "Protocoles universels",
    emoji: "✨",
    tips: [
      "Le SPF tous les jours, même quand il pleut. Les UV traversent les nuages et accélèrent les taches mélaniques.",
      "Hydratation interne requise : 1,5L d'eau par jour pour maintenir la pression osmotique cellulaire.",
      "Sommeil réparateur (7h min) : c'est la nuit que le renouvellement cellulaire atteint son pic.",
      "Zéro contact manuel intempestif : les mains transmettent les bactéries directement sur les pores.",
      "Hygiène textile : change ta taie d'oreiller 1 fois par semaine pour limiter l'accumulation de sébum.",
    ],
  },
  {
    skin: "Profil peau mixte",
    emoji: "🌗",
    tips: [
      "Nettoyage modéré : pas plus de 2 fois par jour pour éviter l'effet rebond hyper-séborrhéique sur la zone T.",
      "Application sectorielle : matifiant léger sur la zone T, crème barrière hydratante sur les joues.",
      "Soin purifiant localisé : de l'argile verte une fois par semaine uniquement sur la zone T.",
      "Le niacinamide est ton meilleur allié : il régule l'excrétion de sébum sans assécher les zones hydrophiles.",
    ],
  },
  {
    skin: "Profil peau grasse",
    emoji: "💧",
    tips: [
      "Le sébum est un film protecteur : n'agresse pas ta barrière lipidique avec des tensioactifs décapants.",
      "Cible le niacinamide (vitamine B3) : il stabilise la production de sébum sans causer d'inflammation.",
      "Exfoliation chimique : l'acide salicylique à 2% désincruste l'infundibulum pilaire en douceur. 2-3 fois par semaine.",
      "Ne zappe pas l'hydratation : une peau déshydratée sur-produit du sébum pour compenser le manque d'eau.",
    ],
  },
  {
    skin: "Profil peau sèche",
    emoji: "🌵",
    tips: [
      "Restaurer les lipides : applique matin et soir un soin riche en céramides ou en acides gras essentiels.",
      "Ajuste la température : l'eau chaude dissout le film hydrolipidique et aggrave la xérose cutanée.",
      "Fixation de l'eau : applique ton sérum à l'acide hyaluronique sur peau légèrement humide pour sceller l'hydratation.",
      "Évite les gels moussants : privilégie des textures laits ou des huiles nettoyantes relipidantes.",
    ],
  },
  {
    skin: "Profil peau sensible",
    emoji: "🌸",
    tips: [
      "Minimalisme cosmétique : limite-toi au triptyque Nettoyant doux, Crème barrière neutre, et protection SPF.",
      "Sécurité produit : effectue un patch-test dans le creux du coude pendant 48h avant toute application faciale.",
      "Formulations pures : bannis l'alcool dénaturé, les parfums de synthèse et les huiles essentielles.",
      "Molécules apaisantes : la centella asiatica (Cica) neutralise les micro-inflammations et les rougeurs.",
    ],
  },
  {
    skin: "Profil peau normale",
    emoji: "🌟",
    tips: [
      "Préservation du capital : le SPF quotidien reste obligatoire pour bloquer le vieillissement actinique.",
      "Homeostasie : une routine épurée suffit. Ne surcharge pas tes récepteurs cutanés avec 10 couches de produits.",
      "Anticipation : intègre le rétinol à faible dose pour stimuler la synthèse de collagène de manière continue.",
      "Grain de peau : une exfoliation enzymatique douce une fois par semaine maintient l'éclat cellulaire.",
    ],
  },
];

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

export default function Conseils() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.firstName || user?.email || "").split(/[\s@]/)[0] || "Client";

  useEffect(() => { trackPageVisit("/conseils"); }, []);

  const { data: personalized, isLoading: tipsLoading } = useQuery<PersonalizedTipsResponse>({
    queryKey: ["/api/conseils/personalized"],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      data-testid="page-conseils"
    >
      {/* Header */}
      <header
        className="px-5 pt-12 pb-5 sticky top-0 z-10"
        style={{ background: "rgba(13,10,14,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${DS.border}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}` }}
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: DS.body }} />
          </button>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: "#a78bfa" }}>
              Base de connaissances
            </span>
            <h1 className="text-xl font-extrabold tracking-tight mt-0.5" style={{ color: DS.text }}>
              Protocoles cutanés
            </h1>
          </div>
          <Sparkles className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      </header>

      <main className="px-4 pt-6 space-y-7">

        {/* Routine suggérée IA */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
          data-testid="section-personalized-tips"
        >
          {/* Header carte */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: "rgba(124,58,237,0.1)", borderBottom: "1px solid rgba(167,139,250,0.15)" }}
          >
            <div>
              <div className="flex items-center gap-1.5 opacity-80">
                <Wand2 className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                <span className="text-[9px] font-extrabold tracking-widest uppercase" style={{ color: DS.muted }}>
                  Analyse algorithmique
                </span>
              </div>
              <h2 className="text-sm font-extrabold mt-0.5" style={{ color: DS.text }}>
                Rapport personnel : {firstName}
              </h2>
            </div>
            <span
              className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }}
            >
              Live Core
            </span>
          </div>

          <div className="p-5">
            {tipsLoading ? (
              <div className="space-y-3.5" data-testid="personalized-loading">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-2.5 rounded w-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <div className="h-2.5 rounded w-5/6" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !personalized?.hasScan ? (
              <div className="text-center py-4" data-testid="personalized-empty">
                <p className="text-xs font-medium max-w-xs mx-auto mb-4 leading-relaxed" style={{ color: DS.body }}>
                  L'intelligence artificielle n'a détecté aucun diagnostic facial actif lié à ton compte.
                </p>
                <button
                  onClick={() => setLocation("/analyze")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold text-white active:scale-95 transition-all"
                  style={{ background: "#7c3aed" }}
                >
                  <ScanLine className="w-4 h-4" />
                  Lancer le scan facial IA
                </button>
              </div>
            ) : personalized.tips.length === 0 ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }} data-testid="personalized-error">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: "#fbbf24" }} />
                <p className="text-xs font-medium" style={{ color: "#fbbf24" }}>
                  Flux temporairement indisponible. Revalidation en cours.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {personalized.tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    className="flex items-start gap-3.5"
                    data-testid={`personalized-tip-${i}`}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.25)" }}
                    >
                      <span className="text-[10px] font-extrabold" style={{ color: "#c4b5fd" }}>{i + 1}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-medium flex-1 pt-0.5" style={{ color: DS.body }}>
                      {tip}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Sections par type de peau */}
        {SECTIONS.map((section, sIdx) => (
          <motion.section
            key={section.skin}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
            data-testid={`conseils-section-${sIdx}`}
          >
            <div className="flex items-center gap-2.5 px-1">
              <span className="text-xl flex-shrink-0">{section.emoji}</span>
              <h2 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: DS.text }}>
                {section.skin}
              </h2>
            </div>

            <div className="space-y-2">
              {section.tips.map((tip, tIdx) => (
                <div
                  key={tIdx}
                  className="flex items-start gap-3.5 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}` }}
                  >
                    <span className="text-[10px] font-extrabold" style={{ color: DS.muted }}>{tIdx + 1}</span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium flex-1 pt-0.5" style={{ color: DS.body }}>
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        ))}

        {/* Accès SkinBot Premium */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}
        >
          <div className="pointer-events-none absolute top-0 right-0 w-32 h-32" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />

          <span className="text-[9px] font-extrabold tracking-widest uppercase block mb-1" style={{ color: "#a78bfa" }}>
            Core Engine · SkinBot
          </span>
          <h3 className="text-base font-extrabold mb-1.5" style={{ color: DS.text }}>
            Une question spécifique ?
          </h3>
          <p className="text-xs font-medium leading-relaxed mb-4" style={{ color: DS.body }}>
            Interroge notre modèle d'analyse. SkinBot croise instantanément tes scans faciaux avec la littérature cosmétique.
          </p>
          <button
            onClick={() => setLocation("/chat")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold text-white active:scale-95 transition-all"
            style={{ background: "#7c3aed" }}
          >
            Consulter SkinBot <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </main>
    </div>
  );
}
