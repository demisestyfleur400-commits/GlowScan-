// ════════════════════════════════════════════════════════════════════════
// Répartitions des paiements — UNE SEULE source de vérité (README §5).
// Consultation B2C : 80 % médecin, 20 % GlowScan.
// Avis de télé-expertise (relais) : 60 % dermatologue, 20 % relais, 20 % GlowScan.
// Montants toujours en FCFA entiers.
// ════════════════════════════════════════════════════════════════════════

export const SPLITS = {
  consultation: { pro: 80, platform: 20 },
  relay: { derm: 60, relay: 20, platform: 20 },
} as const;

/** Part plateforme arrondie à l'entier ; le reste va au médecin (la somme vaut toujours le prix). */
export function splitConsultation(priceFcfa: number): { pro: number; platform: number } {
  const platform = Math.round((priceFcfa * SPLITS.consultation.platform) / 100);
  return { pro: priceFcfa - platform, platform };
}
