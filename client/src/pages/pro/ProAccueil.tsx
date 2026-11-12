import { useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check } from "lucide-react";
import { DermShell } from "@/components/derm/DermShell";
import { Page, ScreenHeader, Card, Btn, Input, Textarea, Chip, Tag, Label, Notice } from "@/components/derm/ui";
import { D, FONT_UI } from "@/components/derm/tokens";
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

  const name = [firstName, lastName].filter(Boolean).join(" ");
  const ready = waiting.filter((w) => w.intakeReady).length;
  const stepIdx = step === "identite" ? 0 : step === "photos" ? 1 : 2;

  return (
    <DermShell active="consultation" showBack>
      <Page>
        <ScreenHeader kicker="ACCUEIL DU CABINET" title="Nouveau patient"
          sub="Identité et motif, puis trois photos. L'analyse Glow se fait avant la consultation : le médecin trouve le dossier prêt." />

        <div className="grid items-start" style={{ gap: 18, gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,1fr)" }}>
          <Card style={{ padding: "22px 24px" }}>
            {/* Étapes */}
            <div className="flex" style={{ gap: 8, marginBottom: 18 }}>
              {["Identité et motif", "Photos", "Salle d'attente"].map((t, i) => (
                <span key={t} className="flex items-center" style={{ gap: 7, fontSize: 11.5, fontWeight: i === stepIdx ? 600 : 500, color: i <= stepIdx ? D.text : D.muted }}>
                  <span className="grid place-items-center" style={{ width: 20, height: 20, borderRadius: 999, background: i < stepIdx ? D.action : i === stepIdx ? D.text : D.sep, color: i <= stepIdx ? "#fff" : D.muted, fontSize: 10, fontWeight: 700 }}>
                    {i < stepIdx ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  {t}{i < 2 && <span style={{ width: 22, height: 1, background: D.border, marginLeft: 4 }} />}
                </span>
              ))}
            </div>

            {step === "identite" && (
              <div className="flex flex-col" style={{ gap: 14 }}>
                <div className="grid" style={{ gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                  <Label text="Prénom"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Samuel" data-testid="input-first-name" /></Label>
                  <Label text="Nom *"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Etoga" data-testid="input-last-name" /></Label>
                  <Label text="Âge"><Input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="34" data-testid="input-age" /></Label>
                  <Label text="WhatsApp (facultatif)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="6XX XXX XXX" data-testid="input-phone" /></Label>
                </div>
                <Label text="Sexe">
                  <span className="flex" style={{ gap: 6 }}>
                    {([["F", "Femme"], ["M", "Homme"]] as const).map(([k, l]) => <Chip key={k} on={sex === k} onClick={() => setSex(sex === k ? "" : k)}>{l}</Chip>)}
                  </span>
                </Label>
                <Label text="Motif de consultation *">
                  <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Depuis quand, où, ce qui aggrave…" data-testid="input-motif" />
                </Label>
                {err && <Notice tone="err">{err}</Notice>}
                <div className="flex justify-end"><Btn kind="primary" onClick={toPhotos} data-testid="button-to-photos">Suivant · Photos →</Btn></div>
              </div>
            )}

            {step === "photos" && (
              <div className="flex flex-col" style={{ gap: 14 }}>
                <div className="grid" style={{ gap: 10, gridTemplateColumns: "repeat(3,1fr)" }}>
                  {SLOTS.map((s) => {
                    const src = shots[s.key];
                    return (
                      <button key={s.key} type="button" onClick={() => inputs.current[s.key]?.click()} data-testid={`shot-${s.key}`}
                        className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden"
                        style={{ aspectRatio: "3/4", gap: 6, borderRadius: 10, border: src ? `2px solid ${D.action}` : `1.5px dashed ${D.borderAlt}`, background: src ? D.tintChip : D.field, color: D.muted, fontFamily: FONT_UI }}>
                        {src ? <img src={src} alt={s.label} className="absolute inset-0 h-full w-full object-cover" /> : <Camera size={24} strokeWidth={1.6} />}
                        <span className="relative z-10 inline-flex items-center" style={{ gap: 4, padding: "3px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: src ? D.action : "transparent", color: src ? "#fff" : D.text }}>
                          {src && <Check size={11} strokeWidth={3} />}{s.label}{s.key === "face" && !src ? " *" : ""}
                        </span>
                        <input ref={(el) => { inputs.current[s.key] = el; }} type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={(e) => { onFile(s.key, e.target.files?.[0]); e.target.value = ""; }} />
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: 11, color: D.muted }}>Lumière naturelle, sans flash, visage dégagé. Le portrait est obligatoire, les profils aident l'analyse.</span>
                <label className="flex cursor-pointer items-start" style={{ gap: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${consent ? "#9dc3a9" : D.border}`, background: consent ? D.tintActive : "#fff", fontSize: 11.5, color: D.text, lineHeight: 1.5 }}>
                  <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} className="mt-0.5 h-4 w-4 flex-none" style={{ accentColor: D.action }} data-testid="checkbox-photo-consent" />
                  Le patient accepte que ses photos soient jointes à son dossier médical.
                </label>
                {err && <Notice tone="err">{err}</Notice>}
                <div className="flex flex-wrap justify-between" style={{ gap: 10 }}>
                  <Btn kind="secondary" onClick={() => { setErr(""); setStep("identite"); }}>← Précédent</Btn>
                  <Btn kind="primary" onClick={submit} disabled={!shots.face} data-testid="button-submit-intake">
                    Analyser et envoyer en salle d'attente{shotCount ? ` (${shotCount} photo${shotCount > 1 ? "s" : ""})` : ""}
                  </Btn>
                </div>
              </div>
            )}

            {step === "analyse" && (
              <div className="flex flex-col items-center text-center" style={{ gap: 10, padding: "36px 0" }}>
                <span className="animate-pulse" style={{ width: 72, height: 72, borderRadius: 999, background: D.tint3 }} />
                <b style={{ fontSize: 17, fontWeight: 600 }}>Analyse Glow en cours…</b>
                <span style={{ fontSize: 12, color: D.muted }}>Le dossier de {name || "votre patient"} sera prêt pour le médecin dans un instant.</span>
              </div>
            )}

            {step === "fini" && (
              <div className="flex flex-col" style={{ gap: 12 }}>
                <span className="inline-flex items-center self-start" style={{ gap: 6 }}><Tag tone={outcome === "ready" ? "ok" : "warn"}>{outcome === "ready" ? "Dossier prêt" : "Analyse à lancer par le médecin"}</Tag></span>
                <b style={{ fontSize: 19, fontWeight: 600 }}>{name} est en salle d'attente.</b>
                <p style={{ margin: 0, fontSize: 12.5, color: D.muted, lineHeight: 1.6 }}>
                  {outcome === "ready"
                    ? "Le médecin trouvera l'analyse et les photos dans son dossier."
                    : "L'analyse n'a pas pu se faire maintenant : le médecin la lancera depuis le dossier. Les photos sont bien enregistrées."}
                </p>
                <Btn kind="primary" onClick={reset} style={{ alignSelf: "flex-start" }} data-testid="button-next-patient">Patient suivant</Btn>
              </div>
            )}
          </Card>

          {/* Salle d'attente */}
          <Card style={{ padding: "20px 20px" }}>
            <div className="flex items-baseline justify-between" style={{ gap: 10, marginBottom: 4 }}>
              <b style={{ fontSize: 15, fontWeight: 600 }}>Salle d'attente</b>
              <Tag tone={waiting.length ? "ok" : "muted"}>{waiting.length} patient{waiting.length > 1 ? "s" : ""}</Tag>
            </div>
            <span style={{ display: "block", fontSize: 11, color: D.muted, marginBottom: 12 }}>{waiting.length ? `${ready} dossier${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""} pour le médecin` : "Les patients enregistrés ici apparaissent dans la salle d'attente du médecin."}</span>
            {waiting.length === 0 && (
              <div style={{ padding: "18px 14px", borderRadius: 8, background: D.field, fontSize: 12, color: D.muted, textAlign: "center" }}>
                Pour l'instant, personne en attente. Enregistrez le prochain patient avec le formulaire.
              </div>
            )}
            <div className="flex flex-col" style={{ gap: 8 }}>
              {waiting.map((w) => {
                const inner = (
                  <>
                    <span className="grid flex-none place-items-center" style={{ width: 34, height: 34, borderRadius: 999, background: D.tintChip, color: D.actionDark, fontSize: 11, fontWeight: 700 }}>
                      {`${(w.firstName || "").trim()[0] || ""}${(w.lastName || "").trim()[0] || ""}`.toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{w.firstName} {w.lastName}</b>
                      <span style={{ fontSize: 10.5, color: D.muted }}>{[w.age ? `${w.age} ans` : null, w.createdAt ? `arrivé à ${hhmm(w.createdAt)}` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Tag tone={w.intakeReady ? "ok" : "draft"}>{w.intakeReady ? "Dossier prêt" : "À analyser"}</Tag>
                  </>
                );
                const st: React.CSSProperties = { gap: 10, padding: "9px 10px", borderRadius: 8, border: `1px solid ${D.border}`, background: "#fff", color: D.text, textDecoration: "none" };
                return isDoctor ? (
                  <Link key={w.id} href={w.intakeReady ? `/derm/patient/${w.id}` : `/derm/analyse?patient=${w.id}`} className="flex items-center" style={st}>{inner}</Link>
                ) : (
                  <div key={w.id} className="flex items-center" style={st}>{inner}</div>
                );
              })}
            </div>
          </Card>
        </div>
      </Page>
    </DermShell>
  );
}
