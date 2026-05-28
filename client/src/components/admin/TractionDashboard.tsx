import { useEffect, useState } from "react";
import {
  Users, ScanFace, Crown, TrendingUp, TrendingDown,
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
const AREA_COLORS: Record<string, string> = { face: "#a78bfa", body: "#6ee7b7", hair: "#c4b5fd" };
const SCORE_COLORS: Record<string, string> = { "0-25": "#f87171", "26-50": "#fb923c", "51-75": "#fbbf24", "76-100": "#6ee7b7" };

function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function fmtFcfa(n: number): string {
  return n.toLocaleString("fr-FR") + " F CFA";
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
    return <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="trend-flat">— stable</span>;
  }
  const positive = trend > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold"
      style={{ color: positive ? "#6ee7b7" : "#f9a8d4" }}
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
  iconBg: string;
}

function KpiCard({ icon, label, value, sub, trend, testId, iconBg }: KpiCardProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-1.5 p-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      </div>
      <p className="text-2xl font-extrabold" style={{ color: "#f3f0ff" }} data-testid={`${testId}-value`}>{value}</p>
      <div className="flex items-center justify-between">
        {sub ? <p className="text-[11px] font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>{sub}</p> : <span />}
        {trend !== undefined && trendBadge(trend)}
      </div>
    </div>
  );
}

function FunnelStep({ icon, label, value, color }: { icon: JSX.Element; label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-2xl px-3 py-2.5 flex flex-col items-center gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30` }}
    >
      <div className="flex items-center gap-1" style={{ color }}>
        {icon}
        <span className="text-[10px] font-extrabold uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-lg font-extrabold" style={{ color: "#f3f0ff" }}>{fmtNum(value)}</span>
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  background: "#13101f",
  border: "1px solid rgba(167,139,250,0.2)",
  fontSize: 12,
  color: "#f3f0ff",
};

export function TractionDashboard({ adminKey, period }: { adminKey: string; period: Period }) {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchStats = () => loadStats();

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="traction-loading">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a78bfa" }} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)" }} data-testid="traction-error">
        <p className="text-sm font-bold mb-3" style={{ color: "#f9a8d4" }}>{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-80"
          style={{ background: "rgba(233,30,140,0.15)", color: "#f9a8d4", border: "1px solid rgba(233,30,140,0.3)" }}
          data-testid="button-retry-traction"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return null;

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

  const scoreData = ["0-25", "26-50", "51-75", "76-100"].map((range) => ({
    range,
    count: Number(scoreDistribution[range] || 0),
    fill: SCORE_COLORS[range],
  }));

  const zonesData = Object.entries(scansByArea)
    .filter(([, v]) => Number(v) > 0)
    .map(([area, count]) => ({
      name: AREA_LABELS[area] || area,
      value: Number(count),
      fill: AREA_COLORS[area] || "#a78bfa",
    }));

  const topCond = topConditions
    .filter((c) => c && c.condition)
    .map((c) => ({
      label: (c.condition || "").length > 35 ? (c.condition || "").slice(0, 32) + "…" : (c.condition || ""),
      count: Number(c.count),
    }));

  const cardStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div className="space-y-4" data-testid="traction-dashboard">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: "#f3f0ff" }}>KPIs traction</h2>
            <p className="text-[11px] font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>
              Mis à jour : {new Date(stats.generatedAt).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-opacity disabled:opacity-50 hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,185,255,0.65)" }}
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
          iconBg="rgba(167,139,250,0.15)"
          icon={<Users className="w-4 h-4" style={{ color: "#a78bfa" }} />}
          label="Utilisateurs"
          value={fmtNum(sUsers.total)}
          sub={`+${sUsers.newThisPeriod} sur la période`}
          trend={sUsers.trend}
        />
        <KpiCard
          testId="kpi-scans"
          iconBg="rgba(124,58,237,0.15)"
          icon={<ScanFace className="w-4 h-4" style={{ color: "#c4b5fd" }} />}
          label="Scans"
          value={fmtNum(sScans.total)}
          sub={`${sScans.thisPeriod} sur la période`}
          trend={sScans.trend}
        />
        <KpiCard
          testId="kpi-premium"
          iconBg="rgba(245,158,11,0.1)"
          icon={<Crown className="w-4 h-4" style={{ color: "#fbbf24" }} />}
          label="Premium actifs"
          value={fmtNum(sPremium.active)}
          sub={`MRR ${fmtFcfa(sPremium.monthlyRevenue)}`}
        />
        <KpiCard
          testId="kpi-retention"
          iconBg="rgba(16,185,129,0.1)"
          icon={<Target className="w-4 h-4" style={{ color: "#6ee7b7" }} />}
          label="Rétention"
          value={`${sUsers.retentionRate}%`}
          sub={`${sUsers.retained} users avec ≥2 scans`}
        />
      </div>

      {/* Graphique acquisition */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold" style={{ color: "#f3f0ff" }}>Acquisition & engagement (30j)</h3>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1" style={{ color: "#a78bfa" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#7c3aed" }} />Inscriptions
            </span>
            <span className="flex items-center gap-1" style={{ color: "#c4b5fd" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#c4b5fd" }} />Scans
            </span>
          </div>
        </div>
        {dailyData.length === 0 ? (
          <p className="text-center text-xs italic py-8" style={{ color: "rgba(255,255,255,0.25)" }}>Pas encore de données sur 30 jours.</p>
        ) : (
          <div className="h-56" data-testid="chart-daily">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(200,185,255,0.5)" }} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(200,185,255,0.5)" }} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "#f3f0ff", fontWeight: 700 }} />
                <Line type="monotone" dataKey="users" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: "#7c3aed" }} name="Inscriptions" />
                <Line type="monotone" dataKey="scans" stroke="#c4b5fd" strokeWidth={2.5} dot={{ r: 3, fill: "#c4b5fd" }} name="Scans" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="rounded-2xl p-4" style={cardStyle} data-testid="funnel">
        <h3 className="text-sm font-extrabold mb-3" style={{ color: "#f3f0ff" }}>Funnel de conversion</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FunnelStep icon={<Users className="w-4 h-4" />} label="Users" value={sFunnel.users} color="#a78bfa" />
          <FunnelStep icon={<ScanFace className="w-4 h-4" />} label="Scans" value={sFunnel.scans} color="#c4b5fd" />
          <FunnelStep icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" value={sFunnel.whatsapp} color="#6ee7b7" />
          <FunnelStep icon={<ShoppingBag className="w-4 h-4" />} label="Commandes" value={sFunnel.orders} color="#fbbf24" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <span className="text-[11px] font-bold" style={{ color: "rgba(200,185,255,0.65)" }}>Scans → WhatsApp</span>
            <span className="text-sm font-extrabold" style={{ color: "#6ee7b7" }} data-testid="conv-scan-wa">{sFunnel.conversionScanToWA}%</span>
          </div>
          <div className="rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <span className="text-[11px] font-bold" style={{ color: "rgba(200,185,255,0.65)" }}>WhatsApp → Commande</span>
            <span className="text-sm font-extrabold" style={{ color: "#fbbf24" }} data-testid="conv-wa-order">{sFunnel.conversionWAToOrder}%</span>
          </div>
        </div>
        {sOrders.total > 0 && (
          <p className="mt-3 text-[11px] font-medium text-center" style={{ color: "rgba(200,185,255,0.65)" }}>
            Revenu total commandes : <span className="font-extrabold" style={{ color: "#6ee7b7" }}>{fmtFcfa(sOrders.revenue)}</span>
          </p>
        )}
      </div>

      {/* Distribution scores + zones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold" style={{ color: "#f3f0ff" }}>Distribution Glow Score</h3>
            <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>moyenne {sScans.avgScore}/100</span>
          </div>
          {sScans.total === 0 ? (
            <p className="text-center text-xs italic py-8" style={{ color: "rgba(255,255,255,0.25)" }}>Aucun scan pour l'instant.</p>
          ) : (
            <div className="h-48" data-testid="chart-scores">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "rgba(200,185,255,0.5)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(200,185,255,0.5)" }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "#f3f0ff", fontWeight: 700 }} />
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

        <div className="rounded-2xl p-4" style={cardStyle}>
          <h3 className="text-sm font-extrabold mb-3" style={{ color: "#f3f0ff" }}>Zones analysées</h3>
          {zonesData.length === 0 ? (
            <p className="text-center text-xs italic py-8" style={{ color: "rgba(255,255,255,0.25)" }}>Aucun scan pour l'instant.</p>
          ) : (
            <div className="h-48" data-testid="chart-zones">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={zonesData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={70} paddingAngle={3}>
                    {zonesData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, color: "rgba(200,185,255,0.65)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Anonymes vs identifiés */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <h3 className="text-sm font-extrabold mb-3" style={{ color: "#f3f0ff" }}>Conversion anonyme → inscrit</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
            {sScans.total > 0 && (
              <>
                <div
                  className="h-full"
                  style={{ width: `${(sScans.withUser / sScans.total) * 100}%`, background: "#7c3aed" }}
                  data-testid="bar-identified"
                />
                <div
                  className="h-full"
                  style={{ width: `${(sScans.anonymous / sScans.total) * 100}%`, background: "rgba(255,255,255,0.12)" }}
                  data-testid="bar-anonymous"
                />
              </>
            )}
          </div>
          <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: "#f3f0ff" }}>
            {sScans.withUser} / {sScans.total}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] font-bold">
          <span className="flex items-center gap-1" style={{ color: "#a78bfa" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#7c3aed" }} />
            Identifiés ({sScans.withUser})
          </span>
          <span className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            Anonymes ({sScans.anonymous})
          </span>
        </div>
      </div>

      {/* Top conditions */}
      {topCond.length > 0 && (
        <div className="rounded-2xl p-4" style={cardStyle}>
          <h3 className="text-sm font-extrabold mb-3" style={{ color: "#f3f0ff" }}>Top problèmes diagnostiqués</h3>
          <div className="space-y-1.5" data-testid="top-conditions">
            {topCond.map((c, i) => {
              const max = topCond[0].count;
              const pct = max > 0 ? (c.count / max) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2" data-testid={`cond-row-${i}`}>
                  <span className="text-[11px] font-bold w-44 truncate" style={{ color: "rgba(200,185,255,0.65)" }} title={c.label}>{c.label}</span>
                  <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div
                      className="h-full rounded-lg"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }}
                    />
                  </div>
                  <span className="text-[11px] font-extrabold w-8 text-right" style={{ color: "#f3f0ff" }}>{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activité récente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <h3 className="text-sm font-extrabold mb-3" style={{ color: "#f3f0ff" }}>Derniers inscrits</h3>
          {recentUsers.length === 0 ? (
            <p className="text-center text-xs italic py-4" style={{ color: "rgba(255,255,255,0.25)" }}>Personne pour l'instant.</p>
          ) : (
            <div className="space-y-2" data-testid="recent-users">
              {recentUsers.slice(0, 8).map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs" data-testid={`user-row-${u.id}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)" }}
                  >
                    <span className="text-[10px] font-extrabold" style={{ color: "#c4b5fd" }}>
                      {(u.firstName || u.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: "#f3f0ff" }}>
                      {u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : (u.email || "—")}
                    </p>
                    {u.email && (u.firstName || u.lastName) && (
                      <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{u.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>{fmtRelative(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={cardStyle}>
          <h3 className="text-sm font-extrabold mb-3" style={{ color: "#f3f0ff" }}>Derniers scans</h3>
          {recentScans.length === 0 ? (
            <p className="text-center text-xs italic py-4" style={{ color: "rgba(255,255,255,0.25)" }}>Aucun scan récent.</p>
          ) : (
            <div className="space-y-2" data-testid="recent-scans">
              {recentScans.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs" data-testid={`scan-row-${s.id}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: (AREA_COLORS[s.area] || "#a78bfa") + "22" }}
                  >
                    <span className="text-[9px] font-extrabold" style={{ color: AREA_COLORS[s.area] || "#a78bfa" }}>
                      {(AREA_LABELS[s.area] || s.area).slice(0, 1)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: "#f3f0ff" }}>
                      {AREA_LABELS[s.area] || s.area} · {s.condition ? s.condition.slice(0, 28) : "—"}
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {s.userId ? "Inscrit" : "Anonyme"} · {fmtRelative(s.createdAt)}
                    </p>
                  </div>
                  {s.score !== null && (
                    <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: "#c4b5fd" }}>{s.score}/100</span>
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
