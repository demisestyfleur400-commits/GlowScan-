// ════════════════════════════════════════════════════════════════════════
// Numéros camerounais (+237, 9 chiffres) et détection de l'opérateur Mobile
// Money. Défini une seule fois : formulaire patient, paiement, relances.
// ════════════════════════════════════════════════════════════════════════

export type Operator = "mtn" | "orange";

export const OPERATORS: Record<Operator, { name: string; bg: string; fg: string }> = {
  mtn: { name: "MTN MoMo", bg: "#ffcb05", fg: "#1a1a1a" },
  orange: { name: "Orange Money", bg: "#ff7900", fg: "#1a1a1a" },
};

/** 9 chiffres nationaux (6XXXXXXXX) à partir d'une saisie libre, ou null. */
export function cmNational(input: string | null | undefined): string | null {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("00237")) d = d.slice(5);
  else if (d.startsWith("237") && d.length === 12) d = d.slice(3);
  return /^6\d{8}$/.test(d) ? d : null;
}

/** Format de stockage et d'envoi : 2376XXXXXXXX (sans « + »), ou null si invalide. */
export function normalizeCmPhone(input: string | null | undefined): string | null {
  const n = cmNational(input);
  return n ? `237${n}` : null;
}

/** MTN = 67x, 68x, 650–654 ; Orange = 69x, 655–659 (numéro national à 9 chiffres). */
export function opOf(input: string | null | undefined): Operator | null {
  const d = cmNational(input) ?? String(input || "").replace(/\D/g, "");
  const p2 = +d.slice(0, 2), p3 = +d.slice(0, 3);
  if (p2 === 67 || p2 === 68 || (p3 >= 650 && p3 <= 654)) return "mtn";
  if (p2 === 69 || (p3 >= 655 && p3 <= 659)) return "orange";
  return null;
}

/** « 677 12 45 90 » pour l'affichage. */
export function formatCmPhone(input: string | null | undefined): string {
  const n = cmNational(input);
  return n ? `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}` : String(input || "");
}
