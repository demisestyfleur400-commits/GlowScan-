import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// SEC-002 — Rate-limiting global sur les endpoints coûteux / sensibles.
// Clé = IP (trust proxy = 1 → req.ip = vraie IP client derrière Railway).
// Chaque blocage est loggé pour le monitoring.
function make(name: string, windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const ip = req.ip || (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "?";
      const retryAfter = Math.ceil(windowMs / 1000);
      console.warn(`[ratelimit] 🚫 ${name} bloqué — ip=${ip} method=${req.method} path=${req.path}`);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ message: "Trop de requêtes. Réessayez dans un instant." });
    },
  });
}

// Analyse IA — appel modèle coûteux. Marge pour le NAT opérateur (IP partagées
// fréquentes en Afrique) tout en bloquant l'abus : 40 / 10 min par IP.
export const analyzeLimiter = make("analyze", 10 * 60 * 1000, 40);

// Consultations — création/écriture (n'englobe PAS le polling GET). 60 / 10 min.
export const consultationLimiter = make("consultations", 10 * 60 * 1000, 60);

// Paiements — initialisation. Plus strict : 20 / 10 min. (Webhooks S2S NON limités.)
export const paymentLimiter = make("payments", 10 * 60 * 1000, 20);

// Envoi de rapport par email (public, anti-spam) : 15 / heure par IP.
export const emailReportLimiter = make("email-report", 60 * 60 * 1000, 15);
