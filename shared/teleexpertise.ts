import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════
// Avis de télé-expertise au format 1b (maquette « Derm Compte Rendu ») :
// la réponse à la question vient en premier, puis le diagnostic retenu et les
// diagnostics à écarter, la conduite à tenir et le délai (norme BAD 2024),
// la qualité des photos et la leçon du cas. Commun aux avis relais et confrères.
// ════════════════════════════════════════════════════════════════════════

export const ORIENTATIONS = ["Pas besoin d'adresser", "Adresser en consultation", "Adresser en urgence"] as const;
export const REVIEW_DELAYS = ["1 semaine", "2 semaines", "4 semaines", "3 mois", "Pas besoin"] as const;
export type PhotoQuality = "bonne" | "moyenne" | "insuffisante";
export const PHOTO_QUALITY_LABEL: Record<PhotoQuality, string> = { bonne: "bonne", moyenne: "moyenne", insuffisante: "insuffisante" };

/** Champs 1b saisis par le dermatologue, en plus du diagnostic. */
export const teleFieldsSchema = z.object({
  ddx: z.string().trim().max(400).optional().default(""),
  plan: z.string().trim().min(2).max(1500),
  orientation: z.string().trim().max(160).optional().default(""),
  reviewIn: z.string().trim().max(40).optional().default(""),
  photoQuality: z.enum(["bonne", "moyenne", "insuffisante"]).optional().nullable(),
  photosSharp: z.number().int().min(0).max(20).optional().nullable(),
});

export const relayCaseRef = (id: number) => `GS-TE-${String(id).padStart(4, "0")}`;

/** « Répondu en 3 h » (ou « en 45 min », « en 2 j »). */
export function answeredIn(from: string | null | undefined, to: string | null | undefined): string | null {
  if (!from || !to) return null;
  const m = Math.max(1, Math.round((+new Date(to) - +new Date(from)) / 60000));
  if (m < 60) return `Répondu en ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `Répondu en ${h} h` : `Répondu en ${Math.round(h / 24)} j`;
}

/** Réponse à la question d'un relais, déduite du verdict. */
export function relayAnswer(verdict: "confirm" | "correct" | null, relayDx: string, dermDx: string | null): string {
  const low = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
  if (verdict === "confirm") return `Je confirme : ${low(relayDx)}.`;
  return `Je corrige : ${low(dermDx || "autre diagnostic")}, pas ${low(relayDx)}.`;
}
