import { motion } from "framer-motion";
import { Users, BarChart3, TrendingUp, Calendar, ShoppingBag } from "lucide-react";
import { useProStats } from "@/hooks/use-pro";
import { ProLayout, ProCard, NAVY, GREEN, INK } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";

export default function ProStats() {
  const { data, isLoading } = useProStats();
  if (isLoading || !data) return <LoadingScreen />;

  return (
    <ProLayout title="Statistiques" back="/pro/dashboard">
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={<Users className="w-4 h-4" />} accent={NAVY} label="Patients" value={data.totalPatients} testid="kpi-patients" />
          <KPI icon={<BarChart3 className="w-4 h-4" />} accent={GREEN} label="Analyses" value={data.totalScans} testid="kpi-scans" />
          <KPI icon={<TrendingUp className="w-4 h-4" />} accent="#0EA5E9" label="Glow Score moyen" value={`${data.avgGlowScore}/100`} testid="kpi-avg-score" />
          <ProCard className="p-4">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-white mb-2 bg-slate-700">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mb-2">Statut patients</p>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{data.statusBreakdown.red}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{data.statusBreakdown.yellow}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{data.statusBreakdown.green}</span>
            </div>
          </ProCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Top 5 problèmes de peau" icon={<BarChart3 className="w-4 h-4" />} accent={NAVY}>
            {data.topConditions.length === 0 && <p className="text-xs text-slate-400">Aucune donnée encore.</p>}
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
                    <span className="text-slate-700 truncate flex-1 font-semibold">{c.name}</span>
                    <span className="font-bold" style={{ color: NAVY }}>{c.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: NAVY }} />
                  </div>
                </motion.div>
              );
            })}
          </Section>

          <Section title="Top 5 produits recommandés" icon={<ShoppingBag className="w-4 h-4" />} accent={GREEN}>
            {data.topProducts.length === 0 && <p className="text-xs text-slate-400">Aucune donnée encore.</p>}
            {data.topProducts.map((p) => {
              const max = data.topProducts[0]?.count || 1;
              return (
                <div key={p.name} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-700 truncate flex-1 font-semibold">{p.name}</span>
                    <span className="font-bold" style={{ color: GREEN }}>{p.count}×</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.count / max) * 100}%`, background: GREEN }} />
                  </div>
                </div>
              );
            })}
          </Section>
        </div>

        <Section title="Consultations par mois" icon={<Calendar className="w-4 h-4" />} accent="#0EA5E9">
          {data.monthly.length === 0 && <p className="text-xs text-slate-400">Aucune donnée encore.</p>}
          {data.monthly.length > 0 && (
            <div className="flex items-end gap-1.5 h-32 mt-3">
              {data.monthly.map((m) => {
                const max = Math.max(...data.monthly.map((x) => x.count), 1);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all hover:opacity-80 min-h-[4px]"
                      style={{ height: `${(m.count / max) * 100}%`, background: NAVY }}
                    />
                    <span className="text-[10px] text-slate-500 font-medium">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </ProLayout>
  );
}

function KPI({ icon, accent, label, value, testid }: any) {
  return (
    <ProCard className="p-4" testid={testid}>
      <div className="w-8 h-8 rounded-md flex items-center justify-center text-white mb-2" style={{ background: accent }}>
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color: INK }}>{value}</p>
      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{label}</p>
    </ProCard>
  );
}

function Section({ title, icon, accent, children }: any) {
  return (
    <ProCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white" style={{ background: accent }}>
          {icon}
        </div>
        <p className="text-sm font-bold" style={{ color: INK }}>{title}</p>
      </div>
      {children}
    </ProCard>
  );
}
