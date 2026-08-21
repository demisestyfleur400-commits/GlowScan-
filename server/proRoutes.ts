import type { Express } from "express";
import { db } from "./db";
import { proAccounts, patients, scans, premiumRequests, users, secretaryAccounts, insertProAccountSchema, insertPatientSchema, insertSecretaryAccountSchema, pageVisits, trainingData, consultations } from "@shared/schema";
import { eq, and, desc, sql, count, gte, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import QRCode from "qrcode";
import { emitToPatient, emitToUser } from "./ws";
import { deliverConsultationReport, sendWhatsAppText, buildFollowUpReminderMessage, whatsappDeepLink } from "./whatsapp";
import { uploadScanImageToStorage } from "./routes";

// Version des Conditions d'utilisation & Politique de confidentialité DERM en vigueur.
// Le dermatologue (responsable de la plateforme) les accepte à l'inscription.
// Incrémenter à chaque modification du texte (preuve opposable de la version acceptée).
const TERMS_VERSION = "v1-2026-07";

// Même logique provider que routes.ts : Groq > Gemini > OpenAI
const _proGroqKey   = process.env.GROQ_API_KEY || "";
const _proGeminiKey = process.env.GEMINI_API_KEY || "";
const _proOpenaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
const _proOpenaiBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;
// Même sélection que routes.ts : override AI_PROVIDER, sinon Groq prioritaire.
const _proForce = (process.env.AI_PROVIDER || "").toLowerCase();
let PRO_USE_GROQ = false, PRO_USE_GEMINI = false;
if (_proForce === "groq" && _proGroqKey) PRO_USE_GROQ = true;
else if (_proForce === "gemini" && _proGeminiKey) PRO_USE_GEMINI = true;
else if (_proForce === "openai" && _proOpenaiKey) { /* openai */ }
else if (_proGeminiKey) PRO_USE_GEMINI = true;   // défaut : Gemini (aligné sur routes.ts)
else if (_proGroqKey) PRO_USE_GROQ = true;       // secours : Groq
// Questionnaire/aide DERM = TEXTE seul → modèle texte dédié (GROQ_TEXT_MODEL),
// INDÉPENDANT de GROQ_MODEL (qui porte le modèle VISION qwen). Évite qu'un
// modèle de raisonnement casse response_format sur les appels texte pro.
const PRO_GROQ_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const PRO_AI_MODEL   = PRO_USE_GROQ ? PRO_GROQ_MODEL
                     : PRO_USE_GEMINI ? (process.env.GEMINI_MODEL || "gemini-2.0-flash") : "gpt-4o-mini";

// Gemini native SDK (uniquement sans clé Groq)
const proGemini = PRO_USE_GEMINI ? new GoogleGenerativeAI(_proGeminiKey) : null;
// OpenAI SDK — Groq (prioritaire, gratuit, global) ou OpenAI standard
// ⚠️ CRITICAL: Groq needs 180s timeout (complex antecedents + image), OpenAI needs 60s
const proOpenai = !PRO_USE_GEMINI ? new OpenAI({
  apiKey:  PRO_USE_GROQ ? _proGroqKey : (_proOpenaiKey || "sk-missing"),
  baseURL: PRO_USE_GROQ ? "https://api.groq.com/openai/v1" : (_proOpenaiBase || undefined),
  timeout: PRO_USE_GROQ ? 180000 : 60000, // 3min for Groq, 1min for OpenAI
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

// ── Suivi évolution : comparaison IA J0 ↔ photo de contrôle ────────────────
function extractInlineImage(src: string): { mime: string; b64: string } | null {
  const m = (src || "").match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;
  return { mime: m[1].toLowerCase(), b64: m[2] };
}

const EVOLUTION_MODELS = Array.from(new Set([
  process.env.GEMINI_MODEL || "gemini-2.0-flash",
  "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b",
]));

async function compareEvolutionAI(opts: {
  condition: string;
  j0: { mime: string; b64: string } | null;
  jx: { mime: string; b64: string } | null;
  dayOffset: number;
}): Promise<{ evolutionScore: number; observation: string; recommendation: string }> {
  const fallback = {
    evolutionScore: 0,
    observation: "Comparaison automatique indisponible — évaluation clinique requise.",
    recommendation: "Poursuivre le suivi",
  };
  // Il faut au moins la photo de contrôle. Sans Gemini → fallback neutre.
  if (!proGemini || !opts.jx) return fallback;
  const prompt =
    `Tu es dermatologue. Compare l'évolution d'une lésion cutanée entre J0 (première photo) et ` +
    `J+${opts.dayOffset} (seconde photo). Diagnostic initial : "${opts.condition}". ` +
    `Réponds UNIQUEMENT en JSON : {"evolutionScore": number, "observation": string, "recommendation": string}. ` +
    `evolutionScore : -100 = nette aggravation, 0 = stable, +100 = guérison quasi complète. ` +
    `observation : une phrase factuelle en français (étendue, rougeur, desquamation, pigmentation, taille). ` +
    `recommendation : "continuer le traitement" | "ajuster le traitement" | "consulter en urgence" | courte phrase.`;
  const parts: any[] = [{ text: prompt }];
  if (opts.j0) {
    parts.push({ text: "PHOTO J0 :" }, { inlineData: { mimeType: opts.j0.mime, data: opts.j0.b64 } });
  } else {
    parts.push({ text: "(Photo J0 indisponible — évalue la photo de contrôle et l'aspect résiduel.)" });
  }
  parts.push({ text: `PHOTO J+${opts.dayOffset} :` }, { inlineData: { mimeType: opts.jx.mime, data: opts.jx.b64 } });

  for (const model of EVOLUTION_MODELS) {
    try {
      const m = proGemini.getGenerativeModel({ model });
      const r = await Promise.race([
        m.generateContent({
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 500, temperature: 0.2 },
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timeout")), 60000)),
      ]);
      const txt = (r as any).response.text() || "";
      const parsed = JSON.parse(txt);
      let score = Number(parsed.evolutionScore);
      if (!isFinite(score)) score = 0;
      score = Math.max(-100, Math.min(100, Math.round(score)));
      return {
        evolutionScore: score,
        observation: String(parsed.observation || fallback.observation).slice(0, 300),
        recommendation: String(parsed.recommendation || fallback.recommendation).slice(0, 120),
      };
    } catch (e: any) {
      const retriable = /429|quota|exhausted|404|not found|unavailable|overloaded|500|503|Timeout/i.test(String(e?.message || e));
      if (!retriable) break; // refus sécurité / requête invalide → inutile d'insister
    }
  }
  return fallback;
}

const OWNER_WHATSAPP = "237674377959";
const PRO_PRICE_FCFA = 10000;
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

// Met à jour users.last_login (SQL brut → ne dépend pas du schéma Drizzle ;
// no-op silencieux si la colonne n'existe pas encore). Fire-and-forget.
function touchLastLogin(userId: string) {
  db.execute(sql`UPDATE "users" SET "last_login" = now() WHERE "id" = ${userId}`).catch(() => {});
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
        message: "Ton essai gratuit est terminé. Abonne-toi pour continuer (10 000 FCFA / mois).",
      });
    }
    next();
  });
}

// Middleware — accès aux données patients d'un cabinet : autorisé au MÉDECIN
// propriétaire OU à une SECRÉTAIRE liée. Résout req.proAccount vers le compte du
// cabinet (celui du médecin) et exige qu'il soit actif. req.isSecretary = rôle.
function requireProAccess(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ message: "Connexion requise" });
  (async () => {
    // 1) Compte pro propre (médecin) ?
    let acc: any = await getProAccountForUser(userId);
    let isSecretary = false;
    if (!acc) {
      // 2) Sinon : secrétaire liée à un cabinet ?
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (u?.role === "secretary") {
        const [sec] = await db.select().from(secretaryAccounts).where(eq(secretaryAccounts.userId, userId));
        if (sec) {
          const [linked] = await db.select().from(proAccounts).where(eq(proAccounts.id, sec.proAccountId));
          if (linked) { acc = linked; isSecretary = true; }
        }
      }
    }
    if (!acc) return res.status(403).json({ message: "Accès cabinet requis" });
    if (!isProActive(acc)) {
      return res.status(402).json({ code: "PRO_SUBSCRIPTION_REQUIRED", message: "L'abonnement du cabinet est expiré." });
    }
    (req as any).proAccount = acc;
    (req as any).proActive = true;
    (req as any).isSecretary = isSecretary;
    next();
  })().catch(err => {
    console.error("[requireProAccess] error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  });
}

// Middleware — exige un utilisateur authentifié avec role "doctor"
// 🔑 SÉCURITÉ CRITIQUE : empêche les secrétaires d'appeler /api/analyze
function requireDoctor(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ message: "Authentification requise" });

  getProAccountForUser(userId).then((acc: any) => {
    // Récupérer l'utilisateur pour vérifier le rôle
    return db.select().from(users).where(eq(users.id, userId)).then(([u]) => {
      if (!u) return res.status(401).json({ message: "Utilisateur non trouvé" });

      // ✅ Vérifier que l'utilisateur est docteur
      if (u.role !== "doctor") {
        console.warn(`[security] ⚠️ Tentative non-autorisée par ${u.role} (${u.email}) sur /api/analyze`);
        return res.status(403).json({
          message: "Seules les dermatologues peuvent analyser",
          code: "DOCTOR_ONLY",
        });
      }

      // ✅ Vérifier qu'il a un compte Pro actif
      if (!acc || !isProActive(acc)) {
        return res.status(402).json({
          message: "Compte Pro requis pour analyser",
          code: "PRO_SUBSCRIPTION_REQUIRED",
        });
      }

      (req as any).proAccount = acc;
      next();
    });
  }).catch(err => {
    console.error("[requireDoctor] error:", err);
    res.status(500).json({ message: "Erreur serveur" });
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
        password: z.string().min(8), // 8 car. min pour des données médicales
        cabinetName: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        // Numéro d'ordre professionnel (ONMC) — persisté (pro_accounts.license_number),
        // à vérifier manuellement.
        licenseNumber: z.string().optional().nullable(),
        consent: z.literal(true),
        consentVersion: z.string().optional(), // version des CGU/Confidentialité acceptée
      });
      const data = schema.parse(req.body);
      const emailLower = data.email.toLowerCase().trim();
      if (data.licenseNumber) {
        console.log(`[pro/register] 🪪 Numéro d'ordre déclaré par ${emailLower} : ${data.licenseNumber} (à vérifier manuellement)`);
      }

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
          role: "doctor", // 🔑 Explicite : les dermatologues ont le rôle "doctor"
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
        licenseNumber: data.licenseNumber || null,
        trialEndsAt,
        subscriptionStatus: "trial",
        consentSignedAt: new Date(),
      }).returning();

      // Pays — écrit en SQL brut (colonne hors schéma Drizzle, no-op si absente)
      if (data.country) {
        db.execute(sql`UPDATE "pro_accounts" SET "country" = ${data.country} WHERE "id" = ${acc.id}`).catch(() => {});
      }
      // Version des Conditions & Confidentialité acceptée (preuve opposable, SQL brut)
      db.execute(sql`UPDATE "pro_accounts" SET "consent_version" = ${data.consentVersion || TERMS_VERSION} WHERE "id" = ${acc.id}`).catch(() => {});

      // 3. Login session
      req.session.userId = userId; touchLastLogin(userId);
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
      if (!acc) {
        // Secrétaire : pas de compte pro propre, mais accès autorisé si liée à un cabinet
        if (user.role === "secretary") {
          req.session.userId = user.id; touchLastLogin(user.id);
          return req.session.save((err: any) => {
            if (err) return res.status(500).json({ message: "Erreur session" });
            res.json({ success: true, role: "secretary" });
          });
        }
        return res.status(403).json({ message: "Aucun compte Pro lié à cet email. Inscris-toi d'abord." });
      }

      req.session.userId = user.id; touchLastLogin(user.id);
      req.session.save((err: any) => {
        if (err) return res.status(500).json({ message: "Erreur session" });
        // ── Tracking connexion DERM (non-bloquant) ──
        db.insert(pageVisits).values({
          page: "pro_login",
          sessionId: req.session?.id || null,
          country: null,
          city: null,
        }).catch(() => {});
        res.json({ success: true, account: acc, role: "doctor" });
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

    // Récupérer les infos de l'utilisateur (incluant son rôle)
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    const acc = await getProAccountForUser(userId);
    if (!acc) {
      return res.json({
        account: null,
        user: user ? { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName } : null,
      });
    }

    const active = isProActive(acc);
    const daysLeft = acc.subscriptionStatus === "trial"
      ? Math.max(0, Math.ceil((acc.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;
    const isAdmin = (req.session as any)?.isAdmin === true;

    // Opt-in consultation B2C (colonnes hors schéma Drizzle → lues en SQL brut).
    let b2cAvailable = false, consultPriceFcfa = 3500;
    try {
      const r: any = await db.execute(sql`SELECT b2c_available, consult_price_fcfa FROM pro_accounts WHERE id = ${acc.id}`);
      const row = (r?.rows ?? r ?? [])[0];
      if (row) { b2cAvailable = row.b2c_available === true; consultPriceFcfa = Number(row.consult_price_fcfa) || 3500; }
    } catch {}

    res.json({
      account: { ...acc, b2cAvailable, consultPriceFcfa },
      active,
      daysLeftTrial: daysLeft,
      isAdmin,
      user: user ? { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName } : null,
    });
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
        country: z.string().nullable().optional(),
        licenseNumber: z.string().nullable().optional(),
        onboardingDone: z.boolean().optional(),
        // Opt-in consultation B2C (hors schéma Drizzle → SQL brut)
        b2cAvailable: z.boolean().optional(),
        consultPriceFcfa: z.number().int().min(0).max(1000000).optional(),
      });
      const data = schema.parse(req.body);
      // country / opt-in B2C sont hors schéma Drizzle → écrits en SQL brut, séparément.
      const { country, b2cAvailable, consultPriceFcfa, ...drizzleData } = data;
      // db.update().set({}) plante avec un objet vide → on ne met à jour que s'il y a
      // des champs Drizzle. Sinon on récupère le compte tel quel.
      let updated: any;
      if (Object.keys(drizzleData).length > 0) {
        [updated] = await db.update(proAccounts).set(drizzleData).where(eq(proAccounts.id, req.proAccount.id)).returning();
      } else {
        [updated] = await db.select().from(proAccounts).where(eq(proAccounts.id, req.proAccount.id));
      }
      if (country !== undefined) {
        await db.execute(sql`UPDATE "pro_accounts" SET "country" = ${country} WHERE "id" = ${req.proAccount.id}`).catch(() => {});
      }
      if (b2cAvailable !== undefined) {
        await db.execute(sql`UPDATE "pro_accounts" SET "b2c_available" = ${b2cAvailable} WHERE "id" = ${req.proAccount.id}`).catch(() => {});
      }
      if (consultPriceFcfa !== undefined) {
        await db.execute(sql`UPDATE "pro_accounts" SET "consult_price_fcfa" = ${consultPriceFcfa} WHERE "id" = ${req.proAccount.id}`).catch(() => {});
      }
      res.json({ account: { ...updated, country: country !== undefined ? country : (updated as any).country, b2cAvailable, consultPriceFcfa } });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides" });
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/patients — liste avec recherche
  // ───────────────────────────────────────────
  app.get("/api/pro/patients", requireProAccess, async (req: any, res) => {
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
  // GET /api/pro/pending-patients — patients en attente d'analyse
  // ───────────────────────────────────────────
  app.get("/api/pro/pending-patients", requireProAccess, async (req: any, res) => {
    try {
      const list = await db.select().from(patients)
        .where(and(
          eq(patients.dermatologistId, req.proAccount.id),
          eq(patients.intakePending, true)
        ))
        .orderBy(desc(patients.createdAt));
      res.json({
        patients: list,
        count: list.length
      });
    } catch (err) {
      console.error("[pro/pending-patients] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/patients — créer patient
  // ───────────────────────────────────────────
  app.post("/api/pro/patients", requireProAccess, async (req: any, res) => {
    try {
      const schema = insertPatientSchema.extend({
        dermatologistId: z.number().optional(),
        clinicalRecord: z.any().optional(), // dossier clinique structuré (hors schéma Drizzle)
      });
      const parsed = schema.parse({ ...req.body, dermatologistId: req.proAccount.id });
      const { clinicalRecord, ...patientData } = parsed as any;
      const [p] = await db.insert(patients).values({
        ...patientData,
        dermatologistId: req.proAccount.id,
      }).returning();
      if (clinicalRecord && typeof clinicalRecord === "object") {
        db.execute(sql`UPDATE "patients" SET "clinical_record" = ${JSON.stringify(clinicalRecord)}::jsonb WHERE "id" = ${p.id}`).catch(() => {});
      }
      res.json({ patient: p });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides", issues: err.issues });
      console.error("[pro/patients create] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/patients/:id/submit-for-review — secrétaire valide le dossier
  // ───────────────────────────────────────────
  app.post("/api/pro/patients/:id/submit-for-review", requireProAccess, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [existing] = await db.select().from(patients)
        .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
      if (!existing) return res.status(404).json({ message: "Patient introuvable" });

      // Marquer le patient comme en attente d'analyse
      await db.update(patients).set({
        intakePending: true,
      }).where(eq(patients.id, id));

      // 🔴 Notification WebSocket : le nouveau dossier arrive dans la queue du médecin
      emitToPatient(id, "patient:pending-added", {
        patientId: id,
        firstName: existing.firstName,
        lastName: existing.lastName,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, message: "Dossier envoyé pour analyse" });
    } catch (err) {
      console.error("[pro/patients/submit-for-review] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/patients/:id — dossier complet patient
  // ───────────────────────────────────────────
  app.get("/api/pro/patients/:id", requireProAccess, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const [p] = await db.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
    if (!p) return res.status(404).json({ message: "Patient introuvable" });
    // Dossier clinique (colonne hors schéma Drizzle) → lu en SQL brut et attaché.
    // Permet au médecin de REPRENDRE le dossier saisi par la secrétaire sans re-saisir.
    let clinicalRecord: any = null;
    let followUp: { followUpAt: string | null; followUpMessage: string | null; followUpReminderSent: boolean } = { followUpAt: null, followUpMessage: null, followUpReminderSent: false };
    try {
      const r: any = await db.execute(sql`SELECT "clinical_record", "follow_up_at", "follow_up_message", "follow_up_reminder_sent" FROM "patients" WHERE "id" = ${id}`);
      const row = (r?.rows ?? r ?? [])[0];
      clinicalRecord = row?.clinical_record ?? null;
      if (row) followUp = {
        followUpAt: row.follow_up_at ? new Date(row.follow_up_at).toISOString() : null,
        followUpMessage: row.follow_up_message ?? null,
        followUpReminderSent: row.follow_up_reminder_sent === true,
      };
    } catch {}
    const patientScans = await db.select().from(scans)
      .where(eq(scans.patientId, id))
      .orderBy(desc(scans.createdAt));
    // follow_up_photos hors schéma Drizzle → lu en SQL brut et fusionné par scan.
    let scansWithFollowUp = patientScans as any[];
    try {
      const ids = patientScans.map((s) => s.id);
      if (ids.length) {
        const r: any = await db.execute(sql`SELECT "id", "follow_up_photos" FROM "scans" WHERE "patient_id" = ${id}`);
        const rows = (r?.rows ?? r ?? []) as any[];
        const map = new Map<number, any>(rows.map((row) => [Number(row.id), row.follow_up_photos ?? []]));
        scansWithFollowUp = patientScans.map((s) => ({ ...s, followUpPhotos: map.get(s.id) ?? [] }));
      }
    } catch { /* colonne pas encore migrée → followUpPhotos absent, non bloquant */ }
    res.json({ patient: { ...p, clinicalRecord, ...followUp }, scans: scansWithFollowUp });
  });

  // ───────────────────────────────────────────
  // POST /api/pro/patients/:id/follow-up-reminder — programmer (ou envoyer tout de
  // suite) un rappel WhatsApp au patient pour une photo de contrôle (suivi évolution).
  // body: { date?: ISO, message?: string, sendNow?: boolean }
  // ───────────────────────────────────────────
  app.post("/api/pro/patients/:id/follow-up-reminder", requireActivePro, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({
        date: z.string().optional().nullable(),
        message: z.string().max(500).optional().nullable(),
        sendNow: z.boolean().optional(),
      });
      const data = schema.parse(req.body);

      const [p] = await db.select().from(patients)
        .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
      if (!p) return res.status(404).json({ message: "Patient introuvable" });

      const msg = buildFollowUpReminderMessage(
        [p.firstName, p.lastName].filter(Boolean).join(" ") || "cher patient",
        req.proAccount.fullName,
        data.message,
      );

      // Envoi immédiat
      if (data.sendNow) {
        const r = await sendWhatsAppText(p.whatsappNumber, msg);
        // Trace : rappel considéré envoyé, plus de re-programmation en attente.
        await db.execute(sql`UPDATE "patients" SET "follow_up_reminder_sent" = TRUE, "follow_up_message" = ${data.message || null} WHERE "id" = ${id}`).catch(() => {});
        return res.json({
          success: true,
          sent: r.ok,
          method: r.method,
          // Fallback manuel : lien wa.me si Twilio non configuré.
          waLink: r.ok ? null : (p.whatsappNumber ? whatsappDeepLink(p.whatsappNumber, msg) : null),
          error: r.ok ? undefined : r.error,
        });
      }

      // Programmation : le cron enverra à la date voulue.
      if (!data.date) return res.status(400).json({ message: "Date requise" });
      const when = new Date(data.date);
      if (isNaN(when.getTime())) return res.status(400).json({ message: "Date invalide" });
      await db.execute(sql`UPDATE "patients" SET "follow_up_at" = ${when.toISOString()}, "follow_up_message" = ${data.message || null}, "follow_up_reminder_sent" = FALSE WHERE "id" = ${id}`);
      res.json({ success: true, scheduledAt: when.toISOString() });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides" });
      console.error("[pro/follow-up-reminder] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // DELETE le rappel programmé
  app.delete("/api/pro/patients/:id/follow-up-reminder", requireActivePro, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [p] = await db.select().from(patients)
        .where(and(eq(patients.id, id), eq(patients.dermatologistId, req.proAccount.id)));
      if (!p) return res.status(404).json({ message: "Patient introuvable" });
      await db.execute(sql`UPDATE "patients" SET "follow_up_at" = NULL, "follow_up_reminder_sent" = FALSE WHERE "id" = ${id}`).catch(() => {});
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
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
  app.post("/api/pro/scans/:id/attach", requireProAccess, async (req: any, res) => {
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

      // Mettre à jour statut + lastScanAt patient + marquer comme analysé
      const newStatus = statusFromScore(scan.score || 50);
      await db.update(patients).set({
        status: newStatus,
        lastScanAt: new Date(),
        intakePending: false, // ✅ Analyse complétée, patient sort de "en attente"
      }).where(eq(patients.id, data.patientId));

      // 🔴 Émission WebSocket : notifier tous les clients connectés au patient
      // Le dermato voit IMMÉDIATEMENT le nouveau scan sans refresh
      emitToPatient(data.patientId, "scan:photo-captured", {
        scanId: scanId,
        patientId: data.patientId,
        status: newStatus,
        condition: scan.condition,
        score: scan.score,
        imageUrl: scan.imageUrl,
        attachedAt: new Date().toISOString(),
      });

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

      // ── Synchro dataset : le GOLD n'est attribué QUE sur validation RÉELLE du médecin ──
      // (auparavant tout scan DERM était "gold" par défaut, ce qui surévaluait la qualité).
      try {
        const corrected = (data.expertCorrectedCondition || "").trim();
        const isCorrection = !!corrected && corrected.toLowerCase() !== (scan.condition || "").trim().toLowerCase();
        let status: string, weight: number;
        if (!data.isVerified) { status = "rejected"; weight = 0; }
        else if (isCorrection) { status = "corrected"; weight = 4; }
        else { status = "validated"; weight = 3; }
        await db.update(trainingData).set({
          dermValidationStatus: status,
          finalStatus: status === "rejected" ? "rejected" : "validated",
          validatedBy: `doctor_${req.proAccount.id}`,
          validatedAt: new Date(),
          trainingWeight: weight,
          overrideReason: data.expertNote || null,
          groundTruth: data.isVerified ? { condition: corrected || scan.condition, correctedByDoctor: isCorrection, reviewer: req.proAccount.fullName } : null,
        }).where(eq(trainingData.scanId, scanId));
      } catch (dsErr) {
        console.error("[pro/rlhf] ⚠️ Synchro dataset non-bloquante:", dsErr instanceof Error ? dsErr.message : String(dsErr));
      }

      console.log(`[pro/rlhf] 🩺 Scan #${scanId} ${data.isVerified ? "VALIDÉ" : "REJETÉ"} par ${req.proAccount.fullName} → dataset (gold réel)`);
      res.json({ scan: updated });
    } catch (err) {
      console.error("[pro/scans/validate] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/scans/:id/follow-up — Suivi évolution : ajouter une photo de
  // contrôle à un scan (J0 = scan.imageUrl). L'IA compare J0 ↔ nouvelle photo et
  // renvoie score d'évolution + observation + recommandation. Stocké en JSONB.
  // ───────────────────────────────────────────
  app.post("/api/pro/scans/:id/follow-up", requireActivePro, async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const schema = z.object({
        image: z.string().min(10),          // data URL base64 de la photo de contrôle
        date: z.string().optional(),         // ISO date (défaut: maintenant)
        note: z.string().max(500).optional().nullable(),
      });
      const data = schema.parse(req.body);

      // Sécurité multi-tenant : le scan doit appartenir à un patient de ce dermato.
      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));
      if (!scan || !scan.patientId) return res.status(404).json({ message: "Scan introuvable" });
      const [p] = await db.select().from(patients)
        .where(and(eq(patients.id, scan.patientId), eq(patients.dermatologistId, req.proAccount.id)));
      if (!p) return res.status(403).json({ message: "Ce dossier ne vous appartient pas" });

      // Upload de la photo (EXIF nettoyé, anonymisée) → URL/data-url stockable.
      const photoUrl = await uploadScanImageToStorage(data.image);
      if (!photoUrl) return res.status(400).json({ message: "Image invalide" });

      // Historique existant + repère temporel J0 vs Jx.
      let existing: any[] = [];
      try {
        const r: any = await db.execute(sql`SELECT "follow_up_photos" FROM "scans" WHERE "id" = ${scanId}`);
        existing = (r?.rows ?? r ?? [])[0]?.follow_up_photos ?? [];
      } catch {}
      const when = data.date ? new Date(data.date) : new Date();
      const baseDate = scan.createdAt ? new Date(scan.createdAt) : when;
      const dayOffset = Math.max(0, Math.round((when.getTime() - baseDate.getTime()) / 86400000));

      // Comparaison IA J0 ↔ nouvelle photo (les deux en base64 si dispo).
      const j0b64 = extractInlineImage(scan.imageUrl || "");
      const jxb64 = extractInlineImage(data.image);
      const comparison = await compareEvolutionAI({
        condition: (scan.expertCorrectedCondition || scan.condition || "affection cutanée") as string,
        j0: j0b64, jx: jxb64, dayOffset,
      });

      const entry = {
        date: when.toISOString(),
        dayOffset,
        photoUrl,
        note: data.note || null,
        evolutionScore: comparison.evolutionScore,
        aiComparison: comparison.observation,
        recommendation: comparison.recommendation,
        createdAt: new Date().toISOString(),
      };
      const updated = [...(Array.isArray(existing) ? existing : []), entry];
      await db.execute(sql`UPDATE "scans" SET "follow_up_photos" = ${JSON.stringify(updated)}::jsonb WHERE "id" = ${scanId}`);

      res.json({ success: true, entry, followUpPhotos: updated });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides" });
      console.error("[pro/scans/follow-up] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/pending-validations — file d'attente : scans du dermato pas encore
  // validés (jamais revus). Sert à faire croître le volume de données GOLD réelles.
  // ───────────────────────────────────────────
  app.get("/api/pro/pending-validations", requireActivePro, async (req: any, res) => {
    try {
      const rows = await db.select({
        scanId: scans.id, patientId: scans.patientId, condition: scans.condition,
        createdAt: scans.createdAt, firstName: patients.firstName, lastName: patients.lastName,
      }).from(scans)
        .innerJoin(patients, eq(scans.patientId, patients.id))
        .where(and(
          eq(patients.dermatologistId, req.proAccount.id),
          eq(scans.isVerified, false),
          isNull(scans.expertReviewer),
          isNotNull(scans.condition),
        ))
        .orderBy(desc(scans.createdAt))
        .limit(50);
      res.json({ items: rows, count: rows.length });
    } catch (err) {
      console.error("[pro/pending-validations] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/consultations — consultations B2C reçues par ce dermatologue
  // ───────────────────────────────────────────
  app.get("/api/pro/consultations", requireProAccess, async (req: any, res) => {
    try {
      const rows = await db.select({
        id: consultations.id, userId: consultations.userId, status: consultations.status,
        paymentStatus: consultations.paymentStatus, condition: consultations.condition,
        imageUrl: consultations.imageUrl, unreadDoctor: consultations.unreadDoctor,
        lastMessageAt: consultations.lastMessageAt, createdAt: consultations.createdAt,
        priceFcfa: consultations.priceFcfa,
        patientFirstName: users.firstName, patientEmail: users.email,
      })
        .from(consultations)
        .leftJoin(users, eq(consultations.userId, users.id))
        .where(and(eq(consultations.proAccountId, req.proAccount.id), eq(consultations.paymentStatus, "paid")))
        .orderBy(desc(consultations.lastMessageAt), desc(consultations.createdAt))
        .limit(100);
      res.json({ consultations: rows });
    } catch (e) {
      res.json({ consultations: [] });
    }
  });

  // GET /api/pro/consultations/unread-count — badge nombre de messages non lus
  app.get("/api/pro/consultations/unread-count", requireProAccess, async (req: any, res) => {
    try {
      const rows = await db.select({ u: consultations.unreadDoctor }).from(consultations)
        .where(and(eq(consultations.proAccountId, req.proAccount.id), eq(consultations.paymentStatus, "paid")));
      const total = rows.reduce((a, r) => a + (r.u || 0), 0);
      res.json({ count: total });
    } catch (e) { res.json({ count: 0 }); }
  });

  // POST /api/pro/consultations/:id/to-patient — convertir une consultation
  // en dossier patient DERM (pour un vrai suivi). Retourne l'id du patient créé.
  app.post("/api/pro/consultations/:id/to-patient", requireProAccess, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.select().from(consultations)
        .where(and(eq(consultations.id, id), eq(consultations.proAccountId, req.proAccount.id)));
      if (!c) return res.status(404).json({ message: "Consultation introuvable" });
      const [u] = await db.select().from(users).where(eq(users.id, c.userId));
      const firstName = (u?.firstName || "Patient").toString().slice(0, 60);
      const [p] = await db.insert(patients).values({
        dermatologistId: req.proAccount.id,
        firstName,
        lastName: "(consultation en ligne)",
        intakePending: false,
      }).returning();

      // ── Chantier n°2 : boucle prédiction IA ↔ vérité terrain ──────────────
      // Le scan B2C d'origine (photo + diagnostic IA de la consultation) est
      // rattaché au dossier patient créé. Le dermato le retrouve dans le dossier,
      // peut le valider/corriger, et training_data récupère la ground truth du
      // MÊME individu. Sans ça, la prédiction B2C restait orpheline.
      if (c.scanId) {
        try {
          await db.update(scans)
            .set({ patientId: p.id })
            .where(and(eq(scans.id, c.scanId), sql`${scans.patientId} IS NULL`));
        } catch (linkErr) {
          console.warn("[pro/consultations to-patient] rattachement scan échoué:", (linkErr as any)?.message);
        }
      }

      res.json({ patientId: p.id, scanLinked: !!c.scanId });
    } catch (err) {
      console.error("[pro/consultations to-patient] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/pro/consultations/:id/close — le dermatologue clôture la consultation.
  // Le paiement lui est dû sous 24h (payout_status reste 'pending' jusqu'au virement).
  app.post("/api/pro/consultations/:id/close", requireProAccess, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.select().from(consultations)
        .where(and(eq(consultations.id, id), eq(consultations.proAccountId, req.proAccount.id)));
      if (!c) return res.status(404).json({ message: "Consultation introuvable" });
      await db.update(consultations).set({ status: "closed" }).where(eq(consultations.id, id));
      try { await db.execute(sql`UPDATE consultations SET closed_at = NOW() WHERE id = ${id}`); } catch {}
      // Notifier le patient (WS + push) : consultation terminée, invitation à noter.
      try { emitToUser(c.userId, "consultation:closed", { consultationId: id }); } catch {}
      // Livraison auto du rapport (push + WhatsApp si configuré). Ne bloque JAMAIS
      // la clôture : fire-and-forget, la consultation reste "closed" quoi qu'il arrive.
      setImmediate(() => { deliverConsultationReport(id).catch((e) => console.error("[close] deliver report:", e)); });
      res.json({ ok: true });
    } catch (err) {
      console.error("[pro/consultations close] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/pro/profile — profil public actuel du dermatologue connecté.
  app.get("/api/pro/profile", requireProAccess, async (req: any, res) => {
    try {
      const id = req.proAccount.id;
      const r = Rows(await db.execute(sql`
        SELECT slug, full_name, city, bio, specialties, photo_url, whatsapp_number, phone,
               COALESCE(public_profile_enabled,true) AS public_enabled,
               COALESCE(b2c_available,false) AS b2c_available,
               COALESCE(consult_price_fcfa,3500) AS price,
               COALESCE(is_certified,false) AS is_certified, certified_at, profile_completed_at
        FROM pro_accounts WHERE id = ${id}`))[0] as any;
      res.json({ profile: {
        slug: r?.slug || null, fullName: r?.full_name || null, city: r?.city || null,
        bio: r?.bio || "", specialties: Array.isArray(r?.specialties) ? r.specialties : [],
        photoUrl: r?.photo_url || null, whatsapp: r?.whatsapp_number || r?.phone || "",
        publicProfileEnabled: r?.public_enabled === true, b2cAvailable: r?.b2c_available === true,
        price: Number(r?.price) || 3500, certified: r?.is_certified === true,
        certifiedAt: r?.certified_at || null, profileCompletedAt: r?.profile_completed_at || null,
      } });
    } catch (err) {
      console.error("[pro/profile get] error:", err);
      res.json({ profile: null });
    }
  });

  // POST /api/pro/profile/update — profil public : bio, spécialités, photo, dispo.
  app.post("/api/pro/profile/update", requireProAccess, async (req: any, res) => {
    try {
      const id = req.proAccount.id;
      const b = req.body || {};
      const bio = typeof b.bio === "string" ? b.bio.slice(0, 200) : undefined;
      const specialties = Array.isArray(b.specialties) ? b.specialties.slice(0, 20).map((s: any) => String(s).slice(0, 30)) : undefined;
      const photoUrl = typeof b.photoUrl === "string" ? b.photoUrl.slice(0, 500) : undefined;
      const whatsapp = typeof b.whatsapp === "string" ? b.whatsapp.replace(/[^0-9+]/g, "").slice(0, 20) : undefined;
      const publicEnabled = typeof b.publicProfileEnabled === "boolean" ? b.publicProfileEnabled : undefined;

      // Génère un slug unique si absent (dr-nom-prenom, suffixe -N si pris).
      const cur = Rows(await db.execute(sql`SELECT slug, full_name FROM pro_accounts WHERE id = ${id}`));
      if (!cur[0]?.slug && cur[0]?.full_name) {
        const base = "dr-" + String(cur[0].full_name).toLowerCase()
          .normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
        let slug = base, n = 1;
        while (Rows(await db.execute(sql`SELECT 1 FROM pro_accounts WHERE slug = ${slug} AND id <> ${id}`)).length) { slug = `${base}-${++n}`; }
        await db.execute(sql`UPDATE pro_accounts SET slug = ${slug} WHERE id = ${id}`);
      }

      // Mises à jour ciblées (chaque champ optionnel).
      if (bio !== undefined) await db.execute(sql`UPDATE pro_accounts SET bio = ${bio} WHERE id = ${id}`);
      if (specialties !== undefined) await db.execute(sql`UPDATE pro_accounts SET specialties = ${specialties as any} WHERE id = ${id}`);
      if (photoUrl !== undefined) await db.execute(sql`UPDATE pro_accounts SET photo_url = ${photoUrl} WHERE id = ${id}`);
      if (whatsapp !== undefined) await db.execute(sql`UPDATE pro_accounts SET whatsapp_number = ${whatsapp} WHERE id = ${id}`);
      if (publicEnabled !== undefined) await db.execute(sql`UPDATE pro_accounts SET public_profile_enabled = ${publicEnabled} WHERE id = ${id}`);
      if (typeof b.b2cAvailable === "boolean") await db.execute(sql`UPDATE pro_accounts SET b2c_available = ${b.b2cAvailable} WHERE id = ${id}`);
      if (b.consultPriceFcfa !== undefined) {
        const price = Math.max(500, Math.min(50000, parseInt(String(b.consultPriceFcfa), 10) || 3500));
        await db.execute(sql`UPDATE pro_accounts SET consult_price_fcfa = ${price} WHERE id = ${id}`);
      }

      // Profil complété (photo + bio + ≥1 spécialité) → horodatage (critère certif).
      try {
        const p = Rows(await db.execute(sql`SELECT photo_url, bio, specialties, profile_completed_at FROM pro_accounts WHERE id = ${id}`))[0] as any;
        const complete = !!(p?.photo_url && p?.bio && Array.isArray(p?.specialties) && p.specialties.length > 0);
        if (complete && !p.profile_completed_at) await db.execute(sql`UPDATE pro_accounts SET profile_completed_at = NOW() WHERE id = ${id}`);
      } catch {}

      const out = Rows(await db.execute(sql`SELECT slug, bio, specialties, photo_url, whatsapp_number, COALESCE(public_profile_enabled,true) AS enabled, COALESCE(is_certified,false) AS certified FROM pro_accounts WHERE id = ${id}`))[0];
      res.json({ ok: true, profile: out });
    } catch (err) {
      console.error("[pro/profile/update] error:", err);
      res.status(500).json({ message: "Erreur serveur (migration profil appliquée ?)" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/partners-count — nombre de dermatologues (public, pour la landing)
  // ───────────────────────────────────────────
  app.get("/api/pro/partners-count", async (_req: any, res) => {
    try {
      const rows = await db.select({ id: proAccounts.id }).from(proAccounts);
      res.json({ count: rows.length });
    } catch (err) {
      console.error("[pro/partners-count] error:", err);
      res.json({ count: 0 });
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

      // Répartition par phototype (Fitzpatrick IV/V/VI) — extrait du skinType.
      const phototype: Record<string, number> = { IV: 0, V: 0, VI: 0, Autre: 0 };
      for (const s of allScans) {
        const t = String(s.skinType || "").toLowerCase();
        if (/\bvi\b|phototype\s*6|type\s*vi/.test(t)) phototype.VI++;
        else if (/\biv\b|phototype\s*4|type\s*iv/.test(t)) phototype.IV++;
        else if (/\bv\b|phototype\s*5|type\s*v/.test(t)) phototype.V++;
        else phototype.Autre++;
      }
      const phototypeDist = Object.entries(phototype).filter(([, n]) => n > 0).map(([name, count]) => ({ name, count }));

      // Consultations en ligne : nb + revenus (payout dermato) par mois. Résilient.
      let onlineConsultations = 0, onlineRevenue = 0;
      let onlineRevenueMonthly: { month: string; revenue: number }[] = [];
      try {
        const rows = Rows(await db.execute(sql`
          SELECT to_char(created_at,'YYYY-MM') AS month, COUNT(*) AS n,
                 COALESCE(SUM(COALESCE(dermatologue_payout, price_fcfa - COALESCE(platform_commission,0), price_fcfa)),0) AS revenue
          FROM consultations
          WHERE pro_account_id = ${dermatoId} AND payment_status = 'paid'
          GROUP BY 1 ORDER BY 1`));
        onlineRevenueMonthly = rows.map((r: any) => ({ month: r.month, revenue: Number(r.revenue) || 0 }));
        onlineConsultations = rows.reduce((s: number, r: any) => s + Number(r.n || 0), 0);
        onlineRevenue = onlineRevenueMonthly.reduce((s, r) => s + r.revenue, 0);
      } catch {}

      res.json({
        totalPatients: allPatients.length,
        totalScans: allScans.length,
        avgGlowScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
        topConditions,
        topProducts,
        monthly: monthlyArr,
        phototypeDist,
        onlineConsultations,
        onlineRevenue,
        onlineRevenueMonthly,
        // Schéma de statut unifié : priority/monitoring/stable/resolved.
        // On mappe l'ancien schéma (red/yellow/green) pour rétro-compat.
        statusBreakdown: (() => {
          const norm = (s: string | null | undefined) =>
            s === "red" ? "priority" : s === "yellow" ? "monitoring" : s === "green" ? "stable" : (s || "stable");
          const counts = { priority: 0, monitoring: 0, stable: 0, resolved: 0 } as Record<string, number>;
          for (const p of allPatients) {
            const m = norm(p.status);
            if (m in counts) counts[m] += 1;
          }
          return counts;
        })(),
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
  Document généré par GlowScan DERM — ${dermato.fullName}<br>
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
  // POST /api/pro/subscribe — demande de paiement abonnement Pro 10k FCFA
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
        note: "GlowScan DERM — Abonnement dermato 10k FCFA/mois",
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

  // ───────────────────────────────────────────
  // POST /api/secretary/login — Connexion secrétaire
  // ───────────────────────────────────────────
  app.post("/api/secretary/login", async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });
      const data = schema.parse(req.body);
      const emailLower = data.email.toLowerCase().trim();

      // Chercher le compte secrétaire
      const [secretary] = await db.select().from(secretaryAccounts)
        .where(eq(secretaryAccounts.email, emailLower));
      if (!secretary) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      // Vérifier le mot de passe
      const [user] = await db.select().from(users)
        .where(eq(users.id, secretary.userId));
      if (!user || !user.passwordHash || !(await bcrypt.compare(data.password, user.passwordHash))) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      // Vérifier que l'utilisateur est bien marqué comme secretary
      if (user.role !== "secretary") {
        return res.status(403).json({ message: "Compte non autorisé" });
      }

      // Login session
      req.session.userId = user.id; touchLastLogin(user.id);
      req.session.save((err: any) => {
        if (err) {
          console.error("[secretary/login] session save:", err);
          return res.status(500).json({ message: "Erreur connexion" });
        }
        console.log(`[secretary] ✅ Login secrétaire ${secretary.fullName} (${emailLower})`);
        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            role: user.role,
            secretaryName: secretary.fullName,
          },
        });
      });
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Données invalides" });
      console.error("[secretary/login] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────
  // POST /api/pro/secretaries — Créer un accès secrétaire
  // ───────────────────────────────────────────
  app.post("/api/pro/secretaries", requireActivePro, async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        fullName: z.string().min(1),
        password: z.string().min(6),
      });
      const data = schema.parse(req.body);

      const emailLower = data.email.toLowerCase().trim();

      // Vérifier l'email n'existe pas déjà
      const existingUser = await db.select().from(users).where(eq(users.email, emailLower));
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Cet email existe déjà" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Transaction : si la création du compte secrétaire échoue, la création de
      // l'utilisateur est annulée → plus jamais d'utilisateur orphelin (qui
      // provoquait ensuite un faux 400 « email existe déjà »).
      const secretary = await db.transaction(async (tx) => {
        const [newUser] = await tx.insert(users).values({
          email: emailLower,
          firstName: data.fullName.split(" ")[0] || "Secrétaire",
          lastName: data.fullName.split(" ").slice(1).join(" ") || "",
          passwordHash: hashedPassword,
          role: "secretary", // 🔑 Marquer comme secrétaire
        }).returning();

        const [sec] = await tx.insert(secretaryAccounts).values({
          userId: newUser.id,
          proAccountId: req.proAccount.id,
          fullName: data.fullName,
          email: emailLower,
          createdBy: req.session.userId,
        }).returning();
        return sec;
      });

      console.log(`[secretary] ✅ Secrétaire créée: ${data.fullName} (${emailLower})`);
      res.json({
        success: true,
        message: "Secrétaire créée avec succès",
        secretary: {
          ...secretary,
          plainPassword: data.password, // ⚠️ Retourner en plaintext pour que le médecin la partage
        },
      });
    } catch (err: any) {
      console.error("❌ Secretary creation failed:", err);
      res.status(500).json({ message: err.message || "Erreur lors de la création" });
    }
  });

  // ───────────────────────────────────────────
  // GET /api/pro/secretaries — Lister les secrétaires du dermatologue
  // ───────────────────────────────────────────
  app.get("/api/pro/secretaries", requireActivePro, async (req: any, res) => {
    try {
      const secretaries = await db.select().from(secretaryAccounts)
        .where(eq(secretaryAccounts.proAccountId, req.proAccount.id));

      res.json({
        secretaries,
      });
    } catch (err) {
      console.error("❌ Secretaries fetch failed:", err);
      res.status(500).json({ message: "Erreur lors du chargement" });
    }
  });

  // ───────────────────────────────────────────
  // DELETE /api/pro/secretaries/:id — Supprimer une secrétaire
  // ───────────────────────────────────────────
  app.delete("/api/pro/secretaries/:id", requireActivePro, async (req: any, res) => {
    try {
      const secretaryId = parseInt(req.params.id);

      // Vérifier que la secrétaire appartient au dermatologue
      const [secretary] = await db.select().from(secretaryAccounts)
        .where(and(eq(secretaryAccounts.id, secretaryId), eq(secretaryAccounts.proAccountId, req.proAccount.id)));

      if (!secretary) {
        return res.status(404).json({ message: "Secrétaire introuvable" });
      }

      // Supprimer le compte secrétaire et l'utilisateur associé
      await db.delete(secretaryAccounts).where(eq(secretaryAccounts.id, secretaryId));
      await db.delete(users).where(eq(users.id, secretary.userId));

      res.json({ success: true, message: "Secrétaire supprimée" });
    } catch (err) {
      console.error("❌ Secretary deletion failed:", err);
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });
}
