import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ScanFace, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult } from "@shared/schema";
import { resultStateOf } from "@shared/resultB2C";
import { AREA_LABEL } from "@/lib/resultView";
import { ResultB2C } from "@/components/b2c/ResultB2C";
import { ensureDermFonts } from "@/components/derm/tokens";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Ma peau › « Mon évolution » (nouvelle maquette B2C).
// Bilan du jour (ressenti 1 à 5, migration 0039) sur 7 / 30 / 90 jours, avec
// les Glow Scores de la période, la régularité de la routine, puis avant /
// après, comptes rendus des médecins et historique des analyses. Uniquement
// de vraies données : un scan sans score (photo inexploitable) n'entre pas
// dans la courbe.
// ════════════════════════════════════════════════════════════════════════

type ScanLite = { id: number; score: number | null; area: string; condition: string | null; createdAt: string | Date | null; imageUrl?: string | null; recommendations?: any; analysis?: string | null; motivation?: string | null };
type ConsultationLite = { id: number; status: string | null; condition: string | null; createdAt: string | null; doctorName?: string | null };
type Entry = { day: string; comfort: number; note: string | null; updatedAt: string | null };
type Journal = { days: number; from: string; today: string; entries: Entry[]; last: Entry | null; total: number; scores: { day: string; score: number }[]; routineDays: number };

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", lime: "#cfe08a" };
const COMFORT = ["", "Très inconfortable", "Inconfortable", "Correcte", "Plutôt confortable", "Très confortable"];
const drName = (n?: string | null) => (!n ? "Votre médecin" : /^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const fmt = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  d ? new Date(d).toLocaleDateString("fr-FR", opts) : "";
const dayFmt = (day: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", opts);

function stateOfScan(s: ScanLite) {
  return resultStateOf(s.recommendations?._fullResult ?? { score: s.score, condition: s.condition });
}
const usableScore = (s: ScanLite) => (stateOfScan(s) !== "unusable" && typeof s.score === "number" ? s.score : null);

function toResult(s: ScanLite): AnalysisResult {
  const full = s.recommendations?._fullResult;
  if (full) return full as AnalysisResult;
  // Ancien scan sans résultat complet : aucune mesure inventée.
  return {
    condition: s.condition || "Analyse", severity: "", score: s.score as number, skinType: "",
    details: s.analysis || "", motivation: s.motivation || "",
    stats: { lesions: "–", zones: "–", pores: "–", marks: "–" },
    balance: undefined as unknown as AnalysisResult["balance"],
    recommendations: { products: [], morning: [], evening: [], weekly: "" },
  };
}

/** Courbe du ressenti (aire) + points du Glow Score, sur la période choisie. */
function Chart({ j }: { j: Journal }) {
  const W = 320, H = 130, PX = 10, PY = 12;
  const t0 = new Date(`${j.from}T12:00:00`).getTime(), t1 = new Date(`${j.today}T12:00:00`).getTime();
  const x = (day: string) => PX + ((new Date(`${day}T12:00:00`).getTime() - t0) / Math.max(1, t1 - t0)) * (W - 2 * PX);
  const yC = (c: number) => PY + (1 - (c - 1) / 4) * (H - 2 * PY);
  const yS = (s: number) => PY + (1 - s / 100) * (H - 2 * PY);
  const pts = j.entries.map((e) => [x(e.day), yC(e.comfort)] as const);
  const line = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - PY} L${pts[0][0].toFixed(1)},${H - PY} Z` : "";
  const mid = new Date((t0 + t1) / 2).toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[140px] w-full" role="img" aria-label="Courbe de votre ressenti">
        {[1, 3, 5].map((c) => <line key={c} x1={PX} x2={W - PX} y1={yC(c)} y2={yC(c)} stroke={G.line} strokeWidth="1" />)}
        {area && <path d={area} fill={G.sage} />}
        {pts.length > 1 && <path d={line} fill="none" stroke={G.dark} strokeWidth="2" strokeLinejoin="round" />}
        {pts.map(([a, b], i) => <circle key={i} cx={a} cy={b} r="3.2" fill={G.dark} />)}
        {j.scores.map((s, i) => <rect key={i} x={x(s.day) - 3.5} y={yS(s.score) - 3.5} width="7" height="7" rx="1.5" fill="#d9a441" stroke="#fff" strokeWidth="1" />)}
      </svg>
      <div className="flex justify-between text-[11px]" style={{ color: G.muted }}>
        <span>{dayFmt(j.from)}</span><span>{dayFmt(mid)}</span><span>{dayFmt(j.today)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]" style={{ color: G.muted }}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-pill" style={{ background: G.dark }} />Ressenti (1 à 5)</span>
        {j.scores.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: "#d9a441" }} />Glow Score (0 à 100)</span>}
      </div>
    </div>
  );
}

/** Feuille « Bilan du jour » : note de 1 à 5 + une phrase facultative. */
function BilanSheet({ current, onClose }: { current: Entry | null; onClose: () => void }) {
  const { toast } = useToast();
  const [comfort, setComfort] = useState<number>(current?.comfort ?? 0);
  const [note, setNote] = useState(current?.note ?? "");
  const save = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/journal", { comfort, note })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/journal") }); toast({ title: "Bilan du jour enregistré" }); onClose(); },
    onError: () => toast({ title: "Bilan non enregistré", description: "Vérifiez votre connexion, puis réessayez.", variant: "destructive" }),
  });
  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Bilan du jour">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 border-0" style={{ background: "rgba(13,38,32,.5)" }} />
      <div className="b2c-theme relative flex w-full max-w-[480px] flex-col gap-4 rounded-t-[22px] bg-white p-5 pb-8">
        <div className="flex items-center justify-between">
          <b className="font-heading text-[20px]">Votre bilan du jour</b>
          <button type="button" onClick={onClose} aria-label="Fermer" className="border-0 bg-transparent p-1" style={{ color: G.text }}><X size={21} strokeWidth={1.75} /></button>
        </div>
        <span className="text-[14px]" style={{ color: G.muted }}>Comment se sent votre peau aujourd'hui ?</span>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setComfort(n)} aria-pressed={comfort === n} aria-label={`${n} sur 5 · ${COMFORT[n]}`}
              className="flex h-12 items-center justify-center rounded-[12px] border text-[17px] font-semibold"
              style={{ borderColor: comfort === n ? G.dark : G.line, background: comfort === n ? G.dark : "#fff", color: comfort === n ? "#fff" : G.text }}>
              {n}
            </button>
          ))}
        </div>
        <span className="-mt-2 text-center text-[13px] font-semibold" style={{ color: G.dark }}>{comfort ? COMFORT[comfort] : "1 = très inconfortable · 5 = très confortable"}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={3} placeholder="Une phrase sur votre peau (facultatif) : tiraillements, boutons, nouveau produit…"
          className="w-full resize-none rounded-[12px] border p-3 text-[15px] outline-none" style={{ borderColor: G.line, background: G.soft, color: G.text }} />
        <button type="button" disabled={!comfort || save.isPending} onClick={() => save.mutate()}
          className="rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white disabled:opacity-45" style={{ background: G.dark }}>
          {save.isPending ? "Enregistrement…" : "Enregistrer mon bilan"}
        </button>
        <span className="text-center text-[12px]" style={{ color: G.muted }}>Votre ressenti ne remplace pas un avis médical.</span>
      </div>
    </div>
  );
}

export default function MaPeau() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: scansRaw } = useScans();
  const { data: consultData } = useQuery<{ consultations: ConsultationLite[] }>({ queryKey: ["/api/consultations/mine"], enabled: !!user });
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data: j, isError: jErr, refetch } = useQuery<Journal>({ queryKey: [`/api/journal?days=${days}`], enabled: !!user, retry: 1 });
  const [open, setOpen] = useState<ScanLite | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => { ensureDermFonts(); }, []);
  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);

  const scans = useMemo<ScanLite[]>(
    () => (Array.isArray(scansRaw) ? [...(scansRaw as ScanLite[])] : [])
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [scansRaw],
  );

  // ?scan=<id> (Accueil, message WhatsApp) ouvre directement l'analyse.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || scans.length === 0) return;
    const id = Number(new URLSearchParams(window.location.search).get("scan"));
    const found = scans.find((s) => s.id === id);
    if (found) { deepLinked.current = true; setOpen(found); }
  }, [scans]);

  // Avant / après : première et dernière analyse du visage avec photo et score.
  const faces = scans.filter((s) => s.area === "face" && s.imageUrl && usableScore(s) !== null);
  const before = faces.length >= 2 ? faces[faces.length - 1] : null;
  const after = faces.length >= 2 ? faces[0] : null;
  const reports = (consultData?.consultations ?? []).filter((c) => c.status === "answered" || c.status === "closed");

  if (open) {
    return (
      <div data-clarity-mask="true" className="b2c-theme min-h-screen bg-organic-bg">
        <div className="mx-auto max-w-[480px] px-5 pb-6 pt-4">
          <ResultB2C
            result={toResult(open)}
            area={open.area || "face"}
            imageUrl={open.imageUrl || null}
            createdAt={open.createdAt}
            scanId={open.id}
            onBack={() => { setOpen(null); if (window.location.search) window.history.replaceState(null, "", "/ma-peau"); }}
          />
        </div>
      </div>
    );
  }

  const today = j?.today;
  const todayEntry = j?.last && j.last.day === today ? j.last : null;
  const card = "flex flex-col rounded-[16px] border bg-white p-4";
  const seg = (on: boolean) => cn("flex-1 rounded-[9px] border-0 py-2 text-[13.5px] font-semibold", on ? "text-white" : "bg-transparent");
  const circleBg = (s: ScanLite) => {
    const st = stateOfScan(s);
    return st === "good" ? G.sage : st === "unusable" ? G.soft : "#f7e8dc";
  };

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/"))} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
            <ArrowLeft size={20} strokeWidth={1.9} />
          </button>
          <span className="flex-1 text-[16px] font-semibold">Mon évolution</span>
          <button type="button" onClick={() => setLocation("/premium")} className="rounded-pill border-0 px-3 py-1 text-[12px] font-bold uppercase tracking-[.06em] text-white" style={{ background: G.dark }}>Plus</button>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] leading-[1.12]">Les petits progrès<br />comptent.</h1>
          {j && <span className="text-[13px]" style={{ color: G.muted }}>Votre journal du {dayFmt(j.from)} au {dayFmt(j.today)}</span>}
        </div>

        <div className="flex gap-1 rounded-[12px] p-1" style={{ background: G.sage }}>
          {([7, 30, 90] as const).map((d) => (
            <button key={d} type="button" className={seg(days === d)} style={{ background: days === d ? G.dark : "transparent", color: days === d ? "#fff" : G.dark }} onClick={() => setDays(d)}>{d} jours</button>
          ))}
        </div>

        {/* Ressenti */}
        <div className={card} style={{ borderColor: G.line, gap: 10 }}>
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[15px] font-semibold">Votre ressenti</b>
            {todayEntry && <span className="rounded-pill px-2.5 py-[3px] text-[12px] font-semibold" style={{ background: G.sage, color: G.dark }}>{todayEntry.comfort} / 5 aujourd'hui</span>}
          </div>
          <span className="-mt-1 text-[12.5px]" style={{ color: G.muted }}>Confort de peau, auto-évaluation</span>
          {jErr ? (
            <div className="flex flex-col items-start gap-2 text-[14px]" style={{ color: G.muted }}>
              Votre journal n'a pas pu être chargé. Vérifiez votre connexion.
              <button type="button" onClick={() => refetch()} className="rounded-[10px] border-0 px-4 py-2 text-[14px] font-semibold text-white" style={{ background: G.dark }}>Réessayer</button>
            </div>
          ) : !j ? (
            <span className="text-[13px]" style={{ color: G.muted }}>Chargement de votre journal…</span>
          ) : j.entries.length === 0 && j.scores.length === 0 ? (
            <div className="rounded-[12px] p-3 text-[14px] leading-relaxed" style={{ background: G.soft, color: G.muted }}>
              Pour l'instant, aucun bilan sur ces {j.days} jours. Ajoutez le premier : 10 secondes suffisent, et votre courbe se dessine jour après jour.
            </div>
          ) : (
            <Chart j={j} />
          )}
        </div>

        {j && (
          <div className="grid grid-cols-2 gap-3">
            <div className={card} style={{ borderColor: G.line }}>
              <b className="font-heading text-[24px] font-bold">{j.routineDays} / 7</b>
              <span className="text-[12.5px]" style={{ color: G.muted }}>jours de routine cette semaine</span>
            </div>
            <div className={card} style={{ borderColor: G.line }}>
              <b className="font-heading text-[24px] font-bold">{j.total}</b>
              <span className="text-[12.5px]" style={{ color: G.muted }}>bilan{j.total > 1 ? "s" : ""} enregistré{j.total > 1 ? "s" : ""}</span>
            </div>
          </div>
        )}

        {j?.last && (
          <div className={card} style={{ borderColor: G.line, gap: 8 }}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px]" style={{ background: G.sage, color: G.dark }}><ScanFace size={20} strokeWidth={1.7} /></span>
              <span className="flex flex-col">
                <b className="text-[14.5px] font-semibold">
                  {j.last.day === today ? "Aujourd'hui" : dayFmt(j.last.day, { weekday: "long", day: "numeric", month: "long" })}
                  {j.last.updatedAt && j.last.day === today ? ` · ${new Date(j.last.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </b>
                <span className="text-[13px]" style={{ color: G.muted }}>Peau {COMFORT[j.last.comfort].toLowerCase()} · {j.last.comfort} / 5</span>
              </span>
            </div>
            {j.last.note && <p className="m-0 text-[14px] leading-relaxed">« {j.last.note} »</p>}
            <span className="text-[12px]" style={{ color: G.muted }}>Votre ressenti ne remplace pas un avis médical.</span>
          </div>
        )}

        <button type="button" onClick={() => setSheet(true)} data-testid="bilan-open"
          className="inline-flex items-center justify-center gap-2 rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white" style={{ background: G.dark }}>
          {todayEntry ? "Modifier mon bilan du jour" : "Ajouter mon bilan du jour"} <ArrowRight size={17} />
        </button>

        {before && after && (
          <div className={card} style={{ borderColor: G.line, gap: 10 }}>
            <div className="flex items-baseline justify-between">
              <b className="text-[15px] font-semibold">Avant / après</b>
              <span className="text-[11.5px]" style={{ color: G.muted }}>première et dernière analyse du visage</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[before, after].map((s) => (
                <button key={s.id} type="button" onClick={() => setOpen(s)} className="flex flex-col gap-1 border-0 bg-transparent p-0" style={{ color: G.text }}>
                  <div className="h-[120px] w-full rounded-[12px] bg-cover bg-center" style={{ backgroundColor: G.sage, backgroundImage: `url(${s.imageUrl})` }} />
                  <span className="text-center text-[12px]">{fmt(s.createdAt)} · Glow Score {usableScore(s)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {reports.length > 0 && (
          <div className="flex flex-col gap-2">
            <b className="text-[15px] font-semibold">Comptes rendus de vos médecins</b>
            {reports.map((c) => (
              <a key={c.id} href={`/api/consultations/${c.id}/report/download`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[14px] border bg-white px-3.5 py-3 no-underline" style={{ borderColor: G.line, color: G.text }}>
                <span className="flex flex-1 flex-col">
                  <span className="text-[14.5px] font-semibold">{drName(c.doctorName)}</span>
                  <span className="text-[12.5px]" style={{ color: G.muted }}>{[fmt(c.createdAt), c.condition].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: G.sage, color: G.dark }}>PDF</span>
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <b className="text-[15px] font-semibold">Mes analyses</b>
          {scans.length === 0 && (
            <div className="flex flex-col items-start gap-2 rounded-[14px] border bg-white p-4 text-[14px]" style={{ borderColor: G.line, color: G.muted }}>
              Pour l'instant, aucune analyse. La première vous donne votre Glow Score de départ.
              <button type="button" onClick={() => setLocation("/analyze")} className="border-0 bg-transparent p-0 text-[14px] font-semibold" style={{ color: G.dark }}>Analyser ma peau →</button>
            </div>
          )}
          {scans.map((s) => (
            <button key={s.id} type="button" onClick={() => setOpen(s)}
              className="flex items-center gap-3 rounded-[14px] border bg-white py-2.5 pl-2.5 pr-3.5 text-left" style={{ borderColor: G.line, color: G.text }}>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] font-heading text-[15px] font-bold" style={{ background: circleBg(s) }}>
                {usableScore(s) ?? "–"}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[14.5px] font-semibold">{AREA_LABEL[s.area] || "Analyse"}</span>
                <span className="text-[12.5px]" style={{ color: G.muted }}>{fmt(s.createdAt, { day: "numeric", month: "long" })}</span>
              </span>
              <ArrowRight size={16} style={{ color: G.dark }} />
            </button>
          ))}
        </div>
      </main>
      {sheet && <BilanSheet current={todayEntry} onClose={() => setSheet(false)} />}
    </div>
  );
}
