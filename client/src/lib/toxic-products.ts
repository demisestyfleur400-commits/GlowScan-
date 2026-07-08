// ════════════════════════════════════════════════════════════════════════
// Base locale des produits cutanés nocifs + détecteur.
// Utilisée en B2C (analyse) et en DERM (anamnèse) pour alerter AVANT/PENDANT
// le résultat lorsqu'un produit dangereux est déclaré par l'utilisateur.
// Narration : « Chaque jour sans diagnostic, ta peau absorbe des substances
// que ton corps ne peut pas éliminer. »
// ════════════════════════════════════════════════════════════════════════

export type DangerLevel = "critical" | "moderate";

export interface ToxicProduct {
  name: string;
  aliases: string[];
  toxicIngredient: string;
  dangerLevel: DangerLevel;
  effet: string;
  delai: string;
  conseil: string;
}

export const TOXIC_PRODUCTS: ToxicProduct[] = [
  {
    name: "Movate",
    aliases: ["movate", "movat"],
    toxicIngredient: "Mercure / Calomel",
    dangerLevel: "critical",
    effet: "Insuffisance rénale, troubles neurologiques",
    delai: "3 mois d'utilisation suffisent pour dépasser le seuil dangereux de mercure dans le sang",
    conseil: "Arrêt immédiat. Consulter un médecin si utilisation supérieure à 1 mois.",
  },
  {
    name: "Carotone",
    aliases: ["carotone", "carrotone"],
    toxicIngredient: "Corticoïdes fluorés",
    dangerLevel: "critical",
    effet: "Amincissement cutané irréversible, rebond pigmentaire, dépendance",
    delai: "4 à 6 semaines pour créer une dépendance",
    conseil: "Arrêt progressif sous supervision médicale.",
  },
  {
    name: "Diphantoine",
    aliases: ["diphantoine", "diphantoïne"],
    toxicIngredient: "Hydroquinone + Corticoïdes",
    dangerLevel: "critical",
    effet: "Ochronose exogène irréversible sur peaux foncées",
    delai: "Risque dès les premières semaines",
    conseil: "Arrêt immédiat. Des alternatives sans risque existent.",
  },
  {
    name: "Fair & Lovely",
    aliases: ["fair and lovely", "fair&lovely", "fair & lovely", "fair lovely"],
    toxicIngredient: "Agents éclaircissants non contrôlés",
    dangerLevel: "moderate",
    effet: "Perturbation de la mélanine naturelle",
    delai: "Effets à long terme",
    conseil: "Préférer des alternatives certifiées.",
  },
];

// Suggestions d'auto-complétion pour le champ « produits utilisés » (produits
// nocifs ET produits sains courants, + option « Aucun »).
export const PRODUCT_SUGGESTIONS: string[] = [
  "Movate",
  "Carotone",
  "Diphantoine",
  "Fair & Lovely",
  "Topicrem",
  "Cérat",
  "Savon noir",
  "Huile de coco",
  "Aucun produit actuellement",
];

// Normalise pour une recherche insensible à la casse et aux accents.
function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ");
}

/**
 * Détecte les produits nocifs mentionnés dans un texte libre.
 * Recherche insensible à la casse/accents sur les alias. Retourne la liste
 * (sans doublon) des produits toxiques trouvés.
 */
export function detectToxicProducts(text: string | null | undefined): ToxicProduct[] {
  if (!text || !text.trim()) return [];
  const hay = normalize(text);
  const found: ToxicProduct[] = [];
  for (const p of TOXIC_PRODUCTS) {
    const hit = p.aliases.some((a) => hay.includes(normalize(a)));
    if (hit) found.push(p);
  }
  return found;
}
