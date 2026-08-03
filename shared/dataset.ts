// ═══════════════════════════════════════════════════════════════════
// GLOWSCAN DATASET — Système d'annotation clinique complet
// 22 labels + GlowScanBase + GlowScanB2B + pipeline
// Peaux africaines Fitzpatrick IV-VI
// ═══════════════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 1 — TYPES ATOMIQUES (22 labels)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// Zone B2B (noms FR — tels que retournés par le prompt DERM)
export type ZoneB2B =
  | "Zone T"
  | "Joues"
  | "Front"
  | "Périorbital"
  | "Tempes"
  | "Cou"
  | "Nez"
  | "Menton";

export type ZoneStatus =
  | "Sain"
  | "Légèrement affecté"
  | "Modérément affecté"
  | "Sévèrement affecté";

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 2 — TYPES COMPOSÉS (structures cliniques)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Balance cutanée (métriques B2C GlowScore) ────────────────────
export type BalanceMetrics = {
  hydration: number;    // 0-100
  sebum: number;        // 0-100
  sensitivity: number;  // 0-100
  uniformity: number;   // 0-100
  elasticity: number;   // 0-100
  radiance: number;     // 0-100
};

// ── Analyse par zone (B2B) ────────────────────────────────────────
export type ZoneAnalysisItem = {
  zone: ZoneB2B;
  status: ZoneStatus;
  findings: string;        // description clinique avec termes médicaux
  risk: string;            // risque concret avec délai chiffré
  evaluable: boolean;      // false si la zone n'est pas visible sur la photo
};

// ── Ingrédient toxique ────────────────────────────────────────────
export type ToxicIngredient = {
  ingredient: string;   // nom chimique (nom commun)
  reason: string;       // mécanisme de toxicité pour CETTE peau
};

// ── Étape du protocole clinique ───────────────────────────────────
export type ClinicalProtocolStep = {
  step: string;                    // ex: "Nettoyage", "Sérum actif", "Protection solaire"
  product: string;                 // nom exact du produit — marque — prix
  concentration: string | null;    // ex: "10%" ou null
  frequency: string;               // ex: "Matin et soir" | "Lundi, Mercredi, Vendredi soir"
  mechanism: string;               // mécanisme d'action sur cette peau
};

// ── Protocole clinique complet (B2B) ─────────────────────────────
export type ClinicalProtocol = {
  morning: ClinicalProtocolStep[];
  evening: ClinicalProtocolStep[];
  weekly: string | null;           // soin hebdomadaire ou null
  durationWeeks: number;           // durée totale du protocole
  followUpWeeks: number;           // délai de consultation de suivi
  referralNeeded: boolean;         // orientation dermatologue nécessaire
  referralReason: string | null;   // raison de l'orientation si referralNeeded
};

// ── Validation dermatologue (objet unifié) ───────────────────────
// Fusionne DermatologistLabel + DermValidationStatus en un seul objet
export type DermValidation = {
  status: DermValidationStatus;
  confirmed?: boolean;
  correctedPrimaryCondition?: string;
  correctedSeverity?: string;
  notes?: string;
};

// ── Bloc d'observations cliniques (B2B ClinicalAnnotation) ───────
export type ClinicalAnnotation = {
  observations: string[];
  visibleLesions: string[];
  visibleSigns: string[];
  inflammationLevel: InflammationLevel;
  oilinessLevel: SebumLevel;
  drynessLevel: DrynessLevel;
  pigmentationLevel: PigmentationLevel;
  skinBarrierStatus: SkinBarrierStatus;
  redFlags: string[];
  confidenceReason: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 2b — TYPES B2C (zones, produits, protocole simplifié)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Zone B2C — langage simple, conseil orienté utilisateur
export type ZoneB2C = "Zone T" | "Joues" | "Front" | "Menton" | "Nez" | "Cou";

export type ZoneStatusB2C =
  | "Saine"
  | "Légèrement affectée"
  | "Modérément affectée"
  | "Très affectée";

export type ZoneAnalysisB2C = {
  zone: ZoneB2C;
  status: ZoneStatusB2C;
  findings: string;   // ce qui est visible — langage simple
  advice: string;     // conseil adapté à cette zone — actionnable
};

// Produit B2C — avec marque et prix (GlowScan Dermo, marque maison)
export type B2CProduct = {
  step: string;       // ex: "Nettoyage", "Traitement", "Hydratation"
  product: string;    // nom exact du produit
  brand: string;      // ex: "GlowScan Dermo"
  price: string;      // ex: "8 000 FCFA"
  why: string;        // pourquoi ce produit est adapté — court, humain
};

// Recommandation B2C (même structure, step typé)
export type B2CRecommendation = {
  step: "Matin" | "Soir" | "Hebdomadaire";
  product: string;
  brand: string;
  price: string;
  why: string;
};

// ── Noyau de sortie partagé B2C + B2B (GlowScanBaseOutput) ───────
export type GlowScanBaseOutput = {
  photo_quality: ImageQuality;              // "insufficient" | "acceptable" | "good"
  confidence: Confidence;                   // "low" | "medium" | "high"
  skinType: string;                         // ex: "Peau Mixte · Fitzpatrick V"
  score: number;                            // GlowScore 0-100
  balance: BalanceMetrics;
  redFlags: string[];
  medicalDisclaimer: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 3 — TYPES D'ENREGISTREMENT (GlowScanBase, B2C, B2B, Dataset)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Base commune B2C + B2B (dataset + pipeline) ──────────────────
export type GlowScanBase = {
  // Identité
  recordId: string;
  mode: "B2C" | "B2B";
  promptVersion: string;
  modelVersion: string;
  createdAt: string;
  imageId: string;

  // Image
  imageQuality: ImageQuality;
  imageArtifacts: ImageArtifact[];

  // Peau
  fitzpatrick: Fitzpatrick;
  skinState: SkinState;
  bodyArea: BodyArea;

  // Diagnostic
  primaryCondition: PrimaryCondition | string;
  secondaryCondition: SecondaryCondition | string | null;
  lesionTypes: LesionType[] | string[];
  severity: Severity;
  confidence: Confidence;
  visibleSigns: string[];

  // Score & qualité photo (remontés depuis B2B/B2C)
  score: number;
  photo_quality: ImageQuality;

  // Pièges visuels — crucial pour peaux africaines
  visualPitfalls: VisualPitfall[];

  // Niveaux cutanés
  sebumLevel: SebumLevel;
  drynessLevel: DrynessLevel;
  pigmentationLevel: PigmentationLevel;
  skinBarrierStatus: SkinBarrierStatus;

  // Balance métriques
  balance: BalanceMetrics;

  // Alertes
  redFlags: string[];
  medicalDisclaimer: string;
};

// ── Sortie B2C complète (GlowScan Basic) ─────────────────────────
export type GlowScanB2C = GlowScanBase & {
  // Diagnostic simple (langage utilisateur)
  condition: string;                        // libellé humain ex: "Peau grasse"
  conditionSecondaire: string | null;
  details: string;                          // résumé court de ce qui est visible
  motivation: string;                       // phrase rassurante et encourageante

  // Zones (langage simple + conseil)
  zones: ZoneAnalysisB2C[];

  // Produits — GlowScan Dermo (marque maison)
  recommendations: B2CRecommendation[];
  morningProtocol: B2CProduct[];
  eveningProtocol: B2CProduct[];
  weeklyProtocol: string;                   // soin hebdomadaire ou ""

  // Seuil de consultation
  whenToSeeDermatologist: string;
};

// ── Sortie B2B complète (GlowScan DERM) ──────────────────────────
export type GlowScanB2B = GlowScanBase & {
  // Diagnostic clinique
  condition: string;                    // terminologie médicale libre (FR)
  conditionSecondaire: string | null;
  score: number;                        // GlowScore 0-100

  // Rapport clinique structuré
  clinicalSummary: string;             // 4-5 phrases cliniques
  zonesAnalysis: ZoneAnalysisItem[];   // analyse zone par zone
  antecedentsIntegration: string;      // lien antécédents → diagnostic
  toxicIngredients: ToxicIngredient[]; // ingrédients à éviter pour cette peau
  differentialDiagnosis: string[];     // diagnostics différentiels

  // Protocole
  clinicalProtocol: ClinicalProtocol;

  // Logistique & pronostic
  logistics: string | null;            // null si Douala/Yaoundé
  prognostic: string;                  // évolution semaine par semaine
  contraindications: string[];         // actifs formellement contre-indiqués

  // Validation dermatologue (optionnelle — remplie après review)
  dermatologistValidation?: DermValidation;
};

// ── Annotation structurée complète (dataset) ─────────────────────
export type GlowScanAnnotation = {
  // Image
  imageQuality: ImageQuality;
  imageArtifacts: ImageArtifact[];

  // Peau
  fitzpatrick: Fitzpatrick;
  skinState: SkinState;
  bodyArea: BodyArea;

  // Diagnostic
  primaryCondition: PrimaryCondition;
  secondaryCondition: SecondaryCondition;
  lesionTypes: LesionType[];
  visibleSigns: string[];
  inflammationLevel: InflammationLevel;
  severity: Severity;
  confidence: Confidence;

  // Pièges visuels
  visualPitfalls: VisualPitfall[];

  // Niveaux cutanés
  sebumLevel: SebumLevel;
  drynessLevel: DrynessLevel;
  pigmentationLevel: PigmentationLevel;
  skinBarrierStatus: SkinBarrierStatus;

  // Balance métriques (B2C)
  balance?: BalanceMetrics;

  // Facteurs & différentiels
  visibleFactors: VisibleFactor[];
  differentialDiagnosis: DifferentialDiagnosis[];
  recommendationClasses: RecommendationClass[];

  // Alertes
  redFlags: string[];

  // Validation
  dermatologistValidation: DermValidation;
  medicalDisclaimer?: string;
};

// ── Enregistrement dataset final (tous modes fusionnés) ──────────
export type GlowScanDatasetRecord = GlowScanBase & {
  // Source
  source: "user_upload" | "dermatologist_review" | "clinical_partner";

  // Patient
  patientAgeRange?: string;
  patientSex?: "female" | "male" | "other" | "unknown";

  // Labels supplémentaires (22 labels)
  inflammationLevel: InflammationLevel;
  visibleFactors: VisibleFactor[];
  differentialDiagnosis: DifferentialDiagnosis[] | string[];
  recommendationClasses: RecommendationClass[] | string[];

  // Validation dermatologue (objet unifié — fusion label + statut)
  dermatologistValidation: DermValidation;

  // Pipeline
  finalStatus: "pending" | "validated" | "rejected" | "needs_review";

  // Annotations structurées
  annotation?: GlowScanAnnotation;
  clinicalAnnotation?: ClinicalAnnotation;

  // Sortie B2B complète (stockée si mode === "B2B")
  b2bOutput?: Pick<GlowScanB2B,
    | "condition"
    | "conditionSecondaire"
    | "score"
    | "clinicalSummary"
    | "zonesAnalysis"
    | "antecedentsIntegration"
    | "toxicIngredients"
    | "clinicalProtocol"
    | "prognostic"
    | "contraindications"
    | "logistics"
  >;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 4 — PIPELINE & CONSTANTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Étapes du pipeline dataset ────────────────────────────────────
// 1. Upload image
// 2. Évaluation qualité → imageQuality + imageArtifacts
// 3. Analyse IA → sortie B2C ou B2B
// 4. Enregistrement brut → aiDiagnosis
// 5. Validation dermatologue → dermatologistValidation
// 6. Correction éventuelle → groundTruth + trainingWeight++
// 7. Enrichissement dataset → exportedToDataset = true
// 8. Ré-entraînement futur

// ── 20. Priorités d'entraînement ─────────────────────────────────
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

// ── 22. Poids d'entraînement par statut de validation ────────────
// 0=rejeté 1=auto(IA seule) 2=validé dermato 3=corrigé dermato
export const TRAINING_WEIGHT_MAP: Record<DermValidationStatus, number> = {
  pending: 1,
  validated: 2,
  corrected: 3,
  rejected: 0,
  needs_review: 1,
};
