import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useProStats, useProAccount } from "@/hooks/use-pro";
import { ProLayout, LoadingScreen } from "@/components/ProLayout";
import { formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Performances (refonte Organic) — maquette « Derm Portal », écran
// Performances. Tous les chiffres viennent de /api/pro/stats (analyses et
// consultations réelles du cabinet). Rien n'est affiché s'il n'y a pas de
// donnée : pas de comparaison sans trimestre précédent.
// Réservé au médecin (la secrétaire est renvoyée vers ses patients).
// ════════════════════════════════════════════════════════════════════════

const RANGES = [
  { key: 3, label: "3 mois" },
  { key: 6, label: "6 mois" },
  { key: 12, label: "12 mois" },
] as const;

const PHOTOTYPE_COLORS: Record<string, string> = { IV: "#c8956c", V: "#8b5e3c", VI: "#3b1f0e" };

/** Les N derniers mois (AAAA-MM), du plus ancien au plus récent. */
function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
const monthLabel = (k: string) => {
  const s = new Date(`${k}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function ProStats() {
  const [, setLocation] = useLocation();
  const { data: accData } = useProAccount();
  const isSecretary = accData?.user?.role === "secretary";
  const { data, isLoading } = useProStats();
  const [range, setRange] = useState<3 | 6 | 12>(6);

  useEffect(() => { if (isSecretary) setLocation("/derm/patients"); }, [isSecretary, setLocation]);
  if (isSecretary || isLoading || !data) return <LoadingScreen />;

  const d: any = data;
  const byMonth: Record<string, number> = Object.fromEntries((d.monthly || []).map((m: any) => [m.month, m.count]));
  const months = lastMonths(range).map((k) => ({ key: k, label: monthLabel(k), count: byMonth[k] || 0 }));
  const mMax = Math.max(1, ...months.map((m) => m.count));
  const periodTotal = months.reduce((s, m) => s + m.count, 0);

  const conds: { name: string; count: number }[] = d.topConditions || [];
  const prods: { name: string; count: number }[] = d.topProducts || [];
  const photos: { name: string; count: number }[] = (d.phototypeDist || []).filter((p: any) => PHOTOTYPE_COLORS[p.name]);
  const phTot = photos.reduce((s, p) => s + p.count, 0);
  const phMax = Math.max(1, ...photos.map((p) => p.count));

  const q = d.onlineQuarter as { current: number; previous: number } | undefined;
  const qDelta = q && q.previous > 0 ? Math.round(((q.current - q.previous) / q.previous) * 100) : null;

  const kpis = [
    { label: "Patients", value: d.totalPatients ?? 0, bg: "bg-organic-surface", ink: "text-organic-neutral-700" },
    { label: "Analyses", value: d.totalScans ?? 0, bg: "bg-organic-surface", ink: "text-organic-neutral-700" },
    { label: "Glow Score moyen", value: d.avgGlowScore ? `${d.avgGlowScore}/100` : "—", bg: "bg-organic-accent-2-100", ink: "text-organic-accent-2-800" },
    { label: "Priorité haute", value: d.statusBreakdown?.priority ?? 0, bg: "bg-organic-accent-100", ink: "text-organic-accent-800" },
  ];
  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
  const bar = (w: number) => (
    <div className="h-2 overflow-hidden rounded-pill bg-organic-bg"><div className="h-full rounded-pill bg-organic-accent" style={{ width: `${w}%` }} /></div>
  );
  const empty = <span className="text-[14px] text-organic-neutral-700">Pas encore de données.</span>;

  return (
    <ProLayout>
      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">Votre cabinet en chiffres</span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Performances</h1>
        </div>
        <div className="flex gap-1 rounded-pill bg-organic-surface p-1" role="radiogroup" aria-label="Période">
          {RANGES.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={range === r.key} onClick={() => setRange(r.key)}
              className={`cursor-pointer rounded-pill border-0 px-4 py-2 font-body text-[13px] font-bold ${range === r.key ? "bg-organic-bg text-organic-accent-700" : "bg-transparent text-organic-text"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-organic-3">
        {kpis.map((k) => (
          <div key={k.label} className={`flex flex-col gap-1.5 rounded-card p-organic-4 ${k.bg}`} data-testid={`kpi-${k.label}`}>
            <span className={`text-[12px] font-bold ${k.ink}`}>{k.label}</span>
            <span className="font-heading text-[36px] leading-none">{k.value}</span>
          </div>
        ))}
      </section>

      <div className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="m-0 text-[22px]">Analyses par mois</h3>
          <span className="text-[13px] text-organic-neutral-700">{periodTotal} analyse{periodTotal > 1 ? "s" : ""} sur la période</span>
        </div>
        <div className="flex h-[190px] items-end gap-2 sm:gap-3">
          {months.map((m, i) => (
            <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[12px] font-bold">{m.count}</span>
              <div className="w-full max-w-[44px] rounded-t-2xl rounded-b-md"
                style={{ height: `${Math.max(4, Math.round((m.count / mMax) * 150))}px`, background: i === months.length - 1 ? "var(--color-accent)" : "var(--color-accent-300)" }} />
              <span className="text-[11px] text-organic-neutral-700">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-organic-4">
        <div className={card}>
          <h3 className="m-0 text-[20px]">Top 5 problèmes de peau</h3>
          {conds.length === 0 && empty}
          {conds.map((c) => (
            <div key={c.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[14px]"><span className="truncate font-semibold">{c.name}</span><span className="font-bold">{c.count}</span></div>
              {bar((c.count / conds[0].count) * 100)}
            </div>
          ))}
        </div>
        <div className={card}>
          <h3 className="m-0 text-[20px]">Top 5 produits recommandés</h3>
          {prods.length === 0 && empty}
          {prods.map((c) => (
            <div key={c.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[14px]"><span className="truncate font-semibold">{c.name}</span><span className="font-bold">{c.count}×</span></div>
              {bar((c.count / prods[0].count) * 100)}
            </div>
          ))}
        </div>
        <div className={card}>
          <h3 className="m-0 text-[20px]">Répartition par phototype</h3>
          {phTot === 0 ? empty : (
            <div className="flex flex-wrap items-end justify-around gap-4">
              {photos.map((p) => {
                const size = Math.round(64 + (p.count / phMax) * 48);
                return (
                  <div key={p.name} className="flex flex-col items-center gap-2">
                    <span className="flex items-center justify-center rounded-full font-heading text-[16px] text-organic-neutral-100"
                      style={{ width: size, height: size, background: PHOTOTYPE_COLORS[p.name] }}>{Math.round((p.count / phTot) * 100)} %</span>
                    <span className="text-[12px] font-semibold">Fitzpatrick {p.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={card}>
          <h3 className="m-0 text-[20px]">Consultations en ligne</h3>
          <div className="flex flex-wrap gap-organic-6">
            <span className="flex flex-col"><span className="font-heading text-[36px] leading-none">{d.onlineConsultations ?? 0}</span><span className="text-[13px] text-organic-neutral-700">consultations</span></span>
            <span className="flex flex-col"><span className="font-heading text-[36px] leading-none">{formatF(d.onlineRevenue ?? 0).replace(/\s?F$/, "")}</span><span className="text-[13px] text-organic-neutral-700">FCFA reçus</span></span>
          </div>
          {qDelta != null && (
            <p className={`m-0 text-[13px] font-semibold ${qDelta >= 0 ? "text-organic-accent-2-700" : "text-organic-accent-700"}`}>
              {qDelta >= 0 ? "+" : ""}{qDelta} % par rapport au trimestre précédent.
            </p>
          )}
        </div>
      </section>
    </ProLayout>
  );
}
