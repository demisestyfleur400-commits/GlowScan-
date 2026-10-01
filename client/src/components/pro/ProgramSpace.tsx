import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProInput } from "@/components/ProLayout";
import { RELAY_DISEASES, RELAY_TIERS } from "@shared/relay";
import { NETWORK_COUNTRIES } from "@shared/peer";
import { SPLITS, GLOWSCAN_MOMO } from "@shared/splits";
import { formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Espace ONG (étape 14a, maquette « Programmes ONG ») :
//  O1 · Nouveau programme (brouillon, puis « Lancer » = demande de recharge
//       validée par GlowScan) ; O2 · Agents et invitations ; O3 · Budget d'avis.
// ════════════════════════════════════════════════════════════════════════

const PRICE = RELAY_TIERS.simple.priceFcfa;
const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;
const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
async function call(url: string, body?: unknown) {
  const r = await fetch(url, { method: body === undefined ? "GET" : "POST", credentials: "include", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
  return d;
}

function RechargeForm({ programId, reviews, onDone, launch }: { programId: number; reviews: number | null; onDone: (invoiceUrl?: string) => void; launch?: boolean }) {
  const [method, setMethod] = useState<"virement" | "momo">("virement");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    if (!reviews) return setErr("Choisissez un nombre d'avis ou un montant.");
    setBusy(true); setErr("");
    try { const d = await call(`/api/program/${programId}/recharge`, { reviews, method, operatorRef: ref.trim() || null }); onDone(d.invoiceUrl); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-organic-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip(method === "virement")} onClick={() => setMethod("virement")}>Virement</button>
        <button type="button" className={chip(method === "momo")} onClick={() => setMethod("momo")}>Mobile Money</button>
      </div>
      {method === "momo"
        ? <span className="text-[13px]">Payez {reviews ? formatF(reviews * PRICE) : "le montant"} par MTN MoMo au <b>{GLOWSCAN_MOMO.mtn}</b> ou Orange Money au <b>{GLOWSCAN_MOMO.orange}</b>, puis saisissez l'ID de transaction.</span>
        : <span className="text-[13px]">Une facture est générée pour le virement ; le budget est crédité dès que GlowScan a reçu le paiement.</span>}
      <ProInput label={method === "momo" ? "ID de transaction" : "Référence du virement (facultatif)"} value={ref} onChange={(e) => setRef(e.target.value)} testid="program-ref" />
      {err && <span role="alert" className="text-[13px] font-semibold text-organic-accent-900">{err}</span>}
      <Button onClick={send} disabled={busy || (method === "momo" && ref.trim().length < 6)} className="self-start" data-testid="program-recharge">
        {launch ? "Lancer le programme" : "Recharger"}
      </Button>
    </div>
  );
}

// ── O1 · Nouveau programme ────────────────────────────────────────────────
export function ProgramSetup({ programId, onSaved }: { programId: number | null; onSaved: (id: number) => void }) {
  const { data: dermData } = useQuery<{ derms: { id: number; name: string; city: string | null; country: string }[] }>({ queryKey: ["/api/program/derms"] });
  const { data: existing } = useQuery<any>({ queryKey: [`/api/program/${programId}/setup`], enabled: !!programId });
  const [f, setF] = useState({ name: "", country: "Cameroun", funder: "", funderEmail: "" });
  const [districts, setDistricts] = useState<string[]>([]);
  const [newDistrict, setNewDistrict] = useState("");
  const [dermMode, setDermMode] = useState<"auto" | "chosen">("auto");
  const [derms, setDerms] = useState<number[]>([]);
  const [diseases, setDiseases] = useState<string[]>([]);
  const [pack, setPack] = useState<number | "free">(200);
  const [free, setFree] = useState("");
  const [savedId, setSavedId] = useState<number | null>(programId);
  const [launching, setLaunching] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!existing) return;
    setF({ name: existing.name || "", country: existing.country || "Cameroun", funder: existing.funder || "", funderEmail: existing.funderEmail || "" });
    setDistricts(existing.districts || []); setDermMode(existing.dermMode || "auto"); setDerms(existing.derms || []); setDiseases(existing.diseases || []);
  }, [existing]);

  const reviews = pack === "free" ? Math.floor((Number(free.replace(/\D/g, "")) || 0) / PRICE) : pack;
  const save = async (): Promise<number | null> => {
    if (f.name.trim().length < 2) { setMsg("Donnez un nom au programme."); return null; }
    setBusy(true); setMsg("");
    try {
      const d = await call("/api/program", { id: savedId, name: f.name.trim(), country: f.country, districts, dermMode, derms, diseases, funder: f.funder.trim() || null, funderEmail: f.funderEmail.trim() || null });
      setSavedId(d.id); onSaved(d.id); setMsg("Brouillon enregistré.");
      return d.id;
    } catch (e: any) { setMsg(e.message); return null; } finally { setBusy(false); }
  };
  const split = [["Dermato", SPLITS.relay.derm], ["Relais", SPLITS.relay.relay], ["GS", SPLITS.relay.platform]] as const;

  return (
    <section className="grid grid-cols-1 items-start gap-organic-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" data-testid="program-setup">
      <div className={card}>
        <span className="font-heading text-[26px]">{programId ? "Programme en brouillon" : "Nouveau programme"}</span>
        <ProInput label="Nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} testid="program-name" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">Pays et districts de santé</span>
          <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className="h-11 rounded-pill border border-organic-divider bg-organic-bg px-3 font-body text-[14px]" aria-label="Pays">
            {NETWORK_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => (
              <button key={d} type="button" className={chip(true)} onClick={() => setDistricts((cur) => cur.filter((x) => x !== d))} aria-label={`Retirer ${d}`}>{f.country} · {d} ×</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)} placeholder="District de santé" data-testid="program-district"
              onKeyDown={(e) => { if (e.key === "Enter" && newDistrict.trim()) { e.preventDefault(); const v = newDistrict.trim(); setDistricts((cur) => Array.from(new Set([...cur, v]))); setNewDistrict(""); } }}
              className="box-border h-11 min-w-0 flex-1 rounded-pill border border-organic-divider bg-organic-bg px-4 font-body text-[14px] outline-none focus:border-organic-accent" />
            <Button variant="secondary" onClick={() => { const v = newDistrict.trim(); if (v) { setDistricts((cur) => Array.from(new Set([...cur, v]))); setNewDistrict(""); } }}>+ Ajouter</Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">Dermatologues du réseau</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(dermMode === "auto")} onClick={() => setDermMode("auto")}>Choix automatique selon la langue et le délai</button>
            <button type="button" className={chip(dermMode === "chosen")} onClick={() => setDermMode("chosen")}>Je choisis</button>
          </div>
          {dermMode === "chosen" && (
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-card bg-organic-bg p-organic-3">
              {(dermData?.derms || []).map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={derms.includes(d.id)} onChange={(e) => { const on = e.target.checked; setDerms((cur) => (on ? [...cur, d.id] : cur.filter((x) => x !== d.id))); }} className="h-4 w-4 accent-[var(--color-accent)]" />
                  {d.name}{d.city ? ` · ${d.city}` : ""} · {d.country}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">Maladies suivies</span>
          <div className="flex flex-wrap gap-1.5">
            {RELAY_DISEASES.filter((d) => d.code !== "autre").map((d) => (
              <button key={d.code} type="button" className={chip(diseases.includes(d.code))} onClick={() => setDiseases((cur) => (cur.includes(d.code) ? cur.filter((x) => x !== d.code) : [...cur, d.code]))}>{d.label}</button>
            ))}
            <button type="button" className={chip(diseases.length === 0)} onClick={() => setDiseases([])}>Toutes</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-organic-2 sm:grid-cols-2">
          <ProInput label="Bailleur (facultatif)" value={f.funder} onChange={(e) => setF({ ...f, funder: e.target.value })} />
          <ProInput label="Email du bailleur (rapport mensuel)" value={f.funderEmail} onChange={(e) => setF({ ...f, funderEmail: e.target.value })} type="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">Avis prépayés</span>
          <div className="flex flex-wrap gap-1.5">
            {[100, 200, 500].map((n) => (
              <button key={n} type="button" className={chip(pack === n)} onClick={() => setPack(n)}>{n === 200 ? `200 · ${formatF(200 * PRICE)}` : n}</button>
            ))}
            <button type="button" className={chip(pack === "free")} onClick={() => setPack("free")}>Montant libre</button>
          </div>
          {pack === "free" && <ProInput label="Montant (F CFA)" value={free} onChange={(e) => setFree(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" />}
          {reviews ? <span className="text-[12px] text-organic-neutral-700">{reviews} avis simples · {formatF(reviews * PRICE)}</span> : null}
        </div>
        {msg && <span className="text-[13px] font-semibold">{msg}</span>}
        {invoice ? (
          <div className="rounded-card bg-organic-accent-2-100 p-organic-3 text-[13px] text-organic-accent-2-900">
            Demande envoyée. Le programme démarre dès que GlowScan a validé le paiement. <a href={invoice} target="_blank" rel="noopener noreferrer" className="font-bold">Voir la facture</a>
          </div>
        ) : launching && savedId ? (
          <RechargeForm programId={savedId} reviews={reviews || null} launch onDone={(url) => { setInvoice(url || null); setLaunching(false); }} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={save} disabled={busy} data-testid="program-save">Enregistrer le brouillon</Button>
            <Button onClick={async () => { if (await save()) setLaunching(true); }} disabled={busy || !reviews} data-testid="program-launch">Lancer le programme</Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-organic-4">
        <div className={card}>
          <span className="font-heading text-[20px]">Chaque avis</span>
          <div className="flex overflow-hidden rounded-pill text-[12px] font-bold">
            {split.map(([l, pct], i) => (
              <span key={l} style={{ width: `${pct}%` }} className={`px-2 py-2 text-center ${i === 0 ? "bg-organic-accent text-organic-bg" : i === 1 ? "bg-organic-accent-2-600 text-organic-bg" : "bg-organic-neutral-200"}`}>
                {l} {pct} %
              </span>
            ))}
          </div>
          <span className="text-[13px] text-organic-neutral-800">Simple {formatF(RELAY_TIERS.simple.priceFcfa)} · urgent {formatF(RELAY_TIERS.urgent.priceFcfa)} · non consommé = remboursable</span>
        </div>
        <div className={card}>
          <span className="font-heading text-[20px]">Règles du programme</span>
          <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] leading-normal">
            <li>Module photo obligatoire avant le 1er cas</li>
            <li>Autonomie : 85 % d'accord sur 20 cas</li>
            <li>Relecture qualité : 1 avis sur 10 par un 2e dermatologue</li>
            <li>Données : seuls les agrégats sortent vers DHIS2</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── O3 · Budget d'avis ─────────────────────────────────────────────────────
type Budget = {
  status: string; alertPct: number; balance: number; recharged: number; spent: number; reviewsLeft: number; reviewsTotal: number;
  month: { simple: number; urgent: number }; weeksLeft: number | null; low: boolean;
  recharges: { id: number; amount_fcfa: number; reviews: number | null; method: string | null; status: string; reject_reason: string | null; receipt_no: string | null; created_at: string }[];
};
export function ProgramBudget({ programId }: { programId: number }) {
  const qc = useQueryClient();
  const key = `/api/program/${programId}/budget`;
  const { data: b } = useQuery<Budget>({ queryKey: [key] });
  const [open, setOpen] = useState(false);
  const [pack, setPack] = useState(200);
  if (!b) return null;
  const refresh = () => qc.invalidateQueries({ queryKey: [key] });
  return (
    <div className={card} data-testid="program-budget">
      <span className="text-[11px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Budget</span>
      <div className="flex items-baseline gap-2"><span className="font-heading text-[48px] leading-none">{b.reviewsLeft}</span><span className="text-[14px]">avis restants sur {b.reviewsTotal}</span></div>
      {b.low && <span className="self-start rounded-pill bg-organic-accent-100 px-3 py-1 text-[12px] font-semibold text-organic-accent-900">Solde bas{b.weeksLeft != null ? ` · environ ${b.weeksLeft} semaine${b.weeksLeft > 1 ? "s" : ""} au rythme actuel` : ""}</span>}
      {b.status === "draft" && <span className="text-[13px] text-organic-neutral-800">Le programme démarre dès que GlowScan a validé la première recharge.</span>}
      <div className="grid grid-cols-2 gap-organic-2">
        <div className="flex flex-col rounded-card bg-organic-bg p-organic-3"><span className="text-[12px] text-organic-neutral-700">Ce mois</span><b className="text-[16px]">{b.month.simple + b.month.urgent} avis</b><span className="text-[12px]">{b.month.simple} simples · {b.month.urgent} urgents</span></div>
        <div className="flex flex-col rounded-card bg-organic-bg p-organic-3"><span className="text-[12px] text-organic-neutral-700">Dépensé</span><b className="text-[16px]">{formatF(b.spent)}</b><span className="text-[12px]">sur {formatF(b.recharged)}</span></div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] font-bold">Alerte automatique</span>
        {[20, 30, 50].map((p) => <button key={p} type="button" className={chip(b.alertPct === p)} onClick={async () => { await call(`/api/program/${programId}/alert`, { pct: p }).catch(() => {}); refresh(); }}>{p} %</button>)}
      </div>
      {open ? (
        <>
          <div className="flex flex-wrap gap-1.5">{[100, 200, 500].map((n) => <button key={n} type="button" className={chip(pack === n)} onClick={() => setPack(n)}>{n} avis · {formatF(n * PRICE)}</button>)}</div>
          <RechargeForm programId={programId} reviews={pack} onDone={() => { setOpen(false); refresh(); }} />
        </>
      ) : <Button variant="secondary" className="self-start" onClick={() => setOpen(true)} data-testid="budget-open">Recharger · virement ou Mobile Money</Button>}
      <span className="text-[12px] text-organic-neutral-700">Facture et reçu pour le bailleur à chaque recharge.</span>
      {b.recharges.length > 0 && (
        <div className="flex flex-col gap-1">
          {b.recharges.map((r) => (
            <span key={r.id} className="flex flex-wrap justify-between gap-2 text-[12px]">
              <span>{new Date(r.created_at).toLocaleDateString("fr-FR")} · {formatF(Math.abs(r.amount_fcfa))}{r.status === "pending" ? " · en vérification" : r.status === "rejected" ? ` · refusée (${r.reject_reason || ""})` : ""}</span>
              {r.amount_fcfa > 0 && <a href={`/api/program/recharges/${r.id}/receipt`} target="_blank" rel="noopener noreferrer" className="font-bold text-organic-accent-700">{r.status === "confirmed" ? "Reçu" : "Facture"}</a>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── O2 · Agents et invitations ─────────────────────────────────────────────
type Agents = {
  agents: { id: number; name: string; profession: string; center: string | null; status: string; module: string; cases: number | null; accuracy: number | null; autonomous: string | null }[];
  invitations: { id: number; phone: string; name: string | null; center: string | null; day: number }[];
};
export function ProgramAgents({ programId }: { programId: number }) {
  const { data } = useQuery<Agents>({ queryKey: [`/api/program/${programId}/agents`] });
  const [sent, setSent] = useState<Record<number, string>>({});
  if (!data) return null;
  const resend = async (id: number) => {
    try { const d = await call(`/api/relay-invitations/${id}/resend`, {}); setSent({ ...sent, [id]: d.sent ? "Relancée" : "SMS non parti" }); }
    catch (e: any) { setSent({ ...sent, [id]: e.message }); }
  };
  return (
    <div className={card} data-testid="program-agents">
      <span className="font-heading text-[22px]">Agents · {data.agents.length}</span>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead><tr className="text-left text-[12px] text-organic-neutral-700">{["Agent", "Centre", "Statut", "Module photo", "Cas", "Accord"].map((h) => <th key={h} className="py-1.5 pr-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {data.agents.map((a) => (
              <tr key={a.id} className="border-t border-organic-divider">
                <td className="py-2 pr-3"><b>{a.name}</b><br /><span className="text-[12px] text-organic-neutral-700">{a.profession}</span></td>
                <td className="py-2 pr-3">{a.center || "—"}</td>
                <td className="py-2 pr-3">{a.status}</td>
                <td className="py-2 pr-3">{a.module}</td>
                <td className="py-2 pr-3">{a.cases ?? "—"}</td>
                <td className="py-2 pr-3">{a.accuracy != null ? `${a.accuracy} %` : "—"}{a.autonomous ? <span className="text-[12px] text-organic-accent-2-700"> · autonome {a.autonomous.toLowerCase()}</span> : null}</td>
              </tr>
            ))}
            {data.invitations.map((i) => (
              <tr key={`i${i.id}`} className="border-t border-organic-divider text-organic-neutral-800">
                <td className="py-2 pr-3">{i.name || i.phone}</td>
                <td className="py-2 pr-3">{i.center || "—"}</td>
                <td className="py-2 pr-3">Invitation envoyée · J+{i.day}</td>
                <td className="py-2 pr-3">—</td>
                <td className="py-2 pr-3">0</td>
                <td className="py-2 pr-3">{sent[i.id] ? <span className="text-[12px]">{sent[i.id]}</span> : <button type="button" onClick={() => resend(i.id)} className="cursor-pointer border-0 bg-transparent p-0 font-body text-[13px] font-bold text-organic-accent-700">Relancer</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="text-[12px] text-organic-neutral-700">Un agent invité par une ONG est parrainé par elle ; GlowScan vérifie quand même sa carte professionnelle. Le détail des cas et de l'accord n'apparaît que pour les agents qui l'acceptent.</span>
    </div>
  );
}

// ── O4 · Orientations vers l'hôpital (et qualité des avis) ─────────────────
type Referrals = { referred: number; arrived: number; toRelaunch: number; items: { code: string; city: string | null; status: string; day: number; toRelaunch: boolean }[]; quality: { done: number; agree: number } };
const REF_STATUS: Record<string, string> = { referred: "Orientée", arrived: "Arrivée", report_received: "CR reçu", no_show: "Pas venue" };
export function ProgramReferrals({ programId }: { programId: number }) {
  const { data } = useQuery<Referrals>({ queryKey: [`/api/program/${programId}/referrals`] });
  if (!data) return null;
  return (
    <div className={card} data-testid="program-referrals">
      <span className="font-heading text-[22px]">Orientations · {data.referred}</span>
      <div className="grid grid-cols-3 gap-organic-2 text-center">
        {([["orientées", data.referred], ["arrivées", data.arrived], ["à relancer", data.toRelaunch]] as const).map(([l, n]) => (
          <div key={l} className="flex flex-col rounded-card bg-organic-bg p-organic-3"><b className="font-heading text-[28px]">{n}</b><span className="text-[12px]">{l}</span></div>
        ))}
      </div>
      {data.items.slice(0, 8).map((r) => (
        <span key={r.code} className="flex flex-wrap justify-between gap-2 text-[13px]">
          <span><b>{r.code}</b>{r.city ? ` · ${r.city}` : ""}</span>
          <span className={r.toRelaunch ? "font-semibold text-organic-accent-800" : ""}>{REF_STATUS[r.status] || r.status}{r.status === "referred" || r.status === "no_show" ? ` · J+${r.day}` : ""}</span>
        </span>
      ))}
      <span className="text-[12px] text-organic-neutral-700">L'hôpital confirme l'arrivée en scannant le code de la fiche (sans compte GlowScan). Sans nouvelle à J+7 : SMS au patient et au relais.</span>
      {data.quality.done > 0 && (
        <span className="text-[13px]"><b>Relecture qualité</b> : {data.quality.agree}/{data.quality.done} avis confirmés par un 2e dermatologue ({Math.round((data.quality.agree / data.quality.done) * 100)} %).</span>
      )}
    </div>
  );
}
