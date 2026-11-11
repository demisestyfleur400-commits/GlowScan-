import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

// ════════════════════════════════════════════════════════════════════════
// Appli patient B4 — « Mon évolution » : bilan du jour (migration 0039).
// Le patient note le confort de sa peau (1 à 5) et, s'il le souhaite, une
// phrase. Un bilan par jour (heure du Cameroun) : un nouveau remplace l'ancien.
// La page reçoit aussi ses Glow Scores et la régularité de sa routine.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
/** Date du jour à Douala (UTC+1), AAAA-MM-JJ. */
const doualaDay = (offsetDays = 0) => new Date(Date.now() + 3600000 - offsetDays * 86400000).toISOString().slice(0, 10);
const iso = (d: any) => (d ? new Date(d).toISOString() : null);

export function registerSkinJournalRoutes(app: Express) {
  // Journal sur une période (7, 30 ou 90 jours) + Glow Scores + routine de la semaine.
  app.get("/api/journal", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    try {
      const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
      const from = doualaDay(days - 1);
      const entries = Rows(await db.execute(sql`
        SELECT to_char(day, 'YYYY-MM-DD') AS day, comfort, note, updated_at
        FROM skin_journal WHERE user_id = ${userId} AND day >= ${from}::date ORDER BY day ASC`));
      const total = Number(Rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM skin_journal WHERE user_id = ${userId}`))[0]?.n || 0);
      const last = Rows(await db.execute(sql`
        SELECT to_char(day, 'YYYY-MM-DD') AS day, comfort, note, updated_at FROM skin_journal
        WHERE user_id = ${userId} ORDER BY day DESC LIMIT 1`))[0] || null;
      // Glow Scores utilisables sur la période (photo inexploitable = score nul, exclu).
      const scores = Rows(await db.execute(sql`
        SELECT to_char((created_at + INTERVAL '1 hour')::date, 'YYYY-MM-DD') AS day, score
        FROM scans WHERE user_id = ${userId} AND score IS NOT NULL AND score > 0
          AND (created_at + INTERVAL '1 hour')::date >= ${from}::date ORDER BY created_at ASC`));
      // Routine : jours de la semaine (7 derniers jours) où au moins un geste a été coché.
      const routineDays = Number(Rows(await db.execute(sql`
        SELECT COUNT(DISTINCT date)::int AS n FROM routine_completions
        WHERE user_id = ${userId} AND date >= ${doualaDay(6)}`))[0]?.n || 0);
      res.json({
        days, from, today: doualaDay(),
        entries: entries.map((e: any) => ({ day: e.day, comfort: Number(e.comfort), note: e.note || null, updatedAt: iso(e.updated_at) })),
        last: last ? { day: last.day, comfort: Number(last.comfort), note: last.note || null, updatedAt: iso(last.updated_at) } : null,
        total, scores: scores.map((s: any) => ({ day: s.day, score: Number(s.score) })), routineDays,
      });
    } catch (e) {
      console.error("[journal get]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Bilan du jour : crée ou remplace celui d'aujourd'hui.
  app.post("/api/journal", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const comfort = Math.round(Number(req.body?.comfort));
    if (!(comfort >= 1 && comfort <= 5)) return res.status(400).json({ message: "Choisissez une note de 1 à 5." });
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 280) || null : null;
    try {
      const day = doualaDay();
      const r = Rows(await db.execute(sql`
        INSERT INTO skin_journal (user_id, day, comfort, note) VALUES (${userId}, ${day}::date, ${comfort}, ${note})
        ON CONFLICT (user_id, day) DO UPDATE SET comfort = EXCLUDED.comfort, note = EXCLUDED.note, updated_at = NOW()
        RETURNING to_char(day, 'YYYY-MM-DD') AS day, comfort, note, updated_at`))[0];
      res.json({ entry: { day: r.day, comfort: Number(r.comfort), note: r.note || null, updatedAt: iso(r.updated_at) } });
    } catch (e) {
      console.error("[journal post]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
}
