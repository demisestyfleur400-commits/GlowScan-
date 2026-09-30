import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount } from "./proRoutes";
import { sendSmsText } from "./whatsapp";
import { transcribeAudio } from "./transcribe";

// ════════════════════════════════════════════════════════════════════════
// Discussion dermatologue ↔ relais par cas (étape 11, ADDENDUM §2, écran R5).
// Texte, photo, vocal (60 s, transcrit automatiquement), demande structurée
// (délai du cas en pause tant qu'elle est ouverte). SMS de secours après
// 15 min sans lecture, réponse par SMS avec le code #B-<id>. Aucune donnée
// patient dans les SMS. Fil ouvert jusqu'à 7 jours après l'avis.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
export const caseCode = (id: number) => `#B-${id}`;
const OPEN_DAYS_AFTER_ANSWER = 7;
const VOICE_MAX_S = 60;
export const CASE_REQUESTS = ["1 photo de près", "Photo avec une pièce pour l'échelle", "Fièvre ?", "Ça gratte ?", "Depuis quand ?"];

async function caseFor(caseId: number, proId: number) {
  const c = Rows(await db.execute(sql`
    SELECT c.id, c.relay_id, c.derm_id, c.status, c.answered_at, c.due_at, c.paused_at, c.tier,
           r.full_name AS relay_name, r.phone AS relay_phone, d.full_name AS derm_name, d.country AS derm_country
    FROM relay_cases c JOIN pro_accounts r ON r.id = c.relay_id LEFT JOIN pro_accounts d ON d.id = c.derm_id
    WHERE c.id = ${caseId}`))[0];
  if (!c) return null;
  const role = c.relay_id === proId ? "relay" : c.derm_id === proId ? "derm" : null;
  return role ? { ...c, role: role as "relay" | "derm" } : null;
}
const isOpen = (c: any) => !c.answered_at || new Date(c.answered_at).getTime() + OPEN_DAYS_AFTER_ANSWER * 86400000 > Date.now();

async function cleanPhoto(dataUrl: string): Promise<string | null> {
  const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(dataUrl || "");
  if (!m) return null;
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp(Buffer.from(m[1], "base64")).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch { return null; }
}

/** Demande ouverte fermée par la réponse du relais : l'échéance est reportée de la durée de la pause. */
async function resumeIfPaused(caseId: number) {
  await db.execute(sql`UPDATE case_messages SET resolved_at = NOW() WHERE case_id = ${caseId} AND kind = 'request' AND resolved_at IS NULL`);
  await db.execute(sql`
    UPDATE relay_cases SET due_at = due_at + (NOW() - paused_at), paused_at = NULL
    WHERE id = ${caseId} AND paused_at IS NOT NULL`);
}

async function insertMessage(m: { caseId: number; authorId: number; role: "derm" | "relay"; kind: string; body?: string | null; media?: string | null; mediaType?: string | null; durationS?: number | null; viaSms?: boolean }) {
  return Rows(await db.execute(sql`
    INSERT INTO case_messages (case_id, author_id, author_role, kind, body, media_url, media_type, duration_s, via_sms)
    VALUES (${m.caseId}, ${m.authorId}, ${m.role}, ${m.kind}, ${m.body ?? null}, ${m.media ?? null}, ${m.mediaType ?? null}, ${m.durationS ?? null}, ${m.viaSms ?? false})
    RETURNING id`))[0];
}

export function registerCaseThreadRoutes(app: Express) {
  const pro = [requireActivePro, (req: any, res: any, next: any) => (req.isSecretary ? res.status(403).json({ message: "Réservé au médecin et au relais." }) : next())];

  // Non lus par cas, pour les badges (relais : ses cas ; dermatologue : ses cas assignés).
  app.get("/api/case-threads/unread", ...pro, async (req: any, res) => {
    const me = req.proAccount.id;
    const rows = Rows(await db.execute(sql`
      SELECT c.id, COUNT(m.id)::int AS n FROM relay_cases c
      JOIN case_messages m ON m.case_id = c.id
      WHERE (c.relay_id = ${me} AND m.author_role = 'derm' AND m.created_at > COALESCE(c.relay_seen_at, 'epoch'))
         OR (c.derm_id = ${me} AND m.author_role = 'relay' AND m.created_at > COALESCE(c.derm_seen_at, 'epoch'))
      GROUP BY c.id`));
    res.json({ unread: Object.fromEntries(rows.map((r: any) => [r.id, r.n])) });
  });

  app.get("/api/relay/cases/:id/messages", ...pro, async (req: any, res) => {
    try {
      const c = await caseFor(Number(req.params.id), req.proAccount.id);
      if (!c) return res.status(404).json({ message: "Cas introuvable" });
      const rows = Rows(await db.execute(sql`
        SELECT id, author_role, kind, body, media_type, duration_s, transcript, via_sms, sms_delivered_at, resolved_at, created_at,
               (media_url IS NOT NULL) AS has_media
        FROM case_messages WHERE case_id = ${c.id} ORDER BY created_at ASC LIMIT 500`));
      if (c.role === "relay") await db.execute(sql`UPDATE relay_cases SET relay_seen_at = NOW() WHERE id = ${c.id}`);
      else await db.execute(sql`UPDATE relay_cases SET derm_seen_at = NOW() WHERE id = ${c.id}`);
      res.json({
        case: {
          id: c.id, code: caseCode(c.id), role: c.role, open: isOpen(c), paused: !!c.paused_at, dueAt: c.due_at,
          closesAt: c.answered_at ? new Date(new Date(c.answered_at).getTime() + OPEN_DAYS_AFTER_ANSWER * 86400000).toISOString() : null,
          other: c.role === "relay" ? { name: c.derm_name, country: c.derm_country } : { name: c.relay_name, country: null },
        },
        requests: CASE_REQUESTS,
        messages: rows.map((m: any) => ({
          id: m.id, mine: m.author_role === c.role, role: m.author_role, kind: m.kind, body: m.body, mediaType: m.media_type,
          media: m.has_media ? `/api/case-media/${m.id}` : null, durationS: m.duration_s, transcript: m.transcript,
          viaSms: m.via_sms, smsSent: !!m.sms_delivered_at, resolved: !!m.resolved_at, at: m.created_at,
        })),
      });
    } catch (e) {
      console.error("[case messages]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/relay/cases/:id/messages", ...pro, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const c = await caseFor(Number(req.params.id), me);
      if (!c) return res.status(404).json({ message: "Cas introuvable" });
      if (!isOpen(c)) return res.status(409).json({ message: "Discussion fermée : elle reste ouverte 7 jours après l'avis." });
      const d = z.object({
        kind: z.enum(["text", "photo", "voice", "request"]),
        body: z.string().trim().max(1500).optional().default(""),
        media: z.string().max(9_000_000).optional().nullable(),
        durationS: z.number().int().min(1).max(VOICE_MAX_S + 2).optional().nullable(),
      }).parse(req.body);
      if (d.kind === "request" && c.role !== "derm") return res.status(403).json({ message: "Seul le dermatologue envoie une demande." });
      if ((d.kind === "text" || d.kind === "request") && !d.body) return res.status(400).json({ message: "Message vide." });

      let media: string | null = null, mediaType: string | null = null, audio: Buffer | null = null;
      if (d.kind === "photo") {
        media = await cleanPhoto(d.media || "");
        if (!media) return res.status(400).json({ message: "Photo illisible." });
        mediaType = "image/jpeg";
      }
      if (d.kind === "voice") {
        const m = /^data:(audio\/[a-z0-9.+-]+)(;[^,]*)?;base64,(.+)$/i.exec(d.media || "");
        if (!m) return res.status(400).json({ message: "Vocal illisible." });
        audio = Buffer.from(m[3], "base64");
        if (audio.length < 800) return res.status(400).json({ message: "Vocal trop court." });
        media = d.media!; mediaType = m[1].toLowerCase();
      }
      const row = await insertMessage({ caseId: c.id, authorId: me, role: c.role, kind: d.kind, body: d.body || null, media, mediaType, durationS: d.durationS ?? null });

      if (d.kind === "request" && c.status === "awaiting_review") {
        await db.execute(sql`UPDATE relay_cases SET paused_at = COALESCE(paused_at, NOW()) WHERE id = ${c.id}`);
      }
      if (c.role === "relay") await resumeIfPaused(c.id);

      // Transcription en arrière-plan : le vocal est déjà écoutable.
      if (audio) transcribeAudio(audio, mediaType!).then((t) => { if (t) db.execute(sql`UPDATE case_messages SET transcript = ${t} WHERE id = ${row.id}`).catch(() => {}); });

      const other = c.role === "relay" ? c.derm_id : c.relay_id;
      if (other) notifyProAccount(Number(other), {
        title: c.role === "relay" ? `Réponse du relais · cas ${caseCode(c.id)}` : `${d.kind === "request" ? "Demande" : "Message"} du dermatologue · cas ${caseCode(c.id)}`,
        body: d.kind === "voice" ? "Message vocal" : d.kind === "photo" ? "Photo" : (d.body || "").slice(0, 110),
        url: c.role === "relay" ? "/derm/reseau" : "/derm/relais",
      }).catch(() => {});
      res.json({ id: row.id });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Message invalide." });
      console.error("[case message post]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Média privé (photo, vocal) : seulement pour le relais et le dermatologue du cas.
  app.get("/api/case-media/:id", ...pro, async (req: any, res) => {
    const m = Rows(await db.execute(sql`SELECT case_id, media_url FROM case_messages WHERE id = ${Number(req.params.id)}`))[0];
    if (!m || !(await caseFor(Number(m.case_id), req.proAccount.id))) return res.status(404).send("Introuvable");
    const x = /^data:([a-z0-9.+/-]+)(;[^,]*)?;base64,(.+)$/i.exec(m.media_url || "");
    if (!x) return res.status(404).send("Introuvable");
    res.setHeader("Content-Type", x[1]);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(x[3], "base64"));
  });

  // ── Réponse du relais par SMS (« #B-118 … ») ──────────────────────────
  // Console Twilio, numéro SMS : « A message comes in » → POST {PUBLIC_BASE_URL}/api/sms/twilio/inbound
  app.post("/api/sms/twilio/inbound", async (req: any, res) => {
    const twiml = (msg?: string) => res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response>${msg ? `<Message>${msg.replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[ch]!))}</Message>` : ""}</Response>`);
    try {
      const token = process.env.TWILIO_AUTH_TOKEN;
      const base = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
      const twilioLib = (await import("twilio")).default as any;
      if (!token || !twilioLib.validateRequest(token, String(req.headers["x-twilio-signature"] || ""), `${base}/api/sms/twilio/inbound`, req.body || {})) {
        return res.status(403).send("Signature invalide");
      }
      const from = String(req.body?.From || "").replace(/\D/g, "");
      const body = String(req.body?.Body || "").trim();
      const m = /#?\s*B\s*-?\s*(\d{1,9})\b[\s:.,-]*([\s\S]*)$/i.exec(body);
      if (!m) return twiml("GlowScan : commencez votre réponse par le code du cas, par exemple #B-118.");
      const relay = Rows(await db.execute(sql`SELECT id FROM pro_accounts WHERE profile = 'relay' AND phone = ${from}`))[0];
      const c = relay ? await caseFor(Number(m[1]), Number(relay.id)) : null;
      if (!c || c.role !== "relay") return twiml("GlowScan : code de cas inconnu pour ce numéro.");
      if (!isOpen(c)) return twiml("GlowScan : cette discussion est fermée.");
      const text = m[2].trim().slice(0, 1500);
      if (!text) return twiml();
      await insertMessage({ caseId: c.id, authorId: Number(relay.id), role: "relay", kind: "text", body: text, viaSms: true });
      await resumeIfPaused(c.id);
      await db.execute(sql`UPDATE relay_cases SET relay_seen_at = NOW() WHERE id = ${c.id}`);
      if (c.derm_id) notifyProAccount(Number(c.derm_id), { title: `Réponse du relais (SMS) · cas ${caseCode(c.id)}`, body: text.slice(0, 110), url: "/derm/reseau" }).catch(() => {});
      return twiml();
    } catch (e) {
      console.error("[sms-inbound]", e);
      return twiml();
    }
  });
}

// ── Cron : SMS de secours après 15 min sans lecture par le relais ───────
export async function runCaseSmsFallback(): Promise<number> {
  const rows = Rows(await db.execute(sql`
    SELECT m.id, m.case_id, m.kind, m.body, r.phone
    FROM case_messages m JOIN relay_cases c ON c.id = m.case_id JOIN pro_accounts r ON r.id = c.relay_id
    WHERE m.author_role = 'derm' AND m.sms_delivered_at IS NULL AND m.via_sms = FALSE
      AND m.created_at < NOW() - INTERVAL '15 minutes' AND m.created_at > NOW() - INTERVAL '2 days'
      AND (c.relay_seen_at IS NULL OR c.relay_seen_at < m.created_at)
    ORDER BY m.created_at ASC LIMIT 100`));
  let sent = 0;
  for (const m of rows) {
    if (!m.phone) continue;
    const what = m.kind === "voice" ? "Message vocal du dermatologue, à écouter dans l'appli." : m.kind === "photo" ? "Photo du dermatologue, à voir dans l'appli." : String(m.body || "").slice(0, 300);
    const r = await sendSmsText(`+${String(m.phone).replace(/\D/g, "")}`, `GlowScan ${caseCode(m.case_id)} : ${what} Répondez par SMS en commençant par ${caseCode(m.case_id)}.`);
    // Nouvelle tentative au passage suivant si l'envoi échoue (pendant 2 jours au plus).
    if (r.ok) { await db.execute(sql`UPDATE case_messages SET sms_delivered_at = NOW() WHERE id = ${m.id}`); sent++; }
  }
  return sent;
}
