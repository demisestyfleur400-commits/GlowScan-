import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// /admin › Programmes · Partenaires API (étape 16). La clé et le secret de
// webhook ne s'affichent qu'une seule fois, à la création (ou rotation).
// ════════════════════════════════════════════════════════════════════════

type DS = { surface: string; text: string; body: string; muted: string; border: string; violet: string };
type Partner = { id: number; name: string; kind: string; program: string; key_prefix: string; webhook_url: string | null; rate_limit_per_min: number; active: boolean; last_used_at: string | null; cases: number; failed_webhooks: number };

export function ApiPartnersSection({ adminKey, DS, programs }: { adminKey: string; DS: DS; programs: { id: number; name: string }[] }) {
  const [items, setItems] = useState<Partner[]>([]);
  const [f, setF] = useState({ name: "", kind: "telemed", programId: "", webhookUrl: "" });
  const [secret, setSecret] = useState<{ apiKey: string; webhookSecret?: string | null } | null>(null);
  const [log, setLog] = useState<{ id: number; rows: any[] } | null>(null);
  const [msg, setMsg] = useState("");
  const call = async (url: string, method = "GET", body?: unknown) => {
    const r = await fetch(url, { method, headers: { "x-admin-key": adminKey, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.message || "Erreur");
    return d;
  };
  const load = async () => { try { setItems((await call("/api/admin/api-partners")).items || []); } catch { setItems([]); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminKey]);
  const box = { background: DS.surface, border: `1px solid ${DS.border}` };
  const input = { background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}`, color: DS.text, borderRadius: 12, padding: "8px 10px", fontSize: 13 };
  const btn = (bg: string) => ({ background: bg, color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" });

  const create = async () => {
    setMsg("");
    try {
      const d = await call("/api/admin/api-partners", "POST", { name: f.name.trim(), kind: f.kind, programId: Number(f.programId), webhookUrl: f.webhookUrl.trim() || null });
      setSecret({ apiKey: d.apiKey, webhookSecret: d.webhookSecret });
      setF({ name: "", kind: "telemed", programId: "", webhookUrl: "" });
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="rounded-2xl p-4 space-y-3" style={box}>
      <p className="text-sm font-extrabold" style={{ color: DS.text }}>Partenaires API ({items.length})</p>
      <p className="text-xs" style={{ color: DS.muted }}>Chaque partenaire est rattaché à un programme : ses cas sont débités du budget prépayé. Documentation : glow-scan.com/developpeurs.</p>
      {secret && (
        <div className="rounded-xl p-3 space-y-1 text-xs" style={{ background: "#064e3b", color: "#d1fae5" }}>
          <b>À transmettre au partenaire maintenant : ces valeurs ne seront plus jamais affichées.</b>
          <div>Clé API : <code style={{ userSelect: "all" }}>{secret.apiKey}</code></div>
          {secret.webhookSecret && <div>Secret de webhook : <code style={{ userSelect: "all" }}>{secret.webhookSecret}</code></div>}
          <button onClick={() => setSecret(null)} className="underline">J'ai copié</button>
        </div>
      )}
      <div className="grid sm:grid-cols-4 gap-2">
        <input style={input} placeholder="Nom du partenaire" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select style={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="telemed">Télémédecine</option><option value="bogou">Bogou</option><option value="hospital">Hôpital</option><option value="ministry">Ministère</option><option value="other">Autre</option>
        </select>
        <select style={input} value={f.programId} onChange={(e) => setF({ ...f, programId: e.target.value })}>
          <option value="">Programme (budget)</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input style={input} placeholder="Webhook https:// (facultatif)" value={f.webhookUrl} onChange={(e) => setF({ ...f, webhookUrl: e.target.value })} />
      </div>
      <button onClick={create} disabled={f.name.trim().length < 2 || !f.programId} style={btn("#10b981")}>Créer le partenaire et sa clé</button>
      {msg && <p className="text-xs" style={{ color: "#f43f5e" }}>{msg}</p>}
      {items.map((p) => (
        <div key={p.id} className="space-y-1 text-sm" style={{ color: DS.body }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span><b style={{ color: DS.text }}>{p.name}</b> · {p.program} · clé {p.key_prefix}… · {p.cases} cas{p.failed_webhooks ? ` · ${p.failed_webhooks} webhook(s) en échec` : ""}{p.last_used_at ? ` · dernier appel ${new Date(p.last_used_at).toLocaleDateString("fr-FR")}` : ""}{p.active ? "" : " · révoqué"}</span>
            <span className="flex gap-1.5">
              <button onClick={async () => { if (!window.confirm("Générer une nouvelle clé ? L'ancienne cessera de fonctionner immédiatement.")) return; try { const d = await call(`/api/admin/api-partners/${p.id}/rotate`, "POST", {}); setSecret({ apiKey: d.apiKey }); load(); } catch (e: any) { setMsg(e.message); } }} style={btn("#475569")}>Nouvelle clé</button>
              <button onClick={async () => { await call(`/api/admin/api-partners/${p.id}/active`, "POST", { active: !p.active }).catch(() => {}); load(); }} style={btn(p.active ? "#b91c1c" : "#10b981")}>{p.active ? "Révoquer" : "Réactiver"}</button>
              <button onClick={async () => { const d = await call(`/api/admin/api-partners/${p.id}/log`).catch(() => ({ items: [] })); setLog(log?.id === p.id ? null : { id: p.id, rows: d.items || [] }); }} style={btn("#2563eb")}>Journal</button>
            </span>
          </div>
          {log?.id === p.id && (
            <div className="text-xs max-h-48 overflow-auto" style={{ color: DS.muted }}>
              {log.rows.length === 0 ? "Aucun appel." : log.rows.map((r: any, i: number) => <div key={i}>{new Date(r.created_at).toLocaleString("fr-FR")} · {r.method} {r.path} · {r.status}</div>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
