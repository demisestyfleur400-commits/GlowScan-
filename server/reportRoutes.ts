import type { Express } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireProAccess } from "./proRoutes";
import { verifySignPin, PIN_MESSAGES } from "./signPin";
import { sendWhatsAppText } from "./whatsapp";
import { renderPatientReport, renderCabinetReport, renderPrescription, type ReportDoctor, type ReportPatient, type ReportDoc, type ReportPrescription, type ReportEvolution } from "./reportHtml";
import { reportPayloadSchema, emptyReport, reportRef, prescriptionRef, refNumber, reportMissing, linesAsText, DEFAULT_SPECIALTY, type ReportPayload } from "@shared/report";
import { buildReportReadyMessage } from "@shared/whatsappMessages";

// ════════════════════════════════════════════════════════════════════════
// Compte rendu en 3 versions + ordonnance (étape 9a). Une saisie unique du
// médecin, signée avec son code à 4 chiffres (vérifié avant toute écriture),
// puis figée. /verif/:ref permet au pharmacien de vérifier une ordonnance :
// médecin, date et statut, sans aucune donnée de santé.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
const SECRET = process.env.SESSION_SECRET || process.env.DATASET_EXPORT_SALT || "";
const iso = (v: any) => (v ? new Date(v).toISOString() : null);

// ── Lien patient signé (90 jours) ────────────────────────────────────────
export function reportToken(reportId: number, days = 90): string {
  const exp = Date.now() + days * 86400000;
  const sig = crypto.createHmac("sha256", SECRET).update(`report.${reportId}.${exp}`).digest("hex").slice(0, 24);
  return Buffer.from(`${reportId}.${exp}.${sig}`).toString("base64url");
}
function checkToken(token: string, reportId: number): boolean {
  try {
    const [id, exp, sig] = Buffer.from(token, "base64url").toString().split(".");
    if (Number(id) !== reportId || Date.now() > Number(exp)) return false;
    const good = crypto.createHmac("sha256", SECRET).update(`report.${id}.${exp}`).digest("hex").slice(0, 24);
    return crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig || ""));
  } catch { return false; }
}
export const patientReportUrl = (reportId: number) => `${BASE}/api/reports/${reportId}/view?v=patient&token=${reportToken(reportId)}`;

// ── Lecture ──────────────────────────────────────────────────────────────
async function loadReport(id: number) {
  return Rows(await db.execute(sql`SELECT * FROM consult_reports WHERE id = ${id}`))[0] || null;
}
async function loadDoctor(proId: number): Promise<ReportDoctor> {
  const d = Rows(await db.execute(sql`
    SELECT full_name, cabinet_name, city, license_number, specialty_title, cabinet_address, cabinet_phone FROM pro_accounts WHERE id = ${proId}`))[0] || {};
  return {
    name: d.full_name || "", cabinetName: d.cabinet_name || null, city: d.city || null, licenseNumber: d.license_number || null,
    specialtyTitle: d.specialty_title || null, cabinetAddress: d.cabinet_address || null, cabinetPhone: d.cabinet_phone || null,
  };
}
async function loadPatient(r: any): Promise<ReportPatient & { phone: string | null }> {
  if (r.patient_id) {
    const p = Rows(await db.execute(sql`SELECT first_name, last_name, age, sex, whatsapp_number FROM patients WHERE id = ${r.patient_id}`))[0] || {};
    return { firstName: p.first_name || "", lastName: p.last_name || "", age: p.age ?? null, sex: p.sex || null, phone: p.whatsapp_number || null };
  }
  const u = Rows(await db.execute(sql`
    SELECT u.first_name, u.last_name, c.patient_context FROM consultations c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ${r.consultation_id}`))[0] || {};
  const ctx = typeof u.patient_context === "string" ? JSON.parse(u.patient_context) : u.patient_context || {};
  const age = Number(ctx.age);
  const sex = ctx.sex === "F" || ctx.sex === "M" ? ctx.sex : null;
  return { firstName: u.first_name || "", lastName: u.last_name || "", age: Number.isFinite(age) && age > 0 ? age : null, sex, phone: null };
}
async function loadPrescription(reportId: number): Promise<ReportPrescription> {
  const rx = Rows(await db.execute(sql`SELECT ref, status, signed_at FROM prescriptions WHERE report_id = ${reportId}`))[0];
  if (!rx) return null;
  const verifyUrl = `${BASE}/verif/${rx.ref}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 192, color: { dark: "#201e1d", light: "#fffaf2" } });
  return { ref: rx.ref, status: rx.status === "revoked" ? "revoked" : "valid", signedAt: iso(rx.signed_at)!, qrDataUrl, verifyUrl };
}
async function toDoc(r: any): Promise<ReportDoc> {
  let visitNumber: number | null = null;
  if (r.source === "visit" && r.patient_id) {
    const n = Rows(await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM consult_reports WHERE patient_id = ${r.patient_id} AND source = 'visit' AND signed_at IS NOT NULL
        AND signed_at <= COALESCE(${r.signed_at}::timestamp, NOW())`))[0]?.n;
    visitNumber = Math.max(1, Number(n) || 1);
  }
  return {
    id: r.id, ref: reportRef(r.id), source: r.source, payload: reportPayloadSchema.parse(r.payload || {}),
    signedAt: iso(r.signed_at), createdAt: iso(r.created_at)!, sentPatientAt: iso(r.sent_patient_at), viewedBy: r.viewed_by || [], visitNumber,
  };
}
async function evolutionOf(r: any): Promise<ReportEvolution> {
  const rows = r.patient_id
    ? Rows(await db.execute(sql`SELECT created_at, score, image_url FROM scans WHERE patient_id = ${r.patient_id} ORDER BY created_at ASC`))
    : Rows(await db.execute(sql`SELECT s.created_at, s.score, s.image_url FROM consultations c JOIN scans s ON s.id = c.scan_id WHERE c.id = ${r.consultation_id}`));
  return rows.map((s: any) => ({ date: iso(s.created_at)!, score: typeof s.score === "number" && s.score > 0 ? s.score : null, photo: s.image_url || null }));
}

/** Page HTML de la version patient (1a + ordonnance en page 2). */
export async function patientReportHtml(reportId: number): Promise<string | null> {
  const r = await loadReport(reportId);
  if (!r) return null;
  return renderPatientReport(await loadDoctor(r.pro_account_id), await loadPatient(r), await toDoc(r), await loadPrescription(r.id));
}
/** Compte rendu signé d'une consultation en ligne, s'il existe. */
export async function signedReportIdForConsultation(consultationId: number): Promise<number | null> {
  const r = Rows(await db.execute(sql`SELECT id FROM consult_reports WHERE consultation_id = ${consultationId} AND signed_at IS NOT NULL`))[0];
  return r ? Number(r.id) : null;
}

// ── Préremplissage d'un nouveau brouillon ───────────────────────────────
async function prefill(proId: number, source: "visit" | "consultation", target: number): Promise<ReportPayload> {
  const p = emptyReport();
  if (source === "visit") {
    const prev = Rows(await db.execute(sql`
      SELECT payload FROM consult_reports WHERE patient_id = ${target} AND signed_at IS NOT NULL ORDER BY signed_at DESC LIMIT 1`))[0];
    if (prev) {
      const q = reportPayloadSchema.parse(prev.payload || {});
      Object.assign(p, {
        weightKg: q.weightKg, allergies: q.allergies, antecedents: q.antecedents, phototype: q.phototype, avoid: q.avoid,
        diagnosis: q.diagnosis, diagnosisPlain: q.diagnosisPlain, alertIf: q.alertIf,
        lines: q.lines.filter((l) => l.status !== "arrete").map((l) => ({ ...l, status: "poursuivi" as const, reason: "" })),
      });
    } else {
      const cr = Rows(await db.execute(sql`SELECT clinical_record FROM patients WHERE id = ${target}`))[0]?.clinical_record || {};
      if (cr.atcdCosmeto) p.antecedents = String(cr.atcdCosmeto).slice(0, 400);
    }
    const s = Rows(await db.execute(sql`
      SELECT condition, expert_corrected_condition, clinical_context FROM scans WHERE patient_id = ${target} ORDER BY created_at DESC LIMIT 1`))[0];
    if (s) {
      p.aiSuggestion = s.condition || null;
      if (!p.diagnosis) p.diagnosis = s.expert_corrected_condition || s.condition || "";
      const ph = s.clinical_context?.examen?.phototype;
      if (ph && !p.phototype) p.phototype = String(ph).slice(0, 10);
    }
  } else {
    const c = Rows(await db.execute(sql`
      SELECT c.condition, c.patient_context, s.condition AS ai, s.expert_corrected_condition AS fixed
      FROM consultations c LEFT JOIN scans s ON s.id = c.scan_id WHERE c.id = ${target}`))[0] || {};
    const ctx = typeof c.patient_context === "string" ? JSON.parse(c.patient_context) : c.patient_context || {};
    p.aiSuggestion = c.ai || c.condition || null;
    p.diagnosis = c.fixed || c.ai || c.condition || "";
    if (ctx.allergies) p.allergies = String(ctx.allergies).slice(0, 300);
    if (ctx.products) p.antecedents = `Produits déjà utilisés : ${String(ctx.products)}`.slice(0, 400);
    if (ctx.duration) p.motif = `Depuis ${String(ctx.duration)}`.slice(0, 600);
    if (ctx.doctorMessage) p.personalNote = String(ctx.doctorMessage).slice(0, 1500);
  }
  return p;
}

// ── Signature (appelée aussi à la clôture d'une consultation en ligne) ──
/** Ce qui empêche la signature, sinon []. Lecture seule. */
export async function reportBlockers(reportId: number, proId: number): Promise<string[]> {
  const r = await loadReport(reportId);
  if (!r || r.pro_account_id !== proId) return ["compte rendu introuvable"];
  if (r.signed_at) return [];
  const d = await loadDoctor(proId);
  return reportMissing(reportPayloadSchema.parse(r.payload || {}), d);
}
/** Fige le compte rendu et crée l'ordonnance. Le code a déjà été vérifié. */
export async function signReport(reportId: number, proId: number): Promise<{ ref: string; prescriptionRef: string | null }> {
  const r = await loadReport(reportId);
  if (!r || r.pro_account_id !== proId) throw new Error("NOT_FOUND");
  const p = reportPayloadSchema.parse(r.payload || {});
  if (!r.signed_at) {
    await db.execute(sql`UPDATE consult_reports SET signed_at = NOW(), updated_at = NOW() WHERE id = ${reportId} AND signed_at IS NULL`);
  }
  let rxRef: string | null = null;
  if (p.withPrescription) {
    rxRef = prescriptionRef(reportId);
    await db.execute(sql`
      INSERT INTO prescriptions (ref, report_id, pro_account_id) VALUES (${rxRef}, ${reportId}, ${proId})
      ON CONFLICT (report_id) DO NOTHING`);
  }
  // Anciens écrans (colonne texte) : la consultation garde une version texte du traitement.
  if (r.consultation_id) {
    await db.execute(sql`UPDATE consultations SET prescription = ${linesAsText(p) || null} WHERE id = ${r.consultation_id}`).catch(() => {});
  }
  return { ref: reportRef(reportId), prescriptionRef: rxRef };
}

export function registerReportRoutes(app: Express) {
  const doctorOnly = (req: any, res: any, next: any) => (req.isSecretary ? res.status(403).json({ message: "Réservé au médecin." }) : next());

  async function ownTarget(proId: number, source: string, id: number): Promise<boolean> {
    const r = source === "visit"
      ? Rows(await db.execute(sql`SELECT id FROM patients WHERE id = ${id} AND dermatologist_id = ${proId}`))
      : Rows(await db.execute(sql`SELECT id FROM consultations WHERE id = ${id} AND pro_account_id = ${proId}`));
    return r.length > 0;
  }
  const summary = async (r: any) => {
    const rx = Rows(await db.execute(sql`SELECT ref, status FROM prescriptions WHERE report_id = ${r.id}`))[0];
    const p = reportPayloadSchema.parse(r.payload || {});
    return {
      id: r.id, ref: reportRef(r.id), source: r.source, patientId: r.patient_id, consultationId: r.consultation_id,
      signedAt: iso(r.signed_at), sentPatientAt: iso(r.sent_patient_at), createdAt: iso(r.created_at), diagnosis: p.diagnosis,
      prescription: rx ? { ref: rx.ref, status: rx.status } : null,
    };
  };

  // Liste des comptes rendus d'un patient (ou d'une consultation).
  app.get("/api/pro/reports", requireProAccess, async (req: any, res) => {
    try {
      const pid = Number(req.query.patientId) || null, cid = Number(req.query.consultationId) || null;
      if (!pid && !cid) return res.json({ items: [] });
      const rows = Rows(await db.execute(sql`
        SELECT * FROM consult_reports WHERE pro_account_id = ${req.proAccount.id}
          AND ${pid ? sql`patient_id = ${pid}` : sql`consultation_id = ${cid}`}
        ORDER BY created_at DESC LIMIT 50`));
      res.json({ items: await Promise.all(rows.map(summary)) });
    } catch (e) {
      console.error("[reports list]", e);
      res.json({ items: [] });
    }
  });

  // Ouvre le brouillon en cours (ou en crée un, prérempli).
  app.post("/api/pro/reports", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const source = req.body?.source === "consultation" ? "consultation" : "visit";
      const target = Number(source === "visit" ? req.body?.patientId : req.body?.consultationId);
      if (!target || !(await ownTarget(req.proAccount.id, source, target))) return res.status(404).json({ message: "Dossier introuvable" });
      let r = Rows(await db.execute(sql`
        SELECT * FROM consult_reports WHERE pro_account_id = ${req.proAccount.id} AND signed_at IS NULL
          AND ${source === "visit" ? sql`patient_id = ${target} AND source = 'visit'` : sql`consultation_id = ${target}`}
        ORDER BY created_at DESC LIMIT 1`))[0];
      if (!r && source === "consultation") {
        // Une consultation n'a qu'un compte rendu : s'il est signé, on le renvoie tel quel.
        r = Rows(await db.execute(sql`SELECT * FROM consult_reports WHERE consultation_id = ${target}`))[0];
      }
      if (!r) {
        const payload = await prefill(req.proAccount.id, source, target);
        r = Rows(await db.execute(sql`
          INSERT INTO consult_reports (pro_account_id, source, consultation_id, patient_id, payload)
          VALUES (${req.proAccount.id}, ${source}, ${source === "consultation" ? target : null}, ${source === "visit" ? target : null}, ${JSON.stringify(payload)}::jsonb)
          RETURNING *`))[0];
      }
      const d = await loadDoctor(req.proAccount.id);
      res.json({ report: { ...(await summary(r)), payload: reportPayloadSchema.parse(r.payload || {}) }, doctor: { licenseNumber: d.licenseNumber, cabinetAddress: d.cabinetAddress, specialtyTitle: d.specialtyTitle || DEFAULT_SPECIALTY } });
    } catch (e) {
      console.error("[reports open]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Enregistre la saisie (brouillon uniquement : un compte rendu signé est figé).
  app.put("/api/pro/reports/:id", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const parsed = reportPayloadSchema.safeParse(req.body?.payload);
      if (!parsed.success) return res.status(400).json({ message: "Saisie incomplète ou trop longue." });
      const r = Rows(await db.execute(sql`
        UPDATE consult_reports SET payload = ${JSON.stringify(parsed.data)}::jsonb, updated_at = NOW()
        WHERE id = ${Number(req.params.id)} AND pro_account_id = ${req.proAccount.id} AND signed_at IS NULL RETURNING id`));
      if (!r.length) return res.status(409).json({ message: "Ce compte rendu est déjà signé." });
      res.json({ success: true });
    } catch (e) {
      console.error("[reports save]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Signature d'un compte rendu de visite (la consultation en ligne signe à la clôture).
  app.post("/api/pro/reports/:id/sign", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id), me = req.proAccount.id;
      const missing = await reportBlockers(id, me);
      if (missing.length) return res.status(400).json({ code: "REPORT_INCOMPLETE", message: `Il manque : ${missing.join(", ")}.`, missing });
      const chk = await verifySignPin(me, String(req.body?.pin ?? ""));
      if (chk !== "ok") { const m = PIN_MESSAGES[chk]; return res.status(m.status).json({ code: m.code, message: m.message }); }
      res.json(await signReport(id, me));
    } catch (e) {
      console.error("[reports sign]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Envoi de la version patient sur WhatsApp (visite au cabinet).
  app.post("/api/pro/reports/:id/send", requireProAccess, async (req: any, res) => {
    try {
      const r = await loadReport(Number(req.params.id));
      if (!r || r.pro_account_id !== req.proAccount.id) return res.status(404).json({ message: "Compte rendu introuvable" });
      if (!r.signed_at) return res.status(409).json({ message: "Signez le compte rendu avant de l'envoyer." });
      const pt = await loadPatient(r);
      const d = await loadDoctor(r.pro_account_id);
      const url = patientReportUrl(r.id);
      const p = reportPayloadSchema.parse(r.payload || {});
      const wa = await sendWhatsAppText(pt.phone, buildReportReadyMessage({ name: pt.firstName, derm: d.name, url, withPrescription: p.withPrescription }));
      if (wa.ok) {
        await db.execute(sql`UPDATE consult_reports SET sent_patient_at = NOW() WHERE id = ${r.id}`);
        if (r.patient_id) await db.execute(sql`UPDATE patients SET report_sent_at = NOW() WHERE id = ${r.patient_id}`).catch(() => {});
      }
      // Sans WhatsApp configuré ou sans numéro : le médecin partage le lien lui-même.
      res.json({ sent: wa.ok, url });
    } catch (e) {
      console.error("[reports send]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Annuler une ordonnance (elle apparaît « annulée » sur /verif).
  app.post("/api/pro/prescriptions/:ref/revoke", requireProAccess, doctorOnly, async (req: any, res) => {
    const r = Rows(await db.execute(sql`
      UPDATE prescriptions SET status = 'revoked', revoked_at = NOW()
      WHERE ref = ${String(req.params.ref).toUpperCase()} AND pro_account_id = ${req.proAccount.id} AND status = 'valid' RETURNING ref`));
    if (!r.length) return res.status(404).json({ message: "Ordonnance introuvable ou déjà annulée." });
    res.json({ success: true });
  });

  // Documents : v=patient (1a + ordonnance), cabinet (1c), ordonnance (1d).
  app.get("/api/reports/:id/view", async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const v = String(req.query.v || "patient");
      const r = await loadReport(id);
      if (!r) return res.status(404).send("Document introuvable");
      // Qui regarde ? Lien signé (patient), cabinet (médecin ou secrétaire), patient connecté.
      let viewer: { kind: "token" | "pro" | "patient"; name?: string } | null = null;
      if (req.query.token && checkToken(String(req.query.token), id)) viewer = { kind: "token" };
      const uid = req.session?.userId || null;
      if (!viewer && uid) {
        const pro = Rows(await db.execute(sql`SELECT id, full_name FROM pro_accounts WHERE user_id = ${uid}`))[0];
        if (pro && pro.id === r.pro_account_id) viewer = { kind: "pro", name: `Dr ${String(pro.full_name || "").replace(/^(dr|pr)\.?\s+/i, "")}` };
        if (!viewer) {
          const sec = Rows(await db.execute(sql`SELECT full_name, pro_account_id FROM secretary_accounts WHERE user_id = ${uid}`))[0];
          if (sec && sec.pro_account_id === r.pro_account_id) viewer = { kind: "pro", name: `${sec.full_name} (secrétaire)` };
        }
        if (!viewer && r.consultation_id) {
          const own = Rows(await db.execute(sql`SELECT id FROM consultations WHERE id = ${r.consultation_id} AND user_id = ${uid}`))[0];
          if (own) viewer = { kind: "patient" };
        }
      }
      if (!viewer) return res.status(403).send("Accès refusé");
      // Le patient ne voit que sa version, signée.
      if (viewer.kind !== "pro" && (v === "cabinet" || !r.signed_at)) return res.status(403).send("Accès refusé");

      const [d, pt, doc, rx] = [await loadDoctor(r.pro_account_id), await loadPatient(r), await toDoc(r), await loadPrescription(r.id)];
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      if (v === "cabinet") {
        if (viewer.name && !doc.viewedBy.includes(viewer.name)) {
          await db.execute(sql`UPDATE consult_reports SET viewed_by = array_append(viewed_by, ${viewer.name}) WHERE id = ${id} AND NOT (${viewer.name} = ANY(viewed_by))`);
          doc.viewedBy.push(viewer.name);
        }
        return res.send(renderCabinetReport(d, pt, doc, rx, await evolutionOf(r)));
      }
      if (v === "ordonnance") {
        if (!rx) return res.status(404).send("Pas d'ordonnance pour ce compte rendu");
        return res.send(renderPrescription(d, pt, doc, rx));
      }
      res.send(renderPatientReport(d, pt, doc, rx));
    } catch (e) {
      console.error("[reports view]", e);
      res.status(500).send("Erreur serveur");
    }
  });

  // Vérification publique (pharmacien) : médecin, date, statut. Aucune donnée de santé.
  app.get("/api/verif/:ref", async (req: any, res) => {
    try {
      const n = refNumber(String(req.params.ref));
      if (!n) return res.status(404).json({ message: "Référence inconnue" });
      const r = Rows(await db.execute(sql`
        SELECT cr.id, cr.signed_at, p.full_name, p.license_number, p.specialty_title, p.cabinet_name, p.city,
               rx.ref AS rx_ref, rx.status AS rx_status, rx.signed_at AS rx_signed, rx.revoked_at
        FROM consult_reports cr JOIN pro_accounts p ON p.id = cr.pro_account_id
        LEFT JOIN prescriptions rx ON rx.report_id = cr.id
        WHERE cr.id = ${n.id} AND cr.signed_at IS NOT NULL`))[0];
      if (!r || (n.kind === "ord" && !r.rx_ref)) return res.status(404).json({ message: "Référence inconnue" });
      const isRx = n.kind === "ord";
      res.json({
        ref: isRx ? r.rx_ref : reportRef(r.id),
        kind: isRx ? "ordonnance" : "compte_rendu",
        status: isRx ? (r.rx_status === "revoked" ? "annulee" : "valide") : "signe",
        signedAt: iso(isRx ? r.rx_signed : r.signed_at),
        revokedAt: isRx ? iso(r.revoked_at) : null,
        doctor: {
          name: `Dr ${String(r.full_name || "").replace(/^(dr|pr)\.?\s+/i, "")}`,
          specialty: r.specialty_title || DEFAULT_SPECIALTY,
          onmc: r.license_number || null,
          cabinet: r.cabinet_name || null, city: r.city || null,
        },
      });
    } catch (e) {
      console.error("[verif]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
}
