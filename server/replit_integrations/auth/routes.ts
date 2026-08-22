import type { Express, Request, Response, NextFunction } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { storage } from "../../storage";
import { users } from "@shared/models/auth";
import { eq, or, sql } from "drizzle-orm";
import twilio from "twilio";
import { sendEmail, buildResetEmail, buildSecurityAlertEmail, buildB2CWelcomeEmail, buildMagicLinkEmail } from "../../email";
import { is2faEmailEnabled, issueEmailOtp, verifyEmailOtp, verifyBackupCode, generateAndStoreBackupCodes, countBackupCodes, maskEmail as maskEmailAddr, securityAlert } from "../../proRoutes";
import crypto from "crypto";

// Tokens de lien magique B2C (usage unique, 15 min).
const b2cMagicTokens = new Map<string, { userId: string; expiresAt: number }>();

// ── Rate limiter simple en mémoire ───────────────────────────────────────────
// Map<ip, { count, resetAt }>
const _rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function createRateLimiter(maxRequests: number, windowMs: number) {
  // Nettoyage périodique
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _rateLimitStore) {
      if (v.resetAt < now) _rateLimitStore.delete(k);
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim()
      || req.socket?.remoteAddress
      || "unknown";
    const now = Date.now();
    const entry = _rateLimitStore.get(ip);

    if (!entry || entry.resetAt < now) {
      _rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: `Trop de tentatives. Réessaie dans ${retryAfter} secondes.`,
      });
    }
    next();
  };
}

// 10 tentatives par 15 minutes pour login/register/reset
const authLimiter = createRateLimiter(10, 15 * 60 * 1000);

// ── Twilio SMS Client ──────────────────────────────────────────────────────
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// ── Reset tokens en mémoire (expire 15 min) ─────────────────────────────────
// Map<code6digits, { userId, phone, expiresAt }>
const resetTokens = new Map<string, { userId: string; phone: string; expiresAt: number }>();
// Nettoyage toutes les heures
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of resetTokens) {
    if (v.expiresAt < now) resetTokens.delete(k);
  }
}, 60 * 60 * 1000);

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 chiffres
}

async function sendSmsCode(phone: string, code: string): Promise<boolean> {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn("[SMS] ⚠️ Twilio non configuré");
    return false;
  }
  try {
    const message = `🔐 Réinitialisation GlowScan\n\nTon code : ${code}\n\nValide 15 minutes.`;
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone.startsWith("+") ? phone : `+${phone}`,
    });
    console.log(`[SMS] ✅ Code envoyé à ${phone}`);
    return true;
  } catch (err) {
    console.error(`[SMS] ❌ Erreur Twilio:`, err);
    return false;
  }
}

export function registerAuthRoutes(app: Express): void {

  // ── GET /api/auth/user ── Utilisateur connecté (Authentification 100% locale)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // Plus besoin de chercher req.user?.claims?.sub de Replit, on utilise la session locale sécurisée
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ── POST /api/auth/register ── Inscription email/mot de passe
  app.post("/api/auth/register", authLimiter, async (req: any, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?";
    try {
      const { firstName, email, password } = req.body;

      if (!firstName || !email || !password) {
        console.log(`[register] ❌ Champs manquants — ip=${ip}`);
        return res.status(400).json({ message: "Tous les champs sont requis" });
      }

      if (password.length < 6) {
        console.log(`[register] ❌ Mot de passe trop court — email=${email}`);
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      const emailLower = email.toLowerCase().trim();

      const [existing] = await db.select().from(users).where(eq(users.email, emailLower));
      if (existing) {
        console.log(`[register] ⚠️ Email déjà utilisé — email=${emailLower}`);
        return res.status(409).json({ message: "Cet email est déjà utilisé. Connecte-toi plutôt !" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [user] = await db.insert(users).values({
        email: emailLower,
        firstName: firstName.trim(),
        passwordHash,
      }).returning();

      console.log(`[register] ✅ Nouveau compte créé — id=${user.id} email=${emailLower}`);

      // Email de bienvenue (best-effort, ne bloque pas l'inscription).
      try {
        const w = buildB2CWelcomeEmail(user.firstName || "");
        sendEmail(emailLower, w.subject, w.html, w.text).catch(() => {});
      } catch {}

      const previousSessionId = req.session?.id;
      req.session.userId = user.id;
      req.session.save(async (err: any) => {
        if (err) {
          console.error(`[register] ❌ Session save error pour userId=${user.id}:`, err);
          return res.status(500).json({ message: "Erreur lors de la connexion" });
        }
        console.log(`[register] ✅ Session créée pour userId=${user.id}`);
        
        // Rattacher tous les scans anonymes de cette session au nouveau compte
        try {
          if (previousSessionId) {
            await storage.linkAnonymousScansToUser(previousSessionId, user.id);
          }
        } catch (linkErr) {
          console.error(`[register] ⚠️ Backfill scans anonymes échoué (non bloquant):`, linkErr);
        }
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName } });
      });
    } catch (error) {
      console.error(`[register] ❌ Erreur inattendue — ip=${ip}:`, error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  // ── POST /api/auth/login ── Connexion email/mot de passe
  app.post("/api/auth/login", authLimiter, async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
      }

      const emailLower = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, emailLower));

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      // 2FA OPTIONNELLE côté B2C : seulement si l'utilisateur l'a activée.
      // (L'analyse anonyme reste totalement libre, sans compte ni 2FA.)
      if (await is2faEmailEnabled(user.id)) {
        (req.session as any).pending2faUserId = user.id;
        const otp = await issueEmailOtp(user.id, user.email, user.firstName);
        return req.session.save(() => {
          res.json({ requires2fa: true, method: "email", emailSent: otp.ok, emailHint: maskEmailAddr(user.email), devFallback: otp.provider === "dev" });
        });
      }

      const previousSessionId = req.session?.id;
      req.session.userId = user.id;
      req.session.save(async (err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Erreur lors de la connexion" });
        }
        
        // Rattacher tous les scans anonymes de cette session au compte
        try {
          if (previousSessionId) {
            await storage.linkAnonymousScansToUser(previousSessionId, user.id);
          }
        } catch (linkErr) {
          console.error(`[login] ⚠️ Backfill scans anonymes échoué (non bloquant):`, linkErr);
        }
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName } });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  // ── 2FA email B2C (OPTIONNELLE) : vérification à la connexion ──
  app.post("/api/auth/login/2fa", authLimiter, async (req: any, res) => {
    try {
      const pendingId = (req.session as any)?.pending2faUserId;
      if (!pendingId) return res.status(440).json({ message: "Session de connexion expirée. Reconnecte-toi." });
      const raw = String(req.body?.code || "");
      const digits = raw.replace(/\D/g, "");
      let ok = false;
      if (digits.length === 6) {
        const v = await verifyEmailOtp(pendingId, digits);
        ok = v.ok;
        if (!ok && v.reason === "locked") return res.status(429).json({ message: "Trop de tentatives — demande un nouveau code." });
      }
      if (!ok) ok = await verifyBackupCode(pendingId, raw);
      if (!ok) return res.status(401).json({ message: "Code incorrect ou expiré." });

      const [user] = await db.select().from(users).where(eq(users.id, pendingId));
      if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
      const previousSessionId = req.session?.id;
      delete (req.session as any).pending2faUserId;
      req.session.userId = user.id;
      req.session.save(async (err: any) => {
        if (err) return res.status(500).json({ message: "Erreur session" });
        try { if (previousSessionId) await storage.linkAnonymousScansToUser(previousSessionId, user.id); } catch {}
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName } });
      });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/auth/login/2fa/resend", authLimiter, async (req: any, res) => {
    try {
      const pendingId = (req.session as any)?.pending2faUserId;
      if (!pendingId) return res.status(440).json({ message: "Session expirée." });
      const [user] = await db.select().from(users).where(eq(users.id, pendingId));
      if (!user) return res.status(401).json({ message: "Introuvable" });
      const otp = await issueEmailOtp(user.id, user.email, user.firstName);
      res.json({ success: true, emailSent: otp.ok, emailHint: maskEmailAddr(user.email), devFallback: otp.provider === "dev" });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  // Statut + activation/désactivation (utilisateur connecté)
  app.get("/api/auth/2fa/status", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non connecté" });
    res.json({ enabled: await is2faEmailEnabled(userId), backupCodesRemaining: await countBackupCodes(userId) });
  });

  app.post("/api/auth/2fa/email/request", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non connecté" });
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.email || user.email.endsWith("@phone.glowscan.cm")) return res.status(400).json({ message: "Un email valide est requis pour la 2FA" });
      const otp = await issueEmailOtp(user.id, user.email, user.firstName);
      res.json({ success: true, emailSent: otp.ok, emailHint: maskEmailAddr(user.email), devFallback: otp.provider === "dev" });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.post("/api/auth/2fa/email/confirm", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non connecté" });
      const code = String(req.body?.code || "").replace(/\D/g, "");
      const v = await verifyEmailOtp(userId, code);
      if (!v.ok) return res.status(v.reason === "locked" ? 429 : 401).json({ message: v.reason === "expired" ? "Code expiré" : "Code incorrect" });
      await db.execute(sql`UPDATE "users" SET "twofa_email_enabled" = TRUE WHERE "id" = ${userId}`);
      securityAlert(userId, "twofa_changed", "La vérification en 2 étapes a été activée sur votre compte GlowScan.");
      let backupCodes: string[] = [];
      try { if ((await countBackupCodes(userId)) === 0) backupCodes = await generateAndStoreBackupCodes(userId); } catch {}
      res.json({ success: true, enabled: true, backupCodes });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.post("/api/auth/2fa/email/disable", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non connecté" });
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const password = String(req.body?.password || "");
      if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Mot de passe incorrect" });
      await db.execute(sql`UPDATE "users" SET "twofa_email_enabled" = FALSE, "twofa_code_hash" = NULL, "twofa_code_expires" = NULL, "twofa_attempts" = 0 WHERE "id" = ${userId}`);
      securityAlert(userId, "twofa_changed", "La vérification en 2 étapes a été désactivée sur votre compte GlowScan.");
      res.json({ success: true, enabled: false });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.post("/api/auth/2fa/backup-codes/generate", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non connecté" });
      const codes = await generateAndStoreBackupCodes(userId);
      res.json({ success: true, codes });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  // Lien magique B2C (connexion sans mot de passe)
  app.post("/api/auth/login/magic/request", authLimiter, async (req: any, res) => {
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      if (email.includes("@")) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (user) {
          const token = crypto.randomBytes(24).toString("hex");
          b2cMagicTokens.set(token, { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });
          const base = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
          const m = buildMagicLinkEmail(user.firstName || "", `${base}/magic?token=${token}`);
          await sendEmail(email, m.subject, m.html, m.text);
        }
      }
      res.json({ success: true, sent: true });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.post("/api/auth/login/magic/consume", async (req: any, res) => {
    try {
      const token = String(req.body?.token || "");
      const entry = b2cMagicTokens.get(token);
      if (!entry || entry.expiresAt < Date.now()) { b2cMagicTokens.delete(token); return res.status(400).json({ message: "Lien invalide ou expiré." }); }
      b2cMagicTokens.delete(token);
      const [user] = await db.select().from(users).where(eq(users.id, entry.userId));
      if (!user) return res.status(401).json({ message: "Introuvable" });
      const previousSessionId = req.session?.id;
      req.session.userId = user.id;
      req.session.save(async (err: any) => {
        if (err) return res.status(500).json({ message: "Erreur session" });
        try { if (previousSessionId) await storage.linkAnonymousScansToUser(previousSessionId, user.id); } catch {}
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName } });
      });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  // ── POST /api/auth/forgot-password ─────────────────────────────────────────
  // Body: { contact } — email ou numéro de téléphone
  // Envoie automatiquement un SMS via Twilio
  app.post("/api/auth/forgot-password", authLimiter, async (req: any, res) => {
    try {
      const { contact } = req.body;
      if (!contact?.trim()) {
        return res.status(400).json({ message: "Email ou numéro requis" });
      }

      const trimmed = contact.trim();
      const isPhone = !trimmed.includes("@");

      // Construire l'email stocké en base
      const emailInDb = isPhone
        ? `tel-${trimmed.replace(/\D/g, "")}@phone.glowscan.cm`
        : trimmed.toLowerCase();

      const [user] = await db.select().from(users).where(eq(users.email, emailInDb));

      if (!user) {
        // Ne pas révéler si le compte existe — générer un code fake quand même
        const fakeCode = generateCode();
        return res.json({
          sent: true,
          maskedContact: isPhone ? maskPhone(trimmed) : maskEmail(trimmed),
          viaSms: false,
          code: fakeCode, // Code fake pour la sécurité (user inexistant)
        });
      }

      // Générer code 6 chiffres, valide 15 min
      const code = generateCode();
      const phone = isPhone ? trimmed.replace(/\D/g, "") : null;

      // Canal : téléphone → SMS ; email → email (Resend).
      let smsSent = false, emailSent = false;
      if (phone) {
        smsSent = await sendSmsCode(`+${phone}`, code);
      } else {
        const { subject, html, text } = buildResetEmail(code, (user as any).firstName);
        const r = await sendEmail(emailInDb, subject, html, text);
        emailSent = r.ok;
      }

      // Stocker le token (usage unique, 15 min)
      resetTokens.set(code, {
        userId: user.id,
        phone: phone || "",
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      const maskedContact = isPhone ? maskPhone(trimmed) : maskEmail(emailInDb);
      res.json({
        sent: true,
        maskedContact,
        viaSms: smsSent,
        viaEmail: emailSent,
        // 🔒 SÉCURITÉ : on ne renvoie JAMAIS le code si un canal réel a envoyé.
        // Fallback dev uniquement (ni SMS ni email configuré) → code affiché.
        code: (!smsSent && !emailSent) ? code : undefined,
      });
    } catch (err) {
      console.error("[forgot-pwd] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── POST /api/auth/reset-password ───────────────────────────────────────────
  // Body: { code, newPassword }
  app.post("/api/auth/reset-password", authLimiter, async (req: any, res) => {
    try {
      const { code, newPassword } = req.body;
      if (!code || !newPassword) {
        return res.status(400).json({ message: "Code et nouveau mot de passe requis" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Mot de passe : 6 caractères minimum" });
      }

      const entry = resetTokens.get(String(code).trim());
      if (!entry) {
        return res.status(400).json({ message: "Code invalide ou expiré. Demande un nouveau code." });
      }
      if (entry.expiresAt < Date.now()) {
        resetTokens.delete(code);
        return res.status(400).json({ message: "Code expiré (15 min). Demande un nouveau code." });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ passwordHash }).where(eq(users.id, entry.userId));
      resetTokens.delete(code); // usage unique

      // 🔒 Invalider TOUTES les sessions de l'utilisateur : quiconque avait un accès
      // (session volée, appareil oublié) est déconnecté. connect-pg-simple stocke le
      // userId dans sessions.sess->>'userId'.
      try {
        await db.execute(sql`DELETE FROM "sessions" WHERE "sess"->>'userId' = ${entry.userId}`);
      } catch (e) { console.warn("[reset-pwd] purge sessions:", (e as any)?.message); }

      // 🔔 Exploiter l'email : alerte de sécurité "mot de passe changé" (best-effort).
      try {
        const [u] = await db.select().from(users).where(eq(users.id, entry.userId));
        if (u?.email && !u.email.endsWith("@phone.glowscan.cm")) {
          const { subject, html, text } = buildSecurityAlertEmail("password_changed", (u as any).firstName);
          sendEmail(u.email, subject, html, text).catch(() => {});
        }
      } catch {}

      console.log(`[reset-pwd] ✅ Mot de passe réinitialisé pour userId=${entry.userId}`);
      res.json({ success: true });
    } catch (err) {
      console.error("[reset-pwd] error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── POST /api/auth/logout ── Déconnexion
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}

// ── Helpers masquage ───────────────────────────────────────────────────────
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••••";
  return digits.slice(0, 3) + "•".repeat(digits.length - 5) + digits.slice(-2);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local.length < 3) return "••••@••••";
  return local[0] + "•".repeat(Math.max(1, local.length - 2)) + local.slice(-1) + "@" + domain;
}
