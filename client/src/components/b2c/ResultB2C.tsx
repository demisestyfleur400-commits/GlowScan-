import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CircleAlert, Check } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";
import { FACE_ZONES, RESULT_DISCLAIMER, SCORE_GOOD, SCORE_WATCH, type FaceZoneKey } from "@shared/resultB2C";
import { HEX, WAIT_TIPS, ZONE_COLOR, ZONE_UNSEEN, buildResultView, subtitleOf } from "@/lib/resultView";
import { downloadResultPdf, resultPdfBase64 } from "@/lib/resultPdf";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Résultat patient (refonte Organic) — maquette « GlowScan App » › Résultat.
// Le calcul (état, zones, indicateurs, produits) vit dans lib/resultView,
// partagé avec le compte rendu PDF. Sous 60 et en urgent : aucun produit.
// ════════════════════════════════════════════════════════════════════════

// Palette de la nouvelle maquette B2C (blanc cassé, vert profond, sauge, pêche).
const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", peach: "#f7e8dc", peachFg: "#7a3f1d", red: "#9b3a28", redBg: "#f8e3dd" };
// Les couleurs calculées par lib/resultView (partagées avec le PDF) sont en
// palette Organic : on les traduit pour l'écran.
const RECOLOR: Record<string, string> = {
  [HEX.a2_600]: "#2a6b4f", [HEX.accent300]: "#d9a441", [HEX.accent]: "#c46a3a", [HEX.accent800]: G.red,
  [HEX.n400]: "#c9d3cc", [HEX.accent700]: "#c46a3a", [HEX.a2_300]: "#9db592",
};
const rc = (c: string) => RECOLOR[c] || c;
// Ton de la carte « avis » selon l'état du résultat.
const TONE = {
  good: { bg: G.sage, fg: G.dark, ring: "#2a6b4f" },
  watch: { bg: G.peach, fg: G.peachFg, ring: "#d9a441" },
  medical: { bg: G.peach, fg: G.peachFg, ring: "#c46a3a" },
  urgent: { bg: G.red, fg: "#ffffff", ring: G.red },
  unusable: { bg: "#ffffff", fg: G.text, ring: "#c9d3cc" },
} as const;
const HEADLINE: Record<string, [string, string]> = {
  good: ["Mieux comprendre,", "sans s'inquiéter."],
  watch: ["Mieux comprendre,", "sans s'inquiéter."],
  medical: ["Mieux comprendre,", "sans s'inquiéter."],
  urgent: ["Un examen rapide", "est conseillé."],
  unusable: ["Reprenons", "cette photo."],
};

export type ResultB2CProps = {
  result: AnalysisResult;
  area?: string;
  imageUrl?: string | null;
  createdAt?: string | Date | null;
  photoCount?: number;
  scanId?: number | null;
  /** Envoi automatique du compte rendu : à passer UNIQUEMENT si le patient a coché le consentement. */
  autoEmailTo?: string | null;
  /** Un numéro WhatsApp valide a été saisi : propose l'envoi du résultat sur demande. */
  whatsappAvailable?: boolean;
  onBack?: () => void;
  onRetake?: () => void;
};

export function ResultB2C({ result, area = "face", imageUrl, createdAt, photoCount, scanId, autoEmailTo, whatsappAvailable, onBack, onRetake }: ResultB2CProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  useEffect(() => { ensureDermFonts(); }, []);
  const v = useMemo(() => buildResultView(result, area), [result, area]);
  const { copy, usable, score, zones } = v;

  const [selZone, setSelZone] = useState<FaceZoneKey | null>(null);
  const zoneKey = selZone ?? v.worstZone;
  const zoneInfo = zones?.[zoneKey] ?? null;
  const zoneLabel = FACE_ZONES.find((z) => z.key === zoneKey)!.label;

  const pdfInput = { result, area, imageUrl, createdAt, photoCount, scanId };
  const [pdfBusy, setPdfBusy] = useState(false);
  const onPdf = async () => {
    setPdfBusy(true);
    try { await downloadResultPdf(pdfInput); }
    catch { toast({ title: "Téléchargement impossible", description: "Le compte rendu n'a pas pu être généré. Réessayez.", variant: "destructive" }); }
    finally { setPdfBusy(false); }
  };

  // Envoi automatique, une seule fois, jamais pour une photo inexploitable.
  // Le serveur revérifie : scan de cette session, consentement, un envoi par scan.
  const emailed = useRef(false);
  useEffect(() => {
    const email = (autoEmailTo || "").trim();
    if (emailed.current || !email.includes("@") || !scanId || !usable) return;
    emailed.current = true;
    const t = setTimeout(async () => {
      let pdfBase64 = "";
      try { pdfBase64 = await resultPdfBase64(pdfInput); } catch { /* l'email part quand même, sans pièce jointe */ }
      try {
        const res = await fetch("/api/scans/email-report", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ scanId, email, consent: true, pdfBase64: pdfBase64 || undefined }),
        });
        const d = await res.json().catch(() => ({}));
        if (d?.sent) toast({ title: "Compte rendu envoyé", description: `Il est dans votre boîte mail (${email}).` });
      } catch { /* silencieux : le bouton PDF reste disponible */ }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEmailTo, scanId, usable]);

  // Résultat sur WhatsApp, à la demande. Si Twilio ne peut pas écrire en premier
  // (modèle Meta non approuvé), on ouvre WhatsApp vers le numéro GlowScan avec un
  // message pré-rempli : le webhook répond alors avec le résultat.
  const [waState, setWaState] = useState<"idle" | "busy" | "sent">("idle");
  const onWhatsApp = async () => {
    if (!scanId) return;
    setWaState("busy");
    try {
      const res = await fetch(`/api/scans/${scanId}/whatsapp-result`, { method: "POST", credentials: "include" });
      const d = await res.json().catch(() => ({}));
      if (d?.sent || d?.already) { setWaState("sent"); toast({ title: "Résultat envoyé sur WhatsApp" }); return; }
      if (d?.fallback) { window.open(d.fallback, "_blank", "noopener"); setWaState("idle"); return; }
      toast({ title: "Envoi impossible", description: d?.message || "Réessayez dans un instant.", variant: "destructive" });
      setWaState("idle");
    } catch {
      toast({ title: "Envoi impossible", description: "Réessayez dans un instant.", variant: "destructive" });
      setWaState("idle");
    }
  };

  const go = (to: string | "retake") => {
    if (to === "retake") return onRetake ? onRetake() : setLocation("/analyze");
    setLocation(to);
  };
  const tone = TONE[v.state as keyof typeof TONE] ?? TONE.watch;
  const [h1a, h1b] = HEADLINE[v.state] ?? HEADLINE.watch;
  const card = "flex flex-col rounded-[16px] border bg-white p-4";

  return (
    <div className="flex flex-col gap-4 font-body" style={{ color: G.text }}>
      {/* En-tête */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
            <ArrowLeft size={20} strokeWidth={1.9} />
          </button>
        )}
        <span className="flex-1 text-[16px] font-semibold">Mon analyse</span>
        {usable && (
          <button type="button" onClick={onPdf} disabled={pdfBusy}
            className="whitespace-nowrap rounded-[10px] border bg-white px-3 py-1.5 text-[13px] font-semibold disabled:opacity-45"
            style={{ borderColor: G.line, color: G.dark }}>
            {pdfBusy ? "PDF…" : "Télécharger le PDF"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-pill px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em]" style={{ background: G.sage, color: G.dark }}>Analyse gratuite</span>
          <span className="text-[12.5px]" style={{ color: G.muted }}>{subtitleOf(area, createdAt, photoCount)}</span>
        </span>
        <h1 className="m-0 text-[30px] leading-[1.12]">{h1a}<br />{h1b}</h1>
      </div>

      {/* Glow Score */}
      {usable && (
        <div className={card} style={{ borderColor: G.line, gap: 14 }}>
          <div className="flex items-center gap-4">
            <span className="flex h-[78px] w-[78px] flex-none items-center justify-center rounded-pill"
              style={{ background: `conic-gradient(${tone.ring} ${score * 3.6}deg, ${G.soft} 0)` }}>
              <span className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-pill bg-white">
                <span className="font-heading text-[24px] font-bold leading-none">{score}</span>
                <span className="text-[10px]" style={{ color: G.muted }}>Glow Score</span>
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {copy.level && <span className="self-start whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: G.soft, color: G.dark }}>{copy.level}</span>}
              {v.title && <span className="font-heading text-[19px] font-bold leading-[1.2]">{v.title}</span>}
              {v.deltaLabel && <span className="text-[12.5px] font-semibold" style={{ color: G.muted }}>{v.deltaLabel}</span>}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="relative h-2 rounded-pill"
              style={{ background: `linear-gradient(90deg, ${G.red} 0 40%, #c46a3a 40% ${SCORE_WATCH}%, #d9a441 ${SCORE_WATCH}% ${SCORE_GOOD}%, #2a6b4f ${SCORE_GOOD}% 100%)` }}>
              <span className="absolute -top-[5px] h-[18px] w-1 -translate-x-1/2 rounded-pill" style={{ left: `${score}%`, background: G.text }} />
            </div>
            <div className="flex justify-between text-[10.5px]" style={{ color: G.muted }}>
              <span>Urgent</span><span>Médecin</span><span>À surveiller</span><span>Bonne santé</span>
            </div>
          </div>
        </div>
      )}

      {/* Photo + zones (masqué s'il n'y a pas de photo à montrer) */}
      {(!usable || imageUrl) && <div className="relative h-[230px] flex-none overflow-hidden rounded-[16px] bg-cover bg-center"
        style={{ backgroundColor: usable ? G.sage : "#1d2a25", backgroundImage: usable && imageUrl ? `url(${imageUrl})` : undefined }}>
        {usable && zones && (
          <>
            {FACE_ZONES.map((z, i) => {
              const zi = zones[z.key];
              const on = z.key === zoneKey;
              return (
                <button key={z.key} type="button" title={z.label} aria-label={`${i + 1}. ${z.label}`} onClick={() => setSelZone(z.key)}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-white p-0 text-[11px] font-bold text-white"
                  style={{ left: z.x, top: z.y, width: on ? 30 : 24, height: on ? 30 : 24, background: rc(zi ? ZONE_COLOR[zi.status] : ZONE_UNSEEN) }}>
                  {i + 1}
                </button>
              );
            })}
            <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] text-white" style={{ background: "rgba(22,64,52,.86)" }}>
              <span className="h-2.5 w-2.5 flex-none rounded-pill" style={{ background: rc(zoneInfo ? ZONE_COLOR[zoneInfo.status] : ZONE_UNSEEN) }} />
              <b className="whitespace-nowrap">{zoneLabel}</b>
              <span className="min-w-0 flex-1 truncate">{zoneInfo ? zoneInfo.note || "Rien de particulier" : "Zone non visible sur les photos"}</span>
            </span>
          </>
        )}
        {!usable && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-5 text-center text-white">
            <b className="text-[16px]">Photo trop sombre ou floue</b>
            <span className="text-[13px]">Le visage n'est pas lisible : l'analyse serait fausse.</span>
          </span>
        )}
      </div>}

      {/* Ce que l'IA a repéré */}
      {usable && (v.bars.length > 0 || v.tiles.length > 0 || (v.showObservations && v.observations.length > 0)) && (
        <div className={card} style={{ borderColor: G.line, gap: 12 }}>
          <b className="text-[15px] font-semibold">Ce que l'IA a repéré</b>
          {v.bars.map((b) => (
            <div key={b.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[14px]">
                <span>{b.name}</span>
                <span style={{ color: G.muted }}>{b.word}</span>
              </div>
              <div className="h-[5px] rounded-pill" style={{ background: G.soft }}>
                <div className="h-full rounded-pill" style={{ width: `${b.v}%`, background: G.dark }} />
              </div>
            </div>
          ))}
          {v.showObservations && v.observations.map((o) => (
            <div key={o.n} className="flex items-center gap-2.5 text-[14px]">
              <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-pill text-[11px] font-bold text-white" style={{ background: rc(o.c) }}>{o.n}</span>
              {o.text}
            </div>
          ))}
          {v.tiles.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(v.tiles.length, 3)}, minmax(0, 1fr))` }}>
              {v.tiles.map(([k, val]) => (
                <div key={k} className="flex flex-col gap-0.5 rounded-[10px] p-2.5" style={{ background: G.soft }}>
                  <span className="text-[11.5px]" style={{ color: G.muted }}>{k}</span>
                  <span className="text-[14px] font-semibold leading-tight">{val}</span>
                </div>
              ))}
            </div>
          )}
          <span className="text-[12px]" style={{ color: G.muted }}>Ces observations ne constituent pas un diagnostic.</span>
        </div>
      )}

      {/* Avis selon l'état */}
      <div className="flex flex-col gap-2 rounded-[16px] p-4" style={{ background: tone.bg, color: tone.fg }}>
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          {v.state === "good" ? <Check size={17} strokeWidth={2.2} /> : <CircleAlert size={17} strokeWidth={2} />}{copy.vTitle}
        </span>
        <span className="text-[14px] leading-relaxed">{copy.vText}</span>
        {v.flags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {v.flags.map((t) => (
              <span key={t} className="flex gap-2 text-[14px] font-medium"><span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-pill bg-current" />{t}</span>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={() => go(copy.cta.to)}
        className="inline-flex items-center justify-center gap-2 rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white"
        style={{ background: G.dark }}>
        {copy.cta.label} <ArrowRight size={17} />
      </button>
      {copy.cta2 && (
        <button type="button" onClick={() => go(copy.cta2!.to)}
          className="-mt-1 self-center border-0 bg-transparent px-2 py-1 text-[14px] font-semibold underline-offset-4 hover:underline" style={{ color: G.dark }}>
          {copy.cta2.label}
        </button>
      )}

      {/* Routine conseillée (jamais sous 60 ni en urgent) */}
      {v.products.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[16px] p-4" style={{ background: G.sage }}>
          <b className="text-[15px] font-semibold">Votre routine conseillée</b>
          {v.products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5">
              {p.image ? <img src={p.image} alt="" className="h-11 w-11 flex-none rounded-[10px] object-cover" /> : <span className="h-11 w-11 flex-none rounded-[10px]" style={{ background: G.soft }} />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-semibold">{p.name}</span>
                <span className="truncate text-[12px]" style={{ color: G.muted }}>{p.description}</span>
              </span>
              {p.price && <span className="whitespace-nowrap text-[13px] font-semibold">{p.price}</span>}
            </div>
          ))}
          <button type="button" onClick={() => setLocation("/shop")} className="self-start border-0 bg-transparent p-0 text-[14px] font-semibold" style={{ color: G.dark }}>
            Ajouter à ma routine →
          </button>
        </div>
      )}

      {/* En attendant le médecin : douceur */}
      {v.showWaitTips && (
        <div className="flex flex-col gap-2 rounded-[16px] p-4" style={{ background: G.sage }}>
          <b className="text-[15px] font-semibold">En attendant, misez sur la douceur.</b>
          {WAIT_TIPS.map((t) => (
            <span key={t} className="flex gap-2.5 text-[14px] leading-[1.5]" style={{ color: G.muted }}>
              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-pill" style={{ background: G.dark }} />{t}
            </span>
          ))}
          <button type="button" onClick={() => setLocation("/routine")} className="mt-1 self-start border-0 bg-transparent p-0 text-[14px] font-semibold" style={{ color: G.dark }}>
            Voir ma routine adaptée →
          </button>
        </div>
      )}

      {usable && whatsappAvailable && scanId && (
        <button type="button" onClick={onWhatsApp} disabled={waState !== "idle"}
          className="inline-flex items-center justify-center rounded-[12px] border bg-white px-4 py-3 text-[14px] font-semibold disabled:opacity-60"
          style={{ borderColor: G.line, color: G.dark }}>
          {waState === "sent" ? "Résultat envoyé sur WhatsApp" : waState === "busy" ? "Envoi…" : "Recevoir sur WhatsApp"}
        </button>
      )}

      <span className="text-[12px] leading-normal" style={{ color: G.muted }}>{RESULT_DISCLAIMER}</span>
    </div>
  );
}
