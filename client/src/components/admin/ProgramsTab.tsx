import { useEffect, useState } from "react";
import { PilotageView, type ProgramDashboard } from "@/components/pro/PilotageView";
import { buildProgramReportHtml, buildProgramReportPdf } from "@/lib/programReport";

// ════════════════════════════════════════════════════════════════════════
// /admin › Programmes (étape 6) : vue fondateur (argent et plateforme),
// programmes ONG (budget, email du bailleur, relais et comptes ONG rattachés),
// aperçu du tableau de bord, rapport mensuel RELU puis envoyé au bailleur.
// Style sombre de /admin ; l'aperçu reprend exactement l'écran de l'ONG.
// ════════════════════════════════════════════════════════════════════════

type DS = { surface: string; text: string; body: string; muted: string; border: string; violet: string };
type Program = {
  id: number; name: string; funder: string | null; district: string | null; budget_fcfa: number; funder_email: string | null; status: string; used: number;
  relays: { id: number; name: string; city: string | null; share: boolean }[] | null;
  managers: { id: number; name: string }[] | null;
  reports: { month: string; sentAt: string; sentTo: string }[] | null;
};
type Founder = {
  collected: number; platformShare: number; refunded: number; paidToDerms: number; paidToRelays: number;
  programs: { id: number; name: string; total: number; used: number }[];
  transactions: { source_id: string; type: string; operator_txn_id: string | null; gross_fcfa: number; amount_fcfa: number; status: string; created_at: string }[];
};

const fcfa = (n: number) => `${(n || 0).toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;
const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); };
const monthLabel = (k: string) => new Date(`${k}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const TX_STATUS: Record<string, string> = { escrow: "Bloqué", available: "Acquis", refunded: "Remboursé" };
const TX_KIND: Record<string, string> = { consultation: "Consultation B2C", relay_review: "Avis relais", subscription: "Abonnement" };

export function ProgramsTab({ adminKey, DS }: { adminKey: string; DS: DS }) {
  const [founder, setFounder] = useState<Founder | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [form, setForm] = useState({ name: "", funder: "", district: "", budgetFcfa: "", funderEmail: "" });
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const call = async (url: string, method = "GET", body?: unknown) => {
    const r = await fetch(url, { method, headers: { "x-admin-key": adminKey, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.message || "Action impossible");
    return d;
  };
  const load = async () => {
    try { setFounder(await call("/api/admin/founder")); } catch {}
    try { setPrograms((await call("/api/admin/programs")).programs || []); } catch {}
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adminKey]);

  const create = async () => {
    setMsg("");
    try {
      await call("/api/admin/programs", "POST", { ...form, budgetFcfa: parseInt(form.budgetFcfa || "0", 10) || 0 });
      setForm({ name: "", funder: "", district: "", budgetFcfa: "", funderEmail: "" }); load();
    } catch (e: any) { setMsg(e.message); }
  };

  const box = { background: DS.surface, border: `1px solid ${DS.border}` };
  const input = "w-full px-3 py-2 rounded-xl text-sm outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}`, color: DS.text };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-extrabold" style={{ color: DS.text }}>Argent et plateforme</h3>
      {founder && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[["Encaissé", founder.collected], ["Versé aux dermatologues", founder.paidToDerms], ["Versé aux relais", founder.paidToRelays], ["Part GlowScan", founder.platformShare], ["Remboursé", founder.refunded]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl p-4" style={box}>
                <p className="text-xs" style={{ color: DS.muted }}>{l}</p>
                <p className="text-lg font-extrabold" style={{ color: DS.text }}>{fcfa(v as number)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-4 space-y-1.5" style={box}>
            <p className="text-sm font-extrabold" style={{ color: DS.text }}>Transactions <span className="font-normal text-xs" style={{ color: DS.muted }}>références uniquement, aucune donnée médicale</span></p>
            {founder.transactions.length === 0 && <p className="text-xs" style={{ color: DS.muted }}>Aucune transaction.</p>}
            {founder.transactions.map((t) => (
              <div key={`${t.type}-${t.source_id}`} className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: DS.body }}>
                <span><b style={{ color: DS.text }}>{t.operator_txn_id || t.source_id}</b> · {new Date(t.created_at).toLocaleDateString("fr-FR")} · {TX_KIND[t.type] || t.type}</span>
                <span>{fcfa(t.gross_fcfa)} · GlowScan {fcfa(t.amount_fcfa)} · {TX_STATUS[t.status] || t.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="text-lg font-extrabold pt-2" style={{ color: DS.text }}>Programmes ONG</h3>
      <div className="rounded-2xl p-4 space-y-2" style={box}>
        <p className="text-sm font-extrabold" style={{ color: DS.text }}>Nouveau programme</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {([["name", "Nom du programme"], ["funder", "Bailleur (ex. Fondation Sahel Santé)"], ["district", "District / région"], ["budgetFcfa", "Budget (FCFA)"], ["funderEmail", "Email du bailleur (rapport mensuel)"]] as const).map(([k, ph]) => (
            <input key={k} className={input} style={inputStyle} placeholder={ph} value={(form as any)[k]}
              onChange={(e) => setForm({ ...form, [k]: k === "budgetFcfa" ? e.target.value.replace(/\D/g, "") : e.target.value })} />
          ))}
        </div>
        {msg && <p className="text-xs" style={{ color: "#f43f5e" }}>{msg}</p>}
        <button onClick={create} disabled={!form.name.trim()} className="px-4 py-2 rounded-xl text-xs font-extrabold text-white disabled:opacity-40" style={{ background: DS.violet }}>Créer le programme</button>
      </div>

      {programs.map((p) => (
        <ProgramCard key={p.id} p={p} DS={DS} call={call} reload={load} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
      ))}
    </div>
  );
}

function ProgramCard({ p, DS, call, reload, expanded, onToggle }: {
  p: Program; DS: DS; call: (u: string, m?: string, b?: unknown) => Promise<any>; reload: () => void; expanded: boolean; onToggle: () => void;
}) {
  const [edit, setEdit] = useState({ name: p.name, funder: p.funder || "", district: p.district || "", budgetFcfa: String(p.budget_fcfa || ""), funderEmail: p.funder_email || "", status: p.status });
  const [relayEmail, setRelayEmail] = useState("");
  const [ngoEmail, setNgoEmail] = useState("");
  const [range, setRange] = useState("1m");
  const [dash, setDash] = useState<ProgramDashboard | null>(null);
  const [month, setMonth] = useState(prevMonth());
  const [report, setReport] = useState<{ d: ProgramDashboard; html: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { if (expanded) call(`/api/admin/programs/${p.id}/dashboard?range=${range}`).then(setDash).catch(() => setDash(null)); }, [expanded, range]);

  const act = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true); setMsg("");
    try { await fn(); if (ok) setMsg(ok); reload(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };
  const box = { background: DS.surface, border: `1px solid ${DS.border}` };
  const input = "w-full px-3 py-2 rounded-xl text-sm outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}`, color: DS.text };
  const btn = "px-3 py-1.5 rounded-xl text-xs font-extrabold text-white disabled:opacity-40";
  const pct = p.budget_fcfa ? Math.min(100, Math.round((p.used / p.budget_fcfa) * 100)) : 0;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={box}>
      <button onClick={onToggle} className="w-full flex flex-wrap items-center justify-between gap-2 text-left">
        <span>
          <span className="text-sm font-extrabold" style={{ color: DS.text }}>{p.name}</span>
          <span className="text-xs ml-2" style={{ color: DS.muted }}>{[p.funder, p.district].filter(Boolean).join(" · ")}{p.status === "paused" ? " · suspendu" : ""}</span>
        </span>
        <span className="text-xs" style={{ color: DS.body }}>
          {p.budget_fcfa ? `${fcfa(p.used)} / ${fcfa(p.budget_fcfa)} (${pct} %)` : "budget non renseigné"} · {(p.relays || []).length} relais · {(p.managers || []).length} compte(s) ONG
        </span>
      </button>

      {expanded && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-2">
            {([["name", "Nom"], ["funder", "Bailleur"], ["district", "District"], ["budgetFcfa", "Budget (FCFA)"], ["funderEmail", "Email du bailleur"]] as const).map(([k, ph]) => (
              <input key={k} className={input} style={inputStyle} placeholder={ph} value={(edit as any)[k]}
                onChange={(e) => setEdit({ ...edit, [k]: k === "budgetFcfa" ? e.target.value.replace(/\D/g, "") : e.target.value })} />
            ))}
            <select className={input} style={inputStyle} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="active">Actif</option><option value="paused">Suspendu</option>
            </select>
          </div>
          <button disabled={busy} className={btn} style={{ background: DS.violet }}
            onClick={() => act(() => call(`/api/admin/programs/${p.id}`, "PATCH", { ...edit, budgetFcfa: parseInt(edit.budgetFcfa || "0", 10) || 0 }), "Programme enregistré.")}>Enregistrer</button>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-extrabold" style={{ color: DS.text }}>Relais du programme</p>
              {(p.relays || []).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs" style={{ color: DS.body }}>
                  <span>{r.name}{r.city ? ` · ${r.city}` : ""} · {r.share ? "partage sa progression" : "progression privée"}</span>
                  <button className="underline" onClick={() => act(() => call(`/api/admin/programs/${p.id}/members/${r.id}`, "DELETE"))}>Retirer</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input className={input} style={inputStyle} placeholder="Email du compte relais" value={relayEmail} onChange={(e) => setRelayEmail(e.target.value)} />
                <button disabled={busy || !relayEmail.includes("@")} className={btn} style={{ background: "#10b981" }}
                  onClick={() => act(() => call(`/api/admin/programs/${p.id}/members`, "POST", { email: relayEmail }).then(() => setRelayEmail("")))}>Ajouter</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-extrabold" style={{ color: DS.text }}>Comptes ONG (lecture du tableau de bord)</p>
              {(p.managers || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs" style={{ color: DS.body }}>
                  <span>{m.name}</span>
                  <button className="underline" onClick={() => act(() => call(`/api/admin/programs/${p.id}/managers/${m.id}`, "DELETE"))}>Retirer</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input className={input} style={inputStyle} placeholder="Email du compte ONG" value={ngoEmail} onChange={(e) => setNgoEmail(e.target.value)} />
                <button disabled={busy || !ngoEmail.includes("@")} className={btn} style={{ background: "#10b981" }}
                  onClick={() => act(() => call(`/api/admin/programs/${p.id}/managers`, "POST", { email: ngoEmail }).then(() => setNgoEmail("")))}>Ajouter</button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DS.border}` }}>
            <p className="text-xs font-extrabold" style={{ color: DS.text }}>Rapport mensuel au bailleur</p>
            <div className="flex flex-wrap items-center gap-2">
              <input type="month" className="px-3 py-2 rounded-xl text-sm" style={inputStyle} value={month} onChange={(e) => setMonth(e.target.value)} />
              <button disabled={busy} className={btn} style={{ background: DS.violet }}
                onClick={() => act(async () => { const d = await call(`/api/admin/programs/${p.id}/dashboard?range=${month}`); setReport({ d, html: buildProgramReportHtml(d, monthLabel(month)) }); })}>
                Générer et relire
              </button>
              {report && (
                <button disabled={busy || !edit.funderEmail.includes("@")} className={btn} style={{ background: "#10b981" }}
                  onClick={() => act(async () => {
                    const pdfBase64 = await buildProgramReportPdf(report.d, monthLabel(month));
                    const r = await call(`/api/admin/programs/${p.id}/report`, "POST", { month, pdfBase64 });
                    setReport(null);
                    setMsg(`Rapport envoyé à ${r.sentTo}.`);
                  })}>
                  Envoyer au bailleur{edit.funderEmail ? ` (${edit.funderEmail})` : ""}
                </button>
              )}
            </div>
            {!edit.funderEmail.includes("@") && <p className="text-xs" style={{ color: "#fbbf24" }}>Renseignez l'email du bailleur puis enregistrez pour pouvoir envoyer.</p>}
            {(p.reports || []).slice(0, 6).map((r) => (
              <p key={`${r.month}-${r.sentAt}`} className="text-xs" style={{ color: DS.muted }}>{monthLabel(r.month)} · envoyé le {new Date(r.sentAt).toLocaleDateString("fr-FR")} à {r.sentTo}</p>
            ))}
            {report && <div className="overflow-auto rounded-xl" style={{ maxHeight: 520 }} dangerouslySetInnerHTML={{ __html: report.html }} />}
          </div>

          {msg && <p className="text-xs" style={{ color: DS.body }}>{msg}</p>}

          <div className="rounded-2xl bg-organic-bg p-4 text-organic-text">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.1em] text-organic-accent-700">Aperçu : ce que voit le compte ONG</p>
            {dash ? <PilotageView d={dash} range={range} onRange={setRange} /> : <p className="text-sm">Chargement…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
