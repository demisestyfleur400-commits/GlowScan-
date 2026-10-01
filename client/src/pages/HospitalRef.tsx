import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// Page publique de l'hôpital : /ref/REF-XXXX (étape 14b). Sans compte
// GlowScan : l'accueil saisit le code à 6 chiffres remis au patient, ce qui
// ouvre le dossier et les photos et confirme l'arrivée. L'hôpital peut ensuite
// déposer son compte rendu en PDF. Le code reste en mémoire de la page.
// ════════════════════════════════════════════════════════════════════════

type Head = { code: string; status: string; urgency: string; appointmentAt: string | null; hospital: { name: string; service: string | null; city: string | null } | null };
type Dossier = {
  code: string; status: string; urgency: string; patient: { age: number | null; sex: string | null }; zone: string | null; symptoms: string | null; photos: string[];
  relay: { name: string | null; center: string | null }; relayDiagnosis: string | null;
  derm: { name: string; onmc: string | null }; diagnosis: string | null; ddx: string | null; plan: string | null; orientation: string | null;
};
const toDataUrl = (f: File) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(f); });

export default function HospitalRef({ code }: { code: string }) {
  const [head, setHead] = useState<Head | null>(null);
  const [missing, setMissing] = useState(false);
  const [pin, setPin] = useState("");
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reportOk, setReportOk] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch(`/api/ref/${encodeURIComponent(code)}`).then(async (r) => (r.ok ? setHead(await r.json()) : setMissing(true))).catch(() => setMissing(true));
  }, [code]);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
    return d;
  };
  const open = async () => {
    setBusy(true); setErr("");
    try { setDossier(await post(`/api/ref/${encodeURIComponent(code)}/open`, { pin })); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const upload = async (f?: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") return setErr("Choisissez un fichier PDF.");
    if (f.size > 6_000_000) return setErr("PDF trop lourd (6 Mo au maximum).");
    setBusy(true); setErr("");
    try { await post(`/api/ref/${encodeURIComponent(code)}/report`, { pin, pdf: await toDataUrl(f) }); setReportOk(true); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-organic-bg px-4 py-10 font-body text-organic-text">
      <div className="mx-auto flex max-w-[640px] flex-col gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">GlowScan · Fiche de référence</span>
          <h1 className="m-0 text-[clamp(30px,7vw,40px)]">{code}</h1>
          {head?.hospital && <span className="text-[15px] font-semibold">{head.hospital.name}{head.hospital.service ? ` · ${head.hospital.service}` : ""}{head.hospital.city ? ` · ${head.hospital.city}` : ""}</span>}
          {head?.urgency === "urgent" && <span className="self-start rounded-pill bg-organic-accent-100 px-3 py-1 text-[12px] font-bold text-organic-accent-900">Orientation urgente</span>}
        </div>
        {missing && <div role="alert" className="rounded-card bg-organic-accent-100 p-organic-4 text-[14px] font-semibold text-organic-accent-900">Fiche inconnue. Vérifiez le code imprimé sur la fiche du patient.</div>}

        {head && !dossier && (
          <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
            <span className="text-[15px]">Saisissez le <b>code à 6 chiffres</b> présenté par le patient. Il ouvre le dossier et les photos, et confirme son arrivée.</span>
            <div className="flex gap-2">
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="off" aria-label="Code à 6 chiffres"
                className="box-border h-12 w-40 rounded-pill border border-organic-divider bg-organic-bg px-4 text-center font-body text-[20px] tracking-[.3em] outline-none focus:border-organic-accent" data-testid="ref-pin" />
              <Button onClick={open} disabled={busy || pin.length !== 6} className="h-12" data-testid="ref-open">Ouvrir le dossier</Button>
            </div>
            {err && <span role="alert" className="text-[13px] font-semibold text-organic-accent-900">{err}</span>}
          </div>
        )}

        {dossier && (
          <>
            <div className="rounded-pill bg-organic-accent-2-100 px-4 py-2.5 text-[14px] font-semibold text-organic-accent-2-800" data-testid="ref-arrived">✓ Arrivée du patient confirmée</div>
            <div className="flex flex-col gap-organic-2 rounded-card bg-organic-surface p-organic-6 text-[14px]">
              <span className="font-heading text-[22px]">Dossier</span>
              <span><b>Patient :</b> {[dossier.patient.sex === "F" ? "Femme" : dossier.patient.sex === "M" ? "Homme" : null, dossier.patient.age != null ? `${dossier.patient.age} ans` : null].filter(Boolean).join(", ") || "—"}{dossier.zone ? ` · ${dossier.zone}` : ""}</span>
              {dossier.symptoms && <span><b>Observé par le soignant :</b> {dossier.symptoms}</span>}
              <span><b>Orienté par :</b> {[dossier.relay.name, dossier.relay.center].filter(Boolean).join(", ") || "—"}</span>
              {dossier.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">{dossier.photos.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Photo ${i + 1}`} className="h-32 w-28 flex-none rounded-xl object-cover" /></a>)}</div>
              )}
              <span className="mt-2 font-heading text-[18px]">Avis du dermatologue</span>
              <span className="text-[13px] text-organic-neutral-700">{dossier.derm.name}{dossier.derm.onmc ? ` · ONMC ${dossier.derm.onmc}` : ""}</span>
              {dossier.diagnosis && <span><b>Diagnostic retenu :</b> {dossier.diagnosis}</span>}
              {dossier.ddx && <span><b>À écarter :</b> {dossier.ddx}</span>}
              {dossier.plan && <span className="whitespace-pre-wrap"><b>Conduite à tenir :</b> {dossier.plan}</span>}
              {dossier.orientation && <span><b>Orientation :</b> {dossier.orientation}</span>}
            </div>
            <div className="flex flex-col gap-organic-2 rounded-card bg-organic-surface p-organic-6">
              <span className="font-heading text-[20px]">Compte rendu de l'hôpital</span>
              {reportOk || dossier.status === "report_received"
                ? <span className="text-[14px] font-semibold text-organic-accent-2-800">✓ Compte rendu reçu. Merci : il est transmis au soignant et au dermatologue.</span>
                : <>
                    <span className="text-[13px]">Déposez votre compte rendu (PDF) : il est transmis au soignant et au dermatologue.</span>
                    <Button variant="secondary" className="self-start" onClick={() => fileRef.current?.click()} disabled={busy}>Déposer le compte rendu (PDF)</Button>
                    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
                  </>}
              {err && <span role="alert" className="text-[13px] font-semibold text-organic-accent-900">{err}</span>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
