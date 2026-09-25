import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { FACE_ZONES, RESULT_DISCLAIMER, SCORE_GOOD, SCORE_WATCH, type FaceZoneKey } from "@shared/resultB2C";
import { WAIT_TIPS, ZONE_COLOR, ZONE_UNSEEN, buildResultView, subtitleOf } from "@/lib/resultView";
import { downloadResultPdf, resultPdfBase64 } from "@/lib/resultPdf";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Résultat patient (refonte Organic) — maquette « GlowScan App » › Résultat.
// Le calcul (état, zones, indicateurs, produits) vit dans lib/resultView,
// partagé avec le compte rendu PDF. Sous 60 et en urgent : aucun produit.
// ════════════════════════════════════════════════════════════════════════

const TAG_CLS = {
  accent: "bg-organic-accent-100 text-organic-accent-800",
  "accent-2": "bg-organic-accent-2-100 text-organic-accent-2-800",
  neutral: "bg-organic-neutral-100 text-organic-neutral-800",
};

export type ResultB2CProps = {
  result: AnalysisResult;
  area?: string;
  imageUrl?: string | null;
  createdAt?: string | Date | null;
  photoCount?: number;
  scanId?: number | null;
  /** Envoi automatique du compte rendu : à passer UNIQUEMENT si le patient a coché le consentement. */
  autoEmailTo?: string | null;
  onBack?: () => void;
  onRetake?: () => void;
};

export function ResultB2C({ result, area = "face", imageUrl, createdAt, photoCount, scanId, autoEmailTo, onBack, onRetake }: ResultB2CProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const v = useMemo(() => buildResultView(result, area), [result, area]);
  const { copy, usable, score, zones } = v;

  const [selZone, setSelZone] = useState<FaceZoneKey | null>(null);
  const zoneKey = selZone ?? v.worstZone;
  const zoneInfo = zones?.[zoneKey] ?? null;
  const zoneLabel = FACE_ZONES.find((z) => z.key === zoneKey)!.label;

  const pdfInput = { result, area, imageUrl, createdAt, photoCount, scanId };
  const [pdfBusy, setPdfBusy] = useState(false);
  const onPdf = async () => {
    setPdfBusy(true);
    try { await downloadResultPdf(pdfInput); }
    catch { toast({ title: "Téléchargement impossible", description: "Le compte rendu n'a pas pu être généré. Réessayez.", variant: "destructive" }); }
    finally { setPdfBusy(false); }
  };

  // Envoi automatique, une seule fois, jamais pour une photo inexploitable.
  // Le serveur revérifie : scan de cette session, consentement, un envoi par scan.
  const emailed = useRef(false);
  useEffect(() => {
    const email = (autoEmailTo || "").trim();
    if (emailed.current || !email.includes("@") || !scanId || !usable) return;
    emailed.current = true;
    const t = setTimeout(async () => {
      let pdfBase64 = "";
      try { pdfBase64 = await resultPdfBase64(pdfInput); } catch { /* l'email part quand même, sans pièce jointe */ }
      try {
        const res = await fetch("/api/scans/email-report", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ scanId, email, consent: true, pdfBase64: pdfBase64 || undefined }),
        });
        const d = await res.json().catch(() => ({}));
        if (d?.sent) toast({ title: "Compte rendu envoyé", description: `Il est dans votre boîte mail (${email}).` });
      } catch { /* silencieux : le bouton PDF reste disponible */ }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEmailTo, scanId, usable]);

  const go = (to: string | "retake") => {
    if (to === "retake") return onRetake ? onRetake() : setLocation("/analyze");
    setLocation(to);
  };

  return (
    <div className="flex flex-col gap-4 font-body text-organic-text">
      {/* En-tête */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Retour" className="border-0 bg-transparent p-0 pr-1 text-organic-accent-700">
            <ArrowLeft size={21} strokeWidth={1.75} />
          </button>
        )}
        <span className="flex flex-1 flex-col">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-neutral-700">Rapport d'analyse</span>
          <span className="text-[13px] font-bold">{subtitleOf(area, createdAt, photoCount)}</span>
        </span>
        {usable && (
          <button
            type="button"
            onClick={onPdf}
            disabled={pdfBusy}
            className="whitespace-nowrap rounded-pill border-0 bg-transparent px-3 py-2 text-[14px] font-bold text-organic-accent hover:bg-organic-accent/10 disabled:opacity-45"
          >
            {pdfBusy ? "PDF…" : "PDF"}
          </button>
        )}
      </div>

      {/* Photo + zones */}
      <div
        className="relative h-[230px] flex-none overflow-hidden rounded-lg bg-cover bg-center"
        style={{ backgroundColor: usable ? "#7a5234" : "#2a1c12", backgroundImage: usable && imageUrl ? `url(${imageUrl})` : undefined }}
      >
        {usable && zones && (
          <>
            {FACE_ZONES.map((z, i) => {
              const zi = zones[z.key];
              const on = z.key === zoneKey;
              return (
                <button
                  key={z.key}
                  type="button"
                  title={z.label}
                  aria-label={`${i + 1}. ${z.label}`}
                  onClick={() => setSelZone(z.key)}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-organic-neutral-100 p-0 text-[11px] font-bold text-organic-neutral-100"
                  style={{ left: z.x, top: z.y, width: on ? 30 : 24, height: on ? 30 : 24, background: zi ? ZONE_COLOR[zi.status] : ZONE_UNSEEN }}
                >
                  {i + 1}
                </button>
              );
            })}
            <span
              className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-pill px-3 py-2 text-[12px] text-organic-neutral-100"
              style={{ background: "color-mix(in srgb, var(--color-neutral-900) 78%, transparent)" }}
            >
              <span className="h-2.5 w-2.5 flex-none rounded-pill" style={{ background: zoneInfo ? ZONE_COLOR[zoneInfo.status] : ZONE_UNSEEN }} />
              <b className="whitespace-nowrap">{zoneLabel}</b>
              <span className="min-w-0 flex-1 truncate">
                {zoneInfo ? zoneInfo.note || "Rien de particulier" : "Zone non visible sur les photos"}
              </span>
            </span>
          </>
        )}
        {!usable && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-5 text-center text-organic-neutral-100">
            <b className="text-[16px]">Photo trop sombre ou floue</b>
            <span className="text-[12px]">Le visage n'est pas lisible : l'analyse serait fausse.</span>
          </span>
        )}
      </div>

      {usable && (
        <>
          {/* Score */}
          <div className="flex items-center gap-4">
            <span
              className="flex h-[88px] w-[88px] flex-none items-center justify-center rounded-pill"
              style={{ background: `conic-gradient(${copy.ring} ${score * 3.6}deg, var(--color-neutral-200) 0)` }}
            >
              <span className="flex h-[70px] w-[70px] flex-col items-center justify-center rounded-pill bg-organic-bg">
                <span className="font-heading text-[28px] leading-none">{score}</span>
                <span className="text-[10px] text-organic-neutral-700">Glow Score</span>
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn("self-start whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11px] tracking-[.02em]", TAG_CLS[copy.tag])}>{copy.level}</span>
              {v.title && <span className="font-heading text-[22px] leading-[1.15]">{v.title}</span>}
              {v.deltaLabel && <span className="text-[12px] font-bold text-organic-neutral-800">{v.deltaLabel}</span>}
            </span>
          </div>

          {/* Échelle à seuils */}
          <div className="flex flex-col gap-1.5">
            <div
              className="relative h-2.5 rounded-pill"
              style={{
                background: `linear-gradient(90deg, var(--color-accent-700) 0 40%, var(--color-accent-300) 40% ${SCORE_WATCH}%, var(--color-accent-2-300) ${SCORE_WATCH}% ${SCORE_GOOD}%, var(--color-accent-2-600) ${SCORE_GOOD}% 100%)`,
              }}
            >
              <span className="absolute -top-[5px] h-5 w-1 -translate-x-1/2 rounded-pill bg-organic-neutral-900" style={{ left: `${score}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-organic-neutral-700">
              <span>Urgent</span><span>Médecin</span><span>À surveiller</span><span>Bonne santé</span>
            </div>
          </div>
        </>
      )}

      {/* Verdict */}
      <div className="flex flex-col gap-2.5 rounded-lg p-4" style={{ background: copy.vBg, color: copy.vFg }}>
        <span className="text-[16px] font-bold">{copy.vTitle}</span>
        <span className="text-[13px] leading-normal">{copy.vText}</span>
        {v.flags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {v.flags.map((t) => (
              <span key={t} className="flex gap-2 text-[13px] font-semibold">
                <span className="mt-1.5 h-2 w-2 flex-none rounded-pill bg-current" />{t}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => go(copy.cta.to)}
          className="inline-flex items-center justify-center rounded-pill border-0 px-[18px] py-[13px] text-[14px] font-bold"
          style={{ background: copy.cta.bg, color: copy.cta.fg }}
        >
          {copy.cta.label}
        </button>
        {copy.cta2 && (
          <button
            type="button"
            onClick={() => go(copy.cta2!.to)}
            className="inline-flex items-center justify-center rounded-pill border-0 bg-transparent px-1 py-2 text-[14px] font-bold text-inherit hover:bg-organic-accent/10"
          >
            {copy.cta2.label}
          </button>
        )}
      </div>

      {/* Observations */}
      {v.showObservations && v.observations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Ce que l'analyse a observé</span>
          {v.observations.map((o) => (
            <div key={o.n} className="flex items-center gap-2.5 rounded-pill bg-organic-surface px-3.5 py-2.5 text-[13px]">
              <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-pill text-[11px] font-bold text-organic-neutral-100" style={{ background: o.c }}>{o.n}</span>
              {o.text}
            </div>
          ))}
        </div>
      )}

      {/* Mesures */}
      {usable && v.tiles.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${v.tiles.length}, minmax(0, 1fr))` }}>
          {v.tiles.map(([k, val]) => (
            <div key={k} className="flex flex-col gap-0.5 rounded-[20px] bg-organic-surface p-3">
              <span className="text-[11px] text-organic-neutral-700">{k}</span>
              <span className="text-[15px] font-bold leading-tight">{val}</span>
            </div>
          ))}
        </div>
      )}
      {v.bars.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-lg bg-organic-surface p-4">
          {v.bars.map((b) => (
            <div key={b.name} className="flex flex-col gap-1">
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold">{b.name}</span>
                <span className="font-bold">{b.word}</span>
              </div>
              <div className="h-2 rounded-pill bg-organic-neutral-200">
                <div className="h-full rounded-pill" style={{ width: `${b.v}%`, background: b.c }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routine conseillée : jamais sous 60 ni en urgent (vide dans ces états) */}
      {v.products.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Votre routine conseillée</span>
          {v.products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg bg-organic-surface px-3 py-2.5">
              {p.image
                ? <img src={p.image} alt="" className="h-11 w-11 flex-none rounded-[14px] object-cover" />
                : <span className="h-11 w-11 flex-none rounded-[14px] bg-organic-accent-200" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-bold">{p.name}</span>
                <span className="truncate text-[11px] text-organic-accent-2-800">{p.description}</span>
              </span>
              {p.price && <span className="whitespace-nowrap text-[12px] font-bold">{p.price}</span>}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLocation("/shop")}
            className="inline-flex items-center justify-center rounded-pill border border-organic-divider bg-transparent px-4 py-2 text-[14px] font-bold hover:bg-organic-text/[.07]"
          >
            Ajouter à ma routine
          </button>
        </div>
      )}

      {v.showWaitTips && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">En attendant le médecin</span>
          {WAIT_TIPS.map((t) => (
            <span key={t} className="flex gap-2.5 text-[13px] leading-[1.45]">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-pill bg-organic-accent-2-600" />{t}
            </span>
          ))}
        </div>
      )}

      <span className="text-[11px] leading-normal text-organic-neutral-700">{RESULT_DISCLAIMER}</span>
    </div>
  );
}
