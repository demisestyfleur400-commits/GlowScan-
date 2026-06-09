/**
 * taxonomy.ts — Taxonomie clinique GlowScan AI
 * Classification spécialisée peaux africaines Fitzpatrick IV-VI
 *
 * Chaque cas GlowScan DERM est automatiquement classé selon :
 * - Catégorie dermatologique (9 catégories)
 * - Code ICD-10 africain
 * - Phototype estimé (IV / V / VI)
 * - Score de qualité annotation (0-100)
 *
 * Les dermatologues africains construisent le dataset sans le savoir.
 * Objectif : 10 000 cas gold classés d'ici 2027 → GlowScan AI v1.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TAXONOMIE 9 CATÉGORIES
// ─────────────────────────────────────────────────────────────────────────────
export const CONDITION_CATEGORIES = {
  acne: {
    label: "Acné",
    labelEn: "Acne",
    emoji: "🔴",
    color: "#ef4444",
    icd10Base: "L70",
    target: 1500, // cas gold cible
    keywords: ["acné", "acne", "comédon", "comedon", "papule", "pustule", "microkyste", "nodule", "bouton", "sebaceous", "sébacé"],
    subtypes: {
      "L70.0": "Acné vulgaire",
      "L70.1": "Acné conglobata",
      "L70.4": "Acné infantile",
      "L70.8": "Acné sévère nodulocystique",
    },
  },
  hyperpigmentation: {
    label: "Hyperpigmentation",
    labelEn: "Hyperpigmentation",
    emoji: "🟤",
    color: "#92400e",
    icd10Base: "L81",
    target: 2000,
    keywords: ["hyperpigment", "mélasma", "melasma", "chloasma", "tache", "spot", "pih", "post-inflammat", "dyschromie", "mask of pregnancy", "masque de grossesse", "mélanonévus"],
    subtypes: {
      "L81.0": "Hyperpigmentation post-inflammatoire (PIH)",
      "L81.1": "Chloasma / Mélasma",
      "L81.4": "Mélanonévus acquis",
      "L81.8": "Dyschromie diffuse",
    },
  },
  black_skin_specific: {
    label: "Spécifique peaux noires",
    labelEn: "Black skin specific",
    emoji: "⚫",
    color: "#1f2937",
    icd10Base: "L91",
    target: 2500, // le plus rare en littérature mondiale → valeur maximale
    keywords: ["chéloïde", "keloïde", "keloid", "dermatose papuleuse nigra", "pseudofolliculite", "folliculite", "vitiligo", "lichen nitidus", "lichen striatus", "dermatose faciale"],
    subtypes: {
      "L91.0": "Chéloïde",
      "L44.1": "Dermatose papuleuse nigra (DPN)",
      "L73.1": "Pseudofolliculite de la barbe (PFB)",
      "L80": "Vitiligo",
      "L43": "Lichen plan",
    },
  },
  eczema: {
    label: "Eczéma / Dermatite",
    labelEn: "Eczema / Dermatitis",
    emoji: "🟡",
    color: "#d97706",
    icd10Base: "L20",
    target: 800,
    keywords: ["eczéma", "eczema", "dermatite", "atopique", "contact", "séborrhéique", "seborrheique", "prurit", "squame", "croûte"],
    subtypes: {
      "L20": "Dermatite atopique",
      "L21": "Dermatite séborrhéique",
      "L23": "Dermatite de contact allergique",
      "L24": "Dermatite de contact irritative",
    },
  },
  infections: {
    label: "Infections cutanées",
    labelEn: "Skin infections",
    emoji: "🟠",
    color: "#ea580c",
    icd10Base: "B35",
    target: 600,
    keywords: ["teigne", "tinea", "mycose", "candidose", "impétigo", "impeigo", "folliculite bactérienne", "furoncle", "anthrax", "cellulite", "abcès", "infection"],
    subtypes: {
      "B35": "Dermatophytose (teigne)",
      "B36.0": "Pityriasis versicolor",
      "B37": "Candidose cutanée",
      "L01": "Impétigo",
      "L02": "Furoncle / abcès cutané",
    },
  },
  xerosis: {
    label: "Xérose / Sécheresse",
    labelEn: "Xerosis / Dryness",
    emoji: "💧",
    color: "#0284c7",
    icd10Base: "L85",
    target: 400,
    keywords: ["xérose", "xerose", "sécheresse", "dry", "déshydrat", "squame", "ichtyose", "fissure"],
    subtypes: {
      "L85.3": "Xérose cutanée",
      "Q80": "Ichtyose",
      "L85.0": "Hyperkératose",
    },
  },
  photoaging: {
    label: "Photoaging / Photodommages",
    labelEn: "Photoaging",
    emoji: "☀️",
    color: "#7c3aed",
    icd10Base: "L57",
    target: 300,
    keywords: ["photoaging", "photo-aging", "vieillissement", "ride", "laxité", "élasticité", "photodomm", "solaire", "kératose"],
    subtypes: {
      "L57.0": "Kératose actinique",
      "L57.8": "Photoaging cutané",
    },
  },
  loss_texture: {
    label: "Texture / Pores / Sébum",
    labelEn: "Texture issues",
    emoji: "🌀",
    color: "#059669",
    icd10Base: "L70",
    target: 500,
    keywords: ["pore", "texture", "sébum", "sebum", "gras", "brillance", "comedons", "points noirs", "dilaté"],
    subtypes: {
      "L70.5": "Acné excoriée / pores dilatés",
      "L74": "Hyperhidrose / excès sébum",
    },
  },
  other: {
    label: "Autre / Non classifié",
    labelEn: "Other",
    emoji: "⚪",
    color: "#6b7280",
    icd10Base: "L98",
    target: 400,
    keywords: [],
    subtypes: {
      "L98": "Affection cutanée non classifiée",
    },
  },
} as const;

export type ConditionCategory = keyof typeof CONDITION_CATEGORIES;

// Total cibles
export const DATASET_TARGET_TOTAL = Object.values(CONDITION_CATEGORIES).reduce(
  (acc, c) => acc + c.target, 0
); // ~9000 → arrondi à 10 000

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION AUTOMATIQUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classe une condition textuelle vers une catégorie + code ICD-10
 */
export function classifyCondition(condition: string): {
  category: ConditionCategory;
  icd10: string;
  confidence: "high" | "medium" | "low";
} {
  if (!condition) return { category: "other", icd10: "L98", confidence: "low" };

  const lower = condition.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  for (const [key, cat] of Object.entries(CONDITION_CATEGORIES) as [ConditionCategory, typeof CONDITION_CATEGORIES[ConditionCategory]][]) {
    if (key === "other") continue;
    const matchCount = cat.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 2) {
      // Chercher le sous-type le plus précis
      const bestIcd = findBestIcd(lower, cat.subtypes);
      return { category: key, icd10: bestIcd || cat.icd10Base, confidence: "high" };
    }
    if (matchCount === 1) {
      const bestIcd = findBestIcd(lower, cat.subtypes);
      return { category: key, icd10: bestIcd || cat.icd10Base, confidence: "medium" };
    }
  }
  return { category: "other", icd10: "L98", confidence: "low" };
}

function findBestIcd(condLower: string, subtypes: Record<string, string>): string | null {
  for (const [code, label] of Object.entries(subtypes)) {
    const labelLower = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (condLower.includes(labelLower.split(" ")[0])) return code;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION PHOTOTYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait le phototype Fitzpatrick (IV / V / VI) à partir du texte IA.
 * Default : "V" (phototype médian Afrique centrale)
 */
export function extractPhototype(text: string): "IV" | "V" | "VI" {
  if (!text) return "V";
  const lower = text.toLowerCase();

  // VI — peau très foncée
  if (/phototype\s*(vi|6)|très\s*foncée?|très\s*noire?|ébène|peau\s*d.ébène/i.test(lower)) return "VI";
  // IV — peau métissée / brun clair
  if (/phototype\s*(iv|4)|métissée?|brun\s*(clair|méditerranéen)|peau\s*claire|café\s*au\s*lait/i.test(lower)) return "IV";
  // V — peau noire standard (défaut Afrique centrale)
  if (/phototype\s*(v|5)|peau\s*(noire|foncée|brune)|noire?|foncée?/i.test(lower)) return "V";

  return "V"; // défaut Cameroun / Congo / Côte d'Ivoire
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE DE QUALITÉ ANNOTATION (0-100)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnnotationFields {
  skinPhototype?: string | null;
  primaryCondition?: string | null;
  secondaryCondition?: string | null;
  severity?: string | null;
  score?: number | null;
  clinicalSummary?: string | null;
  zonesAnalysis?: unknown;
  clinicalProtocol?: unknown;
  imageQuality?: string | null;
  confidence?: string | null;
  redFlags?: unknown;
  mode?: string | null;
  // Enrichissement dermato
  lesionTypes?: string[] | null;
  zonesAffected?: string[] | null;
  pihRisk?: string | null;
  keloidRisk?: string | null;
}

export function calcAnnotationScore(fields: AnnotationFields): number {
  let score = 0;

  // Identité clinique (45 pts)
  if (fields.primaryCondition)                score += 15;
  if (fields.skinPhototype)                   score += 15;
  if (fields.severity)                         score += 10;
  if (fields.secondaryCondition)              score += 5;

  // Richesse clinique (35 pts)
  if (fields.clinicalSummary && (fields.clinicalSummary?.length || 0) > 50) score += 15;
  if (fields.zonesAnalysis && Array.isArray(fields.zonesAnalysis) && fields.zonesAnalysis.length > 0) score += 10;
  if (fields.clinicalProtocol)                score += 10;

  // Qualité technique (15 pts)
  if (fields.imageQuality === "good")         score += 10;
  else if (fields.imageQuality === "acceptable") score += 5;
  if (fields.confidence)                      score += 5;

  // Enrichissement dermato manuel (+25 pts bonus)
  if (fields.lesionTypes && (fields.lesionTypes?.length || 0) > 0) score += 10;
  if (fields.zonesAffected && (fields.zonesAffected?.length || 0) > 0) score += 8;
  if (fields.pihRisk)                         score += 4;
  if (fields.keloidRisk)                      score += 3;

  // Redflags documentées
  if (fields.redFlags && Array.isArray(fields.redFlags) && fields.redFlags.length > 0) score += 5;

  // B2B bonus (contexte clinique complet)
  if (fields.mode === "B2B")                  score += 10;

  return Math.min(score, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// LESION TYPES (pour le formulaire annotation)
// ─────────────────────────────────────────────────────────────────────────────
export const LESION_TYPES = [
  { id: "macule",      label: "Macule",         desc: "Tache plate, non palpable" },
  { id: "papule",      label: "Papule",          desc: "Surélévation < 5mm" },
  { id: "pustule",     label: "Pustule",         desc: "Contenu purulent" },
  { id: "nodule",      label: "Nodule",          desc: "Surélévation profonde > 5mm" },
  { id: "comedon",     label: "Comédon",         desc: "Point noir / blanc" },
  { id: "plaque",      label: "Plaque",          desc: "Lésion surélevée large" },
  { id: "vesicule",    label: "Vésicule",        desc: "Bulle < 5mm" },
  { id: "croute",      label: "Croûte",          desc: "Sérosité séchée" },
  { id: "squame",      label: "Squame",          desc: "Desquamation visible" },
  { id: "erosion",     label: "Érosion",         desc: "Perte épidermique superficielle" },
  { id: "cicatrice",   label: "Cicatrice / PIH", desc: "Séquelle post-lésion" },
  { id: "keloide",     label: "Chéloïde",        desc: "Cicatrice hypertrophique" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// ZONES FACIALES
// ─────────────────────────────────────────────────────────────────────────────
export const FACE_ZONES = [
  { id: "front",     label: "Front" },
  { id: "tempes",    label: "Tempes" },
  { id: "joue_d",    label: "Joue droite" },
  { id: "joue_g",    label: "Joue gauche" },
  { id: "nez",       label: "Nez / Zone T" },
  { id: "menton",    label: "Menton" },
  { id: "contour",   label: "Contour des yeux" },
  { id: "cou",       label: "Cou" },
  { id: "dos",       label: "Dos" },
  { id: "poitrine",  label: "Poitrine / Décolleté" },
] as const;
