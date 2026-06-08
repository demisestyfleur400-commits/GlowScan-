// ═══════════════════════════════════════════════════════════════════
// GLOWSCAN DATASET — 22 Labels cliniques
// Système d'apprentissage vivant — peaux africaines Fitzpatrick IV-VI
// ═══════════════════════════════════════════════════════════════════

// ── 1. Qualité image ──────────────────────────────────────────────
export type ImageQuality = "insufficient" | "acceptable" | "good";

export type ImageArtifact =
  | "none"
  | "shadow"
  | "reflection"
  | "filter"
  | "overexposed"
  | "underexposed"
  | "blur"
  | "bad_cropping";

// ── 2. Phototype / teinte ─────────────────────────────────────────
export type Fitzpatrick = "IV" | "V" | "VI" | "unknown";

export type SkinState =
  | "normal"
  | "oily"
  | "combination"
  | "dry"
  | "sensitive"
  | "dehydrated"
  | "balanced";

// ── 3. Zone anatomique ────────────────────────────────────────────
export type BodyArea =
  | "face"
  | "zone_t"
  | "forehead"
  | "cheeks"
  | "nose"
  | "chin"
  | "periorbital"
  | "temples"
  | "neck"
  | "scalp"
  | "body"
  | "hands"
  | "other";

// ── 4. Types de lésions ───────────────────────────────────────────
export type LesionType =
  | "none"
  | "macule"
  | "papule"
  | "pustule"
  | "nodule"
  | "comedo_open"
  | "comedo_closed"
  | "patch_hyperpigmented"
  | "patch_hypopigmented"
  | "erythema"
  | "scale"
  | "crust"
  | "atrophy"
  | "telangiectasia"
  | "post_inflammatory_mark"
  | "scar"
  | "textural_irregularity"
  | "pores_dilated"
  | "seborrhea"
  | "xerosis"
  | "irritation";

// ── 5. Conditions principales ─────────────────────────────────────
export type PrimaryCondition =
  | "healthy_skin"
  | "oily_skin"
  | "combination_skin"
  | "dry_skin"
  | "sensitive_skin"
  | "mild_acne"
  | "moderate_acne"
  | "severe_acne"
  | "comedonal_acne"
  | "post_inflammatory_hyperpigmentation"
  | "hyperpigmentation"
  | "dehydration"
  | "barrier_impairment"
  | "melasma_suspected"
  | "eczema_suspected"
  | "seborrheic_dermatitis_suspected"
  | "pigmentary_scar"
  | "non_conclusive";

// ── 6. Conditions secondaires ─────────────────────────────────────
export type SecondaryCondition =
  | "none"
  | "oily_skin"
  | "dry_skin"
  | "post_inflammatory_mark"
  | "mild_irritation"
  | "comedones"
  | "pores_dilated"
  | "sensitivity"
  | "textural_change"
  | "mild_hyperpigmentation"
  | "mild_erythema";

// ── 7. Degré d'inflammation ───────────────────────────────────────
export type InflammationLevel = "none" | "low" | "moderate" | "high";

// ── 8. Sévérité clinique ──────────────────────────────────────────
export type Severity = "mild" | "moderate" | "severe" | "critical";

// ── 9. Niveau de confiance ────────────────────────────────────────
export type Confidence = "low" | "medium" | "high";

// ── 10. Pièges visuels ────────────────────────────────────────────
export type VisualPitfall =
  | "none"
  | "light_reflection"
  | "shadow"
  | "beauty_filter"
  | "shine_from_sebum"
  | "color_variation_normal"
  | "blur_artifact";

// ── 11. État de barrière cutanée ──────────────────────────────────
export type SkinBarrierStatus =
  | "intact"
  | "mildly_compromised"
  | "compromised";

// ── 12. Degré de sébum ────────────────────────────────────────────
export type SebumLevel = "low" | "moderate" | "high";

// ── 13. Degré de sécheresse ───────────────────────────────────────
export type DrynessLevel = "low" | "moderate" | "high";

// ── 14. Degré de pigmentation ─────────────────────────────────────
export type PigmentationLevel = "none" | "mild" | "moderate" | "high";

// ── 15. Facteurs visibles ─────────────────────────────────────────
export type VisibleFactor =
  | "acne_related"
  | "post_inflammatory"
  | "sun_exposure"
  | "friction"
  | "dry_environment"
  | "aggressive_products"
  | "mask_related"
  | "hormonal_suspected"
  | "unknown";

// ── 16. Diagnostics différentiels ────────────────────────────────
export type DifferentialDiagnosis =
  | "acne_vulgaris"
  | "comedonal_acne"
  | "post_inflammatory_hyperpigmentation"
  | "melasma"
  | "seborrheic_dermatitis"
  | "eczema"
  | "irritant_contact_dermatitis"
  | "allergic_contact_dermatitis"
  | "xerosis"
  | "pigmentary_disorder"
  | "non_specific";

// ── 17. Classes de recommandations produits ───────────────────────
export type RecommendationClass =
  | "cleanser"
  | "niacinamide"
  | "bha"
  | "azelaic_acid"
  | "vitamin_c"
  | "retinol"
  | "sunscreen"
  | "barrier_repair"
  | "moisturizer"
  | "soothing"
  | "dermatology_referral";

// ── 18. Statut de validation dermatologue ────────────────────────
export type DermValidationStatus =
  | "pending"
  | "validated"
  | "corrected"
  | "rejected"
  | "needs_review";

// ── 19. Annotation clinique complète ─────────────────────────────
export type GlowScanAnnotation = {
  imageQuality: ImageQuality;
  imageArtifacts: ImageArtifact[];
  fitzpatrick: Fitzpatrick;
  skinState: SkinState;
  bodyArea: BodyArea;
  primaryCondition: PrimaryCondition;
  secondaryCondition: SecondaryCondition;
  lesionTypes: LesionType[];
  inflammationLevel: InflammationLevel;
  severity: Severity;
  confidence: Confidence;
  visualPitfalls: VisualPitfall[];
  sebumLevel: SebumLevel;
  drynessLevel: DrynessLevel;
  pigmentationLevel: PigmentationLevel;
  skinBarrierStatus: SkinBarrierStatus;
  visibleFactors: VisibleFactor[];
  differentialDiagnosis: DifferentialDiagnosis[];
  recommendationClasses: RecommendationClass[];
  dermatologistValidation: DermValidationStatus;
};

// ── Bloc d'observations cliniques (format B2B) ───────────────────
export type ClinicalAnnotation = {
  observations: string[];
  visibleLesions: string[];
  inflammationLevel: InflammationLevel;
  oilinessLevel: SebumLevel;
  drynessLevel: DrynessLevel;
  pigmentationLevel: PigmentationLevel;
  skinBarrierStatus: SkinBarrierStatus;
  confidenceReason: string;
};

// ── Label dermatologue (override / validation) ───────────────────
export type DermatologistLabel = {
  confirmed: boolean;
  correctedPrimaryCondition?: string;
  correctedSeverity?: string;
  notes?: string;
};

// ── Enregistrement dataset complet (fusion GlowScanDatasetRecord + labels) ──
export type GlowScanDatasetRecord = {
  // Identité
  recordId: string;
  mode: "B2C" | "B2B";
  source: "user_upload" | "dermatologist_review" | "clinical_partner";
  imageId: string;
  promptVersion: string;
  modelVersion: string;
  createdAt: string;

  // Patient
  patientAgeRange?: string;
  patientSex?: "female" | "male" | "other" | "unknown";

  // Image
  imageQuality: ImageQuality;
  imageArtifacts: ImageArtifact[];

  // Peau
  skinTone: Fitzpatrick;
  skinState: SkinState;
  bodyArea: BodyArea;

  // Diagnostic IA brut
  primaryCondition: PrimaryCondition;
  secondaryCondition?: SecondaryCondition | null;
  lesionTypes: LesionType[];
  severity: Severity;
  confidence: Confidence;
  inflammationLevel: InflammationLevel;
  sebumLevel: SebumLevel;
  drynessLevel: DrynessLevel;
  pigmentationLevel: PigmentationLevel;
  skinBarrierStatus: SkinBarrierStatus;
  visibleFactors: VisibleFactor[];
  visualPitfalls: VisualPitfall[];
  differentialDiagnosis: DifferentialDiagnosis[];
  recommendationClasses: RecommendationClass[];

  // Validation dermatologue
  dermatologistLabel?: DermatologistLabel;
  dermatologistValidation: DermValidationStatus;

  // Pipeline
  finalStatus: "pending" | "validated" | "rejected" | "needs_review";

  // Annotation structurée complète
  annotation?: GlowScanAnnotation;
  clinicalAnnotation?: ClinicalAnnotation;
};

// ── 20. Priorités d'entraînement (ordre recommandé) ──────────────
export const TRAINING_PRIORITIES: PrimaryCondition[] = [
  "oily_skin",
  "combination_skin",
  "mild_acne",
  "moderate_acne",
  "comedonal_acne",
  "post_inflammatory_hyperpigmentation",
  "hyperpigmentation",
  "barrier_impairment",
  "dry_skin",
  "non_conclusive",
];

// ── 21. Labels prioritaires peaux africaines ─────────────────────
export const AFRICAN_SKIN_PRIORITY_LABELS = [
  "post_inflammatory_hyperpigmentation",
  "pigmentary_scar",
  "comedo_open",
  "comedo_closed",
  "visualPitfalls",
  "skinBarrierStatus",
  "fitzpatrick",
  "imageArtifacts",
] as const;

// ── 22. Poids d'entraînement par source ──────────────────────────
// 1 = auto (IA seule), 2 = partiel (dermato a confirmé), 3 = complet (dermato a corrigé)
export const TRAINING_WEIGHT_MAP: Record<DermValidationStatus, number> = {
  pending: 1,
  validated: 2,
  corrected: 3,
  rejected: 0,
  needs_review: 1,
};
