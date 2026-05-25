import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth"; // Conserve l'import, notre nouveau middleware épuré
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { storage } from "../../storage";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

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
  app.post("/api/auth/register", async (req: any, res) => {
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
  app.post("/api/auth/login", async (req: any, res) => {
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
