import crypto from "crypto";

// ════════════════════════════════════════════════════════════════════════
// Chiffrement des secrets stockés en base (jetons DHIS2, secrets de webhook
// des partenaires) : AES-256-GCM, clé dérivée de DHIS2_TOKEN_KEY (variable
// Railway). Sans clé suffisante, rien n'est chiffré ni stocké.
// ════════════════════════════════════════════════════════════════════════

function secretKey(): Buffer {
  const k = process.env.DHIS2_TOKEN_KEY || "";
  if (k.length < 32) throw new Error("DHIS2_TOKEN_KEY manquante ou trop courte");
  return crypto.createHash("sha256").update(k).digest();
}
export const secretKeyReady = () => (process.env.DHIS2_TOKEN_KEY || "").length >= 32;

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}
export function decryptSecret(enc: string): string {
  const [iv, tag, data] = enc.split(".").map((p) => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", secretKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
