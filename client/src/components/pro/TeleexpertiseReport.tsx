import type { Dispatch, ReactNode, SetStateAction } from "react";
import { PHOTO_QUALITY_LABEL, ORIENTATIONS, REVIEW_DELAYS, type PhotoQuality } from "@shared/teleexpertise";

// ════════════════════════════════════════════════════════════════════════
// Avis de télé-expertise, format 1b (maquette « Derm Compte Rendu ») : le
// demandeur comprend en 30 secondes. Réponse à la question d'abord, puis
// diagnostic retenu, à écarter, conduite à tenir, orientation et délai,
// leçon du cas et qualité des photos. Utilisé pour les relais et les confrères.
// ════════════════════════════════════════════════════════════════════════

export type TeleReport = {
  caseRef: string;
  from: string;                 // « De Dr A. Nkemdirim (ONMC 4 812) à Inf. Paul Mbarga, CSI de Mokolo »
  answeredIn?: string | null;   // « Répondu en 3 h »
  tags: string[];               // « M · 7 ans », « Cuir chevelu », « Anonymisé »
  question?: string | null;
  answer: string;
  requesterDx?: string | null;  // « Votre diagnostic »
  finalDx: string;              // « Diagnostic retenu »
  ddx?: string | null;
  plan?: string | null;         // une étape par ligne
  orientation?: string | null;
  reviewIn?: string | null;
  lesson?: string | null;
  photoQuality?: PhotoQuality | null;
  photosSharp?: number | null;
  photosTotal?: number | null;
  stat?: string | null;         // « Teigne : 12/20 cas justes · 60 % »
  corrected?: boolean;
};

export function TeleexpertiseReport({ r, actions }: { r: TeleReport; actions?: ReactNode }) {
  const steps = String(r.plan || "").split(/\n+/).map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
  const quality = r.photoQuality
    ? `Qualité des photos : ${PHOTO_QUALITY_LABEL[r.photoQuality]}${r.photosSharp != null && r.photosTotal ? ` (${r.photosSharp}/${r.photosTotal} nettes)` : ""}`
    : null;
  return (
    <div className="flex min-w-0 flex-col gap-organic-3 rounded-card bg-organic-bg p-organic-4" data-testid="tele-report">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Avis de télé-expertise</span>
        <span className="text-[13px] text-organic-neutral-800">{r.from}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {r.answeredIn && <span className="rounded-pill bg-organic-accent-2-100 px-2.5 py-0.5 text-[12px] font-semibold text-organic-accent-2-800">{r.answeredIn}</span>}
          <span className="rounded-pill bg-organic-surface px-2.5 py-0.5 text-[12px] font-semibold">Cas {r.caseRef}</span>
          {r.tags.filter(Boolean).map((t) => <span key={t} className="rounded-pill bg-organic-surface px-2.5 py-0.5 text-[12px]">{t}</span>)}
        </div>
      </div>
      {r.question && <span className="text-[13px] italic text-organic-neutral-800">« {r.question} »</span>}

      <div className="flex flex-col gap-1 rounded-card bg-organic-accent-100 p-organic-3">
        <span className="text-[11px] font-bold uppercase tracking-[.08em] text-organic-accent-800">Réponse à votre question</span>
        <span className="text-[15px] font-bold text-organic-accent-900">{r.answer}</span>
      </div>

      <div className="grid grid-cols-1 gap-organic-2 sm:grid-cols-2">
        {r.requesterDx && (
          <div className="flex flex-col"><span className="text-[11px] text-organic-neutral-700">Votre diagnostic</span>
            <span className={`text-[14px] font-semibold ${r.corrected ? "text-organic-neutral-700 line-through" : ""}`}>{r.requesterDx}</span></div>
        )}
        <div className="flex flex-col"><span className="text-[11px] text-organic-neutral-700">Diagnostic retenu</span>
          <span className="text-[14px] font-bold">{r.finalDx}</span></div>
      </div>
      {r.ddx && <span className="text-[13px]"><b>Diagnostics à écarter</b> : {r.ddx}</span>}

      {steps.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold">Conduite à tenir</span>
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-[13px] leading-normal">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
      {(r.orientation || r.reviewIn) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {r.orientation && <span><b>Orientation</b> : {r.orientation.charAt(0).toLowerCase() + r.orientation.slice(1)}</span>}
          {r.reviewIn && <span><b>Revoir</b> {/^pas/i.test(r.reviewIn) ? ": pas besoin" : `à ${r.reviewIn}`}</span>}
        </div>
      )}
      {r.lesson && (
        <div className="flex flex-col gap-1 rounded-card bg-organic-accent-2-100 p-organic-3 text-organic-accent-2-900">
          <span className="text-[11px] font-bold uppercase tracking-[.08em]">La leçon de ce cas</span>
          <span className="text-[13px] leading-normal">{r.lesson}</span>
        </div>
      )}
      {(quality || r.stat) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-organic-neutral-700">
          {quality && <span>{quality}</span>}
          {r.stat && <span>{r.stat}</span>}
        </div>
      )}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Champs 1b à saisir par le dermatologue (relais et confrères). */
export type TeleFields = { ddx: string; plan: string; orientation: string; reviewIn: string; photoQuality: PhotoQuality | null; photosSharp: number | null };
export const emptyTeleFields = (): TeleFields => ({ ddx: "", plan: "", orientation: "", reviewIn: "", photoQuality: null, photosSharp: null });

const chipCls = (on: boolean) => `cursor-pointer rounded-pill border px-3 py-1 font-body text-[12px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;
const inputCls = "box-border w-full rounded-2xl border border-organic-divider bg-organic-surface px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent";

export function TeleFieldsForm({ v, onChange, photosTotal, idPrefix }: { v: TeleFields; onChange: Dispatch<SetStateAction<TeleFields>>; photosTotal: number; idPrefix: string }) {
  const set = <K extends keyof TeleFields>(k: K, x: TeleFields[K]) => onChange((prev) => ({ ...prev, [k]: x }));
  return (
    <div className="flex flex-col gap-organic-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-organic-neutral-800">Diagnostics à écarter</span>
        <input value={v.ddx} onChange={(e) => set("ddx", e.target.value)} className={`${inputCls} h-11`} data-testid={`${idPrefix}-ddx`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-organic-neutral-800">Conduite à tenir</span>
        <span className="text-[12px] text-organic-neutral-700">Une étape par ligne.</span>
        <textarea value={v.plan} onChange={(e) => set("plan", e.target.value)} rows={3} className={`${inputCls} min-h-[80px] resize-y`} data-testid={`${idPrefix}-plan`} />
      </label>
      <span className="text-[12px] font-semibold text-organic-neutral-800">Orientation</span>
      <div className="flex flex-wrap gap-1.5">
        {ORIENTATIONS.map((o) => <button key={o} type="button" className={chipCls(v.orientation === o)} onClick={() => set("orientation", v.orientation === o ? "" : o)}>{o}</button>)}
      </div>
      <span className="text-[12px] font-semibold text-organic-neutral-800">Revoir</span>
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_DELAYS.map((o) => <button key={o} type="button" className={chipCls(v.reviewIn === o)} onClick={() => set("reviewIn", v.reviewIn === o ? "" : o)}>{o}</button>)}
      </div>
      <span className="text-[12px] font-semibold text-organic-neutral-800">Qualité des photos</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {(["bonne", "moyenne", "insuffisante"] as PhotoQuality[]).map((q) => (
          <button key={q} type="button" className={chipCls(v.photoQuality === q)} onClick={() => set("photoQuality", v.photoQuality === q ? null : q)}>{PHOTO_QUALITY_LABEL[q]}</button>
        ))}
        {photosTotal > 0 && (
          <label className="flex items-center gap-1.5 text-[12px] text-organic-neutral-800">
            nettes :
            <select value={v.photosSharp ?? ""} onChange={(e) => set("photosSharp", e.target.value === "" ? null : Number(e.target.value))}
              className="h-9 rounded-pill border border-organic-divider bg-organic-surface px-2 font-body text-[12px]">
              <option value="">—</option>
              {Array.from({ length: photosTotal + 1 }, (_, i) => <option key={i} value={i}>{i}/{photosTotal}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
