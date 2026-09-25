import { useQuery } from "@tanstack/react-query";
import { resultStateOf } from "@shared/resultB2C";
import { STATES, AREA_LABEL } from "@/lib/resultView";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Accueil patient (refonte Organic) — maquette « GlowScan App » › Accueil.
// Uniquement des données réelles : dernier Glow Score, réponse du médecin,
// routine du jour, photo de contrôle demandée. Une carte sans donnée est masquée.
// ════════════════════════════════════════════════════════════════════════

type ScanLite = { id: number; score: number | null; area: string; condition: string | null; createdAt: string | Date | null; recommendations?: any };
type ConsultationLite = { id: number; status: string | null; unreadPatient: number | null; doctorName?: string | null; followUpDate?: string | null };
type RoutinesResp = { todayCompletions: number[]; stats: { totalSteps: number } };

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

  const tile = "flex flex-col gap-1.5 rounded-lg border-0 bg-organic-surface p-4 text-left text-organic-text";

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-4 bg-organic-bg px-5 pb-6 pt-4 font-body text-organic-text">
      <div className="flex items-center justify-between">
        <img
          src="/glowscan-mark.png"
          alt="GlowScan"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }}
          className="h-8 w-8 rounded-pill object-contain"
        />
        <button
          type="button"
          onClick={() => go("/profile")}
          aria-label="Mon profil"
          className="h-[38px] w-[38px] rounded-pill border-0 bg-organic-accent-200 font-bold text-organic-accent-800"
        >
          {(firstName || "U").charAt(0).toUpperCase()}
        </button>
      </div>

      <h1 className="m-0 text-[30px]">Bonjour {firstName}</h1>

      {/* Dernier Glow Score */}
      {lastScan && copy ? (
        <button type="button" onClick={() => go(`/ma-peau?scan=${lastScan.id}`)} className="flex items-center gap-4 rounded-lg border-0 bg-organic-surface p-[18px] text-left text-organic-text">
          <span
            className="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-pill"
            style={{ background: `conic-gradient(${copy.ring} ${(score ?? 0) * 3.6}deg, var(--color-neutral-200) 0)` }}
          >
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-pill bg-organic-surface font-heading text-[24px]">
              {score ?? "—"}
            </span>
          </span>
          <span className="flex flex-1 flex-col gap-1">
            <span className={cn(
              "self-start rounded-pill px-2.5 py-[3px] text-[11px]",
              copy.tag === "accent-2" ? "bg-organic-accent-2-100 text-organic-accent-2-800" : copy.tag === "accent" ? "bg-organic-accent-100 text-organic-accent-800" : "bg-organic-neutral-100 text-organic-neutral-800",
            )}>
              {state === "unusable" ? "Photo à reprendre" : copy.level}
            </span>
            <span className="text-[15px] font-bold">Votre Glow Score</span>
            <span className="text-[12px] text-organic-neutral-700">
              {AREA_LABEL[lastScan.area] || "Analyse"}{lastScan.createdAt ? ` · ${daysAgo(lastScan.createdAt)}` : ""}
            </span>
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-lg bg-organic-surface p-[18px]">
          <span className="kicker">Première analyse</span>
          <span className="font-heading text-[19px] leading-tight">Trois photos, deux minutes, un résultat</span>
          <span className="text-[13px] text-organic-neutral-700">Visage, corps ou cuir chevelu : vous choisissez la zone juste après.</span>
        </div>
      )}

      {/* Réponse du médecin */}
      {reply && (
        <button
          type="button"
          onClick={() => go(`/consultations?open=${reply.id}`)}
          className="flex items-center gap-3 rounded-lg border-0 bg-organic-accent-2-100 px-4 py-3.5 text-left text-organic-accent-2-900"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-pill bg-organic-accent-2-500 text-[13px] font-bold text-organic-bg">
            {initials(reply.doctorName)}
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[14px] font-bold">{drName(reply.doctorName)} vous a répondu</span>
            <span className="text-[12px]">{reply.status === "answered" ? "Votre compte rendu est prêt" : "Nouveau message dans votre consultation"}</span>
          </span>
          <span className="font-bold" aria-hidden>→</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => go("/analyze")}
        className="inline-flex items-center justify-center rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600"
      >
        Nouvelle analyse · 2 min
      </button>

      <div className={cn("grid gap-2.5", followUp ? "grid-cols-2" : "grid-cols-1")}>
        <button type="button" onClick={() => go("/routine")} className={tile}>
          <span className="text-[12px] text-organic-neutral-700">Routine du jour</span>
          {total > 0 ? (
            <>
              <span className="font-heading text-[24px]">{done} / {total}</span>
              <div className="h-1.5 rounded-pill bg-organic-neutral-200">
                <div className="h-full rounded-pill bg-organic-accent-2-600" style={{ width: `${Math.round((done / total) * 100)}%` }} />
              </div>
            </>
          ) : (
            <span className="font-heading text-[20px]">Créer ma routine</span>
          )}
        </button>
        {followUp && (
          <button type="button" onClick={() => go(`/consultations?open=${followUp.id}`)} className={tile}>
            <span className="text-[12px] text-organic-neutral-700">Photo de contrôle</span>
            <span className="font-heading text-[24px]">{daysUntil(followUp.followUpDate!)}</span>
            <span className="text-[11px] text-organic-neutral-700">demandée par {drName(followUp.doctorName)}</span>
          </button>
        )}
      </div>

      {!isPremium && (
        <button
          type="button"
          onClick={() => go("/premium")}
          className="flex items-center gap-3 rounded-lg border-2 border-organic-accent-300 bg-transparent px-4 py-3.5 text-left text-organic-text"
        >
          <span className="flex flex-1 flex-col">
            <span className="text-[14px] font-bold">Premium · 2 000 F / mois</span>
            <span className="text-[12px] text-organic-neutral-700">Analyses et scans produit illimités, assistant</span>
          </span>
          <span className="rounded-pill bg-organic-accent-100 px-2.5 py-[3px] text-[11px] text-organic-accent-800">Voir</span>
        </button>
      )}
    </div>
  );
}
