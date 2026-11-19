import type { Express } from "express";
import crypto from "crypto";
import { sql, eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";

// ════════════════════════════════════════════════════════════════════════
// « Continuer avec Google » (OAuth 2.0 / OpenID Connect, sans dépendance).
// Activé seulement si GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont définis
// (sinon le bouton reste masqué). URI de redirection à déclarer chez Google :
//   {PUBLIC_BASE_URL}/api/auth/google/callback
// Google vérifie lui-même l'adresse (email_verified) : pas de code email en plus.
//   - Patient : compte créé ou retrouvé, connexion directe.
//   - Derm : médecin déjà inscrit → connexion ; sinon → inscription préremplie,
//     sans mot de passe à créer (session.googleVerifiedEmail).
// ════════════════════════════════════════════════════════════════════════

const enabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const base = () => (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
const redirectUri = () => `${base()}/api/auth/google/callback`;
const safeNext = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/api") ? p : null);
const Rows = (r: any) => (r?.rows ?? r ?? []) as any[];

export function registerGoogleAuth(app: Express) {
  app.get("/api/auth/google/enabled", (_req, res) => res.json({ enabled: enabled() }));

  app.get("/api/auth/google/start", (req: any, res) => {
    const target = req.query.for === "derm" ? "derm" : "patient";
    const fail = target === "derm" ? "/derm/connexion?google=indisponible" : "/auth?google=indisponible";
    if (!enabled()) return res.redirect(fail);
    const state = crypto.randomBytes(24).toString("hex");
    req.session.googleOAuth = { state, target, next: safeNext(req.query.next), at: Date.now() };
    const prevSession = req.session.id;
    req.session.googlePrevSession = prevSession; // rattachement des analyses anonymes
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    req.session.save(() => res.redirect(url.toString()));
  });

  app.get("/api/auth/google/callback", async (req: any, res) => {
    const o = req.session?.googleOAuth;
    const target: "derm" | "patient" = o?.target === "derm" ? "derm" : "patient";
    const failTo = (why: string) => res.redirect(target === "derm" ? `/derm/connexion?google=${why}` : `/auth?google=${why}`);
    try {
      if (!enabled() || !o || typeof req.query.state !== "string" || req.query.state !== o.state || Date.now() - o.at > 10 * 60 * 1000) return failTo("expire");
      delete req.session.googleOAuth;
      if (typeof req.query.code !== "string") return failTo("annule");

      // Code → jeton, puis identité (côté serveur, jamais exposé au navigateur).
      const tok = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(), grant_type: "authorization_code" }),
      }).then((r) => r.json()).catch(() => null);
      if (!tok?.access_token) return failTo("erreur");
      const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json()).catch(() => null);
      const email = String(info?.email || "").toLowerCase().trim();
      if (!email || info?.email_verified !== true) return failTo("email");
      const firstName = String(info?.given_name || "").slice(0, 80);
      const lastName = String(info?.family_name || "").slice(0, 80);

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      const markVerified = (id: string) => db.execute(sql`UPDATE users SET email_verified = TRUE WHERE id = ${id}`).catch(() => {});
      const open = (userId: string, to: string) => {
        const prev = req.session.googlePrevSession;
        delete req.session.googlePrevSession;
        req.session.userId = userId;
        req.session.save(async () => {
          try { if (prev) await storage.linkAnonymousScansToUser(prev, userId); } catch {}
          res.redirect(to);
        });
      };

      if (target === "derm") {
        if (existing) {
          const acc = Rows(await db.execute(sql`SELECT id, profile FROM pro_accounts WHERE user_id = ${existing.id} LIMIT 1`))[0];
          if (acc || existing.role === "secretary") {
            await markVerified(existing.id);
            const home = existing.role === "secretary" ? "/derm/accueil" : acc?.profile === "relay" ? "/derm/relais" : acc?.profile === "ngo" ? "/derm/pilotage" : "/derm/dashboard";
            return open(existing.id, o.next && o.next.startsWith("/derm") ? o.next : home);
          }
        }
        // Pas encore d'espace Derm : inscription préremplie, sans mot de passe à créer.
        req.session.googleVerifiedEmail = email;
        req.session.googleProfile = { email, firstName, lastName };
        return req.session.save(() => res.redirect("/derm/inscription?google=1"));
      }

      // Patient
      if (existing) { await markVerified(existing.id); return open(existing.id, o.next || "/"); }
      const [u] = await db.insert(users).values({ email, firstName: firstName || email.split("@")[0], lastName: lastName || null, role: "patient" } as any).returning();
      await markVerified(u.id);
      return open(u.id, o.next || "/");
    } catch (e) {
      console.error("[google] callback:", (e as any)?.message);
      return failTo("erreur");
    }
  });

  // Inscription Derm après Google : nom et email à préremplir.
  app.get("/api/auth/google/pending", (req: any, res) => {
    const p = req.session?.googleProfile;
    res.json(p && req.session?.googleVerifiedEmail === p.email ? p : null);
  });
}
