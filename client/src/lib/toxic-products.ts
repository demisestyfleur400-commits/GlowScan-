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
    aliases: ["fair and lovely", "fair&lovely", "fair & lovely", "fair lovely", "glow and lovely"],
    toxicIngredient: "Agents éclaircissants non contrôlés",
    dangerLevel: "moderate",
    effet: "Perturbation de la mélanine naturelle",
    delai: "Effets à long terme",
    conseil: "Préférer des alternatives certifiées.",
  },
  {
    name: "Caro White / Caro Light",
    aliases: ["caro white", "caro light", "carowhite", "caro-white"],
    toxicIngredient: "Hydroquinone + dérivés éclaircissants",
    dangerLevel: "critical",
    effet: "Ochronose exogène (taches bleu-noir irréversibles), fragilisation cutanée",
    delai: "Risque dès quelques semaines sur peau foncée",
    conseil: "Arrêt immédiat. Alternatives sans hydroquinone disponibles.",
  },
  {
    name: "Skin Light",
    aliases: ["skin light", "skinlight", "skin-light"],
    toxicIngredient: "Hydroquinone / dérivés mercuriels",
    dangerLevel: "critical",
    effet: "Hyperpigmentation rebond, ochronose, atteinte rénale possible",
    delai: "Risque à court terme",
    conseil: "Arrêt immédiat et consultation dermatologique.",
  },
  {
    name: "Clovate / Dermovate",
    aliases: ["clovate", "dermovate", "clobetasol"],
    toxicIngredient: "Clobétasol (corticoïde très puissant)",
    dangerLevel: "critical",
    effet: "Atrophie cutanée irréversible, vergetures, dépendance, infections",
    delai: "Quelques semaines suffisent",
    conseil: "Ne jamais utiliser sur le visage sans prescription. Arrêt progressif encadré.",
  },
  {
    name: "Diprosone / Betnovate",
    aliases: ["diprosone", "diproson", "betnovate", "betamethasone", "bétaméthasone"],
    toxicIngredient: "Bétaméthasone (corticoïde puissant)",
    dangerLevel: "critical",
    effet: "Amincissement de la peau, acné cortisonique, dépendance",
    delai: "4 à 6 semaines",
    conseil: "Usage médical uniquement, jamais en éclaircissant. Arrêt encadré.",
  },
  {
    name: "Maxi White / Maxi Tone",
    aliases: ["maxi white", "maxi tone", "maxitone", "maxi-white"],
    toxicIngredient: "Agents éclaircissants puissants (hydroquinone / corticoïdes)",
    dangerLevel: "critical",
    effet: "Fragilisation cutanée, hyperpigmentation rebond",
    delai: "Risque à court terme",
    conseil: "Arrêt immédiat. Avis dermatologique recommandé.",
  },
  {
    name: "Khess",
    aliases: ["khess", "khess plus", "khessplus"],
    toxicIngredient: "Éclaircissants non contrôlés",
    dangerLevel: "moderate",
    effet: "Déséquilibre pigmentaire, sensibilité accrue au soleil",
    delai: "Effets progressifs",
    conseil: "Préférer des soins certifiés sans dépigmentant.",
  },
];

// Suggestions d'auto-complétion pour le champ « produits utilisés » (produits
// nocifs ET produits sains courants, + option « Aucun »).
// Suggestions : marques usuelles que les clients connaissent (sûres ET à risque).
// L'IA évalue la composition réelle de tout ce qui est saisi.
export const PRODUCT_SUGGESTIONS: string[] = [
  "Nivea",
  "CeraVe",
  "Bioderma",
  "La Roche-Posay",
  "Cetaphil",
  "Vaseline",
  "Topicrem",
  "Cérat",
  "Savon noir",
  "Huile de coco",
  "Beurre de karité",
  "Crème éclaircissante",
  "Movate",
  "Carotone",
  "Caro White",
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
