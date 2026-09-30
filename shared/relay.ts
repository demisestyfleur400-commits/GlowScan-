// ════════════════════════════════════════════════════════════════════════
// Réseau des relais — règles partagées client / serveur (README §4 points 7 à 9).
// Prix fixés ici, répartition 60/20/20 dans shared/splits.ts.
// ════════════════════════════════════════════════════════════════════════

export type RelayTier = "simple" | "urgent";

/** Avis simple : 3 000 F, réponse sous 24 h. Avis urgent : 5 000 F, réponse sous 2 h. */
export const RELAY_TIERS: Record<RelayTier, { label: string; priceFcfa: number; hours: number }> = {
  simple: { label: "Avis simple", priceFcfa: 3000, hours: 24 },
  urgent: { label: "Avis urgent", priceFcfa: 5000, hours: 2 },
};

/** Autonome sur une maladie à ≥ 85 % d'accord avec le dermatologue sur ≥ 20 cas. */
export const AUTONOMY_MIN_CASES = 20;
export const AUTONOMY_MIN_AGREEMENT = 0.85;
/** Même autonome, un cas sur cinq reste contrôlé par le dermatologue. */
export const AUTONOMY_CONTROL_RATE = 0.2;

export function isAutonomous(cases: number, agreements: number): boolean {
  return cases >= AUTONOMY_MIN_CASES && cases > 0 && agreements / cases >= AUTONOMY_MIN_AGREEMENT;
}

/** Niveaux (maquette « Derm Reseau »). */
export const RELAY_LEVELS = [
  { name: "Observateur", rule: "Envoie des cas. Tout est validé par un dermatologue." },
  { name: "Relais", rule: "Propose son diagnostic avant l'IA. Tout est validé." },
  { name: "Relais autonome", rule: "Traite seul les affections maîtrisées. 1 cas sur 5 contrôlé." },
  { name: "Formateur", rule: "Forme les nouveaux relais de sa région." },
] as const;

/**
 * Niveau calculé : Formateur si promu (relay_level = 3) ; Relais autonome dès une
 * maladie maîtrisée ; Relais dès un premier cas validé ; sinon Observateur.
 */
export function relayLevelOf(o: { promoted: number; validatedCases: number; autonomousDiseases: number }): number {
  if (o.promoted >= 3) return 3;
  if (o.autonomousDiseases > 0) return 2;
  if (o.validatedCases > 0) return 1;
  return 0;
}

/** Maladies suivies pour la formation (code → libellé). « autre » n'est pas suivi. */
export const RELAY_DISEASES: { code: string; label: string }[] = [
  { code: "gale", label: "Gale" },
  { code: "teigne", label: "Teigne" },
  { code: "pelade", label: "Pelade" },
  { code: "acne", label: "Acné" },
  { code: "eczema", label: "Eczéma" },
  { code: "impetigo", label: "Impétigo" },
  { code: "pityriasis_versicolor", label: "Pityriasis versicolor" },
  { code: "mycose", label: "Mycose cutanée" },
  { code: "buruli", label: "Ulcère de Buruli" },
  { code: "lepre", label: "Lèpre" },
  { code: "autre", label: "Autre" },
];
export const diseaseLabel = (code?: string | null) => RELAY_DISEASES.find((d) => d.code === code)?.label || code || "";

/** Raccourcis de correction du référent (maquette). */
export const LESSON_TIPS = ["Signe clé manqué", "Examen à compléter", "Orienter en urgence"] as const;
