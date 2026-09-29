import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search } from "lucide-react";
import { useProPatients, useProPendingPatients, useProAccount } from "@/hooks/use-pro";
import { useRealtimeScans } from "@/hooks/use-realtime";
import { ProLayout, PATIENT_STATUS, patientStatusOf, type PatientStatus } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// Patientèle (refonte Organic) — maquette « Derm Portal », écran Patientèle.
// Onglets Tous les patients / En attente (dossiers préparés, à analyser),
// recherche, filtres de statut avec compteurs, cartes avec Glow Score et
// barres d'évolution (4 dernières analyses réelles, rien d'inventé).
// Secrétaire : « Mes patients », patients du jour par défaut.
// ════════════════════════════════════════════════════════════════════════

const TZ = "Africa/Douala";
const shortDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "short" }) : "";
const initials = (f?: string | null, l?: string | null) => `${(f || "").trim()[0] || ""}${(l || "").trim()[0] || ""}`.toUpperCase() || "?";
const isToday = (d?: string | Date | null) =>
  !!d && new Date(d).toLocaleDateString("fr-CA", { timeZone: TZ }) === new Date().toLocaleDateString("fr-CA", { timeZone: TZ });
const sexLabel = (s?: string | null) => (s === "F" ? "Femme" : s === "M" ? "Homme" : null);

const FILTERS: { key: "all" | PatientStatus; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "priority", label: "Priorité" },
  { key: "monitoring", label: "En suivi" },
  { key: "stable", label: "Stable" },
  { key: "resolved", label: "Résolu" },
];

type Row = {
  id: number; firstName: string; lastName: string; age?: number | null; sex?: string | null;
  status?: string | null; lastScanAt?: string | null; createdAt?: string | null;
  scoreTrend?: number[]; lastCondition?: string | null; reportSentAt?: string | null;
};

export default function ProPatients() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");
  const initialFilter = (() => {
    try { const f = new URLSearchParams(window.location.search).get("filtre"); return FILTERS.some((x) => x.key === f) ? (f as any) : "all"; } catch { return "all"; }
  })();
  const [filter, setFilter] = useState<"all" | PatientStatus>(initialFilter);
  const [tab, setTab] = useState<"all" | "pending" | "today">("all");
  const { data, isLoading } = useProPatients(q);
  const { data: pendingData } = useProPendingPatients();
  const { data: accountData } = useProAccount();
  useRealtimeScans(undefined);

  const isSecretary = accountData?.user?.role === "secretary";
  const current = isSecretary && tab === "all" ? "today" : tab;

  const all = (data?.patients || []) as unknown as Row[];
  const pending = (pendingData?.patients || []) as unknown as Row[];
  const counts = all.reduce((m, p) => { const k = patientStatusOf(p.status); m[k] = (m[k] || 0) + 1; return m; }, {} as Record<string, number>);
  const pendingIds = new Set(pending.map((p) => p.id));

  const rows: (Row & { waiting?: boolean })[] =
    current === "pending"
      ? pending.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q.toLowerCase())).map((p) => ({ ...p, waiting: true }))
      : current === "today"
        ? all.filter((p) => isToday(p.createdAt) || isToday(p.lastScanAt)).map((p) => ({ ...p, waiting: pendingIds.has(p.id) }))
        : all.filter((p) => filter === "all" || patientStatusOf(p.status) === filter).map((p) => ({ ...p, waiting: pendingIds.has(p.id) }));

  const tabs = isSecretary
    ? [{ key: "today" as const, label: "Aujourd'hui", count: 0 }, { key: "pending" as const, label: "En attente", count: pending.length }]
    : [{ key: "all" as const, label: "Tous les patients", count: 0 }, { key: "pending" as const, label: "En attente", count: pending.length }];

  return (
    <ProLayout>
      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">
            {isSecretary ? "Aujourd'hui" : `${all.length} dossier${all.length > 1 ? "s" : ""} actif${all.length > 1 ? "s" : ""}`}
          </span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">{isSecretary ? "Mes patients" : "Patientèle"}</h1>
        </div>
        <Button onClick={() => setLocation("/derm/analyse?nouveau=1")} className="h-auto px-[22px] py-3 text-[15px]" data-testid="button-new-patient">
          <Plus size={16} /> Nouveau patient
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-organic-3">
        <div className="flex gap-1.5 rounded-pill bg-organic-surface p-1" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={current === t.key} onClick={() => setTab(t.key)}
              className={`flex cursor-pointer items-center gap-2 rounded-pill border-0 px-4 py-2 font-body text-[13px] font-bold ${current === t.key ? "bg-organic-bg text-organic-accent-700" : "bg-transparent text-organic-text"}`}
              data-testid={`tab-${t.key}`}>
              {t.label}
              {t.count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-organic-accent px-1.5 text-[11px] text-organic-bg">{t.count}</span>}
            </button>
          ))}
        </div>
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-pill bg-organic-surface px-4 text-organic-neutral-700">
          <Search size={16} strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient par nom…"
            className="flex-1 border-0 bg-transparent font-body text-[14px] text-organic-text outline-none" data-testid="input-search" />
        </label>
      </div>

      {current === "all" && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={on}
                className={`cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`}
                data-testid={`filter-${f.key}`}>
                {f.label} <span className="opacity-70">{f.key === "all" ? all.length : counts[f.key] || 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-card bg-organic-surface p-organic-8 text-[14px] text-organic-neutral-700">Chargement des dossiers…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-1 rounded-card bg-organic-surface p-organic-8">
          <span className="font-heading text-[17px]">Aucun patient trouvé</span>
          <p className="m-0 text-[13px] opacity-80">
            {current === "pending" ? "Aucun dossier en attente d'analyse." : current === "today" ? "Aucun patient enregistré aujourd'hui." : "Essayez un autre nom ou retirez le filtre."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-organic-3">
          {rows.map((p) => <PatientCard key={p.id} p={p} />)}
        </div>
      )}
    </ProLayout>
  );
}

function PatientCard({ p }: { p: Row & { waiting?: boolean } }) {
  const st = patientStatusOf(p.status);
  const trend = p.scoreTrend || [];
  const last = trend.length ? trend[trend.length - 1] : null;
  const up = trend.length >= 2 ? trend[trend.length - 1] >= trend[0] : true;
  const meta = [
    p.age ? `${p.age} ans` : null,
    sexLabel(p.sex),
    p.waiting ? (p.createdAt ? `photos prises ${shortDate(p.createdAt)}` : null) : p.lastScanAt ? `dernier scan ${shortDate(p.lastScanAt)}` : null,
  ].filter(Boolean).join(" · ");
  const href = p.waiting ? `/derm/analyse?patient=${p.id}` : `/derm/patient/${p.id}`;

  return (
    <Link href={href} className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-4 text-organic-text no-underline hover:shadow-organic-md" data-testid={`patient-card-${p.id}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-[14px] font-bold ${st === "priority" ? "bg-organic-accent-200 text-organic-accent-800" : "bg-organic-accent-2-200 text-organic-accent-2-800"}`}>
          {initials(p.firstName, p.lastName)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">{p.firstName} {p.lastName}</span>
          <span className="text-[12px] text-organic-neutral-700">{meta}</span>
        </span>
        <span className={`flex-none rounded-pill px-2.5 py-1 text-[12px] font-semibold ${p.waiting ? "bg-organic-accent-200 text-organic-accent-900" : PATIENT_STATUS[st].tag}`}>
          {p.waiting ? "À analyser" : PATIENT_STATUS[st].label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[12px] text-organic-neutral-700">
            {p.waiting ? "Dossier prêt · analyse à faire" : p.lastCondition || "Pas encore de diagnostic"}
          </span>
          <span className="font-heading text-[26px] leading-[1.1]">
            {p.waiting || last == null ? "—" : last}
            <span className="font-body text-[13px] text-organic-neutral-700"> Glow Score</span>
          </span>
        </span>
        {!p.waiting && trend.length > 1 && (
          <span className="flex h-9 items-end gap-1" title="Évolution du Glow Score">
            {trend.map((v, i) => (
              <span key={i} className="w-2 rounded-pill"
                style={{ height: `${Math.max(4, (v / 100) * 36)}px`, background: i === trend.length - 1 ? (up ? "var(--color-accent-2-600)" : "var(--color-accent)") : "var(--color-neutral-300)" }} />
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}
