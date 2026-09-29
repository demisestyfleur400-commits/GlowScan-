import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./db";

// ════════════════════════════════════════════════════════════════════════
// Code de signature à 4 chiffres du médecin (README §4, point 1).
// « Votre code à 4 chiffres vaut signature. » Haché (bcrypt), jamais renvoyé.
// 5 essais faux en 15 min → blocage 15 min (en mémoire, par compte).
// ════════════════════════════════════════════════════════════════════════

export const SIGN_PIN_RE = /^\d{4}$/;
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map<number, { n: number; until: number }>();

export type PinCheck = "ok" | "not_set" | "invalid" | "locked";

const rowsOf = (r: any) => (r?.rows ?? r ?? []) as any[];

export async function hasSignPin(proId: number): Promise<boolean> {
  const r = rowsOf(await db.execute(sql`SELECT sign_pin_hash FROM pro_accounts WHERE id = ${proId}`))[0];
  return !!r?.sign_pin_hash;
}

export async function verifySignPin(proId: number, pin: unknown): Promise<PinCheck> {
  const f = fails.get(proId);
  if (f && f.n >= MAX_FAILS && f.until > Date.now()) return "locked";
  const r = rowsOf(await db.execute(sql`SELECT sign_pin_hash FROM pro_accounts WHERE id = ${proId}`))[0];
  if (!r?.sign_pin_hash) return "not_set";
  const ok = typeof pin === "string" && SIGN_PIN_RE.test(pin) && (await bcrypt.compare(pin, r.sign_pin_hash));
  if (ok) { fails.delete(proId); return "ok"; }
  const cur = f && f.until > Date.now() ? f : { n: 0, until: Date.now() + WINDOW_MS };
  fails.set(proId, { n: cur.n + 1, until: cur.until });
  return cur.n + 1 >= MAX_FAILS ? "locked" : "invalid";
}

/** Définit ou change le code. Le changement exige l'ancien code. */
export async function setSignPin(proId: number, pin: string, currentPin?: string): Promise<PinCheck | "bad_format"> {
  if (!SIGN_PIN_RE.test(pin)) return "bad_format";
  if (await hasSignPin(proId)) {
    const c = await verifySignPin(proId, currentPin);
    if (c !== "ok") return c;
  }
  const hash = await bcrypt.hash(pin, 10);
  await db.execute(sql`UPDATE pro_accounts SET sign_pin_hash = ${hash}, sign_pin_set_at = NOW() WHERE id = ${proId}`);
  return "ok";
}

export const PIN_MESSAGES: Record<Exclude<PinCheck, "ok"> | "bad_format", { status: number; code: string; message: string }> = {
  not_set: { status: 428, code: "SIGN_PIN_SETUP", message: "Choisissez d'abord votre code de signature à 4 chiffres." },
  invalid: { status: 401, code: "SIGN_PIN_INVALID", message: "Code de signature incorrect." },
  locked: { status: 429, code: "SIGN_PIN_LOCKED", message: "Trop d'essais. Réessayez dans 15 minutes." },
  bad_format: { status: 400, code: "SIGN_PIN_FORMAT", message: "Le code doit comporter exactement 4 chiffres." },
};
