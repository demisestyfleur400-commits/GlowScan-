import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import img1 from "/src/lib/IMG_0141.png";
import img2 from "/src/lib/IMG_0143.png";
import img3 from "/src/lib/IMG_0142.png";
import img4 from "/src/lib/IMG_0127.jpeg";

interface Step {
  image: string;
  title: string;
  subtitle: string;
  emoji?: string;
  cta: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    image: img1,
    emoji: "✨",
    title: "Sois belle sans aucun filtre",
    subtitle: "Ta vraie peau mérite des soins sur-mesure, pas des artifices.",
    cta: "Continuer",
    accent: "#d4a017",
  },
  {
    image: img2,
    emoji: "🔬",
    title: "Des boutons qui reviennent toujours ?",
    subtitle: "GlowScan analyse la racine du problème sous le climat camerounais et cible l'urgence.",
    cta: "Suivant",
    accent: "#E91E8C",
  },
  {
    image: img3,
    emoji: "🤖",
    title: "L'équivalent d'un dermatologue en poche",
    subtitle:
      "Une technologie de cartographie faciale IA avancée pour scanner tes imperfections en 3 secondes.",
    cta: "Découvrir",
    accent: "#C2185B",
  },
  {
    image: img4,
    emoji: "🇨🇲",
    title: "Ta peau. Ton diagnostic. Ta routine.",
    subtitle: "Plus de 3 000 femmes accompagnées avec succès à Douala et Yaoundé.",
    cta: "Analyser ma peau maintenant",
    accent: "#E91E8C",
  },
];

const STORAGE_KEY = "glowscan_onboarded";

interface OnboardingProps {
  onFinish?: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Petite latence pour laisser la home se rendre derrière
      const t = setTimeout(() => setVisible(true), 200);
      return () => clearTimeout(t);
    }
  }, []);

  function close(redirectToAnalyze = false) {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    onFinish?.();
    if (redirectToAnalyze) {
      // Petite latence pour laisser l'animation de sortie se terminer
      setTimeout(() => setLocation("/analyze"), 300);
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Dernier écran : "Analyser ma peau maintenant" → /analyze
      close(true);
    }
  }

  function skip() {
    close(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] bg-black"
        data-testid="onboarding-overlay"
      >
        {/* Image plein écran */}
        <AnimatePresence mode="wait">
          <motion.img
            key={`img-${step}`}
            src={current.image}
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Dégradé sombre pour lisibilité */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.92) 100%)",
          }}
        />

        {/* Contenu */}
        <div className="relative z-10 flex flex-col h-full px-6 pt-12 pb-10 text-white">
          {/* Header : skip + indicateur */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === step
                      ? "w-8 bg-white"
                      : i < step
                      ? "w-4 bg-white/70"
                      : "w-4 bg-white/25"
                  }`}
                />
              ))}
            </div>
            {!isLast && (
              <button
                onClick={skip}
                data-testid="button-skip-onboarding"
                className="text-xs font-medium text-white/70 active:text-white"
              >
                Passer
              </button>
            )}
          </div>

          {/* Spacer pour pousser le texte vers le bas */}
          <div className="flex-1" />

          {/* Bloc texte */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${step}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="space-y-3 mb-8"
            >
              <h2
                className="text-3xl sm:text-4xl font-semibold leading-[1.15] tracking-tight font-display"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                data-testid={`onboarding-title-${step}`}
              >
                {current.title}
                {current.emoji && (
                  <span className="ml-2">{current.emoji}</span>
                )}
              </h2>
              <p
                className="text-base sm:text-lg text-white/85 leading-relaxed max-w-md"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}
              >
                {current.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Bouton CTA */}
          <motion.button
            key={`cta-${step}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            onClick={next}
            data-testid={`button-onboarding-${isLast ? "finish" : "next"}`}
            className="w-full py-4 px-6 rounded-full bg-white text-black font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-2xl"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {current.cta}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </motion.button>

          {/* Petite signature */}
          <p
            className="text-center text-[10px] text-white/40 mt-4 tracking-widest uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            GlowScan · Fait pour toi
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
