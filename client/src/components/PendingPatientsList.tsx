import { useProPendingPatients } from "@/hooks/use-pro";
import { Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingPatientsListProps {
  onPatientClick?: (patientId: number) => void;
  selectedPatientId?: number | null;
}

export default function PendingPatientsList({
  onPatientClick,
  selectedPatientId,
}: PendingPatientsListProps) {
  const { data, isLoading, error } = useProPendingPatients();
  const patients = data?.patients || [];
  const count = data?.count || 0;

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="text-sm text-muted-foreground">
          Chargement des dossiers en attente...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-600 flex gap-2 items-start">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          Erreur lors du chargement des dossiers
        </p>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground mb-2">
          ✅ Aucun dossier en attente
        </div>
        <div className="text-xs text-muted-foreground/60">
          Les dossiers des patients arrivent ici en temps réel
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="px-4 py-2 flex items-center justify-between bg-violet-50/50 border-b border-violet-100/50">
        <span className="text-sm font-semibold text-violet-900">
          {count} patient{count > 1 ? "s" : ""} en attente
        </span>
        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
      </div>

      <div className="flex flex-col gap-1">
        {patients.map((patient) => (
          <div
            key={patient.id}
            onClick={() => onPatientClick?.(patient.id)}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              selectedPatientId === patient.id
                ? "bg-violet-100 border border-violet-300 shadow-sm"
                : "bg-white border border-gray-200 hover:border-violet-200 hover:bg-violet-50/30"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {patient.firstName} {patient.lastName}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock size={12} />
                  {format(new Date(patient.createdAt), "HH:mm", { locale: fr })}
                </div>
              </div>
              {selectedPatientId === patient.id && (
                <div className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
