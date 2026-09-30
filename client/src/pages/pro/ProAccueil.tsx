import { useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check } from "lucide-react";
import { ProLayout, ProInput } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { useProAccount, useProPendingPatients } from "@/hooks/use-pro";
import { cmNational } from "@shared/phone";

// ════════════════════════════════════════════════════════════════════════
// Accueil du cabinet (secrétaire ou infirmière) — README §4, point 3.
// Identité et motif, puis 3 photos prises depuis la tablette ou le téléphone.
// L'analyse IA tourne AVANT la consultation ; le patient passe ensuite en
// « Salle d'attente » avec son dossier prêt. La secrétaire ne valide jamais
// de diagnostic et ne voit ni portefeuille ni chiffres.
// ════════════════════════════════════════════════════════════════════════

type Slot = "face" | "right" | "left";
const SLOTS: { key: Slot; label: string }[] = [
  { key: "face", label: "Portrait" },
  { key: "right", label: "Profil D" },
  { key: "left", label: "Profil G" },
];

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

const TZ = "Africa/Douala";
const hhmm = (d?: string | null) => (d ? new Date(d).toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "");

export default function ProAccueil() {
  const qc = useQueryClient();
  const { data: accData } = useProAccount();
  const { data: waitingData } = useProPendingPatients();
  const [step, setStep] = useState<"identite" | "photos" | "analyse" | "fini">("identite");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"F" | "M" | "">("");
  const [phone, setPhone] = useState("");
  const [motif, setMotif] = useState("");
  const [consent, setConsent] = useState(false);
  const [shots, setShots] = useState<Partial<Record<Slot, string>>>({});
  const [err, setErr] = useState("");
  const [outcome, setOutcome] = useState<"ready" | "no_ai">("ready");
  const inputs = useRef<Partial<Record<Slot, HTMLInputElement | null>>>({});

  const isDoctor = !!accData?.account && accData?.user?.role !== "secretary";
  const waiting = (waitingData?.patients || []) as any[];
  const shotCount = SLOTS.filter((s) => shots[s.key]).length;

  const reset = () => {
    setStep("identite"); setFirstName(""); setLastName(""); setAge(""); setSex(""); setPhone(""); setMotif("");
    setConsent(false); setShots({}); setErr("");
  };

  const toPhotos = () => {
    if (!lastName.trim()) return setErr("Indiquez au moins le nom du patient.");
    if (phone.trim() && !cmNational(phone)) return setErr("Numéro WhatsApp invalide : 9 chiffres (6XX XXX XXX).");
    if (!motif.trim()) return setErr("Indiquez le motif de consultation.");
    setErr(""); setStep("photos");
  };

  const onFile = async (slot: Slot, f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    try { const b64 = await compress(f); setShots((s) => ({ ...s, [slot]: b64 })); setErr(""); }
    catch { setErr("Photo illisible. Reprenez-la."); }
  };

  const submit = async () => {
    if (!shots.face) return setErr("Le portrait est obligatoire.");
    if (!consent) return setErr("Le patient doit accepter que ses photos soient jointes à son dossier.");
    setErr(""); setStep("analyse");
    try {
      const r = await fetch("/api/pro/patients", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || "—", lastName: lastName.trim(), age: age ? parseInt(age, 10) : null,
          sex: sex || null, whatsappNumber: cmNational(phone) ? `237${cmNational(phone)}` : null,
          clinicalRecord: { motif: motif.trim(), source: "intake" },
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.patient?.id) throw new Error(d?.message || "Dossier non créé.");
      const pid = d.patient.id as number;
      const images = SLOTS.map((s) => shots[s.key]).filter(Boolean) as string[];
      let aiOk = false;
      try {
        const a = await fetch("/api/analyze", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: images[0], images, area: "face", mode: "derm",
            intake: { patientId: pid, motif: motif.trim(), age: age ? `${age} ans` : undefined, sexe: sex || undefined },
          }),
        });
        aiOk = a.ok;
      } catch {}
      // Dans tous les cas le dossier part en salle d'attente ; sans analyse, le médecin la lancera.
      await fetch(`/api/pro/patients/${pid}/submit-for-review`, { method: "POST", credentials: "include" }).catch(() => {});
      setOutcome(aiOk ? "ready" : "no_ai");
      qc.invalidateQueries({ queryKey: ["/api/pro/pending-patients"] });
      qc.invalidateQueries({ queryKey: ["/api/pro/patients"] });
      setStep("fini");
    } catch (e: any) {
      setErr(e.message || "Erreur réseau.");
      setStep("photos");
    }
  };

  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
  const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

  return (
    <ProLayout>
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">Accueil du cabinet</span>
        <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Nouveau patient</h1>
      </header>

      <section className="grid items-start gap-organic-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className={card}>
          {step === "identite" && (
            <>
              <h3 className="m-0 text-[22px]">Identité et motif</h3>
              <div className="grid grid-cols-1 gap-organic-3 sm:grid-cols-2">
                <ProInput label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Samuel" testid="input-first-name" />
                <ProInput label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Etoga" testid="input-last-name" />
                <ProInput label="Âge" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="34" testid="input-age" />
                <ProInput label="WhatsApp (facultatif)" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="6XX XXX XXX" testid="input-phone" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-organic-neutral-700">Sexe</span>
                <div className="flex gap-1.5">
                  {([["F", "Femme"], ["M", "Homme"]] as const).map(([k, l]) => (
                    <button key={k} type="button" className={chip(sex === k)} onClick={() => setSex(sex === k ? "" : k)}>{l}</button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-organic-neutral-700">Motif de consultation</span>
                <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Depuis quand, où, ce qui aggrave…"
                  className="min-h-[90px] resize-y rounded-2xl border border-organic-divider bg-organic-bg px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent"
                  data-testid="input-motif" />
              </label>
              {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
              <Button onClick={toPhotos} className="self-end" data-testid="button-to-photos">Suivant →</Button>
            </>
          )}

          {step === "photos" && (
            <>
              <h3 className="m-0 text-[22px]">Photos</h3>
              <div className="grid grid-cols-3 gap-organic-2">
                {SLOTS.map((s) => {
                  const src = shots[s.key];
                  return (
                    <button key={s.key} type="button" onClick={() => inputs.current[s.key]?.click()}
                      className={`relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 font-body ${src ? "border-organic-accent-2-600 bg-organic-accent-2-200 text-organic-accent-2-800" : "border-dashed border-organic-neutral-400 bg-transparent text-organic-neutral-700"}`}
                      data-testid={`shot-${s.key}`}>
                      {src ? <img src={src} alt={s.label} className="absolute inset-0 h-full w-full object-cover" /> : <Camera size={26} strokeWidth={1.75} />}
                      <span className={`relative z-10 rounded-pill px-2 py-0.5 text-[12px] font-bold ${src ? "bg-organic-accent-2-600 text-organic-bg" : ""}`}>
                        {src ? <span className="inline-flex items-center gap-1"><Check size={12} /> {s.label}</span> : s.label}
                      </span>
                      <input ref={(el) => { inputs.current[s.key] = el; }} type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={(e) => { onFile(s.key, e.target.files?.[0]); e.target.value = ""; }} />
                    </button>
                  );
                })}
              </div>
              <span className="text-[12px] text-organic-neutral-700">Lumière naturelle, sans flash, visage dégagé.</span>
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-organic-neutral-800">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" data-testid="checkbox-photo-consent" />
                Le patient accepte que ses photos soient jointes à son dossier médical.
              </label>
              {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="secondary" onClick={() => { setErr(""); setStep("identite"); }}>← Précédent</Button>
                <Button onClick={submit} disabled={!shots.face} data-testid="button-submit-intake">
                  Analyser et envoyer en salle d'attente{shotCount ? ` (${shotCount} photo${shotCount > 1 ? "s" : ""})` : ""}
                </Button>
              </div>
            </>
          )}

          {step === "analyse" && (
            <div className="flex flex-col items-center gap-organic-3 py-organic-8 text-center">
              <div className="h-[88px] w-[88px] animate-pulse rounded-full bg-organic-accent-2-300" />
              <span className="font-heading text-[20px]">Analyse en cours…</span>
              <span className="text-[13px] text-organic-neutral-700">Le dossier sera prêt pour le médecin dans un instant.</span>
            </div>
          )}

          {step === "fini" && (
            <div className="flex flex-col gap-organic-3">
              <span className="font-heading text-[24px]">{outcome === "ready" ? "Dossier prêt" : "Dossier envoyé"}</span>
              <p className="m-0 text-[14px] text-organic-neutral-800">
                {outcome === "ready"
                  ? `${[firstName, lastName].filter(Boolean).join(" ")} est en salle d'attente. Le médecin trouvera l'analyse et les photos dans son dossier.`
                  : `${[firstName, lastName].filter(Boolean).join(" ")} est en salle d'attente. L'analyse n'a pas pu se faire maintenant : le médecin la lancera.`}
              </p>
              <Button onClick={reset} className="self-start" data-testid="button-next-patient">Patient suivant</Button>
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-[22px]">Salle d'attente</h3>
            <span className="rounded-pill bg-organic-accent-200 px-2.5 py-1 text-[12px] font-semibold text-organic-accent-900">{waiting.length}</span>
          </div>
          {waiting.length === 0 && <span className="text-[14px] text-organic-neutral-700">Personne en attente.</span>}
          {waiting.map((w) => {
            const inner = (
              <>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-organic-accent-200 text-[12px] font-bold text-organic-accent-800">
                  {`${(w.firstName || "").trim()[0] || ""}${(w.lastName || "").trim()[0] || ""}`.toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-bold">{w.firstName} {w.lastName}</span>
                  <span className="text-[12px] text-organic-neutral-700">{[w.age ? `${w.age} ans` : null, w.createdAt ? `arrivé à ${hhmm(w.createdAt)}` : null].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={`flex-none rounded-pill px-2.5 py-1 text-[12px] font-semibold ${w.intakeReady ? "bg-organic-accent-2-200 text-organic-accent-2-900" : "bg-organic-neutral-200 text-organic-neutral-900"}`}>
                  {w.intakeReady ? "Dossier prêt" : "À analyser"}
                </span>
              </>
            );
            const cls = "flex items-center gap-3 rounded-pill bg-organic-bg py-2 pl-2 pr-3 text-organic-text no-underline";
            return isDoctor ? (
              <Link key={w.id} href={w.intakeReady ? `/derm/patient/${w.id}` : `/derm/analyse?patient=${w.id}`} className={cls}>{inner}</Link>
            ) : (
              <div key={w.id} className={cls}>{inner}</div>
            );
          })}
        </div>
      </section>
    </ProLayout>
  );
}
