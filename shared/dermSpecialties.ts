// ════════════════════════════════════════════════════════════════════════
// Sous-spécialités dermatologiques (vraies spécialités, pas des conditions).
// Utilisées par : profil dermato (ProPublicProfile) ET recommandation B2C
// (ConsultationLauncher + endpoint /api/b2c/dermatologists?condition=...).
// ════════════════════════════════════════════════════════════════════════

export interface SubSpecialty { key: string; label: string; }

export const SUB_SPECIALTIES: SubSpecialty[] = [
  { key: "generale", label: "Dermatologie générale" },
  { key: "venerologie", label: "Dermatologie-Vénérologie" },
  { key: "esthetique_laser", label: "Dermatologie esthétique & laser" },
  { key: "pediatrique", label: "Dermatologie pédiatrique" },
  { key: "oncologie", label: "Dermato-oncologie" },
  { key: "allergologique", label: "Dermatologie allergologique" },
  { key: "trichologie", label: "Trichologie (cheveux & cuir chevelu)" },
  { key: "chirurgicale", label: "Dermatologie chirurgicale" },
];

export const SPECIALTY_LABEL: Record<string, string> =
  Object.fromEntries(SUB_SPECIALTIES.map((s) => [s.key, s.label]));

// Mots-clés (dans la condition détectée) → sous-spécialité recommandée.
// L'ordre compte : les cas les plus spécifiques d'abord.
const RULES: { specialty: string; keywords: RegExp }[] = [
  { specialty: "oncologie", keywords: /m[ée]lanome|carcinome|cancer|na[eæ]vus|grain de beaut[ée]|l[ée]sion suspecte|tumeur/i },
  { specialty: "venerologie", keywords: /ist|mst|v[ée]n[ée]rien|syphilis|herp[èe]s g[ée]nital|condylome|gonocoque|chlamydia/i },
  { specialty: "trichologie", keywords: /cheveu|cuir chevelu|alop[ée]cie|calvitie|pellicul|chute de cheveux|folliculite du cuir/i },
  { specialty: "allergologique", keywords: /ecz[ée]ma|allergi|urticaire|dermatite|prurit|atopi|eczema de contact/i },
  { specialty: "pediatrique", keywords: /enfant|b[ée]b[ée]|nourrisson|p[ée]diatr/i },
  { specialty: "chirurgicale", keywords: /ch[ée]lo[ïi]de|kyste|verrue|excision|ex[ée]r[èe]se|chirurg|retrait de/i },
  { specialty: "esthetique_laser", keywords: /tache|hyperpigmentation|m[ée]lasma|ride|anti-?[âa]ge|vieillissement|[ée]clat|teint terne|cicatrice|laser/i },
  // Acné, séborrhée, pores, rougeurs, etc. → dermatologie générale (défaut fort).
  { specialty: "generale", keywords: /acn[ée]|com[ée]don|s[ée]bum|pores|rosac[ée]e|psoriasis|mycose|infection|rougeur/i },
];

// Retourne la sous-spécialité recommandée pour une condition (ou null).
export function recommendSpecialty(conditionText?: string | null): string | null {
  if (!conditionText) return null;
  const t = String(conditionText).toLowerCase();
  for (const r of RULES) if (r.keywords.test(t)) return r.specialty;
  return "generale"; // défaut : un dermatologue généraliste convient
}
