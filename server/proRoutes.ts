import type { Express } from "express";
import { db } from "./db";
import { proAccounts, patients, scans, premiumRequests, users, insertProAccountSchema, insertPatientSchema, pageVisits } from "@shared/schema";
import { eq, and, desc, sql, count, gte, isNotNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import QRCode from "qrcode";

// Même logique provider que routes.ts : Groq > Gemini > OpenAI
const _proGroqKey   = process.env.GROQ_API_KEY || "";
const _proGeminiKey = process.env.GEMINI_API_KEY || "";
const _proOpenaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
const _proOpenaiBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;
const PRO_USE_GROQ   = !!_proGroqKey;
const PRO_USE_GEMINI = !PRO_USE_GROQ && !!_proGeminiKey;
const PRO_GROQ_MODEL = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const PRO_AI_MODEL   = PRO_USE_GROQ ? PRO_GROQ_MODEL
                     : PRO_USE_GEMINI ? "gemini-2.0-flash" : "gpt-4o-mini";

// Gemini native SDK (uniquement sans clé Groq)
const proGemini = PRO_USE_GEMINI ? new GoogleGenerativeAI(_proGeminiKey) : null;
// OpenAI SDK — Groq (prioritaire, gratuit, global) ou OpenAI standard
const proOpenai = !PRO_USE_GEMINI ? new OpenAI({
  apiKey:  PRO_USE_GROQ ? _proGroqKey : (_proOpenaiKey || "sk-missing"),
  baseURL: PRO_USE_GROQ ? "https://api.groq.com/openai/v1" : (_proOpenaiBase || undefined),
}) : null;

// Cache mémoire des questionnaires par condition normalisée (24h)
const questionnaireCache = new Map<string, { items: any[]; expiresAt: number }>();

// ── Stockage temporaire PDFs (24h, identifié par UUID) ─────────────────────
const tempPdfs = new Map<string, { data: Buffer; expiresAt: number; filename: string }>();
// Nettoyage automatique toutes les heures
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tempPdfs) {
    if (v.expiresAt < now) tempPdfs.delete(k);
  }
}, 60 * 60 * 1000);
function cacheKey(condition: string, area: string) {
  return `${(condition || "").toLowerCase().trim().slice(0, 80)}|${(area || "face").toLowerCase()}`;
}

const OWNER_WHATSAPP = "237674377959";
const PRO_PRICE_FCFA = 30000;
const TRIAL_DAYS = 14;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function getProAccountForUser(userId: string) {
  const [acc] = await db.select().from(proAccounts).where(eq(proAccounts.userId, userId));
  return acc || null;
}

function isProActive(acc: { trialEndsAt: Date; subscriptionStatus: string; subscriptionExpiresAt: Date | null }) {
  const now = new Date();
  if (acc.subscriptionStatus === "active" && acc.subscriptionExpiresAt && acc.subscriptionExpiresAt > now) return true;
  if (acc.subscriptionStatus === "trial" && acc.trialEndsAt > now) return true;
  return false;
}

function statusFromScore(score: number): "red" | "yellow" | "green" {
  if (score < 40) return "red";
  if (score < 65) return "yellow";
  return "green";
}

// Middleware — exige un compte Pro existant (peu importe le statut)
// Utilisé pour /account, /subscribe (l'utilisateur doit pouvoir gérer son abo même expiré)
function requirePro(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ message: "Connexion requise" });
  getProAccountForUser(userId).then(acc => {
    if (!acc) return res.status(403).json({ message: "Compte Pro requis" });
    (req as any).proAccount = acc;
    (req as any).proActive = isProActive(acc);
    next();
  }).catch(err => {
    console.error("[requirePro] error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  });
}

// Middleware strict — exige un abonnement actif (essai non expiré OU abo payé valide)
// Bloque l'accès aux features métier (patients, scans, stats, pdf) après expiration
function requireActivePro(req: any, res: any, next: any) {
  requirePro(req, res, () => {
    if (!(req as any).proActive) {
      return res.status(402).json({
        code: "PRO_SUBSCRIPTION_REQUIRED",
        message: "Ton essai gratuit est terminé. Abonne-toi pour continuer (30 000 FCFA / mois).",
      });
    }
    next();
  });
}

// Recalcule status + lastScanAt d'un patient depuis ses scans restants
async function recomputePatientStatus(patientId: number) {
  const remaining = await db.select().from(scans).where(eq(scans.patientId, patientId)).orderBy(desc(scans.createdAt)).limit(1);
  if (remaining.length === 0) {
    await db.update(patients).set({ status: "green", lastScanAt: null }).where(eq(patients.id, patientId));
  } else {
    const latest = remaining[0];
    await db.update(patients).set({
      status: statusFromScore(latest.score || 50),
      lastScanAt: latest.createdAt,
    }).where(eq(patients.id, patientId));
  }
}

export function registerProRoutes(app: Express) {

  // ───────────────────────────────────────────
  // POST /api/pro/register — inscription dermato (crée user + pro_account)
  // ───────────────────────────────────────────
  app.post("/api/pro/register", async (req: any, res) => {
    try {
      const schema = z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        cabinetName: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        consent: z.literal(true),
      });
      const data = schema.parse(req.body);
      const emailLower = data.email.toLowerCase().trim();

      // 1. Vérifier email existant
      const [existing] = await db.select().from(users).where(eq(users.email, emailLower));
      let userId: string;
      if (existing) {
        // Si user existe déjà : vérifier mot de passe et ajouter compte Pro
        if (!existing.passwordHash || !(await bcrypt.compare(data.password, existing.passwordHash))) {
          return res.status(409).json({ message: "Cet email a déjà un compte. Mot de passe incorrect." });
        }
        userId = existing.id;
        const existingPro = await getProAccountForUser(userId);
        if (existingPro) {
          return res.status(409).json({ message: "Tu as déjà un compte Pro." });
        }
      } else {
        const passwordHash = await bcrypt.hash(data.password, 10);
        const [u] = await db.insert(users).values({
          email: emailLower,
          firstName: data.fullName,
          passwordHash,
        }).returning();
        userId = u.id;
      }

      // 2. Créer compte Pro
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const [acc] = await db.insert(proAccounts).values({
        userId,
        fullName: data.fullName,
        cabinetName: data.cabinetName || null,
        phone: data.phone || null,
        city: data.city || null,
        trialEndsAt,
        subscriptionStatus: "trial",
        consentSignedAt: new Date(),
      }).returning();

      // 3. Login session
      req.session.userId = userId;
      req.session.save((err: any) => {
        if (err) {
          console.error("[pro/register] session save:", err);
          return res.status(500).json({ message: "Erreur connexion" });
        }
        console.log(`[pro] ✅ Nouveau dermato Pro #${acc.id} — ${data.fullName} (${emailLower})`);
        // ── Tracking inscription DERM (non-bloquant) ──
        db.insert(pageVisits).values({
          page: "pro_register",
          sessionId: req.session?.id || null,
          country: null,
          city: null,
        }).catch(() => {});
        res.json({ success: true, account: acc });
      });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides", issues: err.issues });
      console.error("[pro/register] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/login — connexion dermato (alias auth/login + check pro)
  // ───────────────────────────────────────────
  app.post("/api/pro/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email et mot de passe requis" });
      const emailLower = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, emailLower));
      if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }
      const acc = await getProAccountForUser(user.id);
      if (!acc) return res.status(403).json({ message: "Aucun compte Pro lié à cet email. Inscris-toi d'abord." });

      req.session.userId = user.id;
      req.session.save((err: any) => {
        if (err) return res.status(500).json({ message: "Erreur session" });
        // ── Tracking connexion DERM (non-bloquant) ──
        db.insert(pageVisits).values({
          page: "pro_login",
          sessionId: req.session?.id || null,
          country: null,
          city: null,
        }).catch(() => {});
        res.json({ success: true, account: acc });
      });
    } catch (err) {
      console.error("[pro/login] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/account — compte Pro de l'utilisateur connecté
  // ───────────────────────────────────────────
  app.get("/api/pro/account", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    const acc = await getProAccountForUser(userId);
    if (!acc) return res.json({ account: null });
    const active = isProActive(acc);
    const daysLeft = acc.subscriptionStatus === "trial"
      ? Math.max(0, Math.ceil((acc.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;
    const isAdmin = (req.session as any)?.isAdmin === true;
    res.json({ account: acc, active, daysLeftTrial: daysLeft, isAdmin });
  });

  // ───────────────────────────────────────────
  // PATCH /api/pro/account — mise à jour profil cabinet
  // ───────────────────────────────────────────
  app.patch("/api/pro/account", requirePro, async (req: any, res) => {
    try {
      const schema = z.object({
        fullName: z.string().min(2).optional(),
        cabinetName: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        onboardingDone: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const [updated] = await db.update(proAccounts).set(data).where(eq(proAccounts.id, req.proAccount.id)).returning();
      res.json({ account: updated });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides" });
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/patients — liste avec recherche
  // ───────────────────────────────────────────
  app.get("/api/pro/patients", requireActivePro, async (req: any, res) => {
    try {
      const q = (req.query.q as string || "").trim().toLowerCase();
      const list = await db.select().from(patients)
        .where(eq(patients.dermatologistId, req.proAccount.id))
        .orderBy(desc(patients.lastScanAt), desc(patients.createdAt));
      const filtered = q
        ? list.filter(p =>
            (p.firstName + " " + p.lastName).toLowerCase().includes(q) ||
            (p.whatsappNumber || "").includes(q))
        : list;
      res.json({ patients: filtered });
    } catch (err) {
      console.error("[pro/patients list] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/patients — créer patient
  // ───────────────────────────────────────────
  app.post("/api/pro/patients", requireActivePro, async (req: any, res) => {
    try {
      const schema = insertPatientSchema.extend({
        dermatologistId: z.number().optional(),
      });
      const parsed = schema.parse({ ...req.body, dermatologistId: req.proAccount.id });
      const [p] = await db.insert(patients).values({
        ...parsed,
        dermatologistId: req.proAccount.id,
      }).returning();
      res.json({ patient: p });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides", issues: err.issues });
      console.error("[pro/patients create] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/patients/:id — dossier complet patient
  // ───────────────────────────────────────────
  app.get("/api/pro/patients/:id", requireActivePro, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const [p] = await db.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
    if (!p) return res.status(404).json({ message: "Patient introuvable" });
    const patientScans = await db.select().from(scans)
      .where(eq(scans.patientId, id))
      .orderBy(desc(scans.createdAt));
    res.json({ patient: p, scans: patientScans });
  });

  // ───────────────────────────────────────────
  // PATCH /api/pro/patients/:id — modifier patient
  // ───────────────────────────────────────────
  app.patch("/api/pro/patients/:id", requireActivePro, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
    if (!existing) return res.status(404).json({ message: "Patient introuvable" });
    const schema = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      age: z.number().nullable().optional(),
      sex: z.string().nullable().optional(),
      whatsappNumber: z.string().nullable().optional(),
      photoUrl: z.string().nullable().optional(),
      status: z.enum(["priority", "monitoring", "stable", "resolved"]).optional(),
    });
    const data = schema.parse(req.body);
    const [updated] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    res.json({ patient: updated });
  });

  // ───────────────────────────────────────────
  // DELETE /api/pro/patients/:id
  // ───────────────────────────────────────────
  app.delete("/api/pro/patients/:id", requireActivePro, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
    if (!existing) return res.status(404).json({ message: "Patient introuvable" });
    // Détacher les scans (on garde le diagnostic mais on enlève la liaison patient).
    // Pas de recompute car le patient est supprimé juste après.
    await db.update(scans).set({ patientId: null }).where(eq(scans.patientId, id));
    await db.delete(patients).where(eq(patients.id, id));
    res.json({ success: true });
  });

  // ───────────────────────────────────────────
  // POST /api/pro/scans/:id/attach — rattacher un scan à un patient + contexte clinique
  // (appelé après /api/analyze pour finaliser le dossier patient Pro)
  // ───────────────────────────────────────────
  app.post("/api/pro/scans/:id/attach", requireActivePro, async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const schema = z.object({
        patientId: z.number(),
        clinicalContext: z.record(z.any()).optional(),
        dermatoNote: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);

      // Vérifier patient appartient bien au dermato
      const [p] = await db.select().from(patients)
        .where(and(eq(patients.id, data.patientId), eq(patients.dermatologistId, req.proAccount.id)));
      if (!p) return res.status(404).json({ message: "Patient introuvable" });

      // Récupérer scan pour calcul statut
      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));
      if (!scan) return res.status(404).json({ message: "Scan introuvable" });

      // === Sécurité multi-tenant : un dermato ne peut rattacher qu'un scan
      // dont il est lui-même le user (vient de faire l'analyse) OU un scan
      // anonyme issu STRICTEMENT de sa propre session courante. Empêche un
      // pro de deviner un ID de scan anonyme d'un autre visiteur. ===
      const isOwnScan = scan.userId && scan.userId === req.session.userId;
      const isOwnAnonymousScan = !scan.userId && scan.sessionId && scan.sessionId === req.session.id;
      if (!isOwnScan && !isOwnAnonymousScan) {
        return res.status(403).json({ message: "Ce scan ne vous appartient pas" });
      }

      // Si scan déjà rattaché à un autre patient du même dermato, on recompute son statut
      const previousPatientId = scan.patientId;

      // Rattacher scan + sauver contexte
      await db.update(scans).set({
        patientId: data.patientId,
        clinicalContext: data.clinicalContext || null,
        dermatoNote: data.dermatoNote || null,
        userId: req.session.userId, // rattacher au user dermato
      }).where(eq(scans.id, scanId));

      // Recompute statut de l'ancien patient si on a déplacé le scan
      if (previousPatientId && previousPatientId !== data.patientId) {
        await recomputePatientStatus(previousPatientId);
      }

      // Mettre à jour statut + lastScanAt patient
      const newStatus = statusFromScore(scan.score || 50);
      await db.update(patients).set({
        status: newStatus,
        lastScanAt: new Date(),
      }).where(eq(patients.id, data.patientId));

      res.json({ success: true, status: newStatus });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides" });
      console.error("[pro/scans/attach] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/scans/:id/validate — validation dermato → RLHF dataset
  // ───────────────────────────────────────────
  app.post("/api/pro/scans/:id/validate", requireActivePro, async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const schema = z.object({
        isVerified: z.boolean(),
        expertNote: z.string().optional().nullable(),
        expertCorrectedCondition: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);

      // === Sécurité multi-tenant : on ne peut valider que les scans rattachés
      // à un de ses propres patients. Empêche pollution croisée du dataset RLHF. ===
      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));
      if (!scan) return res.status(404).json({ message: "Scan introuvable" });
      if (!scan.patientId) return res.status(403).json({ message: "Scan non rattaché à un patient" });
      const [pat] = await db.select().from(patients)
        .where(and(eq(patients.id, scan.patientId), eq(patients.dermatologistId, req.proAccount.id)));
      if (!pat) return res.status(403).json({ message: "Ce scan ne vous appartient pas" });

      const [updated] = await db.update(scans).set({
        isVerified: data.isVerified,
        expertNote: data.expertNote || null,
        expertCorrectedCondition: data.expertCorrectedCondition || null,
        expertReviewer: req.proAccount.fullName,
        expertReviewedAt: new Date(),
      }).where(eq(scans.id, scanId)).returning();
      console.log(`[pro/rlhf] 🩺 Scan #${scanId} ${data.isVerified ? "VALIDÉ" : "REJETÉ"} par ${req.proAccount.fullName} → dataset`);
      res.json({ scan: updated });
    } catch (err) {
      console.error("[pro/scans/validate] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/stats — KPIs cabinet
  // ───────────────────────────────────────────
  app.get("/api/pro/stats", requireActivePro, async (req: any, res) => {
    try {
      const dermatoId = req.proAccount.id;

      const allPatients = await db.select().from(patients).where(eq(patients.dermatologistId, dermatoId));
      const patientIds = allPatients.map(p => p.id);

      let allScans: typeof scans.$inferSelect[] = [];
      if (patientIds.length > 0) {
        allScans = await db.select().from(scans).where(
          sql`${scans.patientId} = ANY(${sql.raw(`ARRAY[${patientIds.join(",")}]::int[]`)})`
        );
      }

      // Top conditions
      const condCount: Record<string, number> = {};
      const productCount: Record<string, number> = {};
      let totalScore = 0; let scoreCount = 0;
      for (const s of allScans) {
        const cond = s.expertCorrectedCondition || s.condition || "Inconnu";
        condCount[cond] = (condCount[cond] || 0) + 1;
        if (typeof s.score === "number") { totalScore += s.score; scoreCount++; }
        const recs = s.recommendations as any;
        if (recs?.products && Array.isArray(recs.products)) {
          for (const p of recs.products) {
            const name = String(p).split("(")[0].trim().substring(0, 60);
            if (name) productCount[name] = (productCount[name] || 0) + 1;
          }
        }
      }
      const topConditions = Object.entries(condCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
      const topProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      // Consultations par mois (12 derniers mois)
      const monthly: Record<string, number> = {};
      for (const s of allScans) {
        if (!s.createdAt) continue;
        const k = s.createdAt.toISOString().slice(0, 7); // YYYY-MM
        monthly[k] = (monthly[k] || 0) + 1;
      }
      const monthlyArr = Object.entries(monthly).sort().slice(-12).map(([month, count]) => ({ month, count }));

      res.json({
        totalPatients: allPatients.length,
        totalScans: allScans.length,
        avgGlowScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
        topConditions,
        topProducts,
        monthly: monthlyArr,
        statusBreakdown: {
          red: allPatients.filter(p => p.status === "red").length,
          yellow: allPatients.filter(p => p.status === "yellow").length,
          green: allPatients.filter(p => p.status === "green").length,
        },
      });
    } catch (err) {
      console.error("[pro/stats] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/patients/:id/pdf — rapport HTML imprimable (PDF via Ctrl+P)
  // ───────────────────────────────────────────
  app.get("/api/pro/patients/:id/pdf", requireActivePro, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [p] = await db.select().from(patients)
        .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
      if (!p) return res.status(404).send("Patient introuvable");
      const patientScans = await db.select().from(scans).where(eq(scans.patientId, id)).orderBy(desc(scans.createdAt));

      const dermato = req.proAccount;
      const today = new Date().toLocaleDateString("fr-FR");

      const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8"><title>Dossier ${p.firstName} ${p.lastName}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color: #1a1a1a; max-width: 900px; margin: 24px auto; padding: 24px; }
  h1 { color: #be185d; border-bottom: 3px solid #ec4899; padding-bottom: 8px; }
  h2 { color: #be185d; margin-top: 32px; border-left: 4px solid #ec4899; padding-left: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .scan { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 12px 0; page-break-inside: avoid; }
  .scan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .meta { color: #6b7280; font-size: 12px; }
  .label { font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: bold; letter-spacing: 0.05em; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
  .print-btn { background: #ec4899; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style></head>
<body>
<button class="print-btn" onclick="window.print()">📄 Imprimer / Sauver en PDF</button>
<div class="header">
  <div>
    <h1>Dossier médical — ${p.firstName} ${p.lastName}</h1>
    <p class="meta">${p.age ? `${p.age} ans · ` : ""}${p.sex || ""}${p.whatsappNumber ? ` · WhatsApp : ${p.whatsappNumber}` : ""}</p>
  </div>
  <div style="text-align: right;">
    <p><strong>${dermato.fullName}</strong></p>
    ${dermato.cabinetName ? `<p class="meta">${dermato.cabinetName}</p>` : ""}
    ${dermato.city ? `<p class="meta">${dermato.city}</p>` : ""}
    <p class="meta">Édité le ${today}</p>
  </div>
</div>
<p>Statut : <span class="badge badge-${p.status || "green"}">${p.status === "red" ? "🔴 Cas urgent" : p.status === "yellow" ? "🟡 À surveiller" : "🟢 Évolution positive"}</span></p>
<h2>Historique des analyses (${patientScans.length})</h2>
${patientScans.map(s => `
  <div class="scan">
    <div class="scan-header">
      <div><strong>${s.condition || "Sans diagnostic"}</strong></div>
      <div class="meta">${s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR") : ""} · GS-${String(s.id).padStart(4, "0")}</div>
    </div>
    <p><span class="label">Glow Score</span> &nbsp; <strong>${s.score || 0}/100</strong> &nbsp; — &nbsp; <span class="label">Zone</span> ${s.area}</p>
    ${s.expertCorrectedCondition ? `<p><span class="label">Correction dermato</span> &nbsp; ${s.expertCorrectedCondition}</p>` : ""}
    ${s.analysis ? `<p><span class="label">Analyse</span><br>${s.analysis}</p>` : ""}
    ${s.dermatoNote ? `<p><span class="label">Note du dermato</span><br><em>${s.dermatoNote}</em></p>` : ""}
    ${s.expertNote ? `<p><span class="label">Note de validation</span><br><em>${s.expertNote}</em></p>` : ""}
    ${s.isVerified ? `<p><span class="badge badge-green">✓ Validé pour le dataset GlowScan</span></p>` : ""}
  </div>
`).join("")}
${patientScans.length === 0 ? '<p class="meta">Aucune analyse enregistrée.</p>' : ""}
<div class="footer">
  Document généré par GlowScan Pro — ${dermato.fullName}<br>
  Confidentiel · Document médical
</div>
<script>setTimeout(() => window.print(), 600);</script>
</body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) {
      console.error("[pro/pdf] error:", err);
      res.status(500).send("Erreur serveur");
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/subscribe — demande de paiement abonnement Pro 20k FCFA
  // (réutilise premiumRequests avec method=mtn_momo / orange_money)
  // ───────────────────────────────────────────
  app.post("/api/pro/subscribe", requirePro, async (req: any, res) => {
    try {
      const { method, phone } = req.body;
      if (!method || !phone) return res.status(400).json({ message: "Méthode et téléphone requis" });
      const userId = req.session.userId;

      const [existing] = await db.select().from(premiumRequests)
        .where(and(eq(premiumRequests.userId, userId), eq(premiumRequests.status, "pending")))
        .limit(1);
      if (existing) return res.json({ success: true, request: existing, alreadyPending: true });

      const ref = "PRO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const [request] = await db.insert(premiumRequests).values({
        userId,
        reference: ref,
        method,
        phone,
        amount: PRO_PRICE_FCFA,
        status: "pending",
        note: "GlowScan Pro — Abonnement dermato 30k FCFA/mois",
      }).returning();

      const msg = encodeURIComponent(
        `🩺 Nouvel abonnement GlowScan PRO\n\n` +
        `👨‍⚕️ Dermato : ${req.proAccount.fullName}\n` +
        `📱 Tel : ${phone}\n` +
        `💰 Méthode : ${method === "mtn_momo" ? "MTN MoMo" : "Orange Money"}\n` +
        `🔑 Référence : ${ref}\n` +
        `💵 Montant : ${PRO_PRICE_FCFA} FCFA\n\n` +
        `➡️ Confirmer dans le dashboard Admin`
      );
      const ownerWaUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${msg}`;
      res.json({ success: true, request, ownerWaUrl });
    } catch (err) {
      console.error("[pro/subscribe] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/questionnaire/generate
  // Génère un questionnaire d'anamnèse oui/non/NSP via IA
  // selon la condition pré-détectée. Cache 24h par condition.
  // Body: { condition: string, area?: string, patientAge?: number, patientSex?: string }
  // ───────────────────────────────────────────
  app.post("/api/pro/questionnaire/generate", requireActivePro, async (req: any, res) => {
    try {
      const schema = z.object({
        condition: z.string().min(1).max(200),
        area: z.string().optional().default("face"),
        patientAge: z.number().nullable().optional(),
        patientSex: z.string().nullable().optional(),
      });
      const { condition, area, patientAge, patientSex } = schema.parse(req.body);

      const key = cacheKey(condition, area || "face");
      const cached = questionnaireCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json({ items: cached.items, cached: true });
      }

      const ageStr = patientAge ? `${patientAge} ans` : "âge non précisé";
      const sexStr = patientSex && patientSex !== "—" ? patientSex : "non précisé";

      const prompt = `Tu es dermatologue clinicien spécialisé peaux noires/mélanisées (Cameroun, Afrique centrale).
Ton patient (${ageStr}, sexe ${sexStr}) présente : "${condition}" sur la zone ${area}.
Génère 7 questions d'anamnèse OUI/NON/NSP que je dois poser au patient pour préciser le diagnostic et adapter le traitement.

Couvre OBLIGATOIREMENT ces axes (1 question par axe quand pertinent) :
1. Antécédents personnels de la même affection (eczéma, acné, mélasma, etc.)
2. Médicaments en cours (corticoïdes, contraceptifs, antibiotiques, traitement éclaircissant)
3. Allergies connues (cosmétiques, pollens, alimentaires)
4. Durée d'évolution (récent < 1 mois OU chronique > 3 mois)
5. Usage actuel de corticoïdes locaux ou de produits éclaircissants (hydroquinone, savons)
6. Antécédents familiaux (parent au 1er degré avec même affection)
7. Facteurs aggravants identifiés (soleil, stress, règles, alimentation, sueur, traction capillaire)

Format JSON strict :
{ "items": [
  { "id": "atcd_perso", "label": "Avez-vous déjà eu cette affection par le passé ?", "axis": "antécédents" },
  ...
] }

Règles :
- Questions courtes (max 12 mots), formulées au patient (vouvoiement).
- 0 question à choix multiples, 0 texte libre — UNIQUEMENT oui/non/NSP côté UI.
- Vocabulaire français accessible, évite le jargon.
- Adapte aux pratiques locales (savons éclaircissants, défrisage, tresses serrées).
- Retourne exactement 7 items.`;

      let items: any[] = [];
      try {
        let raw = "{}";
        if (PRO_USE_GEMINI && proGemini) {
          const m = proGemini.getGenerativeModel({ model: PRO_AI_MODEL });
          const gemResult = await Promise.race([
            m.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 700,
                temperature: 0.3,
              },
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000)),
          ]);
          raw = gemResult.response.text() || "{}";
        } else if (proOpenai) {
          const completion = await proOpenai.chat.completions.create({
            model: PRO_AI_MODEL,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 700,
          });
          raw = completion.choices[0]?.message?.content || "{}";
        }
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed.items) ? parsed.items : [];
      } catch (err: any) {
        console.warn("[pro/questionnaire] IA indisponible, fallback générique:", err?.message);
      }

      // Fallback si l'IA n'a rien renvoyé d'exploitable
      if (items.length < 5) {
        items = [
          { id: "atcd_perso", label: "Avez-vous déjà eu cette affection par le passé ?", axis: "antécédents" },
          { id: "meds", label: "Prenez-vous actuellement un traitement médical ?", axis: "médicaments" },
          { id: "allergies", label: "Avez-vous des allergies cutanées connues ?", axis: "allergies" },
          { id: "duree", label: "Cette affection date-t-elle de plus de 3 mois ?", axis: "durée" },
          { id: "cortico", label: "Utilisez-vous une crème à base de corticoïdes ?", axis: "corticoïdes" },
          { id: "atcd_familial", label: "Un parent proche a-t-il la même affection ?", axis: "famille" },
          { id: "aggravation", label: "Y a-t-il un facteur déclenchant (soleil, stress, règles) ?", axis: "facteurs aggravants" },
        ];
      }

      // Normaliser
      items = items.slice(0, 8).map((it: any, i: number) => ({
        id: String(it.id || `q${i + 1}`),
        label: String(it.label || it.question || `Question ${i + 1}`),
        axis: String(it.axis || "général"),
      }));

      questionnaireCache.set(key, { items, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      res.json({ items, cached: false });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Paramètres invalides" });
      console.error("[pro/questionnaire/generate] error:", err);
      res.status(500).json({ message: "Erreur génération questionnaire" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // POST /api/pro/pdf-upload
  // Reçoit un PDF en base64, le stocke en mémoire 24h, retourne une URL publique.
  // Body : { pdfBase64: string, filename?: string }
  // ───────────────────────────────────────────────────────────────────────
  app.post("/api/pro/pdf-upload", requirePro, async (req: any, res) => {
    try {
      const { pdfBase64, filename } = req.body as { pdfBase64?: string; filename?: string };
      if (!pdfBase64) return res.status(400).json({ message: "pdfBase64 requis" });

      // Décoder le base64 (supporte "data:application/pdf;base64,..." ou base64 brut)
      const raw = pdfBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(raw, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(413).json({ message: "PDF trop volumineux (max 10 Mo)" });
      }

      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      tempPdfs.set(id, {
        data: buffer,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        filename: (filename || "rapport-glowscan.pdf").replace(/[^a-zA-Z0-9._-]/g, "_"),
      });

      res.json({ url: `/api/pro/pdf-temp/${id}` });
    } catch (err) {
      console.error("[pro/pdf-upload] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // GET /api/pro/pdf-temp/:id  — route publique (UUID = secret)
  // Sert le PDF stocké en mémoire. Expire après 24h.
  // ───────────────────────────────────────────────────────────────────────
  app.get("/api/pro/pdf-temp/:id", (req: any, res) => {
    const entry = tempPdfs.get(req.params.id);
    if (!entry || entry.expiresAt < Date.now()) {
      tempPdfs.delete(req.params.id);
      return res.status(404).json({ message: "PDF non trouvé ou expiré" });
    }
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="${entry.filename}"`);
    res.set("Cache-Control", "no-store");
    res.send(entry.data);
  });

  // Generate QR code for scan results (patient portal)
  app.get("/api/pro/scans/:id/qrcode", async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const patientId = req.query.patientId || "scan";

      // QR code content: link to patient results portal
      const qrUrl = `https://glow-scan.com/patient/${patientId}/results/${scanId}`;

      // Generate QR code as SVG
      const svgString = await QRCode.toString(qrUrl, {
        type: "image/svg+xml",
        width: 200,
        margin: 2,
        color: {
          dark: "#7c3aed",
          light: "#f9f7ff",
        },
      });

      res.set("Content-Type", "image/svg+xml");
      res.send(svgString);
    } catch (err) {
      console.error("❌ QR code generation failed:", err);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Clinical Override: save doctor's correction to AI diagnosis
  app.post("/api/pro/scans/:id/override", requireActivePro, async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const { overrideMode, condition, score, explanation } = req.body;

      const [scan] = await db
        .select()
        .from(scans)
        .where(eq(scans.id, scanId));

      if (!scan) {
        return res.status(404).json({ message: "Scan non trouvé" });
      }

      // Verify ownership
      const isOwn =
        (scan.userId && scan.userId === req.session.userId) ||
        (!scan.userId && scan.sessionId === req.session.id);
      if (!isOwn) {
        return res.status(403).json({ message: "Ce scan ne vous appartient pas" });
      }

      // Update scan with override
      if (overrideMode !== "none") {
        await db
          .update(scans)
          .set({
            expertCorrectedCondition: condition,
            expertNote: explanation,
            expertReviewer: req.session.userEmail || "Unknown",
            expertReviewedAt: new Date(),
            // Update score if override
            score: score || scan.score,
          })
          .where(eq(scans.id, scanId));

        // Emit WebSocket event
        const { emitToPatient, emitToScan } = await import("./ws");
        if (scan.patientId) {
          emitToPatient(scan.patientId, "scan:override-applied", {
            scanId,
            condition,
            score,
            explanation,
          });
        }
        emitToScan(scanId, "scan:override-applied", { condition, score });
      }

      res.json({
        success: true,
        message: "Override sauvegardé",
        scanId,
      });
    } catch (err) {
      console.error("❌ Override save failed:", err);
      res.status(500).json({ message: "Erreur lors de la sauvegarde" });
    }
  });
}
