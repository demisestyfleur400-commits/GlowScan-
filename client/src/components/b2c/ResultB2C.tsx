import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { catalog, formatPrice } from "@shared/catalog";
import {
  FACE_ZONES, SCORE_GOOD, SCORE_WATCH, faceZonesOf, levelWord, productsAllowed, resultStateOf,
  type FaceZoneKey, type ResultStateKey, type ZoneStatus,
} from "@shared/resultB2C";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Résultat patient (refonte Organic) — maquette « GlowScan App » › Résultat.
// 5 états (RSTATES), 5 zones numérotées, échelle à seuils, indicateurs réels
// uniquement. Sous 60 et en urgent : aucun produit, seul CTA = dermatologue.
// ════════════════════════════════════════════════════════════════════════

export const RESULT_DISCLAIMER =
  "Analyse indicative, calibrée sur les phototypes IV à VI. Elle ne pose pas de diagnostic et ne remplace pas un examen médical.";

const ZC: Record<ZoneStatus, string> = {
  ok: "var(--color-accent-2-600)",
  watch: "var(--color-accent-300)",
  med: "var(--color-accent)",
  urgent: "var(--color-accent-800)",
};
const ZONE_UNSEEN = "var(--color-neutral-400)";
const RANK: Record<ZoneStatus, number> = { ok: 0, watch: 1, med: 2, urgent: 3 };

type Cta = { label: string; to: string | "retake"; bg: string; fg: string };
type StateCopy = {
  level: string; tag: "accent" | "accent-2" | "neutral"; ring: string;
  vBg: string; vFg: string; vTitle: string; vText: string;
  flags?: string[]; cta: Cta; cta2?: { label: string; to: string };
};

// Textes repris de RSTATES (maquette). Seul le titre de « medical » est généralisé :
// la maquette parle de « ces taches » parce que son exemple est un mélasma.
const STATES: Record<ResultStateKey, StateCopy> = {
  good: {
    level: "Bonne santé", tag: "accent-2", ring: "var(--color-accent-2-600)",
    vBg: "var(--color-accent-2-100)", vFg: "var(--color-accent-2-900)",
    vTitle: "Rien d'alarmant",
    vText: "Continuez votre routine. Prochaine analyse dans 4 semaines pour suivre l'évolution.",
    cta: { label: "Voir ma routine", to: "/routine", bg: "var(--color-accent-2-600)", fg: "var(--color-bg)" },
  },
  watch: {
    level: "À surveiller", tag: "accent", ring: "var(--color-accent-300)",
    vBg: "var(--color-accent-100)", vFg: "var(--color-accent-900)",
    vTitle: "Quelques points à améliorer",
    vText: "Une routine adaptée devrait suffire. Si rien ne change en 6 semaines, consultez un dermatologue.",
    cta: { label: "Voir la routine conseillée", to: "/routine", bg: "var(--color-accent)", fg: "var(--color-bg)" },
    cta2: { label: "Demander l'avis d'un dermatologue", to: "/dermatologues" },
  },
  medical: {
    level: "Avis médical conseillé", tag: "accent", ring: "var(--color-accent)",
    vBg: "var(--color-accent-100)", vFg: "var(--color-accent-900)",
    vTitle: "Un dermatologue doit voir votre peau",
    vText: "Sous 60, GlowScan ne conseille aucun produit seul. Votre dossier est prêt : photos et historique partent au médecin.",
    cta: { label: "Consulter un dermatologue", to: "/dermatologues", bg: "var(--color-accent)", fg: "var(--color-bg)" },
  },
  urgent: {
    level: "Examen rapide", tag: "accent", ring: "var(--color-accent-800)",
    vBg: "var(--color-accent-800)", vFg: "var(--color-neutral-100)",
    vTitle: "Faites-vous examiner rapidement",
    vText: "Ces signes ne veulent pas dire que c'est grave, mais un médecin doit les voir cette semaine.",
    cta: { label: "Avis urgent · réponse sous 2 h", to: "/dermatologues?urgent=1", bg: "var(--color-neutral-100)", fg: "var(--color-accent-900)" },
  },
  unusable: {
    level: "", tag: "neutral", ring: "var(--color-neutral-400)",
    vBg: "var(--color-surface)", vFg: "var(--color-text)",
    vTitle: "Reprenons cette photo",
    vText: "Pour un résultat fiable, les 3 photos doivent être nettes et bien éclairées.",
    flags: ["Face à une fenêtre, sans flash", "Sans maquillage ni crème", "Téléphone à hauteur du visage"],
    cta: { label: "Reprendre les photos", to: "retake", bg: "var(--color-accent)", fg: "var(--color-bg)" },
    cta2: { label: "Envoyer quand même à un médecin", to: "/dermatologues" },
  },
};

const WAIT_TIPS = [
  "Écran solaire chaque matin, c'est le geste le plus utile contre les taches",
  "N'utilisez aucun produit éclaircissant",
];

const TAG_CLS = {
  accent: "bg-organic-accent-100 text-organic-accent-800",
  "accent-2": "bg-organic-accent-2-100 text-organic-accent-2-800",
  neutral: "bg-organic-neutral-100 text-organic-neutral-800",
};

const AREA_LABEL: Record<string, string> = { face: "Visage", body: "Corps", hair: "Cuir chevelu" };

/** « Peau mixte (…) · Fitzpatrick V » → { type: "Peau mixte", phototype: "V" } */
function parseSkinType(raw?: string | null) {
  const s = String(raw || "");
  const photo = s.match(/(?:fitzpatrick|phototype)\s*([IVX]+)\b/i)?.[1]?.toUpperCase() ?? null;
  const type = s.split("·")[0].split("(")[0].trim();
  return { type: type && !/non [ée]valu/i.test(type) ? type : null, phototype: photo };
}

/** Couleur d'une barre 0–100 : plus = plus marqué (taches, imperfections, sébum, sensibilité). */
function barColor(v: number, higherIsBetter = false): string {
  if (higherIsBetter) return v < 35 ? ZC.watch : ZC.ok;
  return v < 35 ? ZC.ok : v < 65 ? ZC.watch : ZC.med;
}

const from10 = (v: unknown) => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? null : Math.max(0, Math.min(100, Math.round(n * 10)));
};

export type ResultB2CProps = {
  result: AnalysisResult;
  area?: string;
  imageUrl?: string | null;
  createdAt?: string | Date | null;
  photoCount?: number;
  onBack?: () => void;
  onRetake?: () => void;
};

export function ResultB2C({ result, area = "face", imageUrl, createdAt, photoCount, onBack, onRetake }: ResultB2CProps) {
  const [, setLocation] = useLocation();
  const r = result as AnalysisResult & { photo_quality?: string | null; faceZones?: any };

  const state = resultStateOf(r);
  const copy = STATES[state];
  const usable = state !== "unusable";
  const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));

  const zones = useMemo(() => (area === "face" ? faceZonesOf(r) : null), [r, area]);
  const worstZone = useMemo<FaceZoneKey>(() => {
    if (!zones) return "front";
    return FACE_ZONES.reduce<FaceZoneKey>((best, z) => {
      const cur = zones[z.key]; const b = zones[best];
      return cur && (!b || RANK[cur.status] > RANK[b.status]) ? z.key : best;
    }, FACE_ZONES[0].key);
  }, [zones]);
  const [selZone, setSelZone] = useState<FaceZoneKey | null>(null);
  const zoneKey = selZone ?? worstZone;
  const zoneInfo = zones?.[zoneKey] ?? null;
  const zoneLabel = FACE_ZONES.find((z) => z.key === zoneKey)!.label;

  const { type: skinType, phototype } = parseSkinType(r.skinType);

  // Observations : zones réellement signalées par l'analyse (pas d'hypothèses chiffrées).
  const observations = zones
    ? FACE_ZONES.map((z, i) => ({ n: i + 1, z: zones[z.key], label: z.label }))
        .filter((o) => o.z && o.z.status !== "ok")
        .sort((a, b) => RANK[b.z!.status] - RANK[a.z!.status])
        .slice(0, 4)
        .map((o) => ({ n: o.n, text: o.z!.note || o.label, c: ZC[o.z!.status] }))
    : [];
  const evaluated = zones ? FACE_ZONES.filter((z) => zones[z.key]).length : 0;
  const affected = zones ? FACE_ZONES.filter((z) => zones[z.key] && zones[z.key]!.status !== "ok").length : 0;

  // Tuiles : uniquement des valeurs renvoyées par le modèle.
  const hydration = r.metrics && typeof r.metrics === "object" ? Math.round(Number(r.metrics.hydratation)) : null;
  const tiles: [string, string][] = [];
  if (phototype) tiles.push(["Phototype", phototype]);
  if (skinType) tiles.push(["Type de peau", skinType]);
  if (state === "good" || state === "watch") {
    if (hydration !== null && Number.isFinite(hydration)) tiles.push(["Hydratation", `${hydration} %`]);
  } else if (zones && evaluated > 0) {
    tiles.push(["Zones", `${affected} sur ${evaluated}`]);
  }

  // Barres : les 5 indicateurs, masqués s'ils n'ont pas été évalués.
  const bal = (r.balance ?? {}) as Partial<AnalysisResult["balance"]>;
  const bars = state === "urgent" || !usable ? [] : ([
    ["Taches", r.spots ?? null, false],
    ["Imperfections", r.blemishes ?? null, false],
    ["Sébum", from10(bal.sebum), false],
    ["Hydratation", hydration !== null && Number.isFinite(hydration) ? hydration : null, true],
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
    : [];

  const delta = r.predictiveInsights?.progression?.delta;
  const deltaLabel = typeof delta === "number"
    ? `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta)} depuis la dernière analyse`
    : "";
  const title = String(r.condition || "").split("(")[0].trim();

  const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  const subtitle = [AREA_LABEL[area] || "Analyse", dateLabel, photoCount ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : null]
    .filter(Boolean).join(" · ");

  const go = (to: string | "retake") => {
    if (to === "retake") return onRetake ? onRetake() : setLocation("/analyze");
    setLocation(to);
  };

  const flags = state === "urgent" ? (r.urgentSigns || []) : copy.flags || [];

  return (
    <div className="flex flex-col gap-4 font-body text-organic-text">
      {/* En-tête */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Retour" className="border-0 bg-transparent p-0 pr-1 text-organic-accent-700">
            <ArrowLeft size={21} strokeWidth={1.75} />
          </button>
        )}
        <span className="flex flex-1 flex-col">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-neutral-700">Rapport d'analyse</span>
          <span className="text-[13px] font-bold">{subtitle}</span>
        </span>
      </div>

      {/* Photo + zones */}
      <div
        className="relative h-[230px] flex-none overflow-hidden rounded-lg bg-cover bg-center"
        style={{ backgroundColor: usable ? "#7a5234" : "#2a1c12", backgroundImage: usable && imageUrl ? `url(${imageUrl})` : undefined }}
      >
        {usable && zones && (
          <>
            {FACE_ZONES.map((z, i) => {
              const zi = zones[z.key];
              const on = z.key === zoneKey;
              return (
                <button
                  key={z.key}
                  type="button"
                  title={z.label}
                  aria-label={`${i + 1}. ${z.label}`}
                  onClick={() => setSelZone(z.key)}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-organic-neutral-100 p-0 text-[11px] font-bold text-organic-neutral-100"
                  style={{ left: z.x, top: z.y, width: on ? 30 : 24, height: on ? 30 : 24, background: zi ? ZC[zi.status] : ZONE_UNSEEN }}
                >
                  {i + 1}
                </button>
              );
            })}
            <span
              className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-pill px-3 py-2 text-[12px] text-organic-neutral-100"
              style={{ background: "color-mix(in srgb, var(--color-neutral-900) 78%, transparent)" }}
            >
              <span className="h-2.5 w-2.5 flex-none rounded-pill" style={{ background: zoneInfo ? ZC[zoneInfo.status] : ZONE_UNSEEN }} />
              <b className="whitespace-nowrap">{zoneLabel}</b>
              <span className="min-w-0 flex-1 truncate">
                {zoneInfo ? zoneInfo.note || "Rien de particulier" : "Zone non visible sur les photos"}
              </span>
            </span>
          </>
        )}
        {!usable && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-5 text-center text-organic-neutral-100">
            <b className="text-[16px]">Photo trop sombre ou floue</b>
            <span className="text-[12px]">Le visage n'est pas lisible : l'analyse serait fausse.</span>
          </span>
        )}
      </div>

      {usable && (
        <>
          {/* Score */}
          <div className="flex items-center gap-4">
            <span
              className="flex h-[88px] w-[88px] flex-none items-center justify-center rounded-pill"
              style={{ background: `conic-gradient(${copy.ring} ${score * 3.6}deg, var(--color-neutral-200) 0)` }}
            >
              <span className="flex h-[70px] w-[70px] flex-col items-center justify-center rounded-pill bg-organic-bg">
                <span className="font-heading text-[28px] leading-none">{score}</span>
                <span className="text-[10px] text-organic-neutral-700">Glow Score</span>
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn("self-start whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11px] tracking-[.02em]", TAG_CLS[copy.tag])}>{copy.level}</span>
              {title && <span className="font-heading text-[22px] leading-[1.15]">{title}</span>}
              {deltaLabel && <span className="text-[12px] font-bold text-organic-neutral-800">{deltaLabel}</span>}
            </span>
          </div>

          {/* Échelle à seuils */}
          <div className="flex flex-col gap-1.5">
            <div
              className="relative h-2.5 rounded-pill"
              style={{
                background: `linear-gradient(90deg, var(--color-accent-700) 0 40%, var(--color-accent-300) 40% ${SCORE_WATCH}%, var(--color-accent-2-300) ${SCORE_WATCH}% ${SCORE_GOOD}%, var(--color-accent-2-600) ${SCORE_GOOD}% 100%)`,
              }}
            >
              <span className="absolute -top-[5px] h-5 w-1 -translate-x-1/2 rounded-pill bg-organic-neutral-900" style={{ left: `${score}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-organic-neutral-700">
              <span>Urgent</span><span>Médecin</span><span>À surveiller</span><span>Bonne santé</span>
            </div>
          </div>
        </>
      )}

      {/* Verdict */}
      <div className="flex flex-col gap-2.5 rounded-lg p-4" style={{ background: copy.vBg, color: copy.vFg }}>
        <span className="text-[16px] font-bold">{copy.vTitle}</span>
        <span className="text-[13px] leading-normal">{copy.vText}</span>
        {flags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {flags.map((t) => (
              <span key={t} className="flex gap-2 text-[13px] font-semibold">
                <span className="mt-1.5 h-2 w-2 flex-none rounded-pill bg-current" />{t}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => go(copy.cta.to)}
          className="inline-flex items-center justify-center rounded-pill border-0 px-[18px] py-[13px] text-[14px] font-bold"
          style={{ background: copy.cta.bg, color: copy.cta.fg }}
        >
          {copy.cta.label}
        </button>
        {copy.cta2 && (
          <button
            type="button"
            onClick={() => go(copy.cta2!.to)}
            className="inline-flex items-center justify-center rounded-pill border-0 bg-transparent px-1 py-2 text-[14px] font-bold text-inherit hover:bg-organic-accent/10"
          >
            {copy.cta2.label}
          </button>
        )}
      </div>

      {/* Observations */}
      {(state === "medical" || state === "urgent") && observations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Ce que l'analyse a observé</span>
          {observations.map((o) => (
            <div key={o.n} className="flex items-center gap-2.5 rounded-pill bg-organic-surface px-3.5 py-2.5 text-[13px]">
              <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-pill text-[11px] font-bold text-organic-neutral-100" style={{ background: o.c }}>{o.n}</span>
              {o.text}
            </div>
          ))}
        </div>
      )}

      {/* Mesures */}
      {usable && tiles.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
          {tiles.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 rounded-[20px] bg-organic-surface p-3">
              <span className="text-[11px] text-organic-neutral-700">{k}</span>
              <span className="text-[15px] font-bold leading-tight">{v}</span>
            </div>
          ))}
        </div>
      )}
      {bars.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-lg bg-organic-surface p-4">
          {bars.map((b) => (
            <div key={b.name} className="flex flex-col gap-1">
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold">{b.name}</span>
                <span className="font-bold">{b.word}</span>
              </div>
              <div className="h-2 rounded-pill bg-organic-neutral-200">
                <div className="h-full rounded-pill" style={{ width: `${b.v}%`, background: b.c }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routine conseillée : jamais sous 60 ni en urgent */}
      {products.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Votre routine conseillée</span>
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg bg-organic-surface px-3 py-2.5">
              {p.image
                ? <img src={p.image} alt="" className="h-11 w-11 flex-none rounded-[14px] object-cover" />
                : <span className="h-11 w-11 flex-none rounded-[14px] bg-organic-accent-200" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-bold">{p.name}</span>
                <span className="truncate text-[11px] text-organic-accent-2-800">{p.description}</span>
              </span>
              {typeof p.price === "number" && <span className="whitespace-nowrap text-[12px] font-bold">{formatPrice(p.price)}</span>}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLocation("/shop")}
            className="inline-flex items-center justify-center rounded-pill border border-organic-divider bg-transparent px-4 py-2 text-[14px] font-bold hover:bg-organic-text/[.07]"
          >
            Ajouter à ma routine
          </button>
        </div>
      )}

      {state === "medical" && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">En attendant le médecin</span>
          {WAIT_TIPS.map((t) => (
            <span key={t} className="flex gap-2.5 text-[13px] leading-[1.45]">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-pill bg-organic-accent-2-600" />{t}
            </span>
          ))}
        </div>
      )}

      <span className="text-[11px] leading-normal text-organic-neutral-700">{RESULT_DISCLAIMER}</span>
    </div>
  );
}
