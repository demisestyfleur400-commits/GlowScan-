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
export type TriageLevel = "urgence" | "orientation" | "routine";

export interface FiredRule {
  id: string;
  level: RuleLevel;
  triage?: TriageLevel; // impact triage (urgence / orientation)
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

// Texte agrégé (diagnostic + signaux d'alarme) pour la détection d'urgence.
const dangerText = (c: RuleContext) => lower((c.condition || "") + " " + (c.redFlags || []).join(" "));

const RULES: { id: string; level: RuleLevel; triage?: TriageLevel; label: string; action: string; test: (c: RuleContext) => boolean }[] = [
  // ── RÈGLES D'URGENCE (triage: urgence) ──
  {
    id: "melanome",
    level: "urgent", triage: "urgence",
    label: "Suspicion de lésion maligne (mélanome / carcinome)",
    action: "URGENCE — orientation dermatologique rapide pour dermatoscopie/biopsie. Ne pas temporiser.",
    test: (c) => /(mélanom|melanom|carcinome|abcde|naevus suspect|lésion suspecte|nodule qui saigne)/.test(dangerText(c)),
  },
  {
    id: "saignement-ulceration",
    level: "urgent", triage: "urgence",
    label: "Lésion qui saigne, s'ulcère ou se nécrose",
    action: "URGENCE — orientation rapide ; une lésion hémorragique/ulcérée doit être vue par un dermatologue.",
    test: (c) => /(saigne|saignement|ulcér|ulcere|nécros|necros|croûte hémorr)/.test(dangerText(c)),
  },
  {
    id: "extension-rapide",
    level: "urgent", triage: "urgence",
    label: "Évolution / extension rapide",
    action: "URGENCE relative — réévaluation rapprochée / orientation ; une progression rapide impose un avis spécialisé.",
    test: (c) => /(extension rapide|évolution rapide|evolution rapide|croissance rapide|s'étend|s'etend|progresse vite)/.test(dangerText(c)),
  },
  {
    id: "signes-systemiques",
    level: "urgent", triage: "urgence",
    label: "Signes systémiques associés (fièvre, atteinte muqueuse, décollement)",
    action: "URGENCE — évoquer une toxidermie grave / infection ; orientation immédiate.",
    test: (c) => /(fièvre|fievre|décollement|decollement|nikolsky|muqueuse|systémique|systemique|dress|lyell|stevens)/.test(dangerText(c)),
  },
  // ── RÈGLES IMPORTANTES / ORIENTATION ──
  {
    id: "toxic-product",
    level: "urgent", triage: "orientation",
    label: "Produit dépigmentant / corticoïde / mercure déclaré",
    action: "Arrêt du produit + information du patient sur les risques (ochronose, atrophie, néphrotoxicité).",
    test: (c) => detectToxicProducts(c.products).length > 0,
  },
  {
    id: "red-flags",
    level: "urgent", triage: "orientation",
    label: "Signaux d'alarme présents",
    action: "Orientation / réévaluation rapprochée — ne pas se limiter à un traitement local.",
    test: (c) => Array.isArray(c.redFlags) && c.redFlags.length > 0,
  },
  {
    id: "chronic-6m",
    level: "important", triage: "orientation",
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
    level: "important", triage: "orientation",
    label: "Sévérité élevée",
    action: "Suivi rapproché recommandé ; réévaluation à 4–6 semaines.",
    test: (c) => /sévère|severe/.test(lower(c.severity)) || (typeof c.score === "number" && c.score > 0 && c.score < 40),
  },
];

export function evaluateRules(ctx: RuleContext): FiredRule[] {
  return RULES.filter((r) => { try { return r.test(ctx); } catch { return false; } })
    .map(({ id, level, triage, label, action }) => ({ id, level, triage, label, action }));
}

export interface TriageResult {
  level: TriageLevel;
  label: string;      // libellé affiché
  color: string;      // couleur
  reason: string;     // pourquoi ce niveau
  rules: FiredRule[]; // règles déclenchées
}

// Classification de triage — Urgence / À orienter / Suivi standard.
// ⚠️ v1 à VALIDER par un clinicien (Dr Chiago) : les seuils et pathologies
// prioritaires doivent être revus/complétés par un dermatologue.
export function classifyTriage(ctx: RuleContext): TriageResult {
  const rules = evaluateRules(ctx);
  const hasUrgence = rules.some((r) => r.triage === "urgence");
  const hasOrientation = rules.some((r) => r.triage === "orientation");
  if (hasUrgence) {
    return { level: "urgence", label: "URGENCE — orientation rapide", color: "#dc2626",
      reason: "Un ou plusieurs signes nécessitent un avis dermatologique rapide.", rules };
  }
  if (hasOrientation) {
    return { level: "orientation", label: "À orienter vers un dermatologue", color: "#d97706",
      reason: "Le cas dépasse la prise en charge de première intention.", rules };
  }
  return { level: "routine", label: "Suivi standard", color: "#059669",
    reason: "Aucun signe d'alerte prioritaire détecté.", rules };
}
