// Profils GlowScan Derm choisis à l'inscription (README §4, point 13) et page
// d'arrivée de chacun après connexion. Source unique pour le client et le serveur.

export type ProProfile = "derm" | "relay" | "ngo";

export const PRO_PROFILES: { key: ProProfile; label: string }[] = [
  { key: "derm", label: "Dermatologue" },
  { key: "relay", label: "Relais (infirmier / médecin)" },
  { key: "ngo", label: "ONG / programme" },
];

export function asProProfile(v: unknown): ProProfile {
  return v === "relay" || v === "ngo" ? v : "derm";
}

/** Page d'arrivée après connexion, selon le rôle (secrétaire) puis le profil. */
export function proHomeOf(profile: unknown, role?: string | null): string {
  if (role === "secretary") return "/derm/accueil";
  const p = asProProfile(profile);
  if (p === "relay") return "/derm/relais";
  if (p === "ngo") return "/derm/pilotage";
  return "/derm/dashboard";
}
