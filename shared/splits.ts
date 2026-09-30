// ════════════════════════════════════════════════════════════════════════
// Répartitions des paiements — UNE SEULE source de vérité (README §5).
// Consultation B2C : 80 % médecin, 20 % GlowScan.
// Avis de télé-expertise (relais) : 60 % dermatologue, 20 % relais, 20 % GlowScan.
// Montants toujours en FCFA entiers.
// ════════════════════════════════════════════════════════════════════════

export const SPLITS = {
  consultation: { pro: 80, platform: 20 },
  relay: { derm: 60, relay: 20, platform: 20 },
  peer: { peer: 80, platform: 20 },
} as const;

/** Part plateforme arrondie à l'entier ; le reste va au médecin (la somme vaut toujours le prix). */
export function splitConsultation(priceFcfa: number): { pro: number; platform: number } {
  const platform = Math.round((priceFcfa * SPLITS.consultation.platform) / 100);
  return { pro: priceFcfa - platform, platform };
}

/** Avis de télé-expertise : 60 % dermatologue, 20 % relais, 20 % GlowScan (arrondis ; la somme vaut le prix). */
export function splitRelay(priceFcfa: number): { derm: number; relay: number; platform: number } {
  const relay = Math.round((priceFcfa * SPLITS.relay.relay) / 100);
  const platform = Math.round((priceFcfa * SPLITS.relay.platform) / 100);
  return { derm: priceFcfa - relay - platform, relay, platform };
}

/** Avis entre confrères : 80 % au confrère qui répond, 20 % à GlowScan (somme = prix). */
export function splitPeer(priceFcfa: number): { peer: number; platform: number } {
  const platform = Math.round((priceFcfa * SPLITS.peer.platform) / 100);
  return { peer: priceFcfa - platform, platform };
}

/** Numéros Mobile Money de GlowScan (paiements manuels, vérifiés par le fondateur). */
export const GLOWSCAN_MOMO = { mtn: "674 377 959", orange: "690 501 392" };
