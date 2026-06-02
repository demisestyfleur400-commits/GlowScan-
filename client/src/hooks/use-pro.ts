import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ProAccount, Patient, Scan } from "@shared/schema";

export interface ProAccountResponse {
  account: ProAccount | null;
  active?: boolean;
  daysLeftTrial?: number | null;
}

export function useProAccount() {
  return useQuery<ProAccountResponse>({
    queryKey: ["/api/pro/account"],
    staleTime: 30 * 1000,
  });
}

export function useProPatients(q: string = "") {
  return useQuery<{ patients: Patient[] }>({
    queryKey: ["/api/pro/patients", q],
    queryFn: async () => {
      const url = q ? `/api/pro/patients?q=${encodeURIComponent(q)}` : "/api/pro/patients";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement patients");
      return res.json();
    },
  });
}

export function usePatientDossier(id: number | null) {
  return useQuery<{ patient: Patient; scans: Scan[] }>({
    queryKey: ["/api/pro/patients", id],
    queryFn: async () => {
      const res = await fetch(`/api/pro/patients/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement dossier");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/pro/patients", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/patients"] });
    },
  });
}

export function useAttachScanToPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scanId, patientId, clinicalContext, dermatoNote }: {
      scanId: number; patientId: number; clinicalContext?: any; dermatoNote?: string;
    }) => {
      const res = await apiRequest("POST", `/api/pro/scans/${scanId}/attach`, { patientId, clinicalContext, dermatoNote });
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/pro/patients"] });
      qc.invalidateQueries({ queryKey: ["/api/pro/patients", vars.patientId] });
      qc.invalidateQueries({ queryKey: ["/api/pro/stats"] });
    },
  });
}

export function useValidateScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scanId, isVerified, expertNote, expertCorrectedCondition }: any) => {
      const res = await apiRequest("POST", `/api/pro/scans/${scanId}/validate`, { isVerified, expertNote, expertCorrectedCondition });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/patients"] });
    },
  });
}

export function useProStats() {
  return useQuery<{
    totalPatients: number; totalScans: number; avgGlowScore: number;
    topConditions: { name: string; count: number }[];
    topProducts: { name: string; count: number }[];
    monthly: { month: string; count: number }[];
    statusBreakdown: { red: number; yellow: number; green: number };
  }>({
    queryKey: ["/api/pro/stats"],
    staleTime: 30 * 1000,
  });
}

export function useUpdateProAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/pro/account", data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/account"] }),
  });
}

export interface QuestionnaireItem {
  id: string;
  label: string;
  axis: string;
}

export function useGenerateQuestionnaire() {
  return useMutation({
    mutationFn: async (data: { condition: string; area?: string; patientAge?: number | null; patientSex?: string | null }) => {
      const res = await apiRequest("POST", "/api/pro/questionnaire/generate", data);
      return res.json() as Promise<{ items: QuestionnaireItem[]; cached: boolean }>;
    },
  });
}

export function useUpdatePatientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "priority" | "monitoring" | "stable" | "resolved" }) => {
      const res = await apiRequest("PATCH", `/api/pro/patients/${id}`, { status });
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/pro/patients"] });
      qc.invalidateQueries({ queryKey: ["/api/pro/patients", vars.id] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pro/patients/${id}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/patients"] }),
  });
}
