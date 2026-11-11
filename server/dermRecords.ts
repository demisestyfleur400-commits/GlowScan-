import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireProAccess } from "./proRoutes";
import { normalizeCmPhone } from "@shared/phone";
import { reportPayloadSchema, reportRef, a4Meds, activeLines } from "@shared/report";
import { a4SuiviText } from "./dermA4";

// ════════════════════════════════════════════════════════════════════════
// Espace médical D2 : Patients (répertoire administratif, fiche, import CSV,
// archivage) et Dossiers médicaux (vue longitudinale : consultations,
// antécédents, prescriptions, examens, photos, documents, allergies,
// consentement photo). La secrétaire a accès aux Patients, pas aux Dossiers.
// Chiffres réels uniquement.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const iso = (v: any) => (v ? new Date(v).toISOString() : null);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const phoneOf = (v: unknown): string | null => {
  const raw = str(v, 30);
  if (!raw) return null;
  const cm = normalizeCmPhone(raw);
  if (cm) return cm;
  const d = raw.replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15 ? d : null;
};
const sexOf = (v: unknown): "F" | "M" | null => {
  const s = String(v ?? "").trim().toLowerCase();
  if (["f", "femme", "féminin", "feminin"].includes(s)) return "F";
  if (["m", "h", "homme", "masculin"].includes(s)) return "M";
  return null;
};
const CHANNELS = ["SMS", "WhatsApp", "Appel"];
const USAGES = ["Rappels de rendez-vous uniquement.", "Rappels et résultats disponibles (sans détail).", "Aucun rappel."];
const MAX_DOC = 5 * 1024 * 1024;

const doctorOnly = (req: any, res: any, next: any) => (req.isSecretary ? res.status(403).json({ message: "Réservé au médecin." }) : next());

async function ownPatient(proId: number, id: number) {
  return Rows(await db.execute(sql`SELECT * FROM patients WHERE id = ${id} AND dermatologist_id = ${proId}`))[0] || null;
}

/** Dernière visite = dernière analyse, dernier compte rendu, sinon création de la fiche. */
const LAST_VISIT = sql`GREATEST(p.created_at, COALESCE(p.last_scan_at, p.created_at),
  COALESCE((SELECT MAX(cr.created_at) FROM consult_reports cr WHERE cr.patient_id = p.id), p.created_at))`;

function adminRow(p: any) {
  return {
    id: Number(p.id), firstName: p.first_name, lastName: p.last_name, age: p.age ?? null, sex: p.sex || null,
    birthDate: p.birth_date ? new Date(p.birth_date).toISOString().slice(0, 10) : null,
    phone: p.whatsapp_number || null, email: p.email || null, city: p.city || null,
    archived: !!p.archived_at, archivedAt: iso(p.archived_at), createdAt: iso(p.created_at), lastVisit: iso(p.last_visit),
  };
}

export function registerDermRecordRoutes(app: Express) {
  // ── Patients : répertoire administratif ─────────────────────────────────
  app.get("/api/derm/patients", requireProAccess, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const rows = Rows(await db.execute(sql`
        SELECT p.*, ${LAST_VISIT} AS last_visit FROM patients p WHERE p.dermatologist_id = ${me} ORDER BY last_visit DESC`));
      const items = rows.map(adminRow);
      const now = new Date();
      const inMonth = (v: string | null) => { if (!v) return false; const d = new Date(v); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };
      res.json({
        items,
        stats: {
          total: items.length,
          seenThisMonth: items.filter((p) => inMonth(p.lastVisit)).length,
          newThisMonth: items.filter((p) => inMonth(p.createdAt)).length,
          archived: items.filter((p) => p.archived).length,
        },
        month: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      });
    } catch (e) {
      console.error("[derm patients]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Nouvelle fiche (sans passer par l'accueil).
  app.post("/api/derm/patients", requireProAccess, async (req: any, res) => {
    try {
      const b = req.body || {};
      const firstName = str(b.firstName, 80), lastName = str(b.lastName, 80);
      if (!firstName || !lastName) return res.status(400).json({ message: "Nom et prénom requis." });
      const age = Number(b.age);
      const r = Rows(await db.execute(sql`
        INSERT INTO patients (dermatologist_id, first_name, last_name, age, sex, whatsapp_number, intake_pending)
        VALUES (${req.proAccount.id}, ${firstName}, ${lastName}, ${Number.isFinite(age) && age > 0 && age < 130 ? Math.round(age) : null},
                ${sexOf(b.sex)}, ${phoneOf(b.phone)}, false) RETURNING id`))[0];
      res.json({ id: Number(r.id) });
    } catch (e) {
      console.error("[derm patients create]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Import CSV (déjà lu et vérifié à l'écran) : nom, prénom, âge, sexe, téléphone.
  app.post("/api/derm/patients/import", requireProAccess, async (req: any, res) => {
    try {
      const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 500) : [];
      let created = 0, skipped = 0;
      for (const x of rows) {
        const firstName = str(x.firstName, 80), lastName = str(x.lastName, 80);
        if (!firstName || !lastName) { skipped++; continue; }
        const phone = phoneOf(x.phone);
        if (phone) {
          const dup = Rows(await db.execute(sql`SELECT id FROM patients WHERE dermatologist_id = ${req.proAccount.id} AND whatsapp_number = ${phone} LIMIT 1`));
          if (dup.length) { skipped++; continue; }
        }
        const age = Number(x.age);
        await db.execute(sql`
          INSERT INTO patients (dermatologist_id, first_name, last_name, age, sex, whatsapp_number, intake_pending)
          VALUES (${req.proAccount.id}, ${firstName}, ${lastName}, ${Number.isFinite(age) && age > 0 && age < 130 ? Math.round(age) : null},
                  ${sexOf(x.sex)}, ${phone}, false)`);
        created++;
      }
      res.json({ created, skipped });
    } catch (e) {
      console.error("[derm patients import]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Fiche administrative.
  app.get("/api/derm/patients/:id", requireProAccess, async (req: any, res) => {
    try {
      const p = Rows(await db.execute(sql`
        SELECT p.*, ${LAST_VISIT} AS last_visit FROM patients p WHERE p.id = ${Number(req.params.id)} AND p.dermatologist_id = ${req.proAccount.id}`))[0];
      if (!p) return res.status(404).json({ message: "Fiche introuvable" });
      const acc = req.proAccount;
      res.json({
        patient: {
          ...adminRow(p), emergencyName: p.emergency_name || null, emergencyPhone: p.emergency_phone || null, legalRep: p.legal_rep || null,
          contactChannels: p.contact_channels || [], contactUsage: p.contact_usage || USAGES[0],
        },
        cabinet: { doctor: acc.fullName || "", cabinetName: acc.cabinetName || null, city: acc.city || null },
      });
    } catch (e) {
      console.error("[derm patient]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/derm/patients/:id", requireProAccess, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      if (!(await ownPatient(req.proAccount.id, id))) return res.status(404).json({ message: "Fiche introuvable" });
      const b = req.body || {};
      const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
      const sets: any[] = [];
      if (has("firstName") && str(b.firstName, 80)) sets.push(sql`first_name = ${str(b.firstName, 80)}`);
      if (has("lastName") && str(b.lastName, 80)) sets.push(sql`last_name = ${str(b.lastName, 80)}`);
      if (has("age")) { const a = Number(b.age); sets.push(sql`age = ${Number.isFinite(a) && a > 0 && a < 130 ? Math.round(a) : null}`); }
      if (has("sex")) sets.push(sql`sex = ${sexOf(b.sex)}`);
      if (has("birthDate")) { const d = /^\d{4}-\d{2}-\d{2}$/.test(String(b.birthDate || "")) ? String(b.birthDate) : null; sets.push(sql`birth_date = ${d}::date`); }
      if (has("phone")) sets.push(sql`whatsapp_number = ${phoneOf(b.phone)}`);
      if (has("email")) { const e = str(b.email, 120); sets.push(sql`email = ${/.+@.+\..+/.test(e) ? e : null}`); }
      if (has("city")) sets.push(sql`city = ${str(b.city, 120) || null}`);
      if (has("emergencyName")) sets.push(sql`emergency_name = ${str(b.emergencyName, 120) || null}`);
      if (has("emergencyPhone")) sets.push(sql`emergency_phone = ${str(b.emergencyPhone, 30) || null}`);
      if (has("legalRep")) sets.push(sql`legal_rep = ${str(b.legalRep, 300) || null}`);
      if (has("contactChannels") && Array.isArray(b.contactChannels)) {
        const ch = b.contactChannels.filter((c: any) => CHANNELS.includes(c));
        sets.push(sql`contact_channels = ${sql.raw(`ARRAY[${ch.map((c: string) => `'${c}'`).join(",")}]::TEXT[]`)}`);
      }
      if (has("contactUsage") && USAGES.includes(b.contactUsage)) sets.push(sql`contact_usage = ${b.contactUsage}`);
      if (has("archived")) sets.push(b.archived ? sql`archived_at = COALESCE(archived_at, NOW())` : sql`archived_at = NULL`);
      if (!sets.length) return res.json({ success: true });
      await db.execute(sql`UPDATE patients SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`);
      res.json({ success: true });
    } catch (e) {
      console.error("[derm patient patch]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Dossiers médicaux (médecin) ─────────────────────────────────────────
  app.get("/api/derm/records", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const rows = Rows(await db.execute(sql`
        SELECT p.id, p.first_name, p.last_name, p.last_opened_at, p.created_at,
          (SELECT COALESCE(s.expert_corrected_condition, s.condition) FROM scans s WHERE s.patient_id = p.id ORDER BY s.created_at DESC LIMIT 1) AS scan_dx,
          (SELECT MAX(s.created_at) FROM scans s WHERE s.patient_id = p.id) AS scan_at,
          (SELECT cr.payload FROM consult_reports cr WHERE cr.patient_id = p.id AND cr.signed_at IS NOT NULL ORDER BY cr.signed_at DESC LIMIT 1) AS last_signed,
          (SELECT MAX(cr.created_at) FROM consult_reports cr WHERE cr.patient_id = p.id) AS report_at,
          (SELECT COUNT(*)::int FROM consult_reports cr WHERE cr.patient_id = p.id AND cr.signed_at IS NULL) AS drafts,
          (SELECT COUNT(*)::int FROM consult_reports cr WHERE cr.patient_id = p.id AND cr.signed_at IS NOT NULL) AS signed,
          (SELECT COUNT(*)::int FROM consult_reports cr WHERE cr.patient_id = p.id) + (SELECT COUNT(*)::int FROM patient_documents d WHERE d.patient_id = p.id) AS docs,
          (SELECT COUNT(*)::int FROM consult_reports cr WHERE cr.patient_id = p.id AND cr.source = 'visit') AS visits
        FROM patients p WHERE p.dermatologist_id = ${me} AND p.archived_at IS NULL`));
      const now = new Date();
      const inMonth = (v: any) => { if (!v) return false; const d = new Date(v); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };
      const items = rows.map((r) => {
        const sp = r.last_signed ? reportPayloadSchema.parse(r.last_signed) : null;
        const last = [r.scan_at, r.report_at].filter(Boolean).map((v: any) => new Date(v).getTime());
        const lastAt = last.length ? new Date(Math.max(...last)).toISOString() : null;
        return {
          id: Number(r.id), firstName: r.first_name, lastName: r.last_name,
          dx: (sp && (sp.conclusion || sp.diagnosis)) || r.scan_dx || null,
          lastAt, openedAt: iso(r.last_opened_at),
          report: Number(r.drafts) > 0 ? "draft" : Number(r.signed) > 0 ? "ok" : "none",
          visits: Number(r.visits) || 0, docs: Number(r.docs) || 0,
          month: inMonth(r.last_opened_at) || inMonth(r.scan_at) || inMonth(r.report_at),
        };
      }).filter((x) => x.lastAt || x.openedAt)
        .sort((a, b) => new Date(b.lastAt || b.openedAt || 0).getTime() - new Date(a.lastAt || a.openedAt || 0).getTime());
      const drafts = Rows(await db.execute(sql`
        SELECT cr.id, cr.patient_id, cr.created_at FROM consult_reports cr JOIN patients p ON p.id = cr.patient_id
        WHERE cr.pro_account_id = ${me} AND cr.signed_at IS NULL AND cr.source = 'visit' ORDER BY cr.created_at DESC LIMIT 20`));
      const consMonth = Rows(await db.execute(sql`
        SELECT COUNT(*)::int AS n FROM (
          SELECT s.patient_id, s.created_at::date FROM scans s JOIN patients p ON p.id = s.patient_id
            WHERE p.dermatologist_id = ${me} AND date_trunc('month', s.created_at) = date_trunc('month', NOW())
          UNION
          SELECT cr.patient_id, cr.created_at::date FROM consult_reports cr
            WHERE cr.pro_account_id = ${me} AND cr.patient_id IS NOT NULL AND date_trunc('month', cr.created_at) = date_trunc('month', NOW())
        ) t`))[0]?.n || 0;
      const lastOpened = rows.filter((r) => r.last_opened_at).sort((a, b) => new Date(b.last_opened_at).getTime() - new Date(a.last_opened_at).getTime())[0];
      res.json({
        items,
        stats: { consulted: items.filter((x) => x.month).length, consultationsMonth: Number(consMonth), drafts: drafts.length },
        drafts: drafts.map((d) => ({ reportId: Number(d.id), patientId: Number(d.patient_id), createdAt: iso(d.created_at) })),
        lastOpened: lastOpened ? items.find((x) => x.id === Number(lastOpened.id)) || null : items[0] || null,
        month: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      });
    } catch (e) {
      console.error("[derm records]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Vue longitudinale d'un patient.
  app.get("/api/derm/records/:id", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id, id = Number(req.params.id);
      const p = await ownPatient(me, id);
      if (!p) return res.status(404).json({ message: "Dossier introuvable" });
      await db.execute(sql`UPDATE patients SET last_opened_at = NOW() WHERE id = ${id}`).catch(() => {});
      const reports = Rows(await db.execute(sql`
        SELECT id, source, payload, signed_at, sent_patient_at, created_at FROM consult_reports WHERE patient_id = ${id} ORDER BY created_at ASC`));
      const scans = Rows(await db.execute(sql`
        SELECT id, created_at, image_url, score, condition, expert_corrected_condition, dermato_note FROM scans WHERE patient_id = ${id} ORDER BY created_at ASC`));
      const notes = Rows(await db.execute(sql`SELECT id, kind, body, created_at FROM patient_record_notes WHERE patient_id = ${id} ORDER BY created_at ASC`));
      const docs = Rows(await db.execute(sql`SELECT id, name, mime, size_bytes, created_at FROM patient_documents WHERE patient_id = ${id} ORDER BY created_at DESC`));

      const visits = reports.filter((r) => r.source === "visit");
      const consultations = reports.map((r, i) => {
        const q = reportPayloadSchema.parse(r.payload || {});
        const signed = !!r.signed_at;
        return {
          reportId: Number(r.id), ref: reportRef(Number(r.id)), date: iso(r.signed_at || r.created_at), source: r.source,
          title: r.source === "consultation" ? "Consultation en ligne" : i === 0 && visits[0]?.id === r.id ? "Première consultation" : "Consultation",
          summary: q.conclusion || q.diagnosisPlain || q.diagnosis || "",
          detail: { motif: q.motif, obs: q.exam, conclusion: q.conclusion || q.diagnosis, conduite: q.conduite, suivi: q.format === "a4" ? a4SuiviText(q, iso(r.signed_at || r.created_at)) : "" },
          signed, sent: !!r.sent_patient_at, format: q.format,
        };
      }).reverse();
      const prescriptions = [
        ...reports.filter((r) => r.signed_at).flatMap((r) => {
          const q = reportPayloadSchema.parse(r.payload || {});
          const meds = q.format === "a4"
            ? a4Meds(q).map((m) => [m.m, m.f, m.v, m.p, m.d].filter(Boolean).join(" · "))
            : (q.withPrescription ? activeLines(q).map((l) => [l.name, l.qty, l.when, l.duration].filter(Boolean).join(" · ")) : []);
          return meds.map((v) => ({ label: "Ordonnance", date: iso(r.signed_at), value: v, reportId: Number(r.id) }));
        }),
        ...notes.filter((n) => n.kind === "rx").map((n) => ({ label: "Ajouté au dossier", date: iso(n.created_at), value: n.body, reportId: null })),
      ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const lastSigned = reports.filter((r) => r.signed_at).sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime())[0];
      const ls = lastSigned ? reportPayloadSchema.parse(lastSigned.payload || {}) : null;
      const lastScan = scans[scans.length - 1];
      const ctl = p.followup_closed_at ? null : (p.next_control_at || p.follow_up_at || ls?.controlPhotoDate || null);
      const nextControl = ctl && new Date(ctl).getTime() >= Date.now() - 86400000 ? iso(ctl) : null;

      res.json({
        patient: {
          id, firstName: p.first_name, lastName: p.last_name, age: p.age ?? null, sex: p.sex || null,
          allergies: p.allergies || null, allergiesAt: iso(p.allergies_at), photoConsentAt: iso(p.photo_consent_at), createdAt: iso(p.created_at),
        },
        dx: (ls && (ls.conclusion || ls.diagnosis)) || lastScan?.expert_corrected_condition || lastScan?.condition || null,
        synthesis: ls ? {
          conclusion: ls.conclusion || ls.diagnosisPlain || ls.diagnosis || "", date: iso(lastSigned.signed_at),
          suivi: ls.format === "a4" ? a4SuiviText(ls, iso(lastSigned.signed_at)) : "",
        } : null,
        nextControl,
        firstAt: iso(reports[0]?.created_at || scans[0]?.created_at || p.created_at),
        consultations,
        analyses: scans.map((s) => ({
          id: Number(s.id), date: iso(s.created_at), photo: s.image_url || null, score: typeof s.score === "number" && s.score > 0 ? s.score : null,
          condition: s.expert_corrected_condition || s.condition || null, note: s.dermato_note || null,
        })).reverse(),
        notes: {
          ant: notes.filter((n) => n.kind === "ant").map((n) => ({ id: Number(n.id), date: iso(n.created_at), body: n.body })),
          ex: notes.filter((n) => n.kind === "ex").map((n) => ({ id: Number(n.id), date: iso(n.created_at), body: n.body })),
        },
        prescriptions,
        documents: [
          ...reports.map((r) => ({ kind: "report" as const, id: Number(r.id), name: r.source === "consultation" ? "Compte rendu · consultation en ligne" : "Compte rendu de consultation",
            date: iso(r.signed_at || r.created_at), signed: !!r.signed_at, format: reportPayloadSchema.parse(r.payload || {}).format })),
          ...docs.map((d) => ({ kind: "file" as const, id: Number(d.id), name: d.name, date: iso(d.created_at), mime: d.mime, size: Number(d.size_bytes) })),
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
      });
    } catch (e) {
      console.error("[derm record]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Allergies et consentement photo.
  app.patch("/api/derm/records/:id", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      if (!(await ownPatient(req.proAccount.id, id))) return res.status(404).json({ message: "Dossier introuvable" });
      const b = req.body || {};
      if (typeof b.allergies === "string") {
        const v = b.allergies.trim().slice(0, 300);
        await db.execute(sql`UPDATE patients SET allergies = ${v || null}, allergies_at = ${v ? sql`NOW()` : sql`NULL`} WHERE id = ${id}`);
      }
      if (typeof b.photoConsent === "boolean") {
        await db.execute(sql`UPDATE patients SET photo_consent_at = ${b.photoConsent ? sql`NOW()` : sql`NULL`} WHERE id = ${id}`);
      }
      res.json({ success: true });
    } catch (e) {
      console.error("[derm record patch]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Antécédents, prescriptions, examens ajoutés à la main.
  app.post("/api/derm/records/:id/notes", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      if (!(await ownPatient(req.proAccount.id, id))) return res.status(404).json({ message: "Dossier introuvable" });
      const kind = String(req.body?.kind || "");
      const body = str(req.body?.body, 2000);
      if (!["ant", "rx", "ex"].includes(kind) || !body) return res.status(400).json({ message: "Saisie vide." });
      await db.execute(sql`INSERT INTO patient_record_notes (patient_id, pro_account_id, kind, body) VALUES (${id}, ${req.proAccount.id}, ${kind}, ${body})`);
      res.json({ success: true });
    } catch (e) {
      console.error("[derm notes]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Documents joints (PDF ou image, 5 Mo au plus).
  app.post("/api/derm/records/:id/documents", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      if (!(await ownPatient(req.proAccount.id, id))) return res.status(404).json({ message: "Dossier introuvable" });
      const name = str(req.body?.name, 160);
      const data = String(req.body?.data || "");
      const m = /^data:([a-z0-9.+/-]+);base64,/i.exec(data);
      if (!name || !m) return res.status(400).json({ message: "Fichier illisible." });
      const mime = m[1].toLowerCase();
      if (!(mime === "application/pdf" || mime.startsWith("image/"))) return res.status(400).json({ message: "PDF ou image uniquement." });
      const size = Math.floor((data.length - m[0].length) * 3 / 4);
      if (size > MAX_DOC) return res.status(413).json({ message: "Fichier trop lourd (5 Mo au plus)." });
      await db.execute(sql`INSERT INTO patient_documents (patient_id, pro_account_id, name, mime, size_bytes, data) VALUES (${id}, ${req.proAccount.id}, ${name}, ${mime}, ${size}, ${data})`);
      res.json({ success: true });
    } catch (e) {
      console.error("[derm documents]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/derm/records/:id/documents/:docId", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const d = Rows(await db.execute(sql`
        SELECT name, mime, data FROM patient_documents WHERE id = ${Number(req.params.docId)} AND patient_id = ${Number(req.params.id)} AND pro_account_id = ${req.proAccount.id}`))[0];
      if (!d) return res.status(404).send("Document introuvable");
      const b64 = String(d.data).replace(/^data:[^,]+,/, "");
      res.setHeader("Content-Type", d.mime);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(d.name)}"`);
      res.setHeader("Cache-Control", "no-store");
      res.send(Buffer.from(b64, "base64"));
    } catch (e) {
      console.error("[derm document]", e);
      res.status(500).send("Erreur serveur");
    }
  });

  // Export du dossier : page A4 imprimable (Imprimer · PDF).
  app.get("/api/derm/records/:id/export", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const p = await ownPatient(req.proAccount.id, id);
      if (!p) return res.status(404).send("Dossier introuvable");
      const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
      const fr = (v: any) => (v ? new Date(v).toLocaleDateString("fr-FR") : "");
      const reports = Rows(await db.execute(sql`SELECT id, payload, signed_at, created_at FROM consult_reports WHERE patient_id = ${id} AND signed_at IS NOT NULL ORDER BY signed_at ASC`));
      const notes = Rows(await db.execute(sql`SELECT kind, body, created_at FROM patient_record_notes WHERE patient_id = ${id} ORDER BY created_at ASC`));
      const block = (t: string, v: string) => (v.trim() ? `<p><b>${t} :</b> ${esc(v).replace(/\n/g, "<br>")}</p>` : "");
      const cons = reports.map((r) => {
        const q = reportPayloadSchema.parse(r.payload || {});
        return `<h3>${fr(r.signed_at)} · ${esc(reportRef(Number(r.id)))}</h3>${block("Motif", q.motif)}${block("Observations", q.exam)}${block("Conclusion", q.conclusion || q.diagnosis)}${block("Conduite à tenir", q.conduite)}${q.format === "a4" ? block("Suivi", a4SuiviText(q, iso(r.signed_at))) : ""}${a4Meds(q).map((m) => block("Prescription", [m.m, m.f, m.v, m.p, m.d, m.c].filter(Boolean).join(" · "))).join("")}`;
      }).join("") || "<p>Aucun compte rendu signé.</p>";
      const lbl: Record<string, string> = { ant: "Antécédents", rx: "Prescription ajoutée", ex: "Examen" };
      const extra = notes.map((n) => `<p><b>${lbl[n.kind] || ""} · ${fr(n.created_at)} :</b> ${esc(n.body)}</p>`).join("");
      const acc = req.proAccount;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Dossier médical · ${esc(p.first_name)} ${esc(p.last_name)}</title>
<style>@page{size:A4;margin:18mm}body{font-family:Inter,Arial,sans-serif;color:#1f2f2b;max-width:720px;margin:30px auto;line-height:1.6;font-size:12px}h1{font:500 24px Georgia,serif}h2{font-size:14px;margin-top:24px;border-bottom:1px solid #e4e8e3;padding-bottom:4px}h3{font-size:12px;margin:16px 0 4px;color:#1f5c48}.muted{color:#6b7a75}</style></head>
<body><p class="muted">DERMATOLOGIE · ${esc(acc.cabinetName || "")} · Dr ${esc(String(acc.fullName || "").replace(/^(dr|pr)\.?\s+/i, ""))}</p>
<h1>Dossier médical · ${esc(p.first_name)} ${esc(p.last_name)}</h1>
<p class="muted">${p.age ? `${p.age} ans · ` : ""}${p.sex === "F" ? "Femme" : p.sex === "M" ? "Homme" : ""}</p>
<h2>Allergies</h2><p>${esc(p.allergies || "Non renseigné.")}</p>
<h2>Consultations</h2>${cons}
${extra ? `<h2>Ajouts au dossier</h2>${extra}` : ""}
<p class="muted" style="margin-top:30px">Export du ${new Date().toLocaleDateString("fr-FR")} · document médical confidentiel.</p>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    } catch (e) {
      console.error("[derm export]", e);
      res.status(500).send("Erreur serveur");
    }
  });
}
