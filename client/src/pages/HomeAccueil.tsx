import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, NotebookPen, ShoppingBag, Stethoscope, Star } from "lucide-react";
import { resultStateOf } from "@shared/resultB2C";
import { STATES, AREA_LABEL } from "@/lib/resultView";
import { useSubscription } from "@/hooks/use-subscription";
import { ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Accueil patient connecté (style de la nouvelle maquette B2C).
// Uniquement des données réelles : dernier Glow Score, réponse du médecin,
// routine du jour, bilan du jour, photo de contrôle demandée. Une carte sans
// donnée est masquée ou propose la première action.
// ════════════════════════════════════════════════════════════════════════

type ScanLite = { id: number; score: number | null; area: string; condition: string | null; createdAt: string | Date | null; recommendations?: any };
type ConsultationLite = { id: number; status: string | null; unreadPatient: number | null; doctorName?: string | null; followUpDate?: string | null };
type RoutinesResp = { todayCompletions: number[]; stats: { totalSteps: number } };
type JournalResp = { today: string; last: { day: string; comfort: number } | null };

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", lime: "#cfe08a" };
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

export function HomeAccueil({ firstName, lastScan, go }: { firstName: string; lastScan: ScanLite | null; go: (path: string) => void }) {
  const { isPremium } = useSubscription();
  const { data: consultData } = useQuery<{ consultations: ConsultationLite[] }>({ queryKey: ["/api/consultations/mine"] });
  const { data: routines } = useQuery<RoutinesResp>({ queryKey: ["/api/routines"] });
  const { data: journal } = useQuery<JournalResp>({ queryKey: ["/api/journal?days=7"], retry: 1 });
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

  const total = routines?.stats?.totalSteps ?? 0;
  const done = routines?.todayCompletions?.length ?? 0;
  const bilanToday = journal?.last && journal.last.day === journal.today ? journal.last : null;
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());

  const tile = "flex flex-col gap-1.5 rounded-[16px] border bg-white p-4 text-left";

  return (
    <div className="b2c-theme mx-auto flex min-h-screen max-w-[480px] flex-col gap-4 bg-organic-bg px-5 pb-6 pt-4 font-body" style={{ color: G.text }}>
      <div className="flex items-center justify-between">
        <span className="font-heading text-[19px] font-bold" style={{ color: G.dark }}>glowscan</span>
        <button type="button" onClick={() => go("/profile")} aria-label="Mon profil"
          className="h-[38px] w-[38px] rounded-pill border-0 text-[15px] font-bold" style={{ background: G.sage, color: G.dark }}>
          {(firstName || "U").charAt(0).toUpperCase()}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[30px] leading-[1.12]">Bonjour {firstName}.</h1>
        <span className="text-[13.5px]" style={{ color: G.muted }}>{today}</span>
      </div>

      {/* Dernier Glow Score */}
      {lastScan && copy ? (
        <button type="button" onClick={() => go(`/ma-peau?scan=${lastScan.id}`)} className="flex items-center gap-4 rounded-[16px] border bg-white p-4 text-left" style={{ borderColor: G.line, color: G.text }}>
          <span className="flex h-[74px] w-[74px] flex-none items-center justify-center rounded-pill"
            style={{ background: `conic-gradient(${RING[state!] || G.dark} ${(score ?? 0) * 3.6}deg, ${G.soft} 0)` }}>
            <span className="flex h-[58px] w-[58px] items-center justify-center rounded-pill bg-white font-heading text-[23px] font-bold">{score ?? "–"}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="self-start rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: G.sage, color: G.dark }}>
              {state === "unusable" ? "Photo à reprendre" : copy.level}
            </span>
            <b className="text-[15.5px] font-semibold">Votre Glow Score</b>
            <span className="text-[12.5px]" style={{ color: G.muted }}>{AREA_LABEL[lastScan.area] || "Analyse"}{lastScan.createdAt ? ` · ${daysAgo(lastScan.createdAt)}` : ""}</span>
          </span>
          <ArrowRight size={17} style={{ color: G.dark }} />
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-[16px] p-4" style={{ background: G.sage }}>
          <span className="text-[11px] font-bold uppercase tracking-[.1em]" style={{ color: G.dark }}>Première analyse · gratuite</span>
          <b className="font-heading text-[19px] font-bold leading-tight">Un premier regard sur votre peau</b>
          <span className="text-[13.5px]" style={{ color: G.muted }}>Visage, corps ou cuir chevelu : vous choisissez la zone juste après.</span>
        </div>
      )}

      {/* Réponse du médecin */}
      {reply && (
        <button type="button" onClick={() => go(`/consultations?open=${reply.id}`)}
          className="flex items-center gap-3 rounded-[16px] border-0 px-4 py-3.5 text-left text-white" style={{ background: G.dark }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-[13px] font-bold" style={{ background: G.lime, color: G.dark }}>{initials(reply.doctorName)}</span>
          <span className="flex flex-1 flex-col">
            <b className="text-[14.5px] font-semibold">{drName(reply.doctorName)} vous a répondu</b>
            <span className="text-[12.5px] opacity-80">{reply.status === "answered" ? "Votre compte rendu est prêt" : "Nouveau message dans votre consultation"}</span>
          </span>
          <ArrowRight size={17} />
        </button>
      )}

      <button type="button" onClick={() => go("/analyze")}
        className="inline-flex items-center justify-center gap-2 rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white" style={{ background: G.dark }}>
        <Camera size={18} strokeWidth={1.8} /> Nouvelle analyse · 2 min
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => go("/routine")} className={tile} style={{ borderColor: G.line, color: G.text }}>
          <span className="text-[12.5px]" style={{ color: G.muted }}>Routine du jour</span>
          {total > 0 ? (
            <>
              <b className="font-heading text-[23px] font-bold">{done} / {total}</b>
              <div className="h-1.5 rounded-pill" style={{ background: G.soft }}>
                <div className="h-full rounded-pill" style={{ width: `${Math.round((done / total) * 100)}%`, background: G.dark }} />
              </div>
            </>
          ) : (
            <b className="text-[15.5px] font-semibold leading-snug">Créer ma routine →</b>
          )}
        </button>
        <button type="button" onClick={() => go("/ma-peau")} className={tile} style={{ borderColor: G.line, color: G.text }}>
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: G.muted }}><NotebookPen size={13} strokeWidth={1.8} />Bilan du jour</span>
          {bilanToday
            ? <><b className="font-heading text-[23px] font-bold">{bilanToday.comfort} / 5</b><span className="text-[12px]" style={{ color: G.muted }}>Fait aujourd'hui</span></>
            : <b className="text-[15.5px] font-semibold leading-snug">Comment va votre peau ? →</b>}
        </button>
        {followUp && (
          <button type="button" onClick={() => go(`/consultations?open=${followUp.id}`)} className={`${tile} col-span-2`} style={{ borderColor: G.line, color: G.text }}>
            <span className="text-[12.5px]" style={{ color: G.muted }}>Photo de contrôle · demandée par {drName(followUp.doctorName)}</span>
            <b className="font-heading text-[21px] font-bold">{daysUntil(followUp.followUpDate!)}</b>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => go("/dermatologues")} className="flex items-center gap-2.5 rounded-[14px] p-3.5 text-left" style={{ background: G.sage, color: G.dark }}>
          <Stethoscope size={18} strokeWidth={1.7} /><b className="text-[14px] font-semibold leading-tight">Un avis expert</b>
        </button>
        <button type="button" onClick={() => go("/shop")} className="flex items-center gap-2.5 rounded-[14px] p-3.5 text-left" style={{ background: G.sage, color: G.dark }}>
          <ShoppingBag size={18} strokeWidth={1.7} /><b className="text-[14px] font-semibold leading-tight">La boutique</b>
        </button>
      </div>

      {!isPremium && (
        <button type="button" onClick={() => go("/premium")} className="flex items-center gap-3 rounded-[16px] border px-4 py-3.5 text-left" style={{ borderColor: G.line, background: "#fff", color: G.text }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-white" style={{ background: G.dark }}><Star size={17} strokeWidth={1.7} /></span>
          <span className="flex flex-1 flex-col">
            <b className="text-[14.5px] font-semibold">GlowScan Plus · 2 000 F / mois</b>
            <span className="text-[12.5px]" style={{ color: G.muted }}>Analyses et scans produit illimités, assistant</span>
          </span>
          <ArrowRight size={17} style={{ color: G.dark }} />
        </button>
      )}
    </div>
  );
}
