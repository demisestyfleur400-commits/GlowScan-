// Score de complétion du profil dermatologue (brief inscription 2 étapes).
// email 20 · ville 10 · nom 20 · whatsapp 25 · pays 5 · onmc 15 · cabinet 5 = 100
export interface ProfileScoreInput {
  email?: string | null;
  fullName?: string | null;
  city?: string | null;
  phone?: string | null;
  country?: string | null;
  licenseNumber?: string | null;
  cabinetName?: string | null;
}

// Le nom par défaut à l'inscription = partie locale de l'email → non compté comme
// un vrai nom tant que le médecin ne l'a pas remplacé à l'étape 2.
function hasRealName(fullName?: string | null, email?: string | null): boolean {
  const n = (fullName || "").trim().toLowerCase();
  if (!n) return false;
  const local = (email || "").split("@")[0].trim().toLowerCase();
  return n !== local;
}

export function computeProfileScore(a: ProfileScoreInput): number {
  let s = 0;
  if (a.email) s += 20;
  if (a.city && a.city.trim()) s += 10;
  if (hasRealName(a.fullName, a.email)) s += 20;
  if (a.phone && a.phone.trim()) s += 25;
  if (a.country && a.country.trim()) s += 5;
  if (a.licenseNumber && a.licenseNumber.trim()) s += 15;
  if (a.cabinetName && a.cabinetName.trim()) s += 5;
  return Math.min(100, s);
}

export function profileLabel(score: number): string {
  if (score >= 100) return "Profil certifié";
  if (score >= 60) return "Profil presque complet";
  return "Complétez votre profil pour recevoir des patients";
}
