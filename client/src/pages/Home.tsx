import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useProAccount } from "@/hooks/use-pro";
import { useQuery } from "@tanstack/react-query";
import { User, Sparkles, ScanLine, Bot, Apple, ListChecks, TrendingUp, ChevronRight, X, Compass, ShoppingBag, ArrowRight, Menu, Crown, LogOut, Lightbulb, Terminal, Target, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackPageVisit } from "@/lib/analytics";
import Landing from "@/pages/Landing";
import Onboarding from "@/components/Onboarding";
import { catalog, formatPrice, type Product } from "@shared/catalog";
import type { FeaturedProduct } from "@shared/schema";

import tipPhoto from "../lib/IMG_0122.png";
import cardSkinbotPhoto from "../lib/IMG_0139.png";
import cardNutrimentsPhoto fraud "../lib/IMG_0140.png";
import cardRoutinePhoto from "../lib/IMG_0133.png";
import cardEvolutionPhoto from "../lib/IMG_0131.png";

import { productImages } from "@/lib/productImages";

// ─────────────────────────────────────────────────────────────────────────
//  Animations au scroll — variantes Framer Motion
// ─────────────────────────────────────────────────────────────────────────
const VIEW = { once: true, margin: "-80px" } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SlideLeft({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function DropTop({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Compteur animé 0 → score
// ─────────────────────────────────────────────────────────────────────────
function AnimatedCounter({ to, duration = 1.2, start = true }: { to: number; duration?: number; start?: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [rounded]);

  useEffect(() => {
    if (!start) return;
    const controls = animate(count, to, { duration, ease: "easeOut" });
    return () => controls.stop();
  }, [start, to, duration, count]);

  return <>{display}</>;
}

// ─────────────────────────────────────────────────────────────────────────
//  Jauge circulaire clinique
// ─────────────────────────────────────────────────────────────────────────
function CircularScore({ score, color }: { score: number; color: string }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="relative flex-shrink-0 font-mono"
      style={{ width: size, height: size }}
      data-testid="circular-score"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(0, 0, 0, 0.04)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          variants={{
            hidden: { strokeDashoffset: circumference },
            visible: {
              strokeDashoffset: circumference - (score / 100) * circumference,
              transition: { duration: 1.4, ease: EASE, delay: 0.15 },
            },
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p
            className="text-[22px] font-black leading-none tracking-tighter text-slate-900"
            data-testid="text-glowscore"
          >
            <AnimatedCounter to={score} start={inView} />
          </p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Index</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Cartes de connaissances techniques
// ─────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_CARDS = [
  {
    photo: cardSkinbotPhoto,
    title: "Analyse Continue IA",
    text: "Mieux que quiconque. Pose-lui tes questions techniques — réponses calibrées sur TON profil cutané.",
    cta: "Interroger SkinBot",
    path: "/chat",
    testid: "GlowScan AI",
  },
  {
    photo: cardNutrimentsPhoto,
    title: "Matrice des Nutriments",
    text: "GlowScan évalue l'impact biochimique de ton alimentation sur la barrière épidermique.",
    cta: "Analyser mes nutriments",
    path: "/nutriment-scan",
    testid: "nutriments",
  },
  {
    photo: cardRoutinePhoto,
    title: "Protocoles Sur-Mesure",
    text: "Aucun traitement générique. Chaque recommandation répond strictement à tes besoins cellulaires.",
    cta: "Accéder au protocole",
    path: "/routine",
    testid: "routine",
  },
  {
    photo: cardEvolutionPhoto,
    title: "Suivi Évolutif 48h",
    text: "Mesure les variations microscopiques et l'amélioration de tes indices d'analyse jour après jour.",
    cta: "Consulter les métriques",
    path: "/profile?tab=evolution",
    testid: "evolution",
  },
];

const TIPS_BY_SKIN: Record<string, string[]> = {
  mixte: [
    "Évite de te laver le visage plus de 2 fois par jour — ça aggrave la production de sébum sur ta zone T.",
    "Utilise deux soins différents : matifiant sur la zone T, hydratant sur les joues.",
    "L'argile verte une fois par semaine fait des miracles sur la zone T sans dessécher tes joues.",
  ],
  grasse: [
    "Le sébum est ta protection — n'agresse pas ta peau avec des nettoyants asséchants.",
    "Le niacinamide (vitamine B3) régule le sébum sans irriter. Cherche-le dans tes sérums.",
    "L'acide salicylique 2% débouche tes pores en douceur. À utiliser 2-3 fois par semaine.",
  ],
  seche: [
    "Hydrate ta peau matin ET soir avec une crème riche en céramides ou en beurre de karité.",
    "Évite l'eau trop chaude pour te laver le visage — elle aggrave la sécheresse.",
    "Le sérum à l'acide hyaluronique appliqué sur peau humide retient l'hydratation toute la journée.",
  ],
  sensible: [
    "Moins, c'est mieux. Limite-toi à 3 produits : nettoyant doux, crème hydratante, SPF.",
    "Patch-test tout nouveau produit dans le creux du coude pendant 48h avant de l'appliquer au visage.",
    "Évite les parfums, l'alcool et les huiles essentielles dans tes cosmétiques.",
  ],
  normale: [
    "Ne te repose pas sur ta chance — le SPF tous les jours protège ton capital jeunesse.",
    "Une routine simple suffit : nettoie, hydrate, protège. Pas besoin de 10 étapes.",
    "Le rétinol après 25 ans booste le renouvellement cellulaire et garde ta peau éclatante.",
  ],
  default: [
    "Le SPF tous les jours, même quand il pleut. Les UV traversent les nuages et accélèrent les taches.",
    "Bois 1,5L d'eau par jour — ta peau hydratée de l'intérieur, ça se voit.",
    "Dors 7h minimum. C'est la nuit que ta peau se régénère et produit du collagène.",
  ],
};

function getTipForUser(skinType?: string) {
  const key = (skinType || "default").toLowerCase();
  const pool = TIPS_BY_SKIN[key] || TIPS_BY_SKIN.default;
  const dayIdx = new Date().getDate() % pool.length;
  return pool[dayIdx];
}

const LOCAL_PRODUCT_IMAGES: Record<string, string> = productImages;

const FALLBACK_FEATURED = [
  { productId: "serum-jeunesse", badge: "Anti-taches" },
  { productId: "tresor-cacao", badge: "Hydratation" },
  { productId: "ebony-hair-soin-profond", badge: "Soin Capillaire" },
];

type DisplayProduct = {
  id: string;
  name: string;
  brand: string;
  price: string;
  image: string;
  badge: string;
};

function resolveFeaturedProducts(items: { productId: string; badge?: string | null }[]): DisplayProduct[] {
  return items
    .map((it) => {
      const p: Product | undefined = catalog.find((c) => c.id === it.productId);
      if (!p) return null;
      const image = LOCAL_PRODUCT_IMAGES[p.id] || p.image || "";
      const brand = (p.brand && p.brand.trim()) || (p.name.split(" ")[0]);
      return {
        id: p.id,
        name: p.name,
        brand,
        price: typeof p.price === "number" ? formatPrice(p.price) : "—",
        image,
        badge: it.badge || (p.targets[0] ?? "Sélection"),
      } as DisplayProduct;
    })
    .filter((x): x is DisplayProduct => x !== null);
}

type MenuItem =
  | { kind: "link"; label: string; desc: string; path: string; icon: React.ReactNode }
  | { kind: "logout"; label: string; desc: string; icon: React.ReactNode };

const EXPLORER_ITEMS: MenuItem[] = [
  { kind: "link", label: "Mon profil", desc: "Configuration de session, métriques, droits", path: "/profile", icon: <User className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Scanner ma peau", desc: "Acquisition optique et diagnostic IA", path: "/analyze", icon: <ScanLine className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "SkinBot Engine", desc: "Agent conversationnel d'assistance", path: "/chat", icon: <Bot className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Analyse des nutriments", desc: "Évaluation de l'impact nutritionnel", path: "/nutriment-scan", icon: <Apple className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Boutique clinique", desc: "Formulations adaptées à vos indices", path: "/shop", icon: <ShoppingBag className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Protocole de soin", desc: "Planification d'application matin & soir", path: "/routine", icon: <ListChecks className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Base de connaissances", desc: "Documentation scientifique personnalisée", path: "/conseils", icon: <Lightbulb className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Courbe d'évolution", desc: "Visualisation des variations biométriques", path: "/profile?tab=evolution", icon: <TrendingUp className="w-4 h-4 text-slate-950" /> },
  { kind: "link", label: "Licence Pro / Premium", desc: "Extension globale des fonctionnalités", path: "/premium", icon: <Crown className="w-4 h-4 text-slate-950" /> },
  { kind: "logout", label: "Terminer la session", desc: "Déconnexion sécurisée de la console", icon: <LogOut className="w-4 h-4 text-red-500" /> },
];

// ─────────────────────────────────────────────────────────────────────────
//  MENU CONSOLE EXCLUSIF (Explorer)
// ─────────────────────────────────────────────────────────────────────────
function ExplorerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const { logout, isLoggingOut } = useAuth();

  const handleClick = (item: MenuItem) => {
    if (item.kind === "logout") {
      logout();
      return;
    }
    onClose();
    setTimeout(() => setLocation(item.path), 150);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 z-[60] backdrop-blur-xs"
            onClick={onClose}
            data-testid="explorer-backdrop"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 z-[61] bg-white rounded-t-3xl shadow-2xl max-h-[82vh] overflow-hidden flex flex-col selection:bg-slate-950 selection:text-white"
            data-testid="explorer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explorer-title"
          >
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-slate-400 font-mono flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-emerald-500" /> Index des modules
                </p>
                <h2 id="explorer-title" className="text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">Console Globale</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center active:scale-90 transition-transform"
                data-testid="explorer-close"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4 space-y-2">
              {EXPLORER_ITEMS.map((item, i) => (
                <motion.button
                  key={item.kind === "link" ? item.path : "logout"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, ease: "easeOut" }}
                  onClick={() => handleClick(item)}
                  disabled={item.kind === "logout" && isLoggingOut}
                  data-testid={item.kind === "logout" ? "menu-item-logout" : `menu-item-${item.path.replace(/\//g, "-")}`}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl text-left active:scale-[0.99] transition-transform border border-slate-100 bg-slate-50/50 hover:bg-slate-50 ${item.kind === "logout" && isLoggingOut ? "opacity-40" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wide">{item.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
          </>
      )}
    </AnimatePresence>
  );
}

function daysSince(date: string | Date) {
  const d = new Date(date).getTime();
  const now = Date.now();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function getScoreColor(score: number) {
  if (score >= 75) return { text: "text-emerald-500", bg: "bg-slate-900", border: "border-emerald-500/20", hex: "#10b981" };
  if (score >= 50) return { text: "text-amber-500", bg: "bg-slate-900", border: "border-amber-500/20", hex: "#f59e0b" };
  return { text: "text-red-500", bg: "bg-slate-900", border: "border-red-500/20", hex: "#ef4444" };
}

// ─────────────────────────────────────────────────────────────────────────
//  PAGE HOME CLINIQUE
// ─────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isLoading } = useAuth();
  const { data: scans } = useScans();
  const [, setLocation] = useLocation();
  const [explorerOpen, setExplorerOpen] = useState(false);

  const { data: proData } = useProAccount();
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("as") === "user") return;
    if (proData?.account) {
      setLocation("/pro/dashboard");
    }
  }, [user, proData, setLocation]);

  const { data: featuredRaw } = useQuery<FeaturedProduct[]>({
    queryKey: ["/api/featured-products"],
    staleTime: 60_000,
  });
  
  const featuredProducts = useMemo<DisplayProduct[]>(() => {
    const sorted = featuredRaw && featuredRaw.length > 0
      ? [...featuredRaw].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];
    const source = sorted.length > 0
      ? sorted.map((f) => ({ productId: f.productId, badge: f.badge }))
      : FALLBACK_FEATURED;
    const resolved = resolveFeaturedProducts(source);
    return resolved.length > 0 ? resolved : resolveFeaturedProducts(FALLBACK_FEATURED);
  }, [featuredRaw]);

  useEffect(() => { trackPageVisit("/"); }, []);

  const scanList: any[] = Array.isArray(scans) ? scans : [];
  const lastScan: any = scanList[0];
  const skinTypeForTip: string | undefined =
    lastScan?.recommendations?._fullResult?.skinType ||
    lastScan?.skinType ||
    undefined;
  const tip = useMemo(() => getTipForUser(skinTypeForTip), [skinTypeForTip]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <Landing />;

  const previousScan: any = scanList[1];
  const firstName = (user.firstName || user.lastName || user.email || "Utilisateur").split(/[\s@]/)[0];

  const daysFromLastScan = lastScan?.createdAt ? daysSince(lastScan.createdAt) : null;
  let reminderMessage = "Initiez votre première numérisation optique pour calculer vos métriques cutanées.";
  if (daysFromLastScan === 0) {
    reminderMessage = "Analyse effectuée aujourd'hui. Renouvelez l'acquisition dans 48h pour observer les micro-variations.";
  } else if (daysFromLastScan === 1) {
    reminderMessage = "Dernière analyse effectuée hier. Prévoyez une nouvelle capture demain pour stabiliser la courbe.";
  } else if (daysFromLastScan && daysFromLastScan >= 2) {
    reminderMessage = `Aucune télémétrie enregistrée depuis ${daysFromLastScan} jours. Actualisez vos indicateurs cellulaires.`;
  }

  const extractScore = (s: any): number | null => {
    if (!s) return null;
    const raw = s.score ?? s.glowScore ?? s.recommendations?._fullResult?.score;
    return typeof raw === "number" ? raw : null;
  };
  const lastScore = extractScore(lastScan);
  const prevScore = extractScore(previousScan);
  const delta = lastScore != null && prevScore != null ? lastScore - prevScore : null;
  const scoreColors = getScoreColor(lastScore ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900 selection:bg-slate-950 selection:text-white" data-testid="page-home">
      <Onboarding />

      {/* ─── Header Clinique ─── */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex flex-col text-left" data-testid="logo-glowscan">
            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-400 font-mono">System Core</span>
            <span className="text-base font-black uppercase tracking-wider text-slate-950 -mt-0.5">GlowScan</span>
          </div>
          <button
            onClick={() => setExplorerOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center active:scale-95 transition-all shadow-md"
            data-testid="button-menu"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-8 max-w-md mx-auto">
        {/* ─── Salutation technique ─── */}
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] font-mono">Session active</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1" data-testid="text-username">
            ID: {firstName}
          </h1>
        </div>

        {/* ─── Section 1: Panneau d'Analyse Principal ─── */}
        <FadeUp delay={0}>
          <section
            className="relative rounded-3xl overflow-hidden p-6 text-white shadow-xl bg-slate-950 border border-slate-900"
            data-testid="section-status"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Terminal className="w-24 h-24" />
            </div>

            <div className="relative">
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-emerald-400 font-mono mb-2">✦ Acquisition Bio</p>
              <h2 className="text-lg font-black uppercase tracking-wide leading-tight mb-2">
                Statut du Système Cutané
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
                {reminderMessage}
              </p>
              <button
                onClick={() => setLocation("/analyze")}
                data-testid="button-scan-now"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-950 font-black text-xs uppercase tracking-widest px-5 py-3.5 rounded-xl shadow-md active:scale-95 transition-all"
              >
                <ScanLine className="w-4 h-4 text-slate-950" />
                Lancer l'analyse optique
              </button>
            </div>
          </section>
        </FadeUp>

        {/* ─── Section 2: Métriques & Progression ─── */}
        <SlideLeft delay={0.08}>
          <section data-testid="section-progression">
            <div className="mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Suivi Analytique</h2>
            </div>

            {lastScore != null ? (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-5">
                  <CircularScore score={lastScore} color={scoreColors.hex} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">Glow Index Actuel</p>
                    {delta != null ? (
                      <div className="flex items-center gap-1.5 mt-1 mb-3">
                        <span
                          className={`text-sm font-black font-mono ${delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-slate-500"}`}
                          data-testid="text-score-delta"
                        >
                          {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {delta > 0 ? "+" : ""}{delta}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">vs capture précédente</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-semibold leading-tight mt-1 mb-3">
                        Première indexation stabilisée. Prévoyez une seconde capture.
                      </p>
                    )}
                    <button
                      onClick={() => setLocation("/profile?tab=evolution")}
                      data-testid="button-see-evolution"
                      className="inline-flex items-center gap-1 text-xs font-black text-slate-950 uppercase tracking-wider hover:underline transition-transform"
                    >
                      Historique complet <ChevronRight className="w-3 h-3 text-emerald-500" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs text-center">
                <TrendingUp className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium mb-4">
                  Aucune donnée disponible. Initialisez le premier diagnostic pour tracer la courbe.
                </p>
                <button
                  onClick={() => setLocation("/analyze")}
                  className="inline-flex items-center gap-1 text-xs font-black text-slate-950 uppercase tracking-wider"
                  data-testid="button-start-first-scan"
                >
                  Démarrer le diagnostic <ChevronRight className="w-3 h-3 text-emerald-500" />
                </button>
              </div>
            )}
          </section>
        </SlideLeft>

        {/* ─── Section 3: Recommandation Technique du jour ─── */}
        <DropTop delay={0.15}>
          <section data-testid="section-tip">
            <div className="mb-3 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Rapport quotidien</h2>
            </div>

            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xs bg-white">
              <motion.div
                initial={{ opacity: 0, scale: 1.02 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEW}
                transition={{ duration: 0.4, ease: EASE }}
                className="relative w-full h-40 overflow-hidden bg-slate-950"
              >
                <img
                  src={tipPhoto}
                  alt="Documentation clinique"
                  className="w-full h-full object-cover opacity-80"
                  data-testid="img-tip-photo"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute top-3 left-3 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white font-mono">Observation</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEW}
                transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
                className="p-5 text-left"
              >
                {skinTypeForTip && (
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 font-mono mb-1.5">
                    Cible : Typologie {skinTypeForTip}
                  </p>
                )}
                <p className="text-xs text-slate-600 leading-relaxed font-semibold mb-4" data-testid="text-tip">
                  {tip}
                </p>
                <button
                  onClick={() => setLocation("/conseils")}
                  data-testid="button-all-tips"
                  className="inline-flex items-center gap-1 text-xs font-black text-slate-950 uppercase tracking-wider"
                >
                  Ouvrir les guides techniques <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </motion.div>
            </div>
          </section>
        </DropTop>

        {/* ─── Section 4: Matrice de modules (Le savais-tu ?) ─── */}
        <FadeUp delay={0.22}>
          <section data-testid="section-knowledge">
            <div className="mb-3 px-1 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Documentation Analytique</h2>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {KNOWLEDGE_CARDS.map((card, i) => (
                <motion.div
                  key={card.testid}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={VIEW}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                  className="min-w-[260px] max-w-[260px] snap-start rounded-3xl overflow-hidden shadow-xs bg-white border border-slate-200 relative flex flex-col text-left"
                  data-testid={`knowledge-card-${card.testid}`}
                >
                  <div className="relative w-full h-36 overflow-hidden bg-slate-950">
                    <img
                      src={card.photo}
                      alt={card.title}
                      className="w-full h-full object-cover opacity-75"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-xs font-black text-white uppercase tracking-wider font-mono">
                        {card.title}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-[11px] leading-relaxed text-slate-500 font-semibold mb-4">
                      {card.text}
                    </p>
                    <button
                      onClick={() => setLocation(card.path)}
                      data-testid={`button-knowledge-${card.testid}`}
                      className="w-full py-3 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md hover:bg-slate-900"
                    >
                      Exécuter le module
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </FadeUp>

        {/* ─── Section 5: Lien Passerelle Professionnelle (Dermato) ─── */}
        <FadeUp delay={0.28}>
          <section data-testid="section-pro-cta">
            <button
              onClick={() => setLocation("/pro")}
              data-testid="button-pro-cta"
              className="w-full text-left rounded-3xl p-4 bg-white border border-slate-200 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-xl flex-shrink-0 border border-slate-900 shadow-md">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-400 font-mono">Praticiens & Cliniques</p>
                  <p className="text-xs font-black text-slate-950 uppercase tracking-wide mt-0.5">Interface Dermatologue</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">Gérez votre patientèle via le tableau GlowScan Pro</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            </button>
          </section>
        </FadeUp>

        {/* ─── Section 6: Boutique / Formulations Cliniques ─── */}
        {featuredProducts.length > 0 && (
          <FadeUp delay={0.32}>
            <section data-testid="section-shop">
              <div className="mb-3 px-1 flex items-end justify-between">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Prescriptions de pointe</h2>
                </div>
                <button
                  onClick={() => setLocation("/shop")}
                  data-testid="button-shop-all"
                  className="inline-flex items-center gap-1 text-[10px] font-black text-slate-950 uppercase tracking-wider"
                >
                  Tout voir <ChevronRight className="w-3 h-3 text-emerald-500" />
                </button>
              </div>

              <div
                className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {featuredProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEW}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                    className="min-w-[170px] max-w-[170px] snap-start rounded-2xl overflow-hidden shadow-xs bg-white border border-slate-200 flex flex-col text-left"
                    data-testid={`featured-product-${p.id}`}
                  >
                    <div className="relative w-full h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain mix-blend-multiply"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-200" />
                      )}
                      <div className="absolute top-2 left-2 bg-slate-950 border border-slate-900 text-white font-mono text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm">
                        {p.badge}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono truncate">{p.brand}</p>
                        <p className="text-xs font-bold text-slate-900 leading-tight mt-0.5 line-clamp-2">
                          {p.name}
                        </p>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-mono font-black text-slate-950 mb-2">{p.price}</p>
                        <button
                          onClick={() => setLocation("/shop")}
                          data-testid={`button-order-${p.id}`}
                          className="w-full py-2 rounded-lg bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          Réserver
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </FadeUp>
        )}
      </main>

      {/* ─── Bottom Navigation de Contrôle Épurée ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-900 z-50 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        data-testid="nav-bottom"
      >
        <div className="px-5 pt-3 pb-2 flex justify-center">
          <motion.button
            onClick={() => setExplorerOpen(true)}
            data-testid="nav-explorer"
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 px-8 py-3.5 bg-white text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xl overflow-hidden"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Ouvrir la Console</span>
          </motion.button>
        </div>
      </nav>

      <ExplorerSheet open={explorerOpen} onClose={() => setExplorerOpen(false)} />
    </div>
  );
}
