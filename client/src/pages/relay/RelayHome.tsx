import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Coins, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProInput, LoadingScreen } from "@/components/ProLayout";
import { DermBrand } from "@/components/pro/DermAuthShell";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { asProProfile, proHomeOf } from "@shared/proProfile";
import { RELAY_TIERS, RELAY_LEVELS, RELAY_DISEASES, AUTONOMY_MIN_CASES, diseaseLabel, type RelayTier } from "@shared/relay";
import { splitRelay } from "@shared/splits";
import { formatF } from "@shared/delivery";
import { relayCaseRef, answeredIn, relayAnswer, type PhotoQuality } from "@shared/teleexpertise";
import { TeleexpertiseReport } from "@/components/pro/TeleexpertiseReport";
import { RelayOnboarding, type Onboarding } from "@/components/relay/RelayOnboarding";

// ════════════════════════════════════════════════════════════════════════
// Espace relais (infirmier / médecin d'un CSI) — maquette « Derm Reseau »,
// vue relais. Pensé pour le téléphone. Le relais propose SON diagnostic avant
// de voir l'IA ; le dermatologue référent confirme ou corrige, et sa correction
// devient la leçon du relais. Chiffres réels uniquement.
// ════════════════════════════════════════════════════════════════════════

type Me = {
  level: number; validatedCases: number; center: string | null; city: string | null;
  referent: { id: number; fullName: string; city?: string | null; cabinetName?: string | null } | null;
  programs: { id: number; name: string; share: boolean }[];
  progress: { code: string; label: string; cases: number; agreements: number; accuracy: number | null; autonomous: boolean }[];
};
type Case = {
  id: number; status: string; tier: RelayTier; price_fcfa: number; relay_diagnosis: string; relay_disease_code: string | null;
  ai_diagnosis: string | null; derm_verdict: "confirm" | "correct" | null; derm_diagnosis: string | null; derm_note: string | null;
  lesson_tip: string | null; derm_name: string | null; operator_txn_id: string | null; payment_status: string; created_at: string; answered_at: string | null;
  // Avis au format 1b (étape 9b)
  derm_disease_code: string | null; derm_onmc: string | null; derm_ddx: string | null; derm_plan: string | null; orientation: string | null;
  review_in: string | null; photo_quality: PhotoQuality | null; photos_sharp: number | null; relay_read_at: string | null; paid_at: string | null;
  patient_age: number | null; patient_sex: string | null; zone: string | null; symptoms: string | null; photos: string[];
};

const CONF: Record<string, string> = { high: "confiance élevée", medium: "confiance moyenne", low: "confiance faible" };
const STATUS: Record<string, string> = {
  awaiting_payment: "Paiement à confirmer",
  awaiting_review: "Chez le dermatologue",
  answered: "Validé",
  autonomous: "Traité seul",
  refund_due: "Délai dépassé · remboursement",
  refunded: "Remboursé",
};

async function compress(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  const data = await new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = data; });
  let { width, height } = img;
  if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
  else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  c.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return c.toDataURL("image/jpeg", quality);
}

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d?.message || "Erreur. Réessayez."), { code: d?.code });
  return d;
}

export default function RelayHome() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { logout } = useAuth();
  const { data: accData, isLoading: accLoading } = useProAccount();
  const acc: any = accData?.account;
  const isRelay = asProProfile(acc?.profile) === "relay";

  useEffect(() => {
    if (accLoading) return;
    if (!acc) setLocation(accData?.user?.role === "secretary" ? proHomeOf(null, "secretary") : "/derm/connexion");
    else if (!isRelay) setLocation(proHomeOf(acc.profile, "doctor"));
  }, [accLoading, acc, accData, isRelay, setLocation]);

  const { data: me } = useQuery<Me>({ queryKey: ["/api/relay/me"], enabled: isRelay });
  const { data: onb } = useQuery<Onboarding | { status: "missing" }>({ queryKey: ["/api/relay/onboarding"], enabled: isRelay });
  const { data: casesData } = useQuery<{ cases: Case[] }>({ queryKey: ["/api/relay/cases"], enabled: isRelay });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/relay/me"] }); qc.invalidateQueries({ queryKey: ["/api/relay/cases"] }); qc.invalidateQueries({ queryKey: ["/api/relay/onboarding"] }); };

  if (accLoading || !isRelay || !me || !onb) return <LoadingScreen />;
  // Étape 10 : tant que carte, parrain et module photo ne sont pas validés, écran R2.
  const onboarding = onb.status !== "missing" && onb.status !== "active" ? (onb as Onboarding) : null;

  const cases = casesData?.cases || [];
  const pending = cases.filter((c) => c.status !== "answered" && c.status !== "autonomous");
  const feedback = cases.filter((c) => c.status === "answered").slice(0, 6);
  const firstName = String(acc.fullName || "").replace(/^dr\.?\s+/i, "").split(/\s+/)[0];
  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <header className="mx-auto box-border flex w-full max-w-[1160px] items-center justify-between gap-3 px-4 py-3.5 md:px-organic-8">
        <DermBrand />
        <span className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => setLocation("/derm/portefeuille")} aria-label="Portefeuille" data-testid="relay-wallet">
            <Coins size={16} /><span className="hidden sm:inline">Portefeuille</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logout()} aria-label="Déconnexion">
            <LogOut size={16} /><span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </span>
      </header>
      <main className="mx-auto box-border flex w-full max-w-[1160px] flex-col gap-organic-6 px-4 pb-16 md:px-organic-8">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">
            {[me.center, me.city].filter(Boolean).join(" · ") || "Relais GlowScan"}
          </span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Bonjour {firstName}</h1>
          <p className="m-0 text-[15px] text-organic-neutral-700">Chaque cas que vous envoyez est validé par un dermatologue. Chaque validation vous apprend quelque chose.</p>
        </header>

        {onboarding ? (
          <RelayOnboarding o={onboarding} onChange={refresh} />
        ) : !me.referent ? (
          <ReferentPicker onDone={refresh} />
        ) : (
          <>
            <LevelCard me={me} />
            <section className="grid items-start gap-organic-4 lg:grid-cols-2">
              <NewCase me={me} onSent={refresh} />
              <div className={card}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="m-0 text-[22px]">Vos compétences</h3>
                  <span className="text-[12px] text-organic-neutral-700">accord avec le dermatologue</span>
                </div>
                {me.progress.length === 0 && <span className="text-[14px] text-organic-neutral-700">Vos premiers cas validés apparaîtront ici.</span>}
                {me.progress.map((k) => {
                  const acc = k.accuracy ?? 0;
                  const badge = k.autonomous ? "Autonome" : k.cases < 5 ? "Toujours valider" : `${acc} %`;
                  const tag = k.autonomous ? "bg-organic-accent-2-200 text-organic-accent-2-900" : k.cases < 5 ? "bg-organic-accent-200 text-organic-accent-900" : "bg-organic-neutral-200 text-organic-neutral-900";
                  return (
                    <div key={k.code} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[14px] font-semibold">{k.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[12px] text-organic-neutral-700">{k.cases} cas</span>
                          <span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${tag}`}>{badge}</span>
                        </span>
                      </div>
                      <div className="relative h-2 rounded-pill bg-organic-bg">
                        <div className="h-full rounded-pill" style={{ width: `${acc}%`, background: k.autonomous ? "var(--color-accent-2-600)" : acc < 60 ? "var(--color-accent)" : "var(--color-accent-300)" }} />
                        <span className="absolute -top-1 h-4 w-0.5 bg-organic-text" style={{ left: "85%" }} title="85 %" />
                      </div>
                    </div>
                  );
                })}
                <span className="text-[12px] text-organic-neutral-700">Au-delà du trait (85 % sur {AUTONOMY_MIN_CASES} cas), vous traitez seul. Un cas sur cinq reste contrôlé.</span>
              </div>
            </section>

            {me.programs.map((p) => <ShareToggle key={p.id} p={p} onChange={refresh} />)}

            {pending.length > 0 && (
              <div className={card}>
                <h3 className="m-0 text-[22px]">Vos cas en cours</h3>
                {pending.map((c) => <PendingCase key={c.id} c={c} onChange={refresh} />)}
              </div>
            )}

            <div className={card}>
              <h3 className="m-0 text-[22px]">Retours des dermatologues</h3>
              {feedback.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun retour pour l'instant.</span>}
              <div className="grid gap-organic-3 lg:grid-cols-2">
                {feedback.map((f) => {
                  const prog = me.progress.find((x) => x.code === f.derm_disease_code);
                  const dermLabel = f.derm_name ? `Dr ${String(f.derm_name).replace(/^dr\.?\s*/i, "")}` : "Le dermatologue";
                  return (
                    <TeleexpertiseReport key={f.id} r={{
                      caseRef: relayCaseRef(f.id),
                      from: `De ${dermLabel}${f.derm_onmc ? ` (ONMC ${f.derm_onmc})` : ""} à ${acc.fullName}${me.center ? `, ${me.center}` : ""}`,
                      answeredIn: answeredIn(f.paid_at || f.created_at, f.answered_at),
                      tags: [[f.patient_sex, f.patient_age != null ? `${f.patient_age} ans` : null].filter(Boolean).join(" · "), f.zone || "", "Anonymisé"],
                      question: [f.symptoms, `Je pense à ${f.relay_diagnosis.charAt(0).toLowerCase()}${f.relay_diagnosis.slice(1)}. Confirmez-vous ?`].filter(Boolean).join(" "),
                      answer: relayAnswer(f.derm_verdict, f.relay_diagnosis, f.derm_diagnosis),
                      requesterDx: f.relay_diagnosis,
                      finalDx: f.derm_diagnosis || f.relay_diagnosis,
                      corrected: f.derm_verdict === "correct",
                      ddx: f.derm_ddx, plan: f.derm_plan, orientation: f.orientation, reviewIn: f.review_in,
                      lesson: [f.lesson_tip, f.derm_note].filter(Boolean).join(" : ") || null,
                      photoQuality: f.photo_quality, photosSharp: f.photos_sharp, photosTotal: f.photos?.length || 0,
                      stat: prog && prog.cases > 0 ? `${prog.label} : ${prog.agreements}/${prog.cases} cas justes · ${Math.round((prog.agreements / prog.cases) * 100)} %` : null,
                    }} actions={f.relay_read_at
                      ? <span className="text-[12px] text-organic-neutral-700">Lu</span>
                      : <Button variant="secondary" size="sm" onClick={async () => { await fetch(`/api/relay/cases/${f.id}/read`, { method: "POST", credentials: "include" }).catch(() => {}); refresh(); }}>Marquer comme lu</Button>} />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ShareToggle({ p, onChange }: { p: Me["programs"][number]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try { await post(`/api/relay/programs/${p.id}/share`, { share: !p.share }); onChange(); } catch {} finally { setBusy(false); }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-card bg-organic-surface p-organic-4">
      <span className="flex flex-col">
        <span className="text-[14px] font-bold">Partager ma progression avec {p.name}</span>
        <span className="text-[12px] text-organic-neutral-700">Le programme voit votre niveau et votre accord avec le dermatologue. Jamais les patients.</span>
      </span>
      <button type="button" role="switch" aria-checked={p.share} aria-label="Partager ma progression" onClick={toggle} disabled={busy}
        className={`relative h-7 w-12 flex-none cursor-pointer rounded-pill border-0 transition-colors ${p.share ? "bg-organic-accent-2-600" : "bg-organic-neutral-400"}`}>
        <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-organic-neutral-100 transition-all ${p.share ? "left-[23px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
}

function LevelCard({ me }: { me: Me }) {
  const cur = me.level;
  const learning = me.progress.filter((p) => !p.autonomous).sort((a, b) => b.cases - a.cases)[0];
  const toNext = cur === 0 ? "Envoyez votre premier cas : il sera validé par votre dermatologue référent."
    : cur === 1 ? (learning ? `${learning.label} : ${learning.cases}/${AUTONOMY_MIN_CASES} cas${learning.accuracy != null ? `, ${learning.accuracy} % d'accord` : ""}. Autonome à 85 % sur ${AUTONOMY_MIN_CASES} cas.` : "Continuez à envoyer vos cas.")
    : cur === 2 ? `Autonome sur ${me.progress.filter((p) => p.autonomous).length} affection(s). Votre référent peut vous nommer Formateur.`
    : "Vous formez les nouveaux relais de votre région.";
  return (
    <div className="flex flex-col gap-organic-4 rounded-card bg-organic-surface p-organic-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Votre niveau</span>
          <span className="font-heading text-[26px] leading-tight">Niveau {cur + 1} · {RELAY_LEVELS[cur].name}</span>
        </div>
        <span className="max-w-[420px] text-[13px] text-organic-neutral-800">{toNext}</span>
      </div>
      <div className="grid gap-organic-2 sm:grid-cols-2 lg:grid-cols-4">
        {RELAY_LEVELS.map((l, i) => {
          const on = i === cur, dn = i < cur;
          return (
            <div key={l.name} className={`flex flex-col gap-1 rounded-card border-2 p-organic-3 ${on ? "border-organic-accent-2-600 bg-organic-accent-2-100" : dn ? "border-transparent bg-organic-bg" : "border-transparent bg-organic-bg text-organic-neutral-700"}`}>
              <span className="flex items-center gap-2 text-[14px] font-bold">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${dn || on ? "bg-organic-accent-2-600 text-organic-bg" : "bg-organic-neutral-200 text-organic-neutral-800"}`}>{dn ? "✓" : i + 1}</span>
                {l.name}
              </span>
              <span className="text-[12px] leading-snug">{l.rule}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReferentPicker({ onDone }: { onDone: () => void }) {
  const { data, isLoading } = useQuery<{ referents: { id: number; fullName: string; city?: string | null; cabinetName?: string | null }[] }>({ queryKey: ["/api/relay/referents"] });
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const choose = async (id: number) => {
    setBusy(id); setErr("");
    try { await post("/api/relay/referent", { dermId: id }); onDone(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
      <h3 className="m-0 text-[22px]">Choisissez votre dermatologue référent</h3>
      <p className="m-0 text-[14px] text-organic-neutral-800">Il valide vos cas et vous explique le signe qui compte. Vous pourrez en changer plus tard.</p>
      {isLoading && <span className="text-[14px] text-organic-neutral-700">Chargement…</span>}
      {!isLoading && !data?.referents.length && <span className="text-[14px] text-organic-neutral-700">Aucun dermatologue disponible pour le moment.</span>}
      {data?.referents.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-pill bg-organic-bg py-2 pl-2 pr-2">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[13px] font-bold text-organic-accent-2-800">
            {r.fullName.replace(/^dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-bold">Dr {r.fullName.replace(/^dr\.?\s*/i, "")}</span>
            <span className="truncate text-[12px] text-organic-neutral-700">{[r.cabinetName, r.city].filter(Boolean).join(" · ")}</span>
          </span>
          <Button onClick={() => choose(r.id)} isLoading={busy === r.id} disabled={busy != null} data-testid={`choose-referent-${r.id}`}>Choisir</Button>
        </div>
      ))}
      {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
    </div>
  );
}

function NewCase({ me, onSent }: { me: Me; onSent: () => void }) {
  const [step, setStep] = useState<"cas" | "hypothese" | "envoi" | "revelation">("cas");
  const [photos, setPhotos] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"F" | "M" | "">("");
  const [zone, setZone] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [code, setCode] = useState("");
  const [other, setOther] = useState("");
  const [tier, setTier] = useState<RelayTier>("simple");
  const [payer, setPayer] = useState<"patient" | "program">("patient");
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ status: string; priceFcfa: number; ai: string | null; conf: string | null; mine: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const hypothesis = code === "autre" ? other.trim() : diseaseLabel(code);
  const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;
  const reset = () => { setStep("cas"); setPhotos([]); setAge(""); setSex(""); setZone(""); setSymptoms(""); setCode(""); setOther(""); setTier("simple"); setPayer("patient"); setErr(""); setResult(null); };

  const addPhoto = async (f?: File | null) => {
    if (!f || !f.type.startsWith("image/") || photos.length >= 3) return;
    try { const b = await compress(f); setPhotos((p) => [...p, b].slice(0, 3)); setErr(""); } catch { setErr("Photo illisible. Reprenez-la."); }
  };

  const send = async () => {
    setErr(""); setStep("envoi");
    try {
      const d = await post("/api/relay/cases", {
        photos, patientAge: age ? parseInt(age, 10) : null, patientSex: sex || null, zone: zone.trim() || null, symptoms: symptoms.trim() || null,
        relayDiagnosis: hypothesis, relayDiseaseCode: code || "autre", tier, payer,
      });
      const caseId = d.case.id as number;
      // L'IA n'est lancée QU'APRÈS l'enregistrement de l'hypothèse.
      let ai: string | null = null, conf: string | null = null;
      try {
        const a = await fetch("/api/analyze", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photos[0], images: photos, area: "face", mode: "derm", intake: { motif: symptoms.trim() || undefined, age: age ? `${age} ans` : undefined, sexe: sex || undefined } }),
        });
        if (a.ok) {
          const r = await a.json();
          if (r?.savedScanId) {
            const at = await post(`/api/relay/cases/${caseId}/ai`, { scanId: r.savedScanId }).catch(() => null);
            ai = at?.aiDiagnosis ?? r.condition ?? null;
            conf = at?.aiConfidence ?? r.confidence ?? null;
          }
        }
      } catch {}
      setResult({ status: d.case.status, priceFcfa: d.case.priceFcfa, ai, conf, mine: hypothesis });
      setStep("revelation");
      onSent();
    } catch (e: any) {
      setErr(e.message);
      setStep("hypothese");
    }
  };

  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
  const phaseLabel = { cas: "1 · Le cas", hypothese: "2 · Votre hypothèse", envoi: "Envoi…", revelation: "3 · Comparaison" }[step];

  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-[22px]">Nouveau cas</h3>
        <span className="rounded-pill bg-organic-accent-200 px-2.5 py-1 text-[12px] font-semibold text-organic-accent-900">{phaseLabel}</span>
      </div>

      {step === "cas" && (
        <>
          <div className="grid grid-cols-3 gap-organic-2">
            {[0, 1, 2].map((i) => (
              <button key={i} type="button" onClick={() => fileRef.current?.click()} disabled={i > photos.length}
                className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border-2 font-body ${photos[i] ? "border-organic-accent-2-600" : "border-dashed border-organic-neutral-400 text-organic-neutral-700"} disabled:opacity-40`}
                data-testid={`relay-photo-${i}`}>
                {photos[i] ? <img src={photos[i]} alt={`Photo ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" /> : <Camera size={24} strokeWidth={1.75} />}
              </button>
            ))}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <span className="text-[12px] text-organic-neutral-700">Lumière naturelle, sans flash. Une photo de près, une de plus loin.</span>
          <div className="grid grid-cols-2 gap-organic-3">
            <ProInput label="Âge" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" testid="relay-age" />
            <ProInput label="Zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Cuir chevelu, bras…" testid="relay-zone" />
          </div>
          <div className="flex gap-1.5">
            {([["F", "Fille / femme"], ["M", "Garçon / homme"]] as const).map(([k, l]) => (
              <button key={k} type="button" className={chip(sex === k)} onClick={() => setSex(sex === k ? "" : k)}>{l}</button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Ce que vous observez</span>
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} placeholder="Depuis quand, démangeaisons, autres cas dans la famille…"
              className="min-h-[80px] resize-y rounded-2xl border border-organic-divider bg-organic-bg px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent" data-testid="relay-symptoms" />
          </label>
          {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
          <Button onClick={() => (photos.length ? setStep("hypothese") : setErr("Ajoutez au moins une photo."))} className="self-end" data-testid="relay-next">Suivant →</Button>
        </>
      )}

      {step === "hypothese" && (
        <>
          <span className="text-[14px] font-bold">Votre hypothèse, avant de voir l'IA :</span>
          <div className="flex flex-wrap gap-1.5">
            {RELAY_DISEASES.map((d) => (
              <button key={d.code} type="button" className={chip(code === d.code)} onClick={() => setCode(d.code)} data-testid={`relay-dx-${d.code}`}>{d.label}</button>
            ))}
          </div>
          {code === "autre" && <ProInput label="Votre diagnostic" value={other} onChange={(e) => setOther(e.target.value)} testid="relay-dx-other" />}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Avis demandé</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(RELAY_TIERS) as RelayTier[]).map((k) => (
                <button key={k} type="button" className={chip(tier === k)} onClick={() => setTier(k)}>
                  {RELAY_TIERS[k].label} · {formatF(RELAY_TIERS[k].priceFcfa)} · réponse sous {RELAY_TIERS[k].hours} h
                </button>
              ))}
            </div>
          </div>
          {me.programs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-organic-neutral-700">Qui paie ?</span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={chip(payer === "patient")} onClick={() => setPayer("patient")}>La patiente (Mobile Money)</button>
                <button type="button" className={chip(payer === "program")} onClick={() => setPayer("program")}>{me.programs[0].name}</button>
              </div>
            </div>
          )}
          <span className="text-[12px] text-organic-neutral-700">
            Sur {formatF(RELAY_TIERS[tier].priceFcfa)} : {formatF(splitRelay(RELAY_TIERS[tier].priceFcfa).derm)} pour le dermatologue, {formatF(splitRelay(RELAY_TIERS[tier].priceFcfa).relay)} pour vous, {formatF(splitRelay(RELAY_TIERS[tier].priceFcfa).platform)} pour GlowScan.
          </span>
          {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep("cas")}>← Précédent</Button>
            <Button onClick={send} disabled={!code || (code === "autre" && !other.trim())} data-testid="relay-send">Envoyer et voir l'IA</Button>
          </div>
        </>
      )}

      {step === "envoi" && (
        <div className="flex flex-col items-center gap-organic-3 py-organic-6 text-center">
          <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-organic-accent-2-300" />
          <span className="text-[14px] text-organic-neutral-700">Votre hypothèse est enregistrée. Analyse en cours…</span>
        </div>
      )}

      {step === "revelation" && result && (
        <>
          <div className="grid gap-organic-2 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5 rounded-card bg-organic-bg p-organic-3"><span className="text-[12px] text-organic-neutral-700">Vous</span><b className="text-[14px]">{result.mine}</b></div>
            <div className="flex flex-col gap-0.5 rounded-card bg-organic-bg p-organic-3">
              <span className="text-[12px] text-organic-neutral-700">IA GlowScan (indicative)</span>
              <b className="text-[14px]">{result.ai ? `${result.ai}${result.conf && CONF[result.conf] ? ` · ${CONF[result.conf]}` : ""}` : "Analyse indisponible"}</b>
            </div>
            <div className="flex flex-col gap-0.5 rounded-card bg-organic-bg p-organic-3">
              <span className="text-[12px] text-organic-neutral-700">{me.referent ? `Dr ${me.referent.fullName.replace(/^dr\.?\s*/i, "")} (référent)` : "Référent"}</span>
              <b className="text-[14px]">{result.status === "autonomous" ? "Non sollicité" : "En attente de sa réponse"}</b>
            </div>
          </div>
          <p className="m-0 text-[13px] text-organic-neutral-800">
            {result.status === "autonomous"
              ? "Vous maîtrisez cette affection : vous traitez ce cas seul."
              : result.status === "awaiting_payment"
                ? `Encaissez ${formatF(result.priceFcfa)} de la patiente par Mobile Money, puis saisissez l'ID de transaction dans « Vos cas en cours ».`
                : "Cas pris en charge par le programme : il sera transmis au dermatologue dès que GlowScan l'aura activé."}
          </p>
          <Button onClick={reset} className="self-start" data-testid="relay-next-case">Cas suivant</Button>
        </>
      )}
    </div>
  );
}

function PendingCase({ c, onChange }: { c: Case; onChange: () => void }) {
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const needsTxn = c.status === "awaiting_payment" && c.payment_status === "pending" && !c.operator_txn_id;
  const save = async () => {
    setBusy(true); setErr("");
    try { await post(`/api/relay/cases/${c.id}/payment`, { operatorTxnId: txn.trim() }); onChange(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2 rounded-card bg-organic-bg p-organic-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-bold">{c.relay_diagnosis}</span>
        <span className="rounded-pill bg-organic-neutral-200 px-2.5 py-0.5 text-[12px] font-semibold">
          {c.payment_status === "program_pending" ? "En attente d'activation (programme)"
            : c.status === "awaiting_payment" && c.operator_txn_id ? "Paiement en cours de vérification" : STATUS[c.status] || c.status}
        </span>
      </div>
      <span className="text-[12px] text-organic-neutral-700">
        {RELAY_TIERS[c.tier]?.label} · {formatF(c.price_fcfa)} · {new Date(c.created_at).toLocaleDateString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "short" })}
      </span>
      {needsTxn && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1"><ProInput label="ID de transaction Mobile Money" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="Ex. MP240930.1542.A12345" testid={`relay-txn-${c.id}`} /></div>
          <Button onClick={save} isLoading={busy} disabled={busy || txn.trim().length < 6}>Envoyer</Button>
        </div>
      )}
      {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
    </div>
  );
}
