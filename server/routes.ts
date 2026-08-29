import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth/routes";
import { registerProRoutes } from "./proRoutes";
import { analyzeLimiter, consultationLimiter, paymentLimiter, emailReportLimiter } from "./rateLimit";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GLOWSCAN_SYSTEM_PROMPT, GLOWSCAN_DERM_SYSTEM_PROMPT } from "./prompt";
import { classifyCondition, extractPhototype, calcAnnotationScore } from "./taxonomy";
import webpush from "web-push";
import { db } from "./db";
import { referrals, loyaltyPoints, subscriptions, scans, leads, premiumRequests, wellnessLogs, trainingData, proAccounts, consultations, consultationMessages, type TrainingData } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, and, sql, gte, count, lte, desc, avg, inArray, isNull } from "drizzle-orm";
import { whatsappClicks, orders, pageVisits } from "@shared/schema";
import { emitToUser, isUserOnline } from "./ws";
import { verifyReportToken, buildReportHtml } from "./whatsapp";

// ── Sélection automatique du provider IA ────────────────────────────────
// Priorité : GROQ_API_KEY (free, global, vision) → GEMINI_API_KEY → OPENAI_API_KEY
const _groqKey    = process.env.GROQ_API_KEY || "";
const _geminiKey  = process.env.GEMINI_API_KEY || "";
const _openaiKey  = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
const _openaiBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || undefined;

// Choix du provider. Groq a de nouveau un modèle VISION (Qwen 3.6 27B,
// qwen/qwen3.6-27b) + un free tier généreux → il redevient prioritaire par
// défaut. Gemini (free tier vite saturé, 429) reste en secours.
// Override explicite via Railway : AI_PROVIDER=groq|gemini|openai (ignore la
// priorité si la clé correspondante est présente).
const _forceProvider = (process.env.AI_PROVIDER || "").toLowerCase();
const _canGroq = !!_groqKey, _canGemini = !!_geminiKey, _canOpenAI = !!_openaiKey;
let USE_GROQ = false, USE_GEMINI = false;
// Défaut : GEMINI prioritaire pour l'analyse. Groq gratuit plafonne à 8000
// tokens/minute — trop peu pour notre prompt+image (~18k tokens) → il rejette
// chaque analyse (413). Gemini (contexte 1M, pas de plafond TPM bloquant) est
// le seul provider gratuit viable pour la vision. Groq reste utilisé pour
// l'audio (Whisper) via un client dédié, indépendant de ce choix.
// Override possible : AI_PROVIDER=groq|gemini|openai (si la clé est présente).
if (_forceProvider === "groq" && _canGroq) USE_GROQ = true;
else if (_forceProvider === "gemini" && _canGemini) USE_GEMINI = true;
else if (_forceProvider === "openai" && _canOpenAI) { /* openai */ }
else if (_canGemini) USE_GEMINI = true;      // défaut : Gemini (vision viable)
else if (_canGroq) USE_GROQ = true;          // secours : Groq (échoue si payload > 8k TPM)
const AI_PROVIDER   = USE_GROQ ? "Groq" : USE_GEMINI ? "Gemini" : "OpenAI";
// Modèle Groq VISION — Qwen 3.6 27B (qwen/qwen3.6-27b). Configurable via
// GROQ_MODEL dans Railway sans redéploiement.
const GROQ_MODEL    = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";
// Modèle Gemini configurable via Railway (GEMINI_MODEL) sans redéploiement.
// Défaut : gemini-2.5-flash — quota gratuit journalier SÉPARÉ de la 2.0-flash,
// donc si la 2.0 est saturée (429), basculer la variable débloque l'analyse.
// gemini-2.5-flash n'est plus ouvert aux nouveaux projets (404) → défaut sur
// gemini-2.0-flash (accessible, pas de plafond TPM bloquant). Surchargeable via
// GEMINI_MODEL dans Railway (ex: gemini-flash-latest) sans redéploiement.
const GEMINI_MODEL  = process.env.GEMINI_MODEL || "gemini-2.0-flash";
// Chaîne de secours : si un modèle Gemini sature (429/quota) ou disparaît (404),
// le code bascule automatiquement sur le suivant. Chaque modèle gratuit a son
// PROPRE quota journalier → la chaîne multiplie la capacité et évite que
// l'analyse plante. Surchargeable via GEMINI_FALLBACKS (liste séparée par des
// virgules) dans Railway. Doublons filtrés, modèle principal en tête.
const GEMINI_FALLBACKS = [
  GEMINI_MODEL,
  ...(process.env.GEMINI_FALLBACKS || "gemini-2.0-flash-lite,gemini-flash-latest,gemini-flash-lite-latest,gemini-2.5-flash-lite")
    .split(",").map((s) => s.trim()).filter(Boolean),
].filter((v, i, a) => a.indexOf(v) === i);
const AI_MODEL      = USE_GROQ ? GROQ_MODEL : USE_GEMINI ? GEMINI_MODEL : "gpt-4o";
const AI_MODEL_FAST = USE_GROQ ? GROQ_MODEL : USE_GEMINI ? GEMINI_MODEL : "gpt-4o-mini";
// Modèles de raisonnement (compound, qwen, deepseek, gpt-oss…) : ils ne
// supportent pas response_format=json_object → on l'omet et le JSON est extrait
// du texte par le parseur robuste. Sinon l'appel Groq échoue (400).
const AI_IS_REASONING = /compound|qwen|reasoning|deepseek|gpt-oss/i.test(AI_MODEL);

if (!_groqKey && !_geminiKey && !_openaiKey) {
  console.error("⚠️  IA : aucune clé trouvée (GROQ_API_KEY, GEMINI_API_KEY ou OPENAI_API_KEY manquante)");
} else {
  console.log(`✅  IA provider : ${AI_PROVIDER} — modèle ${AI_MODEL}`);
  console.log(`   USE_GROQ=${USE_GROQ}, USE_GEMINI=${USE_GEMINI}`);
  if (USE_GROQ) console.log(`   GROQ_MODEL=${GROQ_MODEL}`);
}

// Gemini native SDK (uniquement si pas de clé Groq)
const gemini = USE_GEMINI ? new GoogleGenerativeAI(_geminiKey) : null;
// OpenAI SDK compatible — Groq (prioritaire) ou OpenAI standard
// ⚠️ CRITICAL: Groq needs 180s timeout, OpenAI needs 60s
const openai = !USE_GEMINI ? new OpenAI({
  apiKey:  USE_GROQ ? _groqKey : (_openaiKey || "sk-missing"),
  baseURL: USE_GROQ ? "https://api.groq.com/openai/v1" : (_openaiBase || undefined),
  timeout: USE_GROQ ? 180000 : 60000, // 3min for Groq, 1min for OpenAI
}) : null;

// Client Groq DÉDIÉ à l'audio (Whisper), indépendant du provider IA. Reste
// disponible même quand l'IA texte/vision est sur Gemini. Whisper n'est pas
// concerné par le décommissionnement de Scout.
const groqAudio = _groqKey ? new OpenAI({
  apiKey: _groqKey,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 180000,
}) : null;

/**
 * Récupère l'ID utilisateur quelle que soit la méthode d'auth :
 * - Auth custom GlowScan  → req.session.userId  ou req.user.id
 * - Replit OIDC           → req.user.claims.sub
 */
function getUID(req: any): string | null {
  return req.session?.userId
    || req.user?.id
    || (req.user as any)?.claims?.sub
    || null;
}

/** Vérifie qu'un utilisateur est connecté (auth custom OU Replit OIDC) */
function isAuth(req: any): boolean {
  return !!(req.session?.userId || req.user?.id || (req.user as any)?.claims?.sub);
}

/**
 * Construit la réponse clinique DERM (B2B) à partir de la sortie brute de l'IA.
 * Architecture de sortie SÉPARÉE du B2C : ne produit que les champs cliniques
 * définis par GLOWSCAN_DERM_SYSTEM_PROMPT (clinicalProtocol, zonesAnalysis, etc.).
 * Tolérant aux champs manquants — clamp/sanitize sans jamais throw.
 */
function buildDermResult(a: any) {
  const str = (x: any, max = 4000) => (typeof x === "string" ? x.slice(0, max) : undefined);
  const arrStr = (x: any) =>
    Array.isArray(x) ? x.filter((s: any) => typeof s === "string").map((s: string) => s.slice(0, 400)) : [];
  const clampScore = (n: any) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 65;
  };
  const num = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : undefined);
  const step = (s: any) => ({
    step: str(s?.step, 80) || "",
    product: str(s?.product, 160),
    concentration: s?.concentration === null ? null : str(s?.concentration, 40),
    frequency: str(s?.frequency, 120),
    mechanism: str(s?.mechanism, 600),
  });
  const cp = a?.clinicalProtocol && typeof a.clinicalProtocol === "object" ? a.clinicalProtocol : {};

  const out: any = {
    aiModelVersion: AI_MODEL, // version du modèle IA ayant produit ce diagnostic (traçabilité)
    condition: str(a?.condition, 200) || "Analyse clinique",
    conditionSecondaire: a?.conditionSecondaire === null ? null : str(a?.conditionSecondaire, 200),
    severity: str(a?.severity, 40) || "Modérée",
    score: clampScore(a?.score),
    confidence: str(a?.confidence, 200),
    skinType: str(a?.skinType, 200),
    photo_quality: str(a?.photo_quality, 40),
    clinicalSummary: str(a?.clinicalSummary, 3000),
    reasoningSteps: Array.isArray(a?.reasoningSteps)
      ? a.reasoningSteps.slice(0, 6).map((s: any) => ({
          observation: str(s?.observation, 600) || "",
          rule: str(s?.rule, 600) || "",
          conclusion: str(s?.conclusion, 600) || "",
        })).filter((s: any) => s.observation || s.rule || s.conclusion)
      : [],
    zonesAnalysis: Array.isArray(a?.zonesAnalysis)
      ? a.zonesAnalysis.slice(0, 10).map((z: any) => ({
          zone: str(z?.zone, 60) || "Zone",
          status: str(z?.status, 60),
          findings: str(z?.findings, 1200),
          risk: str(z?.risk, 1200),
          evaluable: typeof z?.evaluable === "boolean" ? z.evaluable : true,
        }))
      : [],
    antecedentsIntegration: str(a?.antecedentsIntegration, 2000),
    toxicIngredients: Array.isArray(a?.toxicIngredients)
      ? a.toxicIngredients.slice(0, 8).map((t: any) => ({
          ingredient: str(t?.ingredient, 160) || "",
          reason: str(t?.reason, 800),
        }))
      : [],
    differentialDiagnosis: arrStr(a?.differentialDiagnosis),
    clinicalProtocol: {
      morning: Array.isArray(cp.morning) ? cp.morning.slice(0, 6).map(step) : [],
      evening: Array.isArray(cp.evening) ? cp.evening.slice(0, 6).map(step) : [],
      weekly: cp.weekly === null ? null : str(cp.weekly, 400),
      durationWeeks: num(cp.durationWeeks),
      followUpWeeks: num(cp.followUpWeeks),
      referralNeeded: typeof cp.referralNeeded === "boolean" ? cp.referralNeeded : false,
      referralReason: cp.referralReason === null ? null : str(cp.referralReason, 400),
    },
    logistics: a?.logistics === null ? null : str(a?.logistics, 800),
    prognostic: str(a?.prognostic, 2000),
    redFlags: arrStr(a?.redFlags),
    contraindications: arrStr(a?.contraindications),
    medicalDisclaimer:
      str(a?.medicalDisclaimer, 600) ||
      "Ce rapport est un outil d'aide au diagnostic à l'usage exclusif du professionnel de santé. Il ne remplace pas l'examen clinique complet.",
  };

  // ── §4 Cohérence interne (filet de sécurité déterministe) ──
  // Uniquement des corrections SÛRES et non ambiguës, pour ne jamais contredire
  // l'examen/override du médecin. Le gros du travail est fait par le prompt.
  const isHealthy = /\b(peau\s+saine|aucune\s+(pathologie|l[ée]sion)|pas\s+de\s+pathologie|rien\s+[àa]\s+signaler)\b/i.test(out.condition || "");
  if (isHealthy) {
    // Peau saine ⇒ pas d'ingrédients à éviter, pas de red flags, score cohérent (haut).
    out.toxicIngredients = [];
    out.redFlags = [];
    if (out.score < 80) out.score = 85;
    if (!out.severity || /s[ée]v[èe]re|mod[ée]r/i.test(out.severity)) out.severity = "Aucune";
  }

  return out;
}

// Stockage temporaire d'images pour contourner la limitation base64 du proxy
// Les images sont servies via une URL publique /api/img/:id
import { randomUUID } from "crypto";
const tempImages = new Map<string, { buffer: Buffer; mime: string; expiresAt: number }>();
// Nettoyage toutes les 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, img] of tempImages.entries()) {
    if (img.expiresAt < now) tempImages.delete(id);
  }
}, 10 * 60 * 1000);

// === Upload de la photo d'analyse vers Object Storage ===
// Stratégie "zero data loss" PHOTO : chaque image envoyée à /api/analyze est
// archivée dans le bucket privé pour bâtir le dataset dermato africain.
// Retourne un chemin /objects/scans/<uuid>.<ext> exploitable via la route GET /objects/*.
export async function uploadScanImageToStorage(base64DataUrl: string): Promise<string | null> {
  try {
    const match = base64DataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    let mime = "image/jpeg";
    let b64 = base64DataUrl;
    if (match) {
      mime = match[1].toLowerCase();
      b64 = match[2];
    }
    let buffer = Buffer.from(b64, "base64");
    if (buffer.length === 0) return null;

    // ── Anonymisation : suppression des métadonnées EXIF/GPS/appareil ──
    // Un ré-encodage via sharp retire toute métadonnée (localisation, modèle de
    // téléphone, date…) et applique l'orientation. Essentiel pour un dataset
    // licenciable : l'image ne trahit plus l'identité ni le lieu du patient.
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buffer).rotate();
      if (mime.includes("png")) { buffer = await img.png().toBuffer(); }
      else { buffer = await img.jpeg({ quality: 90 }).toBuffer(); mime = "image/jpeg"; }
      b64 = buffer.toString("base64");
    } catch (exifErr) {
      console.error("[analyze] ⚠️ Nettoyage EXIF ignoré (sharp):", exifErr instanceof Error ? exifErr.message : String(exifErr));
    }

    // ── Chemin 1 : Replit Object Storage (si PRIVATE_OBJECT_DIR défini) ──
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    if (privateDir) {
      try {
        const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const objectId = `${randomUUID()}.${ext}`;
        const fullPath = `${privateDir.startsWith("/") ? "" : "/"}${privateDir}/scans/${objectId}`;
        const parts = fullPath.split("/").filter(Boolean);
        const bucketName = parts[0];
        const objectName = parts.slice(1).join("/");
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        await file.save(buffer, {
          contentType: mime,
          resumable: false,
          metadata: {
            metadata: {
              "custom:aclPolicy": JSON.stringify({ owner: "system", visibility: "private" }),
            },
          },
        });
        console.log(`[analyze] 📸 Photo archivée Object Storage (${Math.round(buffer.length / 1024)}KB)`);
        return `/objects/scans/${objectId}`;
      } catch (storErr) {
        console.error("[analyze] ⚠️ Object Storage échoué, fallback base64:", storErr);
      }
    }

    // ── Chemin 2 : fallback base64 (Railway / pas d'Object Storage configuré) ──
    // Stockage de la data URL directement en DB — ~50-300KB par scan, OK pour
    // le dataset RLHF tant que le volume est < 1000 scans.
    console.log(`[analyze] 📸 Photo sauvegardée en base64 (${Math.round(buffer.length / 1024)}KB, EXIF nettoyé) — Object Storage non configuré`);
    return `data:${mime};base64,${b64}`;
  } catch (err) {
    console.error("[analyze] ❌ Échec stockage photo:", err);
    return null;
  }
}

// Contrôle d'accès admin (par clé simple) — n'accorde JAMAIS l'accès si ADMIN_KEY
// n'est pas configuré (évite le piège undefined === undefined). Aucune clé en dur.
function verifyAdminKey(key?: string | string[] | null): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const provided = Array.isArray(key) ? key[0] : key;
  return typeof provided === "string" && provided === expected;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  registerProRoutes(app);

  // ══ Diagnostic santé IA — ouvrir /api/ai-health dans le navigateur ══
  // Teste un appel minimal au modèle courant et renvoie l'erreur BRUTE du fournisseur
  // (Groq). Sert à diagnostiquer instantanément un souci modèle/clé/quota.
  app.get("/api/ai-health", async (_req: any, res) => {
    const info: any = { provider: AI_PROVIDER, model: AI_MODEL, useGroq: USE_GROQ, useGemini: USE_GEMINI };
    try {
      if (USE_GEMINI && gemini) {
        const m = gemini.getGenerativeModel({ model: AI_MODEL });
        const r = await m.generateContent("ping");
        info.ok = true; info.reply = r.response.text().slice(0, 40);
      } else if (openai) {
        const r = await openai.chat.completions.create(
          { model: AI_MODEL, messages: [{ role: "user", content: "ping" }], max_tokens: 5 } as any,
          { maxRetries: 0 },
        );
        info.ok = true; info.reply = (r.choices?.[0]?.message?.content || "").slice(0, 40);
      } else {
        info.ok = false; info.error = "Aucun client IA configuré (clé manquante ?)";
      }
    } catch (e: any) {
      info.ok = false;
      info.status = e?.status || e?.response?.status;
      info.error = e?.error?.message || e?.response?.data?.error?.message || e?.message || String(e);
    }
    res.json(info);
  });

  // ══ Liste des modèles disponibles sur la clé — ouvrir /api/ai-models ══
  // Renvoie les IDs de modèles réellement accessibles par la clé Groq courante.
  app.get("/api/ai-models", async (_req: any, res) => {
    try {
      if (!openai) return res.json({ ok: false, error: "Client IA non configuré" });
      const list: any = await openai.models.list();
      const ids = (list?.data || list?.body?.data || []).map((m: any) => m.id).sort();
      res.json({ ok: true, count: ids.length, models: ids });
    } catch (e: any) {
      res.json({ ok: false, status: e?.status, error: e?.error?.message || e?.message || String(e) });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // CONSULTATIONS IN-APP (circuit fermé B2C ↔ dermatologue)
  // ════════════════════════════════════════════════════════════════════
  const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];

  // Notification web-push best-effort vers un utilisateur (consultations).
  async function pushToUser(userId: string | null | undefined, title: string, body: string, url: string) {
    if (!userId) return;
    try {
      const subs = await storage.getPushSubscriptionsByUser(userId);
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, url }),
          );
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) await storage.deletePushSubscription(sub.endpoint);
        }
      }
    } catch {}
  }

  // Notifie LES DEUX parties qu'une consultation vient d'être activée (payée).
  // Dermatologue ET patient reçoivent : WebSocket (live) + web-push + email.
  // Best-effort : aucune erreur ne bloque la confirmation.
  async function notifyConsultationOpened(c: any) {
    if (!c) return;
    const base = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
    try {
      const pr = Rows(await db.execute(sql`SELECT user_id, full_name FROM pro_accounts WHERE id = ${c.proAccountId}`));
      const dermUserId = pr[0]?.user_id;
      const dermName = pr[0]?.full_name || "votre dermatologue";
      // ── Dermatologue ──
      if (dermUserId) {
        emitToUser(dermUserId, "consultation:opened", { consultationId: c.id });
        pushToUser(dermUserId, "Nouvelle consultation 🩺", "Un patient vous consulte en ligne sur GlowScan.", `/derm/consultations?c=${c.id}`);
        try {
          const du = Rows(await db.execute(sql`SELECT email, name FROM users WHERE id = ${dermUserId}`));
          if (du[0]?.email) {
            const { sendEmail } = await import("./email");
            sendEmail(
              du[0].email,
              "Nouvelle consultation en ligne 🩺",
              `<p>Bonjour ${du[0].name || ""},</p><p>Un patient vient de régler une consultation en ligne sur GlowScan. Son dossier (photo + diagnostic IA + Glow Score) est déjà prêt — vous arrivez en expert.</p><p><a href="${base}/derm/consultations?c=${c.id}">Ouvrir le dossier →</a></p>`,
              `Un patient vous consulte en ligne. Ouvrez ${base}/derm/consultations?c=${c.id}`,
            ).catch(() => {});
          }
        } catch {}
      }
      // ── Patient ──
      if (c.userId) {
        emitToUser(c.userId, "consultation:opened", { consultationId: c.id });
        pushToUser(c.userId, "Consultation activée ✅", "Ton paiement est confirmé — tu peux échanger avec le dermatologue.", "/consultations");
        try {
          const pu = Rows(await db.execute(sql`SELECT email, name FROM users WHERE id = ${c.userId}`));
          if (pu[0]?.email) {
            const { sendEmail } = await import("./email");
            sendEmail(
              pu[0].email,
              "Ta consultation est activée ✅",
              `<p>Bonjour ${pu[0].name || ""},</p><p>Ton paiement a bien été confirmé. Tu peux maintenant échanger avec Dr ${dermName} directement dans l'application.</p><p><a href="${base}/consultations">Ouvrir ma consultation →</a></p>`,
              `Ton paiement est confirmé. Ouvre ${base}/consultations pour échanger avec le dermatologue.`,
            ).catch(() => {});
          }
        } catch {}
      }
    } catch (e) {
      console.error("[notifyConsultationOpened] error:", e);
    }
  }

  // Liste des dermatologues consultables en B2C (opt-in b2c_available).
  app.get("/api/b2c/dermatologists", async (_req: any, res) => {
    try {
      // SELECT de base (colonnes toujours présentes) — ne casse jamais.
      const rows = Rows(await db.execute(sql`
        SELECT id, full_name, cabinet_name, city, license_number,
               COALESCE(consult_price_fcfa, 3500) AS price
        FROM pro_accounts
        WHERE b2c_available = true
          AND (
            (subscription_status = 'active' AND subscription_expires_at > NOW())
            OR (subscription_status = 'trial' AND trial_ends_at > NOW())
          )
        ORDER BY full_name`));
      // Enrichissement profil (colonnes ajoutées via ALTER) — best-effort.
      const extra = new Map<number, any>();
      try {
        const ex = Rows(await db.execute(sql`SELECT id, slug, COALESCE(is_certified,false) AS is_certified, photo_url, specialties FROM pro_accounts WHERE b2c_available = true`));
        ex.forEach((r: any) => extra.set(Number(r.id), r));
      } catch {}
      const ratings = new Map<number, { avg: number; n: number }>();
      try {
        const rr = Rows(await db.execute(sql`SELECT pro_account_id AS id, ROUND(AVG(rating)::numeric,1) AS avg, COUNT(rating) AS n FROM consultations WHERE rating IS NOT NULL GROUP BY pro_account_id`));
        rr.forEach((r: any) => ratings.set(Number(r.id), { avg: Number(r.avg) || 0, n: Number(r.n) || 0 }));
      } catch {}
      res.json({ dermatologists: rows.map((r) => {
        const e = extra.get(Number(r.id)) || {};
        const rt = ratings.get(Number(r.id)) || { avg: 0, n: 0 };
        return {
          id: r.id, fullName: r.full_name, cabinet: r.cabinet_name, city: r.city,
          licenseNumber: r.license_number, price: Number(r.price) || 3500,
          slug: e.slug || null, certified: e.is_certified === true, photoUrl: e.photo_url || null,
          specialties: Array.isArray(e.specialties) ? e.specialties : [],
          rating: rt.avg, ratingsCount: rt.n,
        };
      }) });
    } catch (e) {
      res.json({ dermatologists: [] });
    }
  });

  // ── Profil public dermatologue (sans auth, indexable Google) ──────────────
  app.get("/api/public/dermatologues/:slug", async (req: any, res) => {
    try {
      const slug = String(req.params.slug || "").slice(0, 120);
      const rows = Rows(await db.execute(sql`
        SELECT id, full_name, cabinet_name, city, license_number, slug, bio, specialties,
               photo_url, whatsapp_number, phone, COALESCE(is_certified,false) AS is_certified,
               certified_at, COALESCE(public_profile_enabled,true) AS enabled,
               COALESCE(b2c_available,false) AS available,
               COALESCE(consult_price_fcfa,3500) AS price, created_at
        FROM pro_accounts WHERE slug = ${slug} LIMIT 1`));
      const p: any = rows[0];
      if (!p || p.enabled !== true) return res.status(404).json({ message: "Profil introuvable" });
      // Stats live — résilient : si les colonnes rating (migration consultations v2)
      // ne sont pas encore là, on renvoie 0 au lieu de casser tout le profil.
      let s: any = {};
      try {
        s = Rows(await db.execute(sql`
          SELECT COUNT(*) FILTER (WHERE payment_status = 'paid') AS consults,
                 ROUND(AVG(rating)::numeric,1) AS avg_rating, COUNT(rating) AS n_ratings
          FROM consultations WHERE pro_account_id = ${Number(p.id)}`))[0] || {};
      } catch {
        try {
          s = Rows(await db.execute(sql`SELECT COUNT(*) FILTER (WHERE payment_status = 'paid') AS consults FROM consultations WHERE pro_account_id = ${Number(p.id)}`))[0] || {};
        } catch {}
      }
      res.json({ dermatologue: {
        id: p.id, slug: p.slug, fullName: p.full_name, cabinet: p.cabinet_name, city: p.city,
        bio: p.bio || null, specialties: Array.isArray(p.specialties) ? p.specialties : [],
        photoUrl: p.photo_url || null, whatsapp: p.whatsapp_number || p.phone || null,
        certified: p.is_certified === true, certifiedAt: p.certified_at || null,
        available: p.available === true, price: Number(p.price) || 3500, memberSince: p.created_at,
        totalConsultations: Number(s.consults) || 0,
        rating: Number(s.avg_rating) || 0, ratingsCount: Number(s.n_ratings) || 0,
      } });
    } catch (e) {
      console.error("[public dermatologue] error:", e);
      res.status(404).json({ message: "Profil introuvable" });
    }
  });

  // ── Avis publics paginés (prénom + note + commentaire + date) ─────────────
  app.get("/api/public/dermatologues/:slug/ratings", async (req: any, res) => {
    try {
      const slug = String(req.params.slug || "").slice(0, 120);
      const page = Math.max(0, parseInt(String(req.query.page)) || 0);
      const pr = Rows(await db.execute(sql`SELECT id FROM pro_accounts WHERE slug = ${slug} LIMIT 1`));
      const proId = pr[0]?.id; if (!proId) return res.json({ ratings: [], hasMore: false });
      const rows = Rows(await db.execute(sql`
        SELECT c.rating, c.rating_comment, c.rated_at, u.first_name
        FROM consultations c LEFT JOIN users u ON u.id = c.user_id
        WHERE c.pro_account_id = ${Number(proId)} AND c.rating IS NOT NULL
        ORDER BY c.rated_at DESC LIMIT 6 OFFSET ${page * 5}`));
      res.json({
        ratings: rows.slice(0, 5).map((r: any) => ({
          rating: Number(r.rating), comment: r.rating_comment || null,
          date: r.rated_at, firstName: r.first_name || "Patient",
        })),
        hasMore: rows.length > 5,
      });
    } catch (e) { res.json({ ratings: [], hasMore: false }); }
  });

  // ── Liste publique des dermatologues certifiés (filtrable) ────────────────
  app.get("/api/public/dermatologues", async (req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT id, slug, full_name, city, photo_url, specialties,
               COALESCE(is_certified,false) AS is_certified, COALESCE(b2c_available,false) AS available,
               COALESCE(consult_price_fcfa,3500) AS price
        FROM pro_accounts
        WHERE COALESCE(is_certified,false) = true AND COALESCE(public_profile_enabled,true) = true AND slug IS NOT NULL
        ORDER BY full_name`));
      res.json({ dermatologues: rows.map((r: any) => ({
        slug: r.slug, fullName: r.full_name, city: r.city, photoUrl: r.photo_url || null,
        specialties: Array.isArray(r.specialties) ? r.specialties : [],
        certified: true, available: r.available === true, price: Number(r.price) || 3500,
      })) });
    } catch (e) { res.json({ dermatologues: [] }); }
  });

  // ── Admin : liste des dermatologues + critères de certification ───────────
  app.get("/api/admin/dermatologues", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const rows = Rows(await db.execute(sql`
        SELECT p.id, p.full_name, p.slug, p.city, p.license_number, p.created_at,
               COALESCE(p.is_certified,false) AS is_certified, p.certified_at,
               (p.photo_url IS NOT NULL) AS has_photo,
               (p.bio IS NOT NULL AND p.bio <> '') AS has_bio,
               (p.specialties IS NOT NULL AND array_length(p.specialties,1) > 0) AS has_specialties,
               (SELECT COUNT(*) FROM patients pt WHERE pt.dermatologist_id = p.id) AS patients,
               (p.created_at < NOW() - INTERVAL '7 days') AS account_7d
        FROM pro_accounts p ORDER BY p.created_at DESC`));
      res.json({ dermatologues: rows.map((r: any) => ({
        id: r.id, fullName: r.full_name, slug: r.slug, city: r.city, licenseNumber: r.license_number,
        isCertified: r.is_certified === true, certifiedAt: r.certified_at,
        criteria: {
          license: !!r.license_number,
          patients: Number(r.patients) > 0,
          profile: r.has_photo === true && r.has_bio === true && r.has_specialties === true,
          account7d: r.account_7d === true,
        },
        patientsCount: Number(r.patients) || 0,
      })) });
    } catch (e) {
      console.error("[admin dermatologues] error:", e);
      res.json({ dermatologues: [] });
    }
  });

  // ── Admin : liste des dermatologues + critères de certification ───────────
  app.get("/api/admin/dermatologues", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const rows = Rows(await db.execute(sql`
        SELECT p.id, p.full_name, p.license_number, p.slug, p.city, p.phone,
               COALESCE(p.is_certified,false) AS is_certified, p.certified_at, p.created_at,
               (p.photo_url IS NOT NULL) AS has_photo,
               (p.bio IS NOT NULL AND p.bio <> '') AS has_bio,
               (p.specialties IS NOT NULL AND array_length(p.specialties,1) > 0) AS has_specialties,
               (SELECT COUNT(*) FROM patients pt WHERE pt.dermatologist_id = p.id) AS patient_count
        FROM pro_accounts p
        ORDER BY COALESCE(p.is_certified,false) ASC, p.created_at DESC`));
      const now = Date.now();
      res.json({ dermatologues: rows.map((r: any) => {
        const ageDays = r.created_at ? Math.floor((now - new Date(r.created_at).getTime()) / 86400000) : 0;
        const profile80 = !!(r.has_photo && r.has_bio && r.has_specialties);
        const patients = Number(r.patient_count) || 0;
        return {
          id: r.id, fullName: r.full_name, licenseNumber: r.license_number || null, slug: r.slug || null,
          city: r.city || null, phone: r.phone || null,
          isCertified: r.is_certified === true, certifiedAt: r.certified_at || null,
          criteria: {
            license: !!r.license_number,
            profile: profile80,
            patients: patients >= 1,
            account7d: ageDays >= 7,
          },
          patientsCount: patients, ageDays,
          eligible: !!r.license_number && profile80 && patients >= 1 && ageDays >= 7,
        };
      }) });
    } catch (e) {
      console.error("[admin dermatologues] error:", e);
      res.json({ dermatologues: [] });
    }
  });

  // ── Admin : certifier un dermatologue (badge GlowScan) ────────────────────
  app.put("/api/admin/dermatologues/:id/certify", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const id = parseInt(req.params.id);
      const on = req.body?.certified !== false;
      await db.execute(sql`UPDATE pro_accounts SET is_certified = ${on}, certified_at = ${on ? sql`NOW()` : sql`NULL`} WHERE id = ${id}`);
      // Notifie le dermatologue de l'activation de son badge (push).
      if (on) {
        try {
          const d = Rows(await db.execute(sql`SELECT user_id, slug FROM pro_accounts WHERE id = ${id}`))[0] as any;
          if (d?.user_id) pushToUser(d.user_id, "Badge Certifié GlowScan activé ✦", "Félicitations ! Votre profil public est certifié. Partagez votre lien pour attirer des patients.", d.slug ? `/dr/${d.slug}` : "/derm/profil-public");
        } catch {}
      }
      res.json({ ok: true, certified: on });
    } catch (e) {
      console.error("[admin certify] error:", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Ouvre une consultation (statut pending_payment). Embarque le contexte (photo + diagnostic).
  app.post("/api/consultations", consultationLimiter, async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const { proAccountId, scanId, condition, imageUrl } = req.body || {};
      if (!proAccountId) return res.status(400).json({ message: "Dermatologue requis" });
      const pr = Rows(await db.execute(sql`SELECT COALESCE(consult_price_fcfa,3500) AS p, b2c_available FROM pro_accounts WHERE id = ${Number(proAccountId)}`));
      if (!pr[0] || pr[0].b2c_available !== true) return res.status(400).json({ message: "Ce dermatologue n'est pas disponible en consultation." });
      const price = Number(pr[0].p) || 3500;
      const [c] = await db.insert(consultations).values({
        userId,
        proAccountId: Number(proAccountId),
        scanId: scanId ? Number(scanId) : null,
        condition: condition || null,
        imageUrl: imageUrl || null,
        status: "pending_payment",
        paymentStatus: "unpaid",
        priceFcfa: price,
      }).returning();
      // Modèle éco : 20% plateforme, le reste au dermatologue (SQL brut résilient).
      try {
        const commission = Math.round(price * 0.20);
        await db.execute(sql`UPDATE consultations SET platform_commission = ${commission}, dermatologue_payout = ${price - commission} WHERE id = ${c.id}`);
      } catch (e) { console.warn("[consultations] commission non enregistrée (ALTER v2 appliqué ?):", (e as any)?.message); }
      res.json({ consultation: c });
    } catch (err) {
      console.error("[consultations create] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Le patient déclare son paiement Mobile Money (référence) — en attente de confirmation.
  app.post("/api/consultations/:id/payment-ref", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const id = parseInt(req.params.id);
      const { ref } = req.body || {};
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c || c.userId !== userId) return res.status(404).json({ message: "Consultation introuvable" });
      await db.update(consultations).set({ paymentRef: (ref || "").toString().slice(0, 120) }).where(eq(consultations.id, id));
      res.json({ ok: true });
    } catch (err) {
      console.error("[consultations payment-ref] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Le patient enregistre son numéro WhatsApp (pour recevoir le rapport).
  app.post("/api/consultations/:id/patient-phone", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const id = parseInt(req.params.id);
      const phone = String(req.body?.phone || "").replace(/[^0-9+]/g, "").slice(0, 20);
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c || c.userId !== userId) return res.status(404).json({ message: "Consultation introuvable" });
      try { await db.execute(sql`UPDATE consultations SET patient_phone = ${phone || null} WHERE id = ${id}`); } catch {}
      res.json({ ok: true });
    } catch (err) {
      console.error("[consultations patient-phone] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Consultations du patient connecté.
  app.get("/api/consultations/mine", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const list = await db.select().from(consultations)
        .where(eq(consultations.userId, userId))
        .orderBy(desc(consultations.createdAt));
      // Enrichit avec la note + le statut d'envoi du rapport (colonnes via ALTER).
      try {
        const rows = Rows(await db.execute(sql`SELECT id, rating, whatsapp_send_status FROM consultations WHERE user_id = ${userId}`));
        const m = new Map(rows.map((r: any) => [Number(r.id), r]));
        list.forEach((c: any) => { const r = m.get(c.id); c.rating = r?.rating ?? null; c.reportStatus = r?.whatsapp_send_status ?? null; });
      } catch {}
      res.json({ consultations: list });
    } catch (e) {
      res.json({ consultations: [] });
    }
  });

  // Badge global : total de messages non lus du patient (toutes consultations).
  app.get("/api/consultations/unread-total", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.json({ total: 0 });
    try {
      const rows = Rows(await db.execute(sql`SELECT COALESCE(SUM(unread_patient),0) AS t FROM consultations WHERE user_id = ${userId}`));
      res.json({ total: Number(rows[0]?.t) || 0 });
    } catch { res.json({ total: 0 }); }
  });

  // Patient : note sa consultation (1-5 étoiles + commentaire). Note ≤2 → flag admin.
  app.post("/api/consultations/:id/rate", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const id = parseInt(req.params.id);
      const rating = Math.max(1, Math.min(5, parseInt(String(req.body?.rating), 10) || 0));
      if (!rating) return res.status(400).json({ message: "Note invalide (1 à 5)." });
      const comment = String(req.body?.comment || "").slice(0, 500);
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c || c.userId !== userId) return res.status(404).json({ message: "Consultation introuvable" });
      await db.execute(sql`UPDATE consultations SET rating = ${rating}, rating_comment = ${comment || null}, rated_at = NOW(), flagged_review = ${rating <= 2} WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (err) {
      console.error("[consultations rate] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Admin : confirme le paiement → la consultation s'ouvre.
  app.post("/api/admin/consultations/:id/confirm", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.update(consultations)
        .set({ paymentStatus: "paid", status: "open" })
        .where(eq(consultations.id, id)).returning();
      if (!c) return res.status(404).json({ message: "Consultation introuvable" });
      // Notifie les DEUX parties (dermatologue + patient) : WS + push + email.
      await notifyConsultationOpened(c);
      res.json({ consultation: c });
    } catch (err) {
      console.error("[consultations confirm] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // PAIEMENT MOBILE MONEY (MTN + Orange). Provider choisi selon les clés
  // présentes dans Railway. Priorité : Monetbil > CinetPay > simulé (admin).
  // Aucune régression : le simulé reste le fallback si aucune clé.
  //   Monetbil : MONETBIL_SERVICE_KEY, MONETBIL_SERVICE_SECRET
  //   CinetPay : CINETPAY_API_KEY, CINETPAY_SITE_ID
  //   (optionnel) PUBLIC_BASE_URL (défaut https://glow-scan.com)
  // ════════════════════════════════════════════════════════════════════
  const MONETBIL_SERVICE_KEY = process.env.MONETBIL_SERVICE_KEY || "";
  const MONETBIL_SERVICE_SECRET = process.env.MONETBIL_SERVICE_SECRET || "";
  const MONETBIL_ON = !!(MONETBIL_SERVICE_KEY && MONETBIL_SERVICE_SECRET);
  const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY || "";
  const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || "";
  const CINETPAY_ON = !MONETBIL_ON && !!(CINETPAY_API_KEY && CINETPAY_SITE_ID);
  // Option 3 — paiement manuel WhatsApp : force le flux manuel (patient paie sur le
  // numéro perso → l'admin confirme → chat déverrouillé), même si des clés passerelle
  // existent. Mettre PAYMENT_MANUAL_ONLY=1 sur Railway le temps de l'approbation.
  const PAYMENT_MANUAL_ONLY = process.env.PAYMENT_MANUAL_ONLY === "1" || process.env.PAYMENT_MANUAL_ONLY === "true";
  const PAYMENT_PROVIDER = PAYMENT_MANUAL_ONLY ? "simulated" : MONETBIL_ON ? "monetbil" : CINETPAY_ON ? "cinetpay" : "simulated";
  const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");

  // Passe une consultation à "payée + ouverte" et notifie le dermatologue.
  const markConsultationPaid = async (id: number) => {
    const [c] = await db.update(consultations)
      .set({ paymentStatus: "paid", status: "open" })
      .where(eq(consultations.id, id)).returning();
    if (!c) return null;
    // Notifie les DEUX parties (dermatologue + patient) : WS + push + email.
    await notifyConsultationOpened(c);
    return c;
  };

  // Indique au client quel provider de paiement est actif (sinon → flux simulé).
  app.get("/api/payments/config", (_req, res) => {
    res.json({ provider: PAYMENT_PROVIDER });
  });

  // Initie un paiement CinetPay pour une consultation → renvoie l'URL de paiement.
  app.post("/api/consultations/:id/pay/init", paymentLimiter, async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    if (PAYMENT_PROVIDER === "simulated") return res.status(503).json({ code: "PAYMENT_SIMULATED", message: "Paiement en ligne non configuré." });
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c || c.userId !== userId) return res.status(404).json({ message: "Consultation introuvable" });
      if (c.paymentStatus === "paid") return res.json({ alreadyPaid: true });
      const amount = Math.max(100, Number(c.priceFcfa) || 3500);
      const transactionId = `GSCONS-${id}-${Date.now()}`;
      await db.update(consultations).set({ paymentRef: transactionId }).where(eq(consultations.id, id));

      // ── Monetbil : URL widget v2.1 (la page hébergée gère MTN + Orange) ──
      if (MONETBIL_ON) {
        const params = new URLSearchParams({
          amount: String(amount),
          item_ref: transactionId,
          payment_ref: transactionId,
          currency: "XAF",
          country: "CM",
          locale: "fr",
          user: userId,
          return_url: `${PUBLIC_BASE_URL}/consultation/confirmee?id=${id}`,
          notify_url: `${PUBLIC_BASE_URL}/api/payments/monetbil/notify`,
        });
        const paymentUrl = `https://www.monetbil.com/widget/v2.1/${MONETBIL_SERVICE_KEY}?${params.toString()}`;
        return res.json({ paymentUrl, transactionId });
      }

      // ── CinetPay ──
      const payload = {
        apikey: CINETPAY_API_KEY,
        site_id: CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount,
        currency: "XAF",
        description: `Consultation dermatologue GlowScan #${id}`,
        notify_url: `${PUBLIC_BASE_URL}/api/payments/cinetpay/webhook`,
        return_url: `${PUBLIC_BASE_URL}/consultation/confirmee?id=${id}`,
        channels: "MOBILE_MONEY",
        lang: "fr",
      };
      const r = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const j: any = await r.json();
      if (j?.code === "201" && j?.data?.payment_url) {
        res.json({ paymentUrl: j.data.payment_url, transactionId });
      } else {
        console.error("[cinetpay init] réponse inattendue:", JSON.stringify(j).slice(0, 300));
        res.status(502).json({ message: j?.description || "Échec initialisation paiement." });
      }
    } catch (err) {
      console.error("[pay init] error:", err);
      res.status(500).json({ message: "Erreur serveur paiement" });
    }
  });

  // Vérifie le statut d'un paiement (polling client toutes les 3s) via CinetPay check.
  app.get("/api/consultations/:id/pay/status", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c || c.userId !== userId) return res.status(404).json({ message: "Consultation introuvable" });
      if (c.paymentStatus === "paid") return res.json({ status: "paid" });
      if (!CINETPAY_ON || !c.paymentRef) return res.json({ status: c.paymentStatus === "paid" ? "paid" : "pending" });
      const r = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: CINETPAY_API_KEY, site_id: CINETPAY_SITE_ID, transaction_id: c.paymentRef }),
      });
      const j: any = await r.json();
      const st = String(j?.data?.status || "").toUpperCase();
      if (j?.code === "00" && st === "ACCEPTED") {
        await markConsultationPaid(id);
        return res.json({ status: "paid" });
      }
      if (st === "REFUSED") return res.json({ status: "failed" });
      res.json({ status: "pending" });
    } catch (err) {
      console.error("[cinetpay status] error:", err);
      res.json({ status: "pending" });
    }
  });

  // Webhook CinetPay (notify_url) — source de vérité. On revérifie via check API.
  app.post("/api/payments/cinetpay/webhook", async (req: any, res) => {
    try {
      const transactionId = String(req.body?.cpm_trans_id || req.body?.transaction_id || "");
      if (!CINETPAY_ON || !transactionId) return res.status(200).send("ignored");
      // Revérification serveur-à-serveur (ne jamais faire confiance au POST brut).
      const r = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: CINETPAY_API_KEY, site_id: CINETPAY_SITE_ID, transaction_id: transactionId }),
      });
      const j: any = await r.json();
      if (j?.code === "00" && String(j?.data?.status || "").toUpperCase() === "ACCEPTED") {
        const m = transactionId.match(/^GSCONS-(\d+)-/);
        if (m) await markConsultationPaid(parseInt(m[1]));
      }
      res.status(200).send("ok");
    } catch (err) {
      console.error("[cinetpay webhook] error:", err);
      res.status(200).send("error-logged");
    }
  });

  // Webhook Monetbil (notify_url) — source de vérité. Revérif serveur-à-serveur
  // via checkPayment (on ne fait jamais confiance au POST brut). status 1 = succès.
  // Accepte GET et POST (la méthode dépend de la config du service Monetbil).
  const monetbilNotify = async (req: any, res: any) => {
    try {
      if (!MONETBIL_ON) return res.status(200).send("ignored");
      const b = { ...(req.query || {}), ...(req.body || {}) };
      const itemRef = String(b.item_ref || b.payment_ref || "");
      const paymentId = String(b.paymentId || b.payment_id || "");
      let confirmed = false;
      if (paymentId) {
        const r = await fetch("https://api.monetbil.com/payment/v1/checkPayment", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ paymentId }).toString(),
        });
        const j: any = await r.json().catch(() => ({}));
        const st = j?.transaction?.status ?? j?.status;
        confirmed = String(st) === "1";
      } else {
        // Fallback moins sûr si pas de paymentId : accepte uniquement "success".
        confirmed = String(b.status || "").toLowerCase() === "success";
      }
      if (confirmed) {
        const m = itemRef.match(/^GSCONS-(\d+)-/);
        if (m) await markConsultationPaid(parseInt(m[1]));
      }
      res.status(200).send("ok");
    } catch (err) {
      console.error("[monetbil notify] error:", err);
      res.status(200).send("error-logged");
    }
  };
  app.post("/api/payments/monetbil/notify", monetbilNotify);
  app.get("/api/payments/monetbil/notify", monetbilNotify);

  // Admin : liste des consultations en attente de confirmation de paiement.
  app.get("/api/admin/consultations", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const list = await db.select().from(consultations).orderBy(desc(consultations.createdAt)).limit(100);
      res.json({ consultations: list });
    } catch (e) {
      res.json({ consultations: [] });
    }
  });

  // Résout le rôle du user courant sur une consultation (patient / doctor).
  async function consultAccess(c: any, userId: string): Promise<{ side: "patient" | "doctor" | null; doctorUserId: string | null }> {
    let doctorUserId: string | null = null;
    try {
      const pr = Rows(await db.execute(sql`SELECT user_id FROM pro_accounts WHERE id = ${c.proAccountId}`));
      doctorUserId = pr[0]?.user_id || null;
    } catch {}
    const side = c.userId === userId ? "patient" : (doctorUserId === userId ? "doctor" : null);
    return { side, doctorUserId };
  }

  // Détail d'une consultation + fil de messages (accès patient OU dermatologue).
  app.get("/api/consultations/:id", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c) return res.status(404).json({ message: "Consultation introuvable" });
      const { side, doctorUserId } = await consultAccess(c, userId);
      if (!side) return res.status(403).json({ message: "Accès refusé" });
      // Marque comme LUS les messages de l'AUTRE côté + remet le compteur à 0.
      const otherType = side === "patient" ? "doctor" : "patient";
      try {
        await db.update(consultationMessages)
          .set({ readAt: new Date() })
          .where(and(eq(consultationMessages.consultationId, id), eq(consultationMessages.senderType, otherType), isNull(consultationMessages.readAt)));
        await db.update(consultations)
          .set(side === "patient" ? { unreadPatient: 0 } : { unreadDoctor: 0 })
          .where(eq(consultations.id, id));
        // Prévient l'autre partie que ses messages sont vus (accusé « Vu »).
        const otherUserId = side === "patient" ? doctorUserId : c.userId;
        if (otherUserId) emitToUser(otherUserId, "consultation:read", { consultationId: id, readerSide: side });
      } catch {}
      const msgs = await db.select().from(consultationMessages)
        .where(eq(consultationMessages.consultationId, id))
        .orderBy(consultationMessages.createdAt);
      const otherUserId = side === "patient" ? doctorUserId : c.userId;
      // BLOC B : infos dermatologue pour l'entête (nom + photo + badge certifié).
      let doctor: any = null;
      try {
        const d = Rows(await db.execute(sql`SELECT full_name, cabinet_name, city, photo_url, COALESCE(is_certified,false) AS certified, slug FROM pro_accounts WHERE id = ${c.proAccountId}`))[0] as any;
        if (d) doctor = { fullName: d.full_name, cabinet: d.cabinet_name, city: d.city, photoUrl: d.photo_url || null, certified: d.certified === true, slug: d.slug || null };
      } catch {}
      res.json({ consultation: c, messages: msgs, side, otherUserId, doctor, otherOnline: otherUserId ? isUserOnline(otherUserId) : false });
    } catch (err) {
      console.error("[consultations get] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Envoyer un message dans une consultation (temps réel via WebSocket).
  // Signal "en train d'écrire" — émis à l'autre partie (léger, best-effort).
  app.post("/api/consultations/:id/typing", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.json({ ok: false });
    try {
      const id = parseInt(req.params.id);
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c) return res.json({ ok: false });
      const { side, doctorUserId } = await consultAccess(c, userId);
      if (!side) return res.json({ ok: false });
      const otherUserId = side === "patient" ? doctorUserId : c.userId;
      if (otherUserId) emitToUser(otherUserId, "consultation:typing", { consultationId: id, side });
      res.json({ ok: true });
    } catch { res.json({ ok: false }); }
  });

  // Téléchargement du rapport de consultation (HTML imprimable → PDF).
  // Autorisé si : token signé valide (lien WhatsApp/push) OU participant connecté.
  app.get("/api/consultations/:id/report/download", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const token = String(req.query.token || "");
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c) return res.status(404).send("Rapport introuvable");
      let allowed = false;
      if (token && verifyReportToken(token, id)) allowed = true;
      else {
        const userId = getUID(req);
        if (userId) { const { side } = await consultAccess(c, userId); allowed = !!side; }
      }
      if (!allowed) return res.status(403).send("Accès refusé");
      const msgs = await db.select().from(consultationMessages)
        .where(eq(consultationMessages.consultationId, id)).orderBy(consultationMessages.createdAt);
      let doctorName = "GlowScan", patientName = "Patient";
      try {
        const d = Rows(await db.execute(sql`SELECT full_name FROM pro_accounts WHERE id = ${c.proAccountId}`))[0] as any;
        if (d?.full_name) doctorName = d.full_name;
        const u = Rows(await db.execute(sql`SELECT first_name FROM users WHERE id = ${c.userId}`))[0] as any;
        if (u?.first_name) patientName = u.first_name;
      } catch {}
      // Prescription (colonne hors schéma Drizzle) + diagnostic retenu (scan corrigé).
      let prescription: string | null = null, finalCondition: string | null = null;
      try { prescription = (Rows(await db.execute(sql`SELECT prescription FROM consultations WHERE id = ${id}`))[0] as any)?.prescription || null; } catch {}
      try {
        if (c.scanId) {
          const s = Rows(await db.execute(sql`SELECT COALESCE(expert_corrected_condition, condition) AS fc, is_verified FROM scans WHERE id = ${c.scanId}`))[0] as any;
          if (s?.is_verified && s?.fc) finalCondition = s.fc;
        }
      } catch {}
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(buildReportHtml({ ...c, prescription, final_condition: finalCondition }, msgs, doctorName, patientName));
    } catch (err) {
      console.error("[report download] error:", err);
      res.status(500).send("Erreur serveur");
    }
  });

  app.post("/api/consultations/:id/messages", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Connexion requise" });
    try {
      const id = parseInt(req.params.id);
      const body = (req.body?.body || "").toString().trim();
      const imageUrl = req.body?.imageUrl || null;
      if (!body && !imageUrl) return res.status(400).json({ message: "Message vide" });
      const [c] = await db.select().from(consultations).where(eq(consultations.id, id));
      if (!c) return res.status(404).json({ message: "Consultation introuvable" });
      const { side, doctorUserId } = await consultAccess(c, userId);
      if (!side) return res.status(403).json({ message: "Accès refusé" });
      if (c.paymentStatus !== "paid") return res.status(402).json({ message: "Consultation non encore confirmée." });

      const [m] = await db.insert(consultationMessages).values({
        consultationId: id, senderType: side, senderId: userId,
        body: body || null, imageUrl,
      }).returning();

      const patch: any = { lastMessageAt: new Date() };
      if (side === "patient") patch.unreadDoctor = (c.unreadDoctor || 0) + 1;
      else { patch.unreadPatient = (c.unreadPatient || 0) + 1; patch.status = "answered"; }
      await db.update(consultations).set(patch).where(eq(consultations.id, id));

      // Temps réel : émission aux deux parties (chacune dans sa room user).
      const payload = { consultationId: id, message: m };
      try { if (c.userId) emitToUser(c.userId, "consultation:message", payload); } catch {}
      try { if (doctorUserId) emitToUser(doctorUserId, "consultation:message", payload); } catch {}

      // Notification push au DESTINATAIRE (l'autre partie).
      const preview = (body || "📷 Image").slice(0, 90);
      if (side === "patient") pushToUser(doctorUserId, "Nouveau message patient", preview, "/derm/consultations");
      else pushToUser(c.userId, "Réponse de votre dermatologue 👩🏾‍⚕️", preview, "/consultations");

      res.json({ message: m });
    } catch (err) {
      console.error("[consultations message] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ══ Transcription vocale (Whisper via Groq) — fiable sur TOUS les navigateurs ══
  // Contrairement à l'API Web Speech (qui ne marche pas sur Edge/Safari), on
  // enregistre l'audio côté client puis on le transcrit ici. Auto FR/EN.
  app.post("/api/transcribe", async (req: any, res) => {
    try {
      // Whisper : Groq en priorité (dédié audio), sinon le client openai courant.
      const audioClient = groqAudio || openai;
      if (!audioClient) {
        return res.status(503).json({ message: "Transcription indisponible (clé Groq/OpenAI manquante)." });
      }
      const { audioBase64, mimeType } = req.body || {};
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return res.status(400).json({ message: "audioBase64 manquant." });
      }
      // Data URL éventuelle → on retire le préfixe.
      const b64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
      const buffer = Buffer.from(b64, "base64");
      if (buffer.length < 800) {
        // Trop court = quasi silence : on renvoie vide sans erreur.
        return res.json({ text: "" });
      }
      const mt = (mimeType || "").toLowerCase();
      const ext = mt.includes("mp4") || mt.includes("m4a") ? "m4a"
        : mt.includes("ogg") ? "ogg"
        : mt.includes("wav") ? "wav"
        : mt.includes("mpeg") || mt.includes("mp3") ? "mp3" : "webm";
      // Type propre sans le suffixe ";codecs=..." qui peut gêner certains fournisseurs.
      const cleanType = (mimeType || "audio/webm").split(";")[0];
      const { toFile } = await import("openai");
      const file = await toFile(buffer, `audio.${ext}`, { type: cleanType });
      const model = process.env.TRANSCRIBE_MODEL || (groqAudio ? "whisper-large-v3-turbo" : "whisper-1");
      const tr: any = await audioClient.audio.transcriptions.create({ file, model, language: "fr" } as any);
      res.json({ text: (tr?.text || "").trim() });
    } catch (err: any) {
      const detail = err?.error?.message || err?.response?.data?.error?.message || err?.message || String(err);
      console.error("[transcribe] error:", detail);
      res.status(500).json({ message: "Transcription impossible pour le moment.", detail });
    }
  });

  // === Servir les photos d'analyses depuis Object Storage ===
  // Authentification requise + l'utilisateur ne peut voir QUE ses propres photos.
  app.get("/objects/scans/:filename", async (req, res) => {
    // 1) Bypass admin si la session a déjà été marquée admin par /api/admin/dataset.
    //    On NE lit PLUS la clé admin depuis l'URL (fuite via logs/historique).
    const isAdmin = (req.session as any)?.isAdmin === true;

    if (!isAdmin) {
      if (!isAuth(req)) return res.status(401).json({ message: "Unauthorized" });
      const userId = getUID(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const objectPath = `/objects/scans/${req.params.filename}`;
      const userScans = await storage.getScansByUser(userId);
      const owns = userScans.some((s) => s.imageUrl === objectPath);
      if (!owns) return res.status(403).json({ message: "Forbidden" });
    }

    const objectPath = `/objects/scans/${req.params.filename}`;
    try {
      const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile(objectPath);
      await svc.downloadObject(file, res);
    } catch (err) {
      console.error("[objects] erreur lecture photo:", err);
      return res.status(404).json({ message: "Not found" });
    }
  });

  // === Health check IA ===
  // ────────────────────────────────────────────────────
  // GET /api/health — Health check pour monitoring (UptimeRobot, Pingdom, etc.)
  // ────────────────────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    try {
      const startTime = Date.now();

      // 🔴 VÉRIFIER : Base de données
      const dbCheck = await db.select(sql`1`).catch(() => null);
      const dbOk = !!dbCheck;

      const responseTime = Date.now() - startTime;

      // Status final
      const isHealthy = dbOk; // Ajouter plus de checks si nécessaire

      res.status(isHealthy ? 200 : 503).json({
        ok: isHealthy,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        checks: {
          database: dbOk ? "✅ online" : "❌ offline",
          responseTime: `${responseTime}ms`,
        },
        environment: process.env.NODE_ENV || "unknown",
      });
    } catch (err) {
      console.error("[/api/health] Check failed:", err);
      res.status(503).json({
        ok: false,
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/health/ai", async (_req, res) => {
    const provider = AI_PROVIDER;
    const activeKey = USE_GROQ ? _groqKey : (USE_GEMINI ? _geminiKey : _openaiKey);
    if (!activeKey) {
      return res.status(503).json({
        ok: false,
        provider,
        error: "Aucune clé API trouvée",
        hint: `${USE_GROQ ? "GROQ" : USE_GEMINI ? "GEMINI" : "OPENAI"}_API_KEY manquante dans Railway`,
      });
    }
    try {
      // Appel minimal pour valider la clé
      if (USE_GEMINI && gemini) {
        const m = gemini.getGenerativeModel({ model: AI_MODEL });
        await Promise.race([
          m.generateContent("Réponds juste: ok"),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000)),
        ]);
      } else if (openai) {
        await openai.chat.completions.create({
          model: AI_MODEL_FAST,
          messages: [{ role: "user", content: "Réponds juste: ok" }],
          max_tokens: 10,
        }, { timeout: 10000, maxRetries: 0 });
      } else {
        throw new Error("Aucun provider IA configuré");
      }
      return res.json({
        ok: true,
        provider,
        model: AI_MODEL,
        modelFast: AI_MODEL_FAST,
        keyPrefix: activeKey.slice(0, 8) + "…",
      });
    } catch (err: any) {
      return res.status(503).json({
        ok: false,
        provider,
        error: err?.message || String(err),
        keyPrefix: activeKey.slice(0, 8) + "…",
        hint: "Vérifie la clé API dans Railway",
      });
    }
  });

  // === Route de service d'images temporaires ===
  // Permet à OpenAI d'accéder aux images via URL publique au lieu de base64
  app.get("/api/img/:id", (req, res) => {
    const img = tempImages.get(req.params.id);
    if (!img) return res.status(404).send("Not found");
    res.setHeader("Content-Type", img.mime);
    res.setHeader("Cache-Control", "no-store");
    res.send(img.buffer);
  });

  // === AI Analysis Endpoint ===
  // === Helper: vérifier statut abonnement + comptage scans du mois ===
  const FREE_SCAN_LIMIT = 9999;
  const PREMIUM_PRICE_FCFA = 2000;

  async function checkScanQuota(userId: string): Promise<{ allowed: boolean; isPremium: boolean; scansThisMonth: number; reason?: string }> {
    // 1. Vérifier abonnement actif
    const activeSub = await db.select().from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gte(subscriptions.expiresAt, new Date()),
      ))
      .limit(1);

    if (activeSub.length > 0) {
      return { allowed: true, isPremium: true, scansThisMonth: 0 };
    }

    // 2. Compter scans du mois en cours
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await db.select({ count: count() }).from(scans)
      .where(and(
        eq(scans.userId, userId),
        gte(scans.createdAt, startOfMonth),
      ));

    const scansThisMonth = result[0]?.count ?? 0;
    const allowed = scansThisMonth < FREE_SCAN_LIMIT;
    return {
      allowed,
      isPremium: false,
      scansThisMonth,
      reason: allowed ? undefined : `Limite atteinte (${FREE_SCAN_LIMIT} analyses/mois)`,
    };
  }

  app.post(api.scans.analyze.path, analyzeLimiter, async (req: any, res) => {
    try {
      let { image, area } = api.scans.analyze.input.parse(req.body);

      // Multi-angles : le client peut envoyer jusqu'à 3 photos (face, profil droit,
      // profil gauche) via req.body.images. La 1re sert de photo principale (stockage,
      // qualité) ; toutes sont envoyées à l'IA pour un diagnostic plus fiable.
      const rawImages: string[] = Array.isArray((req.body as any)?.images)
        ? (req.body as any).images.filter((x: any) => typeof x === "string" && x.trim())
        : [];
      const imageList: string[] = rawImages.length > 0 ? rawImages : (image ? [image] : []);
      if (imageList.length > 0) image = imageList[0];

      if (!image) {
        return res.status(400).json({ message: "Image is required" });
      }

      // === Auth check : 1 analyse anonyme autorisée, ensuite compte requis ===
      const userId = req.session?.userId || req.user?.id || (req.user as any)?.claims?.sub;
      const isAnonymous = !isAuth(req);

      // 🔑 SÉCURITÉ CRITIQUE : seuls les doctors (dermatologues) peuvent lancer l'analyse
      // Les secrétaires voient l'erreur 403 si elles essaient d'appeler cet endpoint
      if (userId && !isAnonymous) {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, userId));
          if (user && user.role === "secretary") {
            console.warn(`[security] ⚠️ Tentative non-autorisée par secretary ${user.email} sur POST /api/analyze`);
            return res.status(403).json({
              message: "Seules les dermatologues peuvent lancer une analyse",
              code: "DOCTOR_ONLY",
            });
          }
        } catch (dbErr: any) {
          console.warn(`[db] ⚠️ Erreur lors de vérification rôle (migration 0002 appliquée?): ${dbErr.message}`);
          // Si la colonne role n'existe pas en BD, on continue quand même (backward compat)
          // mais on log l'erreur pour debug
        }
      }

      if (isAnonymous) {
        // Déjà utilisé son analyse anonyme → invitation à créer un compte
        if (req.session?.anonymousScanUsed) {
          return res.status(401).json({
            code: "ANON_QUOTA_EXCEEDED",
            message: "Crée un compte gratuit pour continuer tes analyses.",
          });
        }
      } else {
        // === Vérification quota utilisateur connecté ===
        const quota = await checkScanQuota(userId!);
        if (!quota.allowed) {
          return res.status(403).json({
            code: "QUOTA_EXCEEDED",
            message: quota.reason,
            scansThisMonth: quota.scansThisMonth,
            limit: FREE_SCAN_LIMIT,
            priceFcfa: PREMIUM_PRICE_FCFA,
          });
        }
      }

      const areaLabels: Record<string, string> = {
        face: "visage",
        body: "corps",
        hair: "cheveux et cuir chevelu"
      };
      const areaLabel = areaLabels[area] || area;

      // ── Données patient (formulaire d'intake) ─────────────────────────────
      const intake = (req.body as any).intake as {
        fullName?: string;
        phone?: string;
        age?: string;
        duration?: string;
        previousProducts?: string;
        allergies?: string;
        region?: string;
        motif?: string;
        chiefComplaint?: string;
      } | undefined;

      // Construction du contexte patient pour enrichir le prompt IA
      // ── Détection mode DERM (B2B) ──────────────────────────────────────
      // /api/analyze est partagé B2C/DERM. Le mode DERM (architecture de sortie
      // séparée) est activé UNIQUEMENT si :
      //   1) le frontend envoie mode === "derm"
      //   2) ET l'utilisateur connecté possède un compte pro
      // Sinon → chemin B2C strictement inchangé (aucune requête DB ajoutée).
      const reqMode = (req.body as any)?.mode;
      let isProRequest = false;
      if (reqMode === "derm" && userId && !isAnonymous) {
        try {
          const [pa] = await db.select().from(proAccounts).where(eq(proAccounts.userId, userId));
          isProRequest = !!pa;
        } catch (e) {
          console.warn("[analyze] vérif compte pro échouée (mode derm):", (e as any)?.message);
        }
      }

      // Pour le mode Pro, les antécédents sont injectés dans le system prompt via {PATIENT_INTAKE}
      // Pour le mode B2C, ils sont injectés dans le message utilisateur
      const patientIntakeData = intake ? JSON.stringify({
        age: intake.age,
        sexe: (intake as any).sexe,
        duration: intake.duration,
        previousProducts: intake.previousProducts,
        allergies: intake.allergies,
        chiefComplaint: intake.chiefComplaint || intake.motif,
        region: intake.region,
        motif: intake.motif,
        // Examen physique du médecin (documenté AVANT l'IA) — l'IA doit en tenir compte
        examenPhysiqueMedecin: (intake as any).examen || undefined,
      }, null, 2) : "Aucun antécédent fourni.";

      const patientContext = (!isProRequest && intake) ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOSSIER PATIENT — INFORMATIONS CLINIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${intake.age ? `• Âge de la patiente : ${intake.age}` : ""}
${(intake as any).sexe ? `• Sexe : ${(intake as any).sexe}` : ""}
${intake.duration ? `• Problème présent depuis : ${intake.duration}` : ""}
${intake.previousProducts?.trim() ? `• Produits / crèmes déjà utilisés : ${intake.previousProducts}` : "• Aucun produit déjà utilisé mentionné"}
${intake.allergies?.trim() ? `• Allergies cutanées connues : ${intake.allergies}` : "• Aucune allergie connue signalée"}

INSTRUCTIONS OBLIGATOIRES basées sur ce contexte :
${intake.age ? `- L'âge ${intake.age} impacte le diagnostic : adapter le profil hormonal, le type d'acné probable, la production de sébum et les risques de PIH attendus à cet âge sur peau africaine.` : ""}
${intake.duration ? `- Ce problème dure depuis ${intake.duration}. Calibrer l'urgence du traitement : pathologie récente = stade débutant, chronique = risque de fixation des taches/cicatrices plus élevé.` : ""}
${intake.previousProducts?.trim() ? `- Elle a DÉJÀ essayé ces produits : "${intake.previousProducts}". NE PAS recommander les mêmes dans le protocole. Si ces produits contiennent des ingrédients nocifs (éclaircissants, mercure, corticoïdes), mentionner le risque dans le diagnostic.` : ""}
${intake.allergies?.trim() ? `- ALLERGIES CONNUES : "${intake.allergies}". NE JAMAIS recommander des produits ou ingrédients pouvant déclencher ces allergies.` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : "";

      // Système Pro : injecter les antécédents dans le system prompt AVANT l'analyse photo
      const activeSystemPrompt = isProRequest
        ? GLOWSCAN_DERM_SYSTEM_PROMPT.replace("{PATIENT_INTAKE}", patientIntakeData)
        : GLOWSCAN_SYSTEM_PROMPT;

      const prompt = `${patientContext}Analyse la photo de ${areaLabel} (zone : ${area}).

Retourne UNIQUEMENT ce JSON valide et complet, sans texte avant ni après :
{
  "score": number (0-100 selon le barème calibré ci-dessus),
  "condition": "OBLIGATOIRE : terme médical précis SUIVI de son explication entre parenthèses. Format : 'Terme médical (explication simple en langage courant)'. Exemples valides : 'Acné Vulgaire Légère (boutons rouges actifs sur la zone T)', 'Hyperpigmentation Post-Inflammatoire (taches sombres laissées par d'anciens boutons)', 'Dermatite Séborrhéique (excès de sébum avec rougeurs et squames)', 'Xérose Cutanée (peau très sèche manquant de lipides)', 'Peau Nette — Type Mixte (peau saine avec zone T légèrement plus grasse)'. JAMAIS écrire 'Peau Normale' seul sans type précis. JAMAIS de terme médical sans son explication.",
  "severity": "Légère" | "Modérée" | "Sévère",
  "skinType": "Type précis avec explication (ex: 'Peau Grasse à Tendance Acnéique (production excessive de sébum favorisant les boutons)', 'Peau Sèche et Réactive (manque d'hydratation, sensible aux agressions)', 'Cuir Chevelu Séborrhéique (excès de gras au niveau du cuir chevelu)')",
  "details": "Analyse clinique MÉDICALE en 4-6 phrases qui DOIT respecter la règle de copywriting GlowScan (décodage + info inédite + fragilité). RÈGLE ABSOLUE : chaque terme médical (papules, pustules, comédons ouverts, comédons fermés, macules PIH, plaques érythémateuses, squames, érythème, télangiectasies, etc.) DOIT être suivi immédiatement de son explication entre parenthèses en langage courant. STRUCTURE OBLIGATOIRE : (1) le CONSTAT clinique précis avec zones, (2) le MÉCANISME qui l'explique (pourquoi sur SA peau, climat Douala, phototype, sébum, barrière), (3) une INFO QU'ELLE NE SAVAIT PAS (signal faible, micro-déséquilibre), (4) la FRAGILITÉ / projection (ce qui peut basculer dans 4-6 semaines). Exemples : 'Acné inflammatoire (boutons rouges actifs) sur le front et le menton, et comédons ouverts (points noirs) sur la zone T. Ce profil est typique du climat humide de Douala combiné à une production de sébum élevée — ta peau n'est pas fautive, c'est un terrain inflammatoire actif. On a aussi détecté un début d'hyperpigmentation post-inflammatoire invisible à l'œil sur la joue droite (signal faible PIH). Sans soin ciblé dans les 3-4 prochaines semaines, ces marques risquent de se fixer durablement sur ta peau foncée.' OU pour peau saine : appliquer la STRUCTURE PEAU SAINE (statut + décodage mécanisme + signal faible + fragilité — voir bloc dédié). Ton bienveillant, utilise 'ta peau' et 'tu', jamais alarmiste, jamais 'Bravo' tout seul.",
  "zones": [
    "OBLIGATOIRE : 3 à 6 zones avec leur état. Format pour chaque zone : { \"name\": \"Front\" | \"Joue gauche\" | \"Joue droite\" | \"Nez\" | \"Menton\" | \"Contour des lèvres\" | \"Cuir chevelu\" | \"Tempes\" | \"Cou\", \"status\": \"red\" (problème actif visible) | \"yellow\" (à surveiller) | \"green\" (zone saine), \"issue\": \"Brève description si red/yellow, ex: 'Comédons fermés (points blancs)' — vide si green\" }"
  ],
  "motivation": "Phrase signature GlowScan en 1-2 lignes (max 200 caractères) qui transmet la promesse 'on connaît ta peau, on garde ta mémoire'. PAS un conseil produit générique. DOIT contenir soit (a) une info personnelle qu'elle ne savait pas hier, (b) une projection à J+30/J+60, (c) un repère social (top X% Douala / phototype IV-VI), ou (d) un rappel de fragilité. Exemples valides : 'Ta peau est dans le top 8% à Douala ce mois-ci — on garde la mémoire de ce qui te protège pour que tu ne repartes jamais de zéro.' / 'Cet équilibre tient grâce à ta barrière cutanée intacte. Sans suivi, il peut basculer en 4-6 semaines (harmattan, stress). Rescanne dans 14 jours.' / 'Tu sais que ta routine marche. Voici pourquoi : sébum maîtrisé + tolérance climat humide. On surveille ces 2 leviers.'",
  "stats": {
    "lesions": "Description précise (ex: Papules inflammatoires (8-12), Plaques eczémateuses, Macules hyperpigmentées (15+))",
    "zones": "OBLIGATOIRE : localisation anatomique PRÉCISE des lésions/boutons visibles, séparée par '+', max 3 zones, format court (max 35 caractères). Ex: 'Front + Menton', 'Zone T + Joue droite', 'Nez + Pommettes', 'Tempes + Mâchoire', 'Plis des coudes', 'Cuir chevelu frontal'. JAMAIS de description longue, JAMAIS '—' s'il y a au moins une lésion. Si peau saine sans lésion, écris 'Aucune zone affectée'. Cette valeur s'affiche dans une tuile compacte de l'interface — sois ULTRA-PRÉCIS sur OÙ se trouvent les boutons.",
    "pores": "État et taille (ex: Très dilatés — grade 3, Obstrués points noirs, Fins et invisibles)",
    "marks": "Type et quantité (ex: 6 cicatrices post-acné, Taches PIH diffuses, Squames blanches)"
  },
  "balance": {
    "inflammation": number (0-10, 0=aucune, 10=inflammation massive),
    "sebum": number (0-10, 0=peau très sèche, 10=excès sébum extrême),
    "pores": number (0-10, 0=pores invisibles, 10=pores très dilatés),
    "sensitivity": number (0-10, 0=peau robuste, 10=peau très réactive),
    "scars": number (0-10, 0=aucune marque, 10=cicatrices/taches sévères)
  },
  "recommendations": {
    "products": [
      "UN SEUL produit partenaire GlowScan — RÈGLE ABSOLUE. Marque maison GLOWSCAN DERMO uniquement : Kit Peau Nette 30J, Kit Éclat Anti-Taches, Kit Anti-Âge, Gel Nettoyant Anti-Sébum, Sérum Niacinamide 10%, Lotion Exfoliante BHA 2%, Sérum Vitamine C 15%, Crème Anti-Taches Nuit, Sérum Rétinol, Crème SPF50+, Crème Barrière Céramides. Problème cuir chevelu/cheveux → AUCUN produit, orienter dermatologue. INTERDIT ABSOLU dans ce champ : Bioderma, Uriage, Topicrem, Nubiance, La Roche-Posay, Eucerin, CeraVe, Garnier, Nivea, L'Oréal — boutique /shop uniquement, jamais ici."
    ],
    "morning": [
      "Étape 1 matin précise avec produit nommé",
      "Étape 2 matin précise avec produit nommé",
      "Étape 3 matin (SPF si visage exposé)"
    ],
    "evening": [
      "Étape 1 soir précise avec produit nommé",
      "Étape 2 soir précise avec produit nommé",
      "Étape 3 soir précise avec produit nommé"
    ],
    "weekly": "Soin hebdomadaire spécifique au diagnostic (ex: Masque argile 1×/semaine pour peau grasse, Gommage doux 1×/semaine pour hyperpigmentation)"
  },
  "predictiveInsights": {
    "risks": [
      {
        "level": "high" | "medium" | "low",
        "risk": "Risque précis basé sur les signes visibles (ex: 'Sans traitement, ces papules risquent de laisser des taches hyperpigmentées permanentes sur peau foncée', 'L'alopécie de traction visible aux tempes peut devenir irréversible en 3-6 mois si les coiffures serrées continuent')",
        "delay": "Délai estimé avant que le risque se matérialise (ex: '2-4 semaines', '1-3 mois', '6 mois')"
      }
    ],
    "actionWindow": "Phrase courte sur l'urgence d'agir maintenant (ex: 'Tu es dans la phase réversible — agis dans les 3 prochaines semaines pour éviter des séquelles.', 'Condition stabilisée mais sans soin actif elle évoluera dans 1 mois.')"
  },
  "metrics": {
    "hydratation": "number 0-100 — niveau d'hydratation cutanée OBSERVÉ sur la photo (peau tendue/lisse=élevé, ridules de déshydratation/teint terne=bas). Estime sincèrement, ne donne pas toujours 70.",
    "eclat": "number 0-100 — éclat / luminosité du teint OBSERVÉ (teint frais et lumineux=élevé, terne grisâtre=bas)",
    "purete": "number 0-100 — pureté cutanée OBSERVÉE (peau nette sans lésions=élevé, comédons/papules/taches multiples=bas)"
  },
  "zoneAnalysis": [
    {
      "name": "Zone T & Nez" | "Joues" | "Front" | "Contour des yeux" | "Menton" | "Tempes" | "Pourtour de la bouche" | "Cuir chevelu" | "Cou" | (autres zones pertinentes selon la photo),
      "status": "red" (problème actif visible) | "yellow" (à surveiller) | "green" (zone saine),
      "short": "Phrase courte (≤ 20 mots) avec le constat médical PRINCIPAL OBSERVÉ sur la photo. Termes médicaux suivis de leur explication entre parenthèses. Ex: 'Séborrhée active (excès de sébum) avec comédons ouverts (points noirs) sur le nez.'",
      "long": "Explication clinique étendue (3-5 phrases) UNIQUEMENT pour cette utilisatrice. Explique le mécanisme physiologique observé, le risque d'évolution, et la priorité de soin. Style dermatologue qui parle à sa patiente, ton bienveillant 'ta peau' / 'tu'. Pas de statistiques génériques. Pas de pourcentages."
    }
  ],
  "conclusion": {
    "short": "Conclusion médicale en 2 phrases maximum, qui résume le diagnostic dominant et la priorité de soin. Ex: 'L'analyse révèle une peau mixte à tendance déshydratée avec séborrhée en zone T et hyperpigmentation post-inflammatoire sur la joue gauche. La barrière cutanée semble fragilisée — priorité à l'hydratation et la régulation du sébum.'",
    "long": "Conclusion dermatologique étendue (4-6 phrases) intégrant le diagnostic, l'évaluation de la barrière cutanée, le pronostic d'évolution, et les axes thérapeutiques cosmétiques. Termes médicaux explicités. Termine par : 'Ce diagnostic IA est indicatif. Pour tout cas persistant ou sévère, une consultation dermatologique est recommandée.'"
  },
  "severityLevel": "number 1 à 5 selon le barème : 1 = peau saine ou très légèrement imparfaite (cosmétique simple suffit) ; 2 = cas léger à modéré (traitement cosmétique suffit) ; 3 = cas modéré (consultation dermatologue suggérée) ; 4 = cas marqué (consultation fortement recommandée) ; 5 = cas sévère (consultation médicale impérative). Sois calibré : un seul comédon = niveau 1, 2-3 boutons = niveau 2, acné inflammatoire active = 3, lésions étendues = 4, lésions sévères ou suspectes = 5.",
  "severityLabel": "Court label correspondant (ex: 'Peau saine', 'Cas léger à modéré — traitement cosmétique suffit', 'Cas modéré — consultation dermatologue suggérée', 'Cas marqué — consultation dermatologue fortement recommandée', 'Cas sévère — consultation médicale impérative')",
  "protocol": {
    "morning": [
      { "step": "Nom court de l'étape (ex: 'Nettoyant doux purifiant')", "product": "Catégorie de produit recommandée (ex: 'Gel moussant zone T à l'acide salicylique')", "why": "Bénéfice ciblé pour CETTE utilisatrice en 1 phrase courte (ex: 'pour éliminer l'excès de sébum sans agresser ta zone T')" },
      { "step": "...", "product": "...", "why": "..." }
    ],
    "evening": [
      { "step": "...", "product": "...", "why": "..." }
    ]
  },
  "analyse_zones": {
    "front": "Description technique courte de ce que tu vois sur le front (ex: 'Peau nette, 1 papule détectée à la racine des cheveux')",
    "nez": "Description technique courte du nez (ex: 'Pores dilatés visibles, brillance séborrhéique sur l'arête')",
    "joues": "Description technique courte des joues (ex: 'Légère rougeur sur la joue gauche, texture lisse')",
    "menton": "Description technique courte du menton (ex: 'Zone saine, aucune lésion visible')"
  },
  "justification_score": "1 phrase qui explique précisément pourquoi le score n'est pas 100/100 (ex: 'Présence de 3 comédons en zone T et légère inflammation diffuse')",
  "conseil_expert": "LE conseil prioritaire technique pour CETTE peau précise, en 1-2 phrases (ex: 'Introduis un sérum à la niacinamide 10% le soir pour réguler le sébum et atténuer la PIH sur la joue gauche')"
}

RÈGLES CHAMPS : "metrics" = valeurs réelles estimées (ne pas mettre 70/70/70 systématiquement). "zoneAnalysis" = 3-5 zones MAX pertinentes pour CETTE photo. "analyse_zones" = description technique ancrée dans ce que tu vois — si pas un visage, adapte les clés (mains: {dos, paume, doigts} ; cuir chevelu: {racines, longueurs, cuir}). "protocol" = 4 étapes matin/soir avec "why" personnalisé, SPF obligatoire en dernière étape matin. "severityLevel" = entier 1-5 honnête. "predictiveInsights" = 1-3 risques réels (pas de généralités). ZÉRO statistique générique.

JSON UNIQUEMENT — aucun texte avant ou après le JSON.`;

      // ── Few-shot RLHF : injecter les corrections expertes pour cette zone ──
      // Le médecin valide des scans avec correction → ces corrections sont injectées
      // dans le prompt à chaque nouvelle analyse, pour que l'IA arrête de répéter
      // les mêmes erreurs sans attendre le fine-tuning (qui demande 1000+ scans).
      let fewShotBlock = "";
      try {
        const examples = await storage.getFewShotExamples(area, 8);
        if (examples.length > 0) {
          const lines = examples.map((ex, i) => {
            const note = ex.expertNote ? ` — Note expert : "${ex.expertNote.slice(0, 200)}"` : "";
            return `${i + 1}. Sur photo similaire (zone ${areaLabel}), tu avais répondu : "${ex.aiCondition}". ❌ ERREUR. Le dermatologue expert a corrigé en : "${ex.correctedCondition}".${note}`;
          }).join("\n");
          fewShotBlock = `

══ CORRECTIONS RÉCENTES DE TON DERMATOLOGUE EXPERT (à NE PAS REPRODUIRE) ══
Voici ${examples.length} cas où tu t'es trompé sur cette zone, corrigés par le dermatologue humain. Tu dois IMPÉRATIVEMENT t'inspirer de ces corrections pour cette nouvelle analyse :
${lines}

RÈGLE ABSOLUE : si la photo actuelle ressemble à un de ces cas corrigés, applique le diagnostic CORRIGÉ par l'expert, PAS ton ancienne erreur.
`;
          console.log(`[analyze] 🧠 Few-shot RLHF : ${examples.length} corrections expertes injectées (zone=${area})`);
        }
      } catch (fsErr) {
        console.error("[analyze] ⚠️ Few-shot fetch error (non bloquant):", fsErr);
      }

      // Préparer le base64 pour OpenAI (envoi DIRECT, pas d'URL publique)
      let mimeForOpenAI = "image/jpeg";
      let rawBase64ForOpenAI = image;
      try {
        if (image.startsWith("data:")) {
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) { mimeForOpenAI = match[1]; rawBase64ForOpenAI = match[2]; }
        }
        const buffer = Buffer.from(rawBase64ForOpenAI, "base64");
        if (buffer.length < 100) throw new Error("Image trop petite ou invalide");
        console.log(`[analyze] Image prête (${Math.round(buffer.length / 1024)}KB) — envoi direct base64 à OpenAI`);
      } catch (imgErr) {
        console.error("[analyze] Erreur préparation image:", imgErr);
        return res.status(400).json({ message: "Image invalide ou corrompue" });
      }

      // ── Appel IA — base64 EN DIRECT à OpenAI (pas d'URL publique) ──
      // Pourquoi : en prod, OpenAI mettait 12-15s pour fetch chaque image depuis
      // notre serveur Replit, et le SDK retentait 2× en silence → 37s par appel.
      // Avec base64 data URL : zéro round-trip réseau, OpenAI lit l'image direct.
      // Optimisations vitesse :
      //  - model gpt-4o → bien moins de faux refus sur les selfies vs mini
      //  - detail: "low" → ~85 tokens d'image
      //  - max_tokens 1200, response_format json_object
      //  - timeout 30s + maxRetries 0 → un seul essai, on échoue vite
      const dataUrl = `data:${mimeForOpenAI};base64,${rawBase64ForOpenAI}`;
      // Toutes les images (multi-angles) COMPRESSÉES pour l'IA.
      // Une image haute résolution = énormément de tokens vision (10k+), ce qui
      // fait exploser la limite tokens/minute des fournisseurs (Groq free = 8000
      // TPM). On redimensionne à 768px max + JPEG q75 → ~1000-1500 tokens/image,
      // sans perte diagnostique notable sur une peau. Fallback : image d'origine.
      const downscaleForAI = async (raw: string): Promise<{ mime: string; b64: string }> => {
        let mime = "image/jpeg", b64 = raw;
        if (raw.startsWith("data:")) { const m = raw.match(/^data:([^;]+);base64,(.+)$/); if (m) { mime = m[1]; b64 = m[2]; } }
        try {
          const sharp = (await import("sharp")).default;
          const buf = Buffer.from(b64, "base64");
          const out = await sharp(buf).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
          return { mime: "image/jpeg", b64: out.toString("base64") };
        } catch (e) {
          console.warn("[analyze] compression image IA ignorée:", (e as any)?.message);
          return { mime, b64 };
        }
      };
      const visionImages = (await Promise.all(imageList.map(downscaleForAI)))
        .map((vi) => ({ ...vi, dataUrl: `data:${vi.mime};base64,${vi.b64}` }));
      const multiAngleNote = visionImages.length > 1
        ? `\n\nTu reçois ${visionImages.length} photos du MÊME patient sous différents angles (face, profil droit, profil gauche). Analyse-les ENSEMBLE et croise les angles pour un diagnostic plus fiable ; ne te limite pas à une seule vue.`
        : "";
      // Consigne selon la zone analysée (visage / corps / cheveux).
      const areaNote =
        area === "body"
          ? "\n\nZONE ANALYSÉE : LE CORPS (pas le visage). Raisonne en zones anatomiques du corps (tronc, dos, épaules, bras, avant-bras, mains, abdomen, jambes, pieds, plis/aisselles/aines) — n'utilise AUCUN repère facial (zone T, joues, front, menton). Pense aux pathologies fréquentes du corps sur peaux à fort phototype : eczéma/dermatite atopique, psoriasis, mycoses (dermatophyties, pityriasis versicolor), kératose pilaire, folliculite/pseudofolliculite, chéloïdes, hyperpigmentation post-inflammatoire, dyschromie, prurigo, gale, urticaire, vitiligo. Les zonesAnalysis doivent porter sur des zones du corps."
          : area === "hair"
          ? "\n\nZONE ANALYSÉE : LE CUIR CHEVELU / LES CHEVEUX. Raisonne cuir chevelu et phanères (alopécie de traction, pelade, dermite séborrhéique, folliculite, teigne, sécheresse/casse) — pas de repères faciaux."
          : "";
      const callAI = async (extraInstruction = ""): Promise<string> => {
        const t0 = Date.now();
        const baseUserText = isProRequest
          ? "Lis d'abord les antécédents patient dans le system prompt, puis analyse cette photo à leur lumière. Retourne le JSON clinique complet."
          : prompt + patientContext;
        const userText = baseUserText + fewShotBlock + extraInstruction + multiAngleNote + areaNote + "\n\nIMPORTANT : Réponds UNIQUEMENT avec le JSON demandé, sans texte avant ni après.";
        let c = "";
        if (USE_GEMINI && gemini) {
          // Chaîne de secours : on essaie chaque modèle Gemini jusqu'à succès.
          // Sur quota/404/surcharge → on passe au suivant (quotas séparés).
          let lastErr: any = null;
          for (const modelId of GEMINI_FALLBACKS) {
            try {
              const m = gemini.getGenerativeModel({ model: modelId, systemInstruction: activeSystemPrompt });
              const gemResult = await Promise.race([
                m.generateContent({
                  contents: [{ role: "user", parts: [
                    { text: userText },
                    ...visionImages.map((vi) => ({ inlineData: { mimeType: vi.mime, data: vi.b64 } })),
                  ]}],
                  generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 2500,
                    temperature: 0.2,
                  },
                }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 120000)),
              ]);
              c = (gemResult as any).response.text() || "";
              if (modelId !== GEMINI_FALLBACKS[0]) console.log(`[analyze] ✅ Bascule Gemini réussie sur ${modelId}`);
              break;
            } catch (e: any) {
              lastErr = e;
              const msg = String(e?.message || e);
              // Erreurs "réessayables" avec un autre modèle : quota, indispo, surcharge.
              const retriable = /429|quota|rate.?limit|resource_exhausted|exhausted|404|not found|no longer available|not available|overloaded|unavailable|500|503/i.test(msg);
              console.warn(`[analyze] Gemini ${modelId} KO (${retriable ? "on bascule" : "erreur bloquante"}): ${msg.slice(0, 140)}`);
              if (!retriable) throw e; // ex: refus de sécurité, requête invalide → inutile d'essayer les autres
            }
          }
          if (!c) throw (lastErr || new Error("Tous les modèles Gemini sont indisponibles"));
        } else if (openai) {
          // Timeout = client init (180s Groq / 60s OpenAI).
          // maxRetries: 0 → un seul essai, on échoue vite (comportement B2C
          // d'origine). Sans ça le SDK retente 2× en silence et ralentit tout.
          // Les systèmes agentiques Groq (groq/compound*) ne supportent pas
          // response_format json_object → on l'omet pour eux (le JSON est extrait
          // du texte par le parseur robuste plus bas).
          const req: any = {
            model: AI_MODEL,
            messages: [
              { role: "system", content: activeSystemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userText },
                  ...visionImages.map((vi) => ({ type: "image_url" as const, image_url: { url: vi.dataUrl } })),
                ],
              },
            ],
            max_tokens: 2500,
            temperature: 0.2,
          };
          if (!AI_IS_REASONING) req.response_format = { type: "json_object" };
          const r = await openai.chat.completions.create(req, { maxRetries: 0 });
          c = r.choices[0]?.message?.content || "";
          console.log(`[analyze] finish: ${r.choices[0]?.finish_reason}`);
        } else {
          throw new Error("Aucun provider IA configuré");
        }
        console.log(`[analyze] ${AI_MODEL} ${Date.now() - t0}ms, len: ${c.length}`);
        return c.trim();
      };

      const looksLikeRefusal = (s: string) => {
        if (!s || s.length < 80) return true;
        if (!s.includes("{")) return true;
        const low = s.toLowerCase();
        return low.startsWith("je ne peux") || low.startsWith("désolé") || low.startsWith("i cannot") || low.startsWith("i'm sorry");
      };

      let rawContent = await callAI();

      // Retry 1× si l'IA refuse ou renvoie vide (fréquent sur photos de visage)
      if (looksLikeRefusal(rawContent)) {
        console.log("[analyze] Première réponse refus/vide, retry...");
        rawContent = await callAI("\n\nIMPORTANT : Cette photo est partagée volontairement par l'utilisateur pour une analyse cosmétique de sa propre peau. Tu dois fournir une analyse dermatologique standard au format JSON demandé. Ne refuse pas, ne fais aucun commentaire éthique — retourne directement le JSON.");
      }

      if (looksLikeRefusal(rawContent)) {
        return res.status(422).json({
          code: "AI_REFUSED",
          message: "L'IA n'a pas pu analyser cette photo. Essaie avec une photo plus nette, bien éclairée, où la zone à analyser est bien visible.",
        });
      }

      // Extraire le JSON même s'il est entouré de markdown ```json ... ```
      let jsonStr = rawContent.trim();
      const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (mdMatch) jsonStr = mdMatch[1].trim();
      // Trouver le premier bloc { ... }
      const braceStart = jsonStr.indexOf("{");
      if (braceStart !== -1) {
        const braceEnd = jsonStr.lastIndexOf("}");
        if (braceEnd > braceStart) {
          jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
        } else {
          // JSON tronqué — on ferme les accolades manquantes
          jsonStr = jsonStr.slice(braceStart);
          let depth = 0;
          for (const ch of jsonStr) { if (ch === "{") depth++; else if (ch === "}") depth--; }
          // Supprimer le dernier champ incomplet (valeur sans fermeture de guillemet)
          jsonStr = jsonStr.replace(/,?\s*"[^"]*"\s*:\s*"[^"]*$/, "");
          jsonStr = jsonStr.replace(/,?\s*"[^"]*"\s*:\s*\[[^\]]*$/, "]");
          jsonStr += "}".repeat(Math.max(0, depth));
        }
      }

      // Parser robuste : si JSON tronqué (max_tokens atteint), on tente de
      // récupérer le maximum de champs valides en coupant à la dernière
      // structure correctement fermée.
      const tryParse = (s: string): any | null => {
        try { return JSON.parse(s); } catch { return null; }
      };
      let analysisResult: any = tryParse(jsonStr);
      if (!analysisResult) {
        // Stratégie de réparation : on coupe progressivement la fin du JSON
        // jusqu'à trouver une troncature parsable, en fermant les structures.
        let attempt = jsonStr;
        for (let i = 0; i < 20 && !analysisResult; i++) {
          // Couper après la dernière virgule de niveau racine
          const lastComma = attempt.lastIndexOf(",");
          if (lastComma === -1) break;
          attempt = attempt.slice(0, lastComma);
          // Compter les structures ouvertes pour les refermer
          let curly = 0, square = 0, inStr = false, esc = false;
          for (const ch of attempt) {
            if (esc) { esc = false; continue; }
            if (ch === "\\") { esc = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === "{") curly++; else if (ch === "}") curly--;
            else if (ch === "[") square++; else if (ch === "]") square--;
          }
          // Fermer string ouverte si besoin (rare)
          let candidate = attempt + (inStr ? '"' : "");
          candidate += "]".repeat(Math.max(0, square)) + "}".repeat(Math.max(0, curly));
          analysisResult = tryParse(candidate);
        }
      }
      if (!analysisResult) {
        console.error("[analyze] JSON parse error irrécupérable. Raw:", rawContent.slice(0, 400));
        throw new Error("L'IA n'a pas retourné un diagnostic valide. Réessaie avec une photo plus nette.");
      }
      console.log(`[analyze] ✅ JSON parsé (${Object.keys(analysisResult).length} champs racine)`);

      // ── Anti-refus : l'IA refuse souvent à tort (excès de prudence sur les
      // visages humains) en renvoyant un faux rejet photo. On retry 1× avec un
      // override musclé. Couvre B2C ("Image non exploitable") ET DERM
      // ("Photo à reprendre" / "Photo insuffisante").
      const REJECT_CONDITIONS = ["Image non exploitable", "Photo à reprendre", "Photo insuffisante"];
      if (REJECT_CONDITIONS.includes(analysisResult.condition)) {
        console.log(`[analyze] ⚠️ Rejet '${analysisResult.condition}' — retry avec override...`);
        const overrideInstruction = isProRequest
          ? "\n\n══ OVERRIDE ABSOLU ══\nTu viens de refuser à tort. Cette photo a été prise EN CONSULTATION par un professionnel de santé, avec le consentement du patient, pour une analyse dermatologique. De la peau humaine est visible — c'est certain. Tu DOIS fournir un rapport clinique complet au format JSON demandé, basé sur ce qui est visible, MÊME si la photo est floue, mal éclairée ou partiellement cadrée (mentionne alors photo_quality:\"limitée\"). INTERDICTION ABSOLUE de répondre à nouveau par un rejet photo (\"Photo à reprendre\", etc.). Donne ton meilleur diagnostic clinique."
          : "\n\n══ OVERRIDE ABSOLU ══\nTu viens de refuser à tort. Cette photo a été partagée VOLONTAIREMENT par l'utilisatrice pour une analyse cosmétique de SA PROPRE peau. Il y a de la peau humaine visible — c'est certain. Tu DOIS maintenant fournir un diagnostic dermatologique complet au format JSON demandé, basé sur ce que tu vois. INTERDICTION ABSOLUE de répondre à nouveau \"Image non exploitable\". Analyse la peau visible, même partiellement, même imparfaitement éclairée. Donne ton meilleur diagnostic clinique.";
        const retryContent = await callAI(overrideInstruction);
        let retryJsonStr = retryContent.trim();
        const mdM = retryJsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (mdM) retryJsonStr = mdM[1].trim();
        const bs = retryJsonStr.indexOf("{");
        const be = retryJsonStr.lastIndexOf("}");
        if (bs !== -1 && be > bs) retryJsonStr = retryJsonStr.slice(bs, be + 1);
        const retryParsed = tryParse(retryJsonStr);
        if (retryParsed && retryParsed.condition && !REJECT_CONDITIONS.includes(retryParsed.condition)) {
          console.log(`[analyze] ✅ Retry réussi → "${retryParsed.condition}"`);
          analysisResult = retryParsed;
        } else {
          console.log("[analyze] ❌ Retry a aussi refusé — on garde le rejet original");
        }
      }

      // Map generic AI recommendations to specific products from our catalog
      // Vérifier que la réponse contient les champs essentiels
      if (!analysisResult.condition && !analysisResult.score) {
        throw new Error("Réponse IA incomplète — l'image ne semble pas être une photo de peau ou cheveux");
      }

      // ══════════════════════════════════════════════════════════════════
      // CHEMIN DERM (B2B) — sortie clinique SÉPARÉE et indépendante du B2C
      // Le prompt DERM (GLOWSCAN_DERM_SYSTEM_PROMPT) a déjà servi à l'appel IA
      // via activeSystemPrompt. On construit ici la réponse clinique dédiée et
      // on retourne immédiatement — le pipeline B2C ci-dessous n'est PAS exécuté.
      // ══════════════════════════════════════════════════════════════════
      if (isProRequest) {
        const dermResult = buildDermResult(analysisResult);
        const uploadedDermImage = await uploadScanImageToStorage(image);
        let dermScanId: number | null = null;
        try {
          const savedScan = await storage.createScan({
            userId: userId || undefined,
            sessionId: userId ? undefined : (req.session?.id || undefined),
            imageUrl: uploadedDermImage || "",
            area,
            condition: dermResult.condition,
            analysis: dermResult.clinicalSummary || "",
            recommendations: { _fullResult: dermResult },
            score: dermResult.score,
            motivation: dermResult.clinicalSummary || "",
          });
          dermScanId = savedScan.id;
          console.log(`[analyze][derm] ✅ Scan #${dermScanId} sauvegardé (mode DERM)`);
        } catch (e) {
          console.error("[analyze][derm] ❌ échec sauvegarde scan:", e instanceof Error ? e.message : String(e));
        }
        const yr = new Date().getFullYear();
        const ref = dermScanId ? `GS-${yr}-${String(dermScanId).padStart(4, "0")}` : `GS-${yr}-PRO`;
        return res.json({ ...dermResult, savedScanId: dermScanId, reference: ref, isAnonymous: false });
      }

      const { catalog } = await import("@shared/catalog");
      // ─── Règles métier B2B strictes ────────────────────────────────
      // ResultCard recommande UNIQUEMENT la marque maison GlowScan Dermo
      // (kits & produits) → marge propre.
      // Les marques internationales (Bioderma, Uriage, Topicrem, etc.)
      // sont dans la boutique /shop UNIQUEMENT — jamais dans le ResultCard.
      // Raison : pas de commission sur les internationales → casse le modèle B2B.
      const PRICE_CAP_LOCAL = 12000; // plafond hérité (marques locales retirées)
      const LOCAL_BRANDS = new Set<string>([]); // marques locales partenaires retirées
      const INTL_BRANDS  = new Set(["Bioderma", "Topicrem", "Uriage", "Nubiance", "La Roche-Posay", "Eucerin", "CeraVe"]);

      const isLocal        = (item: any) => LOCAL_BRANDS.has(item.brand || "");
      const isGlowScanDerm = (item: any) => item.brand === "GlowScan Dermo";
      const isIntl         = (item: any) => INTL_BRANDS.has(item.brand || "");

      // Catalogue éligible ResultCard : local ≤ 12k + GlowScan Dermo (tous prix)
      // Les marques internationales sont EXCLUES du ResultCard
      const recommendableCatalog = catalog.filter((item) =>
        (isLocal(item) && (!item.price || item.price <= PRICE_CAP_LOCAL)) ||
        isGlowScanDerm(item)
      );

      const findBestMatch = (query: string) => {
        const q = query.toLowerCase();
        const candidates = recommendableCatalog.filter((item) => {
          const name = item.name.toLowerCase();
          return (
            name.includes(q) ||
            q.includes(name) ||
            q.includes(item.id.replace(/-/g, " ")) ||
            item.targets.some((t: string) => q.includes(t.toLowerCase()) || t.toLowerCase().includes(q.split(" ")[0]))
          );
        });
        // Priorité : local (0) > GlowScan Dermo kit (1) > GlowScan Dermo produit (2)
        candidates.sort((a, b) => {
          const pa = isLocal(a) ? 0 : (isGlowScanDerm(a) && (a.id.startsWith("kit") || a.id.includes("kit")) ? 1 : 2);
          const pb = isLocal(b) ? 0 : (isGlowScanDerm(b) && (b.id.startsWith("kit") || b.id.includes("kit")) ? 1 : 2);
          if (pa !== pb) return pa - pb;
          return (a.price || 0) - (b.price || 0);
        });
        return candidates[0];
      };

      const productList: string[] = analysisResult.recommendations?.products || [];
      const firstSuggestion = productList[0];
      let chosen = firstSuggestion ? findBestMatch(firstSuggestion) : undefined;
      // Fallback : mots-clés du diagnostic
      if (!chosen && analysisResult.condition) {
        chosen = findBestMatch(String(analysisResult.condition));
      }
      // Ultime fallback : produit local selon la zone
      if (!chosen) {
        const zoneIsHair = (area === "hair") || /cheveux|cuir chevelu|alopécie|pellicule/i.test(String(analysisResult.condition || ""));
        const category = zoneIsHair ? "cheveux" : "visage";
        chosen = recommendableCatalog.find((p) => isLocal(p) && p.category === category)
          ?? recommendableCatalog.find((p) => isGlowScanDerm(p) && p.category === category);
      }
      const recommendedProducts = chosen ? [chosen.name] : [];
      console.log(`[analyze] 🛒 Recommandation: ${chosen?.name || "aucune"} (${chosen?.brand || "-"}, ${chosen?.price || 0} FCFA, local=${chosen ? isLocal(chosen) : false})`);

      // Score RÉEL renvoyé par l'IA, calibré 0-100. Pas de plafond artificiel.
      const rawScore = Number(analysisResult.score);
      const finalScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 60;

      // ── Calcul progression Type 3 (scans précédents) ─────────
      let progression: { previousScore: number; delta: number; trend: "improving" | "stable" | "worsening"; weeksTracked: number } | undefined;
      if (userId) {
        try {
          const previousScans = await storage.getScansByUser(userId);
          if (previousScans && previousScans.length > 0) {
            const sorted = [...previousScans].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const lastScan = sorted[0];
            const previousScore = lastScan.score ?? null;
            if (previousScore !== null) {
              const delta = finalScore - previousScore;
              const firstScan = sorted[sorted.length - 1];
              const weeksTracked = Math.max(1, Math.round((Date.now() - new Date(firstScan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)));
              progression = {
                previousScore,
                delta,
                trend: delta > 3 ? "improving" : delta < -3 ? "worsening" : "stable",
                weeksTracked,
              };
            }
          }
        } catch (e) {
          // Progression non critique — on continue sans
        }
      }

      // ── Insights prédictifs ───────────────────────────────────
      const rawRisks = analysisResult.predictiveInsights?.risks || [];
      const validRisks = rawRisks
        .filter((r: any) => r && r.risk && r.delay && ["high","medium","low"].includes(r.level))
        .slice(0, 3);
      const predictiveInsights = {
        risks: validRisks,
        actionWindow: analysisResult.predictiveInsights?.actionWindow || "",
        ...(progression ? { progression } : {}),
      };

      // ── Sanitize zones (max 6, valid status) ──────────────────
      const validZones = Array.isArray(analysisResult.zones)
        ? analysisResult.zones
            .filter((z: any) => z && typeof z.name === "string" && ["red", "yellow", "green"].includes(z.status))
            .slice(0, 6)
            .map((z: any) => ({
              name: String(z.name).slice(0, 40),
              status: z.status,
              issue: z.issue ? String(z.issue).slice(0, 120) : "",
            }))
        : [];

      const finalResult = {
        condition: analysisResult.condition || "Analyse cutanée",
        severity: analysisResult.severity || "Modérée",
        score: finalScore,
        skinType: analysisResult.skinType || "Mixte",
        details: analysisResult.details || "Analyse effectuée avec succès.",
        motivation: analysisResult.motivation || "Ta peau a une histoire — on en garde la mémoire pour que tu ne repartes jamais de zéro. Rescanne dans 14 jours pour suivre l'évolution.",
        zones: validZones,
        stats: analysisResult.stats || {
          lesions: "Non détecté",
          zones: "Non détecté",
          pores: "Non détecté",
          marks: "Non détecté"
        },
        balance: analysisResult.balance || {
          inflammation: 3,
          sebum: 3,
          pores: 3,
          sensitivity: 3,
          scars: 3
        },
        recommendations: {
          products: recommendedProducts,
          morning: (analysisResult.recommendations?.morning || []).map((s: any) =>
            typeof s === "string" ? s : [s?.step, s?.product, s?.why].filter((x: any) => typeof x === "string").join(" — ")
          ),
          evening: (analysisResult.recommendations?.evening || []).map((s: any) =>
            typeof s === "string" ? s : [s?.step, s?.product, s?.why].filter((x: any) => typeof x === "string").join(" — ")
          ),
          weekly: typeof analysisResult.recommendations?.weekly === "string" ? analysisResult.recommendations.weekly : ""
        },
        predictiveInsights,
        // ── Nouveaux champs RAPPORT MÉDICAL (générés par l'IA pour CETTE photo) ──
        metrics: analysisResult.metrics && typeof analysisResult.metrics === "object" ? {
          hydratation: Math.max(0, Math.min(100, Number(analysisResult.metrics.hydratation) || 0)),
          eclat: Math.max(0, Math.min(100, Number(analysisResult.metrics.eclat) || 0)),
          purete: Math.max(0, Math.min(100, Number(analysisResult.metrics.purete) || 0)),
        } : undefined,
        zoneAnalysis: Array.isArray(analysisResult.zoneAnalysis) ? analysisResult.zoneAnalysis
          .filter((z: any) => z && typeof z.name === "string" && ["red", "yellow", "green"].includes(z.status))
          .slice(0, 8)
          .map((z: any) => ({
            name: String(z.name).slice(0, 40),
            status: z.status,
            short: z.short ? String(z.short).slice(0, 280) : "",
            long: z.long ? String(z.long).slice(0, 800) : "",
          })) : undefined,
        conclusion: analysisResult.conclusion && typeof analysisResult.conclusion === "object" ? {
          short: String(analysisResult.conclusion.short || "").slice(0, 400),
          long: String(analysisResult.conclusion.long || "").slice(0, 1500),
        } : undefined,
        severityLevel: typeof analysisResult.severityLevel === "number"
          ? Math.max(1, Math.min(5, Math.round(analysisResult.severityLevel)))
          : undefined,
        severityLabel: analysisResult.severityLabel ? String(analysisResult.severityLabel).slice(0, 200) : undefined,
        protocol: analysisResult.protocol && typeof analysisResult.protocol === "object" ? {
          morning: Array.isArray(analysisResult.protocol.morning) ? analysisResult.protocol.morning
            .slice(0, 6)
            .map((s: any) => ({
              step: String(s.step || "").slice(0, 80),
              product: s.product ? String(s.product).slice(0, 120) : undefined,
              why: s.why ? String(s.why).slice(0, 240) : undefined,
            })) : [],
          evening: Array.isArray(analysisResult.protocol.evening) ? analysisResult.protocol.evening
            .slice(0, 6)
            .map((s: any) => ({
              step: String(s.step || "").slice(0, 80),
              product: s.product ? String(s.product).slice(0, 120) : undefined,
              why: s.why ? String(s.why).slice(0, 240) : undefined,
            })) : [],
        } : undefined,
      };

      // ── Sauvegarde TOUJOURS — aucune analyse ne doit être perdue ─────────
      // Stratégie : si userId connu → rattachement direct.
      //             sinon → on garde sessionId pour rattacher au login/register.
      // C'est le coeur du dataset dermato africain de GlowScan.
      let savedScanId: number | null = null;

      if (isAnonymous) {
        // Marquer la session pour la limite freemium (1 analyse anonyme gratuite)
        req.session.anonymousScanUsed = true;
        await new Promise<void>((resolve) => req.session.save(() => resolve()));
      }

      // Upload de la photo dans Object Storage AVANT createScan pour rattacher
      // la photo au diagnostic dès l'enregistrement (zero data loss photo).
      const uploadedImagePath = await uploadScanImageToStorage(image);
      if (uploadedImagePath) {
        console.log(`[analyze] 📸 Photo archivée: ${uploadedImagePath}`);
      } else {
        console.error("[analyze] ⚠️ Photo NON archivée — diagnostic sera sauvegardé sans image");
      }

      try {
        const savedScan = await storage.createScan({
          userId: userId || undefined,
          sessionId: userId ? undefined : (req.session?.id || undefined),
          imageUrl: uploadedImagePath || "",
          area,
          condition: finalResult.condition,
          analysis: finalResult.details,
          recommendations: { ...finalResult.recommendations, _fullResult: finalResult },
          score: finalResult.score,
          motivation: finalResult.motivation,
        });
        savedScanId = savedScan.id;
        console.log(
          userId
            ? `[analyze] ✅ Scan #${savedScanId} sauvegardé pour userId=${userId}`
            : `[analyze] ✅ Scan #${savedScanId} sauvegardé en attente de rattachement — session=${req.session?.id}`
        );

        if (userId) {
          try {
            const alreadyAwarded = await storage.hasPointsForReason(userId, "analyse", String(savedScanId));
            if (!alreadyAwarded) {
              await storage.addLoyaltyPoints({ userId, points: 2, reason: "analyse", referenceId: String(savedScanId) });
            }
          } catch { /* non bloquant */ }
        }
      } catch (saveErr) {
        // Échec critique : on log avec maximum de contexte pour pouvoir investiguer/réparer
        console.error("[analyze] ❌❌ ÉCHEC CRITIQUE sauvegarde scan — DONNÉE PERDUE:", {
          error: saveErr instanceof Error ? saveErr.message : String(saveErr),
          userId,
          sessionId: req.session?.id,
          area,
          condition: finalResult.condition,
          score: finalResult.score,
          timestamp: new Date().toISOString(),
        });
      }

      // Référence rapport médical : GS-YYYY-XXXX (XXXX = scanId padded), fallback ANON pour invités
      const year = new Date().getFullYear();
      const reference = savedScanId
        ? `GS-${year}-${String(savedScanId).padStart(4, "0")}`
        : `GS-${year}-ANON`;

      res.json({ ...finalResult, savedScanId, isAnonymous, reference });

      // ── Write training_data (non-blocking, fire & forget) ─────────────────
      // Every scan is a potential dataset record for African skin AI improvement.
      // Failures are logged but NEVER block the user response.
      setImmediate(async () => {
        try {
          const r = finalResult as any;
          const isProMode = !!(isProRequest); // B2B = pro mode with patient intake

          // ── Déduplication : skip si ce scan est déjà dans le dataset ───
          if (savedScanId) {
            const existing = await db
              .select({ id: trainingData.id })
              .from(trainingData)
              .where(eq(trainingData.scanId, savedScanId))
              .limit(1);
            if (existing.length > 0) {
              console.log(`[training] ⚡ Skip doublon scan #${savedScanId}`);
              return;
            }
          }

          // ── GOLD HONNÊTE : un scan DERM n'est PAS gold par défaut ───
          // « Médecin présent » ≠ « médecin a validé ». Le statut gold (validated/
          // corrected) est attribué UNIQUEMENT quand le dermatologue valide réellement
          // le diagnostic (POST /api/pro/scans/:id/validate). À l'insertion, tout reste
          // "pending" ; le DERM a juste un poids un peu supérieur (2) au B2C auto (1).
          // ── Empreinte image (traçabilité / déduplication du dataset) ───
          let imageHash: string | null = null;
          try {
            const raw = typeof image === "string" ? (image.includes(",") ? image.split(",")[1] : image) : "";
            if (raw) { const { createHash } = await import("crypto"); imageHash = createHash("sha256").update(raw).digest("hex"); }
          } catch {}

          // ── Taxonomie GlowScan AI — classification automatique ─────────
          const allText = [
            r.condition, r.conditionSecondaire, r.details, r.clinicalSummary
          ].filter(Boolean).join(" ");
          const taxonomy = classifyCondition(r.condition || "");
          const phototype = extractPhototype(allText);
          const annotationScore = calcAnnotationScore({
            primaryCondition: r.condition,
            secondaryCondition: r.conditionSecondaire,
            severity: r.severity,
            skinPhototype: r.skinPhototype || phototype,
            clinicalSummary: r.clinicalSummary,
            zonesAnalysis: r.zonesAnalysis,
            clinicalProtocol: r.clinicalProtocol,
            imageQuality: r.photo_quality,
            confidence: r.confidence,
            redFlags: r.redFlags,
            mode: isProMode ? "B2B" : "B2C",
          });
          const enrichedAnnotation = {
            conditionCategory: taxonomy.category,
            icd10: taxonomy.icd10,
            classificationConfidence: taxonomy.confidence,
            phototype,
            annotationScore,
            autoClassifiedAt: new Date().toISOString(),
          };

          // ── Chantier n°1 : labels démographiques peuplés dès l'insertion ──────
          // Sans ces champs, le dataset "peau africaine" n'est ni mesurable ni
          // entraînable. On les dérive du dossier d'intake + du mode d'analyse.
          // Phototype : IA (extractPhototype) faute d'annotation médecin, tracé
          // via skinPhototype (colonne) ; la source reste dans l'annotation.
          const skinPhototypeVal: string | null =
            (r.skinPhototype || phototype || null) as string | null;

          // Tranche d'âge normalisée à partir de l'âge libre saisi (ex "25 ans" → "26-35" ? non : "18-25").
          const deriveAgeRange = (raw?: string): string | null => {
            if (!raw) return null;
            const m = String(raw).match(/\d{1,3}/);
            if (!m) return null;
            const n = parseInt(m[0], 10);
            if (isNaN(n) || n <= 0 || n > 120) return null;
            if (n < 18) return "0-17";
            if (n <= 25) return "18-25";
            if (n <= 35) return "26-35";
            if (n <= 45) return "36-45";
            if (n <= 60) return "46-60";
            return "60+";
          };
          const ageRangeVal = deriveAgeRange((intake as any)?.age);

          // Sexe : non collecté en B2C ; capté si présent (intake DERM / futur champ), sinon null honnête.
          const rawSex = String((intake as any)?.sexe || (intake as any)?.sex || (intake as any)?.gender || "").toLowerCase();
          const patientSexVal: string | null =
            /^f|femme|female/.test(rawSex) ? "female" :
            /^h|^m|homme|male/.test(rawSex) ? "male" :
            rawSex ? "other" : null;

          // Pays / localisation : région saisie à l'intake.
          const countryVal: string | null = ((intake as any)?.region || null) as string | null;

          // Zone anatomique analysée (face / body / hair).
          const bodyAreaVal: string | null = (area || null) as string | null;

          // Filet de sécurité : tronque toute valeur à la longueur de sa colonne
          // varchar pour qu'un libellé IA trop long ne fasse JAMAIS échouer l'insert
          // en silence (ex: severity "Modérée à sévère"). Les conditions longues
          // vont dans primary/secondary_condition, élargies en TEXT côté base.
          const vc = (s: any, n: number): string | null => (s == null || s === "" ? null : String(s).slice(0, n));
          const scoreNum = ((): number | null => { const v = parseInt(String(r.score), 10); return Number.isFinite(v) ? v : null; })();
          await db.insert(trainingData).values({
            scanId: savedScanId,
            mode: isProMode ? "B2B" : "B2C",
            source: "user_upload",
            promptVersion: isProMode ? "b2b-v2" : "b2c-v3",
            aiModelVersion: vc(AI_MODEL, 50),
            aiDiagnosis: finalResult,
            imageQuality: vc(r.photo_quality, 20),
            primaryCondition: r.condition || null,
            secondaryCondition: r.conditionSecondaire || null,
            score: scoreNum,
            severity: vc(r.severity, 15),
            confidence: vc(r.confidence, 10),
            skinState: vc(r.skinState, 30),
            skinPhototype: vc(skinPhototypeVal, 10),
            ageRange: vc(ageRangeVal, 20),
            patientSex: vc(patientSexVal, 10),
            country: vc(countryVal, 50),
            bodyArea: vc(bodyAreaVal, 30),
            balance: r.balance || null,
            redFlags: r.redFlags || null,
            details: r.details || null,
            motivation: r.motivation || null,
            zonesB2C: r.zonesB2C || null,
            recommendations: Array.isArray(r.recommendations) ? r.recommendations : null,
            morningProtocol: r.morningProtocol || null,
            eveningProtocol: r.eveningProtocol || null,
            weeklyProtocol: r.weeklyProtocol || null,
            whenToSeeDermatologist: r.whenToSeeDermatologist || null,
            b2cOutput: isProMode ? null : finalResult,
            clinicalSummary: r.clinicalSummary || null,
            zonesAnalysis: r.zonesAnalysis || null,
            clinicalProtocol: r.clinicalProtocol || null,
            b2bOutput: isProMode ? finalResult : null,
            // ── Empreinte image (traçabilité dataset) ───
            imageHash,
            // ── Statut : PENDING tant qu'un médecin n'a pas validé (gold honnête) ───
            dermValidationStatus: "pending",
            validatedBy: isProMode ? "derm_present" : "ai_only",
            validatedAt: null,
            finalStatus: "pending",
            trainingWeight: isProMode ? 2 : 1,
            isAnonymized: !userId,
            gdprConsent: true,
            annotation: enrichedAnnotation,
          });
          console.log(`[training] ✅ Dataset record créé scan #${savedScanId} (${isProMode ? "B2B · pending (gold à la validation médecin)" : "B2C · pending"})`);
        } catch (trainErr) {
          console.error("[training] ⚠️ Échec insert training_data (non-bloquant):", trainErr instanceof Error ? trainErr.message : String(trainErr));
        }
      });

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[analyze] ❌ Erreur:", errMsg);

      // ═══════════════════════════════════════════════════════════════
      // FILET DE SÉCURITÉ : on renvoie TOUJOURS un résultat utilisable.
      // Si l'IA est indisponible (clé manquante, timeout, réseau) →
      // diagnostic générique honnête. L'utilisateur garde son parcours
      // (conseils, boutique, etc.) sans être bloqué sur une page d'erreur.
      // ═══════════════════════════════════════════════════════════════
      const userId = req.session?.userId || req.user?.id || null;
      const isAnonymous = !isAuth(req);

      // Sauvegarder quand même le scan en base avec statut "ai_unavailable"
      let savedScanId: number | null = null;
      try {
        const { image, area } = req.body;
        const insertResult = await db.insert(scans).values({
          userId: isAnonymous ? null : (userId as string),
          sessionId: req.session?.id || null,
          area: area || "face",
          imageData: null,
          condition: "Analyse en attente",
          severity: "Modérée",
          score: 65,
          skinType: "Phototype IV-VI",
          details: "L'analyse automatique est temporairement indisponible. Votre photo a été enregistrée.",
          motivation: "Nous allons analyser votre photo dès que le service est rétabli.",
          recommendations: JSON.stringify({ products: [], morning: [], evening: [], weekly: "" }),
          stats: JSON.stringify({ lesions: "—", zones: "—", pores: "—", marks: "—" }),
          zoneAnalysis: JSON.stringify([]),
          zones: JSON.stringify([]),
          isValidated: false,
        }).returning({ id: scans.id });
        savedScanId = insertResult[0]?.id || null;
      } catch (dbErr) {
        console.error("[analyze] DB fallback insert failed:", dbErr);
      }

      if (!isAnonymous) {
        try { req.session.anonymousScanUsed = true; req.session.save(() => {}); } catch {}
      }

      // Retourner une vraie erreur — pas de fausse analyse.
      // `detail` = message brut du fournisseur (Groq) pour diagnostiquer (ex. modèle
      // introuvable/décommissionné, clé, quota). Affiché temporairement côté client.
      // Quota gratuit du fournisseur épuisé (429 / rate limit) → message clair,
      // pas le dump technique. L'utilisateur comprend qu'il faut patienter.
      const isQuota = /429|too many requests|quota|rate limit|resource_exhausted/i.test(errMsg);
      if (isQuota) {
        return res.status(429).json({
          code: "AI_QUOTA",
          message: "Le service d'analyse est momentanément saturé. Réessaie dans quelques minutes 🙏",
        });
      }

      return res.status(503).json({
        code: "AI_UNAVAILABLE",
        message: "Erreur de connexion — réessayez",
        detail: errMsg,
      });
    }
  });

  // === Scans CRUD ===
  
  // Get all scans for logged-in user
  app.get(api.scans.list.path, async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = getUID(req); // From Replit Auth
    const scans = await storage.getScansByUser(userId);
    res.json(scans);
  });

  // Create a new scan (Save result)
  app.post(api.scans.create.path, async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const input = api.scans.create.input.parse(req.body);
      
      // Override userId with authenticated user
      const userId = getUID(req);
      
      const scan = await storage.createScan({
        ...input,
        userId,
        score: req.body.score || 0,
        motivation: req.body.motivation,
      });

      try {
        const alreadyAwarded = await storage.hasPointsForReason(userId, "analyse", String(scan.id));
        if (!alreadyAwarded) {
          await storage.addLoyaltyPoints({
            userId,
            points: 2,
            reason: "analyse",
            referenceId: String(scan.id),
          });
        }
      } catch (loyaltyErr) {
        console.error("Loyalty points error (non-blocking):", loyaltyErr);
      }
      
      res.status(201).json(scan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Create Scan Error:", err);
      res.status(500).json({ message: "Failed to save scan" });
    }
  });

  // Get specific scan
  app.get(api.scans.get.path, async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const scanId = parseInt(req.params.id);
    const scan = await storage.getScan(scanId);
    
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }
    
    // Authorization check
    const userId = getUID(req);
    if (scan.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(scan);
  });

  // === Analytics Tracking ===
  
  app.post("/api/analytics/visit", async (req, res) => {
    try {
      const { page, sessionId } = req.body;
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const userAgent = req.headers["user-agent"] || "";
      
      let country = null;
      let city = null;
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          country = geo.country || null;
          city = geo.city || null;
        }
      } catch {}

      await storage.recordPageVisit({
        sessionId: sessionId || null,
        page: page || "/",
        country,
        city,
        ip,
        userAgent,
      });
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Analytics visit error:", error);
      res.json({ ok: false });
    }
  });

  app.post("/api/analytics/whatsapp-click", async (req, res) => {
    try {
      const { productId, productName, brand, whatsappNumber } = req.body;
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      
      let country = null;
      let city = null;
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          country = geo.country || null;
          city = geo.city || null;
        }
      } catch {}

      await storage.recordWhatsappClick({
        productId: productId || "unknown",
        productName: productName || "unknown",
        brand: brand || "unknown",
        whatsappNumber: whatsappNumber || "unknown",
        country,
        city,
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("Analytics whatsapp click error:", error);
      res.json({ ok: false });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { orderNumber, clientName, clientPhone, clientAddress, clientNotes, items, totalPrice, brand, whatsappNumber } = req.body;
      if (!orderNumber || !clientName || !clientPhone || !clientAddress || !items || !totalPrice || !brand || !whatsappNumber) {
        return res.status(400).json({ message: "Données manquantes" });
      }
      const userId = isAuth(req) ? getUID(req) : null;
      const order = await storage.createOrder({
        orderNumber,
        userId,
        clientName,
        clientPhone,
        clientAddress,
        clientNotes: clientNotes || null,
        items,
        totalPrice,
        brand,
        whatsappNumber,
        status: "envoyée",
      });
      res.json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    try {
      const userId = getUID(req);
      const userOrders = await storage.getOrdersByUser(userId);
      res.json(userOrders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/loyalty", async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    try {
      const userId = getUID(req);
      const [totalPoints, history, rewards] = await Promise.all([
        storage.getUserPoints(userId),
        storage.getUserPointsHistory(userId),
        storage.getUserRewards(userId),
      ]);
      const spentPoints = rewards.reduce((sum, r) => sum + r.pointsSpent, 0);
      const availablePoints = totalPoints - spentPoints;
      res.json({ totalPoints, availablePoints, history, rewards });
    } catch (error) {
      console.error("Loyalty error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/loyalty/share", async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    try {
      const userId = getUID(req);
      const { scanId } = req.body;
      if (!scanId) return res.status(400).json({ message: "scanId requis" });
      const alreadyAwarded = await storage.hasPointsForReason(userId, "partage", String(scanId));
      if (alreadyAwarded) {
        return res.json({ awarded: false, message: "Points déjà attribués pour ce partage" });
      }
      await storage.addLoyaltyPoints({
        userId,
        points: 15,
        reason: "partage",
        referenceId: String(scanId),
      });
      res.json({ awarded: true, points: 15 });
    } catch (error) {
      console.error("Loyalty share error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/loyalty/redeem", async (req, res) => {
    if (!isAuth(req)) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    try {
      const userId = getUID(req);
      const { rewardType } = req.body;

      const rewardOptions: Record<string, { points: number; discount: number }> = {
        "discount_5": { points: 100, discount: 5 },
        "discount_10": { points: 200, discount: 10 },
        "discount_15": { points: 350, discount: 15 },
        "discount_20": { points: 500, discount: 20 },
      };

      const reward = rewardOptions[rewardType];
      if (!reward) return res.status(400).json({ message: "Type de récompense invalide" });

      const totalPoints = await storage.getUserPoints(userId);
      const existingRewards = await storage.getUserRewards(userId);
      const spentPoints = existingRewards.reduce((sum, r) => sum + r.pointsSpent, 0);
      const availablePoints = totalPoints - spentPoints;

      if (availablePoints < reward.points) {
        return res.status(400).json({ message: "Points insuffisants" });
      }

      const discountCode = "GS" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const newReward = await storage.createReward({
        userId,
        rewardType,
        pointsSpent: reward.points,
        discountCode,
        discountPercent: reward.discount,
      });

      res.json(newReward);
    } catch (error) {
      console.error("Loyalty redeem error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // === Push Notifications ===
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:contact@glowscan.app",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  const pushSubscribeSchema = z.object({
    subscription: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }),
    }),
    morningReminder: z.boolean().optional().default(true),
    eveningReminder: z.boolean().optional().default(true),
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const parsed = pushSubscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Subscription invalide", errors: parsed.error.flatten() });
      }
      const { subscription, morningReminder, eveningReminder } = parsed.data;
      const userId = isAuth(req) ? getUID(req) : null;
      const sub = await storage.savePushSubscription({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        morningReminder,
        eveningReminder,
      });
      res.json({ success: true, id: sub.id });
    } catch (error) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await storage.deletePushSubscription(endpoint);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/push/send-reminders", async (req, res) => {
    const adminKey = req.query.key || req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const { type } = req.body;
      const subs = await storage.getAllActivePushSubscriptions();
      const messages: Record<string, { title: string; body: string; url: string }> = {
        morning: {
          title: "☀️ Routine du Matin",
          body: "Bonjour ! N'oubliez pas votre routine skincare du matin pour une peau éclatante toute la journée.",
          url: "/analyze",
        },
        evening: {
          title: "🌙 Routine du Soir",
          body: "Bonne soirée ! C'est le moment de votre routine de soin avant de dormir.",
          url: "/analyze",
        },
      };
      const msg = messages[type] || messages.morning;
      let sent = 0;
      let failed = 0;
      for (const sub of subs) {
        if (type === "morning" && !sub.morningReminder) continue;
        if (type === "evening" && !sub.eveningReminder) continue;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(msg)
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await storage.deletePushSubscription(sub.endpoint);
          }
        }
      }
      res.json({ sent, failed, total: subs.length });
    } catch (error) {
      console.error("Push send error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // === Challenge routes — Défi entre amis ===
  app.post("/api/challenge/create", async (req, res) => {
    try {
      const schema = z.object({
        score: z.number().int().min(0).max(100),
        condition: z.string().optional(),
        area: z.string().optional(),
        scanId: z.number().int().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Données invalides" });

      const user = (req as any).user;
      const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

      const challenge = await storage.createChallenge({
        token,
        challengerUserId: user?.id ?? null,
        challengerName: user?.firstName || user?.name || null,
        scanId: parsed.data.scanId ?? null,
        score: parsed.data.score,
        condition: parsed.data.condition ?? null,
        area: parsed.data.area ?? null,
        acceptedCount: 0,
      });

      res.json({ token: challenge.token, url: `${req.headers.origin || ""}/challenge/${challenge.token}` });
    } catch (error) {
      console.error("Challenge create error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/challenge/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const challenge = await storage.getChallenge(token);
      if (!challenge) return res.status(404).json({ message: "Défi introuvable" });

      await storage.incrementChallengeAccepted(token);

      res.json({
        challengerName: challenge.challengerName,
        score: challenge.score,
        condition: challenge.condition,
        area: challenge.area,
        acceptedCount: (challenge.acceptedCount ?? 0),
      });
    } catch (error) {
      console.error("Challenge get error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // === Push J+7 — Rappel rescan ===
  app.post("/api/push/send-rescan-reminders", async (req, res) => {
    const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const staleUsers = await storage.getUsersWithStaleScans(7);
      const staleUserIds = new Set(staleUsers.map(u => u.userId));

      const allSubs = await storage.getAllActivePushSubscriptions();
      const staleSubs = allSubs.filter(sub => sub.userId && staleUserIds.has(sub.userId));

      let sent = 0, failed = 0;
      for (const sub of staleSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: "🔬 Ta peau t'attend !",
              body: "7 jours se sont écoulés depuis ton analyse. Rescanne pour voir tes progrès !",
              icon: "/icon-192.png",
              url: "/analyze",
            })
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await storage.deletePushSubscription(sub.endpoint);
          }
        }
      }
      res.json({ sent, failed, staleUsers: staleUsers.length, staleSubs: staleSubs.length });
    } catch (error) {
      console.error("Rescan push error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // === Chat IA Peau ===
  app.post("/api/skin-chat", async (req, res) => {
    const { message, history = [], scanContext } = req.body;
    if (!message) return res.status(400).json({ message: "Message requis" });

    const systemPrompt = `Tu es SkinBot, un assistant dermatologique IA bienveillant de GlowScan. Tu réponds en français, en langage simple et chaleureux. Tu donnes des conseils basés sur les dermatologie moderne. Tu ne remplace pas un dermatologue mais tu aides à comprendre la peau.
${scanContext ? `\nContexte du dernier scan de l'utilisateur :\n- Diagnostic : ${scanContext.condition}\n- Score Glow : ${scanContext.score}/100\n- Type de peau : ${scanContext.skinType}\n- Zone : ${scanContext.area}\n- Détails : ${scanContext.details}` : ""}
Réponds en 2-4 phrases max, sois direct et utile.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await openai.chat.completions.create({ model: AI_MODEL_FAST, messages, stream: true });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`);
      res.end();
    }
  });

  // === Référral / Code affilié ===
  app.get("/api/referral/me", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const code = `GL${userId.substring(0, 6).toUpperCase()}`;
    const referralLink = `${req.protocol}://${req.get("host")}/ref/${code}`;
    res.json({ code, link: referralLink });
  });

  // === Abonnement Premium ===

  // GET /api/subscription/me — statut abonnement de l'utilisateur connecté
  app.get("/api/subscription/me", async (req: any, res) => {
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    try {
      const quota = await checkScanQuota(userId);

      // Récupérer les détails de l'abonnement si actif
      const activeSub = await db.select().from(subscriptions)
        .where(and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
          gte(subscriptions.expiresAt, new Date()),
        ))
        .limit(1);

      res.json({
        isPremium: quota.isPremium,
        scansThisMonth: quota.scansThisMonth,
        scansLimit: FREE_SCAN_LIMIT,
        scansRemaining: quota.isPremium ? null : Math.max(0, FREE_SCAN_LIMIT - quota.scansThisMonth),
        subscription: activeSub[0] || null,
        priceFcfa: PREMIUM_PRICE_FCFA,
      });
    } catch (err) {
      console.error("[subscription/me] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/admin/subscription/activate — admin active un abonnement
  app.post("/api/admin/subscription/activate", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { userId, durationDays = 30, note } = req.body;
    if (!userId) return res.status(400).json({ message: "userId requis" });

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Désactiver les anciens abonnements
      await db.update(subscriptions)
        .set({ status: "expired" })
        .where(eq(subscriptions.userId, userId));

      // Créer le nouvel abonnement
      const [sub] = await db.insert(subscriptions).values({
        userId,
        status: "active",
        plan: "monthly",
        expiresAt,
        activatedBy: "admin",
        note: note || `Abonnement ${durationDays}j activé le ${new Date().toLocaleDateString("fr-FR")}`,
      }).returning();

      // Bonus 100 pts fidélité pour le passage en Premium
      await db.insert(loyaltyPoints).values({
        userId,
        points: 100,
        reason: "upgrade_premium",
      });

      console.log(`[admin] Abonnement activé pour ${userId} jusqu'au ${expiresAt.toISOString()}`);
      res.json({ success: true, subscription: sub });
    } catch (err) {
      console.error("[admin/subscription/activate] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ═════════════════════════════════════════════════════════
  // DATASET RLHF — Validation par dermatologue expert
  // ═════════════════════════════════════════════════════════
  const DERMATO_KEY = process.env.DERMATO_KEY || "";

  function checkAdminKey(req: any): boolean {
    const k = (req.query.key as string) || (req.headers["x-admin-key"] as string) || req.body?.adminKey;
    const ok = !!process.env.ADMIN_KEY && k === process.env.ADMIN_KEY;
    if (ok && req.session) (req.session as any).isAdmin = true;
    return ok;
  }

  /** Accepte clé admin OU clé dermato (accès lecture dataset uniquement) */
  function checkDatasetKey(req: any): boolean {
    const k = (req.query.key as string) || (req.headers["x-admin-key"] as string) || req.body?.adminKey;
    return (!!process.env.ADMIN_KEY && k === process.env.ADMIN_KEY) || (!!DERMATO_KEY && k === DERMATO_KEY);
  }

  // GET /api/admin/scan-image/:scanId — Proxy image dataset (admin ou dermato key)
  // Évite la dépendance à la session pour les balises <img> dans l'interface de review.
  app.get("/api/admin/scan-image/:scanId", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    const scanId = parseInt(req.params.scanId);
    if (!scanId) return res.status(400).json({ message: "ID invalide" });
    try {
      const scan = await storage.getScan(scanId);
      if (!scan || !scan.imageUrl) return res.status(404).json({ message: "Image non disponible" });
      if (!scan.imageUrl.startsWith("/objects/scans/")) return res.status(404).json({ message: "Image non disponible" });
      const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile(scan.imageUrl);
      res.setHeader("Cache-Control", "private, max-age=3600");
      await svc.downloadObject(file, res);
    } catch (err) {
      console.error("[scan-image] erreur:", err);
      return res.status(404).json({ message: "Image introuvable" });
    }
  });

  // GET /api/admin/dataset?status=&area=&page=&limit=
  app.get("/api/admin/dataset", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const status = (req.query.status as string) || "pending";
      const area = (req.query.area as string) || "all";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getDatasetScans({ status: status as any, area, page, limit });
      res.json({ ...result, page, limit });
    } catch (err) {
      console.error("[admin/dataset] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/dataset/stats
  app.get("/api/admin/dataset/stats", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const stats = await storage.getDatasetStats();
      res.json(stats);
    } catch (err) {
      console.error("[admin/dataset/stats] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/ai-vs-doctor — Concordance IA ↔ diagnostic validé par le médecin.
  // Source de vérité : scans revus par un dermatologue (expert_reviewer / is_verified).
  // Aucun appel IA : pure agrégation SQL. Sert à cibler les améliorations B2C & DERM.
  app.get("/api/admin/ai-vs-doctor", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const R = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
      const reviewedCond = sql`(expert_reviewer IS NOT NULL OR is_verified = true) AND condition IS NOT NULL AND trim(condition) <> ''`;

      const summary = R(await db.execute(sql`
        SELECT
          COUNT(*) AS reviewed,
          COUNT(*) FILTER (WHERE NULLIF(trim(expert_corrected_condition),'') IS NULL
            OR lower(trim(expert_corrected_condition)) = lower(trim(condition))) AS concordant,
          COUNT(*) FILTER (WHERE NULLIF(trim(expert_corrected_condition),'') IS NOT NULL
            AND lower(trim(expert_corrected_condition)) <> lower(trim(condition))) AS corrected
        FROM scans WHERE ${reviewedCond}
      `))[0] || {};

      const confusions = R(await db.execute(sql`
        SELECT trim(condition) AS ia, trim(expert_corrected_condition) AS doc, COUNT(*) AS cnt
        FROM scans
        WHERE ${reviewedCond}
          AND NULLIF(trim(expert_corrected_condition),'') IS NOT NULL
          AND lower(trim(expert_corrected_condition)) <> lower(trim(condition))
        GROUP BY 1, 2 ORDER BY cnt DESC LIMIT 8
      `));

      const byPhototype = R(await db.execute(sql`
        SELECT COALESCE(NULLIF(clinical_context->'examen'->>'phototype',''), '—') AS phototype,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE NULLIF(trim(expert_corrected_condition),'') IS NULL
            OR lower(trim(expert_corrected_condition)) = lower(trim(condition))) AS concordant
        FROM scans WHERE ${reviewedCond}
        GROUP BY 1 ORDER BY total DESC
      `));

      const recent = R(await db.execute(sql`
        SELECT condition AS ia, expert_corrected_condition AS doc, expert_reviewer AS reviewer, expert_reviewed_at AS at
        FROM scans
        WHERE ${reviewedCond}
          AND NULLIF(trim(expert_corrected_condition),'') IS NOT NULL
          AND lower(trim(expert_corrected_condition)) <> lower(trim(condition))
        ORDER BY expert_reviewed_at DESC NULLS LAST LIMIT 12
      `));

      res.json({
        reviewed: Number(summary.reviewed || 0),
        concordant: Number(summary.concordant || 0),
        corrected: Number(summary.corrected || 0),
        confusions: confusions.map((r) => ({ ia: r.ia, doc: r.doc, count: Number(r.cnt) })),
        byPhototype: byPhototype.map((r) => ({ phototype: r.phototype, total: Number(r.total), concordant: Number(r.concordant) })),
        recent: recent.map((r) => ({ ia: r.ia, doc: r.doc, reviewer: r.reviewer, at: r.at })),
      });
    } catch (err) {
      console.error("[ai-vs-doctor] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/dataset-export — Export JSONL du dataset (bouton dashboard admin).
  // Guardé par la clé admin (comme le reste de l'onglet Dataset).
  app.get("/api/admin/dataset-export", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const status = (req.query.status as string) || "validated";
      const anon = req.query.anon === "1" || req.query.anon === "true";
      let q: any = db.select().from(trainingData).orderBy(desc(trainingData.createdAt));
      if (status !== "all") q = q.where(eq(trainingData.dermValidationStatus, status));
      const records: TrainingData[] = await q;
      const date = new Date().toISOString().slice(0, 10);

      // Mode anonymisé (licence B2B) : pseudonymise l'identifiant et retire tout
      // lien patient/médecin nominatif. Le sel garde la pseudonymisation stable.
      const { createHash } = await import("crypto");
      const salt = process.env.DATASET_EXPORT_SALT || process.env.ADMIN_KEY || "glowscan-salt";
      const pseudo = (v: any) => createHash("sha256").update(salt + "|" + String(v)).digest("hex").slice(0, 16);
      const scrub = (obj: any) => {
        if (!obj || typeof obj !== "object") return obj;
        const c: any = Array.isArray(obj) ? [...obj] : { ...obj };
        for (const k of ["reviewer", "dermatoAnnotatedBy", "validatedBy", "userId", "correctedByDoctor"]) delete c[k];
        return c;
      };

      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Content-Disposition", `attachment; filename="glowscan-dataset-${status}${anon ? "-anon" : ""}-${date}.jsonl"`);
      res.setHeader("Cache-Control", "no-store");
      for (const rec of records) {
        const base: any = {
          mode: rec.mode, source: rec.source,
          ai_model: rec.aiModelVersion, primary_condition: rec.primaryCondition,
          secondary_condition: rec.secondaryCondition, severity: rec.severity, score: rec.score,
          phototype: rec.skinPhototype, image_quality: rec.imageQuality, image_hash: rec.imageHash,
          validation_status: rec.dermValidationStatus,
          training_weight: rec.trainingWeight,
          annotation: anon ? scrub(rec.annotation) : rec.annotation,
          ground_truth: anon ? scrub(rec.groundTruth) : rec.groundTruth,
          ai_diagnosis: rec.aiDiagnosis, created_at: rec.createdAt,
        };
        if (anon) {
          base.sample_id = pseudo(rec.id);          // identifiant stable non réversible
        } else {
          base.id = rec.id; base.scan_id = rec.scanId; base.validated_by = rec.validatedBy;
        }
        res.write(JSON.stringify(base) + "\n");
      }
      res.end();
    } catch (err) {
      console.error("[dataset-export] error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Erreur export" });
    }
  });

  // POST /api/admin/dataset/:id/review
  app.post("/api/admin/dataset/:id/review", async (req: any, res) => {
    if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const id = parseInt(req.params.id);
      if (!id) return res.status(400).json({ message: "id invalide" });

      const schema = z.object({
        isVerified: z.boolean(),
        expertNote: z.string().nullable().optional(),
        expertCorrectedCondition: z.string().nullable().optional(),
        expertReviewer: z.string().nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Données invalides" });

      const updated = await storage.reviewScan(id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Scan introuvable" });
      console.log(`[dataset] 🩺 scan #${id} ${updated.isVerified ? "VALIDÉ" : "REJETÉ"} par ${updated.expertReviewer || "anonyme"}`);
      res.json(updated);
    } catch (err) {
      console.error("[admin/dataset/review] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─────────────────────────────────────────────────────────
  // PREMIUM REQUESTS — Demandes de paiement Mobile Money
  // ─────────────────────────────────────────────────────────
  const OWNER_WHATSAPP = "237674377959";
  const PREMIUM_PRICE = 2000;

  // POST /api/premium/request — soumettre une demande de paiement
  app.post("/api/premium/request", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Connexion requise" });

    const { method, phone } = req.body;
    if (!method || !phone) return res.status(400).json({ message: "Méthode et téléphone requis" });

    try {
      // Vérifier si demande déjà en attente
      const existing = await db.select().from(premiumRequests)
        .where(and(eq(premiumRequests.userId, userId), eq(premiumRequests.status, "pending")))
        .limit(1);
      if (existing.length > 0) {
        return res.json({ success: true, request: existing[0], alreadyPending: true });
      }

      // Générer une référence unique
      const ref = "GS-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const [request] = await db.insert(premiumRequests).values({
        userId,
        reference: ref,
        method,
        phone,
        amount: PREMIUM_PRICE,
        status: "pending",
      }).returning();

      // Récupérer infos utilisateur pour le message
      const [userInfo] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const userName = (userInfo as any)?.firstName || (userInfo as any)?.email || userId;

      // Message WhatsApp pour le propriétaire
      const methodLabel = method === "mtn_momo" ? "MTN MoMo" : "Orange Money";
      const msg = encodeURIComponent(
        `💳 Nouvelle demande Premium GlowScan\n\n` +
        `👤 Utilisateur : ${userName}\n` +
        `📱 Téléphone paiement : ${phone}\n` +
        `💰 Méthode : ${methodLabel}\n` +
        `🔑 Référence : ${ref}\n` +
        `💵 Montant : ${PREMIUM_PRICE} FCFA\n\n` +
        `➡️ Confirmer via le dashboard Admin GlowScan`
      );

      const ownerWaUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${msg}`;
      res.json({ success: true, request, ownerWaUrl });
    } catch (err) {
      console.error("[premium/request] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/premium/status — statut de la demande en cours de l'utilisateur
  app.get("/api/premium/status", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Connexion requise" });

    try {
      const [pending] = await db.select().from(premiumRequests)
        .where(and(eq(premiumRequests.userId, userId), eq(premiumRequests.status, "pending")))
        .orderBy(desc(premiumRequests.createdAt))
        .limit(1);
      res.json({ request: pending || null });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/scans/email-report — envoi AUTOMATIQUE du rapport PDF à l'email saisi
  // dans le formulaire B2C (anonyme autorisé). Rate-limité (anti-spam) : l'email
  // ne part qu'à l'adresse fournie par l'utilisateur lui-même.
  app.post("/api/scans/email-report", emailReportLimiter, async (req: any, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email.includes("@") || email.length < 5) return res.status(400).json({ message: "Email invalide" });
      let pdf = String(req.body?.pdfBase64 || "");
      if (pdf.startsWith("data:")) pdf = pdf.split(",")[1] || "";
      if (pdf.length < 100) return res.status(400).json({ message: "PDF manquant" });
      const { sendEmail, buildB2CResultEmail } = await import("./email");
      const base = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
      const name = String(req.body?.name || "").trim();
      const condition = String(req.body?.condition || "Analyse cutanée").trim();
      const score = parseInt(req.body?.score) || 0;
      const e = buildB2CResultEmail(name, condition, score, `${base}/analyze`);
      const r = await sendEmail(email, e.subject, e.html, e.text, [{ filename: "analyse-glowscan.pdf", content: pdf }]);
      res.json({ success: r.ok, sent: r.ok });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/scans/:id/email-result — envoyer le résultat d'une analyse par email
  // (transactionnel, à la demande de l'utilisateur connecté).
  app.post("/api/scans/:id/email-result", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Connexion requise" });
      const scanId = parseInt(req.params.id);
      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));
      if (!scan || scan.userId !== userId) return res.status(404).json({ message: "Analyse introuvable" });
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (!u?.email || u.email.endsWith("@phone.glowscan.cm")) return res.status(400).json({ message: "Aucun email sur votre compte" });
      const { sendEmail, buildB2CResultEmail } = await import("./email");
      const base = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
      const e = buildB2CResultEmail((u as any).firstName || "", scan.condition || "Analyse cutanée", scan.score || 0, `${base}/profile`);
      // Le client peut fournir le PDF du rapport (base64) → on l'attache.
      let pdf = String(req.body?.pdfBase64 || "");
      if (pdf.startsWith("data:")) pdf = pdf.split(",")[1] || "";
      const attachments = pdf.length > 100 ? [{ filename: `analyse-glowscan-${scanId}.pdf`, content: pdf }] : undefined;
      const r = await sendEmail(u.email, e.subject, e.html, e.text, attachments);
      res.json({ success: r.ok, sent: r.ok, attached: !!attachments });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/premium/requests — liste toutes les demandes en attente
  app.get("/api/admin/premium/requests", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const requests = await db.select({
        id: premiumRequests.id,
        reference: premiumRequests.reference,
        method: premiumRequests.method,
        phone: premiumRequests.phone,
        amount: premiumRequests.amount,
        status: premiumRequests.status,
        createdAt: premiumRequests.createdAt,
        processedAt: premiumRequests.processedAt,
        note: premiumRequests.note,
        userId: premiumRequests.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
      })
      .from(premiumRequests)
      .leftJoin(users, eq(premiumRequests.userId, users.id))
      .orderBy(desc(premiumRequests.createdAt))
      .limit(50);
      res.json({ requests });
    } catch (err) {
      console.error("[admin/premium/requests] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/admin/premium/confirm/:id — confirmer et activer le premium
  app.post("/api/admin/premium/confirm/:id", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ message: "ID invalide" });

    try {
      const [pr] = await db.select().from(premiumRequests).where(eq(premiumRequests.id, requestId)).limit(1);
      if (!pr) return res.status(404).json({ message: "Demande introuvable" });

      // Marquer comme confirmée
      await db.update(premiumRequests).set({
        status: "confirmed",
        processedAt: new Date(),
        processedBy: "admin",
        note: req.body.note || "Paiement confirmé",
      }).where(eq(premiumRequests.id, requestId));

      // Activer l'abonnement premium (30 jours)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await db.update(subscriptions).set({ status: "expired" }).where(eq(subscriptions.userId, pr.userId));
      const [sub] = await db.insert(subscriptions).values({
        userId: pr.userId,
        status: "active",
        plan: "monthly",
        expiresAt,
        activatedBy: "admin",
        note: `Paiement ${pr.method} - ref ${pr.reference}`,
      }).returning();

      // +100 pts fidélité
      await db.insert(loyaltyPoints).values({ userId: pr.userId, points: 100, reason: "upgrade_premium" });

      // === GlowScan PRO : si réf commence par "PRO-", activer aussi pro_accounts ===
      if (pr.reference?.startsWith("PRO-")) {
        const { proAccounts } = await import("@shared/schema");
        const proExpiresAt = new Date();
        proExpiresAt.setDate(proExpiresAt.getDate() + 30);
        await db.update(proAccounts).set({
          subscriptionStatus: "active",
          subscriptionExpiresAt: proExpiresAt,
        }).where(eq(proAccounts.userId, pr.userId));
        console.log(`[admin] ✅ Compte Pro activé pour user=${pr.userId} jusqu'au ${proExpiresAt.toISOString()}`);
        // 5 · Reçu d'abonnement par email (best-effort)
        try {
          const { sendEmail, buildReceiptEmail } = await import("./email");
          const [u] = await db.select().from(users).where(eq(users.id, pr.userId));
          const [pa] = await db.select().from(proAccounts).where(eq(proAccounts.userId, pr.userId));
          if (u?.email && !u.email.endsWith("@phone.glowscan.cm")) {
            const r = buildReceiptEmail((pa?.fullName || (u as any).firstName || "").split(" ")[0] || "", pr.amount || 10000, pr.reference, proExpiresAt);
            sendEmail(u.email, r.subject, r.html, r.text).catch(() => {});
          }
        } catch {}
      } else {
        // Reçu abonnement B2C (grand public — réf non "PRO-").
        try {
          const { sendEmail, buildReceiptEmail } = await import("./email");
          const [u] = await db.select().from(users).where(eq(users.id, pr.userId));
          if (u?.email && !u.email.endsWith("@phone.glowscan.cm")) {
            const r = buildReceiptEmail((u as any).firstName || "", pr.amount || 0, pr.reference, expiresAt);
            sendEmail(u.email, r.subject, r.html, r.text).catch(() => {});
          }
        } catch {}
      }

      res.json({ success: true, subscription: sub });
    } catch (err) {
      console.error("[admin/premium/confirm] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/admin/premium/reject/:id — rejeter une demande
  app.post("/api/admin/premium/reject/:id", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ message: "ID invalide" });
    try {
      await db.update(premiumRequests).set({
        status: "rejected",
        processedAt: new Date(),
        processedBy: "admin",
        note: req.body.reason || "Rejeté",
      }).where(eq(premiumRequests.id, requestId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/admin/subscription/deactivate — admin désactive
  app.post("/api/admin/subscription/deactivate", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId requis" });

    try {
      await db.update(subscriptions)
        .set({ status: "cancelled" })
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/subscriptions — liste tous les abonnements actifs
  app.get("/api/admin/subscriptions", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const subs = await db.select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        expiresAt: subscriptions.expiresAt,
        note: subscriptions.note,
        createdAt: subscriptions.createdAt,
      }).from(subscriptions)
        .where(eq(subscriptions.status, "active"))
        .orderBy(subscriptions.createdAt);
      res.json(subs);
    } catch {
      res.json([]);
    }
  });

  // GET /api/admin/users — liste tous les utilisateurs avec statut abonnement
  app.get("/api/admin/users", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const allUsers = await db.select().from(users).orderBy(users.id);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const result = await Promise.all(allUsers.map(async (u) => {
        const activeSub = await db.select().from(subscriptions)
          .where(and(eq(subscriptions.userId, u.id), eq(subscriptions.status, "active"), gte(subscriptions.expiresAt, now)))
          .limit(1);
        const scansCount = await db.select({ count: count() }).from(scans)
          .where(and(eq(scans.userId, u.id), gte(scans.createdAt, startOfMonth)));
        const sub = activeSub[0] || null;
        return {
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—",
          email: u.email,
          profileImage: u.profileImageUrl,
          isPremium: !!sub,
          expiresAt: sub?.expiresAt?.toISOString() ?? null,
          plan: sub ? "premium" : null,
          note: sub?.note ?? null,
          scansThisMonth: scansCount[0]?.count ?? 0,
          createdAt: u.createdAt?.toISOString() ?? null,
        };
      }));
      res.json(result);
    } catch (e) {
      console.error("admin/users error:", e);
      res.json([]);
    }
  });

  // GET /api/admin/dermatologists-activity — monitoring de l'activité des dermatologues
  // Agrège pro_accounts + users + patients + scans (données existantes, aucune table créée).
  app.get("/api/admin/dermatologists-activity", async (req: any, res) => {
    if (!checkAdminKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      // `full` = inclut les colonnes optionnelles (last_login, country) qui peuvent
      // ne pas encore exister en base (migrations 0005/0006).
      const baseSelect = (full: boolean) => sql`
        SELECT pa.id, pa.user_id, pa.full_name, pa.cabinet_name, pa.city, pa.phone,
               pa.subscription_status, pa.subscription_expires_at, pa.trial_ends_at, pa.created_at,
               u.email,
               ${full ? sql`u.last_login, pa.country,` : sql`NULL::timestamp AS last_login, NULL::varchar AS country,`}
               (SELECT count(*) FROM patients p WHERE p.dermatologist_id = pa.id) AS patient_count,
               (SELECT count(*) FROM scans s WHERE s.patient_id IN (SELECT id FROM patients WHERE dermatologist_id = pa.id)) AS analysis_count
        FROM pro_accounts pa
        LEFT JOIN users u ON u.id = pa.user_id
        ORDER BY pa.created_at DESC`;

      // Tente avec les colonnes optionnelles ; si l'une manque → fallback sans.
      let result: any;
      try { result = await db.execute(baseSelect(true)); }
      catch { result = await db.execute(baseSelect(false)); }
      const rows: any[] = (result?.rows ?? result ?? []) as any[];

      const now = Date.now();
      const DAY = 86400000;
      const dermatologists = rows.map((row) => {
        const lastLogin = row.last_login ? new Date(row.last_login) : null;
        const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
        const subStatus = String(row.subscription_status || "trial");
        const analysisCount = Number(row.analysis_count) || 0;
        const patientCount = Number(row.patient_count) || 0;
        const daysSinceLogin = lastLogin ? Math.floor((now - lastLogin.getTime()) / DAY) : null;
        const trialExpired = subStatus === "trial" && !!trialEndsAt && trialEndsAt.getTime() < now;
        const isPaid = subStatus === "active";
        const trialDaysLeft = subStatus === "trial" && trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / DAY)) : null;

        const status = isPaid ? "paid" : trialExpired ? "expired" : subStatus === "trial" ? "trial" : "expired";

        const blockers: string[] = [];
        if (!lastLogin) blockers.push("Jamais connecté");
        else if (analysisCount === 0) blockers.push("Bloqué — 0 analyse");
        if (trialExpired && !isPaid) blockers.push("Essai expiré — non converti");
        if (daysSinceLogin !== null && daysSinceLogin > 7) blockers.push("Inactif");

        return {
          id: row.id,
          userId: row.user_id,
          fullName: row.full_name || "—",
          email: row.email || "—",
          cabinetName: row.cabinet_name || null,
          city: row.city || null,
          country: row.country || null,
          phone: row.phone || null,
          createdAt: row.created_at,
          status,           // trial | paid | expired
          patientCount,
          analysisCount,
          lastLogin: lastLogin ? lastLogin.toISOString() : null,
          daysSinceLogin,
          trialDaysLeft,
          blockers,
        };
      });

      res.json({ dermatologists, total: dermatologists.length });
    } catch (err) {
      console.error("[admin/dermatologists-activity] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/retention — segments de rétention, couvre TOUS les utilisateurs
  // Sources contact : premiumRequests.phone (prioritaire) > email faux tel-XXX@phone.glowscan.cm > email réel
  app.get("/api/admin/retention", async (req: any, res) => {
    if (!checkAdminKey(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const now    = new Date();
      const in7d   = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);
      const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
      const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // ── 1. Tous les utilisateurs (pas de filtre) ──────────────────────
      const allUsersRows = await db.select().from(users).orderBy(desc(users.createdAt));
      const userIds = allUsersRows.map((u) => u.id);
      if (userIds.length === 0) return res.json({ segments: {}, total: 0, contacts: [] });

      // ── 2. phoneMap depuis premiumRequests (confirmed > pending > rejected) ──
      const allReqs = await db.select().from(premiumRequests).orderBy(desc(premiumRequests.createdAt));
      const phoneMap  = new Map<string, { phone: string; method: string; reqStatus: string }>();
      const priorityOf = (s: string) => s === "confirmed" ? 3 : s === "pending" ? 2 : 1;
      for (const r of allReqs) {
        const existing = phoneMap.get(r.userId);
        if (!existing || priorityOf(r.status) > priorityOf(existing.reqStatus)) {
          phoneMap.set(r.userId, { phone: r.phone, method: r.method, reqStatus: r.status });
        }
      }

      // ── 3. Subs + scans en parallèle ─────────────────────────────────
      const [allSubs, allScans] = await Promise.all([
        db.select().from(subscriptions)
          .where(inArray(subscriptions.userId, userIds))
          .orderBy(desc(subscriptions.expiresAt)),
        db.select({ userId: scans.userId, createdAt: scans.createdAt })
          .from(scans)
          .where(inArray(scans.userId, userIds.map(id => id as string)))
          .orderBy(desc(scans.createdAt)),
      ]);

      const subByUser  = new Map<string, typeof allSubs[0]>();
      for (const s of allSubs) {
        if (!subByUser.has(s.userId) || s.expiresAt > subByUser.get(s.userId)!.expiresAt)
          subByUser.set(s.userId, s);
      }
      const lastScanByUser  = new Map<string, Date>();
      const scanCountByUser = new Map<string, number>();
      for (const sc of allScans) {
        if (!sc.userId) continue;
        if (!lastScanByUser.has(sc.userId)) lastScanByUser.set(sc.userId, sc.createdAt!);
        scanCountByUser.set(sc.userId, (scanCountByUser.get(sc.userId) ?? 0) + 1);
      }

      // ── 4. Construire les contacts ────────────────────────────────────
      const contacts = allUsersRows.map((u) => {
        const sub       = subByUser.get(u.id);
        const lastScan  = lastScanByUser.get(u.id) ?? null;
        const scanCount = scanCountByUser.get(u.id) ?? 0;
        const premPh    = phoneMap.get(u.id);

        // Contact : premiumRequest.phone > faux email tel-XXX > email réel
        let phone: string | null = null;
        let method = "unknown";
        let contactType: "whatsapp" | "email" = "email";
        let displayEmail: string | null = null;

        if (premPh) {
          phone = premPh.phone;
          method = premPh.method;
          contactType = "whatsapp";
        } else if (u.email?.endsWith("@phone.glowscan.cm")) {
          phone = u.email.replace(/^tel-/, "").replace(/@phone\.glowscan\.cm$/, "");
          method = "phone";
          contactType = "whatsapp";
        } else if (u.email) {
          displayEmail = u.email;
          contactType = "email";
        }

        // Inclure si : téléphone OU email OU au moins 1 scan (comportement observable)
        const hasScan = (scanCountByUser.get(u.id) ?? 0) > 0;
        const hasContact = !!(phone || displayEmail);
        if (!hasContact && !hasScan) return null;

        // Nom affiché
        const rawName = [u.firstName, u.lastName].filter(Boolean).join(" ");
        const name = rawName || phone || displayEmail?.split("@")[0] || `User-${u.id.slice(0, 6)}`;

        // Segment — ordre de priorité : sub active > sub expirée > jamais payé + inactif
        const hasSub = !!sub;
        let segment: string;
        if (hasSub && sub!.status === "active" && sub!.expiresAt >= now) {
          segment = sub!.expiresAt <= in7d ? "expiring_soon" : "active";
        } else if (hasSub && sub!.expiresAt >= ago30d) {
          segment = "recently_expired";
        } else if (hasSub) {
          segment = "churned";
        } else if (premPh && premPh.reqStatus !== "confirmed") {
          // A demandé mais paiement jamais confirmé
          segment = "pending";
        } else if (!hasSub && (!lastScan || lastScan <= ago30d) && u.createdAt! <= ago30d) {
          segment = "dormant_30d";
        } else if (!hasSub && (!lastScan || lastScan <= ago7d) && u.createdAt! <= ago7d) {
          segment = "dormant_7d";
        } else {
          segment = "new"; // inscrit récemment ou actif sans sub
        }

        return {
          userId: u.id,
          name,
          email: displayEmail,
          phone,
          method,
          contactType,
          segment,
          expiresAt:  sub?.expiresAt?.toISOString() ?? null,
          isPremium:  hasSub && sub!.status === "active" && sub!.expiresAt >= now,
          lastScanAt: lastScan?.toISOString() ?? null,
          scanCount,
          createdAt:  u.createdAt?.toISOString() ?? null,
        };
      }).filter(Boolean) as NonNullable<ReturnType<typeof allUsersRows[0] extends infer U ? any : never>>[];

      const segments: Record<string, number> = {};
      for (const c of contacts) segments[c.segment] = (segments[c.segment] ?? 0) + 1;

      console.log(`[retention] total_users=${allUsersRows.length} contactable=${contacts.length} segments=${JSON.stringify(segments)}`);
      res.json({ segments, total: contacts.length, contacts, debug: { total_users: allUsersRows.length } });
    } catch (err) {
      console.error("[admin/retention] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/leads/track — crée un lead WhatsApp avec code de référence unique
  app.post("/api/leads/track", async (req: any, res) => {
    const { brandPhone, brandName, productNames, totalPrice } = req.body;
    if (!brandPhone || !brandName || !productNames) {
      return res.status(400).json({ message: "Données manquantes" });
    }
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const referenceCode = `GS-${part1}-${part2}`;
    try {
      await db.insert(leads).values({
        referenceCode,
        userId: req.user?.id ?? null,
        brandPhone,
        brandName,
        productNames,
        totalPrice: totalPrice || 0,
        status: "clicked",
      });
      res.json({ referenceCode });
    } catch (e) {
      console.error("leads/track error:", e);
      res.status(500).json({ message: "Erreur" });
    }
  });

  // POST /api/leads/confirm — client confirme qu'il a envoyé le message
  app.post("/api/leads/confirm", async (req: any, res) => {
    const { referenceCode } = req.body;
    if (!referenceCode) return res.status(400).json({ message: "Code manquant" });
    try {
      await db.update(leads).set({ status: "confirmed" }).where(eq(leads.referenceCode, referenceCode));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Erreur" });
    }
  });

  // GET /api/admin/leads — liste des leads avec stats de conversion
  app.get("/api/admin/leads", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const allLeads = await db.select().from(leads).orderBy(leads.createdAt);
      const total = allLeads.length;
      const confirmed = allLeads.filter(l => l.status === "confirmed" || l.status === "ordered").length;
      const ordered = allLeads.filter(l => l.status === "ordered" || l.confirmedByBusiness).length;
      const byBrand: Record<string, { clicks: number; confirmed: number; ordered: number }> = {};
      for (const l of allLeads) {
        if (!byBrand[l.brandName]) byBrand[l.brandName] = { clicks: 0, confirmed: 0, ordered: 0 };
        byBrand[l.brandName].clicks++;
        if (l.status === "confirmed" || l.status === "ordered") byBrand[l.brandName].confirmed++;
        if (l.status === "ordered" || l.confirmedByBusiness) byBrand[l.brandName].ordered++;
      }
      res.json({ total, confirmed, ordered, conversionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0, byBrand, recent: allLeads.slice(-20).reverse() });
    } catch {
      res.json({ total: 0, confirmed: 0, ordered: 0, conversionRate: 0, byBrand: {}, recent: [] });
    }
  });

  // POST /api/admin/leads/mark-ordered — admin confirme une commande réelle (code soumis par l'entreprise)
  app.post("/api/admin/leads/mark-ordered", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const { referenceCode } = req.body;
    if (!referenceCode) return res.status(400).json({ message: "Code requis" });
    try {
      const result = await db.update(leads)
        .set({ status: "ordered", confirmedByBusiness: true })
        .where(eq(leads.referenceCode, referenceCode))
        .returning();
      if (result.length === 0) return res.status(404).json({ message: "Code non trouvé" });
      res.json({ success: true, lead: result[0] });
    } catch {
      res.status(500).json({ message: "Erreur" });
    }
  });

  // POST /api/referral/claim — déclenché après le 1er scan d'un filleul
  // Vérifie le code, trouve le parrain, lui crédite 50 pts, enregistre le parrainage
  app.post("/api/referral/claim", async (req: any, res) => {
    const referredId = getUID(req);
    if (!referredId) return res.status(401).json({ message: "Non authentifié" });
    const { code } = req.body;
    if (!code || typeof code !== "string" || !code.startsWith("GL")) {
      return res.status(400).json({ message: "Code invalide" });
    }
    const referrerPrefix = code.slice(2).toLowerCase(); // e.g. "8af3c2"

    try {
      // 1. Éviter l'auto-parrainage
      const myCode = `GL${referredId.substring(0, 6).toUpperCase()}`;
      if (code.toUpperCase() === myCode) {
        return res.status(400).json({ message: "Impossible de se parrainer soi-même" });
      }

      // 2. Vérifier si ce filleul a déjà été récompensé
      const existingReferral = await db.select()
        .from(referrals)
        .where(eq(referrals.referredId, referredId))
        .limit(1);
      if (existingReferral.length > 0) {
        return res.status(409).json({ message: "Parrainage déjà utilisé" });
      }

      // 3. Trouver le parrain par son code
      const referrerResults = await db.select()
        .from(users)
        .where(sql`UPPER(LEFT(${users.id}, 6)) = ${referrerPrefix.toUpperCase()}`)
        .limit(1);
      if (referrerResults.length === 0) {
        return res.status(404).json({ message: "Code introuvable" });
      }

      const referrerId = referrerResults[0].id;

      // 4. Enregistrer le parrainage
      await db.insert(referrals).values({ referrerId, referredId });

      // 5. Créditer 50 pts au parrain
      await db.insert(loyaltyPoints).values({
        userId: referrerId,
        points: 50,
        reason: "parrainage",
        referenceId: referredId,
      });

      // 6. Créditer 10 pts de bienvenue au filleul
      await db.insert(loyaltyPoints).values({
        userId: referredId,
        points: 10,
        reason: "parrainage_bienvenue",
        referenceId: referrerId,
      });

      console.log(`[referral] ${referredId} parrainé par ${referrerId} → +50 pts parrain, +10 pts filleul`);
      res.json({ success: true, pointsReferrer: 50, pointsReferred: 10 });
    } catch (err) {
      console.error("[referral/claim] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // === Classement challenges ===
  app.get("/api/challenges/leaderboard", async (_req, res) => {
    try {
      const top = await storage.getTopChallenges(10);
      res.json(top);
    } catch {
      res.json([]);
    }
  });

  // === Stats publiques (social proof) ===
  app.get("/api/stats/public", async (_req, res) => {
    try {
      const stats = await storage.getAnalyticsStats("all");
      res.json({
        totalScans: stats.totalAnalyses ?? 0,
        totalUsers: stats.uniqueVisitors ?? 0,
      });
    } catch {
      res.json({ totalScans: 0, totalUsers: 0 });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    const adminKey = req.query.key || req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    try {
      const period = (req.query.period as string) || "all";
      const validPeriods = ["today", "week", "month", "all"];
      const safePeriod = validPeriods.includes(period) ? period as any : "all";
      const stats = await storage.getAnalyticsStats(safePeriod);
      res.json(stats);
    } catch (error) {
      console.error("Analytics stats error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /api/admin/full-stats — Dashboard complet 100% DB directe
  // Données fiables tirées directement de toutes les tables
  // ═══════════════════════════════════════════════════════════════
  app.get("/api/admin/full-stats", async (req: any, res) => {
    const adminKey = req.query.key || req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const period = (req.query.period as string) || "month";

      // Calcul des dates de période
      const now = new Date();
      const getStartDate = (p: string) => {
        if (p === "today") return new Date(new Date().setHours(0, 0, 0, 0));
        if (p === "week") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (p === "month") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return null;
      };
      const startDate = getStartDate(period);
      const prevStartDate = (() => {
        if (period === "today") return new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (period === "week") return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        if (period === "month") return new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        return null;
      })();

      // ── SCANS ────────────────────────────────────────────────
      const totalScansResult = await db.select({ count: count() }).from(scans);
      const totalScans = Number(totalScansResult[0]?.count ?? 0);

      const scansThisPeriodResult = startDate
        ? await db.select({ count: count() }).from(scans).where(gte(scans.createdAt, startDate))
        : totalScansResult;
      const scansThisPeriod = Number(scansThisPeriodResult[0]?.count ?? 0);

      const scansPrevPeriodResult = (startDate && prevStartDate)
        ? await db.select({ count: count() }).from(scans).where(and(gte(scans.createdAt, prevStartDate), lte(scans.createdAt, startDate)))
        : null;
      const scansPrevPeriod = scansPrevPeriodResult ? Number(scansPrevPeriodResult[0]?.count ?? 0) : null;

      // Scans par jour (30 derniers jours)
      const scansByDayRaw = await db
        .select({
          day: sql<string>`TO_CHAR(${scans.createdAt} AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(scans)
        .where(gte(scans.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .groupBy(sql`TO_CHAR(${scans.createdAt} AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${scans.createdAt} AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')`);

      // Scans par zone (face/body/hair)
      const scansByAreaRaw = await db
        .select({ area: scans.area, count: count() })
        .from(scans)
        .groupBy(scans.area);
      const scansByArea = { face: 0, body: 0, hair: 0 } as Record<string, number>;
      for (const row of scansByAreaRaw) {
        scansByArea[row.area] = Number(row.count);
      }

      // Score moyen
      const avgScoreResult = await db.select({ avg: avg(scans.score) }).from(scans);
      const avgScore = Math.round(Number(avgScoreResult[0]?.avg ?? 0));

      // Distribution des scores
      const scoreDistRaw = await db
        .select({
          range: sql<string>`CASE WHEN ${scans.score} <= 25 THEN '0-25' WHEN ${scans.score} <= 50 THEN '26-50' WHEN ${scans.score} <= 75 THEN '51-75' ELSE '76-100' END`,
          count: count(),
        })
        .from(scans)
        .groupBy(sql`CASE WHEN ${scans.score} <= 25 THEN '0-25' WHEN ${scans.score} <= 50 THEN '26-50' WHEN ${scans.score} <= 75 THEN '51-75' ELSE '76-100' END`);
      const scoreDistribution = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 } as Record<string, number>;
      for (const row of scoreDistRaw) {
        scoreDistribution[row.range] = Number(row.count);
      }

      // Top conditions (regroupement simplifié — premiers mots)
      const conditionsRaw = await db
        .select({ condition: scans.condition, count: count() })
        .from(scans)
        .where(sql`${scans.condition} IS NOT NULL`)
        .groupBy(scans.condition)
        .orderBy(desc(count()))
        .limit(8);

      // Scans anonymes vs identifiés
      const scansWithUserResult = await db.select({ count: count() }).from(scans).where(sql`${scans.userId} IS NOT NULL`);
      const scansWithUser = Number(scansWithUserResult[0]?.count ?? 0);

      // Derniers scans avec infos utilisateur
      const recentScansRaw = await db
        .select({
          id: scans.id,
          area: scans.area,
          condition: scans.condition,
          score: scans.score,
          userId: scans.userId,
          createdAt: scans.createdAt,
        })
        .from(scans)
        .orderBy(desc(scans.createdAt))
        .limit(15);

      // ── UTILISATEURS ─────────────────────────────────────────
      const totalUsersResult = await db.select({ count: count() }).from(users);
      const totalUsers = Number(totalUsersResult[0]?.count ?? 0);

      const newUsersResult = startDate
        ? await db.select({ count: count() }).from(users).where(gte(users.createdAt, startDate))
        : totalUsersResult;
      const newUsers = Number(newUsersResult[0]?.count ?? 0);

      const newUsersPrevResult = (startDate && prevStartDate)
        ? await db.select({ count: count() }).from(users).where(and(gte(users.createdAt, prevStartDate), lte(users.createdAt, startDate)))
        : null;
      const newUsersPrev = newUsersPrevResult ? Number(newUsersPrevResult[0]?.count ?? 0) : null;

      // Nouveaux utilisateurs par jour (30 derniers jours)
      const usersByDayRaw = await db
        .select({
          day: sql<string>`TO_CHAR(${users.createdAt} AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(users)
        .where(gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .groupBy(sql`TO_CHAR(${users.createdAt} AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${users.createdAt} AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')`);

      // Utilisateurs avec ≥2 scans (rétention)
      const retentionRaw = await db
        .select({ userId: scans.userId, cnt: count() })
        .from(scans)
        .where(sql`${scans.userId} IS NOT NULL`)
        .groupBy(scans.userId)
        .having(sql`COUNT(*) >= 2`);
      const usersRetained = retentionRaw.length;

      // Derniers inscrits
      const recentUsersRaw = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(10);

      // ── PREMIUM ──────────────────────────────────────────────
      const activePremiumResult = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(and(eq(subscriptions.status, "active"), gte(subscriptions.expiresAt, now)));
      const activePremium = Number(activePremiumResult[0]?.count ?? 0);

      const totalPremiumResult = await db.select({ count: count() }).from(subscriptions);
      const totalPremiumAllTime = Number(totalPremiumResult[0]?.count ?? 0);

      const premiumRevenueResult = await db
        .select({ total: sql<number>`COALESCE(SUM(2000), 0)::integer` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active"));
      const premiumRevenue = activePremium * 2000; // 2000 FCFA/mois

      // ── WHATSAPP & CONVERSION ─────────────────────────────────
      const totalWAResult = await db.select({ count: count() }).from(whatsappClicks);
      const totalWA = Number(totalWAResult[0]?.count ?? 0);

      const waThisPeriodResult = startDate
        ? await db.select({ count: count() }).from(whatsappClicks).where(gte(whatsappClicks.createdAt, startDate))
        : totalWAResult;
      const waThisPeriod = Number(waThisPeriodResult[0]?.count ?? 0);

      const waByBrandRaw = await db
        .select({ brand: whatsappClicks.brand, count: count() })
        .from(whatsappClicks)
        .groupBy(whatsappClicks.brand)
        .orderBy(desc(count()));

      const waByProductRaw = await db
        .select({ productName: whatsappClicks.productName, brand: whatsappClicks.brand, count: count() })
        .from(whatsappClicks)
        .groupBy(whatsappClicks.productName, whatsappClicks.brand)
        .orderBy(desc(count()))
        .limit(10);

      // ── DERM EVENTS (clics dermato + login/register pro) ─────
      const dermClicksResult = await db.select({ count: count() }).from(whatsappClicks)
        .where(eq(whatsappClicks.brand, "dermatologist"));
      const totalDermClicks = Number(dermClicksResult[0]?.count ?? 0);

      const dermClicksByDoctorRaw = await db
        .select({ productName: whatsappClicks.productName, count: count() })
        .from(whatsappClicks)
        .where(eq(whatsappClicks.brand, "dermatologist"))
        .groupBy(whatsappClicks.productName)
        .orderBy(desc(count()));

      const proRegisterResult = await db.select({ count: count() }).from(pageVisits)
        .where(eq(pageVisits.page, "pro_register"));
      const totalProRegister = Number(proRegisterResult[0]?.count ?? 0);

      const proLoginResult = await db.select({ count: count() }).from(pageVisits)
        .where(eq(pageVisits.page, "pro_login"));
      const totalProLogin = Number(proLoginResult[0]?.count ?? 0);

      // ── ORDERS ────────────────────────────────────────────────
      const totalOrdersResult = await db.select({ count: count() }).from(orders);
      const totalOrders = Number(totalOrdersResult[0]?.count ?? 0);

      const revenueResult = await db.select({ total: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)::integer` }).from(orders);
      const revenue = Number(revenueResult[0]?.total ?? 0);

      // ── FUNNEL ─────────────────────────────────────────────────
      const conversionScanToWA = totalScans > 0 ? Math.round((totalWA / totalScans) * 100) : 0;
      const conversionWAToOrder = totalWA > 0 ? Math.round((totalOrders / totalWA) * 100) : 0;

      res.json({
        period,
        generatedAt: new Date().toISOString(),
        scans: {
          total: totalScans,
          thisPeriod: scansThisPeriod,
          prevPeriod: scansPrevPeriod,
          trend: scansPrevPeriod !== null ? scansThisPeriod - scansPrevPeriod : null,
          byDay: scansByDayRaw,
          byArea: scansByArea,
          avgScore,
          scoreDistribution,
          topConditions: conditionsRaw,
          withUser: scansWithUser,
          anonymous: totalScans - scansWithUser,
          recent: recentScansRaw,
        },
        users: {
          total: totalUsers,
          newThisPeriod: newUsers,
          newPrevPeriod: newUsersPrev,
          trend: newUsersPrev !== null ? newUsers - newUsersPrev : null,
          byDay: usersByDayRaw,
          retained: usersRetained,
          retentionRate: totalUsers > 0 ? Math.round((usersRetained / totalUsers) * 100) : 0,
          recent: recentUsersRaw,
        },
        premium: {
          active: activePremium,
          totalAllTime: totalPremiumAllTime,
          monthlyRevenue: premiumRevenue,
        },
        whatsapp: {
          total: totalWA,
          thisPeriod: waThisPeriod,
          byBrand: waByBrandRaw,
          byProduct: waByProductRaw,
        },
        derm: {
          whatsappClicks: totalDermClicks,
          clicksByDoctor: dermClicksByDoctorRaw,
          proRegistrations: totalProRegister,
          proLogins: totalProLogin,
        },
        orders: {
          total: totalOrders,
          revenue,
        },
        funnel: {
          users: totalUsers,
          scans: totalScans,
          whatsapp: totalWA,
          orders: totalOrders,
          conversionScanToWA,
          conversionWAToOrder,
        },
      });
    } catch (error) {
      console.error("[admin/full-stats] Error:", error);
      res.status(500).json({ message: "Erreur serveur", error: String(error) });
    }
  });

  // === Scan Produit IA : analyse n'importe quel produit filmé ===
  app.post("/api/product-scan", async (req: any, res) => {
    try {
      const { image } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Image requise" });
      }

      // Récupérer le profil de peau de l'utilisateur s'il est connecté
      let skinProfile: string | null = null;
      if (isAuth(req)) {
        const userId = req.user?.id || (req.user as any)?.claims?.sub;
        if (userId) {
          const lastScan = await db.select().from(scans)
            .where(eq(scans.userId, userId))
            .orderBy(sql`created_at DESC`)
            .limit(1);
          if (lastScan.length > 0 && lastScan[0].condition) {
            skinProfile = lastScan[0].condition;
          }
        }
      }

      const skinContext = skinProfile
        ? `Le profil de peau de l'utilisateur est : "${skinProfile}".`
        : "Profil de peau inconnu — donne un avis général.";

      const prompt = `Tu es un expert cosmétologue et dermatologiste IA. Analyse ce produit cosmétique ou de soin.

${skinContext}

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "productName": "Nom du produit identifié",
  "brand": "Marque si visible, sinon null",
  "category": "type de produit (Crème hydratante, Sérum, Nettoyant, Shampooing, etc.)",
  "mainIngredients": ["ingrédient 1", "ingrédient 2", "ingrédient 3"],
  "benefits": ["bénéfice 1", "bénéfice 2", "bénéfice 3"],
  "suitableFor": ["type de peau 1", "type de peau 2"],
  "warnings": ["mise en garde 1 si applicable"],
  "matchScore": 85,
  "matchLabel": "Excellent pour ta peau",
  "verdict": "Phrase courte de verdict (max 20 mots) sur l'adéquation avec le profil de l'utilisateur",
  "safetyScore": 88,
  "note": "Conseil personnalisé court (max 30 mots)"
}

matchScore est entre 0 et 100 — compatibilité avec le profil de peau de l'utilisateur.
safetyScore est entre 0 et 100 — sécurité générale des ingrédients.
Si tu ne reconnais pas le produit, fais de ton mieux avec ce que tu vois.
Ne mentionne JAMAIS la qualité de l'image.`;

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const mimeMatch = image.match(/^data:(image\/[a-z+]+);base64,/);
      const mimeType = (mimeMatch ? mimeMatch[1] : "image/jpeg") as string;

      let raw = "";
      if (USE_GEMINI && gemini) {
        const m = gemini.getGenerativeModel({ model: AI_MODEL });
        const gemResult = await Promise.race([
          m.generateContent({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: base64Data } },
              ],
            }],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800, temperature: 0.3 },
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000)),
        ]);
        raw = gemResult.response.text()?.trim() || "";
      } else if (openai) {
        const response = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
            ],
          }],
          max_tokens: 800,
          temperature: 0.3,
          ...(AI_IS_REASONING ? {} : { response_format: { type: "json_object" as const } }),
        }, { timeout: 30000, maxRetries: 0 });
        raw = response.choices[0]?.message?.content || "";
      } else {
        return res.status(503).json({ message: "Aucun provider IA configuré" });
      }

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ message: "Réponse IA invalide" });
      }
      const result = JSON.parse(jsonMatch[0]);
      res.json(result);
    } catch (error: any) {
      console.error("Product scan error:", error);
      res.status(500).json({ message: "Erreur lors de l'analyse du produit" });
    }
  });

  // ═══════════════════════════════════════════════════
  // === Wellness Tracker — suivi bien-être quotidien ===
  // ═══════════════════════════════════════════════════

  // GET /api/wellness/today — entrée du jour
  app.get("/api/wellness/today", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    const today = new Date().toISOString().slice(0, 10);
    const [log] = await db.select().from(wellnessLogs)
      .where(and(eq(wellnessLogs.userId, userId), eq(wellnessLogs.date, today)))
      .limit(1);

    res.json(log || { userId, date: today, waterGlasses: 0, sleepHours: 0, mood: 0, energy: 0 });
  });

  // POST /api/wellness/today — créer ou mettre à jour
  app.post("/api/wellness/today", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    const { waterGlasses, sleepHours, mood, energy } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const [existing] = await db.select().from(wellnessLogs)
      .where(and(eq(wellnessLogs.userId, userId), eq(wellnessLogs.date, today)))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(wellnessLogs)
        .set({
          ...(waterGlasses !== undefined && { waterGlasses }),
          ...(sleepHours !== undefined && { sleepHours }),
          ...(mood !== undefined && { mood }),
          ...(energy !== undefined && { energy }),
          updatedAt: new Date(),
        })
        .where(and(eq(wellnessLogs.userId, userId), eq(wellnessLogs.date, today)))
        .returning();
      return res.json(updated);
    }

    const [created] = await db.insert(wellnessLogs).values({
      userId,
      date: today,
      waterGlasses: waterGlasses ?? 0,
      sleepHours: sleepHours ?? 0,
      mood: mood ?? 0,
      energy: energy ?? 0,
    }).returning();
    res.json(created);
  });

  // GET /api/wellness/history — 7 derniers jours
  app.get("/api/wellness/history", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    const logs = await db.select().from(wellnessLogs)
      .where(eq(wellnessLogs.userId, userId))
      .orderBy(desc(wellnessLogs.date))
      .limit(7);

    res.json(logs);
  });

  // ══════════════════════════════
  // ROUTINES (matin / soir)
  // ══════════════════════════════

  // Helper: date locale Africa/Douala (UTC+1) au format YYYY-MM-DD
  const douaaToday = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const douala = new Date(utc + 3600000); // +1h
    return douala.toISOString().slice(0, 10);
  };
  // Helper: format date en YYYY-MM-DD côté Douala à partir d'un Date JS
  const douaaDateStr = (d: Date) => {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const douala = new Date(utc + 3600000);
    return douala.toISOString().slice(0, 10);
  };

  // GET /api/routines — toutes les routines + steps + completions du jour + stats
  app.get("/api/routines", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    try {
      const routines = await storage.getRoutinesWithSteps(userId);
      const today = douaaToday();
      const todayCompletions = await storage.getCompletionsForDate(userId, today);

      // Stats hebdo : 7 derniers jours (côté Douala)
      const startD = new Date();
      startD.setDate(startD.getDate() - 6);
      const startStr = douaaDateStr(startD);
      const weekCompletions = await storage.getCompletionsBetween(userId, startStr, today);

      // Total d'étapes par jour (steps actuelles)
      const totalSteps = routines.reduce((acc, r) => acc + r.steps.length, 0);
      const possibleWeek = totalSteps * 7;
      const weeklyPct = possibleWeek > 0 ? Math.round((weekCompletions.length / possibleWeek) * 100) : 0;

      // Streak : nombre de jours consécutifs où TOUTES les étapes ont été cochées
      let streak = 0;
      if (totalSteps > 0) {
        // On regarde 30 jours en arrière pour le streak
        const olderStart = new Date();
        olderStart.setDate(olderStart.getDate() - 29);
        const olderStartStr = douaaDateStr(olderStart);
        const allCompletions = await storage.getCompletionsBetween(userId, olderStartStr, today);
        const counts = new Map<string, number>();
        allCompletions.forEach((c) => counts.set(c.date, (counts.get(c.date) || 0) + 1));

        // On commence au jour le plus récent qui a des completions, ou aujourd'hui
        let cursor = new Date();
        // Si rien aujourd'hui, on commence à hier (le streak n'est pas cassé tant que la journée n'est pas finie)
        if ((counts.get(today) || 0) < totalSteps) {
          cursor.setDate(cursor.getDate() - 1);
        }
        for (let i = 0; i < 30; i++) {
          const d = douaaDateStr(cursor);
          if ((counts.get(d) || 0) >= totalSteps) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
      }

      res.json({
        routines,
        todayCompletions: todayCompletions.map((c) => c.stepId),
        stats: { streak, weeklyPct, totalSteps, today },
      });
    } catch (e) {
      console.error("GET /api/routines error:", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // PUT /api/routines/:period — créer ou mettre à jour la routine (heure rappel + activé)
  app.put("/api/routines/:period", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const period = req.params.period;
    if (period !== "morning" && period !== "evening") return res.status(400).json({ message: "Période invalide" });

    const { reminderTime, reminderEnabled } = req.body || {};
    // Validation heure HH:MM
    if (reminderTime !== undefined && reminderTime !== null && !/^\d{2}:\d{2}$/.test(reminderTime)) {
      return res.status(400).json({ message: "Format heure invalide (HH:MM)" });
    }

    try {
      const routine = await storage.upsertRoutine(userId, period, {
        ...(reminderTime !== undefined && { reminderTime }),
        ...(reminderEnabled !== undefined && { reminderEnabled }),
      });
      res.json(routine);
    } catch (e) {
      console.error("PUT /api/routines error:", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/routines/:period/steps — ajouter une étape
  app.post("/api/routines/:period/steps", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const period = req.params.period;
    if (period !== "morning" && period !== "evening") return res.status(400).json({ message: "Période invalide" });

    const { kind, label, productId } = req.body || {};
    if (!kind || (kind !== "product" && kind !== "care")) return res.status(400).json({ message: "Kind invalide" });
    if (!label || typeof label !== "string" || label.trim().length === 0) return res.status(400).json({ message: "Label requis" });
    if (label.length > 120) return res.status(400).json({ message: "Label trop long (max 120)" });

    try {
      // garantir que la routine existe
      const routine = await storage.upsertRoutine(userId, period, {});
      const step = await storage.addRoutineStep(routine.id, {
        kind,
        label: label.trim(),
        productId: productId || null,
      });
      res.json(step);
    } catch (e) {
      console.error("POST step error:", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // DELETE /api/routines/steps/:stepId
  app.delete("/api/routines/steps/:stepId", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const stepId = parseInt(req.params.stepId, 10);
    if (isNaN(stepId)) return res.status(400).json({ message: "stepId invalide" });

    try {
      await storage.deleteRoutineStep(stepId, userId);
      res.json({ ok: true });
    } catch (e) {
      console.error("DELETE step error:", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/routines/check — toggle completion pour aujourd'hui
  app.post("/api/routines/check", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const { stepId } = req.body || {};
    if (!stepId || typeof stepId !== "number") return res.status(400).json({ message: "stepId requis" });

    try {
      // vérifier que l'étape appartient au user
      const step = await storage.getRoutineStep(stepId);
      if (!step || step.userId !== userId) return res.status(404).json({ message: "Étape introuvable" });
      const today = douaaToday();
      const result = await storage.toggleCompletion(userId, stepId, today);
      res.json(result);
    } catch (e) {
      console.error("POST check error:", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ══════════════════════════════
  // PARTENAIRES LOCAUX
  // ══════════════════════════════

  // GET /api/partners — liste publique des produits partenaires actifs
  app.get("/api/partners/products", async (_req, res) => {
    try {
      const products = await storage.getAllPartnerProducts();
      res.json(products);
    } catch (e) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/partners — liste admin de tous les partenaires
  app.get("/api/admin/partners", async (req: any, res) => {
    if (!verifyAdminKey(req.headers["x-admin-key"])) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    const all = await storage.getAllPartners();
    const withProducts = await Promise.all(all.map(async (p) => ({
      ...p,
      products: await storage.getProductsByPartner(p.id),
    })));
    res.json(withProducts);
  });

  // POST /api/admin/partners — créer un partenaire
  app.post("/api/admin/partners", async (req: any, res) => {
    if (!verifyAdminKey(req.headers["x-admin-key"])) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    const { name, location, whatsapp, description, category } = req.body;
    if (!name || !location || !whatsapp) return res.status(400).json({ message: "name, location, whatsapp requis" });
    const partner = await storage.createPartner({ name, location, whatsapp, description: description || null, category: category || "parfumerie", active: true });
    res.json(partner);
  });

  // PATCH /api/admin/partners/:id — modifier (active, etc.)
  app.patch("/api/admin/partners/:id", async (req: any, res) => {
    if (!verifyAdminKey(req.headers["x-admin-key"])) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    const id = parseInt(req.params.id);
    const updated = await storage.updatePartner(id, req.body);
    res.json(updated);
  });

  // POST /api/admin/partners/:id/products — ajouter un produit
  app.post("/api/admin/partners/:id/products", async (req: any, res) => {
    if (!verifyAdminKey(req.headers["x-admin-key"])) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    const partnerId = parseInt(req.params.id);
    const { name, category, description, price } = req.body;
    if (!name) return res.status(400).json({ message: "name requis" });
    const product = await storage.createPartnerProduct({ partnerId, name, category: category || "soin", description: description || null, price: price || 0, active: true });
    res.json(product);
  });

  // PATCH /api/admin/partners/products/:id — modifier un produit
  app.patch("/api/admin/partners/products/:id", async (req: any, res) => {
    if (!verifyAdminKey(req.headers["x-admin-key"])) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    const id = parseInt(req.params.id);
    const updated = await storage.updatePartnerProduct(id, req.body);
    res.json(updated);
  });

  // ============== Featured products (Boutique vedette) ==============

  // GET /api/featured-products — liste publique des produits mis en avant sur la home
  app.get("/api/featured-products", async (_req, res) => {
    try {
      const items = await storage.getFeaturedProducts();
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Erreur" });
    }
  });

  // PUT /api/admin/featured-products — remplace la liste (body: { items: [{productId, badge?}] })
  app.put("/api/admin/featured-products", async (req: any, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!verifyAdminKey(adminKey)) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const cleaned = items
      .filter((it: any) => typeof it?.productId === "string" && it.productId.length > 0)
      .slice(0, 12)
      .map((it: any) => ({ productId: it.productId, badge: it.badge ?? null }));
    const saved = await storage.setFeaturedProducts(cleaned);
    res.json(saved);
  });

  // ==================== RGPD ====================
  // Droit d'accès & droit à la portabilité (RGPD art. 15 & 20)
  // Renvoie toutes les données personnelles de l'utilisateur en JSON téléchargeable
  app.get("/api/user/me/export", async (req: any, res) => {
    if (!isAuth(req)) return res.status(401).json({ message: "Unauthorized" });
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const data = await storage.exportUserData(userId);
      const filename = `glowscan-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error("[GDPR export] error:", err);
      res.status(500).json({ message: "Export impossible. Réessaie ou contacte le support." });
    }
  });

  // Droit à l'effacement (RGPD art. 17 — "droit à l'oubli")
  // Supprime définitivement le compte et toutes les données associées.
  // Le client doit confirmer en envoyant { confirm: "SUPPRIMER" } dans le body.
  app.delete("/api/user/me", async (req: any, res) => {
    if (!isAuth(req)) return res.status(401).json({ message: "Unauthorized" });
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const confirm = req.body?.confirm;
    if (confirm !== "SUPPRIMER") {
      return res.status(400).json({
        message: "Confirmation requise. Envoie { confirm: \"SUPPRIMER\" } pour valider la suppression définitive.",
      });
    }
    try {
      await storage.deleteUserAndAllData(userId);
      // Détruit la session pour déconnecter immédiatement
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) console.warn("[GDPR delete] session destroy failed:", err);
          res.clearCookie("connect.sid");
          res.status(200).json({ ok: true, message: "Ton compte et toutes tes données ont été supprimés définitivement." });
        });
      } else {
        res.status(200).json({ ok: true, message: "Compte supprimé." });
      }
    } catch (err: any) {
      console.error("[GDPR delete] error:", err);
      res.status(500).json({ message: "Suppression impossible. Réessaie ou contacte le support." });
    }
  });
// Route pour analyser la photo en Base64 et générer le questionnaire de consultation sur mesure
app.post("/api/generate-consultation", async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: "La photo au format Base64 est requise." });
    }

    // Extraire le mime-type et le raw base64 pour OpenAI
    let imageUrl = base64Image;
    const match = (base64Image as string).match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      imageUrl = `data:${match[1]};base64,${match[2]}`;
    }

    const consultSystemPrompt = `Tu es un dermatologue expert. Analyse visuellement l'image fournie.
Ne donne PAS encore de diagnostic. Génère un questionnaire de 3 questions ultra-personnalisées basé sur ce que tu observes.

Réponds UNIQUEMENT avec ce JSON strict (rien d'autre) :
{
  "observations_visuelles": "Une phrase courte sur ce que tu remarques",
  "questions": [
    {"id": 1, "label": "Question 1"},
    {"id": 2, "label": "Question 2"},
    {"id": 3, "label": "Question 3"}
  ]
}`;
    const consultUserText = "Génère le questionnaire de consultation basé sur cette photo.";
    // Raw base64 pour Gemini (sans le préfixe data:..;base64,)
    const consultMime = match ? match[1] : "image/jpeg";
    const consultB64 = match ? match[2] : base64Image;

    let rawContent = "";
    try {
      if (USE_GEMINI && gemini) {
        const m = gemini.getGenerativeModel({
          model: AI_MODEL,
          systemInstruction: consultSystemPrompt,
        });
        const gemResult = await Promise.race([
          m.generateContent({
            contents: [{ role: "user", parts: [
              { text: consultUserText },
              { inlineData: { mimeType: consultMime, data: consultB64 } },
            ]}],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 600,
              temperature: 0.4,
            },
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000)),
        ]);
        rawContent = gemResult.response.text()?.trim() || "";
      } else if (openai) {
        const response = await openai.chat.completions.create({
          model: AI_MODEL,
          temperature: 0.4,
          ...(AI_IS_REASONING ? {} : { response_format: { type: "json_object" as const } }),
          max_tokens: 600,
          messages: [
            { role: "system", content: consultSystemPrompt },
            { role: "user", content: [
              { type: "text", text: consultUserText },
              { type: "image_url", image_url: { url: imageUrl } }
            ]}
          ]
        }, { timeout: 25000, maxRetries: 0 });
        rawContent = response.choices[0]?.message?.content?.trim() || "";
      }
    } catch (aiErr: any) {
      console.error("[generate-consultation] AI error:", aiErr?.message || aiErr);
      rawContent = "";
    }

    // Si l'IA n'a rien renvoyé ou a refusé → fallback questions génériques
    if (!rawContent || !rawContent.includes("{")) {
      return res.json({
        observations_visuelles: "Je prépare ton diagnostic personnalisé.",
        questions: [
          { id: 1, label: "As-tu des sensibilités ou allergies cutanées connues ?" },
          { id: 2, label: "Décris ta routine de soin actuelle (matin et soir)." },
          { id: 3, label: "As-tu remarqué des changements récents sur ta peau ?" },
        ]
      });
    }

    try {
      const consultationData = JSON.parse(rawContent);
      return res.json(consultationData);
    } catch {
      // JSON invalide → fallback
      return res.json({
        observations_visuelles: "Analyse en cours, quelques questions pour affiner.",
        questions: [
          { id: 1, label: "As-tu des sensibilités ou allergies cutanées connues ?" },
          { id: 2, label: "Décris ta routine de soin actuelle (matin et soir)." },
          { id: 3, label: "As-tu remarqué des changements récents sur ta peau ?" },
        ]
      });
    }

  } catch (error) {
    console.error("[generate-consultation] Erreur inattendue:", error);
    // Ne jamais bloquer l'utilisateur — renvoyer les questions génériques
    return res.json({
      observations_visuelles: "Analyse en cours.",
      questions: [
        { id: 1, label: "As-tu des sensibilités ou allergies cutanées connues ?" },
        { id: 2, label: "Décris ta routine de soin actuelle (matin et soir)." },
        { id: 3, label: "As-tu remarqué des changements récents sur ta peau ?" },
      ]
    });
  }
});

  // ══════════════════════════════════════════════════════════════════════
  // PATCH /api/training/:id/validate — Validation dermatologue d'un record
  // Body: { status, confirmed?, correctedPrimaryCondition?, correctedSeverity?, notes?, validatedBy }
  // ══════════════════════════════════════════════════════════════════════
  app.patch("/api/training/:id/validate", async (req: any, res) => {
    try {
      // Auth requise — dermatologue connecté ou admin
      const userId = req.session?.userId || req.user?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Authentification requise" });
      }

      const id = req.params.id;
      const {
        status,           // DermValidationStatus: 'validated'|'corrected'|'rejected'|'needs_review'
        confirmed,        // boolean — dermato confirme le diagnostic IA
        correctedPrimaryCondition,
        correctedSeverity,
        notes,
        groundTruth,      // objet annoté complet (optionnel)
      } = req.body as {
        status: string;
        confirmed?: boolean;
        correctedPrimaryCondition?: string;
        correctedSeverity?: string;
        notes?: string;
        groundTruth?: Record<string, unknown>;
      };

      if (!status || !["validated", "corrected", "rejected", "needs_review"].includes(status)) {
        return res.status(400).json({ message: "status invalide — valeurs: validated|corrected|rejected|needs_review" });
      }

      // Calcul du training weight selon le statut
      const WEIGHT_MAP: Record<string, number> = {
        pending: 1,
        validated: 2,
        corrected: 3,
        rejected: 0,
        needs_review: 1,
      };

      const updatePayload: Record<string, unknown> = {
        dermValidationStatus: status,
        validatedBy: `doctor_${userId}`,
        validatedAt: new Date(),
        finalStatus: status === "rejected" ? "rejected" : status === "needs_review" ? "needs_review" : "validated",
        trainingWeight: WEIGHT_MAP[status] ?? 1,
        dermatologistLabel: {
          status,
          confirmed: confirmed ?? null,
          correctedPrimaryCondition: correctedPrimaryCondition ?? null,
          correctedSeverity: correctedSeverity ?? null,
          notes: notes ?? null,
        },
      };

      if (groundTruth) {
        updatePayload.groundTruth = groundTruth;
      }
      if (correctedPrimaryCondition) {
        updatePayload.primaryCondition = correctedPrimaryCondition;
      }
      if (correctedSeverity) {
        updatePayload.severity = correctedSeverity;
      }

      const updated = await db
        .update(trainingData)
        .set(updatePayload as any)
        .where(eq(trainingData.id, id))
        .returning({ id: trainingData.id, dermValidationStatus: trainingData.dermValidationStatus, trainingWeight: trainingData.trainingWeight });

      if (!updated.length) {
        return res.status(404).json({ message: "Record training_data introuvable" });
      }

      console.log(`[training] ✅ Validation dermato: record ${id} → ${status} (poids=${WEIGHT_MAP[status]})`);
      return res.json({ success: true, record: updated[0] });
    } catch (err) {
      console.error("[training] ❌ Erreur validation:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/training — liste les records (admin / dermato)
  app.get("/api/training", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.id || (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Authentification requise" });

      const status = (req.query.status as string) || undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      let query = db.select({
        id: trainingData.id,
        scanId: trainingData.scanId,
        mode: trainingData.mode,
        primaryCondition: trainingData.primaryCondition,
        severity: trainingData.severity,
        score: trainingData.score,
        confidence: trainingData.confidence,
        imageQuality: trainingData.imageQuality,
        dermValidationStatus: trainingData.dermValidationStatus,
        trainingWeight: trainingData.trainingWeight,
        finalStatus: trainingData.finalStatus,
        createdAt: trainingData.createdAt,
      }).from(trainingData);

      if (status) {
        // @ts-ignore
        query = query.where(eq(trainingData.dermValidationStatus, status));
      }

      // @ts-ignore
      const records = await query.orderBy(desc(trainingData.createdAt)).limit(limit).offset(offset);
      return res.json({ records, total: records.length });
    } catch (err) {
      console.error("[training] ❌ Erreur liste:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/training/stats — statistiques du dataset pour le dashboard
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/training/stats", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentification requise" });
      if (!(req.session as any)?.isAdmin) return res.status(403).json({ message: "Accès réservé" });

      // Totaux par statut
      const totals = await db
        .select({
          status: trainingData.dermValidationStatus,
          mode: trainingData.mode,
          cnt: count(),
        })
        .from(trainingData)
        .groupBy(trainingData.dermValidationStatus, trainingData.mode);

      // Top 15 conditions (gold uniquement)
      const topConditions = await db
        .select({
          condition: trainingData.primaryCondition,
          cnt: count(),
        })
        .from(trainingData)
        .where(eq(trainingData.dermValidationStatus, "validated"))
        .groupBy(trainingData.primaryCondition)
        .orderBy(desc(count()))
        .limit(15);

      // Évolution hebdomadaire (8 dernières semaines)
      const weekly = await db.execute(sql`
        SELECT
          DATE_TRUNC('week', created_at) AS week,
          COUNT(*) FILTER (WHERE derm_validation_status = 'validated') AS gold,
          COUNT(*) FILTER (WHERE derm_validation_status = 'pending') AS pending,
          COUNT(*) AS total
        FROM training_data
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC
      `);

      // Synthèse
      let totalAll = 0, totalGold = 0, totalPending = 0, totalB2B = 0, totalB2C = 0;
      for (const row of totals) {
        totalAll += Number(row.cnt);
        if (row.status === "validated") totalGold += Number(row.cnt);
        if (row.status === "pending") totalPending += Number(row.cnt);
        if (row.mode === "B2B") totalB2B += Number(row.cnt);
        if (row.mode === "B2C") totalB2C += Number(row.cnt);
      }

      // Répartition par catégorie ICD-10 (depuis annotation JSONB)
      const categoryStats = await db.execute(sql`
        SELECT
          annotation->>'conditionCategory' AS category,
          COUNT(*) FILTER (WHERE derm_validation_status = 'validated') AS gold,
          COUNT(*) AS total
        FROM training_data
        WHERE annotation IS NOT NULL
        GROUP BY annotation->>'conditionCategory'
        ORDER BY gold DESC
      `);

      // Répartition phototype IV / V / VI
      const phototypeStats = await db.execute(sql`
        SELECT
          annotation->>'phototype' AS phototype,
          COUNT(*) AS cnt
        FROM training_data
        WHERE derm_validation_status = 'validated'
          AND annotation->>'phototype' IS NOT NULL
        GROUP BY annotation->>'phototype'
      `);

      // Score moyen annotation (gold)
      const avgScore = await db.execute(sql`
        SELECT AVG((annotation->>'annotationScore')::numeric) AS avg_score
        FROM training_data
        WHERE derm_validation_status = 'validated'
          AND annotation->>'annotationScore' IS NOT NULL
      `);

      res.json({
        total: totalAll,
        gold: totalGold,
        pending: totalPending,
        b2b: totalB2B,
        b2c: totalB2C,
        validationRate: totalAll > 0 ? Math.round((totalGold / totalAll) * 100) : 0,
        topConditions: topConditions
          .filter((c) => c.condition)
          .map((c) => ({ condition: c.condition!, count: Number(c.cnt) })),
        weekly: (weekly.rows || weekly as any[]).map((w: any) => ({
          week: w.week,
          gold: Number(w.gold),
          pending: Number(w.pending),
          total: Number(w.total),
        })),
        categoryBreakdown: (categoryStats.rows || categoryStats as any[]).map((r: any) => ({
          category: r.category || "other",
          gold: Number(r.gold || 0),
          total: Number(r.total || 0),
        })),
        phototypeBreakdown: (phototypeStats.rows || phototypeStats as any[]).map((r: any) => ({
          phototype: r.phototype,
          count: Number(r.cnt),
        })),
        avgAnnotationScore: Math.round(Number((avgScore.rows || avgScore as any[])[0]?.avg_score || 0)),
      });
    } catch (err) {
      console.error("[training/stats] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/training/export  — export JSONL du dataset gold
  // Query: ?format=jsonl (défaut) | ?format=openai  |  ?status=validated (défaut) | all
  // Déclenche un téléchargement de fichier directement.
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/training/export", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentification requise" });
      if (!(req.session as any)?.isAdmin) return res.status(403).json({ message: "Accès réservé" });

      const format = (req.query.format as string) || "jsonl";
      const statusFilter = (req.query.status as string) || "validated";

      // Récupérer tous les records (sans limite — c'est un export)
      let query = db.select().from(trainingData).orderBy(desc(trainingData.createdAt)) as any;
      if (statusFilter !== "all") {
        query = query.where(eq(trainingData.dermValidationStatus, statusFilter));
      }
      const records: TrainingData[] = await query;

      const date = new Date().toISOString().slice(0, 10);
      const filename = `glowscan-dataset-${statusFilter}-${date}.jsonl`;

      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-store");

      // Marquer les records exportés (en background, non-bloquant)
      const ids = records.map((r) => r.id).filter(Boolean);

      if (format === "openai") {
        // Format OpenAI fine-tuning (chat completions)
        const SYSTEM = "Tu es un dermatologue expert spécialisé dans les peaux à fort phototype (Fitzpatrick IV-VI), exerçant en Afrique centrale. Tu analyses des photos de peau et fournis un diagnostic clinique structuré.";
        for (const rec of records) {
          const userContent = [
            rec.primaryCondition ? `Condition détectée : ${rec.primaryCondition}` : "",
            rec.severity ? `Sévérité : ${rec.severity}` : "",
            rec.mode ? `Mode : ${rec.mode}` : "",
            rec.imageQuality ? `Qualité image : ${rec.imageQuality}` : "",
          ].filter(Boolean).join("\n");

          const assistantContent = JSON.stringify(rec.b2bOutput || rec.b2cOutput || rec.aiDiagnosis || { condition: rec.primaryCondition, severity: rec.severity, score: rec.score });

          const line = JSON.stringify({
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userContent || "Analyse cette image de peau." },
              { role: "assistant", content: assistantContent },
            ],
            metadata: {
              id: rec.id,
              mode: rec.mode,
              validation: rec.dermValidationStatus,
              weight: rec.trainingWeight,
              created_at: rec.createdAt,
            },
          });
          res.write(line + "\n");
        }
      } else {
        // Format JSONL standard (un objet par ligne)
        for (const rec of records) {
          const line = JSON.stringify({
            id: rec.id,
            scan_id: rec.scanId,
            mode: rec.mode,
            source: rec.source,
            prompt_version: rec.promptVersion,
            ai_model: rec.aiModelVersion,
            // Clinique
            image_quality: rec.imageQuality,
            skin_phototype: rec.skinPhototype,
            primary_condition: rec.primaryCondition,
            secondary_condition: rec.secondaryCondition,
            severity: rec.severity,
            score: rec.score,
            confidence: rec.confidence,
            skin_state: rec.skinState,
            inflammation_level: rec.inflammationLevel,
            pigmentation_level: rec.pigmentationLevel,
            // Zones
            zones_analysis: rec.zonesAnalysis,
            zones_b2c: rec.zonesB2C,
            // Protocoles
            clinical_protocol: rec.clinicalProtocol,
            morning_protocol: rec.morningProtocol,
            evening_protocol: rec.eveningProtocol,
            // Alertes
            red_flags: rec.redFlags,
            // Sorties IA
            ai_diagnosis: rec.aiDiagnosis,
            b2b_output: rec.b2bOutput,
            b2c_output: rec.b2cOutput,
            clinical_summary: rec.clinicalSummary,
            // Vérité terrain
            ground_truth: rec.groundTruth,
            annotation: rec.annotation,
            dermatologist_label: rec.dermatologistLabel,
            // Validation
            derm_validation_status: rec.dermValidationStatus,
            validated_by: rec.validatedBy,
            validated_at: rec.validatedAt,
            training_weight: rec.trainingWeight,
            final_status: rec.finalStatus,
            // Meta
            is_anonymized: rec.isAnonymized,
            created_at: rec.createdAt,
          });
          res.write(line + "\n");
        }
      }

      res.end();

      // Marquer comme exportés en background
      if (ids.length > 0) {
        setImmediate(async () => {
          try {
            await db.update(trainingData)
              .set({ exportedToDataset: true, exportedAt: new Date() })
              .where(inArray(trainingData.id as any, ids));
          } catch {}
        });
      }
    } catch (err) {
      console.error("[training/export] error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/training/annotate/:scanId — Enrichissement dermato manuel
  // Les dermatologues remplissent le QuickAnnotate widget (30s) dans ProAnalyze
  // en pensant que c'est une formalité clinique — ils construisent GlowScan AI.
  // Body: { phototype, lesionTypes[], zonesAffected[], pihRisk, keloidRisk, notes? }
  // ───────────────────────────────────────────────────────────────────────────
  app.post("/api/training/annotate/:scanId", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentification requise" });

      const scanId = parseInt(req.params.scanId, 10);
      if (isNaN(scanId)) return res.status(400).json({ message: "scanId invalide" });

      const { phototype, lesionTypes, zonesAffected, pihRisk, keloidRisk, notes } = req.body;

      // Récupérer le record existant
      const existing = await db.select().from(trainingData).where(eq(trainingData.scanId, scanId)).limit(1);
      if (existing.length === 0) return res.status(404).json({ message: "Record non trouvé" });

      const rec = existing[0];
      const prevAnnotation = (rec.annotation as any) || {};

      // Fusionner l'enrichissement dermato avec l'annotation existante
      const mergedAnnotation = {
        ...prevAnnotation,
        // Champs enrichis par le dermato
        phototype: phototype || prevAnnotation.phototype,
        lesionTypes: lesionTypes || prevAnnotation.lesionTypes,
        zonesAffected: zonesAffected || prevAnnotation.zonesAffected,
        pihRisk: pihRisk || prevAnnotation.pihRisk,
        keloidRisk: keloidRisk || prevAnnotation.keloidRisk,
        dermatoNotes: notes || prevAnnotation.dermatoNotes,
        dermatoAnnotatedAt: new Date().toISOString(),
        dermatoAnnotatedBy: userId,
        // Recalcul du score avec l'enrichissement
        annotationScore: calcAnnotationScore({
          primaryCondition: rec.primaryCondition,
          secondaryCondition: rec.secondaryCondition,
          severity: rec.severity,
          skinPhototype: phototype || rec.skinPhototype,
          clinicalSummary: rec.clinicalSummary,
          zonesAnalysis: rec.zonesAnalysis,
          clinicalProtocol: rec.clinicalProtocol,
          imageQuality: rec.imageQuality,
          confidence: rec.confidence,
          redFlags: rec.redFlags,
          mode: rec.mode,
          lesionTypes: lesionTypes,
          zonesAffected: zonesAffected,
          pihRisk: pihRisk,
          keloidRisk: keloidRisk,
        }),
      };

      // Le poids n'est renforcé que si le diagnostic a DÉJÀ été validé par un médecin.
      // Sinon (pending), l'annotation d'examen enrichit la donnée mais ne la rend pas gold.
      const isValidated = rec.dermValidationStatus === "validated" || rec.dermValidationStatus === "corrected";
      const nextWeight = isValidated
        ? (mergedAnnotation.annotationScore >= 80 ? 5 : mergedAnnotation.annotationScore >= 60 ? 3 : rec.trainingWeight)
        : rec.trainingWeight;
      await db.update(trainingData)
        .set({
          annotation: mergedAnnotation,
          skinPhototype: phototype || rec.skinPhototype,
          trainingWeight: nextWeight,
        })
        .where(eq(trainingData.scanId, scanId));

      console.log(`[training] 🧬 QuickAnnotate scan #${scanId} — score ${mergedAnnotation.annotationScore}/100 — phototype ${phototype}`);
      res.json({ success: true, annotationScore: mergedAnnotation.annotationScore });
    } catch (err) {
      console.error("[training/annotate] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  return httpServer;
}
