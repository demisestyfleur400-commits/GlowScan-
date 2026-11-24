import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, ScanBarcode, Clock, ShoppingBag, TrendingUp, ShieldCheck, type LucideIcon } from "lucide-react";
import { resultStateOf, productsAllowed } from "@shared/resultB2C";
import { pickKit, kitCard } from "@shared/kits";
import { formatF } from "@shared/delivery";
import { STATES, AREA_LABEL } from "@/lib/resultView";
import { useSubscription } from "@/hooks/use-subscription";
import { ensureDermFonts } from "@/components/derm/tokens";
import { cart } from "@/lib/cart";

// ════════════════════════════════════════════════════════════════════════
// Accueil patient connecté — maquettes AppNouveau / AppActif.
// Uniquement des données réelles : dernier Glow Score, kit calculé sur la
// dernière analyse, réponse du médecin, routine et bilan du jour, scans produit
// restants. Une carte sans donnée est masquée ou propose la première action.
// ════════════════════════════════════════════════════════════════════════

type ScanLite = { id: number; score: number | null; area: string; condition: string | null; createdAt: string | Date | null; recommendations?: any };
type ConsultationLite = { id: number; status: string | null; unreadPatient: number | null; doctorName?: string | null; followUpDate?: string | null };
type RoutinesResp = { todayCompletions: number[]; stats: { totalSteps: number } };
type JournalResp = { today: string; last: { day: string; comfort: number } | null };
type QuotaResp = { isPremium: boolean; used: number; limit: number; remaining: number };

const G = { dark: "#0F3B32", text: "#10231E", muted: "#4E6159", line: "#E2E8E5", pale: "#E3EFE9", soft: "#EEF3F0", accent: "#1E6F61", onDark: "#D3E4DD", accentDark: "#9FD3C1", lime: "#CFE08A", bg: "#F6F8F7" };
const FONT = "'DM Sans', system-ui, sans-serif";
const RING: Record<string, string> = { good: "#2a6b4f", watch: "#d9a441", medical: "#c46a3a", urgent: "#9b3a28", unusable: "#c9d3cc" };
const drName = (n?: string | null) => (!n ? "Votre médecin" : /^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const initials = (n?: string | null) =>
  String(n || "").replace(/^(dr|pr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "Dr";

function daysAgo(d: string | Date) {
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : `il y a ${n} jours`;
}
function daysUntil(d: string | Date) {
  const n = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  return n <= 0 ? "aujourd'hui" : `dans ${n} j`;
}

/** Tuile 2 × 2 du « mini dermatologue » (désactivée si pas de destination). */
function Tile({ icon: Icon, title, sub, onClick, testId }: { icon: LucideIcon; title: string; sub: string; onClick?: () => void; testId?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} data-testid={testId}
      className="flex min-h-[104px] flex-col gap-2 rounded-[16px] border bg-white p-3.5 text-left disabled:cursor-default"
      style={{ borderColor: G.line, color: G.text, opacity: onClick ? 1 : 0.75 }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: G.pale }}><Icon size={20} color={G.dark} strokeWidth={2} aria-hidden /></span>
      <b className="text-[14.5px] font-semibold" style={{ color: G.dark }}>{title}</b>
      <span className="text-[12.5px] leading-[1.4]" style={{ color: G.muted }}>{sub}</span>
    </button>
  );
}

export function HomeAccueil({ firstName, lastScan, scanCount, go }: { firstName: string; lastScan: ScanLite | null; scanCount: number; go: (path: string) => void }) {
  const { isPremium } = useSubscription();
  const { data: consultData } = useQuery<{ consultations: ConsultationLite[] }>({ queryKey: ["/api/consultations/mine"] });
  const { data: routines } = useQuery<RoutinesResp>({ queryKey: ["/api/routines"] });
  const { data: journal } = useQuery<JournalResp>({ queryKey: ["/api/journal?days=7"], retry: 1 });
  const { data: quota } = useQuery<QuotaResp>({ queryKey: ["/api/product-scan/quota"], retry: 1 });
  useEffect(() => { ensureDermFonts(); }, []);

  const consultations = consultData?.consultations ?? [];
  const reply = consultations.find((c) => (c.unreadPatient ?? 0) > 0 && c.status !== "pending_payment");
  const followUp = consultations
    .filter((c) => c.followUpDate)
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())[0];

  // Dernier Glow Score : état calculé avec les mêmes règles que le Résultat.
  const full = lastScan?.recommendations?._fullResult;
  const state = lastScan ? resultStateOf(full ?? { score: lastScan.score, condition: lastScan.condition }) : null;
  const copy = state ? STATES[state] : null;
  const score = lastScan && state !== "unusable" && typeof lastScan.score === "number" ? lastScan.score : null;

  // Kit conseillé : même logique que l'écran Résultat (shared/kits.ts).
  const kitProduct = lastScan && state && full && productsAllowed(state) ? pickKit(full, lastScan.area || "face") : null;
  const kit = kitProduct ? kitCard(kitProduct) : null;

  const total = routines?.stats?.totalSteps ?? 0;
  const done = routines?.todayCompletions?.length ?? 0;
  const bilanToday = journal?.last && journal.last.day === journal.today ? journal.last : null;
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());
  const plus = isPremium || quota?.isPremium;
  const scanSub = !quota ? "Repérez les ingrédients dangereux"
    : plus ? "Illimité avec GlowScan Plus"
    : lastScan ? `${quota.remaining} scan${quota.remaining > 1 ? "s" : ""} gratuit${quota.remaining > 1 ? "s" : ""} restant${quota.remaining > 1 ? "s" : ""}`
    : `Repérez les ingrédients dangereux · ${quota.limit} gratuits / semaine`;

  return (
    <div className="b2c-theme mx-auto flex min-h-screen max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4" style={{ color: G.text, background: G.bg, fontFamily: FONT }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <img src="/glowscan-mark.png" alt="" width={34} height={34} className="h-[34px] w-[34px] object-contain" />
          <b className="text-[18px] font-bold" style={{ color: G.dark }}>GlowScan</b>
        </span>
        <button type="button" onClick={() => go("/profile")} aria-label="Mon profil"
          className="h-11 w-11 rounded-full border-0 text-[16px] font-bold" style={{ background: G.pale, color: G.dark }}>
          {(firstName || "U").charAt(0).toUpperCase()}
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <h1 className="m-0 text-[28px] font-bold leading-[1.15]" style={{ color: G.dark }}>Bonjour {firstName}.</h1>
        <span className="text-[13.5px]" style={{ color: G.muted }}>{today}</span>
      </div>

      {/* Réponse du médecin */}
      {reply && (
        <button type="button" onClick={() => go(`/consultations?open=${reply.id}`)}
          className="flex items-center gap-3 rounded-[16px] border-0 px-4 py-3.5 text-left text-white" style={{ background: G.dark }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-[13px] font-bold" style={{ background: G.lime, color: G.dark }}>{initials(reply.doctorName)}</span>
          <span className="flex flex-1 flex-col">
            <b className="text-[14.5px] font-semibold">{drName(reply.doctorName)} vous a répondu</b>
            <span className="text-[12.5px]" style={{ color: G.onDark }}>{reply.status === "answered" ? "Votre compte rendu est prêt" : "Nouveau message dans votre consultation"}</span>
          </span>
          <ArrowRight size={18} aria-hidden />
        </button>
      )}

      {/* Carte principale */}
      {lastScan && copy ? (
        <button type="button" onClick={() => go(`/ma-peau?scan=${lastScan.id}`)} className="flex items-center gap-4 rounded-[18px] border bg-white p-4 text-left" style={{ borderColor: G.line, color: G.text }}>
          <span className="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${RING[state!] || G.dark} ${(score ?? 0) * 3.6}deg, ${G.soft} 0)` }}>
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-[24px] font-bold">{score ?? "–"}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="self-start rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: G.pale, color: G.dark }}>
              {state === "unusable" ? "Photo à reprendre" : copy.level}
            </span>
            <b className="text-[15.5px] font-semibold" style={{ color: G.dark }}>Votre Glow Score</b>
            <span className="text-[12.5px]" style={{ color: G.muted }}>{AREA_LABEL[lastScan.area] || "Analyse"}{lastScan.createdAt ? ` · ${daysAgo(lastScan.createdAt)}` : ""}</span>
          </span>
          <span className="whitespace-nowrap text-[13px] font-semibold" style={{ color: G.dark }}>Voir →</span>
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-[20px] p-[22px]" style={{ background: G.dark }} data-testid="first-analysis-card">
          <span className="text-[11.5px] font-bold uppercase tracking-[.1em]" style={{ color: G.accentDark }}>Étape 1 · gratuit</span>
          <b className="text-[22px] font-bold leading-[1.2] text-white">Faites votre première analyse de peau</b>
          <span className="text-[14px] leading-[1.5]" style={{ color: G.onDark }}>Une photo, 2 minutes. Visage, corps ou cuir chevelu : vous choisissez la zone juste après.</span>
          <button type="button" onClick={() => go("/analyze")} data-testid="button-first-analysis"
            className="mt-1 flex h-[50px] items-center justify-center gap-2 rounded-[12px] border-0 bg-white text-[15.5px] font-semibold" style={{ color: G.dark }}>
            <Camera size={20} strokeWidth={2} aria-hidden /> Analyser ma peau
          </button>
        </div>
      )}

      {/* Kit conseillé */}
      {kit && (
        <div className="flex flex-col gap-3 rounded-[18px] border bg-white p-4" style={{ borderColor: G.line }} data-testid="home-kit">
          <span className="text-[11.5px] font-bold uppercase tracking-[.1em]" style={{ color: G.accent }}>Votre kit conseillé</span>
          <div className="grid grid-cols-3 gap-2">
            {kit.items.slice(0, 3).map((it) => (
              <span key={it.id} className="flex h-[76px] items-center justify-center overflow-hidden rounded-[10px] p-1 text-center text-[11px]" style={{ background: G.soft, color: "#5B6E66" }}>
                {it.image ? <img src={it.image} alt={it.name} loading="lazy" className="h-full w-full object-contain" /> : it.brand || it.name}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2.5">
            <b className="text-[16px]" style={{ color: G.dark }}>{kit.name}</b>
            <b className="whitespace-nowrap text-[15px]" style={{ color: G.dark }}>{formatF(kit.price)}</b>
          </div>
          <span className="text-[13px] leading-[1.5]" style={{ color: G.muted }}>{kit.reason}</span>
          <button type="button" onClick={() => { cart.add(kit.id); go(`/shop?p=${kit.id}`); }} data-testid="button-home-kit"
            className="flex h-[46px] items-center justify-center rounded-[12px] border-0 text-[15px] font-semibold text-white" style={{ background: G.dark }}>
            Ajouter le kit au panier
          </button>
        </div>
      )}

      {/* Votre mini dermatologue */}
      <div className="flex flex-col gap-2.5">
        <b className="text-[16px]" style={{ color: G.dark }}>Votre mini dermatologue</b>
        <div className="grid grid-cols-2 gap-2.5">
          {lastScan ? (
            <>
              <Tile icon={Camera} title="Nouvelle analyse" sub="Comparez avec la dernière · 2 min" onClick={() => go("/analyze")} />
              <Tile icon={ScanBarcode} title="Scanner un produit" sub={scanSub} onClick={() => go("/product-scan-camera")} />
              <Tile icon={Clock} title="Ma routine" sub={total > 0 ? `Aujourd'hui : ${done} / ${total} étapes` : "Créer ma routine"} onClick={() => go("/routine")} />
              <Tile icon={TrendingUp} title="Suivi de ma peau" sub={bilanToday ? `${bilanToday.comfort} / 5 aujourd'hui` : "Bilan du jour à faire"} onClick={() => go("/ma-peau")} />
            </>
          ) : (
            <>
              <Tile icon={ScanBarcode} title="Scanner un produit" sub={scanSub} onClick={() => go("/product-scan-camera")} />
              <Tile icon={Clock} title="Ma routine" sub={total > 0 ? `Aujourd'hui : ${done} / ${total} étapes` : "Matin et soir, avec rappels"} onClick={() => go("/routine")} />
              <Tile icon={ShoppingBag} title="Mon kit conseillé" sub="Disponible après votre analyse" onClick={() => go("/analyze")} />
              <Tile icon={TrendingUp} title="Suivi de ma peau" sub={bilanToday ? `${bilanToday.comfort} / 5 aujourd'hui` : "Comment va votre peau aujourd'hui ?"} onClick={() => go("/ma-peau")} />
            </>
          )}
          {followUp && (
            <button type="button" onClick={() => go(`/consultations?open=${followUp.id}`)} className="col-span-2 flex flex-col gap-1.5 rounded-[16px] border bg-white p-4 text-left" style={{ borderColor: G.line, color: G.text }}>
              <span className="text-[12.5px]" style={{ color: G.muted }}>Photo de contrôle · demandée par {drName(followUp.doctorName)}</span>
              <b className="text-[21px] font-bold" style={{ color: G.dark }}>{daysUntil(followUp.followUpDate!)}</b>
            </button>
          )}
        </div>
      </div>

      {/* Parler à un dermatologue */}
      <div className="flex flex-col gap-2.5 rounded-[18px] bg-white p-[18px]" style={{ border: `1.5px solid ${G.dark}` }}>
        <div className="flex items-center justify-between gap-2.5">
          <b className="text-[17px]" style={{ color: G.dark }}>Parler à un dermatologue</b>
          <b className="whitespace-nowrap text-[15px]" style={{ color: G.dark }}>5 000 FCFA</b>
        </div>
        <span className="text-[13.5px] leading-[1.5]" style={{ color: G.muted }}>Il relit votre dossier et vous envoie compte rendu et ordonnance sur WhatsApp. Réponse sous 24 h, ou vous êtes remboursé.</span>
        <button type="button" onClick={() => go("/dermatologues")}
          className="flex h-[46px] items-center justify-center rounded-[12px] border-0 text-[15px] font-semibold" style={{ background: G.pale, color: G.dark }}>
          Choisir un dermatologue
        </button>
      </div>

      {/* GlowScan Plus : seulement à partir de 3 analyses */}
      {!plus && scanCount >= 3 && (
        <button type="button" onClick={() => go("/premium")} className="flex items-center gap-3 rounded-[16px] border bg-white px-4 py-3.5 text-left" style={{ borderColor: G.line, color: G.text }}>
          <span className="flex flex-1 flex-col gap-0.5">
            <b className="text-[14.5px] font-semibold" style={{ color: G.dark }}>Déjà {scanCount} analyses : passez à GlowScan Plus</b>
            <span className="text-[12.5px]" style={{ color: G.muted }}>Analyses et scans illimités · 2 000 FCFA / mois</span>
          </span>
          <ArrowRight size={18} color={G.dark} aria-hidden />
        </button>
      )}

      {!lastScan && (
        <span className="flex items-center justify-center gap-1.5 text-[12.5px]" style={{ color: G.muted }}>
          <ShieldCheck size={14} color={G.accent} aria-hidden /> Données protégées selon la loi n° 2024/017
        </span>
      )}
    </div>
  );
}
