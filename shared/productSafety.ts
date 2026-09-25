// ════════════════════════════════════════════════════════════════════════
// Scan produit — détection déterministe des ingrédients dangereux (README §3.7).
// L'IA lit la liste d'ingrédients ; ce module décide seul du danger, pour que
// l'hydroquinone, un corticoïde ou le mercure ne passent jamais inaperçus.
// ════════════════════════════════════════════════════════════════════════

export const FREE_PRODUCT_SCANS_PER_WEEK = 3;

export type HazardKind = "hydroquinone" | "corticoid" | "mercury";
export type IngredientRisk = "danger" | "caution" | "ok";

const HAZARDS: { kind: HazardKind; re: RegExp; why: string }[] = [
  { kind: "hydroquinone", re: /hydroquinon|hydroquinol|quinol\b/i, why: "éclaircissant, sur ordonnance" },
  {
    kind: "corticoid",
    re: /clob[eé]tasol|b[eé]tam[eé]thason|dexam[eé]thason|fluocinol|fluocinonid|triamcinolon|m[oé]m[eé]tason|hydrocortison|prednisol|halobetasol|fluticason|desonid|diflorason|cortico/i,
    why: "corticoïde, abîme la peau à long terme",
  },
  { kind: "mercury", re: /mercur|mercury|calomel|hydrargyr|\bhg\b/i, why: "mercure, toxique" },
];

export const HAZARD_LABEL: Record<HazardKind, string> = {
  hydroquinone: "de l'hydroquinone",
  corticoid: "un corticoïde",
  mercury: "du mercure",
};

export function hazardOf(ingredient: string): { kind: HazardKind; why: string } | null {
  const h = HAZARDS.find((x) => x.re.test(ingredient));
  return h ? { kind: h.kind, why: h.why } : null;
}

export type ProductIngredient = { name: string; why: string; risk: IngredientRisk };

export type ProductVerdict = {
  verdict: "compatible" | "avoid";
  title: "Compatible" | "À éviter pour votre peau";
  text: string;
  hazards: HazardKind[];
};

/** Verdict final : un ingrédient dangereux impose « À éviter », quoi qu'en dise l'IA. */
export function productVerdict(ingredients: ProductIngredient[], aiCompatible: boolean | null): ProductVerdict {
  const hazards = Array.from(new Set(ingredients.map((i) => hazardOf(i.name)?.kind).filter(Boolean))) as HazardKind[];
  if (hazards.length > 0) {
    const list = hazards.map((k) => HAZARD_LABEL[k]);
    const joined = list.length > 1 ? `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}` : list[0];
    return {
      verdict: "avoid",
      title: "À éviter pour votre peau",
      text: `Contient ${joined}. ${hazards.length > 1 ? "Ils peuvent" : "Il peut"} aggraver vos taches et abîmer la peau.`,
      hazards,
    };
  }
  if (aiCompatible === false) {
    return { verdict: "avoid", title: "À éviter pour votre peau", text: "Certains ingrédients ne conviennent pas à votre type de peau.", hazards: [] };
  }
  return { verdict: "compatible", title: "Compatible", text: "Aucun ingrédient dangereux détecté dans la liste lue.", hazards: [] };
}

/** Nettoie la liste d'ingrédients renvoyée par l'IA et applique la détection. */
export function sanitizeIngredients(raw: unknown): ProductIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: any) => (typeof x === "string" ? { name: x } : x))
    .filter((x: any) => x && typeof x.name === "string" && x.name.trim())
    .slice(0, 40)
    .map((x: any) => {
      const name = String(x.name).trim().slice(0, 80);
      const h = hazardOf(name);
      if (h) return { name, why: h.why, risk: "danger" as const };
      const risk: IngredientRisk = x.risk === "caution" ? "caution" : "ok";
      return { name, why: String(x.why || "").trim().slice(0, 60), risk };
    });
}

export type ProductQuota = { isPremium: boolean; used: number; limit: number; remaining: number | null };

/** Libellé du compteur affiché sous le bouton de scan. */
export function quotaLabel(q?: ProductQuota | null): string {
  if (!q) return "";
  if (q.isPremium) return "Scans illimités avec Premium";
  const r = q.remaining ?? 0;
  return r > 0 ? `${r} scan${r > 1 ? "s" : ""} gratuit${r > 1 ? "s" : ""} restant${r > 1 ? "s" : ""} cette semaine` : "Plus de scan gratuit cette semaine";
}
