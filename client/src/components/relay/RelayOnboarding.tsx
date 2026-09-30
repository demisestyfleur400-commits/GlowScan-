import { useRef, useState } from "react";
import { Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoModule } from "@/components/relay/PhotoModule";
import { PHOTO_MODULE } from "@shared/relayOnboarding";

// ════════════════════════════════════════════════════════════════════════
// R2 · Vérification (maquette « Relais Mobile ») : téléphone confirmé,
// parrain, carte professionnelle (contrôle GlowScan sous 24 h), module photo.
// Les deux validations (carte + parrain) sont nécessaires avant le 1er cas.
// ════════════════════════════════════════════════════════════════════════

export type Onboarding = {
  status: string; profession: string; center: string | null; country: string | null; phoneVerified: boolean;
  card: { status: "pending" | "verified" | "rejected"; reason: string | null };
  sponsor: { type: "derm" | "program" | "glowscan"; name: string; country: string | null } | null;
  training: { passedAt: string | null; last: { score: number; total: number; passed: boolean } | null };
};

type Step = { done: boolean; title: string; sub: string; mark: string };

async function compress(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  const data = await new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = data; });
  const s = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

function CardRetry({ onDone }: { onDone: () => void }) {
  const [front, setFront] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fr = useRef<HTMLInputElement | null>(null), sr = useRef<HTMLInputElement | null>(null);
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/relay/onboarding/card", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardFront: front, cardSelfie: selfie }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const pick = (ref: React.MutableRefObject<HTMLInputElement | null>, label: string, v: string | null, set: (s: string) => void, capture: "environment" | "user") => (
    <button type="button" onClick={() => ref.current?.click()} className={`flex min-h-[90px] flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed p-2 font-body text-[13px] font-bold ${v ? "border-organic-accent-2-600 bg-organic-accent-2-100" : "border-organic-divider bg-organic-bg"}`}>
      {v ? <Check size={18} /> : <Camera size={18} />}{label}
      <input ref={ref} type="file" accept="image/*" capture={capture} className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set(await compress(f)); e.target.value = ""; }} />
    </button>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">{pick(fr, "Carte pro · recto", front, setFront, "environment")}{pick(sr, "Selfie avec la carte", selfie, setSelfie, "user")}</div>
      {err && <span role="alert" className="text-[13px] font-semibold text-organic-accent-900">{err}</span>}
      <Button onClick={send} disabled={busy || !front || !selfie} className="self-start">Renvoyer ma carte</Button>
    </div>
  );
}

export function RelayOnboarding({ o, onChange }: { o: Onboarding; onChange: () => void }) {
  const [moduleOpen, setModuleOpen] = useState(false);
  const steps: Step[] = [
    { done: o.phoneVerified, title: "Téléphone confirmé", sub: "Code SMS", mark: "1" },
    {
      done: !!o.sponsor,
      title: o.sponsor ? `Parrainé par ${o.sponsor.name}` : "Parrain à confirmer",
      sub: o.sponsor ? (o.sponsor.type === "derm" ? `Dermatologue vérifié${o.sponsor.country ? ` · ${o.sponsor.country}` : ""}` : o.sponsor.type === "program" ? "Programme ONG" : "Centre de santé vérifié par GlowScan") : "GlowScan appelle votre centre de santé",
      mark: "2",
    },
    {
      done: o.card.status === "verified",
      title: "Carte professionnelle",
      sub: o.card.status === "verified" ? "Vérifiée par GlowScan" : o.card.status === "rejected" ? `À reprendre : ${o.card.reason || ""}` : "Contrôle GlowScan sous 24 h",
      mark: "3",
    },
    {
      done: !!o.training.passedAt,
      title: "Module photo",
      sub: o.training.passedAt ? "Validé" : o.training.last ? `Dernier essai : ${o.training.last.score}/${o.training.last.total}` : `À faire · ${PHOTO_MODULE.minutes} minutes`,
      mark: "4",
    },
  ];

  return (
    <div className="flex flex-col gap-organic-4" data-testid="relay-onboarding">
      <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-4 sm:p-organic-6">
        <span className="font-heading text-[24px]">Votre compte</span>
        {steps.map((s) => (
          <div key={s.mark} className="flex items-center gap-3">
            <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[14px] font-bold ${s.done ? "bg-organic-accent-2-600 text-organic-bg" : "bg-organic-neutral-200 text-organic-text"}`}>
              {s.done ? <Check size={16} /> : s.mark === "3" && o.card.status === "pending" ? "…" : s.mark}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-bold">{s.title}</span>
              <span className={`text-[13px] ${s.mark === "3" && o.card.status === "rejected" ? "text-organic-accent-800" : "text-organic-neutral-700"}`}>{s.sub}</span>
            </span>
          </div>
        ))}
        {o.card.status === "rejected" && <CardRetry onDone={onChange} />}
        <div className="rounded-card bg-organic-bg p-organic-3 text-[13px] leading-normal">
          <b>Les deux validations sont nécessaires</b> : carte vérifiée par GlowScan <b>et</b> parrainage d'un dermatologue ou d'une ONG. Sans parrain, GlowScan appelle le centre de santé.
        </div>
        {!o.training.passedAt && !moduleOpen && (
          <Button onClick={() => setModuleOpen(true)} className="self-start" data-testid="relay-open-module">Commencer le module photo</Button>
        )}
        {o.training.passedAt && (
          <a href="/api/relay/training/photo/attestation" target="_blank" rel="noopener noreferrer" className="self-start text-[14px] font-bold text-organic-accent-700">Voir mon attestation</a>
        )}
      </div>
      {moduleOpen && <PhotoModule onPassed={onChange} />}
    </div>
  );
}
