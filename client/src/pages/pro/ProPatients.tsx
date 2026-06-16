import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Plus, ChevronRight, ScanLine, Users } from "lucide-react";
import { useProPatients } from "@/hooks/use-pro";
import { ProLayout, ProCard, StatusBadge } from "@/components/ProLayout";

const NAVY = "#7c3aed";
const INK = "#f3f0ff";

const STATUS_FILTERS = [
  { v: "all", label: "Tous" },
  { v: "priority", label: "Priorité", color: "#ef4444" },
  { v: "monitoring", label: "En suivi", color: NAVY },
  { v: "stable", label: "Stable", color: "#10b981" },
  { v: "resolved", label: "Résolu", color: "#6b7280" },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  priority: { label: "Priorité haute", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  monitoring: { label: "En suivi", color: NAVY, bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)" },
  stable: { label: "Stable", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  resolved: { label: "Résolu", color: "#6b7280", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" },
};

export default function ProPatients() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading } = useProPatients(q);
  const allPatients = data?.patients || [];

  const patients = statusFilter === "all"
    ? allPatients
    : allPatients.filter(p => p.status === statusFilter);

  return (
    <ProLayout
      title="Mes patients"
      back="/derm/dashboard"
      rightAction={
        <Link
          href="/derm/analyse?nouveau=1"
          data-testid="button-new-patient"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-extrabold text-white transition-all active:scale-95"
          style={{ background: NAVY }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </Link>
      }
    >
      {/* Search */}
      <ProCard className="p-2 mb-3">
        <div className="flex items-center gap-2 px-2.5 py-1">
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un patient par nom…"
            data-testid="input-search"
            className="flex-1 bg-transparent text-sm outline-none py-1.5"
            style={{ color: INK }}
          />
        </div>
      </ProCard>

      {/* Filtres par statut */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: "none" }}>
        {STATUS_FILTERS.map(f => {
          const on = statusFilter === f.v;
          return (
            <button
              key={f.v}
              onClick={() => setStatusFilter(f.v)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95"
              style={on
                ? { background: f.v === "all" ? NAVY : `${(f as any).color}22`, border: `1.5px solid ${f.v === "all" ? NAVY : (f as any).color}`, color: f.v === "all" ? "#fff" : (f as any).color }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,185,255,0.65)" }
              }
            >
              {f.label}
              {f.v !== "all" && (
                <span className="ml-1" style={{ opacity: 0.7 }}>
                  ({allPatients.filter(p => p.status === f.v).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {isLoading && (
        <p className="text-center text-sm py-12" style={{ color: "rgba(200,185,255,0.65)" }}>Chargement…</p>
      )}

      {!isLoading && patients.length === 0 && (
        <ProCard className="p-10 text-center">
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.35)" }} />
          <p className="mb-4 text-sm font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>
            {q ? "Aucun patient trouvé" : "Aucun patient encore enregistré"}
          </p>
          <Link
            href="/derm/analyse?nouveau=1"
            data-testid="link-add-first"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-extrabold text-sm active:scale-95 transition-all"
            style={{ background: NAVY }}
          >
            <ScanLine className="w-4 h-4" />
            Analyser un nouveau patient
          </Link>
        </ProCard>
      )}

      {patients.length > 0 && (
        <ProCard className="overflow-hidden">
          <div style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {patients.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{ borderBottom: i < patients.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}
              >
                <Link
                  href={`/pro/patient/${p.id}`}
                  data-testid={`card-patient-${p.id}`}
                  className="flex items-center gap-3 p-4 transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0"
                    style={{ background: NAVY }}
                  >
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold truncate" style={{ color: INK }} data-testid={`text-name-${p.id}`}>
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {p.age ? `${p.age} ans · ` : ""}
                      {p.sex || ""}
                      {p.lastScanAt
                        ? ` · dernier scan ${new Date(p.lastScanAt).toLocaleDateString("fr-FR")}`
                        : " · jamais analysé"}
                    </p>
                  </div>
                  {p.status && STATUS_LABELS[p.status] && (
                    <span
                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: STATUS_LABELS[p.status].bg,
                        border: `1px solid ${STATUS_LABELS[p.status].border}`,
                        color: STATUS_LABELS[p.status].color,
                      }}
                    >
                      {STATUS_LABELS[p.status].label}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                </Link>
              </motion.div>
            ))}
          </div>
        </ProCard>
      )}
    </ProLayout>
  );
}
