import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, ChevronRight, ScanLine, Wand2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PersonalizedTipsResponse {
  tips: string[];
  hasScan: boolean;
  cached?: boolean;
  error?: string;
}

const SECTIONS: { skin: string; emoji: string; tips: string[] }[] = [
  {
    skin: "Protocoles Universels",
    emoji: "✨",
    tips: [
      "Le SPF tous les jours, même quand il pleut. Les UV traversent les nuages et accélèrent les taches mélaniques.",
      "Hydratation interne requise : 1,5L d'eau par jour pour maintenir la pression osmotique cellulaire.",
      "Sommeil réparateur (7h min) : c'est la nuit que le taux de renouvellement cellulaire atteint son pic.",
      "Zéro contact manuel intempestif : les mains transmettent les bactéries exogènes directement sur les pores.",
      "Hygiène textile : change ta taie d'oreiller 1 fois par semaine pour limiter l'accumulation de sébum.",
    ],
  },
  {
    skin: "Profil Peau Mixte",
    emoji: "🌗",
    tips: [
      "Nettoyage modéré : pas plus de 2 fois par jour pour éviter l'effet rebond hyper-séborrhéique sur la zone T.",
      "Application sectorielle : matifiant léger sur la zone T, crème barrière hydratante sur les joues.",
      "Soin purifiant localisé : de l'argile verte une fois par semaine uniquement sur la zone T.",
      "Le niacinamide est ton meilleur allié : il régule l'excrétion de sébum sans assécher les zones hydrophiles.",
    ],
  },
  {
    skin: "Profil Peau Grasse",
    emoji: "💧",
    tips: [
      "Le sébum est un film protecteur : n'agresse pas ta barrière lipidique avec des tensioactifs décapants.",
      "Cible le niacinamide (vitamine B3) : il stabilise la production de sébum sans causer d'inflammation.",
      "Exfoliation chimique : l'acide salicylique à 2% désincruste l'infundibulum pilaire en douceur. 2 à 3 fois par semaine.",
      "Ne zappe pas l'hydratation : une peau déshydratée sur-produit du sébum pour compenser le manque d'eau.",
    ],
  },
  {
    skin: "Profil Peau Sèche",
    emoji: "🌵",
    tips: [
      "Restaurer les lipides : applique matin et soir un soin riche en céramides ou en acides gras essentiels.",
      "Ajuste la température : l'eau chaude dissout le film hydrolipidique et aggrave la xérose cutanée.",
      "Fixation de l'eau : applique ton sérum à l'acide hyaluronique sur peau légèrement humide pour sceller l'hydratation.",
      "Évite les gels moussants : privilégie des textures laits ou des huiles nettoyantes relipidantes.",
    ],
  },
  {
    skin: "Profil Peau Sensible",
    emoji: "🌸",
    tips: [
      "Minimalisme cosmétique : limite-toi au triptyque Nettoyant doux, Crème barrière neutre, et protection SPF.",
      "Sécurité produit : effectue un patch-test dans le creux du coude pendant 48h avant toute application faciale.",
      "Formulations pures : bannis l'alcool dénaturé, les parfums de synthèse et les huiles essentielles.",
      "Molécules apaisantes : la centella asiatica (Cica) neutralise les micro-inflammations et les rougeurs.",
    ],
  },
  {
    skin: "Profil Peau Normale",
    emoji: "🌟",
    tips: [
      "Préservation du capital : le SPF quotidien reste obligatoire pour bloquer le vieillissement actinique.",
      "Homeostasie : une routine épurée suffit. Ne surcharge pas tes récepteurs cutanés avec 10 couches de produits.",
      "Anticipation : intègre le rétinol à faible dose pour stimuler la synthèse de collagène de manière continue.",
      "Grain de peau : une exfoliation enzymatique douce une fois par semaine maintient l'éclat cellulaire.",
    ],
  },
];

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
    <div className="min-h-screen bg-slate-50/50 pb-24" data-testid="page-conseils">
      {/* Header Clinique Épuré */}
      <header className="bg-white border-b border-slate-200/60 px-5 pt-12 pb-5 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <div className="flex-1">
            <span className="text-[10px] font-black tracking-widest uppercase text-blue-600">Base de Connaissances ✦</span>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
              Protocoles Cutanés
            </h1>
          </div>
          <Sparkles className="w-4 h-4 text-slate-400" />
        </div>
      </header>

      <main className="px-4 pt-6 space-y-7">
        
        {/* ─── CADRE IA : ORDONNANCE PERSONNALISÉE ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl overflow-hidden border border-slate-900 bg-white shadow-xl shadow-slate-950/5"
          data-testid="section-personalized-tips"
        >
          {/* Header de la carte d'ordonnance */}
          <div className="px-5 py-4.5 bg-slate-950 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 opacity-70">
                <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[9px] font-black tracking-widest uppercase text-white">Analyse Algorithmique</span>
              </div>
              <h2 className="text-base font-black uppercase tracking-wide mt-0.5">
                Rapport personnel : {firstName}
              </h2>
            </div>
            <Badge variant="default" className="bg-blue-600 text-white border-0 text-[9px] font-black tracking-wide py-1">
              Live Core
            </Badge>
          </div>

          <div className="p-5 bg-white">
            {tipsLoading ? (
              <div className="space-y-3.5" data-testid="personalized-loading">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-2.5 bg-slate-100 rounded w-full" />
                      <div className="h-2.5 bg-slate-100 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !personalized?.hasScan ? (
              <div className="text-center py-4" data-testid="personalized-empty">
                <p className="text-xs font-semibold text-slate-500 max-w-xs mx-auto mb-4 leading-relaxed">
                  L'intelligence artificielle n'a détecté aucun diagnostic facial actif lié à ton compte.
                </p>
                <Button
                  onClick={() => setLocation("/analyze")}
                  variant="premium"
                  size="default"
                  className="w-full sm:w-auto"
                >
                  <ScanLine className="w-4 h-4" />
                  Lancer le Scan Facial IA
                </Button>
              </div>
            ) : personalized.tips.length === 0 ? (
              <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium" data-testid="personalized-error">
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
                    <div className="w-6 h-6 rounded-md bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm text-white">
                      <span className="text-[10px] font-black">{i + 1}</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold flex-1 pt-0.5">
                      {tip}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* ─── SECTIONS GENERALES PAR TYPE DE PEAU ─── */}
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
              <span className="text-xl shrink-0">{section.emoji}</span>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                {section.skin}
              </h2>
            </div>

            <div className="space-y-2.5">
              {section.tips.map((tip, tIdx) => (
                <div
                  key={tIdx}
                  className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-xs flex items-start gap-3.5"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200/50 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <span className="text-[10px] font-black">{tIdx + 1}</span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold flex-1 pt-0.5">
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        ))}

        {/* ─── ACCÈS SKINBOT PREMIUM ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl p-5 text-white shadow-xl border border-slate-900 bg-slate-950 relative overflow-hidden"
        >
          {/* Effet visuel discret en arrière-plan d'accent technologique */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <span className="text-[9px] font-black tracking-widest uppercase text-blue-400 block mb-1">Core Engine ✦ SkinBot</span>
          <h3 className="text-base font-black uppercase tracking-wide mb-1.5">
            Une question moléculaire spécifique ?
          </h3>
          <p className="text-xs font-medium text-slate-400 leading-relaxed mb-4.5">
            Interroge notre modèle d'analyse. SkinBot croise instantanément tes scans faciaux avec la littérature cosmétique.
          </p>
          <Button
            onClick={() => setLocation("/chat")}
            variant="premium"
            size="default"
            className="w-full sm:w-auto shadow-md"
          >
            Consulter SkinBot <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
