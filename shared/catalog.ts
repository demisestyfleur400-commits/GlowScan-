export interface Product {
  id: string;
  name: string;
  description: string;
  category: "corps" | "visage" | "cheveux";
  price?: number;
  image?: string;
  /** Kits : identifiants des produits inclus (photos, valeur séparée et contenu calculés depuis le catalogue) */
  kitItems?: string[];
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


  // ═══════════════════════════════════════════════════════════════
  // GLOWSCAN DERMO — Sélection Dermocosmétique Premium
  // Formules référencées et recommandées par GlowScan AI
  // Nommées par ingrédient actif (pas par marque commerciale)
  // Commande & livraison via GlowScan : +237674377959
  // ═══════════════════════════════════════════════════════════════

  // ── VISAGE — Nettoyants ──────────────────────────────────────────
  {
    id: "gs-gel-nettoyant-sebum",
    name: "Gel Moussant Nettoyant 236ml",
    brand: "CeraVe",
    description: "Gel nettoyant moussant pour peaux normales à grasses, aux 3 céramides essentiels, niacinamide et acide hyaluronique. Élimine l'excès de sébum sans dessécher ni agresser la barrière cutanée. 236ml.",
    category: "visage",
    price: 14000,
    image: "https://www.cerave.fr/-/media/project/loreal/brand-sites/cerave/emea/fr/fr-all-product-details-latest/new-pdp-images/gel-moussant/foaming-cleanser-icon-fr-lg.webp?rev=-1?w=800&hash=EE5DD2512B635A34E8274222581A4DEE",
    targets: ["acné", "peau grasse", "pores dilatés", "points noirs", "excès de sébum", "brillance", "comédons", "impuretés visage"],
    usagePoints: [
      "Nettoie l'excès de sébum en douceur",
      "Céramides et niacinamide pour respecter la barrière cutanée",
      "Sans parfum, non comédogène"
    ],
    whatsapp: "+237674377959",
    sourceRef: "CeraVe Gel Moussant Nettoyant 236ml",
  },
  // ── VISAGE — Sérums actifs ────────────────────────────────────────
  {
    id: "gs-serum-niacinamide",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    description: "Sérum à forte concentration de niacinamide (vitamine B3) et de zinc PCA. Aide à réduire l'apparence des pores, l'excès de sébum et le teint terne. 30ml.",
    category: "visage",
    price: 11000,
    image: "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwce8a7cdf/Images/products/The%20Ordinary/rdn-niacinamide-10pct-zinc-1pct-30ml.png?sw=800&sh=800&sm=fit",
    targets: ["pores dilatés", "taches post-acné", "peau grasse", "teint terne", "texture irrégulière", "acné", "hyperpigmentation", "imperfections"],
    usagePoints: [
      "Réduit l'apparence des pores et de la brillance",
      "Aide à unifier le teint",
      "Matin et soir, après le nettoyage"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Niacinamide 10% + Zinc 1% 30ml",
  },
  {
    id: "gs-lotion-bha-acne",
    name: "Skin Perfecting 2% BHA Liquid Exfoliant",
    brand: "Paula's Choice",
    description: "Exfoliant liquide sans rinçage à 2% d'acide salicylique (BHA) et extrait de thé vert. Désincruste les pores et aide à réduire points noirs et imperfections. Texture légère. 118ml.",
    category: "visage",
    price: 11500,
    image: "https://www.sephora.co.uk/img/prod/pid/P10036262/paula_039_s_choice_skin_perfecting_2_bha_liquid_exfoliant_118ml_1570105752_main.jpg",
    targets: ["comédons", "points noirs", "pores dilatés", "acné", "texture irrégulière", "peau grasse", "exfoliation chimique", "bouchons sébacés"],
    usagePoints: [
      "Désincruste les pores et les points noirs",
      "Exfoliation chimique douce, sans grains",
      "Commencer un jour sur deux, puis jusqu'à 2 fois par jour"
    ],
    whatsapp: "+237674377959",
    sourceRef: "Paula's Choice Skin Perfecting 2% BHA Liquid Exfoliant 118ml",
  },
  {
    id: "gs-serum-vitamine-c",
    name: "Vitamin C Suspension 23% + HA Spheres 2%",
    brand: "The Ordinary",
    description: "Suspension sans eau de vitamine C pure (acide L-ascorbique 23%) avec sphères d'acide hyaluronique. Illumine le teint et aide à atténuer les irrégularités. Légers picotements possibles. 30ml.",
    category: "visage",
    price: 14000,
    image: "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwd0597332/Images/products/The%20Ordinary/rdn-vitamin-c-suspension-23pct-ha-spheres-2pct-30ml.png?sw=800&sh=800&sm=fit",
    targets: ["teint terne", "taches brunes", "éclat visage", "anti-âge", "hyperpigmentation", "unification teint", "fatigue cutanée", "taches solaires"],
    usagePoints: [
      "Illumine et unifie le teint",
      "Vitamine C pure, stable car sans eau",
      "Peut se diluer dans une crème pour habituer la peau"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Vitamin C Suspension 23% + HA Spheres 2% 30ml",
  },
  {
    id: "gs-creme-antitaches-nuit",
    name: "Azelaic Acid Suspension 10%",
    brand: "The Ordinary",
    description: "Crème légère à 10% d'acide azélaïque. Aide à unifier le teint, atténuer les taches post-acné et améliorer la texture de la peau. Non comédogène, tous types de peau. 30ml.",
    category: "visage",
    price: 11000,
    image: "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwedfce090/Images/products/The%20Ordinary/rdn-azelaic-acid-suspension-10pct-100ml.png?sw=800&sh=800&sm=fit",
    targets: ["melasma", "taches brunes", "hyperpigmentation", "taches post-acné", "teint irrégulier", "peau terne", "masque de grossesse"],
    usagePoints: [
      "Aide à atténuer taches et marques post-acné",
      "Améliore la texture de la peau",
      "Matin et/ou soir, protection solaire le jour"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Azelaic Acid Suspension 10% 30ml",
  },
  {
    id: "gs-serum-retinol",
    name: "Retinol 0.2% in Squalane",
    brand: "The Ordinary",
    description: "Sérum au rétinol 0,2% dans du squalane, idéal pour débuter le rétinol. Cible ridules, texture irrégulière et teint inégal. Sans eau. 30ml. Déconseillé pendant la grossesse et l'allaitement.",
    category: "visage",
    price: 13000,
    image: "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw30e9d48b/Images/products/The%20Ordinary/rdn-retinol-0-2pct-in-squalane-30ml.png?sw=800&sh=800&sm=fit",
    targets: ["rides", "ridules", "anti-âge", "vieillissement cutané", "taches brunes", "texture irrégulière", "affaissement cutané", "renouvellement cellulaire"],
    usagePoints: [
      "Rétinol doux, idéal pour débuter",
      "Lisse progressivement ridules et texture",
      "Le soir uniquement, protection solaire le jour"
    ],
    whatsapp: "+237674377959",
    sourceRef: "The Ordinary Retinol 0.2% in Squalane 30ml",
  },

  // ── VISAGE — Protection & Crèmes ─────────────────────────────────
  {
    id: "gs-spf50-dermo",
    name: "Anthelios UVMune 400 Fluide Invisible SPF50+",
    brand: "La Roche-Posay",
    description: "Fluide solaire très haute protection SPF50+ contre les UVA, UVA ultra-longs et UVB, enrichi en Eau Thermale de La Roche-Posay. Texture ultra-légère, fini invisible et non gras. Peaux sensibles. 50ml.",
    category: "visage",
    price: 14000,
    image: "https://static.thcdn.com/productimg/original/13494906-1715332633881423.jpg",
    targets: ["protection solaire", "anti-taches", "photovieillissement", "teint terne", "peau sensible", "hyperpigmentation", "prévention taches", "rides solaires"],
    usagePoints: [
      "Très haute protection SPF50+ visage",
      "Fini invisible et non gras",
      "Indispensable avec les soins anti-taches"
    ],
    whatsapp: "+237674377959",
    sourceRef: "La Roche-Posay Anthelios UVMune 400 Fluide Invisible SPF50+ 50ml",
  },
  {
    id: "gs-creme-barriere-hydra",
    name: "Baume Hydratant Visage et Corps 177ml",
    brand: "CeraVe",
    description: "Baume hydratant riche aux 3 céramides essentiels et à l'acide hyaluronique, pour peaux sèches à très sèches. Nourrit, hydrate et aide à restaurer la barrière cutanée. Sans parfum. Visage et corps. 177ml.",
    category: "visage",
    price: 11000,
    image: "https://www.boticinal.com/media/catalog/product/c/e/cerave-soin-corps-baume-hydratant-177ml-001-3337875598996-front.jpg",
    targets: ["peau sèche", "peau déshydratée", "barrière cutanée", "tiraillements", "peau sensible", "réparation cutanée", "eczéma léger", "peau fragilisée"],
    usagePoints: [
      "Aide à restaurer la barrière cutanée",
      "Hydrate les peaux sèches à très sèches",
      "Sans parfum, visage et corps"
    ],
    whatsapp: "+237674377959",
    sourceRef: "CeraVe Baume Hydratant 177ml",
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
    price: 11000,
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
    price: 12000,
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
    price: 11500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B178231%7D_%7BBIO_ATODERM_INTENSIVE_GEL_MOUSSANT%7D_%7B28134B%7D.png?itok=y4nbKWKz",
    targets: ["eczéma atopique", "peau atopique", "dermatite atopique", "barrière cutanée", "démangeaisons corps"],
    usagePoints: ["Adapté aux peaux eczémateuses, formule apaisante", "Aide à renforcer la barrière cutanée", "Sans savon — formule concentrée"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-atoderm-intensive-pain",
    name: "Atoderm Intensive Pain Dermatologique",
    brand: "Bioderma",
    description: "Pain de soin sans savon pour peaux atopiques et très sensibles. Nettoie, apaise et protège sans irriter la barrière cutanée. 150g.",
    category: "corps",
    price: 10500,
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
    description: "Gel nettoyant moussant purifiant pour peaux mixtes à grasses et acnéiques. Adapté aux peaux séborrhéiques, purifie les pores et adapté aux peaux à tendance acnéique. 200ml.",
    category: "visage",
    price: 10500,
    image: "https://www.bioderma.ae/sites/ae/files/styles/ultrawide_product_list_thumbnail/public/products/%7B202461%7D_%7BBIO_SEBIUM_GEL_MOUSSANT%7D_%7B28664B%7D.png?itok=3jrGsuMc",
    targets: ["peau grasse", "acné", "pores dilatés", "sébum excessif", "boutons", "peau mixte", "imperfections visage"],
    usagePoints: ["Adapté aux peaux séborrhéiques en profondeur", "Prévient les boutons", "Purifie sans assécher"],
    whatsapp: "+237674377959",
  },
  {
    id: "bio-sebium-gel-gommant",
    name: "Sébium Gel Gommant Exfoliant",
    brand: "Bioderma",
    description: "Gel exfoliant purifiant pour peaux mixtes à grasses. Élimine les cellules mortes, désobstrue les pores, réduit les points noirs et unifie le teint. 100ml.",
    category: "visage",
    price: 11000,
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
    price: 14000,
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
    price: 13500,
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
    price: 11000,
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
    price: 11000,
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
    price: 11500,
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
    price: 16500,
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
    price: 10500,
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
    price: 15500,
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
    price: 10000,
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
    price: 9500,
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
    price: 6500,
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
    price: 9000,
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
    description: "Soin global anti-imperfections pour peaux à tendance acnéique. Adapté aux peaux séborrhéiques, réduit les boutons, resserre les pores et unifie le teint en 4 semaines. 40ml.",
    category: "visage",
    price: 13000,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-3-1689943261.png",
    targets: ["acné", "peau grasse", "pores dilatés", "boutons", "sébum", "imperfections", "peau mixte", "acné hormonale"],
    usagePoints: ["Réduit boutons et rougeurs en 4 semaines", "Adapté aux peaux séborrhéiques", "Resserre les pores visibles"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-hyseac-gel-nettoyant",
    name: "Hyséac Gel Nettoyant Purifiant",
    brand: "Uriage",
    description: "Gel nettoyant purifiant pour peaux mixtes à grasses. Nettoie efficacement l'excès de sébum, nettoie les pores en profondeur et adapté aux peaux avec imperfections. 150ml.",
    category: "visage",
    price: 10000,
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
    price: 14500,
    image: "https://cdn.uriage.fr/var/images/produits/resized/product_list_item/fr-fr-fluide-matifiant-1750145712.png",
    targets: ["protection solaire", "SPF50", "peau grasse", "effet mat", "anti-brillance", "acné", "peau mixte"],
    usagePoints: ["Protection SPF50+ très haute", "Effet mat longue durée", "Pour peaux grasses et acnéiques"],
    whatsapp: "+237674377959",
  },
  {
    id: "uriage-hyseac-pate-sos",
    name: "Hyséac Pâte SOS Soin Ciblé Boutons",
    brand: "Uriage",
    description: "Soin ciblé SOS à appliquer directement sur chaque bouton. Assèche, aide à atténuer l'apparence de le bouton en 24-48h. Formule translucide. 15ml.",
    category: "visage",
    price: 8500,
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
    price: 14000,
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
    price: 14000,
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
    price: 16000,
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
    price: 14500,
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
    description: "Soin émollient pour peaux atopiques sèches sujettes à l'eczéma. Restaure le film lipidique, adapté aux peaux qui démangent et aide à espacer les poussées.",
    category: "corps",
    price: 12500,
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
    price: 11500,
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
    description: "Gel nettoyant purifiant pour peaux mixtes à grasses sujettes aux imperfections. Nettoie efficacement l'excès de sébum, nettoie en profondeur et adapté aux peaux à tendance acnéique. 200ml.",
    category: "visage",
    price: 9000,
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
    price: 10500,
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
    price: 9500,
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
    price: 13500,
    image: "https://fr.topicrem.com/cdn/shop/files/PRODUIT-SUN-PROTECT-MOUSSE-Visuel1_780283f2-e886-433b-bd9e-41b7ffa7cff6.jpg?v=1773757164&width=713",
    targets: ["protection solaire", "SPF50", "écran solaire", "anti-UV", "texture mousse", "visage corps", "exposition solaire"],
    usagePoints: ["SPF50+ protection très haute", "Texture mousse légère originale", "Résistant à l'eau"],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════════
  // LA ROCHE-POSAY — Dermatologie Pharmacie (disponible Cameroun)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "lrp-effaclar-gel-nettoyant",
    name: "Effaclar Gel Nettoyant Purifiant 400ml",
    brand: "La Roche-Posay",
    description: "Gel nettoyant purifiant dermatologique pour peaux grasses et à tendance acnéique. Nettoie efficacement l'excès de sébum, nettoie les pores et réduit les imperfections sans assécher. 400ml.",
    category: "visage",
    price: 11000,
    image: "https://www.laroche-posay.fr/dw/image/v2/AAQP_PRD/on/demandware.static/-/Sites-lrp-ng-master-catalog/fr_FR/dwffe33bc9/LRP_Product/Effaclar/3337872411991_Effaclar-Purifying-Cleansing-Gel_400ml_01_La-Roche-Posay.jpg?sw=1080&sh=1080&sm=cut&sfrm=jpg&q=70",
    targets: ["peau grasse", "acné", "boutons", "sébum excessif", "pores bouchés", "imperfections", "nettoyant visage", "peau mixte"],
    usagePoints: ["Purifie sans agresser la peau", "Nettoie efficacement l'excès de sébum", "Formule dermatologique testée"],
    whatsapp: "+237674377959",
  },
  {
    id: "lrp-effaclar-duo-m-set",
    name: "Effaclar DUO+M Set — Acné & Taches Post-Acné",
    brand: "La Roche-Posay",
    description: "Set dermatologique duo anti-acné avec technologie Melasyl. Traite les boutons actifs ET les taches post-inflammatoires (PIH) laissées sur peaux noires. Idéal pour peaux africaines. Gel nettoyant + Soin DUO+M inclus.",
    category: "visage",
    price: 23500,
    image: "https://www.laroche-posay.fr/dw/image/v2/AAQP_PRD/on/demandware.static/-/Sites-lrp-ng-master-catalog/fr_FR/dw6fd45529/LRP_Product_set/LRP_DUO-M-10/LRP_DUO-M-10-1.jpg?sw=1080&sh=1080&sm=cut&sfrm=jpg&q=70",
    targets: ["acné", "taches post-acné", "PIH", "hyperpigmentation", "boutons", "peau noire", "mélasma", "imperfections", "peau grasse"],
    usagePoints: [
      "Traite l'acné active ET les taches qu'elle laisse — double action unique",
      "Technologie Melasyl cliniquement prouvée sur peaux foncées",
      "Set complet gel nettoyant + soin DUO+M"
    ],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════════
  // NUBIANCE — Dermatologie Spéciale Peaux Noires & Métissées
  // Marque française conçue exclusivement pour les peaux africaines
  // ═══════════════════════════════════════════════════════════════════

  // ── Produits individuels ──
  {
    id: "nubiance-nettoyant",
    name: "Gel Nettoyant Douceur",
    brand: "Nubiance",
    description: "Gel nettoyant formulé pour peaux noires et métissées. Nettoie en douceur sans déssécher, respecte la barrière cutanée et prépare la peau aux soins éclat. Convient à tous types de peaux africaines.",
    category: "visage",
    price: 11500,
    image: "https://nubiance.fr/cdn/shop/files/PACKSHOT-Nettoyant.png?v=1774537347&width=713",
    targets: ["nettoyant visage", "peau noire", "peau mixte", "peau sensible", "nettoyage doux", "routine peau africaine"],
    usagePoints: ["Formulé exclusivement pour peaux noires et métissées", "Nettoie sans agresser", "Prépare la peau aux soins"],
    whatsapp: "+237674377959",
  },
  {
    id: "nubiance-creme-eclat",
    name: "Crème Éclat Anti-Taches",
    brand: "Nubiance",
    description: "Crème éclat conçue pour les peaux noires et métissées. Atténue les taches brunes, unifie le teint et révèle l'éclat naturel des peaux africaines. Sans hydroquinone. 50ml.",
    category: "visage",
    price: 15000,
    image: "https://nubiance.fr/cdn/shop/files/PACKSHOT-Creme-eclat.jpg?v=1774340192&width=713",
    targets: ["taches brunes", "hyperpigmentation", "PIH", "mélasma", "teint terne", "peau noire", "éclat", "taches post-acné", "unification teint"],
    usagePoints: ["Conçu spécifiquement pour peaux noires et métissées", "Atténue taches et hyperpigmentation", "Sans hydroquinone — sécurisé"],
    whatsapp: "+237674377959",
  },
  {
    id: "nubiance-lait-corps",
    name: "Lait Hydratant Corps",
    brand: "Nubiance",
    description: "Lait corps nourrissant formulé pour peaux noires et métissées. Hydrate, unifie et révèle l'éclat naturel du corps. Texture légère absorbée rapidement sans film gras.",
    category: "corps",
    price: 12500,
    image: "https://nubiance.fr/cdn/shop/files/PACKSHOT-Lait_1.png?v=1774537224&width=713",
    targets: ["hydratation corps", "peau sèche corps", "éclat corps", "teint unifié corps", "peau noire corps", "nutrition corps"],
    usagePoints: ["Hydratation + éclat pour peaux noires", "Texture légère non grasse", "Unifie le teint du corps"],
    whatsapp: "+237674377959",
  },

  // ── DUO Nubiance (sets 2 produits) ──
  {
    id: "nubiance-duo-hydratant-visage-corps",
    name: "DUO Hydratant Visage + Corps",
    brand: "Nubiance",
    description: "Set duo hydratation complète pour peaux noires et métissées. Inclus : Crème Éclat visage + Lait Hydratant corps. Hydratation, nutrition et éclat de la tête aux pieds. Conçu pour les peaux africaines.",
    category: "visage",
    price: 23500,
    image: "https://nubiance.fr/cdn/shop/files/PACKSHOTS-DUO-HydratantVisage_Corps.jpg?v=1774940317&width=713",
    targets: ["hydratation visage corps", "peau noire", "éclat", "routine complète", "nutrition", "peau sèche africaine"],
    usagePoints: [
      "Hydratation complète visage + corps en un set",
      "Formulé exclusivement pour peaux noires et métissées",
      "Crème Éclat + Lait Corps inclus"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "nubiance-duo-anti-imperfections",
    name: "DUO Anti-Imperfections",
    brand: "Nubiance",
    description: "Set duo anti-imperfections pour peaux noires et métissées sujettes aux boutons et taches. Protocole complet contre l'acné et les marques qu'elle laisse sur peaux africaines.",
    category: "visage",
    price: 22500,
    image: "https://nubiance.fr/cdn/shop/files/PACKSHOTS-DUOAnti-Imperfections.jpg?v=1774940243&width=713",
    targets: ["acné", "boutons", "taches post-acné", "PIH", "imperfections", "peau noire acnéique", "hyperpigmentation", "peau grasse"],
    usagePoints: [
      "Double action : traite les boutons ET les taches qu'ils laissent",
      "Spécial peaux noires et métissées acnéiques",
      "Protocole anti-imperfections complet"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "nubiance-duo-hydratant-anti-imperfections",
    name: "DUO Hydratant + Anti-Imperfections",
    brand: "Nubiance",
    description: "Set duo polyvalent hydratation + soin des imperfections pour peaux noires et métissées. L'équilibre parfait entre nourrir la peau et diminuer l'apparence des boutons et taches. Formule exclusive peaux africaines.",
    category: "visage",
    price: 24500,
    image: "https://nubiance.fr/cdn/shop/files/PACKSHOTS-DUOHydratantAnti-Imperfections.jpg?v=1774940307&width=713",
    targets: ["peau noire", "hydratation", "acné", "taches", "PIH", "équilibre cutané", "routine complète peaux africaines", "imperfections"],
    usagePoints: [
      "Hydratation + anti-imperfections en un seul set",
      "Formulé exclusivement pour peaux noires et métissées",
      "La routine complète pour peaux africaines mixtes"
    ],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════════
  // CERAVE — Dermatologie Pharmacie (disponible Cameroun)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "cerave-anti-blemish-clay",
    name: "Anti-Blemish Foaming Clay Nettoyant",
    brand: "CeraVe",
    description: "Nettoyant argile moussant anti-imperfections avec acide salicylique et niacinamide. Nettoie en profondeur, désobstrue les pores et réduit les boutons tout en préservant la barrière cutanée. 236ml.",
    category: "visage",
    price: 11000,
    image: "https://www.cerave.fr/-/media/project/loreal/brand-sites/cerave/emea/fr/products/anti-blemish-cleansing-foaming-clay/new/images/clay-to-foam-1-lg.webp?rev=-1?w=130&hash=91E33F4578962031F6430555020704F1",
    targets: ["acné", "boutons", "pores dilatés", "peau grasse", "imperfections", "points noirs", "excès de sébum", "acide salicylique"],
    usagePoints: ["Argile + acide salicylique — double action anti-acné", "Nettoie sans détruire la barrière cutanée", "Avec niacinamide pour réduire les rougeurs"],
    whatsapp: "+237674377959",
  },
  {
    id: "cerave-gel-moussant",
    name: "Gel Moussant Nettoyant",
    brand: "CeraVe",
    description: "Gel nettoyant moussant pour peaux normales à grasses avec céramides et acide hyaluronique. Nettoie en profondeur sans perturber la barrière cutanée naturelle. Sans parfum. 236ml.",
    category: "visage",
    price: 10000,
    image: "https://www.cerave.fr/-/media/project/loreal/brand-sites/cerave/emea/fr/fr-all-product-details-latest/new-pdp-images/gel-moussant/foaming-cleanser-icon-fr-lg.webp?rev=-1?w=800&hash=EE5DD2512B635A34E8274222581A4DEE",
    targets: ["peau grasse", "peau normale", "nettoyant visage", "sébum", "pores", "acné légère", "nettoyage quotidien"],
    usagePoints: ["Céramides + acide hyaluronique préservent la barrière", "Sans parfum ni alcool", "Nettoyage profond pour peaux grasses"],
    whatsapp: "+237674377959",
  },
  {
    id: "cerave-lotion-spf30",
    name: "Lotion Hydratante Visage SPF30",
    brand: "CeraVe",
    description: "Lotion hydratante légère avec protection solaire SPF30 pour le visage. Hydrate, protège du soleil et préserve la barrière cutanée en un seul geste. Sans parfum, non comédogène.",
    category: "visage",
    price: 12500,
    image: "https://www.cerave.fr/-/media/project/loreal/brand-sites/cerave/emea/fr/products/facial-mositurising-lotion-spf-30/spf30-lg.jpg?rev=-1?w=800&hash=2B3D3C1FAA19B2FAA8584E0FB58FB5BF",
    targets: ["protection solaire", "SPF30", "hydratation visage", "soin quotidien", "peau normale à mixte", "écran solaire visage", "anti-UV"],
    usagePoints: ["Hydratation + SPF30 en un seul geste", "Non comédogène — ne bouche pas les pores", "Soin de jour idéal"],
    whatsapp: "+237674377959",
  },
  {
    id: "cerave-creme-lavante",
    name: "Crème Lavante Hydratante",
    brand: "CeraVe",
    description: "Crème lavante ultra-douce pour peaux sèches à normales. Nettoie sans savon, hydrate et restaure la barrière cutanée avec les 3 céramides essentiels. 236ml.",
    category: "visage",
    price: 10000,
    image: "https://www.cerave.fr/-/media/project/loreal/brand-sites/cerave/emea/fr/fr-all-product-details-latest/new-pdp-images/crme-lavante/hydrating-cleanser-icon-fr-lg.webp?rev=-1?w=800&hash=40C35B23F14093C1750D8F2080D5A287",
    targets: ["peau sèche", "peau normale", "nettoyant doux", "barrière cutanée", "céramides", "peau sensible", "nettoyage doux"],
    usagePoints: ["Nettoie sans savon agressif", "3 céramides essentiels restaurent la barrière", "Idéal peaux sèches et sensibles"],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════
  // SÉLECTION E-COMMERCE — produits des boutiques partenaires (sans stock)
  // Prix estimés (marché camerounais) — à aligner sur les prix des boutiques
  // ═══════════════════════════════════════════════════════════════
  {
    id: "eucerin-antipigment-serum-duo",
    name: "Anti-Pigment Sérum Duo 30ml",
    brand: "Eucerin",
    description: "Sérum double anti-taches au Thiamidol breveté et à l'acide hyaluronique. Réduit les taches brunes et aide à prévenir leur réapparition. Sans hydroquinone. 30ml.",
    category: "visage",
    price: 32500,
    image: "https://static.thcdn.com/productimg/original/13308998-1865232051669945.jpg",
    targets: ["taches brunes", "hyperpigmentation", "taches", "melasma", "taches post-acné", "teint irrégulier", "unification teint"],
    usagePoints: [
      "Thiamidol breveté contre les taches brunes",
      "Hydrate grâce à l'acide hyaluronique",
      "À associer à une protection solaire le jour"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "to-alpha-arbutin",
    name: "Alpha Arbutin 2% + HA 30ml",
    brand: "The Ordinary",
    description: "Sérum à 2% d'alpha-arbutine et acide hyaluronique pour atténuer l'apparence des taches et unifier le teint. Matin et soir, avec une protection solaire le jour. 30ml.",
    category: "visage",
    price: 11000,
    image: "https://static.thcdn.com/productimg/original/15464526-1535328246720597.jpg",
    targets: ["taches", "taches brunes", "hyperpigmentation", "taches post-acné", "teint irrégulier", "teint terne"],
    usagePoints: [
      "Atténue l'apparence des taches",
      "Unifie le teint en douceur",
      "Protection solaire indispensable le jour"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "to-hyaluronic-b5",
    name: "Hyaluronic Acid 2% + B5 30ml",
    brand: "The Ordinary",
    description: "Sérum hydratant à l'acide hyaluronique, aux céramides et à la provitamine B5. Hydrate, repulpe et lisse la peau. Convient à tous les types de peau. 30ml.",
    category: "visage",
    price: 10000,
    image: "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw67286abd/Images/products/The%20Ordinary/ord-hyaluronic-acid-2pct-B5-30ml-Clr-Acu.png?sw=800&sh=800&sm=fit",
    targets: ["hydratation", "peau déshydratée", "peau sèche", "tiraillements", "ridules", "peau terne"],
    usagePoints: [
      "Hydratation immédiate et durable",
      "Céramides pour la barrière cutanée",
      "Matin et soir, avant la crème"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "to-glycolic-toner",
    name: "Glycolic Acid 7% Exfoliating Toner 240ml",
    brand: "The Ordinary",
    description: "Lotion exfoliante à 7% d'acide glycolique (AHA). Affine le grain de peau, ravive l'éclat et unifie le teint. Le soir, quelques fois par semaine au début. 240ml.",
    category: "visage",
    price: 12000,
    image: "https://static.thcdn.com/productimg/original/11429303-4805145975363423.jpg",
    targets: ["teint terne", "texture irrégulière", "grain de peau", "éclat", "taches", "pores"],
    usagePoints: [
      "Exfoliation douce sans grains",
      "Ravive l'éclat du teint",
      "Le soir, protection solaire le lendemain"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "cerave-sa-cleanser",
    name: "SA Smoothing Cleanser 236ml",
    brand: "CeraVe",
    description: "Gel nettoyant à l'acide salicylique, aux 3 céramides et à l'acide hyaluronique. Exfolie en douceur, lisse les peaux rugueuses et aide contre les imperfections, sans dessécher. Visage et corps. 236ml.",
    category: "visage",
    price: 13000,
    image: "https://static.thcdn.com/productimg/original/12207663-6915324621754024.jpg",
    targets: ["peau rugueuse", "texture irrégulière", "imperfections", "acné", "boutons", "pores", "kératose pilaire"],
    usagePoints: [
      "Exfolie en douceur grâce à l'acide salicylique",
      "Céramides : ne dessèche pas",
      "Visage et corps"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "lrp-effaclar-duo-m",
    name: "Effaclar Duo+M 40ml",
    brand: "La Roche-Posay",
    description: "Soin anti-imperfections pour peaux grasses à tendance acnéique. Désobstrue les pores, réduit boutons et points noirs et aide à atténuer les marques post-acné. Hydrate 24h. 40ml.",
    category: "visage",
    price: 18500,
    image: "https://static.thcdn.com/productimg/original/11091821-1415335527893589.jpg",
    targets: ["acné", "boutons", "points noirs", "peau grasse", "imperfections", "taches post-acné", "pores"],
    usagePoints: [
      "Réduit boutons et points noirs",
      "Aide à atténuer les marques post-acné",
      "Matin et/ou soir après le nettoyage"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "avene-cleanance-gel",
    name: "Cleanance Gel Nettoyant 400ml",
    brand: "Avène",
    description: "Gel nettoyant sans savon pour peaux grasses à imperfections, à l'Eau thermale d'Avène. Purifie, réduit l'excès de sébum et matifie sans dessécher. Visage et corps. 400ml.",
    category: "visage",
    price: 17000,
    image: "https://static.thcdn.com/productimg/original/12743427-1095185188324138.jpg",
    targets: ["peau grasse", "imperfections", "acné", "sébum excessif", "brillance", "pores"],
    usagePoints: [
      "Purifie et matifie",
      "Sans savon, ne dessèche pas",
      "Grand format 400ml, visage et corps"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "lrp-cicaplast-b5",
    name: "Cicaplast Baume B5+ 40ml",
    brand: "La Roche-Posay",
    description: "Baume réparateur apaisant au panthénol 5% et madécassoside. Soulage les peaux irritées, sèches ou abîmées. Visage, corps et lèvres, pour toute la famille. 40ml.",
    category: "visage",
    price: 9500,
    image: "https://pharmacie-citypharma.fr/229731-large_default/la-roche-posay-cicaplast-baume-b5-40ml.jpg",
    targets: ["peau irritée", "réparation", "peau sèche", "peau sensible", "rougeurs", "irritation", "après-rasage"],
    usagePoints: [
      "Apaise et répare les peaux irritées",
      "Visage, corps et lèvres",
      "Pour toute la famille, dès la naissance"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "vichy-mineral-89",
    name: "Minéral 89 Booster Hydratant 50ml",
    brand: "Vichy",
    description: "Booster quotidien à l'acide hyaluronique et à l'eau volcanique de Vichy. Hydrate, repulpe et renforce la barrière de la peau. Formule minimaliste de 11 ingrédients. 50ml.",
    category: "visage",
    price: 26000,
    image: "https://static.thcdn.com/productimg/original/11499284-1435152226994972.jpg",
    targets: ["hydratation", "peau déshydratée", "peau sèche", "peau sensible", "éclat", "barrière cutanée"],
    usagePoints: [
      "Hydrate et repulpe",
      "Renforce la barrière cutanée",
      "Le matin avant la crème"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "garnier-vitc-booster",
    name: "Even & Matte Vitamin C Booster Serum 30ml",
    brand: "Garnier",
    description: "Sérum à la vitamine C, niacinamide et acide salicylique. Aide à atténuer les taches, ravive l'éclat et matifie. Petit prix, idéal pour débuter. 30ml.",
    category: "visage",
    price: 7500,
    image: "https://ke.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/49/109074/1.jpg?4586",
    targets: ["taches", "teint terne", "éclat", "peau grasse", "taches post-acné", "brillance"],
    usagePoints: [
      "Vitamine C + niacinamide + acide salicylique",
      "Ravive l'éclat et matifie",
      "Protection solaire le jour"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "palmers-cocoa-lotion",
    name: "Cocoa Butter Formula Lotion 400ml",
    brand: "Palmer's",
    description: "Lait corps au beurre de cacao et à la vitamine E. Hydrate 48h, adoucit les peaux sèches et rugueuses et aide à lisser l'apparence des marques. 400ml.",
    category: "corps",
    price: 6500,
    image: "https://media.superdrug.com//medias/sys_master/prd-images/he3/h05/12502235217950/prd-front-100757_600x600/prd-front-100757-600x600.jpg",
    targets: ["corps", "peau sèche", "hydratation corps", "peau rugueuse", "marques", "vergetures"],
    usagePoints: [
      "Beurre de cacao et vitamine E",
      "Hydratation 48h",
      "Adoucit les peaux sèches"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "eucerin-urearepair-lotion",
    name: "UreaRepair Plus Lotion 10% Urée 400ml",
    brand: "Eucerin",
    description: "Lait corps à 10% d'urée pour peaux très sèches et rugueuses. Hydrate 48h, restaure la barrière cutanée et lisse la peau. 400ml.",
    category: "corps",
    price: 18500,
    image: "https://static.thcdn.com/productimg/original/14759755-1505077068754506.jpg",
    targets: ["corps", "peau très sèche", "peau rugueuse", "sécheresse", "desquamation", "hydratation corps"],
    usagePoints: [
      "10% d'urée pour peaux très sèches",
      "Hydratation 48h",
      "Lisse les zones rugueuses"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "eucerin-urearepair-pieds",
    name: "UreaRepair Plus Crème Pieds 10% Urée 100ml",
    brand: "Eucerin",
    description: "Crème pieds à 10% d'urée pour pieds très secs, rugueux et talons craquelés. Hydrate et répare. 100ml.",
    category: "corps",
    price: 11500,
    image: "https://static.thcdn.com/productimg/original/11115981-2135111285371404.jpg",
    targets: ["pieds secs", "talons craquelés", "corps", "peau rugueuse", "sécheresse"],
    usagePoints: [
      "Talons craquelés et pieds très secs",
      "10% d'urée",
      "Matin et soir sur pieds propres"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "cantu-leave-in",
    name: "Shea Butter Leave-In Conditioning Repair Cream 453g",
    brand: "Cantu",
    description: "Crème sans rinçage au beurre de karité pur et huiles naturelles pour cheveux secs, abîmés, crépus ou bouclés. Aide à limiter la casse et les fourches, apporte souplesse et brillance. Sans silicone. 453g.",
    category: "cheveux",
    price: 8000,
    image: "https://static.thcdn.com/productimg/original/12042573-1995049338699247.jpg",
    targets: ["cheveux secs", "cheveux crépus", "cheveux bouclés", "casse", "fourches", "cheveux abîmés", "hydratation cheveux"],
    usagePoints: [
      "Beurre de karité pur",
      "Limite la casse et les fourches",
      "Sans silicone, sans alcool desséchant"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "cantu-shampoo",
    name: "Shea Butter Sulfate-Free Cleansing Cream Shampoo 400ml",
    brand: "Cantu",
    description: "Shampooing crème sans sulfates au beurre de karité. Nettoie en douceur les cheveux secs, crépus ou bouclés sans les dessécher. 400ml.",
    category: "cheveux",
    price: 8000,
    image: "https://static.thcdn.com/productimg/original/12042579-1855019065909787.jpg",
    targets: ["cheveux secs", "cheveux crépus", "cheveux bouclés", "cuir chevelu", "lavage doux"],
    usagePoints: [
      "Sans sulfates",
      "Nettoie sans dessécher",
      "Pour cheveux crépus et bouclés"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "sheamoisture-curl-smoothie",
    name: "Coconut & Hibiscus Curl Enhancing Smoothie 326ml",
    brand: "SheaMoisture",
    description: "Crème coiffante au beurre de karité, huile de coco et protéines de soie. Définit les boucles, hydrate et réduit les frisottis des cheveux épais, bouclés ou crépus. Sans silicone ni sulfates. 326ml.",
    category: "cheveux",
    price: 13000,
    image: "https://static.thcdn.com/productimg/original/11309661-1974942313600445.jpg",
    targets: ["cheveux bouclés", "cheveux crépus", "frisottis", "cheveux secs", "définition boucles", "hydratation cheveux"],
    usagePoints: [
      "Définit les boucles et réduit les frisottis",
      "Karité, coco et protéines de soie",
      "Sans silicone ni sulfates"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "sheamoisture-curl-shampoo",
    name: "Coconut & Hibiscus Curl & Shine Shampoo 379ml",
    brand: "SheaMoisture",
    description: "Shampooing au beurre de karité et à l'huile de coco pour cheveux bouclés et crépus. Nettoie en douceur, hydrate et apporte de la brillance. 379ml.",
    category: "cheveux",
    price: 12500,
    image: "https://static.thcdn.com/productimg/original/11309659-3014946154246711.jpg",
    targets: ["cheveux bouclés", "cheveux crépus", "cheveux secs", "brillance", "lavage doux"],
    usagePoints: [
      "Nettoie en douceur",
      "Hydrate et fait briller",
      "À associer au Curl Enhancing Smoothie"
    ],
    whatsapp: "+237674377959",
  },

  // ── KITS — une routine complète par besoin (recommandés après l'analyse) ──
  // Prix d'un kit = somme des prix de ses produits (recalculé au chargement, cf. fin du fichier).
  {
    id: "kit-peau-nette-30j",
    name: "Kit Acné & Points Noirs",
    brand: "GlowScan",
    description: "Routine anti-acné de 30 jours : nettoyer sans agresser, désincruster les pores, calmer les boutons. Traiter l'acné tôt limite les taches qu'elle laisse sur les peaux foncées.",
    category: "visage",
    price: 32500,
    kitItems: ["cerave-gel-moussant", "gs-lotion-bha-acne", "gs-serum-niacinamide"],
    targets: ["acné", "boutons", "points noirs", "comédons", "pores dilatés", "peau grasse", "sébum excessif", "imperfections", "peau mixte", "brillance"],
    usagePoints: [
      "Matin et soir : gel moussant, puis niacinamide",
      "Le soir, 1 jour sur 2 au début : BHA 2 %",
      "Limite les marques brunes laissées par les boutons"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "kit-eclat-antitaches-30j",
    name: "Kit Taches & Teint Unifié",
    brand: "GlowScan",
    description: "Routine anti-taches pensée pour les peaux riches en mélanine : atténuer les taches et marques post-acné sans éclaircir la peau, et les empêcher de revenir grâce à la protection solaire. Sans hydroquinone ni corticoïdes.",
    category: "visage",
    price: 40000,
    kitItems: ["nubiance-creme-eclat", "gs-creme-antitaches-nuit", "gs-spf50-dermo"],
    targets: ["hyperpigmentation", "taches brunes", "taches", "melasma", "teint irrégulier", "unification teint", "taches post-acné", "masque de grossesse", "taches solaires", "teint terne"],
    usagePoints: [
      "Nubiance, une marque formulée pour les peaux noires et métissées",
      "Acide azélaïque : unifie le teint en douceur",
      "SPF50+ chaque matin : sans soleil, les taches ne reviennent pas"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "kit-peau-parfaite-30j",
    name: "Kit Peau Parfaite",
    brand: "GlowScan",
    description: "Routine d'entretien pour garder une peau nette, lumineuse et uniforme : un nettoyant doux pour peaux noires et métissées, un sérum qui affine le grain de peau, et la protection solaire qui prévient les taches.",
    category: "visage",
    price: 36500,
    kitItems: ["nubiance-nettoyant", "gs-serum-niacinamide", "gs-spf50-dermo"],
    targets: ["peau normale", "entretien", "éclat", "éclat visage", "prévention", "pores", "grain de peau", "teint terne", "peau mixte", "prévention taches"],
    usagePoints: [
      "3 gestes simples, matin et soir",
      "Affine le grain de peau et la brillance",
      "Prévient les taches au quotidien"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "kit-hydratation-30j",
    name: "Kit Peau Sèche & Hydratation",
    brand: "GlowScan",
    description: "Routine pour peau sèche, déshydratée ou terne : nettoyer sans dessécher, réhydrater en profondeur et réparer la barrière cutanée. Redonne souplesse et éclat aux peaux qui tiraillent ou paraissent ternes.",
    category: "visage",
    price: 36500,
    kitItems: ["cerave-creme-lavante", "uriage-serum-booster-ha", "gs-creme-barriere-hydra"],
    targets: ["peau sèche", "peau déshydratée", "déshydratation", "hydratation", "tiraillements", "barrière cutanée", "peau terne", "peau sensible", "sécheresse", "peau fragilisée"],
    usagePoints: [
      "Crème lavante qui ne dessèche pas",
      "Sérum à l'acide hyaluronique",
      "Baume aux céramides : répare la barrière cutanée"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "kit-anti-age-30j",
    name: "Kit Anti-Âge",
    brand: "GlowScan",
    description: "Routine anti-âge : rétinol doux le soir, vitamine C le matin et baume aux céramides pour lisser les ridules, raviver l'éclat et garder la peau confortable.",
    category: "visage",
    price: 38000,
    kitItems: ["gs-serum-retinol", "gs-serum-vitamine-c", "gs-creme-barriere-hydra"],
    targets: ["rides", "ridules", "anti-âge", "vieillissement cutané", "affaissement cutané", "perte de fermeté", "peau mature", "éclat", "taches brunes"],
    usagePoints: [
      "Rétinol 0,2 % le soir, idéal pour débuter",
      "Vitamine C le matin pour l'éclat",
      "Baume aux céramides pour le confort"
    ],
    whatsapp: "+237674377959",
  },
  {
    id: "kit-corps-30j",
    name: "Kit Corps Doux & Unifié",
    brand: "GlowScan",
    description: "Routine corps : une douche surgras qui respecte la peau, un gommage doux pour les zones rugueuses, et un lait hydratant formulé pour les peaux noires et métissées.",
    category: "corps",
    price: 24000,
    kitItems: ["cav-gel-bain-douche", "cav-baume-gommant", "nubiance-lait-corps"],
    targets: ["corps", "peau sèche", "peau rugueuse", "texture irrégulière", "hydratation corps", "teint irrégulier", "sécheresse", "peau terne"],
    usagePoints: [
      "Douche surgras sans savon",
      "Gommage doux 1 à 2 fois par semaine",
      "Lait corps Nubiance pour peaux noires et métissées"
    ],
    whatsapp: "+237674377959",
  },

  // ═══════════════════════════════════════════════════════════════
  // ROGÉ CAVAILLÈS — Soins corps & hydratation (parapharmacie France)
  // Peaux sensibles · surgras végétal · formules vegan
  // Prix estimés (marché camerounais) — à ajuster selon marge réelle
  // Commande & livraison via GlowScan : +237674377959
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cav-gel-bain-douche",
    name: "Gel Bain & Douche L'Original",
    brand: "Rogé Cavaillès",
    description: "Gel lavant surgras sans savon au surgras végétal pro-régénérant. Testé dermatologiquement pour les peaux sensibles, mousse crémeuse au parfum iconique. Convient à toute la famille dès 3 ans. 400ml.",
    category: "corps",
    price: 5000,
    image: "https://www.xn--cavaills-70a.fr/wp-content/uploads/sites/2/2021/06/GBD-Original-2.png",
    targets: ["peau sensible", "toilette quotidienne", "corps", "nettoyage doux", "surgras", "peau réactive", "douche"],
    usagePoints: ["Lave sans savon, respecte la peau sensible", "Nourrit et protège au quotidien", "Famille dès 3 ans"],
    whatsapp: "+237674377959",
  },
  {
    id: "cav-baume-gommant",
    name: "Soin Exfoliant Baume Gommant",
    brand: "Rogé Cavaillès",
    description: "Baume-huile exfoliant au surgras végétal et huile de noisette bio, grains de sucre. Exfolie en douceur sans abîmer la peau sensible. 94% d'ingrédients d'origine naturelle, vegan. 200ml.",
    category: "corps",
    price: 6500,
    image: "https://www.xn--cavaills-70a.fr/wp-content/uploads/sites/2/2024/09/240412-2D-CAVAILLES-POT_CORPS_BEURRE_COMMANT_200ML_800x800.png",
    targets: ["exfoliation", "gommage corps", "peau sensible", "peau rugueuse", "texture irrégulière", "cellules mortes", "peau terne"],
    usagePoints: ["Exfolie en douceur sans agresser", "Hydrate et nourrit pendant le gommage", "94% naturel · vegan"],
    whatsapp: "+237674377959",
  },
  {
    id: "cav-creme-miraculeuse",
    name: "Crème Miraculeuse Multi-usages",
    brand: "Rogé Cavaillès",
    description: "Crème multi-usages visage & corps au surgras végétal pro-régénérant et centella asiatica bio. S'utilise en soin quotidien, démaquillant, masque hydratant ou après-rasage. Texture soyeuse, 97% naturel. 100ml.",
    category: "visage",
    price: 7000,
    image: "https://www.xn--cavaills-70a.fr/wp-content/uploads/sites/2/2023/10/3596490007379-CREME-MIRACULEUSE-MULTI-USAGES.png",
    targets: ["peau sèche", "hydratation", "zones sèches", "réparation", "multi-usages", "visage", "coudes genoux", "après-rasage", "peau sensible"],
    usagePoints: ["Visage et corps, plusieurs usages", "Hydrate et répare les zones sèches", "97% naturel · testé dermato & ophtalmo"],
    whatsapp: "+237674377959",
  },
  {
    id: "cav-gelee-eau",
    name: "Gelée-en-eau Désaltérante",
    brand: "Rogé Cavaillès",
    description: "Gelée hydratante à la texture fraîche gel-en-eau, aux huiles végétales réparatrices et extrait de concombre bio. Hydratation immédiate, toucher non gras. 95% naturel, vegan. 200ml.",
    category: "corps",
    price: 6500,
    image: "https://www.xn--cavaills-70a.fr/wp-content/uploads/sites/2/2023/10/3596490007393-GELEE-EN-EAU-DESALTERANTE.png",
    targets: ["hydratation légère", "peau normale", "fraîcheur", "toucher sec", "hydratation quotidienne", "corps", "tous types de peau"],
    usagePoints: ["Hydratation fraîche, non grasse", "Pénètre vite, toucher sec", "95% naturel · vegan"],
    whatsapp: "+237674377959",
  },
  {
    id: "cav-beurre-fondant",
    name: "Beurre Fondant Nourrissant",
    brand: "Rogé Cavaillès",
    description: "Beurre corporel nourrissant au surgras végétal et beurre de karité bio. Hydrate en profondeur les peaux très sèches, texture fondante et parfum réconfortant. 97% naturel, vegan. 200ml.",
    category: "corps",
    price: 7500,
    image: "https://www.xn--cavaills-70a.fr/wp-content/uploads/sites/2/2023/10/3596490007416-BEURRE-FONDANT-NOURRISSANT.png",
    targets: ["peau très sèche", "nutrition", "sécheresse", "karité", "hydratation intense", "corps", "tiraillements", "peau rugueuse"],
    usagePoints: ["Nourrit intensément les peaux très sèches", "Texture fondante, absorption rapide", "Karité bio · 97% naturel"],
    whatsapp: "+237674377959",
  },
  {
    id: "cav-creme-perlee",
    name: "Crème Perlée Ultra-Hydratante",
    brand: "Rogé Cavaillès",
    description: "Crème corps ultra-hydratante aux perles de gras végétal pro-régénérant et aloe vera bio. Hydratation immédiate et 48h, texture aérienne. 97% naturel, vegan, testée dermatologiquement. 400ml.",
    category: "corps",
    price: 8000,
    image: "https://www.xn--cavaills-70a.fr/wp-content/uploads/sites/2/2023/10/3596490007409-CREME-PERLEE-ULTRA-HYDRATANTE.png",
    targets: ["peau sèche", "hydratation 48h", "aloe vera", "hydratation corps", "confort", "tiraillements", "hydratation longue durée"],
    usagePoints: ["Hydrate immédiatement et pendant 48h", "Texture aérienne, pénètre vite", "Aloe vera bio · 97% naturel"],
    whatsapp: "+237674377959",
  },
];

// ─── Kits ────────────────────────────────────────────────────────────
export const isKit = (p: Product): boolean => Array.isArray(p.kitItems) && p.kitItems.length > 0;

/** Produits contenus dans un kit, dans l'ordre de la routine. */
export function kitProducts(p: Product): Product[] {
  return (p.kitItems || []).map((id) => catalog.find((c) => c.id === id)).filter((c): c is Product => !!c);
}

/** Somme des prix des produits du kit achetés séparément. */
export function kitValue(p: Product): number {
  return kitProducts(p).reduce((sum, c) => sum + (c.price || 0), 0);
}

/** Photos à afficher pour un produit : celles des produits inclus pour un kit, sinon la sienne. */
export function productPhotos(p: Product): string[] {
  if (isKit(p)) return kitProducts(p).map((c) => c.image).filter((u): u is string => !!u);
  return p.image ? [p.image] : [];
}

// Prix d'un kit = somme exacte des prix de ses produits, toujours à jour
// si le prix d'un produit change (boutique, résultat, commande, prompt IA).
for (const p of catalog) if (isKit(p)) p.price = kitValue(p);
