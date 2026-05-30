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
  /** Référence sourcing interne — usage propriétaire uniquement, jamais affiché client */
  sourceRef?: string;
}

export function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR") + " FCFA";
}

export const BRAND_MAP: Record<string, string> = {
  "+237658651775": "Andrea Skincare",
  "+237688978963": "Hair Bloom",
  "+237655728663": "Ebony Hair",
  "+237674377959": "GlowScan Dermo",
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

  // ═══════════════════════════════════════════════════════════════
  // GLOWSCAN DERMO — Sélection Dermocosmétique Premium
  // Formules référencées et recommandées par GlowScan AI
  // Nommées par ingrédient actif (pas par marque commerciale)
  // Commande & livraison via GlowScan : +237674377959
  // ═══════════════════════════════════════════════════════════════

  // ── VISAGE — Nettoyants ──────────────────────────────────────────
  {
    id: "gs-gel-nettoyant-sebum",
    name: "Gel Nettoyant Anti-Sébum Pores Net",
    brand: "GlowScan Dermo",
    description: "Gel nettoyant dermatologique formulé pour peaux grasses et acnéiques. Régule le sébum, désobstrue les pores, préserve le film hydrolipidique. Sans savon. 200ml.",
    category: "visage",
    price: 11000,
    targets: ["acné", "peau grasse", "pores dilatés", "points noirs", "excès de sébum", "brillance", "comédons", "impuretés visage"],
    usagePoints: [
      "Purifie les pores sans agresser la barrière cutanée",
      "Régule la production de sébum dès 2 semaines",
      "Formule dermo testée dermatologiquement"
    ],
    whatsapp: "+237674377959",
    sourceRef: "CeraVe Foaming Facial Cleanser 236ml — ou — Bioderma Sebium Gel Moussant 200ml",
  },
  // ── VISAGE — Sérums actifs ────────────────────────────────────────
  {
    id: "gs-serum-niacinamide",
    name: "Sérum Niacinamide 10% + Zinc PCA",
    brand: "GlowScan Dermo",
    description: "Sérum haute concentration en Niacinamide (Vitamine B3) et Zinc PCA. Resserre les pores, atténue les taches post-acné et régule le film sébacé. 30ml.",
    category: "visage",
    price: 11000,
    targets: ["pores dilatés", "taches post-acné", "peau grasse", "teint terne", "texture irrégulière", "acné", "hyperpigmentation", "imperfections"],
    usagePoints: [
      "Resserre les pores visibles en 4 semaines",
      "Atténue les taches et irrégularités de teint",
      "Régule le sébum sans effet desséchant"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Niacinamide 10% + Zinc 1% — 30ml",
  },
  {
    id: "gs-lotion-bha-acne",
    name: "Lotion Exfoliante BHA 2% Anti-Comédons",
    brand: "GlowScan Dermo",
    description: "Lotion exfoliante à l'acide salicylique (BHA 2%). Pénètre dans les pores pour déloger comédons ouverts et fermés. Texture légère, non grasse. 200ml.",
    category: "visage",
    price: 11500,
    targets: ["comédons", "points noirs", "pores dilatés", "acné", "texture irrégulière", "peau grasse", "exfoliation chimique", "bouchons sébacés"],
    usagePoints: [
      "Désengorge les pores et déloger les comédons dès 2 semaines",
      "Exfoliation chimique douce, sans abrasion",
      "Régularise la texture du grain de peau"
    ],
    whatsapp: "+237674377959",
    sourceRef: "Paula's Choice Skin Perfecting 2% BHA Liquid 118ml — ou — The Ordinary Salicylic Acid 2% Solution 30ml",
  },
  {
    id: "gs-serum-vitamine-c",
    name: "Sérum Éclat Vitamine C 15% Stabilisée",
    brand: "GlowScan Dermo",
    description: "Sérum antioxydant à haute dose de Vitamine C pure stabilisée. Illumine le teint, unifie les irrégularités et protège contre le photovieillissement. 30ml.",
    category: "visage",
    price: 14000,
    targets: ["teint terne", "taches brunes", "éclat visage", "anti-âge", "hyperpigmentation", "unification teint", "fatigue cutanée", "taches solaires"],
    usagePoints: [
      "Illumine et unifie le teint en 2 à 3 semaines",
      "Antioxydant puissant contre le vieillissement solaire",
      "Réduit l'apparence des taches brunes et solaires"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Vitamin C Suspension 23% + HA Spheres 2% 30ml — ou — Timeless Vitamin C + E Ferulic Serum 30ml",
  },
  {
    id: "gs-creme-antitaches-nuit",
    name: "Crème Dermo Anti-Taches Nuit Acide Azélaïque",
    brand: "GlowScan Dermo",
    description: "Crème de nuit dépigmentante à l'acide azélaïque 10% et niacinamide. Estompe le mélasma, les taches post-acné et les irrégularités de teint progressivement. 50ml.",
    category: "visage",
    price: 11000,
    targets: ["melasma", "taches brunes", "hyperpigmentation", "taches post-acné", "teint irrégulier", "peau terne", "masque de grossesse"],
    usagePoints: [
      "Réduit les taches visibles dès 4 semaines d'utilisation",
      "Formule nuit à action prolongée sur la mélanine",
      "Compatible peaux sensibles, peaux noires et métissées"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Azelaic Acid Suspension 10% 30ml — ou — COSRX AHA/BHA Clarifying Treatment Toner 150ml",
  },
  {
    id: "gs-serum-retinol",
    name: "Sérum Réparateur Rétinol 0.3% Nuit",
    brand: "GlowScan Dermo",
    description: "Sérum anti-âge au rétinol 0.3% encapsulé pour libération progressive. Renouvelle les cellules, lisse les ridules et améliore la densité cutanée. 30ml.",
    category: "visage",
    price: 13000,
    targets: ["rides", "ridules", "anti-âge", "vieillissement cutané", "taches brunes", "texture irrégulière", "affaissement cutané", "renouvellement cellulaire"],
    usagePoints: [
      "Stimule le renouvellement cellulaire nuit après nuit",
      "Lisse les ridules en 4 à 8 semaines",
      "Rétinol encapsulé — tolérance maximale même sur peaux sensibles"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Retinol 0.3% in Squalane 30ml — ou — CeraVe Resurfacing Retinol Serum 30ml",
  },

  // ── VISAGE — Protection & Crèmes ─────────────────────────────────
  {
    id: "gs-spf50-dermo",
    name: "Crème Solaire Dermo SPF 50+ Invisible",
    brand: "GlowScan Dermo",
    description: "Protection solaire dermatologique haute protection SPF 50+. Texture ultra-légère, fini invisible et non blanc sur toutes les carnations africaines. 50ml.",
    category: "visage",
    price: 14000,
    targets: ["protection solaire", "anti-taches", "photovieillissement", "teint terne", "peau sensible", "hyperpigmentation", "prévention taches", "rides solaires"],
    usagePoints: [
      "Protection SPF 50+ validée dermo — résiste à la chaleur équatoriale",
      "Fini invisible sur peau noire, métissée et caramel",
      "Prévient activement la reformation des taches traitées"
    ],
    whatsapp: "+237674377959",
    sourceRef: "La Roche-Posay Anthelios Invisible SPF50+ Fluid 50ml — ou — Bioderma Photoderm MAX SPF50+ Spray 150ml",
  },
  {
    id: "gs-creme-barriere-hydra",
    name: "Crème Barrière Hydra-Repair Céramides",
    brand: "GlowScan Dermo",
    description: "Crème réparatrice riche en céramides, acide hyaluronique et beurre de karité. Restaure la barrière cutanée affaiblie et scelle l'hydratation. 50ml.",
    category: "visage",
    price: 11000,
    targets: ["peau sèche", "peau déshydratée", "barrière cutanée", "tiraillements", "peau sensible", "réparation cutanée", "eczéma léger", "peau fragilisée"],
    usagePoints: [
      "Restaure la barrière cutanée affaiblie en 72h",
      "Formule riche en céramides identiques aux céramides naturels",
      "Hydratation non-grasse, compatible toutes saisons"
    ],
    whatsapp: "+237674377959",
    sourceRef: "CeraVe Moisturizing Cream 177ml — ou — Bioderma Atoderm Intensive Baume 200ml",
  },

  // ═══════════════════════════════════════════════════════════════════
  // BIODERMA — Dermatologie Pharmacie (disponible Cameroun)
  // ═══════════════════════════════════════════════════════════════════

  // ── Gamme Atoderm (peaux sèches / atopiques / eczéma) ──
  {
    id: "bio-atoderm-gel-douche",
    name: "Atoderm Gel Douche",
    brand: "Bioderma",
    description: "Gel nettoyant corps doux pour peaux normales à sèches. Nettoie sans agresser le film hydrolipidique. Peau propre, douce et confortable au quotidien. 500ml.",
    category: "corps",
    price: 9500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B166060%7D_%7BBIO_ATODERM_GEL_DOUCHE%7D_%7B28119D%7D.png?itok=vKo1Z0e1",
    targets: ["peau sèche corps", "nettoyant corps", "peau sensible", "hydratation corps", "sécheresse cutanée"],
    usagePoints: ["Nettoie en douceur", "Respecte le film hydrolipidique", "Usage quotidien corps"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-atoderm-huile-douche",
    name: "Atoderm Huile de Douche",
    brand: "Bioderma",
    description: "Huile lavante ultra-nourrissante pour peaux très sèches et atopiques. Apaise les tiraillements et nourrit intensément en un seul geste. 200ml.",
    category: "corps",
    price: 10500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B203352%7D_%7BBIO_ATODERM_HUILE_DE_DOUCHE%7D_%7BA01013300%7D.png?itok=z971RqoV",
    targets: ["peau très sèche", "peau atopique", "eczéma corps", "xérose sévère", "tiraillements"],
    usagePoints: ["Nourrit intensément peau atopique", "Apaise les tiraillements", "Formule huile ultra-nourrissante"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-atoderm-intensive-gel",
    name: "Atoderm Intensive Gel Moussant",
    brand: "Bioderma",
    description: "Gel nettoyant surconcentré pour peaux atopiques sujettes aux poussées d'eczéma. Apaise les démangeaisons et protège la barrière cutanée fragilisée. 200ml.",
    category: "corps",
    price: 10000,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B178231%7D_%7BBIO_ATODERM_INTENSIVE_GEL_MOUSSANT%7D_%7B28134B%7D.png?itok=y4nbKWKz",
    targets: ["eczéma atopique", "peau atopique", "dermatite atopique", "barrière cutanée", "démangeaisons corps"],
    usagePoints: ["Calme les poussées d'eczéma", "Renforce la barrière cutanée", "Sans savon — formule surconcentrée"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-atoderm-intensive-pain",
    name: "Atoderm Intensive Pain Dermatologique",
    brand: "Bioderma",
    description: "Pain de soin sans savon pour peaux atopiques et très sensibles. Nettoie, apaise et protège sans irriter la barrière cutanée. 150g.",
    category: "corps",
    price: 9000,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B158296%7D_%7BBIO_ATODERM_INTENSIVE_PAIN%7D_%7B28092C%7D.png?itok=C3Slenq-",
    targets: ["eczéma atopique", "peau sèche sévère", "peau très sensible", "nettoyant doux corps", "bébé"],
    usagePoints: ["Sans savon agressif", "Peaux très sensibles et atopiques", "Apaise et protège la barrière"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Sébium (peaux mixtes / grasses / acnéiques) ──
  {
    id: "bio-sebium-gel-moussant",
    name: "Sébium Gel Moussant Purifiant",
    brand: "Bioderma",
    description: "Gel nettoyant moussant purifiant pour peaux mixtes à grasses et acnéiques. Régule le sébum, purifie les pores et prévient les boutons. 200ml.",
    category: "visage",
    price: 9000,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B202461%7D_%7BBIO_SEBIUM_GEL_MOUSSANT%7D_%7B28664B%7D.png?itok=3jrGsuMc",
    targets: ["peau grasse", "acné", "pores dilatés", "sébum excessif", "boutons", "peau mixte", "imperfections visage"],
    usagePoints: ["Régule le sébum en profondeur", "Prévient les boutons", "Purifie sans assécher"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-sebium-gel-gommant",
    name: "Sébium Gel Gommant Exfoliant",
    brand: "Bioderma",
    description: "Gel exfoliant purifiant pour peaux mixtes à grasses. Élimine les cellules mortes, désobstrue les pores, réduit les points noirs et unifie le teint. 100ml.",
    category: "visage",
    price: 9500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B158818%7D_%7BBIO_SEBIUM_GEL_GOMMANT%7D_%7B28625I%7D.png?itok=7ULZh92c",
    targets: ["peau grasse", "comédons", "pores dilatés", "exfoliation visage", "points noirs", "acné rétentionnelle"],
    usagePoints: ["Désobstrue les pores en profondeur", "Élimine les points noirs", "Gommage doux 2×/semaine"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Pigmentbio (hyperpigmentation — peaux noires) ──
  {
    id: "bio-pigmentbio-foaming-cream",
    name: "Pigmentbio Foaming Cream Anti-Taches",
    brand: "Bioderma",
    description: "Crème lavante éclat anti-taches pour peaux hyperpigmentées. Agit dès le nettoyage sur les taches brunes et le mélasma. Conçu pour peaux noires et métissées. 200ml.",
    category: "visage",
    price: 12500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B158659%7D_%7BBIO_PIGMENTBIO_FOAMING_CREAM%7D_%7B28914B%7D.png?itok=1QDm1XXr",
    targets: ["taches brunes", "hyperpigmentation", "PIH", "mélasma", "teint terne", "peau noire", "taches post-acné", "unification teint", "éclat"],
    usagePoints: ["Agit dès le nettoyage sur les taches", "Formule spéciale peaux noires et métissées", "Prépare les soins anti-taches"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-pigmentbio-h2o",
    name: "Pigmentbio H2O Eau Micellaire",
    brand: "Bioderma",
    description: "Eau micellaire démaquillante anti-taches pour peaux hyperpigmentées. Nettoie, démaquille et agit progressivement sur les taches en un seul geste. 250ml.",
    category: "visage",
    price: 12000,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B224370%7D_%7BBIO_PIGMENTBIO_H2O%7D_%7BA01006600%7D.png?itok=T5ouo7Gc",
    targets: ["taches brunes", "hyperpigmentation", "maquillage", "démaquillant", "PIH", "peau noire", "mélasma", "taches solaires"],
    usagePoints: ["Nettoie et démaquille anti-taches", "Action éclat progressive", "Idéal peaux noires et métissées"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Sensibio / Hydrabio (peaux sensibles / déshydratées) ──
  {
    id: "bio-sensibio-gel-moussant",
    name: "Sensibio Gel Moussant Douceur",
    brand: "Bioderma",
    description: "Gel nettoyant ultra-doux pour peaux sensibles et réactives. Nettoie respectueusement sans agresser ni dessécher. Sans parfum, sans alcool. 200ml.",
    category: "visage",
    price: 9500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/fancybox_2000_2000/public/products/%7B157474%7D_%7B%7D_%7B28727%7D.jpg?itok=gn2h9U6D",
    targets: ["peau sensible", "peau réactive", "nettoyant doux visage", "intolérance cutanée", "peau fragile", "eczéma visage"],
    usagePoints: ["Ultra douceur sans agression", "Respecte les peaux réactives", "Sans parfum ni alcool"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-hydrabio-gel-moussant",
    name: "Hydrabio Gel Moussant",
    brand: "Bioderma",
    description: "Gel nettoyant moussant pour peaux normales à mixtes déshydratées. Nettoie en profondeur tout en préservant le niveau d'hydratation cutanée. 150ml.",
    category: "visage",
    price: 9500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B173051%7D_%7BBIO_HYDRABIO_GEL_MOUSSANT%7D_%7B28384%7D.png?itok=wRpju0Ge",
    targets: ["peau déshydratée", "nettoyant visage", "peau mixte", "hydratation visage", "tiraillements visage"],
    usagePoints: ["Nettoie sans assécher", "Préserve l'hydratation naturelle", "Pour peaux déshydratées"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Node DS (cuir chevelu / pellicules) ──
  {
    id: "bio-node-ds",
    name: "Node DS Shampooing Antipelliculaire",
    brand: "Bioderma",
    description: "Shampooing traitant antipelliculaire pour dermite séborrhéique du cuir chevelu. Réduit les pellicules, démangeaisons et squames. 125ml.",
    category: "cheveux",
    price: 10000,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B158425%7D_%7BBIO_NODE_DS%7D_%7B28438A%7D.png?itok=5K9fBnE2",
    targets: ["pellicules", "dermite séborrhéique", "cuir chevelu gras", "démangeaisons cuir chevelu", "squames"],
    usagePoints: ["Élimine les pellicules et squames", "Apaise le cuir chevelu irrité", "Shampooing traitant dermatologique"],
    whatsapp: "+237674377959",
  },

  // ── Photoderm (protection solaire peaux foncées) ──
  {
    id: "bio-photoderm-xdefense-spf50",
    name: "Photoderm XDefense Ultra Fluid SPF50+ T03",
    brand: "Bioderma",
    description: "Fluide solaire ultra-léger SPF50+ Teinte 03 pour peaux foncées et africaines. Protection UVA/UVB très haute, fini naturel sans effet blanc sur peaux noires. 40ml.",
    category: "visage",
    price: 15000,
    image: "https://www.bioderma.ae/sites/ae/files/styles/product_packshot_slider/public/products/%7B142519%7D_%7B%7D_%7B28598%7D.png?itok=ZGiq3ck4",
    targets: ["protection solaire", "SPF50", "peau noire", "teinte foncée", "phototype IV V VI", "écran solaire", "anti-UV", "taches solaires"],
    usagePoints: ["Protection SPF50+ très haute", "Teinte 03 adaptée peaux africaines", "Fini invisible sans effet blanc"],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════════
  // URIAGE — Dermatologie Pharmacie (disponible Cameroun)
  // ═══════════════════════════════════════════════════════════════════

  // ── Gamme Eau Thermale (hydratation & confort) ──
  {
    id: "uriage-creme-eau-riche",
    name: "Eau Thermale Crème Riche",
    brand: "Uriage",
    description: "Crème hydratante riche à l'eau thermale d'Uriage pour peaux sèches à très sèches. Nourrit, apaise et restaure le confort cutané durablement.",
    category: "visage",
    price: 9000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-fr-creme-eau-riche.png",
    targets: ["peau sèche visage", "hydratation", "confort cutané", "peau sèche africaine", "tiraillements visage"],
    usagePoints: ["Hydratation intense peau sèche", "Eau thermale apaisante", "Confort longue durée"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-serum-booster-ha",
    name: "Hyalusome Sérum Booster Hyaluronique",
    brand: "Uriage",
    description: "Sérum concentré à l'acide hyaluronique pour booster l'hydratation et repulper la peau. Lisse les ridules de déshydratation et redonne de l'éclat. 30ml.",
    category: "visage",
    price: 14000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-serum-booster-ha.png",
    targets: ["ridules déshydratation", "éclat teint", "hydratation profonde", "acide hyaluronique", "peau terne", "déshydratation"],
    usagePoints: ["Repulpe et lisse les ridules", "Booster d'hydratation intensif", "Éclat immédiat"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-gelee-eau",
    name: "Eau Thermale Gelée Hydratante",
    brand: "Uriage",
    description: "Gelée hydratante légère à l'eau thermale pour peaux normales à mixtes. Texture gel fraîche qui hydrate sans laisser de film gras. Idéale au quotidien.",
    category: "visage",
    price: 8500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-fr-gelee-eau.png",
    targets: ["peau mixte", "hydratation légère", "peau normale", "teint frais", "texture légère"],
    usagePoints: ["Texture gel légère non grasse", "Hydratation quotidienne", "Fraîcheur immédiate"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-essence-eau",
    name: "Eau Thermale Essence Hydratante",
    brand: "Uriage",
    description: "Essence de soin à l'eau thermale d'Uriage. Prépare la peau à mieux absorber les soins hydratants, booste leur efficacité et unifie le teint.",
    category: "visage",
    price: 8000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-fr-essence-eau.png",
    targets: ["préparation peau", "absorption soins", "hydratation", "éclat", "routine visage"],
    usagePoints: ["Booste l'efficacité des soins", "Prépare la peau", "Unifie le teint progressivement"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-stick-levres",
    name: "Stick Lèvres Eau Thermale",
    brand: "Uriage",
    description: "Stick soin nourrissant et protecteur pour lèvres sèches et gercées. Eau thermale + cire d'abeille pour réparer et adoucir durablement les lèvres.",
    category: "corps",
    price: 5000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-eau-thermale-stick-levre.png",
    targets: ["lèvres sèches", "lèvres gercées", "soin lèvres", "protection lèvres"],
    usagePoints: ["Répare les lèvres gercées", "Protection et nutrition", "Usage quotidien"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-gel-hydratant",
    name: "Eau Thermale Gel Hydratant",
    brand: "Uriage",
    description: "Gel hydratant universel à l'eau thermale. Texture légère et fraîche adaptée à toutes peaux. Apaise, hydrate et rafraîchit au quotidien.",
    category: "visage",
    price: 7500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-gel.png",
    targets: ["hydratation universelle", "toutes peaux", "peau sensible", "soin quotidien", "fraîcheur"],
    usagePoints: ["Convient à toutes les peaux", "Hydratation légère quotidienne", "Apaise et rafraîchit"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Hyséac (peaux mixtes / grasses / acnéiques) ──
  {
    id: "uriage-hyseac-3regul",
    name: "Hyséac 3-Regul+ Soin Global Anti-Acné",
    brand: "Uriage",
    description: "Soin global anti-imperfections pour peaux à tendance acnéique. Régule le sébum, réduit les boutons, resserre les pores et unifie le teint en 4 semaines. 40ml.",
    category: "visage",
    price: 11500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-3-1689943261.png",
    targets: ["acné", "peau grasse", "pores dilatés", "boutons", "sébum", "imperfections", "peau mixte", "acné hormonale"],
    usagePoints: ["Réduit boutons et rougeurs en 4 semaines", "Régule le sébum", "Resserre les pores visibles"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-hyseac-gel-nettoyant",
    name: "Hyséac Gel Nettoyant Purifiant",
    brand: "Uriage",
    description: "Gel nettoyant purifiant pour peaux mixtes à grasses. Élimine l'excès de sébum, nettoie les pores en profondeur et prévient les imperfections. 150ml.",
    category: "visage",
    price: 8500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-gel-nettoyant.png",
    targets: ["peau grasse", "acné", "nettoyant visage", "pores bouchés", "sébum excessif", "imperfections"],
    usagePoints: ["Nettoie les pores en profondeur", "Réduit le sébum", "Prévient les boutons"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-fluide-matifiant-spf50",
    name: "Bariésun Fluide Matifiant SPF50+",
    brand: "Uriage",
    description: "Fluide solaire matifiant SPF50+ pour peaux grasses et mixtes. Protection très haute, texture légère qui contrôle le brillant toute la journée. 40ml.",
    category: "visage",
    price: 13000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-fluide-matifiant-1750145712.png",
    targets: ["protection solaire", "SPF50", "peau grasse", "effet mat", "anti-brillance", "acné", "peau mixte"],
    usagePoints: ["Protection SPF50+ très haute", "Effet mat longue durée", "Pour peaux grasses et acnéiques"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-hyseac-pate-sos",
    name: "Hyséac Pâte SOS Soin Ciblé Boutons",
    brand: "Uriage",
    description: "Soin ciblé SOS à appliquer directement sur chaque bouton. Assèche, réduit et camoufle le bouton en 24-48h. Formule translucide. 15ml.",
    category: "visage",
    price: 7000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-pate-sos-hyseac.png",
    targets: ["boutons acné", "imperfection localisée", "soin ciblé", "acné ponctuelle", "soin express bouton"],
    usagePoints: ["Sèche le bouton en 24-48h", "Application localisée sur chaque bouton", "Effet camouflant translucide"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Dépiderm (anti-taches — idéal peaux africaines) ──
  {
    id: "uriage-depiderm-soin-nuit",
    name: "Dépiderm Soin Anti-Taches Nuit",
    brand: "Uriage",
    description: "Soin de nuit dépigmentant pour taches brunes, mélasma et hyperpigmentation post-inflammatoire. Agit pendant le sommeil pour un teint unifié progressivement.",
    category: "visage",
    price: 12500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-depiderm-1769945740.png",
    targets: ["taches brunes", "mélasma", "hyperpigmentation", "PIH", "taches post-acné", "peau noire", "teint terne"],
    usagePoints: ["Agit sur les taches pendant le sommeil", "Estompe mélasma et PIH", "Idéal peaux noires et métissées"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-depiderm-soin-jour",
    name: "Dépiderm Soin Anti-Taches SPF30",
    brand: "Uriage",
    description: "Soin de jour anti-taches avec protection solaire SPF30. Atténue les taches et prévient leur aggravation par le soleil. Formule légère pour usage quotidien.",
    category: "visage",
    price: 12500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-soin-depiderm.png",
    targets: ["taches brunes", "mélasma", "hyperpigmentation", "PIH", "protection solaire", "teint unifié", "peau noire"],
    usagePoints: ["Anti-taches + SPF30 en un geste", "Prévient l'aggravation par le soleil", "Traitement de jour"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-depiderm-serum",
    name: "Dépiderm Sérum Anti-Taches Concentré",
    brand: "Uriage",
    description: "Sérum concentré haute efficacité contre les taches brunes et le mélasma. Formule intensive pour résultats visibles plus rapides. Pour peaux hyperpigmentées. 30ml.",
    category: "visage",
    price: 14500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-depi-serum-2.png",
    targets: ["taches brunes", "mélasma", "hyperpigmentation sévère", "PIH", "teint terne", "unification teint", "peau noire", "taches solaires"],
    usagePoints: ["Concentration maximale anti-taches", "Résultats visibles en 4 semaines", "Complète le soin de jour/nuit Dépiderm"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Bariésun (protection solaire) ──
  {
    id: "uriage-bariesun-lait-spf50",
    name: "Bariésun Lait Hydratant SPF50+",
    brand: "Uriage",
    description: "Lait solaire hydratant protection très haute SPF50+. Formule légère pour corps et visage. Résistant à l'eau, convient à toute la famille.",
    category: "corps",
    price: 13000,
    image: "https://cdn.uriage.fr/var/images/resized/push_product_main_menu/bariesun-lait-hydratant-nc.png",
    targets: ["protection solaire corps", "SPF50", "famille", "exposition solaire", "écran solaire", "anti-UV corps"],
    usagePoints: ["Protection SPF50+ résistant à l'eau", "Corps + visage", "Hydratation + protection"],
    whatsapp: "+237674377959",
  },

  // ── Gamme Xémose (peau sèche / atopique) ──
  {
    id: "uriage-xemose-soin-cdy",
    name: "Xémose Soin CDY Peaux Atopiques",
    brand: "Uriage",
    description: "Soin émollient pour peaux atopiques sèches sujettes à l'eczéma. Restaure le film lipidique, calme les démangeaisons et réduit la fréquence des poussées.",
    category: "corps",
    price: 11000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-xemosec8-soin-cdy.png",
    targets: ["peau atopique", "eczéma", "peau très sèche", "démangeaisons corps", "dermatite atopique", "xérose"],
    usagePoints: ["Calme les démangeaisons de l'eczéma", "Restaure le film lipidique", "Réduit les poussées atopiques"],
    whatsapp: "+237674377959",
  },

  // ── Kératosane (peau rugueuse / kératose pilaire) ──
  {
    id: "uriage-keratasone-lissant",
    name: "Kératosane 30 Crème Lissante",
    brand: "Uriage",
    description: "Crème kératolytique à l'urée 30% pour peaux très sèches et rugueuses. Lisse la peau épaissie (kératose pilaire 'peau de poulet'), cals et zones rugueuses. 75ml.",
    category: "corps",
    price: 10000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_slider/fr-fr-lissant.png",
    targets: ["kératose pilaire", "peau rugueuse", "peau de poulet", "cals", "peau épaissie", "urée", "xérose sévère"],
    usagePoints: ["Lisse la kératose pilaire (peau de poulet)", "Urée 30% kératolytique", "Zones très rugueuses corps"],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOPICREM — Dermatologie Pharmacie (disponible Cameroun)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "topicrem-ac-gel-nettoyant",
    name: "AC Control Gel Nettoyant Purifiant",
    brand: "Topicrem",
    description: "Gel nettoyant purifiant pour peaux mixtes à grasses sujettes aux imperfections. Élimine l'excès de sébum, nettoie en profondeur et prévient les boutons. 200ml.",
    category: "visage",
    price: 7500,
    image: "https://fr.topicrem.com/cdn/shop/files/PRODUIT-ACCONTROL-GELNETTOYANT200ML-Visuel1_2a40657a-6116-405f-a455-a5411a0f1b3a.jpg?v=1722265476&width=1946",
    targets: ["peau grasse", "acné", "boutons", "sébum excessif", "pores bouchés", "imperfections", "peau mixte", "nettoyant visage"],
    usagePoints: ["Purifie et régule le sébum", "Prévient les imperfections", "Nettoyage profond sans agresser"],
    whatsapp: "+237674377959",
  },
  {
    id: "topicrem-ac-masque",
    name: "AC Control Masque Purifiant",
    brand: "Topicrem",
    description: "Masque purifiant à l'argile pour peaux grasses et acnéiques. Absorbe l'excès de sébum, désobstrue les pores et réduit les boutons visibles. À utiliser 1 à 2 fois par semaine.",
    category: "visage",
    price: 9000,
    image: "https://fr.topicrem.com/cdn/shop/files/PRODUIT-ACCONTROL-MASQUE-Visuel1_70d8bef5-ef01-4b68-83b1-dfcb6270ba33.jpg?v=1722265454&width=713",
    targets: ["peau grasse", "acné", "pores dilatés", "points noirs", "sébum", "masque purifiant", "imperfections", "excès de gras"],
    usagePoints: ["Absorbe l'excès de sébum en 10 min", "Désobstrue les pores visibles", "Masque purifiant 1-2×/semaine"],
    whatsapp: "+237674377959",
  },
  {
    id: "topicrem-uh-lait-douche",
    name: "UH Lait de Douche Ultra-Hydratant",
    brand: "Topicrem",
    description: "Lait de douche ultra-hydratant pour peaux sèches et sensibles. Nettoie en douceur, nourrit et laisse la peau douce et confortable après chaque douche. 400ml.",
    category: "corps",
    price: 8000,
    image: "https://fr.topicrem.com/cdn/shop/files/PRODUIT-UH-LAIT_DOUCHE_PACKSHOT-AVANT.jpg?v=1755091767&width=713",
    targets: ["peau sèche corps", "peau sensible", "nettoyant corps doux", "hydratation corps", "sécheresse cutanée", "confort"],
    usagePoints: ["Nettoie et hydrate en un geste", "Peau douce après douche", "Formule douce peau sèche et sensible"],
    whatsapp: "+237674377959",
  },
  {
    id: "topicrem-sun-protect-mousse",
    name: "Sun Protect Mousse Solaire SPF50+",
    brand: "Topicrem",
    description: "Mousse solaire protection très haute SPF50+ pour visage et corps. Texture mousse légère et originale, absorption rapide. Protection UVA/UVB, résistante à l'eau.",
    category: "visage",
    price: 12000,
    image: "https://fr.topicrem.com/cdn/shop/files/PRODUIT-SUN-PROTECT-MOUSSE-Visuel1_780283f2-e886-433b-bd9e-41b7ffa7cff6.jpg?v=1773757164&width=713",
    targets: ["protection solaire", "SPF50", "écran solaire", "anti-UV", "texture mousse", "visage corps", "exposition solaire"],
    usagePoints: ["SPF50+ protection très haute", "Texture mousse légère originale", "Résistant à l'eau"],
    whatsapp: "+237674377959",
  },

  // ── KITS PREMIUM — Circuit GlowScan fermé, AOV élevé ─────────────
  {
    id: "kit-peau-nette-30j",
    name: "Kit Peau Nette 30J — Acné & Pores",
    brand: "GlowScan Dermo",
    description: "Protocole anti-acné complet sur 30 jours. Inclus : Gel Nettoyant Anti-Sébum + Lotion BHA 2% + Sérum Niacinamide 10%. Valeur séparée : 33 500 FCFA — kit à 25 000 FCFA.",
    category: "visage",
    price: 25000,
    targets: ["acné", "peau grasse", "pores dilatés", "points noirs", "comédons", "boutons", "sébum excessif", "imperfections", "peau mixte"],
    usagePoints: [
      "3 produits synergiques — valeur séparée 33 500 FCFA",
      "Résultats visibles et mesurables en 4 semaines",
      "Gel Nettoyant + Lotion BHA + Sérum Niacinamide inclus"
    ],
    whatsapp: "+237674377959",
    sourceRef: "① CeraVe Foaming Cleanser 236ml  ② Paula's Choice BHA 2% 118ml  ③ The Ordinary Niacinamide 10% 30ml",
  },
  {
    id: "kit-eclat-antitaches-30j",
    name: "Kit Éclat & Teint Unifié — Taches & Hyperpigmentation",
    brand: "GlowScan Dermo",
    description: "Protocole dermo anti-taches complet. Inclus : Sérum Vitamine C 15% + Crème Anti-Taches Nuit + Crème Solaire SPF50+. Valeur séparée : 39 000 FCFA — kit à 25 000 FCFA.",
    category: "visage",
    price: 25000,
    targets: ["hyperpigmentation", "taches brunes", "melasma", "teint terne", "unification teint", "éclat visage", "taches solaires", "masque de grossesse", "taches post-acné"],
    usagePoints: [
      "3 produits synergiques — valeur séparée 39 000 FCFA",
      "Résultats visibles en 30 jours d'utilisation régulière",
      "Vitamine C + Anti-Taches Nuit + SPF50+ inclus"
    ],
    whatsapp: "+237674377959",
    sourceRef: "① The Ordinary Vit C 23% 30ml  ② The Ordinary Azelaic Acid 10% 30ml  ③ La Roche-Posay Anthelios SPF50+ 50ml",
  },
  {
    id: "kit-anti-age-30j",
    name: "Kit Anti-Âge Restructurant 30J",
    brand: "GlowScan Dermo",
    description: "Protocole anti-âge haute performance. Inclus : Sérum Rétinol 0.3% + Sérum Vitamine C 15% + Crème Barrière Céramides. Valeur séparée : 38 000 FCFA — kit à 25 000 FCFA.",
    category: "visage",
    price: 25000,
    targets: ["rides", "anti-âge", "affaissement cutané", "vieillissement cutané", "taches brunes", "perte de fermeté", "peau mature", "ridules", "éclat"],
    usagePoints: [
      "3 produits synergiques — valeur séparée 38 000 FCFA",
      "Résultats sur rides et fermeté en 6 à 8 semaines",
      "Rétinol 0.3% + Vitamine C 15% + Céramides inclus"
    ],
    whatsapp: "+237674377959",
    sourceRef: "① The Ordinary Retinol 0.3% 30ml  ② Timeless Vit C+E Ferulic 30ml  ③ CeraVe Moisturizing Cream 177ml",
  },
];
