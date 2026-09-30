// ════════════════════════════════════════════════════════════════════════
// Confrères — règles partagées (ADDENDUM_confreres_compte_rendu.md, maquette
// « Derm Confreres »). Libellés repris mot pour mot. Répartition 80/20 :
// shared/splits.ts (SPLITS.peer).
// ════════════════════════════════════════════════════════════════════════

export type PeerTier = "simple" | "urgent";

/** Avis simple : 3 000 F, réponse sous 48 h. Avis urgent : 5 000 F, réponse sous 24 h. */
export const PEER_TIERS: Record<PeerTier, { label: string; priceFcfa: number; hours: number; sub: string }> = {
  simple: { label: "Avis simple", priceFcfa: 3000, hours: 48, sub: "Réponse sous 48 h · 3 000 F" },
  urgent: { label: "Avis urgent", priceFcfa: 5000, hours: 24, sub: "Réponse sous 24 h · 5 000 F" },
};

/** « Premier disponible » : proposé aux 3 experts les mieux placés. */
export const PEER_OFFER_COUNT = 3;
/** Sans preneur après ce délai, le cas est proposé aux experts suivants. */
export const PEER_OFFER_TIMEOUT_MIN = 60;
/** Question précise : au moins 10 caractères. */
export const PEER_QUESTION_MIN = 10;

export const PEER_SHARED = [
  "Photos de la lésion",
  "Âge et sexe",
  "Phototype",
  "Historique des traitements",
  "Suggestion de l'IA et vos notes d'examen",
];
export const PEER_HIDDEN = ["Nom et prénom", "Téléphone et email", "Adresse et quartier"];

export const PEER_QUESTION_SUGGESTIONS = [
  "Faut-il biopsier avant de traiter ?",
  "Quel traitement de 2e intention ?",
  "Faut-il adresser en chirurgie ?",
];

export const PEER_QUICK_REPLIES = [
  "Pouvez-vous envoyer une photo de plus près ?",
  "Merci, je suis votre avis.",
  "Je préfère voir le patient au cabinet.",
];

/** Avis structuré du confrère. */
export type PeerAvis = { answer: string; dx: string; ddx: string; plan: string };

/** Pays du réseau (annuaire, réglages). */
export const NETWORK_COUNTRIES = ["Cameroun", "Bénin", "RDC", "Burundi", "Côte d'Ivoire", "Sénégal", "Tchad", "Gabon", "Congo", "Togo"];
