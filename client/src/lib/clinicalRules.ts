import { detectToxicProducts } from "@/lib/toxic-products";

// ════════════════════════════════════════════════════════════════════════
// Brique 3 — Protocoles cliniques en RÈGLES explicites (façon Norm Ai).
// Moteur déterministe : on encode des guidelines dermato en vérifications
// visibles. Le médecin VOIT quelles règles se sont déclenchées et pourquoi —
// pas un verdict opaque. Fiable (ne dépend pas des caprices de l'IA).
// ════════════════════════════════════════════════════════════════════════

export interface RuleContext {
  condition?: string;
  severity?: string;
  score?: number;
  redFlags?: string[];
  products?: string;        // produits déclarés
  durationText?: string;    // durée du problème (texte libre)
  phototype?: string;       // "IV" | "V" | "VI" ...
  keloidRisk?: string;      // "low" | "medium" | "high"
}

export type RuleLevel = "urgent" | "important" | "info";

export interface FiredRule {
  id: string;
  level: RuleLevel;
  label: string;   // la règle
  action: string;  // ce qu'elle impose
}

const lower = (s?: string) => (s || "").toLowerCase();

// Durée > 6 mois détectée dans un texte libre (ex. "8 mois", "2 ans", "1 an").
function isChronic(text?: string): boolean {
  const t = lower(text);
  if (/\b(an|ans|année)\b/.test(t)) return true;
  const m = t.match(/(\d+)\s*mois/);
  if (m && parseInt(m[1], 10) > 6) return true;
  return false;
}

const RULES: { id: string; level: RuleLevel; label: string; action: string; test: (c: RuleContext) => boolean }[] = [
  {
    id: "toxic-product",
    level: "urgent",
    label: "Produit dépigmentant / corticoïde / mercure déclaré",
    action: "Arrêt du produit + information du patient sur les risques (ochronose, atrophie, néphrotoxicité).",
    test: (c) => detectToxicProducts(c.products).length > 0,
  },
  {
    id: "red-flags",
    level: "urgent",
    label: "Signaux d'alarme présents",
    action: "Orientation / réévaluation rapprochée — ne pas se limiter à un traitement local.",
    test: (c) => Array.isArray(c.redFlags) && c.redFlags.length > 0,
  },
  {
    id: "chronic-6m",
    level: "important",
    label: "Évolution supérieure à 6 mois (chronicité)",
    action: "Envisager un bilan / une orientation dermatologique ; ne pas traiter comme une lésion aiguë.",
    test: (c) => isChronic(c.durationText),
  },
  {
    id: "keloid-risk",
    level: "important",
    label: "Risque chéloïde élevé (peau à fort phototype)",
    action: "Éviter les gestes agressifs (cryothérapie, laser abrasif, excision simple) sans précaution anti-récidive.",
    test: (c) => c.keloidRisk === "high" || (["V", "VI"].includes((c.phototype || "").toUpperCase()) && lower(c.condition).includes("chélo")),
  },
  {
    id: "hyperpigmentation-photo",
    level: "important",
    label: "Hyperpigmentation sur peau foncée",
    action: "Photoprotection stricte (SPF 50+) indispensable ; éviter l'hydroquinone non encadrée.",
    test: (c) => ["V", "VI"].includes((c.phototype || "").toUpperCase()) && /(hyperpigment|tache|pih|ochronose|mélasma|melasma)/.test(lower(c.condition)),
  },
  {
    id: "severe",
    level: "important",
    label: "Sévérité élevée",
    action: "Suivi rapproché recommandé ; réévaluation à 4–6 semaines.",
    test: (c) => /sévère|severe/.test(lower(c.severity)) || (typeof c.score === "number" && c.score > 0 && c.score < 40),
  },
];

export function evaluateRules(ctx: RuleContext): FiredRule[] {
  return RULES.filter((r) => { try { return r.test(ctx); } catch { return false; } })
    .map(({ id, level, label, action }) => ({ id, level, label, action }));
}
