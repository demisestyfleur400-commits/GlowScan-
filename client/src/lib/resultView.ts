import type { AnalysisResult } from "@shared/schema";
import { catalog, formatPrice } from "@shared/catalog";
import {
  FACE_ZONES, STATE_LEVEL, faceZonesOf, levelWord, productsAllowed, resultStateOf,
  type FaceZoneKey, type FaceZones, type ResultStateKey, type ZoneStatus,
} from "@shared/resultB2C";

// ════════════════════════════════════════════════════════════════════════
// Modèle d'affichage du Résultat patient, partagé par l'écran (ResultB2C)
// et le compte rendu PDF (resultPdf) : les deux montrent exactement la même
// chose. Textes repris de RSTATES (maquette « GlowScan App »).
// ════════════════════════════════════════════════════════════════════════

/** Couleurs Organic en hex (le PDF est rendu hors du thème CSS). */
export const HEX = {
  bg: "#f5ead8", surface: "#ebddc5", text: "#201e1d",
  accent: "#c67139", accent100: "#fff2eb", accent200: "#ffe1d0", accent300: "#ffc6a5", accent700: "#8c491a", accent800: "#643312", accent900: "#402310",
  a2_100: "#f0fae1", a2_300: "#ccdbb2", a2_600: "#728157", a2_800: "#3d472b", a2_900: "#272e1b",
  n100: "#f9f4ed", n200: "#eee7db", n400: "#c0b6a5", n700: "#645c50", n800: "#474238", n900: "#2e2b25",
} as const;

export const ZONE_COLOR: Record<ZoneStatus, string> = { ok: HEX.a2_600, watch: HEX.accent300, med: HEX.accent, urgent: HEX.accent800 };
export const ZONE_UNSEEN = HEX.n400;
export const ZONE_WORD: Record<ZoneStatus, string> = { ok: "Saine", watch: "À surveiller", med: "Avis médical", urgent: "À examiner rapidement" };
const RANK: Record<ZoneStatus, number> = { ok: 0, watch: 1, med: 2, urgent: 3 };

type Cta = { label: string; to: string | "retake"; bg: string; fg: string };
export type StateCopy = {
  level: string; tag: "accent" | "accent-2" | "neutral"; ring: string;
  vBg: string; vFg: string; vTitle: string; vText: string;
  flags?: string[]; cta: Cta; cta2?: { label: string; to: string };
};

// Titre de « medical » généralisé (la maquette parlait de « ces taches »).
export const STATES: Record<ResultStateKey, StateCopy> = {
  good: {
    level: STATE_LEVEL.good, tag: "accent-2", ring: HEX.a2_600, vBg: HEX.a2_100, vFg: HEX.a2_900,
    vTitle: "Rien d'alarmant",
    vText: "Continuez votre routine. Prochaine analyse dans 4 semaines pour suivre l'évolution.",
    cta: { label: "Voir ma routine", to: "/routine", bg: HEX.a2_600, fg: HEX.bg },
  },
  watch: {
    level: STATE_LEVEL.watch, tag: "accent", ring: HEX.accent300, vBg: HEX.accent100, vFg: HEX.accent900,
    vTitle: "Quelques points à améliorer",
    vText: "Une routine adaptée devrait suffire. Si rien ne change en 6 semaines, consultez un dermatologue.",
    cta: { label: "Voir la routine conseillée", to: "/routine", bg: HEX.accent, fg: HEX.bg },
    cta2: { label: "Demander l'avis d'un dermatologue", to: "/dermatologues" },
  },
  medical: {
    level: STATE_LEVEL.medical, tag: "accent", ring: HEX.accent, vBg: HEX.accent100, vFg: HEX.accent900,
    vTitle: "Un dermatologue doit voir votre peau",
    vText: "Sous 60, GlowScan ne conseille aucun produit seul. Votre dossier est prêt : photos et historique partent au médecin.",
    cta: { label: "Consulter un dermatologue", to: "/dermatologues", bg: HEX.accent, fg: HEX.bg },
  },
  urgent: {
    level: STATE_LEVEL.urgent, tag: "accent", ring: HEX.accent800, vBg: HEX.accent800, vFg: HEX.n100,
    vTitle: "Faites-vous examiner rapidement",
    vText: "Ces signes ne veulent pas dire que c'est grave, mais un médecin doit les voir cette semaine.",
    cta: { label: "Avis urgent · réponse sous 2 h", to: "/dermatologues?urgent=1", bg: HEX.n100, fg: HEX.accent900 },
  },
  unusable: {
    level: "", tag: "neutral", ring: HEX.n400, vBg: HEX.surface, vFg: HEX.text,
    vTitle: "Reprenons cette photo",
    vText: "Pour un résultat fiable, les 3 photos doivent être nettes et bien éclairées.",
    flags: ["Face à une fenêtre, sans flash", "Sans maquillage ni crème", "Téléphone à hauteur du visage"],
    cta: { label: "Reprendre les photos", to: "retake", bg: HEX.accent, fg: HEX.bg },
    cta2: { label: "Envoyer quand même à un médecin", to: "/dermatologues" },
  },
};

export const WAIT_TIPS = [
  "Écran solaire chaque matin, c'est le geste le plus utile contre les taches",
  "N'utilisez aucun produit éclaircissant",
];

export const AREA_LABEL: Record<string, string> = { face: "Visage", body: "Corps", hair: "Cuir chevelu" };

/** « Peau mixte (…) · Fitzpatrick V » → { type: "Peau mixte", phototype: "V" } */
function parseSkinType(raw?: string | null) {
  const s = String(raw || "");
  const photo = s.match(/(?:fitzpatrick|phototype)\s*([IVX]+)\b/i)?.[1]?.toUpperCase() ?? null;
  const type = s.split("·")[0].split("(")[0].trim();
  return { type: type && !/non [ée]valu/i.test(type) ? type : null, phototype: photo };
}

/** Plus = plus marqué (taches, imperfections, sébum, sensibilité), sauf hydratation. */
function barColor(v: number, higherIsBetter = false): string {
  if (higherIsBetter) return v < 35 ? ZONE_COLOR.watch : ZONE_COLOR.ok;
  return v < 35 ? ZONE_COLOR.ok : v < 65 ? ZONE_COLOR.watch : ZONE_COLOR.med;
}

const from10 = (v: unknown) => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? null : Math.max(0, Math.min(100, Math.round(n * 10)));
};

export type ResultView = ReturnType<typeof buildResultView>;

export function buildResultView(result: AnalysisResult, area = "face") {
  const r = result as AnalysisResult & { photo_quality?: string | null };
  const state = resultStateOf(r);
  const copy = STATES[state];
  const usable = state !== "unusable";
  const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));

  const zones: FaceZones | null = area === "face" ? faceZonesOf(r) : null;
  const worstZone: FaceZoneKey = zones
    ? FACE_ZONES.reduce<FaceZoneKey>((best, z) => {
        const cur = zones[z.key]; const b = zones[best];
        return cur && (!b || RANK[cur.status] > RANK[b.status]) ? z.key : best;
      }, FACE_ZONES[0].key)
    : "front";

  const { type: skinType, phototype } = parseSkinType(r.skinType);

  // Observations : zones réellement signalées par l'analyse.
  const observations = zones
    ? FACE_ZONES.map((z, i) => ({ n: i + 1, z: zones[z.key], label: z.label }))
        .filter((o) => o.z && o.z.status !== "ok")
        .sort((a, b) => RANK[b.z!.status] - RANK[a.z!.status])
        .slice(0, 4)
        .map((o) => ({ n: o.n, text: o.z!.note || o.label, c: ZONE_COLOR[o.z!.status] }))
    : [];
  const evaluated = zones ? FACE_ZONES.filter((z) => zones[z.key]).length : 0;
  const affected = zones ? FACE_ZONES.filter((z) => zones[z.key] && zones[z.key]!.status !== "ok").length : 0;

  // Tuiles : uniquement des valeurs renvoyées par le modèle.
  const hydRaw = r.metrics && typeof r.metrics === "object" ? Math.round(Number(r.metrics.hydratation)) : NaN;
  const hydration = Number.isFinite(hydRaw) ? hydRaw : null;
  const tiles: [string, string][] = [];
  if (phototype) tiles.push(["Phototype", phototype]);
  if (skinType) tiles.push(["Type de peau", skinType]);
  if (state === "good" || state === "watch") {
    if (hydration !== null) tiles.push(["Hydratation", `${hydration} %`]);
  } else if (zones && evaluated > 0) {
    tiles.push(["Zones", `${affected} sur ${evaluated}`]);
  }

  // Barres : les 5 indicateurs, masqués s'ils n'ont pas été évalués.
  const bal = (r.balance ?? {}) as Partial<AnalysisResult["balance"]>;
  const bars = state === "urgent" || !usable ? [] : ([
    ["Taches", r.spots ?? null, false],
    ["Imperfections", r.blemishes ?? null, false],
    ["Sébum", from10(bal.sebum), false],
    ["Hydratation", hydration, true],
    ["Sensibilité", from10(bal.sensitivity), false],
  ] as [string, number | null, boolean][])
    .filter(([, v]) => v !== null)
    .map(([name, v, better]) => ({ name, v: v!, word: levelWord(v!), c: barColor(v!, better) }));

  // Produits : seulement en « bonne santé » et « à surveiller ».
  const products = productsAllowed(state)
    ? (r.recommendations?.products || [])
        .map((name) => catalog.find((p) => p.name === name || p.id === name))
        .filter((p): p is (typeof catalog)[number] => !!p)
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, description: p.description, image: p.image, price: typeof p.price === "number" ? formatPrice(p.price) : null }))
    : [];

  const delta = r.predictiveInsights?.progression?.delta;
  const deltaLabel = typeof delta === "number"
    ? `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta)} depuis la dernière analyse`
    : "";
  const title = String(r.condition || "").split("(")[0].trim();
  const flags = state === "urgent" ? (r.urgentSigns || []) : copy.flags || [];

  return {
    state, copy, usable, score, zones, worstZone, observations, tiles, bars, products,
    deltaLabel, title, flags, showObservations: state === "medical" || state === "urgent",
    showWaitTips: state === "medical",
  };
}

export function subtitleOf(area: string, createdAt?: string | Date | null, photoCount?: number) {
  const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  return [AREA_LABEL[area] || "Analyse", dateLabel, photoCount ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : null]
    .filter(Boolean).join(" · ");
}
