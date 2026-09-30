import { useState } from "react";
import { RELAY_LEVELS, AUTONOMY_MIN_AGREEMENT } from "@shared/relay";
import { formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Tableau de bord d'un programme (maquette « Derm Pilotage », vue ONG).
// Affiché au gestionnaire ONG (/derm/pilotage) et à GlowScan dans /admin.
// Données anonymisées : un effectif null signifie « moins de 5 » (masqué).
// ════════════════════════════════════════════════════════════════════════

export type ProgramDashboard = {
  program: { id: number; name: string; funder: string | null; district: string | null; status: string };
  kpis: { validated: number; delayHours: number | null; agentsAutonomous: number; agentsTotal: number; urgent: number | null };
  districts: { name: string; cases: number | null; delayHours: number | null; top: string | null }[];
  diseases: { name: string; n: number | null }[];
  agreement: { month: string; n: number; pct: number | null }[];
  agents: { shared: boolean; name: string | null; city: string | null; level: number | null; accuracy: number | null; cases: number | null }[];
  budget: { total: number; used: number };
  alerts: { disease: string; pct: number; district: string | null }[];
  lessons?: { relayDx: string; dermDx: string; note: string }[];
};

export const RANGES = [
  { key: "1m", label: "1 mois" },
  { key: "3m", label: "3 mois" },
  { key: "all", label: "Depuis le début" },
] as const;

export const masked = (n: number | null | undefined) => (n == null ? "< 5" : String(n));
const monthShort = (k: string) => {
  const s = new Date(`${k}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Courbe mensuelle de l'accord relais ↔ dermatologue, seuil de 85 % en pointillé. */
function AgreementChart({ points }: { points: ProgramDashboard["agreement"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = points.filter((p) => p.pct != null);
  if (data.length === 0) return <span className="text-[14px] text-organic-neutral-700">Pas encore de cas validés.</span>;
  const W = 560, H = 200, L = 36, R = 12, T = 12, B = 28;
  const x = (i: number) => L + (data.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const path = data.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.pct as number)}`).join(" ");
  const thr = Math.round(AUTONOMY_MIN_AGREEMENT * 100);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Accord mensuel entre relais et dermatologue">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--color-divider)" strokeWidth={1} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-neutral-700)">{v} %</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(thr)} y2={y(thr)} stroke="var(--color-accent-2-700)" strokeWidth={1.5} strokeDasharray="5 5" />
        <text x={W - R} y={y(thr) - 6} textAnchor="end" fontSize={11} fill="var(--color-accent-2-800)">seuil {thr} %</text>
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((p, i) => (
          <g key={p.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={x(i)} cy={y(p.pct as number)} r={14} fill="transparent" />
            <circle cx={x(i)} cy={y(p.pct as number)} r={4.5} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-neutral-700)">{monthShort(p.month)}</text>
          </g>
        ))}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute rounded-xl bg-organic-text px-2.5 py-1.5 text-[12px] text-organic-bg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].pct as number) / H) * 100}%`, transform: "translate(-50%, -130%)" }}>
          {monthShort(data[hover].month)} : {data[hover].pct} % d'accord · {masked(data[hover].n >= 5 ? data[hover].n : null)} cas
        </div>
      )}
    </div>
  );
}

export function PilotageView({ d, range, onRange }: { d: ProgramDashboard; range: string; onRange: (r: string) => void }) {
  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
  const dMax = Math.max(1, ...d.diseases.map((x) => x.n ?? 0));
  const budgetPct = d.budget.total ? Math.min(100, Math.round((d.budget.used / d.budget.total) * 100)) : 0;
  const kpis = [
    { label: "Cas validés", value: String(d.kpis.validated), note: "par un dermatologue", bg: "bg-organic-surface", ink: "text-organic-neutral-700" },
    { label: "Délai moyen", value: d.kpis.delayHours == null ? "—" : `${d.kpis.delayHours} h`, note: "objectif : moins de 24 h", bg: "bg-organic-surface", ink: "text-organic-neutral-700" },
    { label: "Agents autonomes", value: `${d.kpis.agentsAutonomous} / ${d.kpis.agentsTotal}`, note: "sur au moins une affection", bg: "bg-organic-accent-2-100", ink: "text-organic-accent-2-800" },
    { label: "Orientés en urgence", value: masked(d.kpis.urgent), note: "sur avis du dermatologue", bg: "bg-organic-accent-100", ink: "text-organic-accent-800" },
  ];

  return (
    <div className="flex flex-col gap-organic-6">
      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">
            {[d.program.funder, d.program.district].filter(Boolean).join(" · ") || "Programme"}
          </span>
          <h1 className="m-0 text-[clamp(28px,4vw,42px)]">{d.program.name}</h1>
        </div>
        <div className="flex gap-1 rounded-pill bg-organic-surface p-1" role="radiogroup" aria-label="Période">
          {RANGES.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={range === r.key} onClick={() => onRange(r.key)}
              className={`cursor-pointer rounded-pill border-0 px-4 py-2 font-body text-[13px] font-bold ${range === r.key ? "bg-organic-accent text-organic-bg" : "bg-transparent text-organic-text"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <span className="self-start rounded-pill bg-organic-neutral-200 px-4 py-2 text-[12px] font-semibold">
        Données anonymisées : aucun nom, téléphone ni photo de patient. Effectifs inférieurs à 5 masqués.
      </span>
      <span className="text-[12px] text-organic-neutral-700 md:hidden">Plus confortable sur ordinateur.</span>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-organic-3">
        {kpis.map((k) => (
          <div key={k.label} className={`flex flex-col gap-1.5 rounded-card p-organic-4 ${k.bg}`}>
            <span className={`text-[12px] font-bold ${k.ink}`}>{k.label}</span>
            <span className="font-heading text-[36px] leading-none">{k.value}</span>
            <span className="text-[12px] text-organic-neutral-700">{k.note}</span>
          </div>
        ))}
      </section>

      {d.alerts.map((a) => (
        <div key={a.disease} className="flex flex-col gap-1 rounded-card bg-organic-accent-100 p-organic-4 text-organic-accent-900">
          <span className="text-[11px] font-bold uppercase tracking-[.1em]">Hausse inhabituelle</span>
          <span className="text-[15px] font-bold">{a.disease} : +{a.pct} % en 3 semaines{a.district ? ` (surtout ${a.district})` : ""}</span>
          <span className="text-[12px]">Calculé sur les cas validés du programme. À signaler au district si nécessaire.</span>
        </div>
      ))}

      <div className={card}>
        <h3 className="m-0 text-[22px]">Accord avec le dermatologue, par mois</h3>
        <AgreementChart points={d.agreement} />
      </div>

      <section className="grid items-start gap-organic-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className="m-0 text-[22px]">Par district</h3>
          <div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_1.2fr] gap-2 text-[12px] font-bold text-organic-neutral-700">
            <span>District</span><span>Cas</span><span>Délai</span><span>1re cause</span>
          </div>
          {d.districts.length === 0 && <span className="text-[14px] text-organic-neutral-700">Pas encore de cas validés.</span>}
          {d.districts.map((x) => (
            <div key={x.name} className="grid grid-cols-[1.4fr_0.6fr_0.6fr_1.2fr] gap-2 text-[14px]">
              <span className="truncate font-semibold">{x.name}</span><span>{masked(x.cases)}</span>
              <span>{x.delayHours == null ? "—" : `${x.delayHours} h`}</span><span className="truncate">{x.top || "—"}</span>
            </div>
          ))}
        </div>
        <div className={card}>
          <h3 className="m-0 text-[22px]">Maladies du programme</h3>
          {d.diseases.length === 0 && <span className="text-[14px] text-organic-neutral-700">Pas encore de cas validés.</span>}
          {d.diseases.map((x) => (
            <div key={x.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[14px]"><span className="font-semibold">{x.name}</span><span className="font-bold">{masked(x.n)}</span></div>
              <div className="h-2 overflow-hidden rounded-pill bg-organic-bg"><div className="h-full rounded-pill bg-organic-accent" style={{ width: `${x.n == null ? 3 : (x.n / dMax) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-start gap-organic-4 lg:grid-cols-2">
        <div className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-[22px]">Agents du programme</h3>
            <span className="text-[12px] text-organic-neutral-700">avec leur accord</span>
          </div>
          {d.agents.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun agent rattaché.</span>}
          {d.agents.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-pill bg-organic-bg py-2 pl-2 pr-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[12px] font-bold text-organic-accent-2-800">
                {a.shared && a.name ? a.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : "—"}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-bold">{a.shared ? a.name : `Agent${a.city ? ` de ${a.city}` : ""}`}</span>
                <span className="truncate text-[12px] text-organic-neutral-700">{a.shared ? a.city || "" : "a refusé le partage"}</span>
              </span>
              <span className={`flex-none rounded-pill px-2.5 py-1 text-[12px] font-semibold ${!a.shared ? "border border-organic-divider" : a.level != null && a.level >= 2 ? "bg-organic-accent-2-200 text-organic-accent-2-900" : "bg-organic-neutral-200"}`}>
                {!a.shared ? "Progression privée" : `Niv. ${(a.level ?? 0) + 1} · ${a.level != null && a.level >= 2 ? RELAY_LEVELS[a.level].name.toLowerCase() : a.accuracy != null ? `accord ${a.accuracy} %` : RELAY_LEVELS[a.level ?? 0].name.toLowerCase()}`}
              </span>
            </div>
          ))}
          <span className="text-[12px] text-organic-neutral-700">Ces indicateurs servent à la formation, pas à l'évaluation disciplinaire.</span>
        </div>
        <div className={card}>
          <h3 className="m-0 text-[22px]">Budget</h3>
          {d.budget.total > 0 ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2"><span className="font-heading text-[28px]">{formatF(d.budget.used)}</span><b className="text-[14px]">consommés sur {formatF(d.budget.total)}</b></div>
              <div className="h-2.5 overflow-hidden rounded-pill bg-organic-bg"><div className="h-full rounded-pill bg-organic-accent-2-600" style={{ width: `${budgetPct}%` }} /></div>
              <span className="text-[13px] text-organic-neutral-800">Reste {formatF(Math.max(0, d.budget.total - d.budget.used))}.</span>
            </>
          ) : <span className="text-[14px] text-organic-neutral-700">Budget pas encore renseigné par GlowScan.</span>}
        </div>
      </section>
    </div>
  );
}
