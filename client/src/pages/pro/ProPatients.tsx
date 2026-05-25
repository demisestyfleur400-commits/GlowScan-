import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Plus, ChevronRight, ScanLine, Users } from "lucide-react";
import { useProPatients } from "@/hooks/use-pro";
import { ProLayout, ProCard, StatusBadge } from "@/components/ProLayout";
export default function ProPatients() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useProPatients(q);
  const patients = data?.patients || [];

  return (
    <ProLayout
      title="Mes patients"
      back="/pro/dashboard"
      rightAction={
        <Link
          href="/pro/analyse?nouveau=1"
          data-testid="button-new-patient"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
          style={{ background: NAVY }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </Link>
      }
    >
      {/* Search */}
      <ProCard className="p-2 mb-4">
        <div className="flex items-center gap-2 px-2.5 py-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un patient par nom…"
            data-testid="input-search"
            className="flex-1 bg-transparent text-sm outline-none py-1.5 placeholder-slate-400"
          />
        </div>
      </ProCard>

      {/* Liste */}
      {isLoading && (
        <p className="text-center text-slate-400 text-sm py-12">Chargement…</p>
      )}

      {!isLoading && patients.length === 0 && (
        <ProCard className="p-10 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-4 text-sm font-medium">
            {q ? "Aucun patient trouvé" : "Aucun patient encore enregistré"}
          </p>
          <Link
            href="/pro/analyse?nouveau=1"
            data-testid="link-add-first"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold text-sm"
            style={{ background: NAVY }}
          >
            <ScanLine className="w-4 h-4" />
            Analyser un nouveau patient
          </Link>
        </ProCard>
      )}

      {patients.length > 0 && (
        <ProCard className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {patients.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Link
                  href={`/pro/patient/${p.id}`}
                  data-testid={`card-patient-${p.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ background: NAVY }}
                  >
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: INK }} data-testid={`text-name-${p.id}`}>
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {p.age ? `${p.age} ans · ` : ""}
                      {p.sex || ""}
                      {p.lastScanAt
                        ? ` · dernier scan ${new Date(p.lastScanAt).toLocaleDateString("fr-FR")}`
                        : " · jamais analysé"}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </ProCard>
      )}
    </ProLayout>
  );
}
