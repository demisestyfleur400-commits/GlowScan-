import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DermBrand } from "@/components/pro/DermAuthShell";
import { PROFESSIONS, type Profession } from "@shared/relayOnboarding";
import { NETWORK_COUNTRIES } from "@shared/peer";

// ════════════════════════════════════════════════════════════════════════
// R1 · Rejoindre le réseau (maquette « Relais Mobile »). Trois façons d'entrer :
// lien d'un dermatologue, liste d'une ONG, inscription libre. Téléphone confirmé
// par code SMS ; carte professionnelle + selfie vérifiés par GlowScan.
// ════════════════════════════════════════════════════════════════════════

type Ctx = { kind: "derm" | "program" | "free"; inviter?: string; country?: string | null; parrain?: number; invitation?: string; expired?: boolean; prefill?: { phone?: string; name?: string; center?: string } };

async function compress(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  const data = await new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = data; });
  const s = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
  return d;
}

const field = "box-border h-12 w-full rounded-pill border border-organic-divider bg-organic-bg px-4 font-body text-[16px] text-organic-text outline-none focus:border-organic-accent";
const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-2 font-body text-[14px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-organic-neutral-700">{hint}</span>}
    </label>
  );
}

function PhotoPick({ label, sub, value, onPick, capture, testid }: { label: string; sub: string; value: string | null; onPick: (f: File) => void; capture: "environment" | "user"; testid: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <button type="button" onClick={() => ref.current?.click()} data-testid={testid}
      className={`flex min-h-[112px] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed p-3 font-body ${value ? "border-organic-accent-2-600 bg-organic-accent-2-100" : "border-organic-divider bg-organic-bg"}`}>
      {value ? <img src={value} alt="" className="h-16 w-24 rounded-xl object-cover" /> : <Camera size={22} />}
      <span className="text-[13px] font-bold">{label}</span>
      <span className="text-[11px] text-organic-neutral-700">{value ? "Photo envoyée ✓" : sub}</span>
      <input ref={ref} type="file" accept="image/*" capture={capture} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </button>
  );
}

export default function Rejoindre() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [f, setF] = useState({ fullName: "", phone: "", code: "", password: "", center: "", district: "", country: "Cameroun", orderNumber: "" });
  const [profession, setProfession] = useState<Profession | null>(null);
  const [front, setFront] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [codeSent, setCodeSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (params.get("invitation")) q.set("invitation", params.get("invitation")!);
    if (params.get("parrain")) q.set("parrain", params.get("parrain")!);
    fetch(`/api/rejoindre/context?${q}`).then((r) => r.json()).then((d: Ctx) => {
      setCtx(d);
      if (d.prefill) setF((x) => ({ ...x, phone: d.prefill?.phone ? `+${d.prefill.phone}` : x.phone, fullName: d.prefill?.name || x.fullName, center: d.prefill?.center || x.center }));
      if (d.country && NETWORK_COUNTRIES.includes(d.country)) setF((x) => ({ ...x, country: d.country! }));
    }).catch(() => setCtx({ kind: "free" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErr(""); };
  const sendCode = async () => {
    setBusy(true); setErr("");
    try { const d = await post("/api/rejoindre/code", { phone: f.phone }); setCodeSent(d.hint || "votre téléphone"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSent) return setErr("Confirmez d'abord votre téléphone avec le code SMS.");
    if (!profession) return setErr("Choisissez votre métier.");
    if (!front || !selfie) return setErr("Ajoutez la photo de votre carte et le selfie avec la carte.");
    if (f.password.length < 8) return setErr("Mot de passe trop court : 8 caractères minimum.");
    if (!consent) return setErr("Acceptez les conditions d'utilisation pour continuer.");
    setBusy(true); setErr("");
    try {
      await post("/api/rejoindre", {
        ...f, code: f.code.replace(/\D/g, ""), profession, cardFront: front, cardSelfie: selfie, consent: true,
        parrain: ctx?.parrain ?? null, invitation: ctx?.invitation ?? null,
      });
      setLocation("/derm/relais");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <header className="mx-auto flex max-w-[560px] items-center justify-between px-4 py-3.5"><DermBrand /></header>
      <main className="mx-auto flex max-w-[560px] flex-col gap-organic-4 px-4 pb-16">
        {ctx && ctx.kind !== "free" && ctx.inviter && (
          <div className="rounded-pill bg-organic-accent-2-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-2-800" data-testid="rejoindre-invite">
            Invitation {ctx.kind === "derm" ? "de" : "du programme"} {ctx.inviter}
          </div>
        )}
        {ctx?.expired && <div className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">Cette invitation a expiré. Vous pouvez vous inscrire librement.</div>}
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[clamp(30px,8vw,40px)]">Rejoindre GlowScan</h1>
          <p className="m-0 text-[14px] text-organic-neutral-800">3 façons d'entrer : lien d'un dermatologue, liste d'une ONG, inscription libre.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-organic-4 rounded-card bg-organic-surface p-organic-4 sm:p-organic-6">
          <Field label="Nom complet"><input className={field} value={f.fullName} onChange={set("fullName")} autoComplete="name" data-testid="rejoindre-name" /></Field>

          <Field label="Téléphone" hint="Avec l'indicatif du pays. Un code SMS le confirme.">
            <div className="flex gap-2">
              <input className={field} value={f.phone} onChange={(e) => { set("phone")(e); setCodeSent(null); }} inputMode="tel" autoComplete="tel" placeholder="+237 6XX XX XX XX" data-testid="rejoindre-phone" />
              <Button type="button" variant="secondary" onClick={sendCode} disabled={busy || f.phone.replace(/\D/g, "").length < 9} className="h-12 flex-none" data-testid="rejoindre-send-code">
                {codeSent ? "Renvoyer" : "Recevoir le code"}
              </Button>
            </div>
          </Field>
          {codeSent && (
            <Field label="Code SMS" hint={`Envoyé à ${codeSent}.`}>
              <input className={`${field} text-center tracking-[.4em]`} value={f.code} onChange={set("code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} data-testid="rejoindre-code" />
            </Field>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Métier</span>
            <div className="flex flex-wrap gap-1.5">
              {PROFESSIONS.map((p) => <button key={p.key} type="button" className={chip(profession === p.key)} onClick={() => setProfession(p.key)}>{p.label}</button>)}
            </div>
          </div>

          <Field label="Centre de santé"><input className={field} value={f.center} onChange={set("center")} placeholder="CSI de Mokolo" data-testid="rejoindre-center" /></Field>
          <div className="grid grid-cols-1 gap-organic-3 sm:grid-cols-2">
            <Field label="District (facultatif)"><input className={field} value={f.district} onChange={set("district")} /></Field>
            <Field label="Pays">
              <select className={field} value={f.country} onChange={set("country")} data-testid="rejoindre-country">
                {NETWORK_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex gap-organic-2">
              <PhotoPick label="Carte pro · recto" sub="Photo de la carte" value={front} capture="environment" testid="rejoindre-card"
                onPick={async (file) => setFront(await compress(file))} />
              <PhotoPick label="Selfie avec la carte" sub="Anti-usurpation" value={selfie} capture="user" testid="rejoindre-selfie"
                onPick={async (file) => setSelfie(await compress(file))} />
            </div>
            <span className="text-[12px] text-organic-neutral-700">Vérifiées par l'équipe GlowScan, jamais montrées à d'autres soignants.</span>
          </div>
          <Field label="N° d'ordre ou d'enregistrement (facultatif)" hint="Accélère la vérification.">
            <input className={field} value={f.orderNumber} onChange={set("orderNumber")} />
          </Field>
          <Field label="Mot de passe" hint="8 caractères minimum. Vous vous connecterez avec votre téléphone et un code SMS.">
            <input className={field} type="password" value={f.password} onChange={set("password")} autoComplete="new-password" data-testid="rejoindre-password" />
          </Field>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" data-testid="rejoindre-consent" />
            <span>J'accepte les <Link href="/derm/conditions" className="font-bold text-organic-accent-700">conditions d'utilisation</Link> et la politique de confidentialité.</span>
          </label>
          {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
          <Button type="submit" disabled={busy} className="h-12 text-[16px]" data-testid="rejoindre-submit"><Check size={18} /> Envoyer ma demande</Button>
        </form>
        <span className="text-center text-[13px]">Déjà inscrit ? <Link href="/derm/connexion" className="font-bold text-organic-accent-700">Se connecter</Link></span>
      </main>
    </div>
  );
}
