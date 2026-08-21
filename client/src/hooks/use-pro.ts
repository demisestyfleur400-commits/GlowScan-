import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ProAccount, Patient, Scan } from "@shared/schema";

export interface ProAccountResponse {
  account: ProAccount | null;
  active?: boolean;
  daysLeftTrial?: number | null;
  isAdmin?: boolean;
  user?: {
    id: string;
    email?: string;
    role?: "doctor" | "secretary";
    firstName?: string;
    lastName?: string;
  } | null;
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

export function useProPendingPatients() {
  return useQuery<{ patients: Patient[]; count: number }>({
    queryKey: ["/api/pro/pending-patients"],
    queryFn: async () => {
      const res = await fetch("/api/pro/pending-patients", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement patients en attente");
      return res.json();
    },
    refetchInterval: 5000, // Refetch toutes les 5s pour réactivité
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

// ── Suivi évolution : ajouter une photo de contrôle à un scan ────────────
export interface FollowUpEntry {
  date: string;
  dayOffset: number;
  photoUrl: string;
  note?: string | null;
  evolutionScore: number;
  aiComparison: string;
  recommendation: string;
  createdAt?: string;
}

export function useAddFollowUpPhoto(patientId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { scanId: number; image: string; date?: string; note?: string }) => {
      const res = await apiRequest("POST", `/api/pro/scans/${vars.scanId}/follow-up`, {
        image: vars.image, date: vars.date, note: vars.note,
      });
      return res.json() as Promise<{ success: boolean; entry: FollowUpEntry; followUpPhotos: FollowUpEntry[] }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/patients", patientId] });
    },
  });
}

// ── Rappel de contrôle WhatsApp (suivi évolution) ────────────────────────
export function useFollowUpReminder(patientId: number | null) {
  const qc = useQueryClient();
  const schedule = useMutation({
    mutationFn: async (vars: { date?: string; message?: string; sendNow?: boolean }) => {
      const res = await apiRequest("POST", `/api/pro/patients/${patientId}/follow-up-reminder`, vars);
      return res.json() as Promise<{ success: boolean; sent?: boolean; method?: string; waLink?: string | null; scheduledAt?: string; error?: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/patients", patientId] }),
  });
  const cancel = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/pro/patients/${patientId}/follow-up-reminder`, undefined);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/patients", patientId] }),
  });
  return { schedule, cancel };
}

// ── Second avis entre confrères (réseau clinique) ────────────────────────
export interface PeerReview {
  id: number; mine: boolean; requesterName: string; requesterCity?: string | null;
  condition?: string | null; ageSex?: string | null; question: string;
  imageUrl?: string | null; status: "open" | "answered" | "closed"; replyCount: number; createdAt: string;
}
export interface PeerReviewReply { id: number; mine: boolean; authorName: string; message: string; createdAt: string; }

export function usePeerReviews() {
  return useQuery<{ items: PeerReview[] }>({
    queryKey: ["/api/pro/peer-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/pro/peer-reviews", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });
}

export function usePeerReview(id: number | null) {
  return useQuery<{ review: PeerReview; replies: PeerReviewReply[] }>({
    queryKey: ["/api/pro/peer-reviews", id],
    queryFn: async () => {
      const res = await fetch(`/api/pro/peer-reviews/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePeerReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { scanId?: number | null; question: string; targetAccountId?: number | null }) => {
      const res = await apiRequest("POST", "/api/pro/peer-reviews", vars);
      return res.json() as Promise<{ success: boolean; id: number }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews"] }),
  });
}

export function useReplyPeerReview(reviewId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/pro/peer-reviews/${reviewId}/reply`, { message });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews", reviewId] });
      qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews"] });
    },
  });
}

export function useClosePeerReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: number) => {
      const res = await apiRequest("POST", `/api/pro/peer-reviews/${reviewId}/close`, undefined);
      return res.json();
    },
    onSuccess: (_d, reviewId) => {
      qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews", reviewId] });
      qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews"] });
    },
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

// ── Secrétaires (gestion d'équipe — médecin uniquement) ──────────────────
export interface Secretary {
  id: number;
  fullName: string;
  email: string;
  userId: string;
  createdAt?: string;
}

export function useSecretaries() {
  return useQuery<{ secretaries: Secretary[] }>({
    queryKey: ["/api/pro/secretaries"],
    queryFn: async () => {
      const res = await fetch("/api/pro/secretaries", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement secrétaires");
      return res.json();
    },
  });
}

export function useCreateSecretary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { fullName: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/pro/secretaries", data);
      return res.json() as Promise<{ success: boolean; secretary: Secretary & { plainPassword: string } }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/secretaries"] });
    },
  });
}

export function useDeleteSecretary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pro/secretaries/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/secretaries"] });
    },
  });
}

export function useSubmitPatientForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: number) => {
      const res = await apiRequest("POST", `/api/pro/patients/${patientId}/submit-for-review`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/pending-patients"] });
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
    statusBreakdown: { priority: number; monitoring: number; stable: number; resolved: number };
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

export function useClinicalOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scanId, overrideMode, condition, score, explanation }: {
      scanId: number;
      overrideMode: "none" | "partial" | "full";
      condition?: string;
      score?: number;
      explanation: string;
    }) => {
      const res = await apiRequest("POST", `/api/pro/scans/${scanId}/override`, {
        overrideMode,
        condition,
        score,
        explanation,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/patients"] });
      qc.invalidateQueries({ queryKey: ["/api/pro/stats"] });
    },
  });
}
