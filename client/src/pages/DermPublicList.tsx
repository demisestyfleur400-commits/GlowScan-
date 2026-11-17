import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Star, Stethoscope } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useScans } from "@/hooks/use-scans";
import { SPECIALTY_LABEL } from "@shared/dermSpecialties";
import { formatF } from "@shared/delivery";
import { ensureDermFonts } from "@/components/derm/tokens";
import { cn } from "@/lib/utils";
import { trackFunnel } from "@/lib/analytics";

// ════════════════════════════════════════════════════════════════════════
// « Un avis expert » (nouvelle maquette B2C) puis la liste des dermatologues.
// Écran 1 : comment ça marche (bilan partagé, besoin, consultation). Écran 2 :
// filtre par spécialité, délai de réponse RÉEL (médiane, à partir de 3
// consultations), prix fixé par chaque médecin → « Réserver » (/dr/:slug), où
// le patient donne son accord de partage du dossier. ?urgent=1 : liste directe.
// ════════════════════════════════════════════════════════════════════════

type Derm = {
  id: number; fullName: string; city: string | null; price: number; slug: string | null;
  specialties: string[]; recommendedFor: boolean; rating: number; ratingsCount: number;
  responseHours: number | null; certified: boolean; photoUrl: string | null;
};

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", red: "#9b3a28" };
const initials = (n: string) => n.replace(/^(dr|pr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const drName = (n: string) => (/^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const STEPS: [string, string][] = [
  ["Partagez votre bilan", "Photos et observations de l'analyse, avec votre accord."],
  ["Décrivez votre besoin", "Symptômes, durée, gêne ressentie : trois questions suffisent."],
  ["Échangez avec le dermatologue", "Réponse écrite, conseils et compte rendu signé."],
];

export default function DermPublicList() {
  const [, setLocation] = useLocation();
  const { data: scans } = useScans();
  const [derms, setDerms] = useState<Derm[]>([]);
  const [recoLabel, setRecoLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [spec, setSpec] = useState<string>("all");
  const urgent = new URLSearchParams(window.location.search).get("urgent") === "1";
  // Analyse venue du résultat : elle suit jusqu'au profil du médecin.
  const fromScan = Number(new URLSearchParams(window.location.search).get("scan")) || null;
  const drQuery = (() => { const q = new URLSearchParams(); if (urgent) q.set("urgent", "1"); if (fromScan) q.set("scan", String(fromScan)); const s = q.toString(); return s ? `?${s}` : ""; })();
  // Venue d'un résultat (ou urgence) : liste directe, sans l'écran d'introduction.
  const direct = urgent || !!fromScan;
  const [view, setView] = useState<"intro" | "list">(direct ? "list" : "intro");
  // Liste vide : rappel dès qu'un dermatologue est disponible (accord explicite).
  const [cbPhone, setCbPhone] = useState("");
  const [cbConsent, setCbConsent] = useState(false);
  const [cbState, setCbState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const sendCallback = async () => {
    setCbState("busy");
    try {
      const r = await fetch("/api/derm-callback", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: cbPhone, consent: cbConsent }) });
      setCbState(r.ok ? "done" : "error");
    } catch { setCbState("error"); }
  };

  useSEO({
    title: "Dermatologues certifiés — Peaux africaines | GlowScan",
    description: "Trouvez un dermatologue spécialiste des peaux mélanisées (phototypes IV à VI). Consultation en ligne, paiement Mobile Money.",
    canonical: "https://glow-scan.com/dermatologues",
  });
  useEffect(() => { ensureDermFonts(); }, []);

  const lastCondition: string | null = Array.isArray(scans) && scans.length ? (scans[0] as any).condition || null : null;
  const load = () => {
    setLoading(true); setFailed(false);
    fetch(`/api/b2c/dermatologists${lastCondition ? `?condition=${encodeURIComponent(lastCondition)}` : ""}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setDerms(Array.isArray(d.dermatologists) ? d.dermatologists : []); setRecoLabel(d.recommendedLabel || null); })
      .catch(() => { setDerms([]); setFailed(true); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [lastCondition]); // eslint-disable-line react-hooks/exhaustive-deps

  const specs = useMemo(() => {
    const set = new Set<string>();
    derms.forEach((d) => d.specialties.forEach((s) => set.add(s)));
    return Array.from(set).filter((s) => SPECIALTY_LABEL[s]);
  }, [derms]);
  const list = derms.filter((d) => spec === "all" || d.specialties.includes(spec));
  const chip = (on: boolean) => cn("whitespace-nowrap rounded-pill border px-4 py-[9px] text-[14px] font-semibold", on ? "text-white" : "bg-white");
  // Mesure : liste affichée, avec le nombre de médecins (aucune donnée personnelle).
  useEffect(() => { if (view === "list" && !loading && !failed) trackFunnel("derm_list_view", derms.length); }, [view, loading, failed, derms.length]);
  // Un seul dermatologue disponible : on va directement sur son profil.
  useEffect(() => {
    if (view === "list" && !loading && !failed && spec === "all" && list.length === 1 && list[0].slug) {
      setLocation(`/dr/${list[0].slug}${drQuery}`, { replace: true });
    }
  }, [view, loading, failed, spec, list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const back = () => (view === "list" && !direct ? setView("intro") : window.history.length > 1 ? window.history.back() : setLocation("/consultations"));

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={back} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
            <ArrowLeft size={20} strokeWidth={1.9} />
          </button>
          <span className="flex-1 text-[16px] font-semibold">{view === "intro" ? "Un avis expert" : "Choisir un dermatologue"}</span>
        </div>

        {view === "intro" ? (
          <>
            <div className="flex flex-col gap-2.5">
              <span className="self-start rounded-pill px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em]" style={{ background: G.sage, color: G.dark }}>En lien avec GlowScan Derm</span>
              <h1 className="m-0 text-[26px] leading-[1.15]">L'IA vous guide.<br />L'expert vous accompagne.</h1>
              <p className="m-0 text-[15px] leading-relaxed" style={{ color: G.muted }}>Quand un avis médical est utile, passez le relais à un dermatologue du réseau.</p>
            </div>

            <div className="flex flex-col gap-3 rounded-[16px] p-4" style={{ background: G.sage }}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-white" style={{ color: G.dark }}><Stethoscope size={21} strokeWidth={1.7} /></span>
                <span className="flex flex-col">
                  <b className="text-[16px] font-semibold">Dermatologie</b>
                  <span className="text-[13px]" style={{ color: G.muted }}>Réseau GlowScan Derm · peaux noires et métissées</span>
                </span>
              </div>
              <span className="text-[14px] leading-relaxed" style={{ color: G.text }}>Votre demande est transmise à un dermatologue que vous choisissez, qui organise la suite de votre prise en charge.</span>
            </div>

            <div className="flex flex-col gap-3.5 rounded-[16px] border bg-white p-4" style={{ borderColor: G.line }}>
              {STEPS.map(([t, s], i) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-[14px] font-bold" style={{ background: G.sage, color: G.dark }}>{i + 1}</span>
                  <span className="flex flex-col">
                    <b className="text-[14.5px] font-semibold">{t}</b>
                    <span className="text-[13px] leading-snug" style={{ color: G.muted }}>{s}</span>
                  </span>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setView("list")} data-testid="expert-start"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white" style={{ background: G.dark }}>
              Choisir mon dermatologue <ArrowRight size={17} />
            </button>
            <span className="text-[12.5px] leading-relaxed" style={{ color: G.muted }}>
              Tarif fixé par chaque dermatologue et affiché avant le paiement. Ce service n'est pas destiné aux urgences : en cas de douleur forte, de fièvre ou d'aggravation rapide, rendez-vous à l'hôpital le plus proche.
            </span>
          </>
        ) : (
          <>
            {urgent && (
              <div className="rounded-[16px] p-4 text-[14px] leading-relaxed text-white" style={{ background: G.red }}>
                Choisissez un médecin qui répond vite : votre analyse demande un examen rapide.
              </div>
            )}
            {specs.length > 0 && (
              <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
                <button type="button" className={chip(spec === "all")} style={{ borderColor: spec === "all" ? G.dark : G.line, background: spec === "all" ? G.dark : undefined }} onClick={() => setSpec("all")}>Tous</button>
                {specs.map((s) => (
                  <button key={s} type="button" className={chip(spec === s)} style={{ borderColor: spec === s ? G.dark : G.line, background: spec === s ? G.dark : undefined }} onClick={() => setSpec(s)}>{SPECIALTY_LABEL[s]}</button>
                ))}
              </div>
            )}

            {loading ? (
              <span className="text-[14px]" style={{ color: G.muted }}>Chargement des dermatologues…</span>
            ) : failed ? (
              <div className="flex flex-col items-start gap-2 rounded-[16px] border bg-white p-4 text-[14px]" style={{ borderColor: G.line, color: G.muted }}>
                La liste n'a pas pu être chargée. Vérifiez votre connexion.
                <button type="button" onClick={load} className="rounded-[10px] border-0 px-4 py-2 text-[14px] font-semibold text-white" style={{ background: G.dark }}>Réessayer</button>
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-start gap-2 rounded-[16px] border bg-white p-4 text-[14px] leading-relaxed" style={{ borderColor: G.line, color: G.muted }}>
                {spec !== "all" ? (
                  <>
                    Pour l'instant, aucun dermatologue n'est disponible pour cette spécialité.
                    <button type="button" onClick={() => setSpec("all")} className="border-0 bg-transparent p-0 text-[14px] font-semibold" style={{ color: G.dark }}>Voir tous les dermatologues →</button>
                  </>
                ) : cbState === "done" ? (
                  <span style={{ color: G.text }}>C'est noté. Nous vous appelons dès qu'un dermatologue est disponible.</span>
                ) : (
                  <>
                    <span style={{ color: G.text }}>Pour l'instant, aucun dermatologue n'est disponible. Laissez votre numéro : nous vous appelons dès qu'un dermatologue l'est.</span>
                    <input type="tel" inputMode="tel" value={cbPhone} onChange={(e) => setCbPhone(e.target.value)} placeholder="677 12 45 90" aria-label="Votre numéro"
                      className="h-12 w-full rounded-[12px] border bg-white px-3.5 text-[15px] focus-visible:outline-none" style={{ borderColor: G.line, color: G.text }} />
                    <label className="flex items-start gap-2.5 text-[13.5px]" style={{ color: G.text }}>
                      <input type="checkbox" checked={cbConsent} onChange={(e) => setCbConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
                      J'accepte que GlowScan m'appelle à ce numéro pour me proposer un dermatologue.
                    </label>
                    {cbState === "error" && <span className="text-[13px]" style={{ color: G.red }}>Envoi impossible. Vérifiez le numéro et réessayez.</span>}
                    <button type="button" onClick={sendCallback} disabled={!cbConsent || cbPhone.replace(/\D/g, "").length < 9 || cbState === "busy"}
                      className="w-full rounded-[12px] border-0 p-3.5 text-[15px] font-semibold text-white disabled:opacity-45" style={{ background: G.dark }}>
                      {cbState === "busy" ? "Envoi…" : "Être rappelé"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              (urgent ? [...list].sort((a, b) => (a.responseHours ?? 999) - (b.responseHours ?? 999)) : list).map((d) => (
                <button key={d.id} type="button" disabled={!d.slug} onClick={() => d.slug && setLocation(`/dr/${d.slug}${drQuery}`)}
                  className="flex flex-col gap-3 rounded-[16px] border bg-white p-4 text-left disabled:opacity-60" style={{ borderColor: G.line, color: G.text }}>
                  <span className="flex items-center gap-3">
                    {d.photoUrl
                      ? <img src={d.photoUrl} alt="" className="h-12 w-12 flex-none rounded-[14px] object-cover" />
                      : <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] text-[15px] font-bold" style={{ background: G.sage, color: G.dark }}>{initials(d.fullName)}</span>}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15.5px] font-semibold">{drName(d.fullName)}</span>
                      <span className="text-[13px]" style={{ color: G.muted }}>
                        {d.city}
                        {d.ratingsCount > 0 && <span className="ml-1 inline-flex items-center gap-0.5">{d.city ? "· " : ""}<Star size={12} strokeWidth={1.75} fill="#d9a441" color="#d9a441" /> {String(d.rating).replace(".", ",")}</span>}
                      </span>
                    </span>
                    <span className="flex-none text-[15px] font-semibold">{formatF(d.price)}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {d.recommendedFor && recoLabel && <span className="rounded-pill px-2.5 py-[3px] text-[12px] font-semibold" style={{ background: G.sage, color: G.dark }}>Adapté à votre cas</span>}
                    {d.specialties.slice(0, 2).map((s) => SPECIALTY_LABEL[s] && <span key={s} className="rounded-pill px-2.5 py-[3px] text-[12px]" style={{ background: G.soft, color: G.muted }}>{SPECIALTY_LABEL[s]}</span>)}
                    {d.responseHours !== null && <span className="rounded-pill px-2.5 py-[3px] text-[12px]" style={{ background: "#f7e8dc", color: "#7a3f1d" }}>Répond en {d.responseHours} h environ</span>}
                  </span>
                  <span className="flex items-center gap-1 text-[14px] font-semibold" style={{ color: G.dark }}>Voir le profil et réserver <ArrowRight size={15} /></span>
                </button>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}
