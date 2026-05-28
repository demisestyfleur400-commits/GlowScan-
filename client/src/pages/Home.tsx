import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useProAccount } from "@/hooks/use-pro";
import { useQuery } from "@tanstack/react-query";
import { User, Sparkles, ScanLine, Bot, Apple, ListChecks, TrendingUp, ChevronRight, X, Compass, ShoppingBag, ArrowRight, Menu, Crown, LogOut, Lightbulb, Terminal, Target, ShieldAlert, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackPageVisit } from "@/lib/analytics";
import Landing from "@/pages/Landing";
import Onboarding from "@/components/Onboarding";
import { catalog, formatPrice, type Product } from "@shared/catalog";
import type { FeaturedProduct } from "@shared/schema";

import tipPhoto from "../lib/IMG_0122.png";
import cardSkinbotPhoto from "../lib/IMG_0139.png";
import cardNutrimentsPhoto from "../lib/IMG_0140.png";
import cardRoutinePhoto from "../lib/IMG_0133.png";
import cardEvolutionPhoto from "../lib/IMG_0131.png";

import { productImages } from "@/lib/productImages";

// ─────────────────────────────────────────────────────────────────────────
//  Design system constants
// ─────────────────────────────────────────────────────────────────────────
const DS = {
  bg: "#0d0a0e",
  surface: "#13101f",
  element: "#0e0b1a",
  textPrimary: "#f3f0ff",
  textBody: "rgba(200,185,255,0.65)",
  textMuted: "rgba(255,255,255,0.35)",
  textHint: "rgba(255,255,255,0.25)",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  pink: "#E91E8C",
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
} as const;

// ─────────────────────────────────────────────────────────────────────────
//  Scroll animation wrappers
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
//  Animated counter 0 → score
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
//  Circular score gauge
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
      className="relative flex-shrink-0"
      style={{ width: size, height: size, fontFamily: DS.font }}
      data-testid="circular-score"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(167,139,250,0.12)"
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
            className="text-[22px] font-extrabold leading-none tracking-tighter"
            style={{ color: DS.textPrimary }}
            data-testid="text-glowscore"
          >
            <AnimatedCounter to={score} start={inView} />
          </p>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5"
            style={{ color: DS.textMuted }}
          >
            Index
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Knowledge cards data
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
    title: "Matrice des nutriments",
    text: "GlowScan évalue l'impact biochimique de ton alimentation sur la barrière épidermique.",
    cta: "Analyser mes nutriments",
    path: "/nutriment-scan",
    testid: "nutriments",
  },
  {
    photo: cardRoutinePhoto,
    title: "Protocoles sur-mesure",
    text: "Aucun traitement générique. Chaque recommandation répond strictement à tes besoins cellulaires.",
    cta: "Accéder au protocole",
    path: "/routine",
    testid: "routine",
  },
  {
    photo: cardEvolutionPhoto,
    title: "Suivi évolutif 48h",
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
  { productId: "ebony-hair-soin-profond", badge: "Soin capillaire" },
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
  { kind: "link", label: "Mon profil", desc: "Configuration de session, métriques, droits", path: "/profile", icon: <User className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Scanner ma peau", desc: "Acquisition optique et diagnostic IA", path: "/analyze", icon: <ScanLine className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "SkinBot Engine", desc: "Agent conversationnel d'assistance", path: "/chat", icon: <Bot className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Analyse des nutriments", desc: "Évaluation de l'impact nutritionnel", path: "/nutriment-scan", icon: <Apple className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Boutique clinique", desc: "Formulations adaptées à vos indices", path: "/shop", icon: <ShoppingBag className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Protocole de soin", desc: "Planification d'application matin & soir", path: "/routine", icon: <ListChecks className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Base de connaissances", desc: "Documentation scientifique personnalisée", path: "/conseils", icon: <Lightbulb className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Courbe d'évolution", desc: "Visualisation des variations biométriques", path: "/profile?tab=evolution", icon: <TrendingUp className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "link", label: "Licence Pro / Premium", desc: "Extension globale des fonctionnalités", path: "/premium", icon: <Crown className="w-4 h-4" style={{ color: DS.violetMid }} strokeWidth={1.5} /> },
  { kind: "logout", label: "Terminer la session", desc: "Déconnexion sécurisée de la console", icon: <LogOut className="w-4 h-4" style={{ color: "#f9a8d4" }} strokeWidth={1.5} /> },
];

// ─────────────────────────────────────────────────────────────────────────
//  Explorer sheet (slide-up menu)
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
            className="fixed inset-0 z-[60] backdrop-blur-sm"
            style={{ background: "rgba(13,10,14,0.7)" }}
            onClick={onClose}
            data-testid="explorer-backdrop"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 z-[61] max-h-[82vh] overflow-hidden flex flex-col"
            style={{
              background: DS.surface,
              borderRadius: "28px 28px 0 0",
              border: "1px solid rgba(167,139,250,0.15)",
              borderBottom: "none",
              fontFamily: DS.font,
            }}
            data-testid="explorer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explorer-title"
          >
            {/* Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(167,139,250,0.25)" }}
              />
            </div>

            {/* Header */}
            <div
              className="px-5 pt-2 pb-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <p
                  className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: DS.textMuted }}
                >
                  <Terminal className="w-3 h-3" style={{ color: DS.violetMid }} strokeWidth={1.5} />
                  Index des modules
                </p>
                <h2
                  id="explorer-title"
                  className="text-lg font-extrabold tracking-tight mt-0.5"
                  style={{ color: DS.textPrimary }}
                >
                  Console globale
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center active:scale-90 transition-transform"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                data-testid="explorer-close"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" style={{ color: DS.textMuted }} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
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
                  className={`w-full flex items-center gap-3.5 p-3.5 text-left active:scale-[0.99] transition-transform ${item.kind === "logout" && isLoggingOut ? "opacity-40" : ""}`}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                  }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                    style={{
                      background: item.kind === "logout"
                        ? "rgba(233,30,140,0.08)"
                        : "rgba(124,58,237,0.12)",
                      border: item.kind === "logout"
                        ? "1px solid rgba(233,30,140,0.2)"
                        : "1px solid rgba(167,139,250,0.2)",
                      borderRadius: "10px",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-bold"
                      style={{
                        color: item.kind === "logout" ? "#f9a8d4" : DS.textPrimary,
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 font-medium truncate"
                      style={{ color: DS.textBody }}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: DS.textMuted }}
                    strokeWidth={1.5}
                  />
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
  if (score >= 75) return { hex: "#10b981", stateBg: "rgba(16,185,129,0.08)", stateBorder: "rgba(16,185,129,0.2)", stateText: "#6ee7b7" };
  if (score >= 50) return { hex: "#f59e0b", stateBg: "rgba(245,158,11,0.08)", stateBorder: "rgba(245,158,11,0.2)", stateText: "#fbbf24" };
  return { hex: "#E91E8C", stateBg: "rgba(233,30,140,0.08)", stateBorder: "rgba(233,30,140,0.2)", stateText: "#f9a8d4" };
}

// ─────────────────────────────────────────────────────────────────────────
//  HOME PAGE
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
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-3"
        style={{ background: DS.bg, fontFamily: DS.font }}
      >
        {/* Glow orb — no box-shadow */}
        <div
          className="absolute w-64 h-64"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)" }}
        />
        <div
          className="w-12 h-12 relative flex items-center justify-center"
          style={{
            background: DS.surface,
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: "20px",
          }}
        >
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: DS.violetMid }} strokeWidth={1.5} />
        </div>
        <p
          className="text-[10px] font-bold tracking-[0.2em] uppercase"
          style={{ color: DS.textMuted }}
        >
          Chargement…
        </p>
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
    <div
      className="min-h-screen pb-28"
      style={{ background: DS.bg, fontFamily: DS.font, color: DS.textPrimary }}
      data-testid="page-home"
    >
      <Onboarding />

      {/* Ambient glow orbs — no box-shadow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div
          className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12), transparent)" }}
        />
        <div
          className="absolute bottom-[20%] left-[-10%] w-[300px] h-[300px]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.08), transparent)" }}
        />
      </div>

      {/* ─── Header ─── */}
      <header
        className="px-5 pt-12 pb-4 sticky top-0 z-40"
        style={{
          background: `${DS.bg}e6`,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5" data-testid="logo-glowscan">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{
                background: DS.surface,
                border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: "12px",
              }}
            >
              <img src="/logo-icon.jpg" alt="" className="w-6 h-6 rounded-lg object-cover" />
            </div>
            <span className="text-base font-extrabold" style={{ color: DS.textPrimary }}>GlowScan</span>
          </div>
          <button
            onClick={() => setExplorerOpen(true)}
            className="w-9 h-9 flex items-center justify-center active:scale-95 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
            }}
            data-testid="button-menu"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-4 h-4" style={{ color: DS.textMuted }} strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6 max-w-md mx-auto relative z-10">

        {/* ─── Greeting ─── */}
        <div>
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ color: DS.textMuted }}
          >
            Bienvenue
          </p>
          <h1
            className="text-2xl font-extrabold tracking-tight mt-1"
            style={{ color: DS.textPrimary }}
            data-testid="text-username"
          >
            Bonjour, {firstName}
          </h1>
        </div>

        {/* ─── Section 1: Hero Scan ─── */}
        <FadeUp delay={0}>
          <section
            className="relative overflow-hidden"
            data-testid="section-status"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(167,139,250,0.18)",
              borderRadius: "24px",
            }}
          >
            {/* Glow orb inside card */}
            <div
              className="absolute top-[-30px] right-[-30px] w-40 h-40"
              style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)" }}
            />
            <div
              className="absolute bottom-[-20px] left-[-20px] w-28 h-28"
              style={{ background: "radial-gradient(circle, rgba(167,139,250,0.1), transparent)" }}
            />

            <div className="relative p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span
                  className="text-[9px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: "#6ee7b7" }}
                >
                  Analyse IA disponible
                </span>
              </div>
              <h2
                className="text-xl font-extrabold leading-tight mb-2"
                style={{ color: DS.textPrimary }}
              >
                Scanner ta peau
              </h2>
              <p
                className="text-xs leading-relaxed mb-5 font-medium"
                style={{ color: DS.textBody }}
              >
                {reminderMessage}
              </p>
              {/* Primary violet button */}
              <button
                onClick={() => setLocation("/analyze")}
                data-testid="button-scan-now"
                className="w-full h-12 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                style={{
                  background: "#7c3aed",
                  borderRadius: "9999px",
                  color: "#f3f0ff",
                }}
              >
                <ScanLine className="w-4 h-4" strokeWidth={1.5} />
                Lancer mon analyse
              </button>
            </div>
          </section>
        </FadeUp>

        {/* ─── Section 2: Glow Score ─── */}
        <SlideLeft delay={0.08}>
          <section data-testid="section-progression">
            <div className="mb-3 flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.15)" }}
              >
                <Target className="w-3 h-3" style={{ color: DS.violetMid }} strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-bold" style={{ color: DS.textBody }}>Mon Glow Score</h2>
            </div>

            {lastScore != null ? (
              <div
                className="p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "24px",
                }}
              >
                <div className="flex items-center gap-5">
                  <CircularScore score={lastScore} color={scoreColors.hex} />

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium"
                      style={{ color: DS.textMuted }}
                    >
                      Score actuel
                    </p>
                    {delta != null ? (
                      <div className="flex items-center gap-1.5 mt-1 mb-3">
                        <span
                          className="text-sm font-extrabold"
                          style={{
                            color: delta > 0 ? "#6ee7b7" : delta < 0 ? "#f9a8d4" : DS.textMuted,
                          }}
                          data-testid="text-score-delta"
                        >
                          {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {delta > 0 ? "+" : ""}{delta} pts
                        </span>
                        <span className="text-xs" style={{ color: DS.textMuted }}>depuis le dernier scan</span>
                      </div>
                    ) : (
                      <p
                        className="text-xs leading-tight mt-1 mb-3"
                        style={{ color: DS.textBody }}
                      >
                        Premier scan effectué ! Revenez dans 48h pour voir votre progression.
                      </p>
                    )}
                    <button
                      onClick={() => setLocation("/profile?tab=evolution")}
                      data-testid="button-see-evolution"
                      className="inline-flex items-center gap-1 text-xs font-bold transition-colors"
                      style={{ color: DS.violetMid }}
                    >
                      Voir l'évolution <ChevronRight className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="p-6 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "24px",
                }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(167,139,250,0.2)",
                    borderRadius: "16px",
                  }}
                >
                  <TrendingUp className="w-6 h-6" style={{ color: DS.violetMid }} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: DS.textPrimary }}>Aucun scan encore</p>
                <p className="text-xs mb-4" style={{ color: DS.textBody }}>Lance ton premier diagnostic pour voir ton Glow Score.</p>
                <button
                  onClick={() => setLocation("/analyze")}
                  className="inline-flex items-center gap-1 text-xs font-bold"
                  style={{ color: DS.violetMid }}
                  data-testid="button-start-first-scan"
                >
                  Démarrer maintenant <ChevronRight className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            )}
          </section>
        </SlideLeft>

        {/* ─── Section 3: Daily tip ─── */}
        <DropTop delay={0.15}>
          <section data-testid="section-tip">
            <div className="mb-3 flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.1)" }}
              >
                <Lightbulb className="w-3 h-3" style={{ color: "#fbbf24" }} strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-bold" style={{ color: DS.textBody }}>Conseil du jour</h2>
            </div>

            <div
              className="overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "24px",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 1.02 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEW}
                transition={{ duration: 0.4, ease: EASE }}
                className="relative w-full h-40 overflow-hidden"
                style={{ background: DS.element }}
              >
                <img
                  src={tipPhoto}
                  alt="Documentation clinique"
                  className="w-full h-full object-cover opacity-70"
                  data-testid="img-tip-photo"
                  loading="lazy"
                  decoding="async"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(13,10,14,0.9) 0%, transparent 60%)" }}
                />
                <div
                  className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: "8px",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span
                    className="text-[9px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: "#fbbf24" }}
                  >
                    Astuce peau
                  </span>
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
                  <p
                    className="text-[10px] font-bold mb-1.5 uppercase tracking-[0.15em]"
                    style={{ color: DS.violetLight }}
                  >
                    Pour peau {skinTypeForTip}
                  </p>
                )}
                <p
                  className="text-xs leading-relaxed font-semibold mb-4"
                  style={{ color: DS.textBody }}
                  data-testid="text-tip"
                >
                  {tip}
                </p>
                <button
                  onClick={() => setLocation("/conseils")}
                  data-testid="button-all-tips"
                  className="inline-flex items-center gap-1 text-xs font-bold"
                  style={{ color: DS.violetMid }}
                >
                  Voir tous les conseils <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </motion.div>
            </div>
          </section>
        </DropTop>

        {/* ─── Section 4: Knowledge cards ─── */}
        <FadeUp delay={0.22}>
          <section data-testid="section-knowledge">
            <div className="mb-3 px-1 flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.15)" }}
              >
                <Sparkles className="w-3 h-3" style={{ color: DS.violetMid }} strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-bold" style={{ color: DS.textBody }}>Explorer</h2>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
            >
              {KNOWLEDGE_CARDS.map((card, i) => (
                <motion.div
                  key={card.testid}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={VIEW}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                  className="min-w-[260px] max-w-[260px] snap-start overflow-hidden relative flex flex-col text-left"
                  style={{
                    background: "rgba(167,139,250,0.06)",
                    border: "1px solid rgba(167,139,250,0.18)",
                    borderRadius: "24px",
                  }}
                  data-testid={`knowledge-card-${card.testid}`}
                >
                  <div
                    className="relative w-full h-36 overflow-hidden"
                    style={{ background: DS.element }}
                  >
                    <img
                      src={card.photo}
                      alt={card.title}
                      className="w-full h-full object-cover opacity-70"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(13,10,14,0.95) 0%, transparent 55%)" }}
                    />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p
                        className="text-xs font-extrabold tracking-tight"
                        style={{ color: DS.textPrimary }}
                      >
                        {card.title}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p
                      className="text-[11px] leading-relaxed font-medium mb-4"
                      style={{ color: DS.textBody }}
                    >
                      {card.text}
                    </p>
                    {/* Secondary button */}
                    <button
                      onClick={() => setLocation(card.path)}
                      data-testid={`button-knowledge-${card.testid}`}
                      className="w-full py-3 text-[10px] font-extrabold active:scale-95 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "9999px",
                        color: DS.textPrimary,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Accéder au module
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </FadeUp>

        {/* ─── Section 5: Pro dermatologist CTA ─── */}
        <FadeUp delay={0.28}>
          <section data-testid="section-pro-cta">
            <button
              onClick={() => setLocation("/pro")}
              data-testid="button-pro-cta"
              className="w-full text-left p-4 active:scale-[0.99] transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "24px",
              }}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "14px",
                  }}
                >
                  <ShieldAlert className="w-4 h-4" style={{ color: "#6ee7b7" }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[9px] font-bold tracking-[0.2em] uppercase"
                    style={{ color: DS.textMuted }}
                  >
                    Praticiens & cliniques
                  </p>
                  <p
                    className="text-xs font-extrabold tracking-tight mt-0.5"
                    style={{ color: DS.textPrimary }}
                  >
                    Interface dermatologue
                  </p>
                  <p
                    className="text-[11px] font-medium truncate mt-0.5"
                    style={{ color: DS.textBody }}
                  >
                    Gérez votre patientèle via le tableau GlowScan Pro
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: DS.textMuted }} strokeWidth={1.5} />
              </div>
            </button>
          </section>
        </FadeUp>

        {/* ─── Section 6: Shop / featured products ─── */}
        {featuredProducts.length > 0 && (
          <FadeUp delay={0.32}>
            <section data-testid="section-shop">
              <div className="mb-3 px-1 flex items-end justify-between">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" style={{ color: DS.textMuted }} strokeWidth={1.5} />
                  <h2
                    className="text-[10px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: DS.textMuted }}
                  >
                    Prescriptions de pointe
                  </h2>
                </div>
                <button
                  onClick={() => setLocation("/shop")}
                  data-testid="button-shop-all"
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold"
                  style={{ color: DS.violetMid }}
                >
                  Tout voir <ChevronRight className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>

              <div
                className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {featuredProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEW}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                    className="min-w-[170px] max-w-[170px] snap-start overflow-hidden flex flex-col text-left"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "20px",
                    }}
                    data-testid={`featured-product-${p.id}`}
                  >
                    <div
                      className="relative w-full h-28 flex items-center justify-center p-3"
                      style={{
                        background: DS.element,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8" style={{ color: DS.textMuted }} strokeWidth={1.5} />
                      )}
                      {/* Badge violet */}
                      <div
                        className="absolute top-2 left-2 text-[8px] font-bold px-2 py-0.5"
                        style={{
                          background: "rgba(167,139,250,0.15)",
                          border: "1px solid rgba(167,139,250,0.3)",
                          borderRadius: "8px",
                          color: DS.violetLight,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {p.badge}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p
                          className="text-[9px] font-bold tracking-[0.15em] uppercase truncate"
                          style={{ color: DS.textMuted }}
                        >
                          {p.brand}
                        </p>
                        <p
                          className="text-xs font-bold leading-tight mt-0.5 line-clamp-2"
                          style={{ color: DS.textPrimary }}
                        >
                          {p.name}
                        </p>
                      </div>
                      <div className="mt-2">
                        <p
                          className="text-xs font-extrabold mb-2"
                          style={{ color: DS.textPrimary }}
                        >
                          {p.price}
                        </p>
                        {/* CTA rose — purchase only */}
                        <button
                          onClick={() => setLocation("/shop")}
                          data-testid={`button-order-${p.id}`}
                          className="w-full py-2 text-[10px] font-extrabold active:scale-95 transition-all flex items-center justify-center"
                          style={{
                            background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
                            borderRadius: "12px",
                            color: "#f3f0ff",
                            letterSpacing: "0.04em",
                          }}
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

      {/* ─── Bottom navigation ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: `${DS.surface}f0`,
          borderTop: "1px solid rgba(167,139,250,0.12)",
          backdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
        data-testid="nav-bottom"
      >
        <div className="px-5 pt-3 pb-2 flex justify-center">
          <motion.button
            onClick={() => setExplorerOpen(true)}
            data-testid="nav-explorer"
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 px-8 py-3.5 font-extrabold text-xs overflow-hidden"
            style={{
              background: "#7c3aed",
              borderRadius: "9999px",
              color: "#f3f0ff",
              letterSpacing: "0.06em",
            }}
          >
            {/* Glow orb inside button */}
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 30% 50%, rgba(196,181,253,0.15), transparent 70%)" }}
            />
            <Compass className="w-4 h-4 relative z-10" strokeWidth={1.5} />
            <span className="relative z-10 uppercase tracking-widest">Ouvrir la console</span>
          </motion.button>
        </div>
      </nav>

      <ExplorerSheet open={explorerOpen} onClose={() => setExplorerOpen(false)} />
    </div>
  );
}
