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
  // GRANDES MARQUES INTERNATIONALES — Visage
  // ═══════════════════════════════════════════

  {
    id: "garnier-eau-micellaire",
    name: "Eau Micellaire Pure Sensitive",
    description: "Eau micellaire nettoyante tout-en-un. Élimine maquillage, impuretés et excès de sébum en douceur. Testée dermatologiquement. 400ml.",
    category: "visage",
    price: 7500,
    brand: "Garnier",
    targets: ["nettoyage visage", "démaquillage", "peau sensible", "impuretés", "sébum"],
    usagePoints: ["Nettoie et démaquille en une seule étape", "Doux pour les peaux sensibles", "Sans rinçage"],
    shopUrl: "https://www.jumia.cm/catalog/?q=garnier+eau+micellaire"
  },
  {
    id: "garnier-creme-spf",
    name: "Crème de Jour Hydratante SPF 15",
    description: "Crème de jour hydratante avec protection solaire SPF 15. Hydrate 24h et protège contre les UV. Pour peaux normales à mixtes. 50ml.",
    category: "visage",
    price: 8500,
    brand: "Garnier",
    targets: ["hydratation visage", "protection solaire", "SPF", "UV", "peau mixte", "peau normale"],
    usagePoints: ["Hydrate la peau pendant 24h", "Protège des UV avec SPF 15", "Application matin sur peau propre"],
    shopUrl: "https://www.jumia.cm/catalog/?q=garnier+creme+jour+spf"
  },
  {
    id: "neutrogena-hydro-boost",
    name: "Hydro Boost Gel-Crème",
    description: "Gel-crème à l'acide hyaluronique. Hydrate intensément et maintient l'hydratation 24h. Texture légère non grasse. 50ml.",
    category: "visage",
    price: 12500,
    brand: "Neutrogena",
    targets: ["hydratation intense", "acide hyaluronique", "peau déshydratée", "texture légère", "peau grasse"],
    usagePoints: ["Hydratation intense à l'acide hyaluronique", "Texture gel légère non comédogène", "Convient aux peaux grasses et mixtes"],
    shopUrl: "https://www.jumia.cm/catalog/?q=neutrogena+hydro+boost"
  },
  {
    id: "cerave-creme",
    name: "Crème Hydratante Visage & Corps",
    description: "Crème hydratante avec céramides et acide hyaluronique. Restaure la barrière naturelle de la peau. Recommandée par les dermatologues. 177ml.",
    category: "visage",
    price: 15000,
    brand: "CeraVe",
    targets: ["barrière cutanée", "céramides", "peau sèche", "eczéma", "peau sensible", "hydratation durable"],
    usagePoints: ["Restaure la barrière cutanée aux céramides", "Recommandée par les dermatologues", "Non grasse, absorbe vite"],
    shopUrl: "https://www.jumia.cm/catalog/?q=cerave+creme+hydratante"
  },
  {
    id: "lrp-effaclar-gel",
    name: "Effaclar Gel Moussant Purifiant",
    description: "Gel nettoyant purifiant pour peaux grasses et à tendance acnéique. Élimine l'excès de sébum sans dessécher. 200ml.",
    category: "visage",
    price: 14000,
    brand: "La Roche-Posay",
    targets: ["peau grasse", "acné", "sébum", "pores dilatés", "imperfections", "points noirs"],
    usagePoints: ["Nettoie en profondeur les pores", "Réduit le sébum sans dessécher", "Testé sur peaux acnéiques"],
    shopUrl: "https://www.jumia.cm/catalog/?q=la+roche+posay+effaclar"
  },
  {
    id: "nivea-creme-visage",
    name: "Crème Soin Nourrissante",
    description: "La crème bleue iconique Nivea. Hydrate et protège intensément peau et corps. Formule enrichie au panthenol. 150ml.",
    category: "visage",
    price: 6500,
    brand: "Nivea",
    targets: ["peau sèche", "hydratation", "nutrition", "soin quotidien", "protection"],
    usagePoints: ["Hydrate et nourrit intensément", "Formule iconique au panthenol", "Utilisable visage et corps"],
    shopUrl: "https://www.jumia.cm/catalog/?q=nivea+creme+bleue"
  },

  // ═══════════════════════════════════════════
  // GRANDES MARQUES INTERNATIONALES — Corps
  // ═══════════════════════════════════════════

  {
    id: "nivea-cocoa-butter-lotion",
    name: "Lait Corporel Cocoa Butter",
    description: "Lait corporel au beurre de cacao. Hydrate la peau en profondeur et lui donne un aspect lumineux et soyeux. Pour peaux sèches. 400ml.",
    category: "corps",
    price: 8500,
    brand: "Nivea",
    targets: ["peau sèche", "hydratation corps", "beurre de cacao", "peau soyeuse", "éclat corps"],
    usagePoints: ["Hydrate intensément avec le beurre de cacao", "Laisse la peau douce et lumineuse", "Absorbe rapidement"],
    shopUrl: "https://www.jumia.cm/catalog/?q=nivea+cocoa+butter+lotion"
  },
  {
    id: "dove-lait-corporel",
    name: "Lait Corporel Hydratant Intensif",
    description: "Lait corporel Dove à la formule NutriumMoisture. Nourrit la peau en profondeur et la laisse douce 24h. 400ml.",
    category: "corps",
    price: 7800,
    brand: "Dove",
    targets: ["peau sèche", "hydratation 24h", "douceur", "nutrition corps", "peau fragile"],
    usagePoints: ["Formule NutriumMoisture nourrissante", "Hydratation longue durée 24h", "Peau douce et soyeuse"],
    shopUrl: "https://www.jumia.cm/catalog/?q=dove+lait+corporel"
  },
  {
    id: "vaseline-intensive-care",
    name: "Intensive Care Healing Serum",
    description: "Sérum-lotion Vaseline Intensive Care. Répare les peaux très sèches et craquelées. Formule micro-gouttelettes de vaseline pure. 400ml.",
    category: "corps",
    price: 8000,
    brand: "Vaseline",
    targets: ["peau très sèche", "peau craquelée", "réparation", "talons fissurés", "coudes secs"],
    usagePoints: ["Répare les peaux très sèches et craquelées", "Formule à la vaseline pure", "Idéal pour coudes et genoux secs"],
    shopUrl: "https://www.jumia.cm/catalog/?q=vaseline+intensive+care"
  },
  {
    id: "palmers-cocoa-butter",
    name: "Cocoa Butter Formula Lotion",
    description: "Lotion au beurre de cacao pur Palmer's. Estompe les vergetures, unifie le teint et nourrit en profondeur. 400ml.",
    category: "corps",
    price: 9500,
    brand: "Palmer's",
    targets: ["vergetures", "hyperpigmentation", "teint irrégulier", "peau sèche", "beurre de cacao", "éclat"],
    usagePoints: ["Estompe vergetures et taches du corps", "Unifie et illumine le teint", "Riche en beurre de cacao pur"],
    shopUrl: "https://www.jumia.cm/catalog/?q=palmers+cocoa+butter"
  },

  // ═══════════════════════════════════════════
  // GRANDES MARQUES INTERNATIONALES — Cheveux
  // ═══════════════════════════════════════════

  {
    id: "pantene-prov-shampoo",
    name: "Shampooing Pro-V Lisse & Soyeux",
    description: "Shampooing Pantene Pro-V avec complexe de vitamines. Lisse les cheveux récalcitrants et apporte brillance et douceur. 400ml.",
    category: "cheveux",
    price: 7500,
    brand: "Pantene",
    targets: ["cheveux ternes", "cheveux récalcitrants", "brillance cheveux", "douceur", "nettoyage cheveux"],
    usagePoints: ["Complexe vitaminé Pro-V protecteur", "Lisse et apporte de la brillance", "Cheveux lisses et soyeux"],
    shopUrl: "https://www.jumia.cm/catalog/?q=pantene+shampoo"
  },
  {
    id: "dark-lovely-creme",
    name: "Moisture Plus Crème Hydratante",
    description: "Crème hydratante Dark & Lovely spécialement formulée pour les cheveux afro-texturés. Nourrit, démêle et définit les boucles. 250ml.",
    category: "cheveux",
    price: 8500,
    brand: "Dark & Lovely",
    targets: ["cheveux afro", "boucles", "démêlage", "cheveux secs", "nutrition capillaire", "cheveux crépus"],
    usagePoints: ["Formulée pour les cheveux afro-texturés", "Démêle et définit les boucles", "Nourrit en profondeur"],
    shopUrl: "https://www.jumia.cm/catalog/?q=dark+and+lovely+creme"
  },
  {
    id: "cantu-shea-butter",
    name: "Shea Butter Leave-In Conditioning Cream",
    description: "Crème sans rinçage au beurre de karité Cantu. Hydrate, démêle et définit les boucles des cheveux naturels. 340g.",
    category: "cheveux",
    price: 10000,
    brand: "Cantu",
    targets: ["cheveux naturels", "boucles", "cheveux crépus", "démêlage", "hydratation capillaire", "beurre de karité"],
    usagePoints: ["Sans rinçage au beurre de karité pur", "Définit et hydrate les boucles naturelles", "Réduit la casse"],
    shopUrl: "https://www.jumia.cm/catalog/?q=cantu+shea+butter+leave+in"
  },
  {
    id: "ors-olive-oil",
    name: "Olive Oil Hair Lotion",
    description: "Lotion capillaire à l'huile d'olive ORS. Hydrate, fortifie et redonne vie aux cheveux secs et fragiles. Enrichie en biotine. 251ml.",
    category: "cheveux",
    price: 8000,
    brand: "ORS",
    targets: ["cheveux secs", "cheveux fragiles", "chute de cheveux", "biotine", "huile olive", "fortifiant"],
    usagePoints: ["Fortifie et hydrate à l'huile d'olive", "Enrichie en biotine anti-chute", "Redonne vie et brillance"],
    shopUrl: "https://www.jumia.cm/catalog/?q=ors+olive+oil+lotion"
  },
  {
    id: "schwarzkopf-gliss",
    name: "Gliss Hair Repair Masque Total",
    description: "Masque réparateur Schwarzkopf Gliss. Répare les cheveux abîmés en profondeur avec des kératines liquides. 200ml.",
    category: "cheveux",
    price: 9000,
    brand: "Schwarzkopf",
    targets: ["cheveux abîmés", "pointes cassantes", "réparation capillaire", "kératine", "cheveux ternes", "traitement"],
    usagePoints: ["Répare en profondeur avec des kératines liquides", "Résultats visibles dès la première utilisation", "Pour cheveux très abîmés"],
    shopUrl: "https://www.jumia.cm/catalog/?q=schwarzkopf+gliss+masque"
  },

  // ═══════════════════════════════════════════
  // PRODUITS CIBLÉS — Problèmes peau africaine
  // ═══════════════════════════════════════════

  // — Taches & Hyperpigmentation —
  {
    id: "garnier-vitaminc-serum",
    name: "Sérum Éclat Vitamine C 10%",
    description: "Sérum concentré en Vitamine C pure 10%. Corrige les taches brunes, unifie le teint et illumine le visage. Testé dermatologiquement. 30ml.",
    category: "visage",
    price: 11000,
    brand: "Garnier",
    targets: ["taches brunes", "hyperpigmentation", "teint terne", "éclat", "taches solaires", "post-acné taches"],
    usagePoints: ["Réduit visiblement les taches en 4 semaines", "Unifie et illumine le teint", "Application matin sur peau propre + SPF obligatoire"],
    shopUrl: "https://www.jumia.cm/catalog/?q=garnier+vitamine+c+serum"
  },
  {
    id: "ambi-fade-cream",
    name: "Fade Cream Even & Clear",
    description: "Crème estompe-taches Ambi. Réduit efficacement les taches noires, l'hyperpigmentation et les marques post-acné. Très populaire en Afrique de l'Ouest. 60g.",
    category: "visage",
    price: 8500,
    brand: "Ambi",
    targets: ["taches noires", "hyperpigmentation", "marques acné", "taches post-inflammation", "teint irrégulier", "cicatrices"],
    usagePoints: ["Estompe les taches sombres progressivement", "Efficace sur les marques post-acné", "Résultats visibles en 4 semaines"],
    shopUrl: "https://www.jumia.cm/catalog/?q=ambi+fade+cream"
  },
  {
    id: "loreal-glycolic-bright",
    name: "Glycolic Bright Sérum Nuit",
    description: "Sérum de nuit à l'acide glycolique L'Oréal. Exfolie en douceur, efface les taches et révèle un teint éclatant au réveil. 30ml.",
    category: "visage",
    price: 13000,
    brand: "L'Oréal Paris",
    targets: ["teint terne", "exfoliation", "taches brunes", "grain de peau", "pores", "éclat", "acide glycolique"],
    usagePoints: ["Exfolie doucement pendant le sommeil", "Révèle un teint lumineux au réveil", "Application le soir uniquement"],
    shopUrl: "https://www.jumia.cm/catalog/?q=loreal+glycolic+bright+serum"
  },
  {
    id: "kojie-san-soap",
    name: "Kojic Acid Skin Lightening Soap",
    description: "Savon à l'acide kojique Kojie San. Réduit les taches, cicatrices et hyperpigmentation. Très utilisé en Afrique et Asie. 65g × 2.",
    category: "visage",
    price: 6500,
    brand: "Kojie San",
    targets: ["taches brunes", "hyperpigmentation", "teint irrégulier", "cicatrices acné", "peau terne", "nettoyage visage"],
    usagePoints: ["Acide kojique naturel anti-taches", "Unifie progressivement le teint", "Utiliser avec SPF le matin"],
    shopUrl: "https://www.jumia.cm/catalog/?q=kojie+san+soap"
  },

  // — Acné & Boutons —
  {
    id: "lrp-effaclar-duo",
    name: "Effaclar Duo+ Traitement Anti-Acné",
    description: "Traitement anti-boutons La Roche-Posay Effaclar Duo+. Réduit les imperfections, points noirs et prévient les cicatrices post-acné. 40ml.",
    category: "visage",
    price: 19000,
    brand: "La Roche-Posay",
    targets: ["acné", "boutons", "points noirs", "imperfections", "cicatrices acné", "peau grasse", "sébum"],
    usagePoints: ["Réduit visiblement les boutons en 12h", "Prévient les cicatrices post-acné", "Recommandé par les dermatologues"],
    shopUrl: "https://www.jumia.cm/catalog/?q=la+roche+posay+effaclar+duo"
  },
  {
    id: "neutrogena-acne-gel",
    name: "Rapid Clear Stubborn Acne Spot Gel",
    description: "Gel anti-boutons Neutrogena à l'acide salicylique. Agit sur les boutons tenaces et les points noirs en 2 heures. 15ml.",
    category: "visage",
    price: 11000,
    brand: "Neutrogena",
    targets: ["boutons", "acné", "acide salicylique", "points noirs", "imperfections", "peau grasse", "pores bouchés"],
    usagePoints: ["Réduit les boutons tenaces en 2 heures", "Acide salicylique à action rapide", "Application localisée sur les boutons"],
    shopUrl: "https://www.jumia.cm/catalog/?q=neutrogena+rapid+clear+acne+gel"
  },

  // — Nettoyage doux & Peau sensible —
  {
    id: "bioderma-sensibio",
    name: "Sensibio H2O Eau Micellaire",
    description: "L'eau micellaire de référence Bioderma. Nettoie et démaquille sans frotter, en respectant la peau sensible. Recommandée par 90% des dermatologues. 500ml.",
    category: "visage",
    price: 15000,
    brand: "Bioderma",
    targets: ["peau sensible", "nettoyage doux", "démaquillage", "rougeurs", "irritations", "intolérance cutanée"],
    usagePoints: ["Nettoie sans frotter ni agresser", "Zéro rinçage nécessaire", "Référence dermatologique pour peaux sensibles"],
    shopUrl: "https://www.jumia.cm/catalog/?q=bioderma+sensibio+h2o"
  },

  // — Corps : Taches & Unification —
  {
    id: "fair-white-vitaminc",
    name: "So White Vitamin C Body Cream",
    description: "Crème corps Fair & White à la Vitamine C. Unifie le teint, estompe les taches et apporte un éclat naturel à la peau. Très populaire en Afrique. 400ml.",
    category: "corps",
    price: 11500,
    brand: "Fair & White",
    targets: ["taches corps", "hyperpigmentation corps", "teint irrégulier", "éclat corps", "unification teint"],
    usagePoints: ["Unifie progressivement le teint du corps", "Enrichie en Vitamine C illuminatrice", "Très populaire en Afrique Centrale et de l'Ouest"],
    shopUrl: "https://www.jumia.cm/catalog/?q=fair+white+vitamin+c+body+cream"
  },
  {
    id: "ambi-body-lotion",
    name: "Even & Clear Body Lotion",
    description: "Lait corps Ambi Even & Clear. Estompe les taches sombres du corps, les coudes, genoux et zones d'hyperpigmentation. 400ml.",
    category: "corps",
    price: 10000,
    brand: "Ambi",
    targets: ["taches corps", "coudes noirs", "genoux noirs", "hyperpigmentation corps", "zones sombres", "teint irrégulier corps"],
    usagePoints: ["Estompe les taches et zones sombres du corps", "Coudes, genoux et articulations unifiés", "Application quotidienne matin et soir"],
    shopUrl: "https://www.jumia.cm/catalog/?q=ambi+even+clear+body+lotion"
  },

  // — Cheveux africains : Croissance & Cuir chevelu —
  {
    id: "africas-best-olive-oil",
    name: "Herbal Gro Olive Oil & Herbs",
    description: "Huile capillaire Africa's Best à l'huile d'olive et aux herbes. Favorise la croissance, réduit la casse et nourrit le cuir chevelu. 149ml.",
    category: "cheveux",
    price: 8000,
    brand: "Africa's Best",
    targets: ["croissance cheveux", "cheveux africains", "cuir chevelu sec", "casse cheveux", "cheveux crépus", "nutrition capillaire"],
    usagePoints: ["Favorise la croissance capillaire naturelle", "Nourrit et apaise le cuir chevelu", "Idéal pour cheveux afro et crépus"],
    shopUrl: "https://www.jumia.cm/catalog/?q=africa+best+olive+oil+herbal"
  },
  {
    id: "jamaican-castor-oil",
    name: "Jamaican Black Castor Oil",
    description: "Huile de ricin jamaïcaine noire. Stimule la croissance des cheveux, renforce les racines et nourrit intensément le cuir chevelu. 100ml.",
    category: "cheveux",
    price: 9500,
    brand: "Tropic Isle",
    targets: ["croissance cheveux", "chute de cheveux", "cuir chevelu", "cheveux crépus", "cheveux fins", "renforcement racines"],
    usagePoints: ["Stimule la croissance capillaire", "Renforce les racines et réduit la chute", "Massage cuir chevelu 2 fois/semaine"],
    shopUrl: "https://www.jumia.cm/catalog/?q=jamaican+black+castor+oil"
  },
  {
    id: "head-shoulders-shampoo",
    name: "Classic Clean Shampooing Anti-Pellicules",
    description: "Shampooing anti-pellicules Head & Shoulders. Élimine les pellicules et apaise les démangeaisons du cuir chevelu. Protection 100% visible. 400ml.",
    category: "cheveux",
    price: 8000,
    brand: "Head & Shoulders",
    targets: ["pellicules", "démangeaisons cuir chevelu", "cuir chevelu sec", "squames", "inconfort cuir chevelu"],
    usagePoints: ["Élimine les pellicules dès le 1er lavage", "Apaise les démangeaisons", "Protection 100% anti-pellicules visible"],
    shopUrl: "https://www.jumia.cm/catalog/?q=head+shoulders+shampoo"
  },

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

    // ═══════════════════════════════════════════
    // CATALOGUE DERMATOLOGIQUE — La Roche-Posay, Bioderma, The Ordinary,
    // CeraVe, Aroma-Zone, IN'OYA, Advanced Clinicals, CosRx, Caudalie,
    // Clinique, The Inkey List (prix GlowScan = pharmacie + 3000 FCFA)
    // ═══════════════════════════════════════════

    {
      id: "lrp-effaclar-micropeeling",
      name: "Effaclar Gel Purifiant Micro-Peeling",
      description: "Gel purifiant micro-peeling pour peau grasse à très grasse acnéique. Nettoie en profondeur, resserre les pores, élimine les cellules mortes.",
      category: "visage",
      price: 21550,
      brand: "La Roche-Posay",
      targets: ["acné","points noirs","pores dilatés","peau grasse","exfoliation douce","imperfections","sébum"],
      usagePoints: ["Nettoie en profondeur les pores","Micro-exfoliation douce","Resserre les pores"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Effaclar%20Gel%20Purifiant%20Micro-Peeling"
    },

  {
      id: "lrp-effaclar-gel-moussant-400",
      name: "Effaclar Gel Moussant Purifiant 400ml",
      description: "Gel moussant purifiant grand format 400ml pour peau grasse et sensible. Nettoie sans dessécher, élimine l'excès de sébum.",
      category: "visage",
      price: 16000,
      brand: "La Roche-Posay",
      targets: ["peau grasse","peau sensible","sébum","imperfections","nettoyage doux"],
      usagePoints: ["Nettoie et purifie sans dessécher","Élimine l'excès de sébum","Respecte l'équilibre cutané"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Effaclar%20Gel%20Moussant%20Purifiant%20400ml"
    },

  {
      id: "lrp-effaclar-duo-m",
      name: "Effaclar Duo+M Triple Correction 40ml",
      description: "Triple action : réduit les boutons, efface les marques rouges, prévient les nouvelles imperfections. Pour peau mixte à grasse acnéique.",
      category: "visage",
      price: 15100,
      brand: "La Roche-Posay",
      targets: ["acné légère à modérée","boutons","marques post-acné","rougeurs","peau mixte","peau grasse"],
      usagePoints: ["Triple correction anti-imperfections","Efface les marques rouges","Prévient les nouvelles imperfections"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Effaclar%20Duo%2BM%20Triple%20Correction%2040ml"
    },

  {
      id: "lrp-effaclar-mat-plus",
      name: "Effaclar Mat+ 40ml",
      description: "Soin matifiant 8h pour peau grasse à mixte. Resserre les pores et hydrate sans graisser.",
      category: "visage",
      price: 15600,
      brand: "La Roche-Posay",
      targets: ["excès de sébum","pores dilatés","brillance","peau grasse","peau mixte","matité"],
      usagePoints: ["Matifie pendant 8h","Resserre les pores","Hydrate sans graisser"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Effaclar%20Mat%2B%2040ml"
    },

  {
      id: "lrp-effaclar-h-isobiome",
      name: "Effaclar H Iso-Biome Soin Réparateur 40ml",
      description: "Soin réparateur pour peau fragilisée par les traitements anti-acné. Répare la barrière cutanée, apaise et hydrate.",
      category: "visage",
      price: 15800,
      brand: "La Roche-Posay",
      targets: ["peau desséchée par traitements","barrière cutanée","irritations","marques","réparation","post-acné"],
      usagePoints: ["Répare la barrière cutanée","Apaise les irritations","Hydrate en profondeur et efface les marques"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Effaclar%20H%20Iso-Biome%20Soin%20R%C3%A9parateur%2040ml"
    },

  {
      id: "lrp-effaclar-serum",
      name: "Effaclar Sérum Ultra Concentré",
      description: "Sérum ultra-concentré pour acné persistante et taches post-acnéiques. Réduit visiblement les imperfections en 4 semaines.",
      category: "visage",
      price: 25000,
      brand: "La Roche-Posay",
      targets: ["acné persistante","taches post-acné","pores dilatés","imperfections","marques résiduelles"],
      usagePoints: ["Action ciblée acné + séquelles","Résultats visibles en 4 semaines","Réduit les marques résiduelles"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Effaclar%20S%C3%A9rum%20Ultra%20Concentr%C3%A9"
    },

  {
      id: "lrp-hydreane-extra-riche",
      name: "Hydréane Extra Riche Crème Hydratante",
      description: "Crème hydratante extra-riche pour peau sèche à très sèche, sensible. Hydratation longue durée, restaure le film hydrolipidique.",
      category: "visage",
      price: 15600,
      brand: "La Roche-Posay",
      targets: ["peau sèche","peau très sèche","déshydratation","tiraillements","peau sensible","film hydrolipidique"],
      usagePoints: ["Hydratation intense longue durée","Restaure le film hydrolipidique","Apaise les inconforts"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Hydr%C3%A9ane%20Extra%20Riche%20Cr%C3%A8me%20Hydratante"
    },

  {
      id: "lrp-cicaplast-baume-b5",
      name: "Cicaplast Baume B5+ Crème Ultra-Réparatrice 40ml",
      description: "Baume ultra-réparateur pour taches post-inflammatoires, cicatrices et peau abîmée. Accélère la cicatrisation.",
      category: "visage",
      price: 12500,
      brand: "La Roche-Posay",
      targets: ["taches post-inflammatoires","cicatrices","peau abîmée","réparation","rougeurs","barrière cutanée"],
      usagePoints: ["Accélère la cicatrisation","Atténue les taches et rougeurs","Répare la barrière cutanée"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Cicaplast%20Baume%20B5%2B%20Cr%C3%A8me%20Ultra-R%C3%A9paratri"
    },

  {
      id: "lrp-lipikar-baume-light-ap-m",
      name: "Lipikar Baume Light AP+M 400ml",
      description: "Baume corps triple action pour peau sèche à atopique : restaure, apaise, protège. Formule légère non grasse, absorption rapide.",
      category: "corps",
      price: 24000,
      brand: "La Roche-Posay",
      targets: ["peau sèche","eczéma léger","démangeaisons","peau atopique","réparation barrière"],
      usagePoints: ["Triple réparation : restaure, apaise, protège","Formule légère non grasse","Absorption rapide"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Lipikar%20Baume%20Light%20AP%2BM%20400ml"
    },

  {
      id: "lrp-lipikar-lait-urea-10",
      name: "Lipikar Lait Hydratant Urea 10% 400ml",
      description: "Lait corporel à l'urée 10% pour peau très sèche, rugueuse, squameuse. Exfolie et hydrate simultanément.",
      category: "corps",
      price: 24000,
      brand: "La Roche-Posay",
      targets: ["peau très sèche","peau rugueuse","peau squameuse","exfoliation","urée 10%"],
      usagePoints: ["Exfolie et hydrate simultanément","Peau lisse et douce en 1 semaine","Idéal coudes et genoux"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Lipikar%20Lait%20Hydratant%20Urea%2010%25%20400ml"
    },

  {
      id: "lrp-lipikar-lait-relipidant",
      name: "Lipikar Lait Relipidant Corps 400ml",
      description: "Lait relipidant pour peau sèche manquant de lipides. Restaure le film protecteur, soulage les tiraillements.",
      category: "corps",
      price: 19100,
      brand: "La Roche-Posay",
      targets: ["peau sèche","manque de lipides","tiraillements","peau sensible","inconfort cutané"],
      usagePoints: ["Relipide et hydrate","Restaure le film protecteur","Soulage les tiraillements"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Lipikar%20Lait%20Relipidant%20Corps%20400ml"
    },

  {
      id: "lrp-lipikar-gel-lavant",
      name: "Lipikar Gel Lavant Apaisant Protecteur 750ml",
      description: "Gel lavant sans savon pour peau sèche, sensible, atopique. Préserve le film hydrolipidique, apaise dès le lavage.",
      category: "corps",
      price: 19500,
      brand: "La Roche-Posay",
      targets: ["peau sèche","peau sensible","peau atopique","nettoyage doux","sans savon"],
      usagePoints: ["Nettoie sans savon","Préserve le film hydrolipidique","Apaise dès le lavage"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Lipikar%20Gel%20Lavant%20Apaisant%20Protecteur%20750ml"
    },

  {
      id: "lrp-lipikar-huile-lavante",
      name: "Lipikar Huile Lavante AP+ 400ml",
      description: "Huile lavante nourrissante pour peau très sèche à atopique. Nettoie et nourrit en une étape, apaise les démangeaisons.",
      category: "corps",
      price: 18300,
      brand: "La Roche-Posay",
      targets: ["peau très sèche","peau atopique","démangeaisons","eczéma","nettoyage nourrissant"],
      usagePoints: ["Nettoie et nourrit en une étape","Apaise les démangeaisons","Protège la peau"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Lipikar%20Huile%20Lavante%20AP%2B%20400ml"
    },

  {
      id: "lrp-anthelios-uvmune-fluide",
      name: "Anthelios UVMUNE 400 Fluide Invisible SPF50+ 50ml",
      description: "Protection solaire fluide invisible SPF50+ pour peaux normales à grasses. Texture invisible, non grasse, idéale sous maquillage.",
      category: "visage",
      price: 16300,
      brand: "La Roche-Posay",
      targets: ["protection solaire","SPF50+","peau grasse","peau normale","anti-UVA longue durée","non comédogène"],
      usagePoints: ["Protection ultra longue UVA","Texture invisible non grasse","Idéale sous le maquillage"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Anthelios%20UVMUNE%20400%20Fluide%20Invisible%20SPF50%2B%2050"
    },

  {
      id: "lrp-anthelios-creme-hydratante",
      name: "Anthelios Crème Hydratante SPF50+ 50ml",
      description: "Crème solaire hydratante SPF50+ pour peau normale à sèche. Protège et hydrate simultanément.",
      category: "visage",
      price: 16300,
      brand: "La Roche-Posay",
      targets: ["protection solaire","SPF50+","peau sèche","peau normale","hydratation","anti-UV"],
      usagePoints: ["Protège et hydrate simultanément","Texture crème confortable","Anti-UVA/UVB"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Anthelios%20Cr%C3%A8me%20Hydratante%20SPF50%2B%2050ml"
    },

  {
      id: "lrp-anthelios-lait-corps",
      name: "Anthelios Lait Hydratant Ultra-Résistant SPF50",
      description: "Lait solaire corps ultra-résistant SPF50 pour activités extérieures et sport. Résiste à l'eau et à la transpiration.",
      category: "corps",
      price: 19400,
      brand: "La Roche-Posay",
      targets: ["protection solaire corps","sport","résistant à l'eau","SPF50","activités extérieures"],
      usagePoints: ["Résiste à l'eau et à la transpiration","Hydrate 24h","Protection UVA/UVB maximale"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Anthelios%20Lait%20Hydratant%20Ultra-R%C3%A9sistant%20SPF50"
    },

  {
      id: "lrp-anthelios-spray-invisible",
      name: "Anthelios Invisible Sun Protection Spray SPF50+",
      description: "Spray solaire invisible ultra-résistant SPF50+ pour le corps. Ne laisse pas de résidu blanc, idéal sport et plein air.",
      category: "corps",
      price: 20500,
      brand: "La Roche-Posay",
      targets: ["protection solaire corps","spray solaire","SPF50+","sport","résistant transpiration"],
      usagePoints: ["Spray invisible ultra-résistant","Ne laisse pas de résidu blanc","Protection maximale"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Anthelios%20Invisible%20Sun%20Protection%20Spray%20SPF50%2B"
    },

  {
      id: "lrp-eau-thermale",
      name: "Eau Thermale Apaisante & Adoucissante 150ml",
      description: "Eau thermale apaisante pour rougeurs, irritations, peaux réactives. Apaise instantanément.",
      category: "visage",
      price: 12100,
      brand: "La Roche-Posay",
      targets: ["peau réactive","rougeurs","irritations","apaisement","fixateur maquillage"],
      usagePoints: ["Apaise et rafraîchit instantanément","Réduit les rougeurs","Fixe le maquillage"],
      shopUrl: "https://www.jumia.cm/catalog/?q=La%20Roche-Posay%20Eau%20Thermale%20Apaisante%20%26%20Adoucissante%20150ml"
    },

  {
      id: "bioderma-atoderm-gel-douche",
      name: "Atoderm Gel Douche Eco-Recharge 1L",
      description: "Gel douche doux pour peau normale à sèche, sensible. Respecte le microbiome cutané, formule éco-responsable.",
      category: "corps",
      price: 15200,
      brand: "Bioderma",
      targets: ["peau sèche","peau sensible","nettoyage doux","microbiome cutané","éco-responsable"],
      usagePoints: ["Nettoie sans savon","Respecte le microbiome","Formule éco-responsable"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Bioderma%20Atoderm%20Gel%20Douche%20Eco-Recharge%201L"
    },

  {
      id: "bioderma-atoderm-huile-douche",
      name: "Atoderm Huile de Douche Ultra-Nourrissante 1L",
      description: "Huile de douche ultra-nourrissante pour peau très sèche à atopique. Restaure le film lipidique, peau douce 24h.",
      category: "corps",
      price: 18000,
      brand: "Bioderma",
      targets: ["peau très sèche","peau atopique","irritations","démangeaisons","film lipidique"],
      usagePoints: ["Nourrit intensément","Apaise les irritations","Peau douce 24h"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Bioderma%20Atoderm%20Huile%20de%20Douche%20Ultra-Nourrissante%201L"
    },

  {
      id: "bioderma-pigmentbio-sensitive-areas",
      name: "Pigmentbio Sensitive Areas Soin Éclaircissant 75ml",
      description: "Soin éclaircissant ciblé pour taches brunes localisées : zones intimes, coudes, genoux. Testé peaux sensibles.",
      category: "corps",
      price: 22000,
      brand: "Bioderma",
      targets: ["taches brunes","hyperpigmentation localisée","coudes noirs","genoux noirs","zones sensibles"],
      usagePoints: ["Éclaircit les taches ciblées","Unifie le teint","Testé sur peaux sensibles"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Bioderma%20Pigmentbio%20Sensitive%20Areas%20Soin%20%C3%89claircissant%2075ml"
    },

  {
      id: "bioderma-pigmentbio-jour-spf50",
      name: "Pigmentbio Soin de Jour Éclaircissant SPF50+ 40ml",
      description: "Soin de jour éclaircissant avec protection solaire SPF50+. Triple action : éclaircit, unifie et protège des UV.",
      category: "visage",
      price: 19200,
      brand: "Bioderma",
      targets: ["taches brunes","teint terne","protection solaire","SPF50+","vitamines C E PP","hyperpigmentation"],
      usagePoints: ["Éclaircit, unifie et protège","Vitamines C, E et PP","Toutes carnations"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Bioderma%20Pigmentbio%20Soin%20de%20Jour%20%C3%89claircissant%20SPF50%2B%2040ml"
    },

  {
      id: "bioderma-pigmentbio-night-renewer",
      name: "Pigmentbio Night Renewer Soin de Nuit 50ml",
      description: "Soin de nuit éclaircissant intensif pour taches persistantes et teint inégal. Renouvelle la peau pendant le sommeil.",
      category: "visage",
      price: 28200,
      brand: "Bioderma",
      targets: ["taches persistantes","hyperpigmentation","teint inégal","renouvellement nocturne","vitamines C E PP"],
      usagePoints: ["Renouvelle la peau pendant le sommeil","Corrige les taches en profondeur","Vitamines C+E+PP"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Bioderma%20Pigmentbio%20Night%20Renewer%20Soin%20de%20Nuit%2050ml"
    },

  {
      id: "bioderma-hydrabio-perfecteur-spf30",
      name: "Hydrabio Perfecteur SPF30 40ml",
      description: "Soin hydratant lissant SPF30 pour peau sensible normale à mixte. Hydrate, lisse et protège en une étape.",
      category: "visage",
      price: 18300,
      brand: "Bioderma",
      targets: ["peau terne","manque d'éclat","protection UV","peau sensible","peau mixte","hydratation lissante"],
      usagePoints: ["Hydrate, lisse et protège","Boost d'éclat immédiat","Texture légère non grasse"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Bioderma%20Hydrabio%20Perfecteur%20SPF30%2040ml"
    },

  {
      id: "the-ordinary-hair-care-haf",
      name: "Hair Care Natural Moisturizing Factors + HA 60ml",
      description: "Soin capillaire à l'acide hyaluronique pour cheveux déshydratés, secs, abîmés. Restaure les facteurs naturels d'hydratation.",
      category: "cheveux",
      price: 18600,
      brand: "The Ordinary",
      targets: ["cheveux déshydratés","cheveux secs","cheveux abîmés","acide hyaluronique","facteurs naturels hydratation"],
      usagePoints: ["Hydrate en profondeur","Restaure les NMF capillaires","Acide hyaluronique"],
      shopUrl: "https://www.jumia.cm/catalog/?q=The%20Ordinary%20Hair%20Care%20Natural%20Moisturizing%20Factors%20%2B%20HA%2060m"
    },

  {
      id: "cerave-lotion-ceramides-52ml",
      name: "Lotion Hydratante aux Céramides Peaux Normales à Sèches 52ml",
      description: "Lotion hydratante visage avec 3 céramides essentiels et acide hyaluronique. Hydratation 24h non comédogène.",
      category: "visage",
      price: 13900,
      brand: "CeraVe",
      targets: ["peau sèche","peau normale","céramides","acide hyaluronique","barrière cutanée","non comédogène"],
      usagePoints: ["3 céramides essentiels + HA","Hydratation 24h","Non comédogène"],
      shopUrl: "https://www.jumia.cm/catalog/?q=CeraVe%20Lotion%20Hydratante%20aux%20C%C3%A9ramides%20Peaux%20Normales%20%C3%A0%"
    },

  {
      id: "cerave-lotion-spf30-50ml",
      name: "Lotion Hydratante Ultra-Légère SPF30 50ml",
      description: "Lotion hydratante ultra-légère avec SPF30 et céramides. Idéale sous le maquillage, non grasse.",
      category: "visage",
      price: 16000,
      brand: "CeraVe",
      targets: ["hydratation quotidienne","protection solaire","SPF30","peau grasse","peau normale","céramides"],
      usagePoints: ["Texture ultra-légère non grasse","Céramides + SPF30","Idéale sous le maquillage"],
      shopUrl: "https://www.jumia.cm/catalog/?q=CeraVe%20Lotion%20Hydratante%20Ultra-L%C3%A9g%C3%A8re%20SPF30%2050ml"
    },

  {
      id: "aroma-zone-vitc-astaxanthine",
      name: "Sérum concentré Vitamine C 10% & Astaxanthine 30ml",
      description: "Sérum éclat vitamine C 10% + astaxanthine. Illumine le teint, réduit les taches, antioxydant puissant.",
      category: "visage",
      price: 11700,
      brand: "Aroma-Zone",
      targets: ["teint terne","taches brunes","manque d'éclat","antioxydant","vitamine C","hyperpigmentation"],
      usagePoints: ["Illumine le teint","Réduit les taches","Antioxydant puissant"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20S%C3%A9rum%20concentr%C3%A9%20Vitamine%20C%2010%25%20%26%20Astaxant"
    },

  {
      id: "aroma-zone-vitc-ecorecharge",
      name: "Éco-recharge Sérum Vitamine C 10% 30ml",
      description: "Éco-recharge du sérum Vitamine C 10% & Astaxanthine. Même formule, prix réduit.",
      category: "visage",
      price: 10300,
      brand: "Aroma-Zone",
      targets: ["teint terne","taches","éclat","vitamine C","éco-responsable"],
      usagePoints: ["Éco-recharge zéro déchet","Même efficacité au meilleur prix","Vitamine C 10%"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20%C3%89co-recharge%20S%C3%A9rum%20Vitamine%20C%2010%25%2030ml"
    },

  {
      id: "aroma-zone-glycolique-ha",
      name: "Sérum concentré Acide Glycolique 10% + HA 30ml",
      description: "Sérum exfoliant glycolique 10% + acide hyaluronique. Unifie le teint, lisse le grain de peau.",
      category: "visage",
      price: 11300,
      brand: "Aroma-Zone",
      targets: ["peau terne","pores dilatés","texture irrégulière","taches","exfoliation","acide glycolique"],
      usagePoints: ["Exfolie et unifie en douceur","Acide hyaluronique compensateur","Lisse le grain de peau"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20S%C3%A9rum%20concentr%C3%A9%20Acide%20Glycolique%2010%25%20%2B%20HA"
    },

  {
      id: "aroma-zone-glycolique-ecorecharge",
      name: "Éco-recharge Sérum Acide Glycolique 10% & HA 30ml",
      description: "Éco-recharge du sérum glycolique 10% + HA. Même efficacité, prix réduit.",
      category: "visage",
      price: 9000,
      brand: "Aroma-Zone",
      targets: ["exfoliation douce","unification teint","acide glycolique","éco-responsable"],
      usagePoints: ["Éco-recharge zéro déchet","Même efficacité","Prix réduit"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20%C3%89co-recharge%20S%C3%A9rum%20Acide%20Glycolique%2010%25%20%26%2"
    },

  {
      id: "aroma-zone-ha-ecorecharge",
      name: "Éco-recharge Sérum Acide Hyaluronique 30ml",
      description: "Sérum à l'acide hyaluronique multi-niveaux. Hydratation intense, repulpe la peau.",
      category: "visage",
      price: 8800,
      brand: "Aroma-Zone",
      targets: ["déshydratation","rides fines","manque de volume","repulper","acide hyaluronique"],
      usagePoints: ["Hydratation intense multi-niveaux","Repulpe la peau","Texture légère"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20%C3%89co-recharge%20S%C3%A9rum%20Acide%20Hyaluronique%2030ml"
    },

  {
      id: "aroma-zone-niacinamide-ecorecharge",
      name: "Éco-recharge Sérum Niacinamide 10% Cuivre & Zinc 30ml",
      description: "Sérum niacinamide 10% + cuivre + zinc pour peau grasse, mixte, acnéique. Régule le sébum, resserre les pores.",
      category: "visage",
      price: 9000,
      brand: "Aroma-Zone",
      targets: ["pores dilatés","excès de sébum","imperfections","teint irrégulier","peau grasse","niacinamide"],
      usagePoints: ["Régule le sébum","Resserre les pores","Réduit rougeurs et taches"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20%C3%89co-recharge%20S%C3%A9rum%20Niacinamide%2010%25%20Cuivre%20%26"
    },

  {
      id: "aroma-zone-retinal",
      name: "Sérum Concentré Rétinal Optimisé 30ml",
      description: "Sérum rétinal anti-âge alternative douce au rétinol. Rénove la peau, stimule le renouvellement cellulaire.",
      category: "visage",
      price: 11700,
      brand: "Aroma-Zone",
      targets: ["signes de vieillissement","rides","perte de fermeté","taches","rétinal","renouvellement cellulaire"],
      usagePoints: ["Alternative douce au rétinol","Stimule le renouvellement cellulaire","Rénove la peau"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20S%C3%A9rum%20Concentr%C3%A9%20R%C3%A9tinal%20Optimis%C3%A9%2030ml"
    },

  {
      id: "aroma-zone-bakuchiol-ecorecharge",
      name: "Éco-recharge Sérum Bakuchiol 30ml",
      description: "Sérum bakuchiol végétal anti-âge et anti-imperfections. Convient aux peaux sensibles.",
      category: "visage",
      price: 10300,
      brand: "Aroma-Zone",
      targets: ["anti-âge","imperfections","peau sensible","bakuchiol","alternative au rétinol naturelle"],
      usagePoints: ["Bakuchiol végétal","Réduit rides et imperfections sans irritation","Convient aux peaux sensibles"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Aroma-Zone%20%C3%89co-recharge%20S%C3%A9rum%20Bakuchiol%2030ml"
    },

  {
      id: "inoya-soin-unifiant-matifiant",
      name: "Mon Soin Unifiant Matifiant Peaux Mixtes à Grasses 50ml",
      description: "Soin unifiant et matifiant spécialement formulé pour peaux noires et métissées mixtes à grasses.",
      category: "visage",
      price: 20300,
      brand: "IN'OYA",
      targets: ["peaux noires","peaux métissées","peau mixte","peau grasse","excès de sébum","teint inégal","brillance"],
      usagePoints: ["Unifie et matifie","Formule spéciale peaux noires","Resserre les pores"],
      shopUrl: "https://www.jumia.cm/catalog/?q=IN'OYA%20Mon%20Soin%20Unifiant%20Matifiant%20Peaux%20Mixtes%20%C3%A0%20Grasses%2"
    },

  {
      id: "inoya-correcteur-cible",
      name: "Mon Correcteur Ciblé Imperfections Locales 15ml",
      description: "Correcteur ultra-concentré pour boutons isolés et imperfections localisées. Spécialisé peaux noires et métissées.",
      category: "visage",
      price: 12700,
      brand: "IN'OYA",
      targets: ["boutons isolés","imperfections localisées","peaux noires","peaux métissées","taches actives"],
      usagePoints: ["Traitement ciblé ultra-concentré","Réduit les boutons en 48h","Spécialisé peaux noires"],
      shopUrl: "https://www.jumia.cm/catalog/?q=IN'OYA%20Mon%20Correcteur%20Cibl%C3%A9%20Imperfections%20Locales%2015ml"
    },

  {
      id: "inoya-soin-anti-imperfections",
      name: "Mon Soin Anti-imperfections 30ml",
      description: "Traitement anti-acné global pour peaux noires et métissées à tendance acnéique. Régule le sébum.",
      category: "visage",
      price: 18000,
      brand: "IN'OYA",
      targets: ["acné","imperfections récurrentes","pores dilatés","peaux noires","peaux métissées","régulation sébum"],
      usagePoints: ["Traitement anti-acné global","Nettoie et resserre les pores","Régule le sébum"],
      shopUrl: "https://www.jumia.cm/catalog/?q=IN'OYA%20Mon%20Soin%20Anti-imperfections%2030ml"
    },

  {
      id: "inoya-elixir-regenerant",
      name: "Mon Élixir Régénérant Réparant 30ml",
      description: "Élixir régénérant pour peau abîmée, taches résiduelles. Régénère et répare la barrière cutanée.",
      category: "visage",
      price: 28200,
      brand: "IN'OYA",
      targets: ["peau abîmée","taches résiduelles","régénération","réparation","peaux noires","peaux métissées"],
      usagePoints: ["Régénère et répare la barrière","Efface les marques","Redonne éclat et fermeté"],
      shopUrl: "https://www.jumia.cm/catalog/?q=IN'OYA%20Mon%20%C3%89lixir%20R%C3%A9g%C3%A9n%C3%A9rant%20R%C3%A9parant%2030ml"
    },

  {
      id: "advanced-clinicals-vitc-anti-age",
      name: "Sérum Anti-âge à la Vitamine C 52ml",
      description: "Sérum anti-âge vitamine C + acide férulique. Cible les taches, unifie le teint, action anti-âge globale.",
      category: "visage",
      price: 18000,
      brand: "Advanced Clinicals",
      targets: ["taches brunes","teint inégal","rides","manque d'éclat","anti-âge","vitamine C"],
      usagePoints: ["Vitamine C + acide férulique","Cible les taches","Action anti-âge globale"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Advanced%20Clinicals%20S%C3%A9rum%20Anti-%C3%A2ge%20%C3%A0%20la%20Vitamine%20C%2"
    },

  {
      id: "cosrx-snail-92-creme",
      name: "Advanced Snail 92 Crème tout-en-un 100gr",
      description: "Crème K-Beauty avec 92% de mucine d'escargot. Régénère, hydrate et répare en profondeur.",
      category: "visage",
      price: 20600,
      brand: "CosRx",
      targets: ["peau déshydratée","cicatrices","pores dilatés","teint terne","régénération","mucine escargot"],
      usagePoints: ["92% mucine d'escargot","Régénère, hydrate et répare","Texture légère"],
      shopUrl: "https://www.jumia.cm/catalog/?q=CosRx%20Advanced%20Snail%2092%20Cr%C3%A8me%20tout-en-un%20100gr"
    },

  {
      id: "caudalie-vinopure-fluide",
      name: "Vinopure Fluide Matifiant Hydratant 40ml",
      description: "Fluide matifiant aux polyphénols de raisin + niacinamide. Pour peau mixte à grasse, matifie et hydrate.",
      category: "visage",
      price: 21600,
      brand: "Caudalie",
      targets: ["peau grasse","peau mixte","brillance","pores dilatés","imperfections","polyphénols","niacinamide"],
      usagePoints: ["Matifie et hydrate sans effet occlusif","Polyphénols de raisin + niacinamide","Resserre les pores"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Caudalie%20Vinopure%20Fluide%20Matifiant%20Hydratant%2040ml"
    },

  {
      id: "clinique-moisture-surge-100h",
      name: "Moisture Surge Soin Auto-Rehydratant 100H 30ml",
      description: "Soin auto-réhydratant 100h pour peau déshydratée. Aloe vera bio-fermenté, gel-crème léger.",
      category: "visage",
      price: 20500,
      brand: "Clinique",
      targets: ["peau déshydratée","teint terne","manque de confort","hydratation longue durée","aloe vera"],
      usagePoints: ["Hydratation auto-régénérante 100h","Aloe vera bio-fermenté","Peau repulpée"],
      shopUrl: "https://www.jumia.cm/catalog/?q=Clinique%20Moisture%20Surge%20Soin%20Auto-Rehydratant%20100H%2030ml"
    },

  {
      id: "inkey-list-vitamin-c",
      name: "Vitamin C Serum 30ml",
      description: "Sérum vitamine C stabilisée doux pour débutants. Illumine progressivement.",
      category: "visage",
      price: 14600,
      brand: "The Inkey List",
      targets: ["teint terne","taches","manque d'éclat","vitamine C douce","peau sensible","débutants vitamine C"],
      usagePoints: ["Vitamine C stabilisée","Illumine progressivement","Adaptée aux peaux sensibles"],
      shopUrl: "https://www.jumia.cm/catalog/?q=The%20Inkey%20List%20Vitamin%20C%20Serum%2030ml"
    },
  ];
