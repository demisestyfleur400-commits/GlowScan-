import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ProLayout, ProInput } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { PhotoBlurEditor } from "@/components/pro/PhotoBlurEditor";
import { useProPatients } from "@/hooks/use-pro";
import { PEER_TIERS, PEER_SHARED, PEER_HIDDEN, PEER_QUESTION_SUGGESTIONS, PEER_QUICK_REPLIES, PEER_QUESTION_MIN, type PeerTier } from "@shared/peer";
import { SPLITS } from "@shared/splits";
import { formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Confrères (étape 8) — maquette « Derm Confreres ». Messages (cas complexe
// épinglé, avis structuré, « Intégrer à mon compte rendu »), envoi d'un cas en
// 4 étapes (dossier, anonymisation avec flou manuel, question et délai,
// confrère ou premier disponible) et annuaire du réseau. Avis payant : 80 %
// au confrère, 20 % à GlowScan (shared/splits.ts), réservé sur le portefeuille.
// ════════════════════════════════════════════════════════════════════════

type Thread = {
  id: number; kind: "case" | "chat"; mine: boolean; offered: boolean;
  other: { id: number; name: string; city: string | null; country: string | null; expertise: string[] } | null;
  caseId: number | null; caseStatus: string | null; tier: PeerTier | null; paymentStatus: string | null; unread: number; last: string; at: string;
};
type Peer = { id: number; name: string; city: string | null; country: string | null; expertise: string[]; available: boolean; cases: number; respHours: number | null };

const ini = (n?: string | null) => String(n || "").replace(/^(dr|pr)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const dr = (n?: string | null) => (/^(dr|pr)\.?\s/i.test(String(n || "")) ? String(n) : `Dr ${n || ""}`);
const when = (d: string) => {
  const x = new Date(d), today = x.toDateString() === new Date().toDateString();
  return today ? x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : x.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};
const resp = (h: number | null) => (h == null ? "—" : h < 24 ? `${h} h` : `${Math.round(h / 24)} j`);
const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

async function api(url: string, body?: unknown) {
  const r = await fetch(url, { method: body === undefined ? "GET" : "POST", credentials: "include", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d?.message || "Erreur. Réessayez."), { code: d?.code, status: r.status });
  return d;
}

function statusOf(t: { caseStatus: string | null; paymentStatus: string | null; offered?: boolean; kind: string }) {
  if (t.kind === "chat") return { label: "Discussion", tag: "bg-organic-neutral-200 text-organic-neutral-900" };
  if (t.offered) return { label: "Proposé à vous", tag: "bg-organic-accent-200 text-organic-accent-900" };
  if (t.paymentStatus === "awaiting_momo") return { label: "Paiement à vérifier", tag: "bg-organic-neutral-200 text-organic-neutral-900" };
  if (t.caseStatus === "answered") return { label: "Avis rendu", tag: "bg-organic-accent-2-200 text-organic-accent-2-900" };
  if (t.caseStatus === "expired") return { label: "Délai dépassé · remboursé", tag: "bg-organic-neutral-200 text-organic-neutral-900" };
  return { label: "En attente", tag: "bg-organic-neutral-200 text-organic-neutral-900" };
}

export default function ProConfreres() {
  const qc = useQueryClient();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [tab, setTab] = useState<"msg" | "send" | "dir">(params.get("envoyer") ? "send" : "msg");
  const [sel, setSel] = useState<number | null>(null);
  const [presetPeer, setPresetPeer] = useState<number | "first" | null>(null);
  const { data: tData } = useQuery<{ threads: Thread[] }>({ queryKey: ["/api/peer/threads"], refetchInterval: 30_000 });
  const threads = tData?.threads || [];
  const unread = threads.reduce((s, t) => s + (t.unread || 0) + (t.offered ? 1 : 0), 0);
  useEffect(() => { if (sel == null && threads.length) setSel(threads[0].id); }, [threads, sel]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/peer/threads"] });

  const tabs = [
    { k: "msg" as const, label: "Messages", badge: unread },
    { k: "send" as const, label: "Envoyer un cas", badge: 0 },
    { k: "dir" as const, label: "Annuaire du réseau", badge: 0 },
  ];

  return (
    <ProLayout>
      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">Réseau GlowScan Derm</span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Confrères</h1>
        </div>
        <Button onClick={() => { setPresetPeer(null); setTab("send"); }} className="h-auto px-[22px] py-3 text-[15px]" data-testid="peer-open-send">
          <Plus size={16} /> Envoyer un cas complexe
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5 self-start rounded-card bg-organic-surface p-1 sm:rounded-pill" role="tablist">
        {tabs.map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
            className={`flex cursor-pointer items-center gap-2 rounded-pill border-0 px-4 py-2 font-body text-[13px] font-bold ${tab === t.k ? "bg-organic-accent text-organic-bg" : "bg-transparent text-organic-text"}`}>
            {t.label}
            {t.badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-organic-bg px-1.5 text-[11px] text-organic-accent-800">{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "msg" && (
        <div className="grid grid-cols-1 items-start gap-organic-4 md:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="flex min-w-0 flex-col gap-1">
            {threads.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucune conversation. Envoyez un cas ou écrivez à un confrère depuis l'annuaire.</span>}
            {threads.map((t) => {
              const st = statusOf(t);
              return (
                <button key={t.id} type="button" onClick={() => setSel(t.id)}
                  className={`flex min-w-0 items-center gap-3 rounded-card border-0 p-organic-3 text-left font-body text-organic-text ${sel === t.id ? "bg-organic-surface" : "bg-transparent hover:bg-organic-neutral-200"}`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[13px] font-bold text-organic-accent-2-800">{t.other ? ini(t.other.name) : "?"}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-bold">{t.other ? dr(t.other.name) : "Premier disponible"}</span>
                      <span className="flex-none text-[11px] text-organic-neutral-700">{when(t.at)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`flex-none rounded-pill px-2 py-0.5 text-[10px] font-semibold ${t.kind === "case" ? "bg-organic-accent-200 text-organic-accent-900" : "bg-organic-neutral-200"}`}>{t.kind === "case" ? "Cas complexe" : "Discussion"}</span>
                      <span className="truncate text-[12px] text-organic-neutral-700">{t.offered ? st.label : t.last}</span>
                    </span>
                  </span>
                  {(t.unread > 0 || t.offered) && <span className="h-2.5 w-2.5 flex-none rounded-full bg-organic-accent" />}
                </button>
              );
            })}
          </div>
          {sel != null ? <ThreadView id={sel} onChange={refresh} /> : <div className="hidden md:block" />}
        </div>
      )}

      {tab === "send" && (
        <SendCase presetPatient={params.get("envoyer") ? Number(params.get("envoyer")) : null} presetPeer={presetPeer}
          onSent={(threadId) => { refresh(); setSel(threadId); setTab("msg"); }} onCancel={() => setTab("msg")} />
      )}

      {tab === "dir" && (
        <Directory onSendCase={(id) => { setPresetPeer(id); setTab("send"); }}
          onWrite={async (id) => { try { const d = await api("/api/peer/chat", { toPro: id, body: "" }); refresh(); setSel(d.threadId); setTab("msg"); } catch {} }} />
      )}
    </ProLayout>
  );
}

// ── Conversation ─────────────────────────────────────────────────────────
function ThreadView({ id, onChange }: { id: number; onChange: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/peer/threads/${id}`], refetchInterval: 20_000 });
  const [draft, setDraft] = useState("");
  const [avis, setAvis] = useState({ answer: "", dx: "", ddx: "", plan: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages?.length]);
  if (isLoading || !data) return <div className="rounded-card bg-organic-surface p-organic-6 text-[14px] text-organic-neutral-700">Chargement…</div>;

  const { thread, other, case: c, messages } = data;
  const reload = () => { qc.invalidateQueries({ queryKey: [`/api/peer/threads/${id}`] }); onChange(); };
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(""); try { await fn(); reload(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const send = (text?: string) => { const v = (text ?? draft).trim(); if (!v) return; run(async () => { await api(`/api/peer/threads/${id}/messages`, { body: v }); setDraft(""); }); };
  const st = statusOf({ caseStatus: c?.status || null, paymentStatus: c?.paymentStatus || null, offered: thread.offered, kind: thread.kind });
  const snap = c?.snapshot || {};
  const who = [snap.sex, snap.age != null ? `${snap.age} ans` : null, snap.phototype ? `phototype ${snap.phototype}` : null].filter(Boolean).join(", ");

  return (
    <div className="flex min-w-0 flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[14px] font-bold text-organic-accent-2-800">{other ? ini(other.name) : "?"}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-heading text-[20px] leading-tight">{other ? dr(other.name) : "Premier disponible"}</span>
          {other && <span className="truncate text-[12px] text-organic-neutral-700">{[other.city, other.country].filter(Boolean).join(", ")}{other.expertise?.length ? ` · ${other.expertise.join(", ")}` : ""}</span>}
        </span>
        <span className={`flex-none rounded-pill px-2.5 py-1 text-[12px] font-semibold ${st.tag}`}>{st.label}</span>
      </div>

      {c && (
        <div className="flex flex-col gap-2 rounded-card bg-organic-bg p-organic-4">
          <span className="text-[13px] font-bold">{c.ref} · {who || "Patient anonymisé"}</span>
          {snap.photos?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {snap.photos.map((u: string, i: number) => <img key={i} src={u} alt={`Photo ${i + 1}`} className="h-24 w-20 flex-none rounded-xl object-cover" />)}
            </div>
          )}
          {snap.treatments?.length > 0 && <span className="text-[12px] text-organic-neutral-800">{snap.treatments.join(" · ")}</span>}
          {snap.aiSuggestion && <span className="text-[12px] text-organic-neutral-800">Suggestion de l'IA (indicative) : {snap.aiSuggestion}</span>}
          {snap.examNotes && <span className="text-[12px] text-organic-neutral-800">Notes d'examen : {snap.examNotes}</span>}
          <span className="text-[13px] font-semibold">Question : {c.question}</span>
          <span className="text-[11px] text-organic-neutral-700">Nom et téléphone du patient masqués · {PEER_TIERS[c.tier as PeerTier]?.label} · {formatF(c.priceFcfa)}</span>
        </div>
      )}

      {thread.offered && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-organic-accent-100 p-organic-4">
          <span className="text-[13px] font-semibold text-organic-accent-900">
            Ce cas est proposé à plusieurs experts : le premier qui l'accepte y répond ({formatF(Math.round((c?.priceFcfa || 0) * SPLITS.peer.peer / 100))} pour vous).
          </span>
          <Button disabled={busy} onClick={() => run(() => api(`/api/peer/cases/${c.id}/accept`, {}))} data-testid="peer-accept">Accepter ce cas</Button>
        </div>
      )}

      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
        {messages.map((m: any) => m.kind === "avis" ? (
          <div key={m.id} className="flex flex-col gap-1.5 rounded-card bg-organic-accent-2-100 p-organic-4 text-[13px] text-organic-accent-2-900">
            <span className="text-[11px] font-bold uppercase tracking-[.08em]">Avis structuré · {m.mine ? "Vous" : other ? dr(other.name) : ""}</span>
            <span><b>Réponse :</b> {m.structured?.answer}</span>
            <span><b>Diagnostic retenu :</b> {m.structured?.dx}</span>
            {m.structured?.ddx && <span><b>À écarter :</b> {m.structured.ddx}</span>}
            <span><b>Conduite à tenir :</b> {m.structured?.plan}</span>
            {thread.mine && (
              <div className="mt-1 flex flex-wrap gap-2">
                <Button disabled={!!c?.integratedAt || busy} onClick={() => run(() => api(`/api/peer/cases/${c.id}/integrate`, {}))}
                  className="bg-organic-accent-2-600 text-organic-bg hover:bg-organic-accent-2-700" data-testid="peer-integrate">
                  {c?.integratedAt ? "Ajouté au compte rendu ✓" : "Intégrer à mon compte rendu"}
                </Button>
                {c?.patientId && <Link href={`/derm/patient/${c.patientId}`} className="inline-flex items-center rounded-pill px-3 text-[13px] font-bold text-organic-accent-700">Voir le compte rendu</Link>}
              </div>
            )}
          </div>
        ) : (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-card px-4 py-2.5 text-[13px] ${m.mine ? "bg-organic-accent text-organic-bg" : "bg-organic-bg"}`}>
              <span className="whitespace-pre-wrap">{m.body}</span>
              <div className="mt-1 text-[11px] opacity-75">{m.mine ? "Vous" : other ? dr(other.name) : ""} · {when(m.at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {thread.canAnswer && (
        <div className="flex flex-col gap-organic-2 rounded-card bg-organic-bg p-organic-4">
          <span className="text-[13px] font-bold">Votre avis structuré</span>
          <ProInput label="Réponse à la question" value={avis.answer} onChange={(e) => setAvis({ ...avis, answer: e.target.value })} testid="peer-avis-answer" />
          <ProInput label="Diagnostic retenu" value={avis.dx} onChange={(e) => setAvis({ ...avis, dx: e.target.value })} testid="peer-avis-dx" />
          <ProInput label="À écarter" value={avis.ddx} onChange={(e) => setAvis({ ...avis, ddx: e.target.value })} testid="peer-avis-ddx" />
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Conduite à tenir</span>
            <textarea value={avis.plan} onChange={(e) => setAvis({ ...avis, plan: e.target.value })} rows={3}
              className="min-h-[80px] resize-y rounded-2xl border border-organic-divider bg-organic-surface px-3.5 py-2.5 font-body text-[14px] outline-none focus:border-organic-accent" data-testid="peer-avis-plan" />
          </label>
          <Button disabled={busy || !avis.answer.trim() || !avis.dx.trim() || !avis.plan.trim()} className="self-start"
            onClick={() => run(async () => { await api(`/api/peer/cases/${c.id}/avis`, avis); setAvis({ answer: "", dx: "", ddx: "", plan: "" }); })} data-testid="peer-avis-send">
            Envoyer l'avis ({formatF(Math.round((c?.priceFcfa || 0) * SPLITS.peer.peer / 100))} pour vous)
          </Button>
        </div>
      )}

      {!thread.offered && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {PEER_QUICK_REPLIES.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} disabled={busy} className="cursor-pointer rounded-pill border-0 bg-organic-bg px-3 py-1.5 font-body text-[12px] font-semibold">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Écrire à votre confrère…"
              className="box-border h-11 min-w-0 flex-1 rounded-pill border border-organic-divider bg-organic-bg px-4 font-body text-[14px] outline-none focus:border-organic-accent" data-testid="peer-draft" />
            <Button onClick={() => send()} disabled={busy || !draft.trim()}>Envoyer</Button>
          </div>
        </>
      )}
      {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
    </div>
  );
}

// ── Envoyer un cas complexe (4 étapes) ──────────────────────────────────
function SendCase({ presetPatient, presetPeer, onSent, onCancel }: { presetPatient: number | null; presetPeer: number | "first" | null; onSent: (threadId: number) => void; onCancel: () => void }) {
  const { data: pData } = useProPatients("");
  const { data: dir } = useQuery<{ peers: Peer[] }>({ queryKey: ["/api/peer/directory"] });
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState<number | null>(presetPatient);
  const [sources, setSources] = useState<string[]>([]);
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [noFace, setNoFace] = useState(false);
  const [question, setQuestion] = useState("");
  const [tier, setTier] = useState<PeerTier>("simple");
  const [peer, setPeer] = useState<number | "first" | null>(presetPeer);
  const [payWith, setPayWith] = useState<"wallet" | "momo">("wallet");
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const patients = (pData?.patients || []) as any[];
  const pat = patients.find((p) => p.id === patientId);
  const peers = (dir?.peers || []).filter((p) => p.available);
  const chosen = peer === "first" ? { name: "Premier disponible" } : dir?.peers.find((p) => p.id === peer);

  // Photos du dossier (dernières analyses) à flouter.
  useEffect(() => {
    if (!patientId) return;
    setEdited({}); setNoFace(false);
    api(`/api/pro/patients/${patientId}`).then((d: any) => {
      const urls: string[] = [];
      for (const s of d?.scans || []) {
        if (s.imageUrl) urls.push(s.imageUrl);
        for (const u of (s.clinicalContext?.intakePhotos || [])) if (u && !urls.includes(u)) urls.push(u);
        if (urls.length >= 3) break;
      }
      setSources(urls.slice(0, 3));
    }).catch(() => setSources([]));
  }, [patientId]);

  const photos = sources.map((_, i) => edited[i]).filter(Boolean) as string[];
  const ok = [!!patientId, photos.length > 0 && noFace, question.trim().length >= PEER_QUESTION_MIN, !!peer][step];
  const addFile = (f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setSources((s) => [...s, String(r.result)].slice(0, 4));
    r.readAsDataURL(f);
  };

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/peer/cases", { patientId, photos, noVisibleFace: true, question: question.trim(), tier, target: peer, payWith, operatorTxnId: payWith === "momo" ? txn.trim() : null });
      onSent(d.threadId);
    } catch (e: any) {
      if (e.code === "INSUFFICIENT") { setPayWith("momo"); setErr("Solde insuffisant : payez par Mobile Money, puis saisissez l'ID de transaction."); }
      else setErr(e.message);
    } finally { setBusy(false); }
  };

  const steps = ["Dossier", "Anonymisation", "Question", "Confrère"];
  const price = PEER_TIERS[tier].priceFcfa;

  return (
    <div className="grid grid-cols-1 items-start gap-organic-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-organic-4 rounded-card bg-organic-surface p-organic-6">
        <div className="flex flex-wrap gap-1.5">
          {steps.map((l, i) => (
            <span key={l} className={`flex items-center gap-2 rounded-pill py-1.5 pl-1.5 pr-3 text-[13px] font-bold ${i === step ? "bg-organic-accent-100" : ""} ${i <= step ? "" : "text-organic-neutral-700"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] text-organic-bg ${i < step ? "bg-organic-accent-2-600" : i === step ? "bg-organic-accent" : "bg-organic-neutral-400"}`}>{i < step ? "✓" : i + 1}</span>{l}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-heading text-[20px]">Quel dossier voulez-vous partager ?</span>
            {patients.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun dossier patient.</span>}
            {patients.map((p) => (
              <button key={p.id} type="button" onClick={() => setPatientId(p.id)}
                className={`flex items-center gap-3 rounded-card border-2 bg-organic-bg p-organic-3 text-left font-body ${patientId === p.id ? "border-organic-accent" : "border-transparent"}`}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-organic-accent-200 text-[13px] font-bold text-organic-accent-800">{ini(`${p.firstName} ${p.lastName}`)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-bold">{p.firstName} {p.lastName}{p.age ? ` · ${p.age} ans` : ""}</span>
                  <span className="truncate text-[12px] text-organic-neutral-700">{p.lastCondition || "Pas encore de diagnostic"}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-organic-3">
            <span className="font-heading text-[20px]">Ce que votre confrère verra</span>
            <div className="grid gap-organic-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-card bg-organic-bg p-organic-3 text-[13px]">
                {PEER_SHARED.map((t) => <span key={t}><b className="text-organic-accent-2-700">Partagé ✓</b> {t}</span>)}
              </div>
              <div className="flex flex-col gap-1 rounded-card bg-organic-bg p-organic-3 text-[13px]">
                {PEER_HIDDEN.map((t) => <span key={t}><b className="text-organic-accent-700">Masqué automatiquement</b> — {t}</span>)}
              </div>
            </div>
            <span className="text-[13px] text-organic-neutral-800">Floutez le visage si la lésion n'est pas sur le visage : passez le doigt ou la souris sur la zone. Vous restez le médecin traitant du patient.</span>
            {sources.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucune photo dans ce dossier : ajoutez-en une.</span>}
            <div className="grid gap-organic-3 sm:grid-cols-2">
              {sources.map((src, i) => <PhotoBlurEditor key={`${i}-${src.slice(0, 40)}`} src={src} onChange={(u) => setEdited((e) => ({ ...e, [i]: u }))} />)}
            </div>
            <div>
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={sources.length >= 4}>Ajouter une photo</Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] font-semibold">
              <input type="checkbox" checked={noFace} onChange={(e) => setNoFace(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" data-testid="peer-no-face" />
              Aucun visage n'est visible sans flou sur ces photos.
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-organic-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-[20px]">Votre question</span>
              <span className="text-[12px] text-organic-neutral-700">Une question précise, à laquelle on peut répondre</span>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
                className="min-h-[90px] resize-y rounded-2xl border border-organic-divider bg-organic-bg px-3.5 py-2.5 font-body text-[14px] outline-none focus:border-organic-accent" data-testid="peer-question" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PEER_QUESTION_SUGGESTIONS.map((q) => <button key={q} type="button" className={chip(question === q)} onClick={() => setQuestion(q)}>{q}</button>)}
            </div>
            <span className="text-[13px] font-bold">Délai souhaité</span>
            <div className="grid gap-organic-2 sm:grid-cols-2">
              {(Object.keys(PEER_TIERS) as PeerTier[]).map((k) => (
                <button key={k} type="button" onClick={() => setTier(k)}
                  className={`flex flex-col gap-0.5 rounded-card border-2 bg-organic-bg p-organic-3 text-left font-body ${tier === k ? "border-organic-accent" : "border-organic-divider"}`}>
                  <span className="text-[14px] font-bold">{PEER_TIERS[k].label}</span>
                  <span className="text-[12px] text-organic-neutral-700">{PEER_TIERS[k].sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-2">
            <span className="font-heading text-[20px]">À quel confrère ?</span>
            <span className="text-[12px] text-organic-neutral-700">Classés selon leur disponibilité et leur délai de réponse.</span>
            <button type="button" onClick={() => setPeer("first")}
              className={`flex flex-col gap-0.5 rounded-card border-2 bg-organic-bg p-organic-3 text-left font-body ${peer === "first" ? "border-organic-accent" : "border-transparent"}`}>
              <span className="text-[14px] font-bold">⇄ Le premier confrère disponible</span>
              <span className="text-[12px] text-organic-neutral-700">Le plus rapide. Proposé aux 3 experts les mieux placés.</span>
            </button>
            {peers.map((p) => (
              <button key={p.id} type="button" onClick={() => setPeer(p.id)}
                className={`flex items-center gap-3 rounded-card border-2 bg-organic-bg p-organic-3 text-left font-body ${peer === p.id ? "border-organic-accent" : "border-transparent"}`}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[13px] font-bold text-organic-accent-2-800">{ini(p.name)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-bold">{dr(p.name)}</span>
                  <span className="truncate text-[12px] text-organic-neutral-700">{[p.city, p.country].filter(Boolean).join(", ")}{p.expertise.length ? ` · ${p.expertise.join(", ")}` : ""}</span>
                </span>
                <span className="flex-none text-[12px] text-organic-accent-2-700">● Disponible{p.respHours != null ? ` · répond en ${resp(p.respHours)}` : ""}</span>
              </button>
            ))}
          </div>
        )}

        {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="secondary" onClick={() => (step > 0 ? setStep(step - 1) : onCancel())}>← Retour</Button>
          {step < 3
            ? <Button onClick={() => setStep(step + 1)} disabled={!ok} data-testid="peer-next">Continuer</Button>
            : <Button onClick={submit} disabled={!ok || busy || (payWith === "momo" && txn.trim().length < 6)} data-testid="peer-send">Envoyer le cas</Button>}
        </div>
      </div>

      <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
        <span className="font-heading text-[20px]">Récapitulatif</span>
        <span className="text-[13px]"><b>Dossier :</b> {pat ? `${pat.firstName} ${pat.lastName}` : "—"}</span>
        <span className="text-[13px]"><b>Question :</b> {question.trim() || "—"}</span>
        <span className="text-[13px]"><b>Délai :</b> {tier === "urgent" ? "Urgent, sous 24 h" : "Simple, sous 48 h"}</span>
        <span className="text-[13px]"><b>Confrère :</b> {chosen ? (peer === "first" ? chosen.name : dr((chosen as Peer).name)) : "—"}</span>
        <div className="flex items-baseline justify-between gap-2 rounded-card bg-organic-bg p-organic-3">
          <span className="text-[13px]">Honoraires de l'avis</span><b className="font-heading text-[22px]">{formatF(price)}</b>
        </div>
        <span className="text-[12px] text-organic-neutral-700">
          Réservé sur votre portefeuille à l'envoi, versé au confrère à la réponse. {SPLITS.peer.peer} % pour le confrère, {SPLITS.peer.platform} % pour GlowScan. Remboursé si aucune réponse dans le délai.
        </span>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Paiement</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(payWith === "wallet")} onClick={() => setPayWith("wallet")}>Mon portefeuille</button>
            <button type="button" className={chip(payWith === "momo")} onClick={() => setPayWith("momo")}>Mobile Money</button>
          </div>
          {payWith === "momo" && (
            <>
              <span className="text-[12px] text-organic-neutral-700">Envoyez {formatF(price)} à GlowScan par Mobile Money, puis saisissez l'ID de transaction. Le cas part dès que GlowScan l'a vérifié.</span>
              <ProInput label="ID de transaction" value={txn} onChange={(e) => setTxn(e.target.value)} testid="peer-txn" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Annuaire du réseau ───────────────────────────────────────────────────
function Directory({ onSendCase, onWrite }: { onSendCase: (id: number) => void; onWrite: (id: number) => void }) {
  const { data, isLoading } = useQuery<{ peers: Peer[] }>({ queryKey: ["/api/peer/directory"] });
  const [country, setCountry] = useState("Tous");
  const [expertise, setExpertise] = useState("Toutes");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [sort, setSort] = useState<"cases" | "resp">("cases");
  const peers = data?.peers || [];
  const countries = useMemo(() => ["Tous", ...Array.from(new Set(peers.map((p) => p.country).filter(Boolean) as string[]))], [peers]);
  const expertises = useMemo(() => ["Toutes", ...Array.from(new Set(peers.flatMap((p) => p.expertise)))], [peers]);
  const list = peers
    .filter((p) => (country === "Tous" || p.country === country) && (expertise === "Toutes" || p.expertise.includes(expertise)) && (!onlyAvail || p.available))
    .sort((a, b) => (sort === "cases" ? b.cases - a.cases : (a.respHours ?? 1e9) - (b.respHours ?? 1e9)));

  return (
    <div className="flex flex-col gap-organic-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {countries.map((c) => <button key={c} type="button" className={chip(country === c)} onClick={() => setCountry(c)}>{c}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={expertise} onChange={(e) => setExpertise(e.target.value)} className="h-10 rounded-pill border border-organic-divider bg-organic-surface px-3 font-body text-[13px]" aria-label="Expertise">
          {expertises.map((x) => <option key={x} value={x}>{x === "Toutes" ? "Toutes les expertises" : x}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-10 rounded-pill border border-organic-divider bg-organic-surface px-3 font-body text-[13px]" aria-label="Trier">
          <option value="cases">Plus d'avis rendus</option>
          <option value="resp">Délai moyen le plus court</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
          <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> Disponibles seulement
        </label>
      </div>
      {isLoading && <span className="text-[14px] text-organic-neutral-700">Chargement…</span>}
      {!isLoading && list.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun confrère ne correspond à ces filtres.</span>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-organic-3">
        {list.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-card bg-organic-surface p-organic-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[14px] font-bold text-organic-accent-2-800">{ini(p.name)}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-bold">{dr(p.name)}</span>
                <span className="truncate text-[12px] text-organic-neutral-700">{[p.city, p.country].filter(Boolean).join(", ")}</span>
              </span>
            </div>
            {p.expertise.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.expertise.map((t) => <span key={t} className="rounded-pill bg-organic-bg px-2.5 py-0.5 text-[12px] font-semibold">{t}</span>)}
              </div>
            )}
            <span className="text-[12px] text-organic-neutral-700">
              {p.cases} avis rendus{p.respHours != null ? ` · répond en ${resp(p.respHours)}` : ""} · <span className={p.available ? "text-organic-accent-2-700" : ""}>{p.available ? "Disponible" : "Absent"}</span>
            </span>
            <div className="flex gap-2">
              <Button onClick={() => onSendCase(p.id)} disabled={!p.available}>Envoyer un cas</Button>
              <Button variant="secondary" onClick={() => onWrite(p.id)}>Écrire</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
