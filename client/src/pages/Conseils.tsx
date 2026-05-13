import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, ChevronRight, ScanLine, Wand2 } from "lucide-react";
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
    skin: "Tous types",
    emoji: "✨",
    tips: [
      "Le SPF tous les jours, même quand il pleut. Les UV traversent les nuages et accélèrent les taches.",
      "Bois 1,5L d'eau par jour — ta peau hydratée de l'intérieur, ça se voit.",
      "Dors 7h minimum. C'est la nuit que ta peau se régénère et produit du collagène.",
      "Ne touche pas ton visage avec les mains pendant la journée — c'est la première source de boutons.",
      "Change ta taie d'oreiller 1 fois par semaine minimum.",
    ],
  },
  {
    skin: "Peau mixte",
    emoji: "🌗",
    tips: [
      "Évite de te laver le visage plus de 2 fois par jour — ça aggrave la production de sébum sur ta zone T.",
      "Utilise deux soins différents : matifiant sur la zone T, hydratant sur les joues.",
      "L'argile verte une fois par semaine fait des miracles sur la zone T sans dessécher tes joues.",
      "Le niacinamide convient parfaitement à ta peau : il régule sans assécher.",
    ],
  },
  {
    skin: "Peau grasse",
    emoji: "💧",
    tips: [
      "Le sébum est ta protection — n'agresse pas ta peau avec des nettoyants asséchants.",
      "Le niacinamide (vitamine B3) régule le sébum sans irriter. Cherche-le dans tes sérums.",
      "L'acide salicylique 2% débouche tes pores en douceur. À utiliser 2-3 fois par semaine.",
      "Hydrate quand même : une peau déshydratée produit encore plus de sébum.",
    ],
  },
  {
    skin: "Peau sèche",
    emoji: "🌵",
    tips: [
      "Hydrate ta peau matin ET soir avec une crème riche en céramides ou en beurre de karité.",
      "Évite l'eau trop chaude pour te laver le visage — elle aggrave la sécheresse.",
      "Le sérum à l'acide hyaluronique appliqué sur peau humide retient l'hydratation toute la journée.",
      "Évite les nettoyants moussants agressifs : préfère un lait ou une eau micellaire douce.",
    ],
  },
  {
    skin: "Peau sensible",
    emoji: "🌸",
    tips: [
      "Moins, c'est mieux. Limite-toi à 3 produits : nettoyant doux, crème hydratante, SPF.",
      "Patch-test tout nouveau produit dans le creux du coude pendant 48h avant de l'appliquer au visage.",
      "Évite les parfums, l'alcool et les huiles essentielles dans tes cosmétiques.",
      "La centella asiatica et la camomille calment les rougeurs en quelques jours.",
    ],
  },
  {
    skin: "Peau normale",
    emoji: "🌟",
    tips: [
      "Ne te repose pas sur ta chance — le SPF tous les jours protège ton capital jeunesse.",
      "Une routine simple suffit : nettoie, hydrate, protège. Pas besoin de 10 étapes.",
      "Le rétinol après 25 ans booste le renouvellement cellulaire et garde ta peau éclatante.",
      "Une exfoliation enzymatique 1 fois par semaine garde le grain de peau lisse.",
    ],
  },
];

export default function Conseils() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.firstName || user?.email || "").split(/[\s@]/)[0] || "Toi";

  useEffect(() => { trackPageVisit("/conseils"); }, []);

  const { data: personalized, isLoading: tipsLoading } = useQuery<PersonalizedTipsResponse>({
    queryKey: ["/api/conseils/personalized"],
    enabled: !!user,
    staleTime: 0, // toujours revalider à l'arrivée — le serveur cache 7j ET invalide quand un nouveau scan arrive
    refetchOnMount: "always",
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-12" data-testid="page-conseils">
      <header className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-pink-600">Conseils ✦</p>
            <h1 className="text-[20px] font-bold text-gray-900 font-display tracking-tight">
              Tous les conseils peau
            </h1>
          </div>
          <Sparkles className="w-5 h-5 text-pink-600" />
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {/* ─── Section IA personnalisée — Pour toi, [Prénom] ─── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl overflow-hidden shadow-lg border border-pink-200"
          data-testid="section-personalized-tips"
        >
          <div
            className="px-5 pt-5 pb-4 text-white"
            style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #C2185B 50%, #E91E8C 100%)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4" />
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/90">Conseils IA ✦</p>
            </div>
            <h2 className="text-[18px] font-bold font-display leading-tight">
              Pour toi, {firstName}
            </h2>
            <p className="text-[12px] text-white/85 mt-1 leading-snug">
              Personnalisés selon ton dernier diagnostic — mis à jour chaque semaine.
            </p>
          </div>

          <div className="bg-white p-4">
            {tipsLoading ? (
              <div className="space-y-2.5" data-testid="personalized-loading">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-pink-100 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="h-2.5 bg-gray-100 rounded w-full" />
                      <div className="h-2.5 bg-gray-100 rounded w-4/5" />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 text-center pt-2">
                  ✨ L'IA analyse ton profil…
                </p>
              </div>
            ) : !personalized?.hasScan ? (
              <div className="text-center py-3" data-testid="personalized-empty">
                <p className="text-[13px] text-gray-700 mb-3 leading-relaxed">
                  Fais ta première analyse pour recevoir tes conseils sur-mesure.
                </p>
                <button
                  onClick={() => setLocation("/analyze")}
                  data-testid="button-do-first-scan"
                  className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  Scanner ma peau
                </button>
              </div>
            ) : personalized.tips.length === 0 ? (
              <p className="text-[12px] text-gray-500 text-center py-3" data-testid="personalized-error">
                Conseils indisponibles pour le moment. Réessaie plus tard.
              </p>
            ) : (
              <div className="space-y-2.5">
                {personalized.tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, ease: "easeOut" }}
                    className="flex items-start gap-3"
                    data-testid={`personalized-tip-${i}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-black text-white">{i + 1}</span>
                    </div>
                    <p className="text-[13px] text-gray-800 leading-relaxed font-medium flex-1 pt-0.5">
                      {tip}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {SECTIONS.map((section, sIdx) => (
          <motion.section
            key={section.skin}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: sIdx * 0.05, ease: [0.22, 1, 0.36, 1] }}
            data-testid={`conseils-section-${sIdx}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{section.emoji}</span>
              <h2 className="text-[16px] font-bold text-gray-900 font-display tracking-tight">
                {section.skin}
              </h2>
            </div>

            <div className="space-y-2">
              {section.tips.map((tip, tIdx) => (
                <motion.div
                  key={tIdx}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: tIdx * 0.06, ease: "easeOut" }}
                  className="bg-white rounded-2xl p-4 border border-pink-100 shadow-sm flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-black text-pink-700">{tIdx + 1}</span>
                  </div>
                  <p className="text-[13px] text-gray-800 leading-relaxed font-medium flex-1">
                    {tip}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-3xl p-5 text-white shadow-lg mt-8"
          style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #C2185B 50%, #E91E8C 100%)" }}
        >
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/80 mb-2">SkinBot ✦</p>
          <h3 className="text-[16px] font-bold font-display leading-tight mb-2">
            Tu veux un conseil sur-mesure&nbsp;?
          </h3>
          <p className="text-[12px] text-white/90 leading-relaxed mb-4">
            Pose ta question à SkinBot — il te répondra selon TON diagnostic.
          </p>
          <button
            onClick={() => setLocation("/chat")}
            data-testid="button-ask-skinbot"
            className="inline-flex items-center gap-2 bg-white text-pink-700 font-bold text-[12px] px-4 py-2 rounded-xl shadow-md active:scale-95 transition-all"
          >
            Poser une question <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </main>
    </div>
  );
}
