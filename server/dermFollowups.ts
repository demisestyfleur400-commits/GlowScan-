import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireProAccess } from "./proRoutes";
import { sendWhatsAppText } from "./whatsapp";
import { followupsStoppedAt } from "./consents";
import { normalizeCmPhone } from "@shared/phone";
import { buildControlRelanceMessage, withFollowupFooter } from "@shared/whatsappMessages";
import { reportPayloadSchema, reportRef } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Espace médical D4 : Agenda (déplacer un rendez-vous) et Suivis (liste,
// fiche individuelle, observations, relances, clôture). Un suivi = un patient
// avec un prochain contrôle (next_control_at, sinon l'ancien follow_up_at).
// Statut : aujourd'hui · à relancer (contrôle dépassé sans visite depuis) ·
// planifié. Heure de référence : Douala (UTC+1, sans heure d'été).
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const iso = (v: any) => (v ? new Date(v).toISOString() : null);
const TZ = "Africa/Douala";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // AAAA-MM-JJ
const doctorOnly = (req: any, res: any, next: any) => (req.isSecretary ? res.status(403).json({ message: "Réservé au médecin." }) : next());
const MAX_ATT = 5 * 1024 * 1024;

/** Crée (ou retrouve) le rendez-vous de contrôle « Suivi » d'un patient, à 9 h ; décale de 30 min si le créneau est pris. */
export async function scheduleControl(proId: number, patientId: number, dateYmd: string, opts: { time?: string; reason?: string; createdBy?: string } = {}) {
  const p = Rows(await db.execute(sql`SELECT first_name, last_name, whatsapp_number, email FROM patients WHERE id = ${patientId} AND dermatologist_id = ${proId}`))[0];
  if (!p) throw new Error("NOT_FOUND");
  const [hh, mm] = (opts.time && /^\d{2}:\d{2}$/.test(opts.time) ? opts.time : "09:00").split(":").map(Number);
  let when = new Date(`${dateYmd}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+01:00`);
  if (isNaN(when.getTime())) throw new Error("BAD_DATE");
  for (let i = 0; i < 16; i++) {
    const clash = Rows(await db.execute(sql`
      SELECT id FROM appointments WHERE dermatologue_id = ${proId} AND status <> 'cancelled'
        AND appointment_date BETWEEN ${new Date(when.getTime() - 29 * 60000).toISOString()} AND ${new Date(when.getTime() + 29 * 60000).toISOString()} LIMIT 1`));
    if (!clash.length) break;
    when = new Date(when.getTime() + 30 * 60000);
  }
  const existing = Rows(await db.execute(sql`
    SELECT id FROM appointments WHERE dermatologue_id = ${proId} AND patient_record_id = ${patientId} AND type = 'suivi'
      AND status IN ('scheduled', 'confirmed') AND appointment_date > NOW() LIMIT 1`))[0];
  if (existing) {
    await db.execute(sql`UPDATE appointments SET appointment_date = ${when.toISOString()}, status = 'scheduled', reminder_j1_sent_at = NULL, reminder_h2_sent = false WHERE id = ${existing.id}`);
  } else {
    await db.execute(sql`
      INSERT INTO appointments (dermatologue_id, patient_name, patient_contact, patient_email, appointment_date, duration_minutes, type, priority, notes, patient_record_id, created_by)
      VALUES (${proId}, ${`${p.first_name} ${p.last_name}`.trim().slice(0, 100)}, ${p.whatsapp_number || null}, ${p.email || null}, ${when.toISOString()}, 30, 'suivi', 'normal',
              ${opts.reason ? `Contrôle · ${opts.reason}`.slice(0, 1000) : "Contrôle"}, ${patientId}, ${opts.createdBy || "doctor"})`);
  }
  await db.execute(sql`UPDATE patients SET next_control_at = ${when.toISOString()}, followup_closed_at = NULL,
    followup_reason = COALESCE(${opts.reason || null}, followup_reason), status = CASE WHEN COALESCE(status, 'green') = 'red' THEN status ELSE 'yellow' END WHERE id = ${patientId}`);
  return when.toISOString();
}

/** Enregistre un message WhatsApp libre d'un patient suivi (fil « dernier message du patient »). */
export async function recordPatientMessage(phoneRaw: string, body: string) {
  const phone = normalizeCmPhone(phoneRaw);
  const text = String(body || "").trim().slice(0, 1000);
  if (!phone || !text) return;
  const rows = Rows(await db.execute(sql`
    SELECT id, dermatologist_id, whatsapp_number FROM patients
    WHERE (next_control_at IS NOT NULL OR follow_up_at IS NOT NULL) AND followup_closed_at IS NULL AND whatsapp_number IS NOT NULL LIMIT 2000`));
  for (const r of rows.filter((x) => normalizeCmPhone(x.whatsapp_number) === phone)) {
    await db.execute(sql`INSERT INTO derm_followup_events (patient_id, pro_account_id, kind, body) VALUES (${r.id}, ${r.dermatologist_id}, 'patient_msg', ${text})`);
  }
}

type Fu = { id: number; firstName: string; lastName: string; phone: string | null; reason: string | null; dx: string | null; due: string; lastVisit: string | null;
  status: "today" | "late" | "plan"; lateDays: number; apptStatus: string | null; relancedAt: string | null; lastMsg: string | null };

export async function loadFollowups(proId: number): Promise<Fu[]> {
  const rows = Rows(await db.execute(sql`
    SELECT p.id, p.first_name, p.last_name, p.whatsapp_number, p.followup_reason, p.created_at, p.last_scan_at,
      COALESCE(p.next_control_at, p.follow_up_at) AS due,
      (SELECT COALESCE(s.expert_corrected_condition, s.condition) FROM scans s WHERE s.patient_id = p.id ORDER BY s.created_at DESC LIMIT 1) AS scan_dx,
      (SELECT cr.payload FROM consult_reports cr WHERE cr.patient_id = p.id AND cr.signed_at IS NOT NULL ORDER BY cr.signed_at DESC LIMIT 1) AS last_signed,
      (SELECT MAX(cr.created_at) FROM consult_reports cr WHERE cr.patient_id = p.id) AS report_at,
      (SELECT a.status FROM appointments a WHERE a.patient_record_id = p.id AND a.type = 'suivi' AND a.status <> 'cancelled' ORDER BY a.appointment_date DESC LIMIT 1) AS appt_status,
      (SELECT MAX(e.created_at) FROM derm_followup_events e WHERE e.patient_id = p.id AND e.kind = 'relance') AS relanced_at,
      (SELECT e.body FROM derm_followup_events e WHERE e.patient_id = p.id AND e.kind = 'patient_msg' ORDER BY e.created_at DESC LIMIT 1) AS last_msg
    FROM patients p
    WHERE p.dermatologist_id = ${proId} AND p.archived_at IS NULL AND p.followup_closed_at IS NULL
      AND COALESCE(p.next_control_at, p.follow_up_at) IS NOT NULL`));
  const today = dayKey(new Date());
  return rows.map((r) => {
    const due = new Date(r.due);
    const dueDay = dayKey(due);
    const lastVisitMs = Math.max(...[r.last_scan_at, r.report_at, r.created_at].filter(Boolean).map((v: any) => new Date(v).getTime()));
    const visitedSince = lastVisitMs >= due.getTime() - 12 * 3600000;
    const status: Fu["status"] = dueDay === today ? "today" : dueDay < today ? "late" : "plan";
    const lateDays = status === "late" ? Math.max(1, Math.round((new Date(today).getTime() - new Date(dueDay).getTime()) / 86400000)) : 0;
    const sp = r.last_signed ? reportPayloadSchema.parse(r.last_signed) : null;
    return {
      id: Number(r.id), firstName: r.first_name, lastName: r.last_name, phone: r.whatsapp_number || null,
      reason: r.followup_reason || null, dx: r.followup_reason || (sp && (sp.conclusion || sp.diagnosis)) || r.scan_dx || null,
      due: due.toISOString(), lastVisit: Number.isFinite(lastVisitMs) ? new Date(lastVisitMs).toISOString() : null,
      status: status === "late" && visitedSince ? "plan" : status, lateDays, apptStatus: r.appt_status || null,
      relancedAt: iso(r.relanced_at), lastMsg: r.last_msg || null,
    } as Fu;
  }).filter((x) => !(x.status === "plan" && new Date(x.due).getTime() < Date.now() - 86400000)) // vu depuis le contrôle : suivi à reprogrammer, sorti de la liste active
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

export function registerDermFollowupRoutes(app: Express) {
  // ── Agenda : déplacer / modifier un rendez-vous ─────────────────────────
  app.patch("/api/derm/appointments/:id", requireProAccess, async (req: any, res) => {
    try {
      const id = Number(req.params.id), me = req.proAccount.id;
      const a = Rows(await db.execute(sql`SELECT * FROM appointments WHERE id = ${id} AND dermatologue_id = ${me}`))[0];
      if (!a) return res.status(404).json({ message: "Rendez-vous introuvable" });
      const b = req.body || {};
      if (b.appointmentDate) {
        const when = new Date(b.appointmentDate);
        if (isNaN(when.getTime())) return res.status(400).json({ message: "Date invalide" });
        const clash = Rows(await db.execute(sql`
          SELECT id FROM appointments WHERE dermatologue_id = ${me} AND status <> 'cancelled' AND id <> ${id}
            AND appointment_date BETWEEN ${new Date(when.getTime() - 29 * 60000).toISOString()} AND ${new Date(when.getTime() + 29 * 60000).toISOString()} LIMIT 1`));
        if (clash.length && !b.forceConflict) return res.status(409).json({ conflict: true, message: "Un rendez-vous existe déjà à cette heure." });
        // Nouveau créneau : nouvelle confirmation demandée la veille.
        await db.execute(sql`UPDATE appointments SET appointment_date = ${when.toISOString()}, status = 'scheduled', confirmed_at = NULL, reminder_j1_sent_at = NULL, reminder_h2_sent = false WHERE id = ${id}`);
        if (a.type === "suivi" && a.patient_record_id) await db.execute(sql`UPDATE patients SET next_control_at = ${when.toISOString()} WHERE id = ${a.patient_record_id} AND dermatologist_id = ${me}`);
      }
      if (b.durationMinutes) await db.execute(sql`UPDATE appointments SET duration_minutes = ${Math.max(5, Math.min(240, Number(b.durationMinutes) || 30))} WHERE id = ${id}`);
      if (typeof b.notes === "string") await db.execute(sql`UPDATE appointments SET notes = ${b.notes.trim().slice(0, 1000) || null} WHERE id = ${id}`);
      if (["scheduled", "confirmed", "done", "cancelled"].includes(b.status)) {
        await db.execute(sql`UPDATE appointments SET status = ${b.status}, confirmed_at = ${b.status === "confirmed" ? sql`COALESCE(confirmed_at, NOW())` : sql`confirmed_at`} WHERE id = ${id}`);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error("[derm appt patch]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Suivis ──────────────────────────────────────────────────────────────
  app.get("/api/derm/followups", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const items = await loadFollowups(req.proAccount.id);
      const todayAppts = Rows(await db.execute(sql`
        SELECT a.id, a.appointment_date, a.patient_record_id, a.patient_name, a.notes FROM appointments a
        WHERE a.dermatologue_id = ${req.proAccount.id} AND a.type = 'suivi' AND a.status <> 'cancelled'
          AND (a.appointment_date AT TIME ZONE 'Africa/Douala')::date = (NOW() AT TIME ZONE 'Africa/Douala')::date ORDER BY a.appointment_date`));
      res.json({
        items,
        stats: { active: items.length, today: items.filter((x) => x.status === "today").length, late: items.filter((x) => x.status === "late" && !x.relancedAt).length, plan: items.filter((x) => x.status === "plan").length },
        today: todayAppts.map((a) => ({ id: Number(a.id), at: iso(a.appointment_date), patientId: a.patient_record_id ? Number(a.patient_record_id) : null, name: a.patient_name, notes: a.notes })),
        relanceText: buildControlRelanceMessage({ name: "[prénom]", derm: req.proAccount.fullName }),
      });
    } catch (e) {
      console.error("[derm followups]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Créer un suivi : date de contrôle + rendez-vous « Suivi » dans l'Agenda.
  app.post("/api/derm/followups", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const pid = Number(req.body?.patientId);
      const date = String(req.body?.date || "");
      if (!pid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "Patient et date du contrôle requis." });
      const reason = String(req.body?.reason || "").trim().slice(0, 200) || undefined;
      const at = await scheduleControl(req.proAccount.id, pid, date, { time: String(req.body?.time || ""), reason });
      await db.execute(sql`INSERT INTO derm_followup_events (patient_id, pro_account_id, kind, body) VALUES (${pid}, ${req.proAccount.id}, 'created', ${reason ? `Suivi ouvert · ${reason}` : "Suivi ouvert"})`);
      res.json({ ok: true, at });
    } catch (e: any) {
      if (e?.message === "NOT_FOUND") return res.status(404).json({ message: "Patient introuvable" });
      console.error("[derm followup create]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Fiche individuelle.
  app.get("/api/derm/followups/:id", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id, id = Number(req.params.id);
      const p = Rows(await db.execute(sql`SELECT * FROM patients WHERE id = ${id} AND dermatologist_id = ${me}`))[0];
      if (!p) return res.status(404).json({ message: "Suivi introuvable" });
      const fu = (await loadFollowups(me)).find((x) => x.id === id) || null;
      const events = Rows(await db.execute(sql`SELECT id, kind, body, evolution, attachment_name, created_at, (attachment IS NOT NULL) AS has_att FROM derm_followup_events WHERE patient_id = ${id} ORDER BY created_at DESC LIMIT 100`));
      const reports = Rows(await db.execute(sql`SELECT id, payload, signed_at, sent_patient_at, created_at FROM consult_reports WHERE patient_id = ${id} ORDER BY created_at DESC`));
      const scans = Rows(await db.execute(sql`SELECT id, created_at, image_url FROM scans WHERE patient_id = ${id} ORDER BY created_at DESC LIMIT 20`));
      const appts = Rows(await db.execute(sql`SELECT id, appointment_date, type, status, confirmed_at, reminder_j1_sent_at, reminder_h2_sent, notes FROM appointments WHERE dermatologue_id = ${me} AND patient_record_id = ${id} ORDER BY appointment_date DESC LIMIT 30`));
      const signed = reports.filter((r) => r.signed_at);
      const firstEvent = Rows(await db.execute(sql`SELECT MIN(created_at) AS t FROM derm_followup_events WHERE patient_id = ${id} AND kind = 'created'`))[0]?.t;
      const timeline = [
        ...events.filter((e) => e.kind !== "relance").map((e) => ({
          at: iso(e.created_at), kind: e.kind, eventId: Number(e.id),
          title: { created: "Suivi ouvert", obs: "Observation du médecin", patient_msg: "Message du patient", close: "Suivi clos", reopen: "Suivi rouvert" }[e.kind as string] || e.kind,
          body: e.body || "", evolution: e.evolution || null, attachment: e.has_att ? (e.attachment_name || "Pièce jointe") : null,
        })),
        ...signed.map((r) => { const q = reportPayloadSchema.parse(r.payload || {}); return { at: iso(r.signed_at), kind: "report", eventId: null, title: "Consultation · compte rendu signé", body: q.conclusion || q.diagnosis || "", evolution: null, attachment: null, reportId: Number(r.id), format: q.format }; }),
      ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
      const reminders = [
        ...events.filter((e) => e.kind === "relance").map((e) => ({ at: iso(e.created_at), label: "Relance WhatsApp · contrôle à reprogrammer", tag: "Envoyée" })),
        ...appts.flatMap((a) => [
          a.reminder_j1_sent_at ? { at: iso(a.reminder_j1_sent_at), label: `Rappel de la veille · rendez-vous du ${new Date(a.appointment_date).toLocaleDateString("fr-FR", { timeZone: TZ })}`, tag: "Envoyé" } : null,
          a.confirmed_at ? { at: iso(a.confirmed_at), label: "Rendez-vous confirmé par le patient", tag: "Confirmé" } : null,
        ].filter(Boolean) as any[]),
        ...signed.filter((r) => r.sent_patient_at).map((r) => ({ at: iso(r.sent_patient_at), label: "Compte rendu remis au patient", tag: "Remis" })),
      ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
      const lastSigned = signed[0] ? reportPayloadSchema.parse(signed[0].payload || {}) : null;
      const lastObs = events.find((e) => e.kind === "obs");
      const lastMsg = events.find((e) => e.kind === "patient_msg");
      const stopped = await followupsStoppedAt({ phone: p.whatsapp_number });
      res.json({
        patient: { id, firstName: p.first_name, lastName: p.last_name, age: p.age, sex: p.sex, phone: p.whatsapp_number || null, closedAt: iso(p.followup_closed_at) },
        followup: fu, reason: p.followup_reason || fu?.dx || (lastSigned && (lastSigned.conclusion || lastSigned.diagnosis)) || null,
        openedAt: iso(firstEvent || signed[signed.length - 1]?.signed_at || p.created_at),
        lastConsult: signed[0] ? iso(signed[0].signed_at) : iso(p.last_scan_at),
        evolution: lastObs ? { value: lastObs.evolution || "Observation", at: iso(lastObs.created_at) } : null,
        nextControl: iso(p.next_control_at || p.follow_up_at),
        nextAppt: appts.filter((a) => new Date(a.appointment_date).getTime() > Date.now() && a.status !== "cancelled").map((a) => ({ id: Number(a.id), at: iso(a.appointment_date), status: a.status })).pop() || null,
        lastPatientMsg: lastMsg ? { body: lastMsg.body, at: iso(lastMsg.created_at) } : null,
        remindersStoppedAt: iso(stopped),
        timeline,
        appointments: appts.map((a) => ({ id: Number(a.id), at: iso(a.appointment_date), type: a.type, status: a.status, notes: a.notes })),
        documents: [
          ...reports.map((r) => ({ kind: "report", id: Number(r.id), label: `Compte rendu ${reportRef(Number(r.id))}`, at: iso(r.signed_at || r.created_at), sub: r.signed_at ? (r.sent_patient_at ? "Signé · remis au patient" : "Signé") : "Brouillon", format: reportPayloadSchema.parse(r.payload || {}).format })),
          ...scans.filter((s) => s.image_url).map((s) => ({ kind: "photo", id: Number(s.id), label: "Photo de consultation", at: iso(s.created_at), sub: "Analyse Glow", url: s.image_url })),
          ...events.filter((e) => e.has_att).map((e) => ({ kind: "attachment", id: Number(e.id), label: e.attachment_name || "Pièce jointe", at: iso(e.created_at), sub: "Joint à une observation" })),
        ],
        reminders,
        relanceText: buildControlRelanceMessage({ name: p.first_name, derm: req.proAccount.fullName }),
      });
    } catch (e) {
      console.error("[derm followup]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Observation du médecin (évolution + note + pièce jointe facultative).
  app.post("/api/derm/followups/:id/observation", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const own = Rows(await db.execute(sql`SELECT id FROM patients WHERE id = ${id} AND dermatologist_id = ${req.proAccount.id}`))[0];
      if (!own) return res.status(404).json({ message: "Suivi introuvable" });
      const note = String(req.body?.note || "").trim().slice(0, 2000);
      const evolution = String(req.body?.evolution || "").trim().slice(0, 60) || null;
      if (!note && !evolution) return res.status(400).json({ message: "Saisissez une observation." });
      let att: string | null = null, attName: string | null = null;
      if (req.body?.attachment) {
        const m = /^data:(image\/[a-z+]+|application\/pdf);base64,/i.exec(String(req.body.attachment));
        if (!m) return res.status(400).json({ message: "Pièce jointe : photo ou PDF uniquement." });
        if ((String(req.body.attachment).length - m[0].length) * 3 / 4 > MAX_ATT) return res.status(413).json({ message: "Pièce jointe trop lourde (5 Mo au plus)." });
        att = String(req.body.attachment); attName = String(req.body?.attachmentName || "Pièce jointe").slice(0, 160);
      }
      await db.execute(sql`INSERT INTO derm_followup_events (patient_id, pro_account_id, kind, body, evolution, attachment, attachment_name)
        VALUES (${id}, ${req.proAccount.id}, 'obs', ${note || null}, ${evolution}, ${att}, ${attName})`);
      res.json({ ok: true });
    } catch (e) {
      console.error("[derm followup obs]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/derm/followups/:id/attachments/:eventId", requireProAccess, doctorOnly, async (req: any, res) => {
    const e = Rows(await db.execute(sql`
      SELECT attachment, attachment_name FROM derm_followup_events
      WHERE id = ${Number(req.params.eventId)} AND patient_id = ${Number(req.params.id)} AND pro_account_id = ${req.proAccount.id}`))[0];
    const m = e?.attachment && /^data:([^;]+);base64,(.+)$/.exec(e.attachment);
    if (!m) return res.status(404).send("Pièce jointe introuvable");
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(m[2], "base64"));
  });

  // Clore / rouvrir un suivi.
  app.post("/api/derm/followups/:id/close", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id), close = req.body?.closed !== false;
      const r = Rows(await db.execute(sql`
        UPDATE patients SET followup_closed_at = ${close ? sql`NOW()` : sql`NULL`}
        WHERE id = ${id} AND dermatologist_id = ${req.proAccount.id} RETURNING id`));
      if (!r.length) return res.status(404).json({ message: "Suivi introuvable" });
      await db.execute(sql`INSERT INTO derm_followup_events (patient_id, pro_account_id, kind) VALUES (${id}, ${req.proAccount.id}, ${close ? "close" : "reopen"})`);
      res.json({ ok: true });
    } catch (e) {
      console.error("[derm followup close]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Relance WhatsApp (message sans détail médical, confirmé par le médecin à l'écran).
  app.post("/api/derm/followups/relance", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const ids: number[] = Array.isArray(req.body?.patientIds) ? req.body.patientIds.map(Number).filter(Boolean).slice(0, 50) : [];
      if (!ids.length) return res.status(400).json({ message: "Aucun patient choisi." });
      const out: { id: number; sent: boolean; reason?: string }[] = [];
      for (const id of ids) {
        const p = Rows(await db.execute(sql`SELECT first_name, whatsapp_number FROM patients WHERE id = ${id} AND dermatologist_id = ${req.proAccount.id}`))[0];
        if (!p) { out.push({ id, sent: false, reason: "introuvable" }); continue; }
        if (!p.whatsapp_number) { out.push({ id, sent: false, reason: "pas de numéro" }); continue; }
        if (await followupsStoppedAt({ phone: p.whatsapp_number })) { out.push({ id, sent: false, reason: "rappels arrêtés par le patient" }); continue; }
        const r = await sendWhatsAppText(p.whatsapp_number, withFollowupFooter(buildControlRelanceMessage({ name: p.first_name, derm: req.proAccount.fullName })));
        if (r.ok) await db.execute(sql`INSERT INTO derm_followup_events (patient_id, pro_account_id, kind, body) VALUES (${id}, ${req.proAccount.id}, 'relance', 'Relance WhatsApp envoyée')`);
        out.push({ id, sent: r.ok, reason: r.ok ? undefined : "WhatsApp indisponible" });
      }
      res.json({ results: out, sent: out.filter((x) => x.sent).length });
    } catch (e) {
      console.error("[derm relance]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
}
