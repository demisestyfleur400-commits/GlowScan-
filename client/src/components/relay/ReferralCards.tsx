import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// R7 · Orientation vers l'hôpital (maquette « Relais Mobile »). Fiche REF-XXXX,
// hôpital proposé, rendez-vous, code à montrer à l'accueil, suivi, « Renvoyer
// la fiche par SMS ».
// ════════════════════════════════════════════════════════════════════════

type Ref = {
  id: number; code: string; case_id: number; urgency: string; arrival_code: string; appointment_at: string | null; status: string;
  created_at: string; arrived_at: string | null; report_at: string | null; patient_sms_at: string | null;
  patient_age: number | null; patient_sex: string | null; derm_diagnosis: string | null; relay_diagnosis: string | null;
  derm_name: string | null; hospital: string | null; service: string | null; hospital_city: string | null;
};
const d = (v: string | null) => (v ? new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Douala" }) : "");

function Card({ r, onChange }: { r: Ref; onChange: () => void }) {
  const [phone, setPhone] = useState("");
  const [appt, setAppt] = useState("");
  const [msg, setMsg] = useState("");
  const post = async (url: string, body: unknown) => {
    setMsg("");
    const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j?.message || "Erreur. Réessayez."); return null; }
    return j;
  };
  const steps = [
    { done: true, label: `Orientée par le CDS · ${d(r.created_at)}` },
    { done: !!r.arrived_at, label: r.arrived_at ? `Arrivée à l'hôpital · ${d(r.arrived_at)}` : "Arrivée à l'hôpital" },
    { done: !!r.report_at, label: r.report_at ? `Compte rendu de l'hôpital · ${d(r.report_at)}` : "Compte rendu de l'hôpital · relance auto à J+10" },
  ];
  const who = [r.patient_sex === "F" ? "femme" : r.patient_sex === "M" ? "homme" : null, r.patient_age != null ? `${r.patient_age} ans` : null].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-bg p-organic-4" data-testid={`referral-${r.id}`}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-bold">Cas #B-{r.case_id}{who ? ` · ${who}` : ""}</span>
        {r.status === "referred" && <span className="text-[12px] font-semibold text-organic-accent-800">{r.urgency === "urgent" ? "Orientation urgente" : "À orienter sous 7 jours"}</span>}
        {r.derm_name && <span className="text-[13px]">Avis de Dr {String(r.derm_name).replace(/^(dr|pr)\.?\s+/i, "")} : {r.derm_diagnosis || r.relay_diagnosis}</span>}
      </div>
      <div className="flex flex-col gap-1 rounded-card bg-organic-surface p-organic-3">
        <span className="text-[11px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Fiche de référence</span>
        <span className="font-heading text-[26px] leading-none">{r.code}</span>
        <span className="text-[14px] font-bold">{r.hospital || "Hôpital à confirmer par GlowScan"}</span>
        {r.hospital && <span className="text-[12px] text-organic-neutral-700">{r.service || "Dermatologie"} · 1er hôpital proposé selon la distance</span>}
        {r.appointment_at && <span className="text-[13px]">RDV {new Date(r.appointment_at).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" })}</span>}
        <span className="mt-1 text-[12px] text-organic-neutral-700">Code à montrer à l'accueil de l'hôpital : il ouvre le dossier et les photos</span>
        <span className="font-heading text-[24px] tracking-[.2em]">{r.arrival_code}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-bold">Suivi</span>
        {steps.map((s) => <span key={s.label} className={`text-[13px] ${s.done ? "" : "text-organic-neutral-700"}`}>{s.done ? "✓" : "○"} {s.label}</span>)}
      </div>
      {r.report_at && <a href={`/api/referrals/${r.id}/report`} target="_blank" rel="noopener noreferrer" className="self-start text-[13px] font-bold text-organic-accent-700">Lire le compte rendu de l'hôpital</a>}
      {r.status === "referred" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[12px] text-organic-neutral-700">Rendez-vous
            <input type="datetime-local" value={appt} onChange={(e) => setAppt(e.target.value)} className="h-10 rounded-pill border border-organic-divider bg-organic-surface px-3 font-body text-[13px]" />
          </label>
          <Button size="sm" variant="secondary" disabled={!appt} onClick={async () => { if (await post(`/api/relay/referrals/${r.id}/appointment`, { at: new Date(appt).toISOString() })) { setAppt(""); onChange(); } }}>Enregistrer le RDV</Button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        {!r.patient_sms_at && (
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Téléphone du patient"
            className="box-border h-10 min-w-0 flex-1 rounded-pill border border-organic-divider bg-organic-surface px-3 font-body text-[13px]" />
        )}
        <Button size="sm" onClick={async () => { const j = await post(`/api/relay/referrals/${r.id}/sms`, { phone: phone.trim() || null }); if (j) { setMsg(j.sent ? "Fiche envoyée par SMS." : "Le SMS n'est pas parti."); onChange(); } }} data-testid={`referral-sms-${r.id}`}>
          Renvoyer la fiche par SMS
        </Button>
        <a href={`/api/relay/referrals/${r.id}/fiche`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-pill px-3 text-[13px] font-bold text-organic-accent-700">Imprimer la fiche</a>
      </div>
      {msg && <span className="text-[13px] font-semibold">{msg}</span>}
    </div>
  );
}

export function ReferralCards() {
  const qc = useQueryClient();
  const { data } = useQuery<{ referrals: Ref[] }>({ queryKey: ["/api/relay/referrals"] });
  const list = data?.referrals || [];
  if (!list.length) return null;
  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6" data-testid="relay-referrals">
      <h3 className="m-0 text-[22px]">Orientations vers l'hôpital</h3>
      <div className="grid gap-organic-3 lg:grid-cols-2">
        {list.map((r) => <Card key={r.id} r={r} onChange={() => qc.invalidateQueries({ queryKey: ["/api/relay/referrals"] })} />)}
      </div>
    </div>
  );
}
