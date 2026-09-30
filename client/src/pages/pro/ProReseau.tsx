import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProLayout, ProInput } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { RELAY_LEVELS, RELAY_TIERS, RELAY_DISEASES, LESSON_TIPS, diseaseLabel, type RelayTier } from "@shared/relay";
import { splitRelay } from "@shared/splits";
import { formatF } from "@shared/delivery";
import { relayCaseRef } from "@shared/teleexpertise";
import { TeleFieldsForm, emptyTeleFields, type TeleFields } from "@/components/pro/TeleexpertiseReport";
import { InviteRelays } from "@/components/relay/InviteRelays";
import { CaseThreadSheet } from "@/components/relay/CaseThread";

// ════════════════════════════════════════════════════════════════════════
// Réseau & formation — vue du dermatologue référent (maquette « Derm Reseau »,
// « Valider et former »). File des cas relais (urgents d'abord) : « Relais a
// raison » ou « Corriger » ; la correction devient la leçon du relais. Mes
// relais (accord réel, promotion Formateur), atlas = cas réellement validés.
// ════════════════════════════════════════════════════════════════════════

type QCase = {
  id: number; relay_name: string; relay_city: string | null; center_name: string | null; tier: RelayTier; price_fcfa: number;
  payment_status: string; relay_diagnosis: string; relay_disease_code: string | null; ai_diagnosis: string | null; ai_confidence: string | null;
  patient_age: number | null; patient_sex: string | null; zone: string | null; symptoms: string | null; photos: string[]; due_at: string | null; created_at: string;
  paused_at: string | null;
  // Routage (étape 13)
  accepted_at: string | null; routed_at: string | null; paid_at: string | null; route_step: string | null; relay_country: string | null;
};
type Relay = { id: number; fullName: string; city: string | null; center: string | null; level: number; accuracy: number | null; cases: number; canPromote: boolean };

async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
  return d;
}
const left = (due: string | null) => {
  if (!due) return "";
  const m = Math.round((+new Date(due) - Date.now()) / 60000);
  if (m <= 0) return "délai dépassé";
  return m < 60 ? `reste ${m} min` : `reste ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

export default function ProReseau() {
  const qc = useQueryClient();
  const { data: qData, isLoading } = useQuery<{ cases: QCase[] }>({ queryKey: ["/api/relay/review-queue"], refetchInterval: 60_000 });
  const { data: rData } = useQuery<{ relays: Relay[]; atlas: { network: number; mine: number } }>({ queryKey: ["/api/relay/my-relays"] });
  const queue = qData?.cases || [];
  const relays = rData?.relays || [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/relay/review-queue"] }); qc.invalidateQueries({ queryKey: ["/api/relay/my-relays"] }); };
  const { data: unreadData } = useQuery<{ unread: Record<string, number> }>({ queryKey: ["/api/case-threads/unread"], refetchInterval: 30_000 });
  const [threadId, setThreadId] = useState<number | null>(null);
  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";

  return (
    <ProLayout>
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">
          Dermatologue référent · {relays.length} relais
        </span>
        <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Valider et former</h1>
        <p className="m-0 text-[15px] text-organic-neutral-700">Votre correction devient la leçon du relais. Une phrase suffit : le signe qui aurait dû l'orienter.</p>
      </header>

      <section className="grid grid-cols-1 items-start gap-organic-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-[22px]">À valider</h3>
            <span className="rounded-pill bg-organic-accent-200 px-2.5 py-1 text-[12px] font-semibold text-organic-accent-900">{queue.length} cas</span>
          </div>
          {isLoading && <span className="text-[14px] text-organic-neutral-700">Chargement…</span>}
          {!isLoading && queue.length === 0 && (
            <div className="rounded-pill bg-organic-accent-2-100 px-[18px] py-3.5 text-[13px] font-semibold text-organic-accent-2-800">File vide. Vos relais ont reçu leur leçon.</div>
          )}
          {queue.map((c) => <QueueItem key={c.id} c={c} onDone={refresh} unread={unreadData?.unread?.[c.id] || 0} onDiscuss={() => setThreadId(c.id)} />)}
        </div>

        <div className="flex flex-col gap-organic-4">
          <InviteRelays />
          <div className={card}>
            <h3 className="m-0 text-[22px]">Mes relais</h3>
            {relays.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun relais ne vous a encore choisi comme référent.</span>}
            {relays.map((r) => <RelayRow key={r.id} r={r} onDone={refresh} />)}
          </div>
          <div className={card}>
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Atlas des peaux africaines</span>
            <span className="font-heading text-[40px] leading-none">{rData?.atlas.network ?? 0}</span>
            <p className="m-0 text-[13px] text-organic-neutral-800">
              cas validés par le réseau, dont {rData?.atlas.mine ?? 0} par vous. Chaque validation rend l'IA plus juste sur phototypes IV à VI et sert de cas d'école aux relais.
            </p>
          </div>
        </div>
      </section>
      {threadId != null && <CaseThreadSheet caseId={threadId} onClose={() => { setThreadId(null); refresh(); qc.invalidateQueries({ queryKey: ["/api/case-threads/unread"] }); }} />}
    </ProLayout>
  );
}

// Heure limite de prise en charge : 25 % du délai après l'attribution (ou le paiement).
const takeBy = (c: QCase) => {
  const start = Math.max(c.routed_at ? +new Date(c.routed_at) : 0, c.paid_at ? +new Date(c.paid_at) : 0) || Date.now();
  return new Date(start + RELAY_TIERS[c.tier].hours * 15 * 60000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }).replace(":", " h ");
};

function QueueItem({ c, onDone, unread, onDiscuss }: { c: QCase; onDone: () => void; unread: number; onDiscuss: () => void }) {
  // Format 1b : le verdict ouvre l'avis complet (réponse, conduite à tenir, orientation, délai, photos, leçon).
  const [verdictSel, setVerdictSel] = useState<"confirm" | "correct" | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [dx, setDx] = useState("");
  const [tele, setTele] = useState<TeleFields>(emptyTeleFields());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const urgent = c.tier === "urgent";
  const share = ["verified", "credit", "program"].includes(c.payment_status) ? splitRelay(c.price_fcfa).derm : 0;
  const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3 py-1 font-body text-[12px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

  const send = async () => {
    const v = verdictSel!;
    const finalDx = code === "autre" ? dx.trim() : diseaseLabel(code);
    if (v === "correct" && !finalDx) return setErr("Indiquez le bon diagnostic.");
    if (tele.plan.trim().length < 2) return setErr("Indiquez la conduite à tenir.");
    setBusy(true); setErr("");
    try {
      await post(`/api/relay/cases/${c.id}/verdict`, {
        verdict: v, dermDiagnosis: v === "correct" ? finalDx : null, dermDiseaseCode: v === "correct" ? code : null, note: note.trim() || null, tip,
        ddx: tele.ddx.trim(), plan: tele.plan.trim(), orientation: tele.orientation, reviewIn: tele.reviewIn, photoQuality: tele.photoQuality, photosSharp: tele.photosSharp,
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-card bg-organic-bg p-organic-4" data-testid={`queue-${c.id}`}>
      <div className="flex items-start gap-3">
        {c.photos?.[0] && <img src={c.photos[0]} alt="Photo du cas" className="h-16 w-14 flex-none rounded-xl object-cover" />}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="break-words text-[14px] font-bold">
            {[c.zone, [c.patient_sex === "F" ? "fille / femme" : c.patient_sex === "M" ? "garçon / homme" : null, c.patient_age != null ? `${c.patient_age} ans` : null].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Cas relais"}
          </span>
          <span className="text-[12px] text-organic-neutral-700">
            {relayCaseRef(c.id)} · {c.relay_name} · {c.center_name || c.relay_city || ""} · {RELAY_TIERS[c.tier].label}{c.due_at ? ` · ${left(c.due_at)}` : ""}
          </span>
        </span>
        {urgent && <span className="flex-none rounded-pill bg-organic-accent-200 px-2.5 py-0.5 text-[12px] font-semibold text-organic-accent-900">Urgent</span>}
      </div>
      {c.paused_at && <span className="self-start rounded-pill bg-organic-accent-100 px-2.5 py-0.5 text-[12px] font-semibold text-organic-accent-900">Demande en cours · délai en pause</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        {c.route_step === "program" && <span className="rounded-pill bg-organic-accent-2-100 px-2.5 py-0.5 text-[12px] font-semibold text-organic-accent-2-800">Programme</span>}
        {c.route_step && c.route_step !== "referent" && c.route_step !== "program" && (
          <span className="rounded-pill bg-organic-accent-2-100 px-2.5 py-0.5 text-[12px] font-semibold text-organic-accent-2-800" data-testid={`queue-network-${c.id}`}>
            Réseau · {c.relay_country || "autre pays"}
          </span>
        )}
        {c.accepted_at ? (
          <span className="rounded-pill bg-organic-neutral-200 px-2.5 py-0.5 text-[12px] font-semibold">Pris en charge</span>
        ) : (
          <>
            <span className="text-[12px] text-organic-neutral-700">À prendre avant {takeBy(c)}</span>
            <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); try { await post(`/api/relay/cases/${c.id}/accept`); onDone(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } }} data-testid={`queue-accept-${c.id}`}>
              Je prends ce cas
            </Button>
          </>
        )}
      </div>
      {c.photos?.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">{c.photos.slice(1).map((u, i) => <img key={i} src={u} alt={`Photo ${i + 2}`} className="h-16 w-14 flex-none rounded-xl object-cover" />)}</div>
      )}
      {c.symptoms && <span className="text-[13px]">{c.symptoms}</span>}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-pill bg-organic-surface px-2.5 py-1 text-[12px] font-semibold">Relais : {c.relay_diagnosis}</span>
        <span className="rounded-pill bg-organic-surface px-2.5 py-1 text-[12px] font-semibold">IA (indicative) : {c.ai_diagnosis || "indisponible"}</span>
      </div>
      {verdictSel && (
        <div className="flex flex-col gap-2 rounded-card bg-organic-surface p-organic-3">
          <span className="text-[13px] font-bold">
            Réponse : {verdictSel === "confirm" ? `je confirme ${c.relay_diagnosis}` : "je corrige le diagnostic"}
          </span>
          {verdictSel === "correct" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {RELAY_DISEASES.map((d) => <button key={d.code} type="button" className={chip(code === d.code)} onClick={() => setCode(d.code)}>{d.label}</button>)}
              </div>
              {code === "autre" && <ProInput label="Bon diagnostic" value={dx} onChange={(e) => setDx(e.target.value)} testid={`queue-dx-${c.id}`} />}
            </>
          )}
          <TeleFieldsForm v={tele} onChange={setTele} photosTotal={c.photos?.length || 0} idPrefix={`queue-${c.id}`} />
          <span className="text-[12px] font-semibold text-organic-neutral-800">La leçon de ce cas</span>
          <div className="flex flex-wrap gap-1.5">
            {LESSON_TIPS.map((t) => <button key={t} type="button" className={chip(tip === t)} onClick={() => setTip(tip === t ? null : t)}>{t}</button>)}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Le signe qui aurait dû l'orienter…"
            className="min-h-[70px] resize-y rounded-2xl border border-organic-divider bg-organic-bg px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent" data-testid={`queue-note-${c.id}`} />
        </div>
      )}
      {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
      <div className="flex flex-wrap items-center gap-2">
        {!verdictSel ? (
          <>
            <Button onClick={() => setVerdictSel("confirm")} className="bg-organic-accent-2-600 text-organic-bg hover:bg-organic-accent-2-700" data-testid={`queue-ok-${c.id}`}>Relais a raison</Button>
            <Button variant="secondary" onClick={() => setVerdictSel("correct")} data-testid={`queue-fix-${c.id}`}>Corriger</Button>
          </>
        ) : (
          <>
            <Button onClick={send} disabled={busy} data-testid={`queue-send-${c.id}`}>Envoyer l'avis</Button>
            <Button variant="ghost" onClick={() => { setVerdictSel(null); setErr(""); }} disabled={busy}>Retour</Button>
          </>
        )}
        <Button variant={unread ? "default" : "ghost"} onClick={onDiscuss} data-testid={`queue-discuss-${c.id}`}>Discussion{unread ? ` · ${unread}` : ""}</Button>
        {share > 0 && <span className="text-[12px] text-organic-neutral-700">{formatF(share)} pour vous</span>}
      </div>
    </div>
  );
}

function RelayRow({ r, onDone }: { r: Relay; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const initials = r.fullName.replace(/^dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div className="flex items-center gap-3 rounded-pill bg-organic-bg py-2 pl-2 pr-2">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[12px] font-bold text-organic-accent-2-800">{initials}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-bold">{r.fullName}</span>
        <span className="truncate text-[12px] text-organic-neutral-700">
          {[r.center || r.city, r.accuracy != null ? `accord ${r.accuracy} % sur ${r.cases} cas` : "aucun cas validé"].filter(Boolean).join(" · ")}
        </span>
      </span>
      {r.canPromote ? (
        <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); await post(`/api/relay/relays/${r.id}/promote`).catch(() => {}); setBusy(false); onDone(); }}>Promouvoir</Button>
      ) : (
        <span className="flex-none rounded-pill bg-organic-neutral-200 px-2.5 py-1 text-[12px] font-semibold">Niv. {r.level + 1} · {RELAY_LEVELS[r.level].name}</span>
      )}
    </div>
  );
}
