import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, dermAnalysisResponseSchema, type DermAnalysisResponse } from "@shared/routes";
import type { InsertScan } from "@shared/schema";

// ============================================
// AI ANALYSIS HOOKS
// ============================================

export interface AnalyzeRequest {
  image: string; // base64
  area: 'face' | 'body' | 'hair';
  intake?: Record<string, string | undefined>;
}

/**
 * Hook d'analyse DERM (B2B) — utilisé UNIQUEMENT par les pages pro
 * (ProAnalyze, DermOnboarding). Envoie mode:"derm" pour activer le pipeline
 * clinique côté serveur et valide la réponse avec le schéma DERM séparé.
 * Architecture de sortie indépendante du B2C.
 */
export function useAnalyze() {
  return useMutation({
    mutationFn: async (data: AnalyzeRequest): Promise<DermAnalysisResponse> => {
      // RAPIDITÉ AVANT TOUT : 2 tentatives max (≈ 25-30s plafond),
      // puis on throw → l'appelant Pro bascule sur canevas dermato éditable.
      // Ne jamais faire poireauter le dermato — il préfère écrire lui-même
      // que d'attendre 2 min un retry qui ne viendra peut-être pas.
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch(api.scans.analyze.path, {
            method: api.scans.analyze.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, mode: "derm" }),
            credentials: "include",
          });

          if (res.status === 503 && attempt < 2) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            const e: any = new Error(body?.message || "Analyse échouée. Réessaie.");
            e.status = res.status;
            e.code = body?.code;
            throw e;
          }

          return dermAnalysisResponseSchema.parse(await res.json());
        } catch (err: any) {
          lastErr = err;
          // Abonnement expiré (402) : inutile de réessayer — on remonte tout de suite
          // pour afficher un message clair (« réabonnez-vous »), pas « réessayez ».
          if (err?.status === 402 || err?.code === "PRO_SUBSCRIPTION_REQUIRED") throw err;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
        }
      }
      throw lastErr || new Error("Analyse impossible");
    },
  });
}

// ============================================
// SCAN HISTORY HOOKS
// ============================================

export function useScans() {
  return useQuery({
    queryKey: [api.scans.list.path],
    queryFn: async () => {
      const res = await fetch(api.scans.list.path, { credentials: "include" });
      if (res.status === 401) return null; // Handle unauthorized gracefully
      if (!res.ok) throw new Error("Failed to fetch scan history");
      return api.scans.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertScan) => {
      const res = await fetch(api.scans.create.path, {
        method: api.scans.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to save scan result");
      }
      return api.scans.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.scans.list.path] });
    },
  });
}

export function useScan(id: number) {
  return useQuery({
    queryKey: [api.scans.get.path, id],
    queryFn: async () => {
      const url = api.scans.get.path.replace(':id', String(id));
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch scan details");
      return api.scans.get.responses[200].parse(await res.json());
    },
  });
}
