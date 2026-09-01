import cron from "node-cron";
import webpush from "web-push";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendWhatsAppText, buildFollowUpReminderMessage } from "./whatsapp";
import { sendEmail, buildTrialReminderEmail, buildDigestEmail, buildReengageEmail, buildB2CReengageEmail } from "./email";

const fn = (s: string) => (s || "").split(" ")[0];

// 4 · Rappels de fin d'essai (J-3 et J-1). Quotidien.
async function sendTrialReminders() {
  try {
    const r: any = await db.execute(sql`
      SELECT p."full_name", p."trial_ends_at", u."email", u."first_name"
      FROM "pro_accounts" p JOIN "users" u ON u."id" = p."user_id"
      WHERE p."subscription_status" = 'trial' AND p."trial_ends_at" > NOW()
        AND p."trial_ends_at" < NOW() + INTERVAL '4 days'`);
    const rows = (r?.rows ?? r ?? []) as any[];
    let sent = 0;
    for (const row of rows) {
      if (!row.email || String(row.email).endsWith("@phone.glowscan.cm")) continue;
      const daysLeft = Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / 86400000);
      if (daysLeft !== 3 && daysLeft !== 1) continue; // 2 rappels max
      const e = buildTrialReminderEmail(fn(row.full_name || row.first_name), daysLeft);
      const out = await sendEmail(row.email, e.subject, e.html, e.text);
      if (out.ok) sent++;
    }
    log(`✅ Rappels fin d'essai : ${sent} envoyés`);
  } catch (err) { log(`❌ Erreur rappels essai : ${err instanceof Error ? err.message : String(err)}`); }
}

// 8 · Ré-engagement des inactifs (~15 jours sans connexion). Quotidien.
async function sendReengagement() {
  try {
    const r: any = await db.execute(sql`
      SELECT u."id", u."email", u."first_name", p."full_name"
      FROM "pro_accounts" p JOIN "users" u ON u."id" = p."user_id"
      WHERE u."last_login" IS NOT NULL
        AND u."last_login" < NOW() - INTERVAL '15 days'
        AND u."last_login" > NOW() - INTERVAL '16 days'
        AND COALESCE(u."email_opt_out", FALSE) = FALSE`);
    const rows = (r?.rows ?? r ?? []) as any[];
    let sent = 0;
    for (const row of rows) {
      if (!row.email || String(row.email).endsWith("@phone.glowscan.cm")) continue;
      const e = buildReengageEmail(fn(row.full_name || row.first_name), 15, row.id);
      const out = await sendEmail(row.email, e.subject, e.html, e.text);
      if (out.ok) sent++;
    }
    log(`✅ Ré-engagement dermato : ${sent} envoyés`);
  } catch (err) { log(`❌ Erreur ré-engagement : ${err instanceof Error ? err.message : String(err)}`); }
}

// B2C · Ré-engagement patients inactifs (~15j). Plafonné (délivrabilité + volume).
// Exclut les dermatos (pro_accounts), les téléphones, et les désabonnés.
async function sendB2CReengagement() {
  try {
    const r: any = await db.execute(sql`
      SELECT u."id", u."email", u."first_name"
      FROM "users" u
      WHERE u."last_login" IS NOT NULL
        AND u."last_login" < NOW() - INTERVAL '15 days'
        AND u."last_login" > NOW() - INTERVAL '16 days'
        AND u."email" IS NOT NULL AND u."email" NOT LIKE '%@phone.glowscan.cm'
        AND COALESCE(u."email_opt_out", FALSE) = FALSE
        AND NOT EXISTS (SELECT 1 FROM "pro_accounts" p WHERE p."user_id" = u."id")
      LIMIT 60`);
    const rows = (r?.rows ?? r ?? []) as any[];
    let sent = 0;
    for (const row of rows) {
      const e = buildB2CReengageEmail(fn(row.first_name), row.id);
      const out = await sendEmail(row.email, e.subject, e.html, e.text);
      if (out.ok) sent++;
    }
    log(`✅ Ré-engagement B2C : ${sent}/${rows.length} envoyés`);
  } catch (err) { log(`❌ Erreur ré-engagement B2C : ${err instanceof Error ? err.message : String(err)}`); }
}

// 6 · Digest mensuel d'activité. Le 1er du mois.
async function sendMonthlyDigest() {
  try {
    const accs: any = await db.execute(sql`
      SELECT p."id", p."full_name", u."id" AS uid, u."email", u."first_name"
      FROM "pro_accounts" p JOIN "users" u ON u."id" = p."user_id"
      WHERE u."email" IS NOT NULL AND u."email" NOT LIKE '%@phone.glowscan.cm'
        AND COALESCE(u."email_opt_out", FALSE) = FALSE`);
    const rows = (accs?.rows ?? accs ?? []) as any[];
    const now = new Date();
    const monthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    let sent = 0;
    for (const row of rows) {
      const pc: any = await db.execute(sql`SELECT COUNT(*)::int AS n FROM "patients" WHERE "dermatologist_id" = ${row.id}`);
      const patients = (pc?.rows ?? pc ?? [])[0]?.n || 0;
      const ac: any = await db.execute(sql`
        SELECT COUNT(*)::int AS n FROM "scans" s JOIN "patients" pt ON pt."id" = s."patient_id"
        WHERE pt."dermatologist_id" = ${row.id}
          AND s."created_at" >= date_trunc('month', NOW() - INTERVAL '1 month')
          AND s."created_at" < date_trunc('month', NOW())`);
      const analyses = (ac?.rows ?? ac ?? [])[0]?.n || 0;
      if (patients === 0 && analyses === 0) continue; // pas de digest vide
      const e = buildDigestEmail(fn(row.full_name || row.first_name), { patients, analyses }, monthLabel, row.uid);
      const out = await sendEmail(row.email, e.subject, e.html, e.text);
      if (out.ok) sent++;
    }
    log(`✅ Digest mensuel : ${sent} envoyés`);
  } catch (err) { log(`❌ Erreur digest mensuel : ${err instanceof Error ? err.message : String(err)}`); }
}

// ── Rappels de contrôle (suivi évolution) : envoie un WhatsApp au patient quand
// la date programmée (follow_up_at) est atteinte. Marque comme envoyé (anti-doublon).
async function sendFollowUpReminders() {
  log("🔔 Envoi rappels de contrôle (suivi évolution)...");
  try {
    const r: any = await db.execute(sql`
      SELECT p."id", p."first_name", p."last_name", p."whatsapp_number", p."follow_up_message",
             a."full_name" AS dermato_name
      FROM "patients" p
      LEFT JOIN "pro_accounts" a ON a."id" = p."dermatologist_id"
      WHERE p."follow_up_at" IS NOT NULL
        AND p."follow_up_at" <= NOW()
        AND COALESCE(p."follow_up_reminder_sent", FALSE) = FALSE
      LIMIT 200
    `);
    const rows = (r?.rows ?? r ?? []) as any[];
    let sent = 0;
    for (const row of rows) {
      const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "cher patient";
      const msg = buildFollowUpReminderMessage(name, row.dermato_name || "votre dermatologue", row.follow_up_message);
      const out = await sendWhatsAppText(row.whatsapp_number, msg);
      // Marqué envoyé même si Twilio absent (évite le spam de tentatives) — le
      // dermato garde le bouton "Envoyer maintenant / lien WhatsApp" côté dossier.
      await db.execute(sql`UPDATE "patients" SET "follow_up_reminder_sent" = TRUE WHERE "id" = ${row.id}`).catch(() => {});
      if (out.ok) sent++;
    }
    log(`✅ Rappels de contrôle : ${sent}/${rows.length} envoyés (WhatsApp)`);
  } catch (err) {
    log(`❌ Erreur rappels de contrôle : ${err instanceof Error ? err.message : String(err)}`);
  }
}

function log(msg: string) {
  const t = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`[cron ${t}] ${msg}`);
}

async function sendPushToUsers(userIds: Set<string>, notification: { title: string; body: string; url: string }) {
  try {
    const allSubs = await storage.getAllActivePushSubscriptions();
    const targetSubs = allSubs.filter((sub) => sub.userId && userIds.has(sub.userId));
    let sent = 0;
    let failed = 0;
    
    for (const sub of targetSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...notification, icon: "/icon-192.png" })
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }
    return { sent, failed };
  } catch (err) {
    log(`❌ Erreur lors de la récupération ou de l'envoi des abonnements Push: ${err}`);
    return { sent: 0, failed: 0 };
  }
}

// J+2 — Ta peau a évolué
async function sendDay2Reminders() {
  log("🔔 Envoi rappels J+2...");
  try {
    const stale2 = await storage.getUsersWithStaleScans(2);
    const stale3 = await storage.getUsersWithStaleScans(3);
    const stale3Ids = new Set(stale3.map((u) => u.userId));
    const day2Only = stale2.filter((u) => u.userId && !stale3Ids.has(u.userId) && !u.userId.includes(":"));
    const ids = new Set(day2Only.map((u) => u.userId));
    
    if (ids.size === 0) {
      log("✅ J+2 : Aucun utilisateur concerné aujourd'hui.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(ids, {
      title: "🌸 Ta peau a évolué",
      body: "Viens voir ! 2 jours se sont écoulés depuis ton dernier scan.",
      url: "/analyze",
    });
    log(`✅ J+2 : ${sent} envoyés, ${failed} échecs (${day2Only.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels J+2 : ${err}`);
  }
}

// J+7 — Essaie SkinBot
async function sendDay7SkinBotReminders() {
  log("🔔 Envoi rappels J+7 SkinBot...");
  try {
    const stale7 = await storage.getUsersWithStaleScans(7);
    const stale8 = await storage.getUsersWithStaleScans(8);
    const stale8Ids = new Set(stale8.map((u) => u.userId));
    const day7Only = stale7.filter((u) => u.userId && !stale8Ids.has(u.userId) && !u.userId.includes(":"));
    const ids = new Set(day7Only.map((u) => u.userId));

    if (ids.size === 0) {
      log("✅ J+7 SkinBot : Aucun utilisateur concerné aujourd'hui.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(ids, {
      title: "🤖 SkinBot t'attend",
      body: "Tu n'as pas encore essayé SkinBot — pose ta première question gratuite !",
      url: "/chat",
    });
    log(`✅ J+7 SkinBot : ${sent} envoyés, ${failed} échecs (${day7Only.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels J+7 : ${err}`);
  }
}

// J+14 — Suivi 2 semaines prêt
async function sendDay14Reminders() {
  log("🔔 Envoi rappels J+14...");
  try {
    const stale14 = await storage.getUsersWithStaleScans(14);
    const stale15 = await storage.getUsersWithStaleScans(15);
    const stale15Ids = new Set(stale15.map((u) => u.userId));
    const day14Only = stale14.filter((u) => u.userId && !stale15Ids.has(u.userId) && !u.userId.includes(":"));
    const ids = new Set(day14Only.map((u) => u.userId));

    if (ids.size === 0) {
      log("✅ J+14 : Aucun utilisateur concerné aujourd'hui.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(ids, {
      title: "📈 Ton suivi de 2 semaines est prêt",
      body: "Reviens voir tes progrès — ta peau a sûrement changé en 14 jours.",
      url: "/profile?tab=evolution",
    });
    log(`✅ J+14 : ${sent} envoyés, ${failed} échecs (${day14Only.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels J+14 : ${err}`);
  }
}

// Rappels produits 72h (commande WhatsApp)
async function sendProductReminders() {
  log("🛍️ Envoi des rappels produits 72h...");
  try {
    const usersList = await storage.getUsersWithScansBetweenHours(60, 84);
    const filteredUsers = usersList.filter((u) => u.userId && !u.userId.includes(":"));
    const userIds = new Set(filteredUsers.map((u) => u.userId));

    if (userIds.size === 0) {
      log("✅ Rappels produits 72h : Aucun utilisateur concerné.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(userIds, {
      title: "🌟 Tes produits t'attendent !",
      body: "Tu as reçu ta routine il y a 3 jours. Tes produits sont encore disponibles — commande maintenant !",
      url: "/",
    });
    log(`✅ Rappels produits 72h : ${sent} envoyés, ${failed} échecs (${filteredUsers.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels produits : ${err}`);
  }
}

// Rappels routine matin/soir — Vérification par minute
async function sendRoutineReminders(currentHHMM: string) {
  let routinesToCheck = [];
  try {
    routinesToCheck = await storage.getAllRoutinesWithUserAndSteps();
  } catch (dbErr: any) {
    // ✅ CORRECTION 1: Gestion gracieuse de l'erreur "Tenant or user not found"
    if (dbErr.message?.includes("Tenant") || dbErr.message?.includes("user not found")) {
      log(`⚠️ Aucun utilisateur/tenant trouvé — routines indisponibles`);
      return;
    }
    log(`❌ Erreur critique lors de la récupération des routines de la DB : ${dbErr}`);
    return;
  }

  const matching = routinesToCheck.filter((r) => 
    r.reminderEnabled && 
    r.reminderTime === currentHHMM && 
    r.steps.length > 0 &&
    r.userId &&
    !r.userId.includes(":")
  );

  if (matching.length === 0) return;

  let successfullySentCount = 0;

  for (const r of matching) {
    try {
      const period = r.period === "morning" ? "matin" : "soir";
      const emoji = r.period === "morning" ? "✨" : "🌙";
      
      const { sent } = await sendPushToUsers(new Set([r.userId]), {
        title: `C'est l'heure de ta routine ${period} ${emoji}`,
        body: "Ta peau compte sur toi !",
        url: "/routine",
      });
      
      if (sent > 0) successfullySentCount++;
    } catch (userErr) {
      // Si un utilisateur précis crash (ex: profil supprimé ou inexistant côté tenant), on log et on passe au suivant
      log(`⚠️ Impossible d'envoyer la notification pour l'utilisateur ${r.userId} : ${userErr}`);
    }
  }

  if (successfullySentCount > 0) {
    log(`🔔 Rappels routine ${currentHHMM} : ${successfullySentCount} envoyés avec succès`);
  }
}

// À 22h00 : check routines soir non complétées
async function sendEveningMissedReminders() {
  log("🌙 Vérification des routines du soir manquées...");
  try {
    const all = await storage.getAllRoutinesWithUserAndSteps();
    const evening = all.filter((r) => r.period === "evening" && r.steps.length > 0 && r.userId && !r.userId.includes(":"));
    if (evening.length === 0) return;
    
    const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10); // Fuseau Douala

    let sent = 0;
    for (const r of evening) {
      try {
        const completions = await storage.getCompletionsForDate(r.userId, today);
        const stepIds = new Set(r.steps.map((s) => s.id));
        const doneCount = completions.filter((c) => stepIds.has(c.stepId)).length;
        if (doneCount < r.steps.length) {
          await sendPushToUsers(new Set([r.userId]), {
            title: "Tu n'as pas fait ta routine ce soir 🌙",
            body: "Ta peau en a besoin — coche tes étapes maintenant.",
            url: "/routine",
          });
          sent++;
        }
      } catch (innerErr) {
        log(`⚠️ Erreur routine manquée pour l'user ${r.userId} : ${innerErr}`);
      }
    }
    log(`🌙 Rappels routine soir manquée : ${sent} envoyés`);
  } catch (err) {
    log(`❌ Erreur globale rappels soir manquée : ${err}`);
  }
}

// ── SUIVI CONSULTATION — rappel J-1 (la veille) : triple canal GARANTI ──
// Push + Email + WhatsApp, aux DEUX parties. Le WhatsApp part TOUJOURS (backup).
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
async function sendConsultationFollowUps() {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS follow_up_reminders (
      id serial PRIMARY KEY, consultation_id integer, patient_id text, dermatologue_id integer,
      scheduled_date date NOT NULL, option varchar(20), status varchar(20) DEFAULT 'pending',
      push_sent_at timestamptz, email_sent_at timestamptz, whatsapp_sent_at timestamptz,
      photo_received_at timestamptz, created_at timestamptz DEFAULT now()
    )`).catch(() => {});
    const r: any = await db.execute(sql`
      SELECT f.id, f.consultation_id, f.patient_id,
             c.condition, c.patient_phone,
             u.first_name AS patient_first, u.email AS patient_email,
             p.full_name AS derm_name, p.user_id AS derm_user_id,
             du.email AS derm_email
      FROM follow_up_reminders f
      JOIN consultations c ON c.id = f.consultation_id
      LEFT JOIN users u ON u.id = f.patient_id
      LEFT JOIN pro_accounts p ON p.id = f.dermatologue_id
      LEFT JOIN users du ON du.id = p.user_id
      WHERE f.scheduled_date = (CURRENT_DATE + INTERVAL '1 day')::date
        AND f.status = 'pending'
      LIMIT 200`);
    const rows = (r?.rows ?? r ?? []) as any[];
    if (!rows.length) { log("📅 Suivi J-1 : aucun rappel aujourd'hui"); return; }
    let done = 0;
    for (const row of rows) {
      const pName = fn(row.patient_first || "") || "cher patient";
      const dName = (row.derm_name || "votre dermatologue").replace(/^dr\.?\s*/i, "");
      const cond = row.condition || "votre peau";
      const photoUrl = `${PUBLIC_BASE}/consultations`;
      // 1) Push dermatologue (reste affiché jusqu'à interaction)
      if (row.derm_user_id) await sendPushToUsers(new Set([row.derm_user_id]), {
        title: "Suivi prévu demain", body: `${pName} · ${cond}\nSuivi programmé pour demain.`,
        url: `/derm/consultations?c=${row.consultation_id}`, requireInteraction: true,
      } as any);
      // 2) Push patient
      if (row.patient_id) await sendPushToUsers(new Set([row.patient_id]), {
        title: `Dr ${dName} souhaite voir l'évolution`, body: "Prenez une photo de la zone traitée et envoyez-la via GlowScan.",
        url: "/consultations",
      } as any);
      // 3) Email dermatologue
      if (row.derm_email) {
        try { await sendEmail(row.derm_email, `Rappel suivi — ${pName} · demain`,
          `<p>Bonjour Dr ${dName},</p><p>Rappel : le suivi de <strong>${pName}</strong> (${cond}) est prévu <strong>demain</strong>.</p><p><a href="${PUBLIC_BASE}/derm/consultations?c=${row.consultation_id}">Ouvrir le dossier →</a></p>`,
          `Suivi de ${pName} demain. ${PUBLIC_BASE}/derm/consultations?c=${row.consultation_id}`); } catch {}
      }
      // 4) Email patient
      if (row.patient_email && !String(row.patient_email).endsWith("@phone.glowscan.cm")) {
        try { await sendEmail(row.patient_email, `Votre suivi avec Dr ${dName} — demain`,
          `<p>Bonjour ${pName},</p><p>Dr ${dName} souhaite voir l'évolution de votre peau <strong>demain</strong>. Prenez une photo de la zone traitée et envoyez-la via GlowScan.</p><p><a href="${photoUrl}">Envoyer ma photo →</a></p>`,
          `Suivi demain avec Dr ${dName}. Envoyez votre photo : ${photoUrl}`); } catch {}
      }
      // 5) WhatsApp patient — BACKUP OBLIGATOIRE (part toujours)
      if (row.patient_phone) {
        const msg = `Bonjour ${pName}, Dr ${dName} souhaite voir l'évolution de votre peau demain.\nPrenez une photo de la zone traitée et envoyez-la ici : ${photoUrl}`;
        try { await sendWhatsAppText(row.patient_phone, msg); } catch {}
      }
      // 6) status = notified
      try { await db.execute(sql`UPDATE follow_up_reminders SET status = 'notified', push_sent_at = now(), email_sent_at = now(), whatsapp_sent_at = now() WHERE id = ${row.id}`); } catch {}
      done++;
    }
    log(`📅 Suivi J-1 : ${done}/${rows.length} rappels envoyés (push+email+WhatsApp)`);
  } catch (err) {
    log(`❌ Erreur suivi J-1 : ${err}`);
  }
}

// ── AGENDA — rappel H-2 (2 h avant le RDV) : push + WhatsApp (backup) ──
async function sendAppointmentH2Reminders() {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS appointments (
      id serial PRIMARY KEY, dermatologue_id integer, patient_id text, patient_name varchar(100),
      patient_contact varchar(50), appointment_date timestamptz NOT NULL, duration_minutes integer DEFAULT 30,
      type varchar(20) DEFAULT 'consultation', priority varchar(10) DEFAULT 'normal', notes text,
      status varchar(20) DEFAULT 'scheduled', reminder_h2_sent boolean DEFAULT false, created_at timestamptz DEFAULT now()
    )`).catch(() => {});
    const r: any = await db.execute(sql`
      SELECT a.*, p.full_name AS derm_name, p.user_id AS derm_user_id
      FROM appointments a LEFT JOIN pro_accounts p ON p.id = a.dermatologue_id
      WHERE a.appointment_date BETWEEN NOW() + INTERVAL '1 hour 50 minutes' AND NOW() + INTERVAL '2 hours 10 minutes'
        AND a.reminder_h2_sent = false AND a.status IN ('scheduled','confirmed')
      LIMIT 200`);
    const rows = (r?.rows ?? r ?? []) as any[];
    if (!rows.length) return;
    let done = 0;
    for (const a of rows) {
      const heure = new Date(a.appointment_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });
      const dName = (a.derm_name || "votre dermatologue").replace(/^dr\.?\s*/i, "");
      const pName = fn(a.patient_name || "") || "Patient";
      const lieu = a.type === "glowscan" ? "Consultation en ligne" : "au cabinet";
      // 1) Push dermatologue
      if (a.derm_user_id) await sendPushToUsers(new Set([a.derm_user_id]), {
        title: "RDV dans 2 heures", body: `${pName} · ${heure} · ${a.type}`, url: "/derm/agenda", requireInteraction: true,
      } as any);
      // 2) Push patient (si compte lié)
      if (a.patient_id) await sendPushToUsers(new Set([a.patient_id]), {
        title: `Rappel RDV Dr ${dName}`, body: `Votre RDV est dans 2 heures. ${heure} · ${lieu}`, url: "/",
      } as any);
      // 3) WhatsApp patient (backup — part toujours si numéro)
      if (a.patient_contact) {
        const msg = `Bonjour ${pName}, rappel : votre RDV avec Dr ${dName} est dans 2 heures.\nÀ ${heure}. ${lieu}.`;
        try { await sendWhatsAppText(a.patient_contact, msg); } catch {}
      }
      try { await db.execute(sql`UPDATE appointments SET reminder_h2_sent = true WHERE id = ${a.id}`); } catch {}
      done++;
    }
    log(`⏰ Rappels RDV H-2 : ${done}/${rows.length} envoyés`);
  } catch (err) {
    log(`❌ Erreur rappels RDV H-2 : ${err}`);
  }
}

export function startCronJobs() {
  // ✅ CORRECTION 2: Skip en mode test
  if (process.env.NODE_ENV === "test") {
    log("⏭️ Crons désactivés en mode test");
    return;
  }

  // ✅ CORRECTION 3: Vérification de DATABASE_URL au démarrage
  // Évite les crash au démarrage si la DB n'est pas configurée
  if (!process.env.GLOWSCAN_DB && !process.env.SUPABASE_URL && !process.env.DATABASE_URL) {
    log("⚠️ SUPABASE_URL non configurée — crons désactivés pour éviter les erreurs");
    return;
  }

  // ✅ Rappels routines — chaque minute
  cron.schedule("* * * * *", () => {
    const doualaDate = new Date(Date.now() + 3600000);
    const hh = String(doualaDate.getHours()).padStart(2, "0");
    const mm = String(doualaDate.getMinutes()).padStart(2, "0");
    sendRoutineReminders(`${hh}:${mm}`);
  }, { timezone: "Africa/Douala" });
  //log("✅ Cron rappels routines actif — chaque minute (Douala)");

  //cron.schedule("0 22 * * *", sendEveningMissedReminders, { timezone: "Africa/Douala" });
  log("✅ Cron rappel soir non complétée actif — 22h00 (Douala)");

  //cron.schedule("0 9 * * *", sendDay2Reminders, { timezone: "Africa/Douala" });
  log("✅ Cron J+2 actif — tous les jours à 9h00 (Douala)");

  //cron.schedule("30 9 * * *", sendDay7SkinBotReminders, { timezone: "Africa/Douala" });
  //log("✅ Cron J+7 SkinBot actif — tous les jours à 9h30 (Douala)");

  //cron.schedule("0 10 * * *", sendDay14Reminders, { timezone: "Africa/Douala" });
  log("✅ Cron J+14 actif — tous les jours à 10h00 (Douala)");

  //cron.schedule("30 10 * * *", sendProductReminders, { timezone: "Africa/Douala" });
  //log("✅ Cron rappels produits 72h actif — tous les jours à 10h30 (Douala)");

  // ✅ Rappels de contrôle DERM (suivi évolution) — tous les jours à 9h00 (Douala)
  cron.schedule("0 9 * * *", sendFollowUpReminders, { timezone: "Africa/Douala" });
  log("✅ Cron rappels de contrôle DERM actif — 9h00 (Douala)");

  // ✅ Suivi consultation J-1 (triple canal) — tous les jours à 8h00 (Douala)
  cron.schedule("0 8 * * *", sendConsultationFollowUps, { timezone: "Africa/Douala" });
  log("✅ Cron suivi consultation J-1 actif — 8h00 (Douala)");

  // ✅ Rappels RDV agenda H-2 — toutes les 15 minutes
  cron.schedule("*/15 * * * *", sendAppointmentH2Reminders, { timezone: "Africa/Douala" });
  log("✅ Cron rappels RDV H-2 actif — toutes les 15 min (Douala)");

  // ✅ Emails DERM automatiques
  cron.schedule("0 8 * * *", sendTrialReminders, { timezone: "Africa/Douala" });   // fin d'essai J-3/J-1
  cron.schedule("30 10 * * *", sendReengagement, { timezone: "Africa/Douala" });   // dermatos inactifs ~15j
  cron.schedule("0 11 * * *", sendB2CReengagement, { timezone: "Africa/Douala" });  // patients B2C inactifs ~15j (plafonné 60/j)
  cron.schedule("0 9 1 * *", sendMonthlyDigest, { timezone: "Africa/Douala" });    // digest le 1er du mois
  log("✅ Crons emails DERM actifs — essai (8h), ré-engagement (10h30), digest (1er du mois 9h)");
}
