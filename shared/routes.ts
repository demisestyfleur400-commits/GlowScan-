import { z } from 'zod';
import { insertScanSchema, scans } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  scans: {
    list: {
      method: 'GET' as const,
      path: '/api/scans' as const,
      responses: {
        200: z.array(z.custom<typeof scans.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/scans/:id' as const,
      responses: {
        200: z.custom<typeof scans.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/scans' as const,
      input: insertScanSchema,
      responses: {
        201: z.custom<typeof scans.$inferSelect>(),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    analyze: {
      method: 'POST' as const,
      path: '/api/analyze' as const,
      input: z.object({
        image: z.string(), // Base64 or URL (photo principale)
        images: z.array(z.string()).optional(), // multi-angles (face, profil D, profil G)
        area: z.enum(['face', 'body', 'hair']),
      }),
      responses: {
        200: z.object({
          // ── Champs communs B2C + Pro ──────────────────────────────
          condition: z.string(),
          severity: z.string(),
          score: z.number(),
          skinType: z.string(),
          photo_quality: z.enum(["insufficient", "acceptable", "good"]).optional(),
          confidence: z.enum(["low", "medium", "high"]).optional(),

          // ── Champs B2C ────────────────────────────────────────────
          details: z.string().optional(),
          motivation: z.string().optional(),
          conditionSecondaire: z.string().nullable().optional(),

          // Balance GlowScan (nouveau format 6 métriques)
          balance: z.object({
            hydration: z.number().optional(),
            sebum: z.number().optional(),
            sensitivity: z.number().optional(),
            uniformity: z.number().optional(),
            elasticity: z.number().optional(),
            radiance: z.number().optional(),
            // rétrocompat ancien format
            inflammation: z.number().optional(),
            pores: z.number().optional(),
            scars: z.number().optional(),
          }).optional(),

          // Zones B2C enrichies avec advice
          zonesB2C: z.array(z.object({
            zone: z.string(),
            status: z.string(),
            findings: z.string(),
            advice: z.string(),
          })).optional(),

          // Ancienne zoneAnalysis (rétrocompat)
          zoneAnalysis: z.array(z.object({
            name: z.string(),
            status: z.enum(["red", "yellow", "green"]),
            short: z.string(),
            long: z.string().optional(),
          })).optional(),

          // Protocoles enrichis avec brand + price
          recommendations: z.array(z.object({
            step: z.string(),
            product: z.string(),
            brand: z.string().optional(),
            price: z.string().optional(),
            why: z.string().optional(),
          })).optional(),
          morningProtocol: z.array(z.object({
            step: z.string(),
            product: z.string(),
            brand: z.string().optional(),
            price: z.string().optional(),
            why: z.string().optional(),
          })).optional(),
          eveningProtocol: z.array(z.object({
            step: z.string(),
            product: z.string(),
            brand: z.string().optional(),
            price: z.string().optional(),
            why: z.string().optional(),
          })).optional(),
          weeklyProtocol: z.string().optional(),

          // Alertes cliniques
          redFlags: z.array(z.string()).optional(),
          whenToSeeDermatologist: z.string().optional(),
          medicalDisclaimer: z.string().optional(),

          // Stats (rétrocompat)
          stats: z.object({
            lesions: z.string(),
            zones: z.string(),
            pores: z.string(),
            marks: z.string(),
          }).optional(),

          // ── Champs propagés par le serveur ───────────────────────
          savedScanId: z.number().optional(),
          reference: z.string().optional(),
          imageUrl: z.string().optional(),
          isAnonymous: z.boolean().optional(),
        }).passthrough(),
        500: errorSchemas.internal,
      },
    }
  },
};

// ============================================
// SCHÉMA DERM (B2B) — ARCHITECTURE DE SORTIE SÉPARÉE DU B2C
// ============================================
// Contrat clinique renvoyé par /api/analyze lorsque mode === "derm" + compte pro.
// Volontairement indépendant du schéma B2C ci-dessus (modèles de sortie distincts).
// Tolérant : seuls condition/score sont requis, le reste optionnel + passthrough,
// pour absorber les variations de réponse de l'IA sans casser la consultation.
const dermProtocolStep = z.object({
  step: z.string(),
  product: z.string().optional(),
  concentration: z.string().nullable().optional(),
  frequency: z.string().optional(),
  mechanism: z.string().optional(),
}).passthrough();

export const dermAnalysisResponseSchema = z.object({
  condition: z.string(),
  conditionSecondaire: z.string().nullable().optional(),
  severity: z.string().optional(),
  score: z.number(),
  confidence: z.string().optional(),
  skinType: z.string().optional(),
  photo_quality: z.string().optional(),

  clinicalSummary: z.string().optional(),

  reasoningSteps: z.array(z.object({
    observation: z.string().optional(),
    rule: z.string().optional(),
    conclusion: z.string().optional(),
  }).passthrough()).optional(),

  zonesAnalysis: z.array(z.object({
    zone: z.string(),
    status: z.string().optional(),
    findings: z.string().optional(),
    risk: z.string().optional(),
    evaluable: z.boolean().optional(),
  }).passthrough()).optional(),

  antecedentsIntegration: z.string().optional(),

  toxicIngredients: z.array(z.object({
    ingredient: z.string(),
    reason: z.string().optional(),
  }).passthrough()).optional(),

  differentialDiagnosis: z.array(z.string()).optional(),

  clinicalProtocol: z.object({
    morning: z.array(dermProtocolStep).optional(),
    evening: z.array(dermProtocolStep).optional(),
    weekly: z.string().nullable().optional(),
    durationWeeks: z.number().optional(),
    followUpWeeks: z.number().optional(),
    referralNeeded: z.boolean().optional(),
    referralReason: z.string().nullable().optional(),
  }).passthrough().optional(),

  logistics: z.string().nullable().optional(),
  prognostic: z.string().optional(),
  redFlags: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  medicalDisclaimer: z.string().optional(),

  // Champs propagés par le serveur
  savedScanId: z.number().optional(),
  reference: z.string().optional(),
  imageUrl: z.string().optional(),
  isAnonymous: z.boolean().optional(),
}).passthrough();

export type DermAnalysisResponse = z.infer<typeof dermAnalysisResponseSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type ScanInput = z.infer<typeof api.scans.create.input>;
export type AnalyzeInput = z.infer<typeof api.scans.analyze.input>;
export type AnalyzeResponse = z.infer<typeof api.scans.analyze.responses[200]>;
