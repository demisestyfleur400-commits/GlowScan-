import { catalog, isKit, kitProducts, kitValue, productPhotos, type Product } from "./catalog";

// ════════════════════════════════════════════════════════════════════════
// Choix du kit recommandé après une analyse.
// Une seule source de vérité, utilisée par le serveur (recommendations.products)
// et par l'écran Résultat. Le choix repose sur les mesures renvoyées par
// l'analyse (taches, imperfections, hydratation, sébum) et sur le diagnostic
// écrit, pas sur un nom de produit inventé par l'IA.
// ════════════════════════════════════════════════════════════════════════

export const KIT_IDS = {
  acne: "kit-peau-nette-30j",
  taches: "kit-eclat-antitaches-30j",
  parfaite: "kit-peau-parfaite-30j",
  hydratation: "kit-hydratation-30j",
  antiAge: "kit-anti-age-30j",
  corps: "kit-corps-30j",
} as const;

type KitKey = keyof typeof KIT_IDS;

/** Phrase courte affichée sous le kit : pourquoi il est proposé. */
export const KIT_REASON: Record<KitKey, string> = {
  acne: "Votre analyse montre des imperfections. Les traiter tôt évite les taches qu'elles laissent sur les peaux foncées.",
  taches: "Votre analyse montre des taches. Ce kit unifie le teint en douceur, sans éclaircir la peau.",
  parfaite: "Votre peau va bien. Ce kit l'entretient et prévient les taches au quotidien.",
  hydratation: "Votre analyse montre une peau qui manque d'hydratation. Ce kit la réhydrate et répare sa barrière.",
  antiAge: "Votre analyse montre des signes de l'âge. Ce kit lisse les ridules et ravive l'éclat.",
  corps: "Une routine simple pour une peau du corps douce, hydratée et uniforme.",
};

export type KitInput = {
  spots?: number | null;
  blemishes?: number | null;
  condition?: string | null;
  conditionSecondaire?: string | null;
  details?: string | null;
  balance?: { sebum?: number | null; hydration?: number | null } | null;
  metrics?: { hydratation?: number | null } | null;
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};

const TEXT: Record<Exclude<KitKey, "parfaite" | "corps">, RegExp> = {
  acne: /acn[ée]|bouton|com[ée]don|point[s]? noir|pustule|papule|imperfection|s[ée]bum|peau grasse|pores/i,
  taches: /tache|hyperpigment|pigment|m[ée]lasma|masque de grossesse|teint (in)?[ée]gal|irr[ée]gulier|marque/i,
  hydratation: /s[èe]che|s[ée]cheresse|d[ée]shydrat|tiraill|x[ée]rose|terne|grise|squam|desquam/i,
  antiAge: /ride|ridule|vieilliss|anti-?[âa]ge|fermet[ée]|rel[âa]chement|affaissement/i,
};

/** Kit le plus adapté au résultat, ou null (cheveux / zone sans kit). */
export function pickKit(r: KitInput, area = "face"): Product | null {
  if (area === "hair" || area === "scalp") return null;
  const byId = (id: string) => catalog.find((p) => p.id === id) || null;
  if (area === "body") return byId(KIT_IDS.corps);

  const text = [r.condition, r.conditionSecondaire, r.details].filter(Boolean).join(" ");
  const spots = num(r.spots);
  const blemishes = num(r.blemishes);
  const sebum = num(r.balance?.sebum); // 0-10
  const hydRaw = num(r.metrics?.hydratation) ?? (num(r.balance?.hydration) !== null ? num(r.balance?.hydration)! * 10 : null);

  const score: Record<Exclude<KitKey, "parfaite" | "corps">, number> = {
    acne: (blemishes ?? 0) + (sebum !== null ? Math.max(0, sebum - 5) * 6 : 0) + (TEXT.acne.test(text) ? 35 : 0),
    taches: (spots ?? 0) + (TEXT.taches.test(text) ? 35 : 0),
    hydratation: (hydRaw !== null ? Math.max(0, 60 - hydRaw) * 1.5 : 0) + (TEXT.hydratation.test(text) ? 35 : 0),
    antiAge: TEXT.antiAge.test(text) ? 60 : 0,
  };
  const [best, value] = (Object.entries(score) as [Exclude<KitKey, "parfaite" | "corps">, number][])
    .sort((a, b) => b[1] - a[1])[0];
  return byId(value >= 40 ? KIT_IDS[best] : KIT_IDS.parfaite);
}

export function kitReason(kit: Product): string {
  const key = (Object.keys(KIT_IDS) as KitKey[]).find((k) => KIT_IDS[k] === kit.id);
  return key ? KIT_REASON[key] : kit.description;
}

/** Données d'affichage d'un kit (photos, contenu, prix, économie). */
export function kitCard(kit: Product) {
  const items = kitProducts(kit);
  const value = kitValue(kit);
  const price = kit.price ?? value;
  return {
    id: kit.id,
    name: kit.name,
    reason: kitReason(kit),
    photos: productPhotos(kit),
    items: items.map((p) => ({ id: p.id, name: p.name, brand: p.brand || "", image: p.image || null })),
    price,
    value,
    saving: Math.max(0, value - price),
  };
}

export const allKits = (): Product[] => catalog.filter(isKit);
