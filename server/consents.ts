// ════════════════════════════════════════════════════════════════════════
// Consentements patient (table consents, migrations/0013_consents.sql).
// Toutes les fonctions sont best-effort : une erreur (ex. migration pas encore
// appliquée) ne bloque jamais l'analyse, et laisse « reminders » à faux par
// défaut, donc aucune relance n'est envoyée sans consentement enregistré.
// ════════════════════════════════════════════════════════════════════════
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { normalizeCmPhone } from "@shared/phone";

const rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];

/** Enregistre le numéro et les choix du patient. Une case non cochée ne retire pas un
 *  consentement déjà donné : le retrait passe par STOP ou par le Profil. */
export async function recordConsent(opts: {
  userId?: string | null;
  phone?: string | null;
  reminders?: boolean;
  research?: boolean | null;
}): Promise<void> {
  const phone = normalizeCmPhone(opts.phone);
  if (!opts.userId && !phone) return;
  const optIn = opts.reminders === true;
  const research = typeof opts.research === "boolean" ? opts.research : null;
  try {
    if (opts.userId) {
      await db.execute(sql`
        INSERT INTO consents (user_id, phone, reminders, research, stopped_at, updated_at)
        VALUES (${opts.userId}, ${phone}, ${optIn}, ${research}, NULL, NOW())
        ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
          phone = COALESCE(EXCLUDED.phone, consents.phone),
          reminders = consents.reminders OR EXCLUDED.reminders,
          stopped_at = CASE WHEN EXCLUDED.reminders THEN NULL ELSE consents.stopped_at END,
          research = COALESCE(EXCLUDED.research, consents.research),
          updated_at = NOW()`);
    } else {
      await db.execute(sql`
        INSERT INTO consents (user_id, phone, reminders, research, stopped_at, updated_at)
        VALUES (NULL, ${phone}, ${optIn}, ${research}, NULL, NOW())
        ON CONFLICT (phone) WHERE user_id IS NULL AND phone IS NOT NULL DO UPDATE SET
          reminders = consents.reminders OR EXCLUDED.reminders,
          stopped_at = CASE WHEN EXCLUDED.reminders THEN NULL ELSE consents.stopped_at END,
          research = COALESCE(EXCLUDED.research, consents.research),
          updated_at = NOW()`);
    }
  } catch (e: any) {
    console.warn("[consents] écriture impossible (migration 0013 appliquée ?) :", e?.message || e);
  }
}

/** STOP : retire le consentement WhatsApp de toutes les lignes portant ce numéro. */
export async function stopReminders(phoneInput: string | null | undefined): Promise<number> {
  const phone = normalizeCmPhone(phoneInput);
  if (!phone) return 0;
  const r = rows(await db.execute(sql`
    UPDATE consents SET reminders = FALSE, stopped_at = NOW(), updated_at = NOW()
    WHERE phone = ${phone} RETURNING id`));
  // Un numéro sans ligne (ancien prospect) : on crée une ligne « STOP » pour qu'il
  // ne soit plus jamais relancé.
  if (r.length === 0) {
    await db.execute(sql`
      INSERT INTO consents (user_id, phone, reminders, stopped_at, updated_at)
      VALUES (NULL, ${phone}, FALSE, NOW(), NOW())
      ON CONFLICT (phone) WHERE user_id IS NULL AND phone IS NOT NULL DO UPDATE SET
        reminders = FALSE, stopped_at = NOW(), updated_at = NOW()`);
    return 1;
  }
  return r.length;
}


// ── Lien signé « A répondu STOP » (email du mercredi) ─────────────────────
// Pour les relances envoyées à la main depuis le téléphone du fondateur : le STOP
// arrive sur ce téléphone, pas au serveur. Le lien ouvre une page de confirmation
// (POST), pour qu'un antivirus qui précharge les liens ne déclenche rien.
const LINK_SECRET = process.env.SESSION_SECRET || process.env.DATASET_EXPORT_SALT || "";
export function stopLinkSig(phone: string): string {
  return crypto.createHmac("sha256", LINK_SECRET || "glowscan-stop").update(`stop:${phone}`).digest("hex").slice(0, 32);
}
export function verifyStopLinkSig(phone: string, sig: string): boolean {
  if (!LINK_SECRET || !phone || !sig) return false;
  const a = Buffer.from(stopLinkSig(phone)), b = Buffer.from(String(sig));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Rappels de suivi demandés par un médecin (« ARRÊT SUIVI ») ─────────────
// Coupe UNIQUEMENT ces rappels. Seul le patient peut les réactiver (Profil).

/** « ARRÊT SUIVI » reçu : désactive les rappels de suivi de ce numéro. */
export async function stopFollowups(phoneInput: string | null | undefined): Promise<void> {
  const phone = normalizeCmPhone(phoneInput);
  if (!phone) return;
  const r = rows(await db.execute(sql`
    UPDATE consents SET followups = FALSE, followups_stopped_at = NOW(), updated_at = NOW()
    WHERE phone = ${phone} RETURNING id`));
  if (r.length === 0) {
    await db.execute(sql`
      INSERT INTO consents (user_id, phone, followups, followups_stopped_at, updated_at)
      VALUES (NULL, ${phone}, FALSE, NOW(), NOW())
      ON CONFLICT (phone) WHERE user_id IS NULL AND phone IS NOT NULL DO UPDATE SET
        followups = FALSE, followups_stopped_at = NOW(), updated_at = NOW()`);
  }
}

/** Date d'arrêt des rappels de suivi pour ce patient (numéro ou compte), sinon null. */
export async function followupsStoppedAt(opts: { phone?: string | null; userId?: string | null }): Promise<Date | null> {
  const phone = normalizeCmPhone(opts.phone);
  if (!phone && !opts.userId) return null;
  try {
    const r = rows(await db.execute(sql`
      SELECT max(followups_stopped_at) AS at FROM consents
      WHERE followups = FALSE AND (${phone}::text IS NOT NULL AND phone = ${phone} OR ${opts.userId ?? null}::text IS NOT NULL AND user_id = ${opts.userId ?? null})`))[0];
    return r?.at ? new Date(r.at) : null;
  } catch { return null; } // migration 0015 pas encore appliquée : rien n'est bloqué
}

/** Réactivation par le patient lui-même (Profil) : son compte et tous ses numéros connus. */
export async function resumeFollowups(userId: string, phones: string[] = []): Promise<void> {
  await db.execute(sql`
    UPDATE consents SET followups = TRUE, followups_stopped_at = NULL, updated_at = NOW()
    WHERE user_id = ${userId}`);
  for (const phone of phones) {
    await db.execute(sql`
      UPDATE consents SET followups = TRUE, followups_stopped_at = NULL, updated_at = NOW()
      WHERE phone = ${phone}`);
  }
}
