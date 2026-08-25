import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Plus, ChevronRight, ScanLine, Users, Clock } from "lucide-react";
import { useProPatients, useProPendingPatients, useProAccount } from "@/hooks/use-pro";
import { useRealtimeScans } from "@/hooks/use-realtime";
import { ProLayout, ProCard, StatusBadge } from "@/components/ProLayout";
import PendingPatientsList from "@/components/PendingPatientsList";
import { DERM } from "@/lib/design-tokens";

const NAVY = DERM.violet;
const INK = DERM.text;

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
  resolved: { label: "Résolu", color: "#6b7280", bg: "#F1F5F9", border: "#E2E8F0" },
};

export default function ProPatients() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewTab, setViewTab] = useState<"all" | "pending">("all");
  const [secView, setSecView] = useState<"today" | "all">("today"); // secrétaire : aujourd'hui par défaut
  const { data, isLoading } = useProPatients(q);
  const { data: pendingData, isLoading: isPendingLoading } = useProPendingPatients();
  const { data: accountData } = useProAccount();

  // Real-time update for pending patients count
  useRealtimeScans(undefined);

  // 🔑 Détecter le rôle de l'utilisateur
  const userRole = accountData?.user?.role;
  const isDoctor = userRole === "doctor";

  const allPatients = data?.patients || [];
  const pendingPatients = pendingData?.patients || [];
  const pendingCount = pendingData?.count || 0;

  const isToday = (d?: string | Date | null) => {
    if (!d) return false;
    const x = new Date(d), n = new Date();
    return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
  };

  const baseList = viewTab === "pending"
    ? pendingPatients
    : statusFilter === "all"
      ? allPatients
      : allPatients.filter(p => p.status === statusFilter);

  // Secrétaire : "aujourd'hui" par défaut, avec possibilité de voir tous ses patients.
  const displayPatients = isDoctor
    ? baseList
    : secView === "today"
      ? baseList.filter(p => isToday((p as any).createdAt))
      : baseList;

  return (
    <ProLayout
      title={isDoctor ? "Patientèle" : "Mes patients"}
      back={isDoctor ? "/derm/dashboard" : undefined}
      rightAction={
        <Link
          href="/derm/analyse?nouveau=1"
          data-testid="button-new-patient"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-extrabold text-white transition-all active:scale-95"
          style={{ background: NAVY }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau patient
        </Link>
      }
    >
      {/* Onglets : En attente vs Tous (masqué pour secrétaires) */}
      {isDoctor && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setViewTab("pending"); setStatusFilter("all"); }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all active:scale-95 flex items-center gap-2 ${
              viewTab === "pending"
                ? "bg-violet-600 text-white"
                : "bg-#F1F5F9 border border-#E2E8F0 text-muted-foreground hover:border-violet-300"
            }`}
            style={viewTab === "pending"
              ? { background: NAVY }
              : { background: "#F1F5F9", border: "1px solid #E2E8F0" }
            }
          >
            <Clock size={14} />
            En attente
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-extrabold rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setViewTab("all"); setStatusFilter("all"); }}
            className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all active:scale-95"
            style={viewTab === "all"
              ? { background: NAVY, color: "#fff" }
              : { background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#475569" }
            }
          >
            Tous les patients
          </button>
        </div>
      )}

      {/* Toggle secrétaire : Aujourd'hui (défaut) / Tous */}
      {!isDoctor && (
        <div className="flex gap-2 mb-3">
          {([["today", "Aujourd'hui"], ["all", "Tous mes patients"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSecView(v)}
              data-testid={`secview-${v}`}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all active:scale-95"
              style={secView === v
                ? { background: NAVY, color: "#fff" }
                : { background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#475569" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Search (hidden when on pending tab) */}
      {viewTab === "all" && (
        <ProCard className="p-2 mb-3">
          <div className="flex items-center gap-2 px-2.5 py-1">
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#64748B" }} />
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
      )}

      {/* Filtres par statut (only when on "all" tab) */}
      {viewTab === "all" && (
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
                  : { background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#475569" }
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
      )}

      {/* Liste */}
      {(viewTab === "all" ? isLoading : isPendingLoading) && (
        <p className="text-center text-sm py-12" style={{ color: "#475569" }}>Chargement…</p>
      )}

      {!(viewTab === "all" ? isLoading : isPendingLoading) && displayPatients.length === 0 && (
        (isDoctor && viewTab === "all" && !q) ? (
          <OnboardingChecklist acc={accountData?.account as any} hasPatient={allPatients.length > 0} />
        ) : (
          <ProCard className="p-10 text-center">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#64748B" }} />
            <p className="mb-4 text-sm font-medium" style={{ color: "#475569" }}>
              {viewTab === "pending"
                ? "✅ Aucun dossier en attente"
                : (q
                  ? "Aucun patient trouvé"
                  : (secView === "today" ? "Aucun patient créé aujourd'hui" : "Aucun patient enregistré"))}
            </p>
            {viewTab === "all" && (
              <Link
                href="/derm/analyse?nouveau=1"
                data-testid="link-add-first"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-extrabold text-sm active:scale-95 transition-all"
                style={{ background: NAVY }}
              >
                <ScanLine className="w-4 h-4" />
                Analyser un nouveau patient
              </Link>
            )}
          </ProCard>
        )
      )}

      {displayPatients.length > 0 && (
        <ProCard className="overflow-hidden">
          <div style={{ borderColor: "#E2E8F0" }}>
            {displayPatients.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{ borderBottom: i < displayPatients.length - 1 ? "1px solid #E2E8F0" : "none" }}
              >
                <Link
                  href={`/derm/patient/${p.id}`}
                  data-testid={`card-patient-${p.id}`}
                  className="flex items-center gap-3 p-4 transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
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
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "#64748B" }}>
                      {p.age ? `${p.age} ans · ` : ""}
                      {p.sex || ""}
                      {p.lastScanAt
                        ? ` · dernier scan ${new Date(p.lastScanAt).toLocaleDateString("fr-FR")}`
                        : " · jamais analysé"}
                    </p>
                  </div>
                  {(p as any).reportSentAt && (
                    <span
                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#047857" }}
                      title={`Dossier envoyé le ${new Date((p as any).reportSentAt).toLocaleDateString("fr-FR")}`}
                    >
                      ✓ Envoyé
                    </span>
                  )}
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
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#CBD5E1" }} />
                </Link>
              </motion.div>
            ))}
          </div>
        </ProCard>
      )}
    </ProLayout>
  );
}

// Checklist onboarding — remplace l'état vide "0 patient" (change #4)
function OnboardingChecklist({ acc, hasPatient }: { acc: any; hasPatient: boolean }) {
  const steps = [
    { key: "cabinet", label: "Complétez votre profil cabinet", hint: "2 min", to: "/derm/cabinet", done: !!(acc?.cabinetName && acc?.phone && acc?.city) },
    { key: "public", label: "Activez votre profil public", hint: "recevez des patients GlowScan", to: "/derm/profil-public", done: acc?.b2cAvailable === true },
    { key: "patient", label: "Analysez votre premier patient", hint: "3 min", to: "/derm/analyse?nouveau=1", done: hasPatient },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <ProCard className="p-6">
      <p className="text-sm font-extrabold mb-1" style={{ color: DERM.text }}>Pour recevoir vos premiers patients :</p>
      <p className="text-[11px] mb-4" style={{ color: DERM.textMuted }}>{doneCount}/{steps.length} étapes complétées</p>
      <div className="space-y-2">
        {steps.map((s) => (
          <Link key={s.key} href={s.to} data-testid={`onboarding-${s.key}`}
            className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.99]"
            style={{ background: "#F1F5F9", border: `1px solid ${s.done ? "rgba(5,150,105,0.25)" : DERM.border}` }}>
            <span className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-black"
              style={{ width: 22, height: 22, background: s.done ? DERM.green : "#fff",
                border: `1px solid ${s.done ? DERM.green : DERM.border}`, color: s.done ? "#fff" : DERM.textMuted }}>
              {s.done ? "✓" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold" style={{ color: s.done ? DERM.textMuted : DERM.text, textDecoration: s.done ? "line-through" : "none" }}>{s.label}</p>
              <p className="text-[10.5px]" style={{ color: DERM.textMuted }}>{s.hint}</p>
            </div>
            {!s.done && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: DERM.violet }} />}
          </Link>
        ))}
      </div>
    </ProCard>
  );
}
