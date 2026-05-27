import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

// 1. Configuration et exportation de la session PostgreSQL (Inchangé, c'est parfait pour Railway)
export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 jours
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.GLOWSCAN_DB || process.env.SUPABASE_URL || process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

// 2. Initialisation simplifiée de l'authentification au démarrage du serveur
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Les routes d'API génériques
  app.get("/api/login", (req, res) => {
    res.redirect("/login"); // Redirige vers ta page de connexion locale
  });

  app.get("/api/logout", (req: any, res) => {
    req.session?.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
}

// 3. Le Middleware de sécurité : Il vérifie uniquement si l'utilisateur est connecté localement
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.session?.userId) {
    // On s'assure que req.user est peuplé pour la compatibilité avec le reste de ton code
    req.user = req.user || { claims: { sub: req.session.userId } };
    return next();
  }

  // Si aucune session locale n'est trouvée, c'est un refus immédiat
  return res.status(401).json({ message: "Unauthorized" });
};
