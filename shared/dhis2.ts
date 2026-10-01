import { RELAY_DISEASES, diseaseLabel } from "./relay";

// ════════════════════════════════════════════════════════════════════════
// DHIS2 (étape 15) : clés GlowScan à faire correspondre aux data elements et
// category option combos fournis par le point focal du district ou du ministère.
// Seuls des agrégats sortent ; toute valeur inférieure à 3 est masquée.
// ════════════════════════════════════════════════════════════════════════

export const DHIS2_MASK_MIN = 3;
export const AGE_BANDS = ["0-4", "5-14", "15-49", "50+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export const SEXES = ["F", "M"] as const;
export const ageBandOf = (age: number | null | undefined): AgeBand | null =>
  age == null || age < 0 ? null : age < 5 ? "0-4" : age < 15 ? "5-14" : age < 50 ? "15-49" : "50+";
export const UID_RE = /^[A-Za-z][A-Za-z0-9]{10}$/;

/** Toutes les clés du programme (maladies suivies, ou toutes si aucune). */
export function dhis2Keys(diseaseCodes: string[]): string[] {
  const codes = (diseaseCodes.length ? diseaseCodes : RELAY_DISEASES.map((d) => d.code)).filter((c) => c !== "autre");
  const keys: string[] = [];
  for (const c of codes) for (const s of SEXES) for (const a of AGE_BANDS) keys.push(`disease:${c}:${s}:${a}`);
  for (const s of SEXES) for (const a of AGE_BANDS) keys.push(`urgent:${s}:${a}`);
  keys.push("referral:referred", "referral:arrived", "agents:trained");
  return keys;
}

export function dhis2KeyLabel(key: string): string {
  const p = key.split(":");
  const sa = (s: string, a: string) => `${s === "F" ? "femmes" : "hommes"}, ${a} ans`;
  if (p[0] === "disease") return `Cas de ${diseaseLabel(p[1]).toLowerCase()} · ${sa(p[2], p[3])}`;
  if (p[0] === "urgent") return `Avis urgents · ${sa(p[1], p[2])}`;
  if (key === "referral:referred") return "Orientations vers l'hôpital";
  if (key === "referral:arrived") return "Arrivées confirmées à l'hôpital";
  if (key === "agents:trained") return "Agents formés (module photo validé)";
  return key;
}

/** Mois précédent au format DHIS2 (AAAAMM), heure de Douala. */
export function previousPeriod(now = new Date()): string {
  const d = new Date(now.getTime() + 3600000);
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
