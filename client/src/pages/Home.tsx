import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useProAccount } from "@/hooks/use-pro";
import { useQuery } from "@tanstack/react-query";
import { User, Sparkles, ScanLine, Bot, Apple, ListChecks, TrendingUp, ChevronRight, X, Compass, ShoppingBag, ArrowRight, Menu, Crown, LogOut, Lightbulb } from "lucide-react";
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
//  Animations au scroll — variantes Framer Motion
// ─────────────────────────────────────────────────────────────────────────
const VIEW = { once: true, margin: "-80px" } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
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
      initial={{ opacity: 0, x: -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function DropTop({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.55, delay, ease: EASE }}
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
//  Jauge circulaire qui se remplit progressivement
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
      style={{ width: size, height: size }}
      data-testid="circular-score"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#FCE4F1"
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
            className="text-[24px] font-black leading-none font-display"
            style={{ color }}
            data-testid="text-glowscore"
          >
            <AnimatedCounter to={score} start={inView} />
          </p>
          <p className="text-[8px] text-gray-500 font-bold mt-0.5">/100</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Cartes "Le savais-tu ?" avec photos & boutons
// ─────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_CARDS = [
  {
    photo: cardSkinbotPhoto,
    title: "GlowScan AI connaît ta peau",
    text: "Mieux que toi. Pose-lui n'importe quelle question — ses réponses sont adaptées à TON diagnostic.",
    cta: "Poser une question",
    path: "/chat",
    testid: "GlowScan AI",
  },
  {
    photo: cardNutrimentsPhoto,
    title: "Tu es ce que tu manges",
    text: "GlowScan scanne tes nutriments et te dit ce qui nourrit ou abîme ta peau.",
    cta: "Scanner mes nutriments",
    path: "/nutriment-scan",
    testid: "nutriments",
  },
  {
    photo: cardRoutinePhoto,
    title: "Ta routine GlowScan , pas celle de ta voisine",
    text: "Chaque produit recommandé est choisi uniquement pour TON type de peau.",
    cta: "Voir ma routine",
    path: "/routine",
    testid: "routine",
  },
  {
    photo: cardEvolutionPhoto,
    title: "Reviens dans 2 jours",
    text: "GlowScan suit l'évolution de ta peau et mesure tes progrès, jour après jour.",
    cta: "Voir mes progrès",
    path: "/profile?tab=evolution",
    testid: "evolution",
  },
];

// ─────────────────────────────────────────────────────────────────────────
//  Astuces du jour selon type de peau
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
//  Boutique — produits mis en avant (fallback si DB vide)
// ─────────────────────────────────────────────────────────────────────────
const LOCAL_PRODUCT_IMAGES: Record<string, string> = productImages;

const FALLBACK_FEATURED = [
  { productId: "serum-jeunesse", badge: "Anti-taches" },
  { productId: "tresor-cacao", badge: "Hydratation" },
  { productId: "ebony-hair-soin-profond", badge: "Cheveux abîmés" },
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
        badge: it.badge || (p.targets[0] ?? "Vedette"),
      } as DisplayProduct;
    })
    .filter((x): x is DisplayProduct => x !== null);
}

// ─────────────────────────────────────────────────────────────────────────
//  Menu hamburger — toutes les fonctionnalités
// ─────────────────────────────────────────────────────────────────────────
type MenuItem =
  | { kind: "link"; emoji: string; label: string; desc: string; path: string; color: string }
  | { kind: "logout"; emoji: string; label: string; desc: string; color: string };

const EXPLORER_ITEMS: MenuItem[] = [
  { kind: "link", emoji: "👤", label: "Mon profil", desc: "Compte, historique, abonnement", path: "/profile", color: "bg-pink-50 border-pink-100" },
  { kind: "link", emoji: "🔬", label: "Scanner ma peau", desc: "Analyse photo IA en 10s", path: "/analyze", color: "bg-pink-50 border-pink-100" },
  { kind: "link", emoji: "🤖", label: "SkinBot", desc: "Ton coach personnel 24h/24", path: "/chat", color: "bg-pink-50 border-pink-200" },
  { kind: "link", emoji: "🥦", label: "Scanner mes nutriments", desc: "Ce que tu manges affecte ta peau", path: "/nutriment-scan", color: "bg-pink-50 border-pink-200" },
  { kind: "link", emoji: "🧴", label: "Boutique", desc: "Sélection adaptée à ton diagnostic", path: "/shop", color: "bg-pink-50 border-pink-200" },
  { kind: "link", emoji: "📋", label: "Ma routine", desc: "Matin & soir, étape par étape", path: "/routine", color: "bg-rose-50 border-rose-200" },
  { kind: "link", emoji: "💡", label: "Tous les conseils", desc: "Guides personnalisés pour ta peau", path: "/conseils", color: "bg-pink-50 border-pink-200" },
  { kind: "link", emoji: "📈", label: "Évolution de ma peau", desc: "Tes progrès au fil du temps", path: "/profile?tab=evolution", color: "bg-pink-50 border-pink-200" },
  { kind: "link", emoji: "👑", label: "Premium", desc: "Débloque toutes les fonctionnalités", path: "/premium", color: "bg-amber-50 border-amber-200" },
  { kind: "logout", emoji: "↩️", label: "Se déconnecter", desc: "Quitter ton compte GlowScan", color: "bg-gray-50 border-gray-200" },
];

function ExplorerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const { logout, isLoggingOut } = useAuth();

  const handleClick = (item: MenuItem) => {
    if (item.kind === "logout") {
      logout();
      return;
    }
    onClose();
    setTimeout(() => setLocation(item.path), 180);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
            onClick={onClose}
            data-testid="explorer-backdrop"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed left-0 right-0 bottom-0 z-[61] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            data-testid="explorer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explorer-title"
          >
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <p className="text-[9px] font-black tracking-[0.18em] uppercase text-pink-600">Menu ✦</p>
                <h2 id="explorer-title" className="text-[20px] font-bold text-gray-900 font-display tracking-tight">Toutes tes fonctionnalités</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
                data-testid="explorer-close"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4 space-y-2.5">
              {EXPLORER_ITEMS.map((item, i) => (
                <motion.button
                  key={item.kind === "link" ? item.path : "logout"}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, ease: "easeOut" }}
                  onClick={() => handleClick(item)}
                  disabled={item.kind === "logout" && isLoggingOut}
                  data-testid={item.kind === "logout" ? "menu-item-logout" : `menu-item-${item.path.replace(/\//g, "-")}`}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-[0.97] transition-transform border ${item.color} ${item.kind === "logout" && isLoggingOut ? "opacity-60" : ""}`}
                >
                  <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-gray-900 leading-tight">{item.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────
function daysSince(date: string | Date) {
  const d = new Date(date).getTime();
  const now = Date.now();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function getScoreColor(score: number) {
  if (score >= 75) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", hex: "#059669" };
  if (score >= 50) return { text: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200", hex: "#E91E8C" };
  return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", hex: "#E11D48" };
}

// ─────────────────────────────────────────────────────────────────────────
//  PAGE HOME
// ─────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isLoading } = useAuth();
  const { data: scans } = useScans();
  const [, setLocation] = useLocation();
  const [explorerOpen, setExplorerOpen] = useState(false);

  // ── Auto-redirect dermato : si l'utilisateur connecté possède un compte Pro,
  // on le ramène directement sur son tableau de bord pro (sauf s'il a explicitement
  // demandé la home consommateur via ?as=user).
  const { data: proData } = useProAccount();
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("as") === "user") return;
    if (proData?.account) {
      setLocation("/pro/dashboard");
    }
  }, [user, proData, setLocation]);

  // Featured products gérés depuis l'admin (fallback : 3 produits codés)
  const { data: featuredRaw } = useQuery<FeaturedProduct[]>({
    queryKey: ["/api/featured-products"],
    staleTime: 60_000,
  });
  const featuredProducts = useMemo<DisplayProduct[]>(() => {
    // Tri défensif par position au cas où l'API ne renvoie pas trié
    const sorted = featuredRaw && featuredRaw.length > 0
      ? [...featuredRaw].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];
    const source = sorted.length > 0
      ? sorted.map((f) => ({ productId: f.productId, badge: f.badge }))
      : FALLBACK_FEATURED;
    const resolved = resolveFeaturedProducts(source);
    // Si après mapping aucun produit n'a de match dans le catalog, retomber sur le fallback
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
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-pink-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Landing />;

  const previousScan: any = scanList[1];
  const firstName = (user.firstName || user.lastName || user.email || "Toi").split(/[\s@]/)[0];

  const daysFromLastScan = lastScan?.createdAt ? daysSince(lastScan.createdAt) : null;
  let reminderMessage = "Fais ta toute première analyse — découvre ton GlowScore en 10 secondes.";
  if (daysFromLastScan === 0) {
    reminderMessage = "Tu as scanné aujourd'hui. Reviens dans 2 jours pour voir l'évolution de ta peau.";
  } else if (daysFromLastScan === 1) {
    reminderMessage = "Tu as scanné hier. Reviens demain pour voir l'évolution de ta peau.";
  } else if (daysFromLastScan && daysFromLastScan >= 2) {
    reminderMessage = `Tu n'as pas fait d'analyse depuis ${daysFromLastScan} jours. Ta peau évolue — découvre les changements.`;
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-28" data-testid="page-home">
      <Onboarding />

      {/* ─── Top bar : Logo + Profile (PAS d'animation — premier bloc visible) ─── */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center" data-testid="logo-glowscan">
            <img
              src="/logo-glowscan.jpeg"
              alt="GlowScan"
              className="h-12 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
          </div>
          <button
            onClick={() => setExplorerOpen(true)}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-pink-100 flex items-center justify-center active:scale-90 transition-all"
            data-testid="button-menu"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-gray-700" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-8">
        {/* ─── Salutation (premier bloc — sans animation) ─── */}
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.18em]">Bonjour</p>
          <h1 className="text-[28px] font-semibold text-gray-900 font-display tracking-tight leading-tight" data-testid="text-username">
            {firstName}
          </h1>
        </div>

        {/* ─── Section : État de ta peau (fade up) ─── */}
        <FadeUp delay={0}>
          <section
            className="relative rounded-3xl overflow-hidden p-5 text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #C2185B 50%, #E91E8C 100%)" }}
            data-testid="section-status"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/80 mb-2">État de ta peau</p>
              <h2 className="text-[20px] font-bold font-display leading-tight mb-2">
                Où en est ta peau aujourd'hui&nbsp;?
              </h2>
              <p className="text-[13px] text-white/90 leading-relaxed mb-5">
                {reminderMessage}
              </p>
              <button
                onClick={() => setLocation("/analyze")}
                data-testid="button-scan-now"
                className="inline-flex items-center gap-2 bg-white text-pink-700 font-bold text-[13px] px-5 py-2.5 rounded-2xl shadow-md active:scale-95 transition-all"
              >
                <ScanLine className="w-4 h-4" />
                Scanner maintenant
              </button>
            </div>
          </section>
        </FadeUp>

        {/* ─── Section : Ta progression (slide LEFT + jauge animée) ─── */}
        <SlideLeft delay={0.12}>
          <section data-testid="section-progression">
            <div className="mb-3">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400">Suivi ✦</p>
              <h2 className="text-[18px] font-bold text-gray-900 font-display tracking-tight">Ta progression</h2>
            </div>

            {lastScore != null ? (
              <div className={`bg-white rounded-3xl p-5 border ${scoreColors.border} shadow-sm`}>
                <div className="flex items-center gap-5">
                  <CircularScore score={lastScore} color={scoreColors.hex} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Ton GlowScore</p>
                    {delta != null ? (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className={`text-[15px] font-black ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-gray-500"}`}
                          data-testid="text-score-delta"
                        >
                          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {delta > 0 ? "+" : ""}{delta}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">depuis ta dernière analyse</span>
                      </div>
                    ) : (
                      <p className="text-[12px] text-gray-500 font-medium leading-snug mb-2">
                        Première analyse enregistrée — refais-en une pour mesurer tes progrès.
                      </p>
                    )}
                    <button
                      onClick={() => setLocation("/profile?tab=evolution")}
                      data-testid="button-see-evolution"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-700 active:scale-95 transition-transform"
                    >
                      Voir mon évolution <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm text-center">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] text-gray-500 font-medium mb-3">
                  Fais ta première analyse pour démarrer ton suivi.
                </p>
                <button
                  onClick={() => setLocation("/analyze")}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-pink-700"
                  data-testid="button-start-first-scan"
                >
                  Commencer maintenant <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>
        </SlideLeft>

        {/* ─── Section : Astuce du jour (drop top + photo puis texte 0.3s plus tard) ─── */}
        <DropTop delay={0.24}>
          <section data-testid="section-tip">
            <div className="mb-3">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400">Conseil ✦</p>
              <h2 className="text-[18px] font-bold text-gray-900 font-display tracking-tight">Astuce du jour</h2>
            </div>

            <div className="rounded-3xl overflow-hidden border border-pink-200 shadow-sm bg-white">
              {/* Photo arrive en premier */}
              <motion.div
                initial={{ opacity: 0, scale: 1.05 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEW}
                transition={{ duration: 0.55, ease: EASE }}
                className="relative w-full h-44 overflow-hidden"
              >
                <img
                  src={tipPhoto}
                  alt="Astuce skincare"
                  className="w-full h-full object-cover"
                  data-testid="img-tip-photo"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                  <span className="text-[14px]">💡</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-pink-700">Astuce</span>
                </div>
              </motion.div>

              {/* Texte arrive 0.3s plus tard */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEW}
                transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
                className="p-5"
              >
                {skinTypeForTip && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-pink-700 mb-1.5">
                    Pour ta peau {skinTypeForTip}
                  </p>
                )}
                <p className="text-[14px] text-gray-800 leading-relaxed font-medium mb-4" data-testid="text-tip">
                  {tip}
                </p>
                <button
                  onClick={() => setLocation("/conseils")}
                  data-testid="button-all-tips"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-pink-700 active:scale-95 transition-transform"
                >
                  Voir tous les conseils <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </div>
          </section>
        </DropTop>

        {/* ─── Section : Le savais-tu ? (cartes arrivent depuis la droite, stagger 0.2s) ─── */}
        <FadeUp delay={0.36}>
          <section data-testid="section-knowledge">
            <div className="mb-3 px-1">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400">Découvre ✦</p>
              <h2 className="text-[18px] font-bold text-gray-900 font-display tracking-tight">Le savais-tu&nbsp;?</h2>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {KNOWLEDGE_CARDS.map((card, i) => (
                <motion.div
                  key={card.testid}
                  initial={{ opacity: 0, x: 80 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={VIEW}
                  transition={{ duration: 0.5, delay: i * 0.2, ease: EASE }}
                  className="min-w-[270px] max-w-[270px] snap-start rounded-3xl overflow-hidden shadow-md bg-white relative flex flex-col"
                  data-testid={`knowledge-card-${card.testid}`}
                >
                  <div className="relative w-full h-44 overflow-hidden">
                    <img
                      src={card.photo}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[14px] font-bold leading-tight text-white font-display drop-shadow-lg">
                        {card.title}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-[12px] leading-snug text-gray-700 mb-3 flex-1">
                      {card.text}
                    </p>
                    <button
                      onClick={() => setLocation(card.path)}
                      data-testid={`button-knowledge-${card.testid}`}
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[12px] font-bold active:scale-95 transition-all shadow-sm"
                    >
                      {card.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </FadeUp>

        {/* ─── Encart : Êtes-vous dermatologue ? (vers GlowScan Pro) ─── */}
        <FadeUp delay={0.46}>
          <section data-testid="section-pro-cta" className="mb-1">
            <button
              onClick={() => setLocation("/pro")}
              data-testid="button-pro-cta"
              className="w-full text-left rounded-3xl p-4 bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-950/40 dark:via-rose-950/40 dark:to-fuchsia-950/40 border border-pink-200 dark:border-pink-800/50 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-2xl flex-shrink-0">
                  🩺
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-[0.15em] uppercase text-pink-600 dark:text-pink-300">Pour les pros</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Êtes-vous dermatologue ?</p>
                  <p className="text-[11px] text-gray-600 dark:text-white/60">Gérez vos patients avec GlowScan Pro · 14j gratuits</p>
                </div>
                <ChevronRight className="w-5 h-5 text-pink-500 flex-shrink-0" />
              </div>
            </button>
          </section>
        </FadeUp>

        {/* ─── Section : Boutique (produits arrivent depuis le bas, stagger) ─── */}
        {featuredProducts.length > 0 && (
          <FadeUp delay={0.48}>
            <section data-testid="section-shop">
              <div className="mb-3 px-1 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400">Boutique ✦</p>
                  <h2 className="text-[18px] font-bold text-gray-900 font-display tracking-tight">Sélection du moment</h2>
                </div>
                <button
                  onClick={() => setLocation("/shop")}
                  data-testid="button-shop-all"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-700 active:scale-95 transition-transform"
                >
                  Tout voir <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div
                className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {featuredProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEW}
                    transition={{ duration: 0.5, delay: i * 0.18, ease: EASE }}
                    className="min-w-[180px] max-w-[180px] snap-start rounded-2xl overflow-hidden shadow-md bg-white border border-pink-100 flex flex-col"
                    data-testid={`featured-product-${p.id}`}
                  >
                    <div className="relative w-full h-32 bg-pink-50 flex items-center justify-center p-3">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-pink-200" />
                      )}
                      <div className="absolute top-2 left-2 bg-pink-600 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {p.badge}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{p.brand}</p>
                      <p className="text-[12px] font-bold text-gray-900 leading-tight mb-1 line-clamp-2 flex-1">
                        {p.name}
                      </p>
                      <p className="text-[13px] font-black text-pink-700 mb-2">{p.price}</p>
                      <button
                        onClick={() => setLocation("/shop")}
                        data-testid={`button-order-${p.id}`}
                        className="inline-flex items-center justify-center gap-1 w-full py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold active:scale-95 transition-all"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        Commander
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </FadeUp>
        )}
      </main>

      {/* ─── Bottom Nav : un seul onglet "Explorer" ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 glow-bg-dark border-t border-pink-500/30 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        data-testid="nav-bottom"
      >
        <div className="px-5 pt-3 pb-2 flex justify-center">
          <motion.button
            onClick={() => setExplorerOpen(true)}
            data-testid="nav-explorer"
            whileTap={{ scale: 0.94 }}
            className="relative flex items-center gap-2.5 px-7 py-3 rounded-lg text-white font-bold text-[14px] shadow-lg shadow-pink-500/40 overflow-hidden glow-bg-pink"
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "30%", transform: "skewX(-20deg)" }}
            />
            <Compass className="w-5 h-5 relative z-10" />
            <span className="relative z-10 font-display tracking-tight">Explorer</span>
          </motion.button>
        </div>
      </nav>

      <ExplorerSheet open={explorerOpen} onClose={() => setExplorerOpen(false)} />
    </div>
  );
}
