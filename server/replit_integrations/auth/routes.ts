import type { Express, Request, Response, NextFunction } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { storage } from "../../storage";
import { users } from "@shared/models/auth";
import { eq, or } from "drizzle-orm";
import twilio from "twilio";

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

      // Essayer d'envoyer le SMS
      let smsSent = false;
      if (phone) {
        smsSent = await sendSmsCode(`+${phone}`, code);
      }

      if (smsSent || !phone) {
        // Si SMS envoyé OU pas de téléphone, stocker le token pour réinitialisation
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
          // Dev/fallback: retourner le code si Twilio n'est pas utilisé
          code: !smsSent ? code : undefined,
        });
      } else {
        // SMS échoué et pas d'email fallback
        res.status(500).json({ message: "Impossible d'envoyer le SMS. Réessaie plus tard." });
      }
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
