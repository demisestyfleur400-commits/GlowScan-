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
