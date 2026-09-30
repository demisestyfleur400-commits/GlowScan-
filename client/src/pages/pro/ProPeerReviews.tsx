import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ProLayout, ProInput } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { usePeerReviews, usePeerReview, useProPatients } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Téléexpertise — « Avis entre confrères » (maquette « Derm Teleexpertise »).
// Envoyés / Reçus, cas anonymisé (photo, âge, sexe : jamais le nom ni le
// téléphone), avis structuré (diagnostic retenu, conduite à tenir, revoir),
// « Accepter l'avis », demande avec destinataire et niveau d'urgence.
// ════════════════════════════════════════════════════════════════════════

type Item = {
  id: number; mine: boolean; requesterName: string; condition?: string | null; ageSex?: string | null; question: string;
  imageUrl?: string | null; status: "open" | "answered" | "closed"; replyCount: number; createdAt: string;
  urgency?: "normal" | "urgent"; targetName?: string | null; acceptedAt?: string | null;
};

const STATUS: Record<Item["status"], { label: string; tag: string }> = {
  open: { label: "En attente", tag: "bg-organic-accent-200 text-organic-accent-900" },
  answered: { label: "Avis reçu", tag: "bg-organic-accent-2-200 text-organic-accent-2-900" },
  closed: { label: "Clôturé", tag: "bg-organic-neutral-200 text-organic-neutral-900" },
};
const when = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "short" });
const ref = (id: number) => `AV-${String(id).padStart(4, "0")}`;

async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
  return d;
}

export default function ProPeerReviews() {
  const qc = useQueryClient();
  const { data, isLoading } = usePeerReviews();
  const items = (data?.items || []) as Item[];
  const [box, setBox] = useState<"sent" | "recv">("sent");
  const [sel, setSel] = useState<number | null>(null);
  const [dlg, setDlg] = useState(false);

  const list = items.filter((i) => (box === "sent" ? i.mine : !i.mine));
  useEffect(() => { if (!sel && list.length) setSel(list[0].id); }, [list, sel]);
  useEffect(() => {
    const id = parseInt(new URLSearchParams(window.location.search).get("cas") || "");
    if (id) { setSel(id); const it = items.find((i) => i.id === id); if (it) setBox(it.mine ? "sent" : "recv"); }
  }, [items.length]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews"] }); };

  return (
    <ProLayout>
      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">Téléexpertise</span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Avis entre confrères</h1>
        </div>
        <Button onClick={() => setDlg(true)} className="h-auto px-[22px] py-3 text-[15px]" data-testid="button-new-peer"><Plus size={16} /> Demander un avis</Button>
      </header>

      <div className="grid items-start gap-organic-4 md:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="flex flex-col gap-organic-2">
          <div className="flex gap-1.5 self-start rounded-pill bg-organic-surface p-1" role="tablist">
            {([["sent", "Envoyés"], ["recv", "Reçus"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={box === k} onClick={() => { setBox(k); setSel(null); }}
                className={`cursor-pointer rounded-pill border-0 px-4 py-2 font-body text-[13px] font-bold ${box === k ? "bg-organic-bg text-organic-accent-700" : "bg-transparent text-organic-text"}`}>{l}</button>
            ))}
          </div>
          {isLoading && <span className="text-[14px] text-organic-neutral-700">Chargement…</span>}
          {!isLoading && list.length === 0 && (
            <span className="text-[14px] text-organic-neutral-700">{box === "sent" ? "Vous n'avez encore demandé aucun avis." : "Aucune demande de confrère pour l'instant."}</span>
          )}
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => setSel(c.id)}
              className={`flex flex-col gap-1 rounded-card border-0 p-organic-3 text-left font-body text-organic-text ${sel === c.id ? "bg-organic-surface" : "bg-transparent hover:bg-organic-neutral-200"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] font-bold">{c.condition || "Cas clinique"}</span>
                <span className={`flex-none rounded-pill px-2 py-0.5 text-[11px] font-semibold ${STATUS[c.status].tag}`}>{STATUS[c.status].label}</span>
              </span>
              <span className="text-[12px] text-organic-neutral-700">
                {c.mine ? (c.targetName ? `Dr ${c.targetName.replace(/^dr\.?\s*/i, "")}` : "Tout le réseau") : c.requesterName} · {when(c.createdAt)}
                {c.urgency === "urgent" ? " · Urgent" : ""}
              </span>
            </button>
          ))}
        </div>
        {sel != null ? <CaseDetail id={sel} onChange={refresh} /> : <div className="hidden md:block" />}
      </div>

      {dlg && <NewRequest onClose={() => setDlg(false)} onCreated={(id) => { setDlg(false); setBox("sent"); setSel(id); refresh(); }} />}
    </ProLayout>
  );
}

function CaseDetail({ id, onChange }: { id: number; onChange: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = usePeerReview(id);
  const [draft, setDraft] = useState("");
  const [dx, setDx] = useState(""); const [plan, setPlan] = useState(""); const [follow, setFollow] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (isLoading || !data) return <div className="rounded-card bg-organic-surface p-organic-6 text-[14px] text-organic-neutral-700">Chargement…</div>;
  const r: any = data.review;
  const replies: any[] = data.replies || [];
  const st = STATUS[r.status as Item["status"]] || STATUS.open;
  const reload = () => { qc.invalidateQueries({ queryKey: ["/api/pro/peer-reviews", id] }); onChange(); };
  const canAnswer = !r.mine && r.status !== "closed" && !replies.some((x) => x.mine && x.structured);

  const send = async (body: any) => {
    setBusy(true); setErr("");
    try { await post(`/api/pro/peer-reviews/${id}/reply`, body); setDraft(""); setDx(""); setPlan(""); setFollow(""); reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex flex-col">
          <span className="font-heading text-[22px] leading-tight">{r.condition || "Cas clinique"}</span>
          <span className="text-[12px] text-organic-neutral-700">{r.mine ? "Votre demande" : r.requesterName} · {ref(r.id)} · données anonymisées</span>
        </span>
        <span className={`rounded-pill px-2.5 py-1 text-[12px] font-semibold ${st.tag}`}>{st.label}</span>
      </div>

      <div className="flex flex-wrap gap-organic-3">
        {r.imageUrl && <img src={r.imageUrl} alt="Photo du cas" className="h-[150px] w-[120px] rounded-2xl object-cover" />}
        <div className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-card bg-organic-bg p-organic-4 text-[13px]">
          {r.ageSex && <span><b>{r.ageSex}</b></span>}
          {r.condition && <span>Diagnostic proposé : {r.condition}</span>}
          {r.urgency === "urgent" && <span className="font-bold text-organic-accent-800">Urgent</span>}
          <span className="font-semibold">Question : {r.question}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {replies.map((m) => m.structured ? (
          <div key={m.id} className="flex flex-col gap-1.5 rounded-card bg-organic-accent-2-100 p-organic-4 text-[13px] text-organic-accent-2-900">
            <span className="text-[11px] font-bold uppercase tracking-[.08em]">Avis structuré · {m.authorName}</span>
            <span><b>Diagnostic retenu :</b> {m.structured.dx}</span>
            <span><b>Conduite à tenir :</b> {m.structured.plan}</span>
            {m.structured.follow && <span><b>Revoir :</b> {m.structured.follow}</span>}
            {r.mine && (
              <Button onClick={async () => { await post(`/api/pro/peer-reviews/${id}/accept`).catch(() => {}); reload(); }} disabled={!!r.acceptedAt}
                className="mt-1 self-start bg-organic-accent-2-600 text-organic-bg hover:bg-organic-accent-2-700">
                {r.acceptedAt ? "Avis retenu ✓" : "Accepter l'avis"}
              </Button>
            )}
          </div>
        ) : (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-card px-4 py-2.5 text-[13px] ${m.mine ? "bg-organic-accent text-organic-bg" : "bg-organic-bg"}`}>
              <span className="whitespace-pre-wrap">{m.message}</span>
              <div className="mt-1 text-[11px] opacity-75">{m.authorName} · {when(m.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>

      {canAnswer && (
        <div className="flex flex-col gap-organic-2 rounded-card bg-organic-bg p-organic-4">
          <span className="text-[13px] font-bold">Votre avis</span>
          <ProInput label="Diagnostic retenu" value={dx} onChange={(e) => setDx(e.target.value)} testid="peer-dx" />
          <ProInput label="Conduite à tenir" value={plan} onChange={(e) => setPlan(e.target.value)} testid="peer-plan" />
          <ProInput label="Revoir (facultatif)" value={follow} onChange={(e) => setFollow(e.target.value)} placeholder="Ex. dans 6 semaines, avec photo" testid="peer-follow" />
          <Button onClick={() => send({ structured: { dx: dx.trim(), plan: plan.trim(), follow: follow.trim() } })} disabled={busy || !dx.trim() || !plan.trim()} className="self-start" data-testid="peer-send-structured">
            Envoyer l'avis
          </Button>
        </div>
      )}

      {r.status !== "closed" && (
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) send({ message: draft.trim() }); }}
            placeholder="Répondre au confrère…"
            className="box-border h-11 min-w-0 flex-1 rounded-pill border border-organic-divider bg-organic-bg px-4 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent" data-testid="peer-draft" />
          <Button onClick={() => send({ message: draft.trim() })} disabled={busy || !draft.trim()}>Envoyer</Button>
        </div>
      )}
      {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
      {r.mine && r.status !== "closed" && (
        <Button variant="ghost" className="self-start" onClick={async () => { await post(`/api/pro/peer-reviews/${id}/close`).catch(() => {}); reload(); }}>Clôturer le cas</Button>
      )}
    </div>
  );
}

function NewRequest({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const { data: pData } = useProPatients("");
  const { data: peersData } = useQuery<{ peers: { id: number; fullName: string; city?: string | null }[] }>({ queryKey: ["/api/pro/peers"] });
  const [patientId, setPatientId] = useState<number | "">("");
  const [target, setTarget] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const patients = (pData?.patients || []).filter((p: any) => p.lastScanAt);
  const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

  const create = async () => {
    if (!patientId) return setErr("Choisissez le dossier.");
    if (question.trim().length < 3) return setErr("Posez votre question.");
    setBusy(true); setErr("");
    try {
      const d = await fetch(`/api/pro/patients/${patientId}`, { credentials: "include" }).then((r) => r.json());
      const scanId = d?.scans?.[0]?.id ?? null;
      const res = await post("/api/pro/peer-reviews", { scanId, question: question.trim(), targetAccountId: target, urgency });
      onCreated(res.id);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-organic-neutral-900/45 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col gap-organic-3 overflow-auto rounded-t-[32px] bg-organic-bg p-organic-6 sm:rounded-card">
        <span className="font-heading text-[22px]">Demander un avis</span>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Dossier</span>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : "")}
            className="h-11 rounded-pill border border-organic-divider bg-organic-surface px-4 font-body text-[14px] text-organic-text" data-testid="peer-patient">
            <option value="">Choisir un patient…</option>
            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.lastCondition ? ` — ${p.lastCondition}` : ""}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-0.5 rounded-card bg-organic-surface p-organic-3">
          <span className="text-[14px] font-bold">Patient anonymisé</span>
          <span className="text-[12px] text-organic-neutral-700">Seules la photo, l'âge et le sexe sont partagés. Jamais le nom ni le téléphone.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">À qui ?</span>
          <button type="button" className={`${chip(target == null)} self-start`} onClick={() => setTarget(null)}>Tout le réseau</button>
          <div className="flex max-h-[180px] flex-col gap-1 overflow-auto">
            {(peersData?.peers || []).map((p) => (
              <button key={p.id} type="button" onClick={() => setTarget(p.id)}
                className={`flex items-center justify-between gap-2 rounded-pill border px-3.5 py-2 text-left font-body text-[13px] ${target === p.id ? "border-organic-accent bg-organic-accent-100" : "border-organic-divider bg-transparent"}`}>
                <span className="font-semibold">Dr {p.fullName.replace(/^dr\.?\s*/i, "")}</span>
                <span className="text-[12px] text-organic-neutral-700">{p.city || ""}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Urgence</span>
          <div className="flex gap-1.5">
            <button type="button" className={chip(urgency === "normal")} onClick={() => setUrgency("normal")}>Normale</button>
            <button type="button" className={chip(urgency === "urgent")} onClick={() => setUrgency("urgent")}>Urgente</button>
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Votre question (une seule, précise)</span>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="Ex. Laser Nd:YAG envisageable sur phototype VI ?"
            className="min-h-[80px] resize-y rounded-2xl border border-organic-divider bg-organic-surface px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent" data-testid="peer-question" />
        </label>
        {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={create} isLoading={busy} disabled={busy} data-testid="peer-create">Envoyer la demande</Button>
        </div>
      </div>
    </div>
  );
}
