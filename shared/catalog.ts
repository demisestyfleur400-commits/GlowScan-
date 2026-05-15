export interface Product {
  id: string;
  name: string;
  description: string;
  category: "corps" | "visage" | "cheveux";
  price?: number;
  image?: string;
  targets: string[];
  usagePoints?: string[];
  whatsapp?: string;
  shopUrl?: string;
  brand?: string;
}

export function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR") + " FCFA";
}

export const BRAND_MAP: Record<string, string> = {
  "+237658651775": "Andrea Skincare",
  "+237688978963": "Hair Bloom",
  "+237655728663": "Ebony Hair",
};

export function getBrandByWhatsapp(whatsapp: string): string {
  return BRAND_MAP[whatsapp] || "Inconnu";
}

export function getProductBrand(product: Product): string {
  if (product.brand) return product.brand;
  if (product.whatsapp) return BRAND_MAP[product.whatsapp] || "Inconnu";
  return "Inconnu";
}

export const catalog: Product[] = [

  // ═══════════════════════════════════════════
  // ANDREA SKINCARE — Visage (partenaire local)
  // ═══════════════════════════════════════════

  {
    id: "creme-visage",
    name: "Crème Visage",
    description: "Crème de soin visage hydratante et nourrissante. Protège et sublime votre peau au quotidien.",
    category: "visage",
    price: 6000,
    targets: ["hydratation visage", "soin quotidien", "peau sèche", "protection cutanée"],
    usagePoints: ["Hydrate et protège le visage au quotidien", "Nourrit et sublime la peau"],
    whatsapp: "+237658651775"
  },
  {
    id: "serum-jeunesse",
    name: "Sérum Jeunesse Bluffant",
    description: "Anti-taches – Anti-rides – Hydratant. Sérum puissant multi-correcteur pour le visage. 30ml.",
    category: "visage",
    price: 8000,
    targets: ["rides", "taches brunes", "vieillissement cutané", "anti-âge"],
    usagePoints: ["Sérum éclat régénérant visage", "Réduit les taches et les rides"],
    whatsapp: "+237658651775"
  },
  {
    id: "gel-contour-yeux",
    name: "Gel Contour des Yeux",
    description: "Décongestionne – Hydrate – Éclaircit. Contre les taches et les poches. 30ml.",
    category: "visage",
    price: 6000,
    targets: ["cernes", "poches", "contour des yeux", "taches yeux"],
    usagePoints: ["Décongestionne et éclaircit le contour des yeux", "Réduit les cernes et les poches"],
    whatsapp: "+237658651775"
  },
  {
    id: "potion-lumiere",
    name: "Potion Lumière – Lotion Visage Super Éclat",
    description: "Réduit considérablement les taches du visage et unifie le teint. 100ml.",
    category: "visage",
    price: 8000,
    targets: ["éclat visage", "teint terne", "exfoliation douce", "taches visage"],
    usagePoints: ["Réduit les taches du visage", "Unifie le teint et apporte de l'éclat"],
    whatsapp: "+237658651775"
  },
  {
    id: "solution-douceur",
    name: "Solution Douceur – Lotion Traitante",
    description: "Lotion réparatrice, renforce la barrière naturelle de la peau. 100ml.",
    category: "visage",
    price: 8000,
    targets: ["acné", "imperfections", "boutons", "points noirs", "barrière cutanée"],
    usagePoints: ["Lotion réparatrice et traitante", "Renforce la barrière naturelle de la peau"],
    whatsapp: "+237658651775"
  },

  // ═══════════════════════════════════════════
  // ANDREA SKINCARE — Corps
  // ═══════════════════════════════════════════

  {
    id: "cocon-lumineux",
    name: "Cocon Lumineux – Crème Super Éclat",
    description: "Unifie – Illumine – Hydrate. Crème corporelle super éclat. 300ml.",
    category: "corps",
    price: 13000,
    targets: ["peaux ternes", "discolorations", "hyperpigmentation", "teint irrégulier"],
    usagePoints: ["Crème super éclat pour le corps", "Unifie, illumine et hydrate la peau"],
    whatsapp: "+237658651775"
  },
  {
    id: "tresor-cacao",
    name: "Trésor de Cacao – Crème Hydratation Intense",
    description: "Nourrit intensément – Répare – Protège. Crème ultra-nourrissante à base de beurres de cacao. 300ml.",
    category: "corps",
    price: 11000,
    targets: ["peau sèche", "peau déshydratée", "réparation cutanée"],
    usagePoints: ["Hydratation intense au beurre de cacao", "Nourrit et répare en profondeur"],
    whatsapp: "+237658651775"
  },
  {
    id: "gel-douche-eclat",
    name: "Gel de Douche Éclat",
    description: "Nettoie – Unifie – Hydrate. Gel douche éclat pour le corps. 250ml.",
    category: "corps",
    price: 6000,
    targets: ["nettoyage doux", "éclat du corps", "teint terne"],
    usagePoints: ["Nettoie en douceur et illumine la peau", "Respecte la barrière cutanée"],
    whatsapp: "+237658651775"
  },
  {
    id: "gommage-eclat",
    name: "Gommage Éclat Pur",
    description: "Gommage exfoliant doux. Illumine la peau et la débarrasse des peaux mortes. 250ml.",
    category: "corps",
    price: 8000,
    targets: ["exfoliation", "grain de peau irrégulier", "peau rugueuse", "peaux mortes"],
    usagePoints: ["Exfolie en douceur et illumine le teint", "Élimine les peaux mortes efficacement"],
    whatsapp: "+237658651775"
  },
  {
    id: "savon-corps",
    name: "Radiance Soap – Savon Éclat",
    description: "Savon nettoyant éclat. Nettoie, nourrit et illumine la peau. 100g.",
    category: "corps",
    price: 5000,
    targets: ["peau sèche", "hyperpigmentation", "nettoyage corps"],
    usagePoints: ["Nettoie et nourrit la peau en douceur", "Apporte éclat et luminosité"],
    whatsapp: "+237658651775"
  },
  {
    id: "serum-mains-pieds",
    name: "Sérum Main et Pieds",
    description: "Élimine en douceur les taches sur le tendon d'Achilles, le coude, les articulations. 100ml.",
    category: "corps",
    price: 8000,
    targets: ["zones sombres", "coudes noirs", "genoux noirs", "mains sèches", "taches"],
    usagePoints: ["Élimine les taches sur mains, pieds et coudes", "Éclaircit les zones sombres du corps"],
    whatsapp: "+237658651775"
  },
  {
    id: "huile-eclat",
    name: "Huile Éclat",
    description: "Huile corporelle éclat pour une peau lumineuse et nourrie. 100ml.",
    category: "corps",
    price: 6000,
    targets: ["éclat", "hydratation", "peau lumineuse", "nutrition"],
    usagePoints: ["Apporte éclat et luminosité à la peau", "Nourrit et hydrate intensément"],
    whatsapp: "+237658651775"
  },
  {
    id: "huile-essentielle",
    name: "L'Huile Essentielle Super Éclat",
    description: "Apporte un éclat particulier à votre peau. Huile essentielle super éclat. 100ml.",
    category: "corps",
    price: 8000,
    targets: ["éclat intense", "peau lumineuse", "soin corporel", "brillance"],
    usagePoints: ["Apporte un éclat particulier à la peau", "Soin super éclat quotidien"],
    whatsapp: "+237658651775"
  },

  // ═══════════════════════════════════════════
  // HAIR BLOOM — Cheveux (partenaire local)
  // ═══════════════════════════════════════════

  {
    id: "shampooing-chebe",
    name: "Shampooing Chebe – Hair Bloom",
    description: "Shampooing de Chébé 300ml. Nettoie en douceur sans agresser et prépare les cheveux aux soins.",
    category: "cheveux",
    price: 6500,
    targets: ["cheveux cassants", "cuir chevelu sensible", "nettoyage doux", "chute de cheveux"],
    usagePoints: ["Nettoie en douceur sans agresser", "Prépare les cheveux aux soins"],
    whatsapp: "+237688978963"
  },
  {
    id: "huile-chebe",
    name: "Huile Chebe – Hair Bloom",
    description: "Huile de Chébé hydratante 60ml avec propriétés de croissance capillaire.",
    category: "cheveux",
    price: 5000,
    targets: ["cheveux secs", "croissance cheveux", "hydratation capillaire", "épaisseur cheveux"],
    usagePoints: ["Nourrit intensément les cheveux secs", "Apporte souplesse et épaisseur"],
    whatsapp: "+237688978963"
  },
  {
    id: "creme-chebe",
    name: "Crème Chebe – Hair Bloom",
    description: "Crème de Chébé hydratante et nourrissante 200ml pour les cheveux à base d'extrait de Chébé.",
    category: "cheveux",
    price: 5500,
    targets: ["cheveux secs", "protection thermique", "nutrition capillaire", "cheveux abîmés"],
    usagePoints: ["Hydrate et nourrit en profondeur", "Protège contre la chaleur et les agressions extérieures"],
    whatsapp: "+237688978963"
  },
  {
    id: "poudre-chebe",
    name: "Poudre de Chébé – Hair Bloom",
    description: "Poudre de Chébé pure 100g. Renforce les cheveux, réduit la casse et favorise la pousse naturelle.",
    category: "cheveux",
    price: 5000,
    targets: ["chute de cheveux", "casse cheveux", "croissance cheveux", "renforcement capillaire"],
    usagePoints: ["Renforce les cheveux et réduit la casse", "Favorise la pousse naturelle"],
    whatsapp: "+237688978963"
  },
  {
    id: "serum-hairbloom",
    name: "Sérum Hair Bloom",
    description: "Sérum capillaire Hair Bloom 60ml. Apporte brillance, douceur et protection aux cheveux.",
    category: "cheveux",
    price: 7500,
    targets: ["cheveux ternes", "brillance cheveux", "protection capillaire", "douceur cheveux"],
    usagePoints: ["Apporte brillance et douceur", "Protège les cheveux des agressions"],
    whatsapp: "+237688978963"
  },

  // ═══════════════════════════════════════════
  // EBONY HAIR (BISSA'A Cosmetics) — 100% naturel, Douala
  // ═══════════════════════════════════════════

  {
    id: "ebony-hair-bain-huile",
    name: "Bain d'Huile Prodigieux Nourrissant",
    description: "Bain d'huile nourrissant pour cheveux secs. Hydrate en profondeur et apporte souplesse et brillance. 250ml.",
    category: "cheveux",
    price: 5500,
    targets: ["cheveux secs", "hydratation capillaire", "nutrition cheveux", "souplesse", "brillance"],
    usagePoints: ["Hydrate en profondeur les cheveux secs", "Apporte souplesse et brillance", "100% naturel"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-coiffante",
    name: "Huile Coiffante Protectrice",
    description: "Huile coiffante protectrice pour cheveux secs. Protège et nourrit tout en fixant la coiffure. 60ml.",
    category: "cheveux",
    price: 4500,
    targets: ["cheveux secs", "coiffage", "protection capillaire", "nutrition cheveux"],
    usagePoints: ["Protège et nourrit les cheveux", "Fixe et sublime la coiffure", "Formule 100% naturelle"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-soin-profond",
    name: "Soin Profond Nourrissant Lekie",
    description: "Masque extrêmement nourrissant pour cheveux secs, crépus, frisés ou défrisés. Restaure la fibre capillaire. 500ml.",
    category: "cheveux",
    price: 13000,
    targets: ["cheveux secs", "cheveux crépus", "cheveux frisés", "cheveux défrisés", "masque capillaire", "réparation", "nutrition intense"],
    usagePoints: ["Nourrit intensément les cheveux crépus et frisés", "Restaure la fibre capillaire abîmée", "Résultats visibles dès la première utilisation"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-shampoing-lekie",
    name: "Shampoing Solide Hydratant Lekie",
    description: "Shampoing solide doux pour cheveux secs. Nettoie en douceur tout en hydratant la fibre capillaire. 100g.",
    category: "cheveux",
    price: 5000,
    targets: ["cheveux secs", "nettoyage doux", "hydratation", "shampoing naturel", "sans sulfate"],
    usagePoints: ["Nettoie en douceur sans déssécher", "Hydrate la fibre capillaire", "Formule solide zéro déchet"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-apres-shampoing",
    name: "Après Shampoing Démêlant Lekie",
    description: "Après-shampoing démêlant qui nourrit intensément les cheveux crépus et frisés. Facilite le démêlage. 200ml.",
    category: "cheveux",
    price: 7000,
    targets: ["cheveux crépus", "cheveux frisés", "démêlage", "nœuds", "nutrition capillaire", "après shampoing"],
    usagePoints: ["Démêle sans tirer ni casser", "Nourrit intensément les cheveux crépus", "Laisse les cheveux doux et souples"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-spray-demelant",
    name: "Spray Démêlant Ebony Hair",
    description: "Spray démêlant qui assouplit immédiatement les cheveux et permet un démêlage facile et rapide. 200ml.",
    category: "cheveux",
    price: 7000,
    targets: ["démêlage", "cheveux emmêlés", "nœuds", "souplesse cheveux", "spray capillaire"],
    usagePoints: ["Assouplit immédiatement les cheveux", "Démêlage facile et rapide", "Peut s'utiliser sur cheveux humides ou secs"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-mousse-karite",
    name: "Mousse de Karité",
    description: "Crème coiffante nourrissante au karité pour cheveux secs. Hydrate, nourrit et définit les boucles. 100ml.",
    category: "cheveux",
    price: 6500,
    targets: ["cheveux secs", "boucles", "coiffage naturel", "karité", "nutrition cheveux", "définition boucles"],
    usagePoints: ["Nourrit et hydrate les cheveux secs", "Définit et sublime les boucles", "Au beurre de karité 100% naturel"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-masque-reparation",
    name: "Masque Réparation Totale Booster",
    description: "Masque extrêmement nourrissant pour cheveux secs, crépus, frisés ou défrisés. Répare en profondeur la fibre abîmée. 500ml.",
    category: "cheveux",
    price: 17000,
    targets: ["cheveux abîmés", "réparation capillaire", "cheveux cassants", "cheveux crépus", "soin intensif", "masque profond"],
    usagePoints: ["Répare la fibre capillaire en profondeur", "Idéal pour cheveux très abîmés ou cassants", "Résultats visibles après 1 utilisation"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-activateur-repousse",
    name: "Activateur de Repousse",
    description: "Crème pour alopécie localisée, tempes dégarnies, calvitie. Stimule la repousse des cheveux. 120ml.",
    category: "cheveux",
    price: 13000,
    targets: ["alopécie", "chute de cheveux", "tempes dégarnies", "calvitie", "repousse cheveux", "alopécie de traction"],
    usagePoints: ["Stimule la repousse sur les zones dégarnies", "Idéal pour alopécie de traction et calvitie", "Application sur cuir chevelu sec"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-ricin",
    name: "Huile de Ricin Pure",
    description: "Huile de ricin 100% naturelle pour favoriser la croissance des cheveux et renforcer la fibre capillaire. 50ml.",
    category: "cheveux",
    price: 8000,
    targets: ["croissance cheveux", "chute de cheveux", "renforcement capillaire", "huile naturelle", "cuir chevelu"],
    usagePoints: ["Favorise la croissance capillaire", "Renforce et épaissit la fibre", "Application en massage sur le cuir chevelu"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-avocat",
    name: "Huile d'Avocat Pure",
    description: "Huile végétale d'avocat pour cuirs chevelus secs et abîmés. Nourrit en profondeur. 50ml.",
    category: "cheveux",
    price: 7000,
    targets: ["cuir chevelu sec", "cheveux secs", "hydratation capillaire", "huile végétale", "nutrition cheveux"],
    usagePoints: ["Nourrit le cuir chevelu sec et abîmé", "Hydrate en profondeur la fibre capillaire", "Apporte brillance et souplesse"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-ail",
    name: "Huile d'Ail Pure",
    description: "Huile d'ail antipelliculaire qui assainit le cuir chevelu. Lutte contre les pellicules et stimule la pousse. 50ml.",
    category: "cheveux",
    price: 7000,
    targets: ["pellicules", "cuir chevelu gras", "antipelliculaire", "assainissement cuir chevelu", "démangeaisons"],
    usagePoints: ["Combat efficacement les pellicules", "Assainit le cuir chevelu", "Stimule la pousse"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-neem",
    name: "Huile de Neem Pure",
    description: "Huile de neem antibactérienne, antifongique et émolliente. Traite les problèmes de cuir chevelu. 50ml.",
    category: "cheveux",
    price: 7000,
    targets: ["pellicules", "cuir chevelu irrité", "dermatite séborrhéique", "antifongique", "démangeaisons cuir chevelu"],
    usagePoints: ["Propriétés antibactériennes et antifongiques", "Traite la dermatite séborrhéique", "Soulage les démangeaisons"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-coco",
    name: "Huile de Coco Pure",
    description: "Huile de coco 100% naturelle. Nourrit les cheveux et les rend brillants. Multiusage cheveux et peau. 50ml.",
    category: "cheveux",
    price: 7000,
    targets: ["cheveux secs", "brillance cheveux", "nutrition capillaire", "hydratation", "cheveux ternes"],
    usagePoints: ["Nourrit les cheveux et les rend brillants", "Peut s'utiliser sur cheveux et peau", "100% naturelle et pure"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-hair-huile-fenugrec",
    name: "Huile de Fenugrec Pure",
    description: "Huile de fenugrec répulsante et fortifiante. Renforce la fibre capillaire et prévient la chute. 50ml.",
    category: "cheveux",
    price: 8000,
    targets: ["chute de cheveux", "renforcement capillaire", "fortifiant cheveux", "cheveux fragilisés", "croissance cheveux"],
    usagePoints: ["Fortifie et renforce la fibre capillaire", "Prévient la chute des cheveux", "Stimule la repousse"],
    whatsapp: "+237655728663"
  },

  // Ebony Hair — Corps & Peau
  {
    id: "ebony-savon-noir",
    name: "Savon Noir Purifiant",
    description: "Savon noir naturel purifiant et nettoyant. Nettoie en profondeur, élimine impuretés et excès de sébum. 80g.",
    category: "corps",
    price: 5500,
    targets: ["peau grasse", "impuretés", "nettoyage profond", "purification peau", "sébum excessif"],
    usagePoints: ["Purifie et nettoie la peau en profondeur", "Élimine les impuretés et l'excès de sébum", "100% naturel"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-savon-exfoliant",
    name: "Savon Végétal Exfoliant",
    description: "Savon végétal exfoliant qui affine et adoucit le grain de peau. Élimine les cellules mortes. 100g.",
    category: "corps",
    price: 4500,
    targets: ["grain de peau", "peau rugueuse", "cellules mortes", "exfoliation", "peau douce", "teint terne"],
    usagePoints: ["Affine et adoucit le grain de peau", "Élimine les cellules mortes", "Révèle un teint plus lumineux"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-savon-surgras",
    name: "Savon Végétal Surgras",
    description: "Savon surgras à formule 100% naturelle, conçu pour nettoyer en douceur les peaux sèches et sensibles. 100g.",
    category: "corps",
    price: 4500,
    targets: ["peau sèche", "peau sensible", "nettoyage doux", "hydratation peau", "irritation peau"],
    usagePoints: ["Nettoie en douceur les peaux sèches", "Respecte le film hydrolipidique", "Idéal peaux sensibles"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-savon-corps",
    name: "Savon Barbe-Visage-Corps",
    description: "Savon au charbon actif qui nettoie la peau en profondeur, élimine peaux mortes et poils incarnés. 100g.",
    category: "corps",
    price: 5000,
    targets: ["poils incarnés", "peau mixte", "nettoyage visage", "charbon actif", "peau grasse", "barbe"],
    usagePoints: ["Nettoie la peau en profondeur au charbon actif", "Élimine peaux mortes et poils incarnés", "3-en-1 : barbe, visage, corps"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-glycerine-vegetale",
    name: "Glycérine Végétale Pure",
    description: "Humectant naturel pour cheveux et corps. Attire et retient l'humidité dans la peau et les cheveux. 50ml.",
    category: "corps",
    price: 4500,
    targets: ["peau sèche", "hydratation peau", "humectant naturel", "peau déshydratée", "cheveux secs"],
    usagePoints: ["Attire et retient l'humidité", "Idéale pour peaux et cheveux déshydratés", "Peut s'utiliser seule ou en mélange"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-huile-moringa",
    name: "Huile de Moringa Pure",
    description: "Huile de moringa antiseptique et anti-âge. Nourrit, protège et illumine la peau. 50ml.",
    category: "corps",
    price: 8000,
    targets: ["peau terne", "anti-âge", "rides", "nutrition peau", "éclat peau", "hyperpigmentation"],
    usagePoints: ["Propriétés antiseptiques et anti-âge", "Nourrit et illumine le teint", "Riche en antioxydants"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-huile-carotte",
    name: "Huile de Carotte Pure",
    description: "Huile de carotte qui apporte éclat et protection à l'épiderme. Riche en bêta-carotène. 50ml.",
    category: "corps",
    price: 7000,
    targets: ["teint terne", "éclat peau", "protection solaire naturelle", "hyperpigmentation", "taches peau", "unification teint"],
    usagePoints: ["Apporte éclat et luminosité au teint", "Protège l'épiderme", "Riche en bêta-carotène naturel"],
    whatsapp: "+237655728663"
  },
  {
    id: "ebony-huile-sesame",
    name: "Huile de Sésame Pure",
    description: "Huile de sésame qui aide à combattre le cuir chevelu sec. Nourrit et assouplit peau et cheveux. 50ml.",
    category: "corps",
    price: 7000,
    targets: ["peau sèche", "cuir chevelu sec", "nutrition peau", "sécheresse", "hydratation naturelle"],
    usagePoints: ["Combat efficacement la sécheresse cutanée", "Nourrit et assouplit la peau", "Convient peau et cheveux"],
    whatsapp: "+237655728663"
  },
];
