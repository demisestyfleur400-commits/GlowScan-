// ════════════════════════════════════════════════════════════════════════
// Résultat patient (B2C) — règles partagées serveur ↔ client.
// Source : design_handoff_glowscan/GlowScan App.dc.html (RSTATES, RZONES).
// Les seuils et la règle « sous 60 = aucun produit » ne vivent qu'ici.
// ════════════════════════════════════════════════════════════════════════

export const SCORE_GOOD = 75;   // ≥ 75 : Bonne santé
export const SCORE_WATCH = 60;  // 60–74 : À surveiller ; < 60 : Avis médical conseillé

/** Mention obligatoire, sous chaque résultat (écran, PDF, email). */
export const RESULT_DISCLAIMER =
  "Analyse indicative, calibrée sur les phototypes IV à VI. Elle ne pose pas de diagnostic et ne remplace pas un examen médical.";

/** Libellé de niveau affiché pour chaque état. */
export const STATE_LEVEL: Record<"good" | "watch" | "medical" | "urgent" | "unusable", string> = {
  good: "Bonne santé",
  watch: "À surveiller",
  medical: "Avis médical conseillé",
  urgent: "Examen rapide",
  unusable: "Photo inexploitable",
};

export type ResultStateKey = "good" | "watch" | "medical" | "urgent" | "unusable";
export type ZoneStatus = "ok" | "watch" | "med" | "urgent";
export type FaceZoneKey = "front" | "joue_droite" | "nez" | "joue_gauche" | "menton";

/** Une zone vaut null quand elle n'est pas visible sur les photos (pastille grise). */
export type FaceZones = Record<FaceZoneKey, { status: ZoneStatus; note: string } | null>;

/** Ordre et numérotation des pastilles sur la photo. Droite / gauche = celles du patient. */
export const FACE_ZONES: { key: FaceZoneKey; label: string; x: string; y: string }[] = [
  { key: "front", label: "Front", x: "50%", y: "20%" },
  { key: "joue_droite", label: "Joue droite", x: "27%", y: "50%" },
  { key: "nez", label: "Nez", x: "50%", y: "46%" },
  { key: "joue_gauche", label: "Joue gauche", x: "73%", y: "50%" },
  { key: "menton", label: "Menton", x: "50%", y: "74%" },
];

const ZONE_STATUSES: ZoneStatus[] = ["ok", "watch", "med", "urgent"];
const UNUSABLE_CONDITIONS = ["Image non exploitable", "Photo à reprendre", "Photo insuffisante"];

/** Sous 60 et en urgent : aucun produit n'est proposé. */
export function productsAllowed(state: ResultStateKey): boolean {
  return state === "good" || state === "watch";
}

export function resultStateOf(r: {
  score?: number | null;
  condition?: string | null;
  photo_quality?: string | null;
  urgent?: boolean | null;
}): ResultStateKey {
  if (UNUSABLE_CONDITIONS.includes(String(r.condition || "")) || /insuffis/i.test(String(r.photo_quality || ""))) return "unusable";
  // Score absent : aucun score n'est inventé, on redemande les photos.
  if (r.score === null || r.score === undefined || (r.score as unknown) === "" || !Number.isFinite(Number(r.score))) return "unusable";
  if (r.urgent === true) return "urgent";
  const s = Number(r.score);
  if (s >= SCORE_GOOD) return "good";
  if (s >= SCORE_WATCH) return "watch";
  return "medical";
}

// ── Zones ────────────────────────────────────────────────────────────────

/** Nettoie la sortie IA `faceZones`. Renvoie null si les 5 clés ne sont pas toutes présentes. */
export function sanitizeFaceZones(raw: any): FaceZones | null {
  if (!raw || typeof raw !== "object") return null;
  const out = {} as FaceZones;
  for (const { key } of FACE_ZONES) {
    if (!(key in raw)) return null;
    const z = raw[key];
    if (z === null) { out[key] = null; continue; }
    if (!z || typeof z !== "object" || !ZONE_STATUSES.includes(z.status)) return null;
    out[key] = { status: z.status, note: String(z.note || "").slice(0, 140) };
  }
  return out;
}

/**
 * Conversion de secours depuis l'ancien champ `zones` (anciens scans, ou réponse IA
 * sans les 5 clés) : « Joues » → les deux joues, « Zone T » → front et nez.
 * Une zone absente de la réponse reste null (non évaluée), jamais « ok » par défaut.
 */
export function faceZonesFromLegacy(zones: any): FaceZones | null {
  if (!Array.isArray(zones) || zones.length === 0) return null;
  const out: FaceZones = { front: null, joue_droite: null, nez: null, joue_gauche: null, menton: null };
  const rank: Record<ZoneStatus, number> = { ok: 0, watch: 1, med: 2, urgent: 3 };
  const put = (k: FaceZoneKey, status: ZoneStatus, note: string) => {
    const cur = out[k];
    if (!cur || rank[status] > rank[cur.status]) out[k] = { status, note };
  };
  for (const z of zones) {
    const name = String(z?.name ?? z?.zone ?? "").toLowerCase();
    const st = String(z?.status ?? "").toLowerCase();
    const status: ZoneStatus | null =
      st === "red" || /tr[èe]s affect/.test(st) ? "med"
      : st === "yellow" || /affect/.test(st) ? "watch"
      : st === "green" || /sain/.test(st) ? "ok"
      : null;
    if (!status) continue;
    const note = String(z?.issue ?? z?.findings ?? z?.short ?? "").slice(0, 140);
    if (/zone\s*t/.test(name)) { put("front", status, note); put("nez", status, note); continue; }
    if (/joue.*droite/.test(name)) { put("joue_droite", status, note); continue; }
    if (/joue.*gauche/.test(name)) { put("joue_gauche", status, note); continue; }
    if (/joue|pommette/.test(name)) { put("joue_droite", status, note); put("joue_gauche", status, note); continue; }
    if (/front/.test(name)) { put("front", status, note); continue; }
    if (/nez/.test(name)) { put("nez", status, note); continue; }
    if (/menton/.test(name)) put("menton", status, note);
  }
  return Object.values(out).some(Boolean) ? out : null;
}

export function faceZonesOf(r: { faceZones?: any; zones?: any }): FaceZones | null {
  return sanitizeFaceZones(r.faceZones) ?? faceZonesFromLegacy(r.zones);
}

// ── Indicateurs ──────────────────────────────────────────────────────────

/** Niveau d'un indicateur 0–100, identique pour les 5 barres. */
export function levelWord(v: number): "Faible" | "Moyen" | "Élevé" {
  return v < 35 ? "Faible" : v < 65 ? "Moyen" : "Élevé";
}

/** Nettoie une valeur 0–100 renvoyée par l'IA ; null si absente (barre masquée). */
export function score100OrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

/** Signes d'urgence renvoyés par l'IA (liste courte, textes simples). */
export function sanitizeUrgentSigns(v: any): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 5).map((x) => x.trim().slice(0, 120)) : [];
}
