import type { Express } from "express";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireProAccess } from "./proRoutes";
import { reportPayloadSchema } from "@shared/report";
import { sendWhatsAppText } from "./whatsapp";
import { loadFollowups } from "./dermFollowups";
import { streamWithFallback, geminiReady } from "./glowAssistant";

// ════════════════════════════════════════════════════════════════════════
// Espace médical D6 : Votre activité (chiffres du mois, courbe hebdomadaire,
// pathologies, patients à suivre, export) et Auto-évaluation (bilan
// hebdomadaire, avis patients, atelier de recherche, assistant d'apprentissage).
// Chiffres réels uniquement. L'assistant ne reçoit que des agrégats et des avis
// sans identité.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const iso = (v: any) => (v ? new Date(v).toISOString() : null);
const doctorOnly = (req: any, res: any, next: any) => (req.isSecretary ? res.status(403).json({ message: "Réservé au médecin." }) : next());
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");

export const PATHOS = ["Acné", "Troubles pigmentaires", "Eczéma", "Psoriasis", "Autres"] as const;
export function pathologyOf(dx: string | null | undefined): (typeof PATHOS)[number] {
  const s = String(dx || "").toLowerCase();
  if (/acn|com[ée]don|r[ée]tention|papulo-?pustul/.test(s)) return "Acné";
  if (/m[ée]lasma|tache|pigment|vitiligo|dyschrom|chloasma/.test(s)) return "Troubles pigmentaires";
  if (/ecz[ée]ma|atopi|dermatite de contact|dermite/.test(s)) return "Eczéma";
  if (/psoria/.test(s)) return "Psoriasis";
  return "Autres";
}

const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const monthRange = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return { from: new Date(Date.UTC(y, mo - 1, 1)), to: new Date(Date.UTC(y, mo, 1)) };
};
const mondayOf = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };

type Visit = { key: string; day: string; dx: string | null; online: boolean };

/** Consultations d'une période : analyses et comptes rendus au cabinet + consultations en ligne, une par patient et par jour. */
async function visits(proId: number, from: Date, to: Date): Promise<Visit[]> {
  const f = from.toISOString(), t = to.toISOString();
  const scans = Rows(await db.execute(sql`
    SELECT s.patient_id, s.created_at, COALESCE(s.expert_corrected_condition, s.condition) AS dx FROM scans s JOIN patients p ON p.id = s.patient_id
    WHERE p.dermatologist_id = ${proId} AND s.created_at >= ${f} AND s.created_at < ${t}`));
  const reps = Rows(await db.execute(sql`
    SELECT patient_id, created_at, payload FROM consult_reports WHERE pro_account_id = ${proId} AND source = 'visit' AND patient_id IS NOT NULL AND created_at >= ${f} AND created_at < ${t}`));
  const online = Rows(await db.execute(sql`
    SELECT user_id, COALESCE(closed_at, created_at) AS at, condition FROM consultations
    WHERE pro_account_id = ${proId} AND payment_status = 'paid' AND COALESCE(closed_at, created_at) >= ${f} AND COALESCE(closed_at, created_at) < ${t}`));
  const map = new Map<string, Visit>();
  for (const s of scans) { const v = { key: `p${s.patient_id}`, day: ymd(new Date(s.created_at)), dx: s.dx || null, online: false }; map.set(`${v.key}|${v.day}`, v); }
  for (const r of reps) {
    const q = reportPayloadSchema.parse(r.payload || {});
    const v = { key: `p${r.patient_id}`, day: ymd(new Date(r.created_at)), dx: q.conclusion || q.diagnosis || null, online: false };
    const k = `${v.key}|${v.day}`; map.set(k, { ...v, dx: v.dx || map.get(k)?.dx || null });
  }
  for (const o of online) { const v = { key: `u${o.user_id}`, day: ymd(new Date(o.at)), dx: o.condition || null, online: true }; map.set(`${v.key}|${v.day}`, v); }
  return Array.from(map.values());
}

async function monthStats(proId: number, month: string) {
  const { from, to } = monthRange(month);
  const pf = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1));
  const [cur, prev] = await Promise.all([visits(proId, from, to), visits(proId, pf, from)]);
  const patients = new Set(cur.map((v) => v.key)).size, prevPatients = new Set(prev.map((v) => v.key)).size;
  const newPatients = Number(Rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM patients WHERE dermatologist_id = ${proId} AND created_at >= ${from.toISOString()} AND created_at < ${to.toISOString()}`))[0]?.n) || 0;
  const suiviVisits = Number(Rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM appointments WHERE dermatologue_id = ${proId} AND type = 'suivi' AND status = 'done' AND appointment_date >= ${from.toISOString()} AND appointment_date < ${to.toISOString()}`))[0]?.n) || 0;
  // Semaines (du lundi) qui touchent le mois.
  const weeks: { start: string; label: string; patients: number }[] = [];
  for (let w = mondayOf(from); w < to; w = new Date(w.getTime() + 7 * 86400000)) {
    const end = new Date(w.getTime() + 7 * 86400000);
    const lo = w < from ? from : w, hi = end > to ? to : end;
    const inW = cur.filter((v) => v.day >= ymd(lo) && v.day < ymd(hi));
    const fmt = (d: Date) => d.getUTCDate().toString().padStart(2, "0");
    const last = new Date(hi.getTime() - 86400000);
    weeks.push({ start: ymd(w), label: `${fmt(lo)}–${fmt(last)} ${last.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}`, patients: new Set(inW.map((v) => v.key)).size });
  }
  const counts: Record<string, number> = Object.fromEntries(PATHOS.map((p) => [p, 0]));
  for (const v of cur) counts[pathologyOf(v.dx)]++;
  return {
    month, from: ymd(from), patients, prevPatients, newPatients, consultations: cur.length, prevConsultations: prev.length, suiviVisits,
    online: cur.filter((v) => v.online).length, weeks, pathologies: PATHOS.map((p) => ({ name: p, count: counts[p] })),
  };
}

async function reviewsOfMonth(proId: number, month: string) {
  const { from, to } = monthRange(month);
  const weeks: string[] = [];
  for (let w = mondayOf(from); w < to; w = new Date(w.getTime() + 7 * 86400000)) if (w >= from || new Date(w.getTime() + 3 * 86400000) >= from) weeks.push(ymd(w));
  const done = Rows(await db.execute(sql`SELECT week_start FROM derm_weekly_reviews WHERE pro_account_id = ${proId} AND done_at IS NOT NULL AND week_start >= ${weeks[0]}::date AND week_start <= ${weeks[weeks.length - 1]}::date`));
  return { total: weeks.length, done: done.length, weeks };
}

export function registerDermActivityRoutes(app: Express) {
  // ── Votre activité ──────────────────────────────────────────────────────
  app.get("/api/derm/activity", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? String(req.query.month) : new Date().toISOString().slice(0, 7);
      const stats = await monthStats(me, month);
      const fu = await loadFollowups(me);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const obs = Rows(await db.execute(sql`
        SELECT DISTINCT ON (patient_id) patient_id, evolution, created_at FROM derm_followup_events
        WHERE pro_account_id = ${me} AND kind = 'obs' ORDER BY patient_id, created_at DESC`));
      const lastObs = new Map(obs.map((o) => [Number(o.patient_id), o]));
      const toFollow = fu.slice(0, 8).map((x) => {
        const o = lastObs.get(x.id);
        const evo = o?.evolution || "";
        return {
          id: x.id, dx: x.dx, lastVisit: x.lastVisit, due: x.due,
          suivi: /aggrav|confirmer/i.test(evo) || x.status !== "plan" ? "À revoir" : /amélior/i.test(evo) ? "En amélioration" : /stable/i.test(evo) ? "Stabilisé" : "À revoir",
          retour: o && iso(o.created_at)! >= weekAgo ? "Ajouté" : "À compléter",
        };
      });
      const toReview = fu.filter((x) => x.status !== "plan").length;
      const reviews = await reviewsOfMonth(me, month);
      const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); return d.toISOString().slice(0, 7); });
      res.json({
        ...stats, toReview, toComplete: toFollow.filter((x) => x.retour === "À compléter").length, followupsTotal: fu.length, toFollow, reviews, months,
        currentWeek: ymd(mondayOf(new Date())),
      });
    } catch (e) {
      console.error("[derm activity]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Export CSV anonymisé (mois ; pathologie ; consultations), séparateur ; et BOM UTF-8.
  app.get("/api/derm/activity/export", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? String(req.query.month) : new Date().toISOString().slice(0, 7);
      const s = await monthStats(req.proAccount.id, month);
      const lines = ["mois;pathologie;consultations", ...s.pathologies.map((p) => `${month};${p.name};${p.count}`), `${month};Total;${s.consultations}`,
        "", "mois;indicateur;valeur", `${month};patients suivis;${s.patients}`, `${month};nouveaux patients;${s.newPatients}`, `${month};consultations en ligne;${s.online}`, `${month};visites de suivi;${s.suiviVisits}`,
        ...s.weeks.map((w) => `${month};patients semaine ${w.label};${w.patients}`)];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="bilan-activite-${month}.csv"`);
      res.send("﻿" + lines.join("\r\n"));
    } catch (e) {
      console.error("[derm activity export]", e);
      res.status(500).send("Erreur serveur");
    }
  });

  // ── Bilan hebdomadaire ──────────────────────────────────────────────────
  app.get("/api/derm/reviews", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const week = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.week || "")) ? String(req.query.week) : ymd(mondayOf(new Date()));
      const ws = mondayOf(new Date(`${week}T00:00:00Z`)), we = new Date(ws.getTime() + 7 * 86400000);
      const r = Rows(await db.execute(sql`SELECT * FROM derm_weekly_reviews WHERE pro_account_id = ${me} AND week_start = ${ymd(ws)}::date`))[0];
      const v = await visits(me, ws, we);
      const fu = await loadFollowups(me);
      const obsWeek = Rows(await db.execute(sql`SELECT DISTINCT patient_id FROM derm_followup_events WHERE pro_account_id = ${me} AND kind = 'obs' AND created_at >= ${ws.toISOString()} AND created_at < ${we.toISOString()}`)).map((x) => Number(x.patient_id));
      const history = Rows(await db.execute(sql`SELECT week_start, done_at FROM derm_weekly_reviews WHERE pro_account_id = ${me} ORDER BY week_start DESC LIMIT 12`));
      res.json({
        weekStart: ymd(ws),
        review: r ? { scores: r.scores || [], good: r.good || "", goal: r.goal || "", retours: r.retours || [], doneAt: iso(r.done_at), updatedAt: iso(r.updated_at) } : null,
        stats: { patients: new Set(v.map((x) => x.key)).size, consultations: v.length, toReview: fu.filter((x) => x.status !== "plan").length, toComplete: fu.filter((x) => !obsWeek.includes(x.id)).length },
        patients: fu.map((x) => ({ id: x.id, dx: x.dx })),
        history: history.map((h) => ({ weekStart: ymd(new Date(h.week_start)), done: !!h.done_at })),
      });
    } catch (e) {
      console.error("[derm reviews]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.put("/api/derm/reviews", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id, b = req.body || {};
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.weekStart || ""))) return res.status(400).json({ message: "Semaine invalide." });
      const scores = (Array.isArray(b.scores) ? b.scores : []).slice(0, 3).map((n: any) => Math.max(1, Math.min(5, Number(n) || 3)));
      const retours = (Array.isArray(b.retours) ? b.retours : []).slice(0, 30).map((r: any) => ({ patientId: Number(r.patientId) || null, evolution: String(r.evolution || "").slice(0, 60), obs: String(r.obs || "").trim().slice(0, 2000) }));
      const prev = Rows(await db.execute(sql`SELECT done_at FROM derm_weekly_reviews WHERE pro_account_id = ${me} AND week_start = ${b.weekStart}::date`))[0];
      const finishing = !!b.done && !prev?.done_at;
      await db.execute(sql`
        INSERT INTO derm_weekly_reviews (pro_account_id, week_start, scores, good, goal, retours, done_at, updated_at)
        VALUES (${me}, ${b.weekStart}::date, ${sql.raw(`ARRAY[${scores.join(",")}]::smallint[]`)}, ${String(b.good || "").slice(0, 2000)}, ${String(b.goal || "").slice(0, 2000)}, ${JSON.stringify(retours)}::jsonb, ${b.done ? sql`NOW()` : sql`NULL`}, NOW())
        ON CONFLICT (pro_account_id, week_start) DO UPDATE SET scores = EXCLUDED.scores, good = EXCLUDED.good, goal = EXCLUDED.goal, retours = EXCLUDED.retours,
          done_at = COALESCE(derm_weekly_reviews.done_at, EXCLUDED.done_at), updated_at = NOW()`);
      // Bilan terminé : chaque retour rejoint la fiche de suivi du patient.
      if (finishing) {
        for (const r of retours.filter((x: any) => x.patientId && (x.obs || x.evolution))) {
          const own = Rows(await db.execute(sql`SELECT id FROM patients WHERE id = ${r.patientId} AND dermatologist_id = ${me}`))[0];
          if (own) await db.execute(sql`INSERT INTO derm_followup_events (patient_id, pro_account_id, kind, body, evolution) VALUES (${r.patientId}, ${me}, 'obs', ${r.obs || null}, ${r.evolution || null})`);
        }
      }
      res.json({ ok: true, done: !!b.done || !!prev?.done_at });
    } catch (e) {
      console.error("[derm reviews save]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Synthèse pour « Mon apprentissage ».
  app.get("/api/derm/learning", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const month = new Date().toISOString().slice(0, 7);
      const last = Rows(await db.execute(sql`SELECT * FROM derm_weekly_reviews WHERE pro_account_id = ${me} ORDER BY (done_at IS NULL), week_start DESC LIMIT 1`))[0];
      const fb = await feedbackOf(me);
      const s = await monthStats(me, month);
      const reviews = await reviewsOfMonth(me, month);
      const goals = String(last?.goal || "").split(/\n|(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean).slice(0, 4);
      res.json({
        rating: fb.avg, ratingCount: fb.items.length, invitations: fb.invitations, reviews,
        last: last ? { weekStart: ymd(new Date(last.week_start)), scores: last.scores || [], done: !!last.done_at, goal: last.goal || "", good: last.good || "" } : null,
        goals, month: { patients: s.patients, consultations: s.consultations, toReview: (await loadFollowups(me)).filter((x) => x.status !== "plan").length },
        feedback: fb.items.slice(0, 5),
      });
    } catch (e) {
      console.error("[derm learning]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Avis patients ───────────────────────────────────────────────────────
  async function feedbackOf(me: number) {
    const online = Rows(await db.execute(sql`SELECT rating, rating_comment, rated_at FROM consultations WHERE pro_account_id = ${me} AND rating IS NOT NULL ORDER BY rated_at DESC LIMIT 100`));
    const cab = Rows(await db.execute(sql`SELECT rating, comment, answered_at FROM derm_patient_feedback WHERE pro_account_id = ${me} AND rating IS NOT NULL ORDER BY answered_at DESC LIMIT 100`));
    const invitations = Number(Rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM derm_patient_feedback WHERE pro_account_id = ${me} AND sent_at IS NOT NULL`))[0]?.n) || 0;
    const items = [
      ...online.map((r) => ({ rating: Number(r.rating), comment: r.rating_comment || null, at: iso(r.rated_at), source: "En ligne" })),
      ...cab.map((r) => ({ rating: Number(r.rating), comment: r.comment || null, at: iso(r.answered_at), source: "Cabinet" })),
    ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    const avg = items.length ? Math.round((items.reduce((s, x) => s + x.rating, 0) / items.length) * 10) / 10 : null;
    return { items, avg, invitations };
  }

  app.get("/api/derm/feedback", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const fb = await feedbackOf(req.proAccount.id);
      const candidates = Rows(await db.execute(sql`
        SELECT p.id, p.first_name, p.last_name, p.whatsapp_number,
          (SELECT MAX(f.created_at) FROM derm_patient_feedback f WHERE f.patient_id = p.id) AS invited_at
        FROM patients p WHERE p.dermatologist_id = ${req.proAccount.id} AND p.archived_at IS NULL AND p.whatsapp_number IS NOT NULL
        ORDER BY COALESCE(p.last_scan_at, p.created_at) DESC LIMIT 30`));
      res.json({ ...fb, candidates: candidates.map((c) => ({ id: Number(c.id), name: `${c.first_name} ${c.last_name}`, invitedAt: iso(c.invited_at) })) });
    } catch (e) {
      console.error("[derm feedback]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/derm/feedback/invite", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const pid = Number(req.body?.patientId);
      const p = Rows(await db.execute(sql`SELECT first_name, whatsapp_number FROM patients WHERE id = ${pid} AND dermatologist_id = ${req.proAccount.id}`))[0];
      if (!p) return res.status(404).json({ message: "Patient introuvable" });
      if (!p.whatsapp_number) return res.status(400).json({ message: "Pas de numéro WhatsApp dans la fiche." });
      const token = crypto.randomBytes(16).toString("base64url");
      await db.execute(sql`INSERT INTO derm_patient_feedback (pro_account_id, patient_id, token) VALUES (${req.proAccount.id}, ${pid}, ${token})`);
      const dr = `Dr ${String(req.proAccount.fullName || "").replace(/^(dr|pr)\.?\s*/i, "")}`;
      const url = `${BASE}/avis/${token}`;
      const msg = `Bonjour ${p.first_name},\n\n${dr} aimerait connaître votre avis sur votre consultation. Cela prend une minute et reste anonyme :\n${url}\n\nMerci,\nGlowScan`;
      const r = await sendWhatsAppText(p.whatsapp_number, msg);
      if (r.ok) await db.execute(sql`UPDATE derm_patient_feedback SET sent_at = NOW() WHERE token = ${token}`);
      res.json({ sent: r.ok, url });
    } catch (e) {
      console.error("[derm feedback invite]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Page publique d'avis (sans compte) : /avis/:token.
  app.get("/api/avis/:token", async (req: any, res) => {
    const r = Rows(await db.execute(sql`
      SELECT f.rating, f.answered_at, p.full_name, p.cabinet_name FROM derm_patient_feedback f JOIN pro_accounts p ON p.id = f.pro_account_id WHERE f.token = ${String(req.params.token)}`))[0];
    if (!r) return res.status(404).json({ message: "Lien invalide." });
    res.json({ doctor: `Dr ${String(r.full_name || "").replace(/^(dr|pr)\.?\s*/i, "")}`, cabinet: r.cabinet_name || null, answered: !!r.answered_at });
  });
  app.post("/api/avis/:token", async (req: any, res) => {
    const rating = Math.round(Number(req.body?.rating));
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: "Choisissez une note de 1 à 5." });
    const comment = String(req.body?.comment || "").trim().slice(0, 1000) || null;
    const r = Rows(await db.execute(sql`
      UPDATE derm_patient_feedback SET rating = ${rating}, comment = ${comment}, answered_at = NOW()
      WHERE token = ${String(req.params.token)} AND answered_at IS NULL AND created_at > NOW() - INTERVAL '60 days' RETURNING id`));
    if (!r.length) return res.status(409).json({ message: "Ce lien a déjà servi ou a expiré." });
    res.json({ ok: true });
  });

  // ── Atelier « Recherche & mémoires » ────────────────────────────────────
  app.get("/api/derm/research", requireProAccess, doctorOnly, async (req: any, res) => {
    const r = Rows(await db.execute(sql`SELECT title, sections, library, updated_at FROM derm_research_docs WHERE pro_account_id = ${req.proAccount.id}`))[0];
    res.json(r ? { title: r.title, sections: r.sections || [], library: r.library || [], updatedAt: iso(r.updated_at) } : { title: "", sections: [], library: [], updatedAt: null });
  });
  app.put("/api/derm/research", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const b = req.body || {};
      const sections = (Array.isArray(b.sections) ? b.sections : []).slice(0, 40).map((s: any) => ({ t: String(s?.t || "").slice(0, 200), b: String(s?.b || "").slice(0, 20000) }));
      const library = (Array.isArray(b.library) ? b.library : []).slice(0, 200).map((c: any) => ({ id: String(c?.id || "").slice(0, 20), title: String(c?.title || "").slice(0, 500), meta: String(c?.meta || "").slice(0, 300), url: String(c?.url || "").slice(0, 300) }));
      await db.execute(sql`
        INSERT INTO derm_research_docs (pro_account_id, title, sections, library, updated_at)
        VALUES (${req.proAccount.id}, ${String(b.title || "").slice(0, 300)}, ${JSON.stringify(sections)}::jsonb, ${JSON.stringify(library)}::jsonb, NOW())
        ON CONFLICT (pro_account_id) DO UPDATE SET title = EXCLUDED.title, sections = EXCLUDED.sections, library = EXCLUDED.library, updated_at = NOW()`);
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (e) {
      console.error("[derm research save]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Assistant d'apprentissage (Gemini, flux SSE) ────────────────────────
  const LEARN_SYSTEM = `Tu es Glowscan Assistant, le partenaire d'apprentissage d'un dermatologue exerçant en Afrique subsaharienne (patients de phototypes IV à VI). Tu l'aides à progresser dans sa pratique : relire son bilan hebdomadaire, tirer des leçons des avis de ses patients, préparer des fiches de conseils, se former, et mener des travaux de recherche (question PICO, mots-clés PubMed/MeSH, plan de mémoire, méthode de recueil anonymisé, rédaction).
Règles : tu ne reçois que des chiffres agrégés et des avis sans identité ; ne demande jamais de données identifiantes. Ne fabrique jamais de références : si tu cites une publication, précise qu'elle est à vérifier sur PubMed, et préfère proposer des mots-clés et des équations de recherche. Tu ne poses pas de diagnostic sur un patient réel.
Style : français clair, vouvoiement, concret et bref (5 à 12 lignes), listes avec « - » ou numérotées, **gras** pour les points clés. Pas d'émoji, pas de titre, pas de formule de politesse finale.`;

  app.post("/api/pro/glow/learn", requireProAccess, doctorOnly, async (req: any, res) => {
    if (!geminiReady()) return res.status(503).json({ message: "Assistant indisponible : clé Gemini absente." });
    const b = req.body || {};
    const question = String(b.question || "").trim().slice(0, 1500);
    if (!question) return res.status(400).json({ message: "Question vide." });
    const mode = ["learn", "avis", "research"].includes(b.mode) ? b.mode : "learn";
    const me = req.proAccount.id;
    let ctx = "";
    try {
      const month = new Date().toISOString().slice(0, 7);
      const s = await monthStats(me, month);
      const last = Rows(await db.execute(sql`SELECT scores, good, goal FROM derm_weekly_reviews WHERE pro_account_id = ${me} ORDER BY week_start DESC LIMIT 1`))[0];
      const fb = await feedbackOf(me);
      ctx = [
        `Mois en cours : ${s.patients} patients, ${s.consultations} consultations ; pathologies : ${s.pathologies.filter((p) => p.count).map((p) => `${p.name} ${p.count}`).join(", ") || "non documentées"}.`,
        last ? `Dernier bilan (1 à 5) : confiance clinique ${last.scores?.[0] ?? "?"}, qualité du suivi ${last.scores?.[1] ?? "?"}, clarté des conseils ${last.scores?.[2] ?? "?"}. Ce qui a marché : ${last.good || "—"}. Objectif : ${last.goal || "—"}.` : "Aucun bilan hebdomadaire encore rempli.",
        fb.items.length ? `Note moyenne des patients : ${fb.avg}/5 sur ${fb.items.length} avis. Avis récents (anonymes) : ${fb.items.filter((x) => x.comment).slice(0, 6).map((x) => `« ${String(x.comment).slice(0, 200)} » (${x.rating}/5)`).join(" ; ") || "sans commentaire"}.` : "Aucun avis patient pour l'instant.",
        mode === "research" && b.doc ? `Document de recherche en cours : « ${String(b.doc.title || "").slice(0, 200)} » ; sections : ${(Array.isArray(b.doc.sections) ? b.doc.sections : []).map((x: any) => String(x?.t || "")).slice(0, 12).join(", ")}.` : "",
      ].filter(Boolean).join("\n");
    } catch {}
    const history = Array.isArray(b.history) ? b.history.slice(-12).map((m: any) => ({ role: m?.role === "ai" ? "model" : "user", parts: [{ text: String(m?.text || "").slice(0, 2500) }] })).filter((m: any) => m.parts[0].text) : [];
    const contents = [
      { role: "user", parts: [{ text: `Contexte (${mode === "research" ? "recherche scientifique" : mode === "avis" ? "avis patients anonymisés" : "bilan et avis agrégés"}) :\n${ctx}` }] },
      { role: "model", parts: [{ text: "Contexte lu. Je vous accompagne." }] },
      ...history, { role: "user", parts: [{ text: question }] },
    ];
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const send = (o: unknown) => res.write(`data: ${JSON.stringify(o)}\n\n`);
    try { const out = await streamWithFallback(contents, (t) => send({ t }), { search: false, system: LEARN_SYSTEM }); send({ done: true, source: out.source }); }
    catch (e: any) { console.error("[glow learn]", e?.message); send({ error: "L'assistant ne répond pas pour le moment. Réessayez dans une minute." }); }
    res.end();
  });
}
