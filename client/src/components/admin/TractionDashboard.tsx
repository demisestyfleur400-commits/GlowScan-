import { useEffect, useState } from "react";
import {
  Users, ScanFace, Crown, TrendingUp, TrendingDown, ArrowRight,
  MessageCircle, ShoppingBag, Loader2, RefreshCw, Sparkles, Target,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";

type Period = "today" | "week" | "month" | "all";

interface FullStats {
  period: string;
  generatedAt: string;
  scans: {
    total: number;
    thisPeriod: number;
    prevPeriod: number | null;
    trend: number | null;
    byDay: { day: string; count: number }[];
    byArea: Record<string, number>;
    avgScore: number;
    scoreDistribution: Record<string, number>;
    topConditions: { condition: string | null; count: number }[];
    withUser: number;
    anonymous: number;
    recent: { id: number; area: string; condition: string | null; score: number | null; userId: string | null; createdAt: string }[];
  };
  users: {
    total: number;
    newThisPeriod: number;
    newPrevPeriod: number | null;
    trend: number | null;
    byDay: { day: string; count: number }[];
    retained: number;
    retentionRate: number;
    recent: { id: string; firstName: string | null; lastName: string | null; email: string | null; createdAt: string }[];
  };
  premium: { active: number; totalAllTime: number; monthlyRevenue: number };
  whatsapp: { total: number; thisPeriod: number; byBrand: any[]; byProduct: any[] };
  orders: { total: number; revenue: number };
  funnel: {
    users: number; scans: number; whatsapp: number; orders: number;
    conversionScanToWA: number; conversionWAToOrder: number;
  };
}

const AREA_LABELS: Record<string, string> = { face: "Visage", body: "Corps", hair: "Cheveux" };
const AREA_COLORS: Record<string, string> = { face: "#ec4899", body: "#10b981", hair: "#8b5cf6" };
const SCORE_COLORS: Record<string, string> = { "0-25": "#ef4444", "26-50": "#f97316", "51-75": "#eab308", "76-100": "#10b981" };

function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function fmtFcfa(n: number): string {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function trendBadge(trend: number | null): JSX.Element | null {
  if (trend === null) return null;
  if (trend === 0) {
    return <span className="text-[10px] font-bold text-gray-500" data-testid="trend-flat">— stable</span>;
  }
  const positive = trend > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}
      data-testid={positive ? "trend-up" : "trend-down"}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? "+" : ""}{trend} vs préc.
    </span>
  );
}

interface KpiCardProps {
  icon: JSX.Element;
  label: string;
  value: string;
  sub?: string | null;
  trend?: number | null;
  testId: string;
  accent: string;
}

function KpiCard({ icon, label, value, sub, trend, testId, accent }: KpiCardProps) {
  return (
    <div
      data-testid={testId}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900" data-testid={`${testId}-value`}>{value}</p>
      <div className="flex items-center justify-between">
        {sub ? <p className="text-[11px] text-gray-500 font-medium">{sub}</p> : <span />}
        {trend !== undefined && trendBadge(trend)}
      </div>
    </div>
  );
}

export function TractionDashboard({ adminKey, period }: { adminKey: string; period: Period }) {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charge les stats avec annulation pour éviter une race condition lors de
  // changements rapides de période (l'ancienne réponse arriverait après la nouvelle).
  const loadStats = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/full-stats?period=${period}`, {
        headers: { "x-admin-key": adminKey },
        signal,
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      if (!signal?.aborted) setStats(data);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Erreur de chargement");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminKey) return;
    const ctrl = new AbortController();
    loadStats(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, period]);

  // Le bouton "Actualiser" relance sans signal d'annulation explicite (action utilisateur ponctuelle).
  const fetchStats = () => loadStats();

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="traction-loading">
        <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center" data-testid="traction-error">
        <p className="text-sm font-bold text-rose-600 mb-3">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 text-sm font-bold hover:bg-rose-200 transition-colors"
          data-testid="button-retry-traction"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Garde-fous : si l'API renvoie une réponse partielle (incident, ancienne version),
  // on n'écroule pas le rendu — on remplace par des structures vides.
  const sUsers = stats.users || ({} as FullStats["users"]);
  const sScans = stats.scans || ({} as FullStats["scans"]);
  const sFunnel = stats.funnel || ({} as FullStats["funnel"]);
  const sPremium = stats.premium || ({} as FullStats["premium"]);
  const sOrders = stats.orders || ({} as FullStats["orders"]);
  const usersByDay = sUsers.byDay || [];
  const scansByDay = sScans.byDay || [];
  const scansByArea = sScans.byArea || {};
  const scoreDistribution = sScans.scoreDistribution || {};
  const topConditions = sScans.topConditions || [];
  const recentUsers = sUsers.recent || [];
  const recentScans = sScans.recent || [];

  // Fusionner users.byDay et scans.byDay pour graphique combiné
  const days = new Set<string>();
  for (const d of usersByDay) days.add(d.day);
  for (const d of scansByDay) days.add(d.day);
  const userByDayMap: Record<string, number> = {};
  for (const d of usersByDay) userByDayMap[d.day] = Number(d.count);
  const scanByDayMap: Record<string, number> = {};
  for (const d of scansByDay) scanByDayMap[d.day] = Number(d.count);
  const dailyData = Array.from(days)
    .sort()
    .map((day) => ({
      day: day.slice(5),
      users: userByDayMap[day] || 0,
      scans: scanByDayMap[day] || 0,
    }));

  // Distribution Glow Score
  const scoreData = ["0-25", "26-50", "51-75", "76-100"].map((range) => ({
    range,
    count: Number(scoreDistribution[range] || 0),
    fill: SCORE_COLORS[range],
  }));

  // Zones (face/body/hair)
  const zonesData = Object.entries(scansByArea)
    .filter(([, v]) => Number(v) > 0)
    .map(([area, count]) => ({
      name: AREA_LABELS[area] || area,
      value: Number(count),
      fill: AREA_COLORS[area] || "#94a3b8",
    }));

  // Top conditions
  const topCond = topConditions
    .filter((c) => c && c.condition)
    .map((c) => ({
      label: (c.condition || "").length > 35 ? (c.condition || "").slice(0, 32) + "…" : (c.condition || ""),
      count: Number(c.count),
    }));

  return (
    <div className="space-y-4" data-testid="traction-dashboard">
      {/* En-tête + actualiser */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">KPIs Traction</h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Mis à jour : {new Date(stats.generatedAt).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          data-testid="button-refresh-traction"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          testId="kpi-users"
          accent="bg-pink-100"
          icon={<Users className="w-4 h-4 text-pink-600" />}
          label="Utilisateurs"
          value={fmtNum(sUsers.total)}
          sub={`+${sUsers.newThisPeriod} sur la période`}
          trend={sUsers.trend}
        />
        <KpiCard
          testId="kpi-scans"
          accent="bg-purple-100"
          icon={<ScanFace className="w-4 h-4 text-purple-600" />}
          label="Scans"
          value={fmtNum(sScans.total)}
          sub={`${sScans.thisPeriod} sur la période`}
          trend={sScans.trend}
        />
        <KpiCard
          testId="kpi-premium"
          accent="bg-amber-100"
          icon={<Crown className="w-4 h-4 text-amber-600" />}
          label="Premium actifs"
          value={fmtNum(sPremium.active)}
          sub={`MRR ${fmtFcfa(sPremium.monthlyRevenue)}`}
        />
        <KpiCard
          testId="kpi-retention"
          accent="bg-emerald-100"
          icon={<Target className="w-4 h-4 text-emerald-600" />}
          label="Rétention"
          value={`${sUsers.retentionRate}%`}
          sub={`${sUsers.retained} users avec ≥2 scans`}
        />
      </div>

      {/* Graphique acquisition + engagement */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900">Acquisition & engagement (30j)</h3>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-pink-600"><span className="w-2 h-2 rounded-full bg-pink-500"></span>Inscriptions</span>
            <span className="flex items-center gap-1 text-purple-600"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Scans</span>
          </div>
        </div>
        {dailyData.length === 0 ? (
          <p className="text-center text-xs text-gray-400 italic py-8">Pas encore de données sur 30 jours.</p>
        ) : (
          <div className="h-56" data-testid="chart-daily">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="users" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 3 }} name="Inscriptions" />
                <Line type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} name="Scans" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="funnel">
        <h3 className="text-sm font-black text-gray-900 mb-3">Funnel de conversion</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FunnelStep icon={<Users className="w-4 h-4" />} label="Users" value={sFunnel.users} accent="bg-pink-50 text-pink-700 border-pink-200" />
          <FunnelStep icon={<ScanFace className="w-4 h-4" />} label="Scans" value={sFunnel.scans} accent="bg-purple-50 text-purple-700 border-purple-200" />
          <FunnelStep icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" value={sFunnel.whatsapp} accent="bg-emerald-50 text-emerald-700 border-emerald-200" />
          <FunnelStep icon={<ShoppingBag className="w-4 h-4" />} label="Commandes" value={sFunnel.orders} accent="bg-amber-50 text-amber-700 border-amber-200" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-r from-purple-50 to-emerald-50 border border-purple-100 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-600">Scans → WhatsApp</span>
            <span className="text-sm font-black text-emerald-700" data-testid="conv-scan-wa">{sFunnel.conversionScanToWA}%</span>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-amber-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-600">WhatsApp → Commande</span>
            <span className="text-sm font-black text-amber-700" data-testid="conv-wa-order">{sFunnel.conversionWAToOrder}%</span>
          </div>
        </div>
        {sOrders.total > 0 && (
          <p className="mt-3 text-[11px] text-gray-500 font-medium text-center">
            Revenu total commandes : <span className="font-black text-emerald-700">{fmtFcfa(sOrders.revenue)}</span>
          </p>
        )}
      </div>

      {/* Distribution scores + zones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-900">Distribution Glow Score</h3>
            <span className="text-[10px] font-bold text-gray-500">moyenne {sScans.avgScore}/100</span>
          </div>
          {sScans.total === 0 ? (
            <p className="text-center text-xs text-gray-400 italic py-8">Aucun scan pour l'instant.</p>
          ) : (
            <div className="h-48" data-testid="chart-scores">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {scoreData.map((entry) => (
                      <Cell key={entry.range} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-gray-900 mb-3">Zones analysées</h3>
          {zonesData.length === 0 ? (
            <p className="text-center text-xs text-gray-400 italic py-8">Aucun scan pour l'instant.</p>
          ) : (
            <div className="h-48" data-testid="chart-zones">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={zonesData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={70} paddingAngle={3}>
                    {zonesData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Anonymes vs identifiés */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-black text-gray-900 mb-3">Conversion anonyme → inscrit</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
            {sScans.total > 0 && (
              <>
                <div
                  className="bg-pink-500 h-full"
                  style={{ width: `${(sScans.withUser / sScans.total) * 100}%` }}
                  data-testid="bar-identified"
                />
                <div
                  className="bg-gray-300 h-full"
                  style={{ width: `${(sScans.anonymous / sScans.total) * 100}%` }}
                  data-testid="bar-anonymous"
                />
              </>
            )}
          </div>
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">
            {sScans.withUser} / {sScans.total}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-pink-600"><span className="w-2 h-2 rounded-full bg-pink-500"></span>Identifiés ({sScans.withUser})</span>
          <span className="flex items-center gap-1 text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-300"></span>Anonymes ({sScans.anonymous})</span>
        </div>
      </div>

      {/* Top conditions */}
      {topCond.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-gray-900 mb-3">Top problèmes diagnostiqués</h3>
          <div className="space-y-1.5" data-testid="top-conditions">
            {topCond.map((c, i) => {
              const max = topCond[0].count;
              const pct = max > 0 ? (c.count / max) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2" data-testid={`cond-row-${i}`}>
                  <span className="text-[11px] font-bold text-gray-700 w-44 truncate" title={c.label}>{c.label}</span>
                  <div className="flex-1 h-5 bg-gray-50 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-gray-900 w-8 text-right">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activité récente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-gray-900 mb-3">Derniers inscrits</h3>
          {sUsers.recent.length === 0 ? (
            <p className="text-center text-xs text-gray-400 italic py-4">Personne pour l'instant.</p>
          ) : (
            <div className="space-y-2" data-testid="recent-users">
              {sUsers.recent.slice(0, 8).map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs" data-testid={`user-row-${u.id}`}>
                  <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-pink-700">
                      {(u.firstName || u.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : (u.email || "—")}
                    </p>
                    {u.email && (u.firstName || u.lastName) && (
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtRelative(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-gray-900 mb-3">Derniers scans</h3>
          {sScans.recent.length === 0 ? (
            <p className="text-center text-xs text-gray-400 italic py-4">Aucun scan récent.</p>
          ) : (
            <div className="space-y-2" data-testid="recent-scans">
              {sScans.recent.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs" data-testid={`scan-row-${s.id}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: (AREA_COLORS[s.area] || "#94a3b8") + "22" }}
                  >
                    <span className="text-[9px] font-black" style={{ color: AREA_COLORS[s.area] || "#64748b" }}>
                      {(AREA_LABELS[s.area] || s.area).slice(0, 1)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {AREA_LABELS[s.area] || s.area} · {s.condition ? s.condition.slice(0, 28) : "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {s.userId ? "Inscrit" : "Anonyme"} · {fmtRelative(s.createdAt)}
                    </p>
                  </div>
                  {s.score !== null && (
                    <span className="text-[11px] font-black text-gray-900 whitespace-nowrap">{s.score}/100</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ icon, label, value, accent }: { icon: JSX.Element; label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-xl border ${accent} px-3 py-2.5 flex flex-col items-center gap-1`}>
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-lg font-black">{fmtNum(value)}</span>
    </div>
  );
}
