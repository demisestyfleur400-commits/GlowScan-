import { motion } from "framer-motion";
import { Users, BarChart3, TrendingUp, Calendar, ShoppingBag } from "lucide-react";
import { useProStats, useProAccount } from "@/hooks/use-pro";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";
import { DERM } from "@/lib/design-tokens";

// Couleurs sourcées depuis les design tokens unifiés
const NAVY = DERM.violet;
const INK = DERM.text;
const GREEN = DERM.green;

export default function ProStats() {
  const { data, isLoading } = useProStats();
  const { data: accData } = useProAccount();

  if (isLoading || !data) return <LoadingScreen />;

  // 🔑 SÉCURITÉ : Les secrétaires n'ont pas accès aux statistiques
  if (accData?.user?.role === "secretary") {
    return (
      <ProLayout title="Performances" back="/derm/patients">
        <div style={{ textAlign: "center", padding: "40px 24px", color: "rgba(200,185,255,0.75)" }}>
          <p>Les secrétaires n'ont pas accès aux performances du cabinet.</p>
        </div>
      </ProLayout>
    );
  }

  const phototypeDist = (data as any).phototypeDist || [];
  const onlineConsultations = (data as any).onlineConsultations || 0;
  const onlineRevenue = (data as any).onlineRevenue || 0;
  const onlineRevenueMonthly = (data as any).onlineRevenueMonthly || [];

  return (
    <ProLayout title="Performances" back="/derm/dashboard">
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={<Users className="w-4 h-4" />} accent={NAVY} label="Patients" value={data.totalPatients} testid="kpi-patients" />
          <KPI icon={<BarChart3 className="w-4 h-4" />} accent={GREEN} label="Analyses" value={data.totalScans} testid="kpi-scans" />
          <KPI icon={<TrendingUp className="w-4 h-4" />} accent="#a78bfa" label="Glow Score moyen" value={`${data.avgGlowScore}/100`} testid="kpi-avg-score" />
          <ProCard className="p-4">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white mb-2"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
            >
              <Calendar className="w-4 h-4" style={{ color: "#a78bfa" }} />
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest mb-2" style={{ color: "rgba(200,185,255,0.75)" }}>Statut patients</p>
            <div className="flex items-center gap-2.5 text-xs font-extrabold flex-wrap">
              <span className="flex items-center gap-1" style={{ color: "#f9a8d4" }} title="Priorité">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f43f5e" }} />{data.statusBreakdown.priority}
              </span>
              <span className="flex items-center gap-1" style={{ color: "#fbbf24" }} title="En suivi">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fbbf24" }} />{data.statusBreakdown.monitoring}
              </span>
              <span className="flex items-center gap-1" style={{ color: "#6ee7b7" }} title="Stable">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />{data.statusBreakdown.stable}
              </span>
              <span className="flex items-center gap-1" style={{ color: "rgba(200,185,255,0.6)" }} title="Résolu">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6b7280" }} />{data.statusBreakdown.resolved}
              </span>
            </div>
          </ProCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Top 5 problèmes de peau" icon={<BarChart3 className="w-4 h-4" />} accent={NAVY}>
            {data.topConditions.length === 0 && <p className="text-xs" style={{ color: "rgba(200,185,255,0.75)" }}>Aucune donnée encore.</p>}
            {data.topConditions.map((c, i) => {
              const max = data.topConditions[0]?.count || 1;
              return (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="mb-3 last:mb-0"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="truncate flex-1 font-bold" style={{ color: "rgba(200,185,255,0.75)" }}>{c.name}</span>
                    <span className="font-extrabold" style={{ color: NAVY }}>{c.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
                  </div>
                </motion.div>
              );
            })}
          </Section>

          <Section title="Top 5 produits recommandés" icon={<ShoppingBag className="w-4 h-4" />} accent={GREEN}>
            {data.topProducts.length === 0 && <p className="text-xs" style={{ color: "rgba(200,185,255,0.75)" }}>Aucune donnée encore.</p>}
            {data.topProducts.map((p) => {
              const max = data.topProducts[0]?.count || 1;
              return (
                <div key={p.name} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="truncate flex-1 font-bold" style={{ color: "rgba(200,185,255,0.75)" }}>{p.name}</span>
                    <span className="font-extrabold" style={{ color: "#6ee7b7" }}>{p.count}×</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(p.count / max) * 100}%`, background: `linear-gradient(90deg, ${GREEN}, #6ee7b7)` }} />
                  </div>
                </div>
              );
            })}
          </Section>
        </div>

        <Section title="Consultations par mois" icon={<Calendar className="w-4 h-4" />} accent="#a78bfa">
          {data.monthly.length === 0 && <p className="text-xs" style={{ color: "rgba(200,185,255,0.75)" }}>Aucune donnée encore.</p>}
          {data.monthly.length > 0 && (
            <div className="flex items-end gap-1.5 h-32 mt-3">
              {data.monthly.map((m) => {
                const max = Math.max(...data.monthly.map((x) => x.count), 1);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#a78bfa" }}>
                      {m.count}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all hover:opacity-80 min-h-[4px]"
                      style={{ height: `${(m.count / max) * 100}%`, background: "linear-gradient(to top, #7c3aed, #a78bfa)" }}
                    />
                    <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Consultations en ligne : revenus + phototype */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Répartition par phototype" icon={<Users className="w-4 h-4" />} accent="#a78bfa">
            {(!phototypeDist || phototypeDist.length === 0) && <p className="text-xs" style={{ color: "rgba(200,185,255,0.75)" }}>Aucune donnée encore.</p>}
            {phototypeDist.map((p: any) => {
              const max = phototypeDist[0]?.count || 1;
              return (
                <div key={p.name} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold" style={{ color: "rgba(200,185,255,0.75)" }}>Fitzpatrick {p.name}</span>
                    <span className="font-extrabold" style={{ color: "#a78bfa" }}>{p.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(p.count / max) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#c4b5fd)" }} />
                  </div>
                </div>
              );
            })}
          </Section>

          <Section title="Consultations en ligne" icon={<TrendingUp className="w-4 h-4" />} accent={GREEN}>
            <div className="flex gap-4 mb-4">
              <div>
                <p className="text-2xl font-extrabold" style={{ color: INK }}>{onlineConsultations}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(200,185,255,0.75)" }}>Consultations</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold" style={{ color: "#6ee7b7" }}>{onlineRevenue.toLocaleString("fr-FR")}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(200,185,255,0.75)" }}>FCFA reçus</p>
              </div>
            </div>
            {onlineRevenueMonthly.length > 0 && (
              <div className="flex items-end gap-1.5 h-20">
                {onlineRevenueMonthly.slice(-6).map((m: any) => {
                  const max = Math.max(...onlineRevenueMonthly.map((x: any) => x.revenue), 1);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[9px] font-extrabold opacity-0 group-hover:opacity-100" style={{ color: "#6ee7b7" }}>{m.revenue.toLocaleString("fr-FR")}</span>
                      <div className="w-full rounded-t-md min-h-[4px]" style={{ height: `${(m.revenue / max) * 100}%`, background: `linear-gradient(to top,${GREEN},#6ee7b7)` }} />
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}>{m.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </ProLayout>
  );
}

function KPI({ icon, accent, label, value, testid }: any) {
  return (
    <ProCard className="p-4" testid={testid}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-white mb-2"
        style={{ background: `${accent}26`, border: `1px solid ${accent}50` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="text-2xl font-extrabold" style={{ color: INK }}>{value}</p>
      <p className="text-[11px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: "rgba(200,185,255,0.75)" }}>{label}</p>
    </ProCard>
  );
}

function Section({ title, icon, accent, children }: any) {
  return (
    <ProCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}26`, border: `1px solid ${accent}50` }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <p className="text-sm font-extrabold" style={{ color: INK }}>{title}</p>
      </div>
      {children}
    </ProCard>
  );
}
