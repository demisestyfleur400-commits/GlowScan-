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
        image: z.string(), // Base64 or URL
        area: z.enum(['face', 'body', 'hair']),
      }),
      responses: {
        200: z.object({
          // Champs communs B2C + Pro
          condition: z.string(),
          severity: z.string(),
          score: z.number(),
          skinType: z.string(),
          // Champs B2C (optionnels — absents en mode Pro)
          details: z.string().optional(),
          motivation: z.string().optional(),
          stats: z.object({
            lesions: z.string(),
            zones: z.string(),
            pores: z.string(),
            marks: z.string(),
          }).optional(),
          balance: z.object({
            inflammation: z.number().optional(),
            sebum: z.number().optional(),
            pores: z.number().optional(),
            sensitivity: z.number().optional(),
            scars: z.number().optional(),
          }).optional(),
          recommendations: z.object({
            products: z.array(z.string()),
            morning: z.array(z.string()),
            evening: z.array(z.string()),
            weekly: z.string(),
          }).optional(),
          // Champs propagés par le serveur
          savedScanId: z.number().optional(),
          reference: z.string().optional(),
          imageUrl: z.string().optional(),
          isAnonymous: z.boolean().optional(),
          zoneAnalysis: z.array(z.object({
            name: z.string(),
            status: z.enum(["red", "yellow", "green"]),
            short: z.string(),
            long: z.string().optional(),
          })).optional(),
        }).passthrough(),
        500: errorSchemas.internal,
      },
    }
  },
};

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
