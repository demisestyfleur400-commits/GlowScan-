import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// O5 · Connecteurs : DHIS2 (étape 15, maquette « Programmes ONG »).
// Adresse de l'instance, jeton d'accès (écriture seule), data set, unité
// d'organisation, correspondance modifiable, « Tester » (essai à blanc),
// « Envoyer maintenant », fichier JSON / CSV de secours, historique.
// ════════════════════════════════════════════════════════════════════════

type Dhis2State = {
  connection: { base_url: string; token_hint: string | null; data_set_uid: string | null; org_unit_uid: string | null; org_unit_mode: "district" | "center"; auto_send: boolean; status: string; last_test_at: string | null; last_error: string | null } | null;
  mappings: { key: string; label: string; de: string; coc: string }[];
  centers: { id: number; name: string; district: string | null; uid: string | null }[];
  exports: { id: number; period: string; mode: string; status: string; values_count: number; masked_count: number; unmapped_count: number; conflicts: any[] | null; error: string | null; created_by: string; created_at: string }[];
  keyReady: boolean; defaultPeriod: string;
};
const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
const fieldCls = "box-border h-10 w-full rounded-pill border border-organic-divider bg-organic-bg px-3 font-body text-[13px] outline-none focus:border-organic-accent";
const periodLabel = (p: string) => new Date(`${p.slice(0, 4)}-${p.slice(4, 6)}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
async function call(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
  return d;
}

export function Dhis2Card({ programId }: { programId: number }) {
  const qc = useQueryClient();
  const key = `/api/program/${programId}/dhis2`;
  const { data } = useQuery<Dhis2State>({ queryKey: [key] });
  const [open, setOpen] = useState(false);
  if (!data || !Array.isArray(data.mappings)) return null;
  const c = data.connection;
  const last = data.exports.find((e) => e.mode === "import");
  const connected = !!c?.token_hint && c.status !== "error";
  return (
    <div className={card} data-testid="dhis2-card">
      <span className="text-[11px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Connecteurs</span>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-heading text-[22px]">DHIS2</span>
        <span className={`rounded-pill px-3 py-1 text-[12px] font-bold ${connected ? "bg-organic-accent-2-100 text-organic-accent-2-800" : c?.status === "error" ? "bg-organic-accent-100 text-organic-accent-900" : "bg-organic-neutral-200"}`}>
          {connected ? "Connecté" : c?.status === "error" ? "Erreur" : "Non connecté"}
        </span>
      </div>
      <span className="text-[13px] text-organic-neutral-800">
        {c?.base_url ? `Instance ${c.base_url.replace(/^https:\/\//, "")}. ` : ""}Envoi le 5 de chaque mois : cas par maladie, par sexe et tranche d'âge, orientations. Seuls des chiffres agrégés sortent ; toute valeur inférieure à 3 est masquée.
      </span>
      {last && <span className="text-[13px]">Dernier envoi : {new Date(last.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {last.values_count} valeurs · {last.status === "ok" ? "OK" : last.status === "conflicts" ? "conflits" : "erreur"}</span>}
      {c?.last_error && <span className="text-[12px] font-semibold text-organic-accent-900">{c.last_error}</span>}
      <Button variant="secondary" className="self-start" onClick={() => setOpen(!open)} data-testid="dhis2-open">{open ? "Fermer" : "Voir la correspondance"}</Button>
      {open && <Dhis2Settings programId={programId} data={data} onChange={() => qc.invalidateQueries({ queryKey: [key] })} />}
    </div>
  );
}

function Dhis2Settings({ programId, data, onChange }: { programId: number; data: Dhis2State; onChange: () => void }) {
  const c = data.connection;
  const [f, setF] = useState({ baseUrl: c?.base_url || "https://", token: "", dataSetUid: c?.data_set_uid || "", orgUnitUid: c?.org_unit_uid || "", orgUnitMode: c?.org_unit_mode || "district", autoSend: c?.auto_send ?? true });
  const [rows, setRows] = useState(data.mappings);
  const [centers, setCenters] = useState(data.centers);
  const [period, setPeriod] = useState(data.defaultPeriod);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true); setMsg(""); setResult(null);
    try { const r = await fn(); if (ok) setMsg(ok); onChange(); return r; } catch (e: any) { setMsg(e.message); return null; } finally { setBusy(false); }
  };
  const saveAll = async () => {
    await call(`/api/program/${programId}/dhis2`, { ...f, token: f.token.trim() || null });
    await call(`/api/program/${programId}/dhis2/mappings`, { rows: rows.map((r) => ({ key: r.key, de: r.de.trim(), coc: r.coc.trim() })) });
    if (f.orgUnitMode === "center") await call(`/api/program/${programId}/dhis2/centers`, { rows: centers.map((x) => ({ id: x.id, uid: (x.uid || "").trim() })) });
    setF((x) => ({ ...x, token: "" }));
  };
  const setRow = (i: number, k: "de" | "coc", v: string) => setRows((cur) => cur.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1 - i); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const status = (s: string) => (s === "ok" ? "OK" : s === "conflicts" ? "conflits" : s);

  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-bg p-organic-4" data-testid="dhis2-settings">
      {!data.keyReady && <span className="text-[13px] font-semibold text-organic-accent-900">Le chiffrement des jetons n'est pas encore activé sur le serveur : GlowScan doit l'activer avant l'enregistrement du jeton.</span>}
      <span className="text-[13px] text-organic-neutral-800">Le point focal DHIS2 du district ou du ministère vous fournit l'adresse de l'instance, un jeton d'accès personnel (DHIS2 2.38.1 ou plus) et les identifiants (UID). Testez d'abord sur l'instance de démonstration play.dhis2.org.</span>
      <div className="grid grid-cols-1 gap-organic-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px]">Adresse de l'instance<input className={fieldCls} value={f.baseUrl} onChange={(e) => setF({ ...f, baseUrl: e.target.value })} placeholder="https://dhis2.exemple.org" data-testid="dhis2-url" /></label>
        <label className="flex flex-col gap-1 text-[12px]">Jeton d'accès personnel{c?.token_hint ? ` (enregistré : ${c.token_hint})` : ""}
          <input className={fieldCls} type="password" autoComplete="off" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder={c?.token_hint ? "Laisser vide pour garder le jeton" : "d2pat_…"} data-testid="dhis2-token" /></label>
        <label className="flex flex-col gap-1 text-[12px]">Data set (UID)<input className={fieldCls} value={f.dataSetUid} onChange={(e) => setF({ ...f, dataSetUid: e.target.value })} maxLength={11} data-testid="dhis2-dataset" /></label>
        <label className="flex flex-col gap-1 text-[12px]">Unité d'organisation
          <select className={fieldCls} value={f.orgUnitMode} onChange={(e) => setF({ ...f, orgUnitMode: e.target.value as "district" | "center" })}>
            <option value="district">Le district (un UID pour tout le programme)</option><option value="center">Chaque centre de santé (son UID)</option>
          </select></label>
        {f.orgUnitMode === "district" && <label className="flex flex-col gap-1 text-[12px]">UID du district<input className={fieldCls} value={f.orgUnitUid} onChange={(e) => setF({ ...f, orgUnitUid: e.target.value })} maxLength={11} /></label>}
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.autoSend} onChange={(e) => setF({ ...f, autoSend: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Envoi automatique le 5 de chaque mois</label>
      </div>
      {f.orgUnitMode === "center" && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold">Centres de santé</span>
          {centers.length === 0 && <span className="text-[12px] text-organic-neutral-700">Aucun agent inscrit pour l'instant.</span>}
          {centers.map((x, i) => (
            <label key={x.id} className="grid grid-cols-[1fr_140px] items-center gap-2 text-[12px]">{x.name}{x.district ? ` · ${x.district}` : ""}
              <input className={fieldCls} value={x.uid || ""} maxLength={11} onChange={(e) => { const v = e.target.value; setCenters((cur) => cur.map((y, j) => (j === i ? { ...y, uid: v } : y))); }} /></label>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-bold">Correspondance</span>
        <div className="max-h-72 overflow-auto rounded-card border border-organic-divider">
          <table className="w-full min-w-[520px] border-collapse text-[12px]">
            <thead className="sticky top-0 bg-organic-surface"><tr className="text-left"><th className="p-2">Donnée GlowScan</th><th className="p-2">Data element (UID)</th><th className="p-2">Category option combo (UID)</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} className="border-t border-organic-divider">
                  <td className="p-2">{r.label}</td>
                  <td className="p-1"><input className={fieldCls} value={r.de} maxLength={11} onChange={(e) => setRow(i, "de", e.target.value)} /></td>
                  <td className="p-1"><input className={fieldCls} value={r.coc} maxLength={11} onChange={(e) => setRow(i, "coc", e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Button onClick={() => run(saveAll, "Paramètres enregistrés.")} disabled={busy} data-testid="dhis2-save">Enregistrer</Button>
        <label className="flex flex-col gap-1 text-[12px]">Mois
          <select className={fieldCls} value={period} onChange={(e) => setPeriod(e.target.value)}>{months.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}</select></label>
        <Button variant="secondary" disabled={busy} onClick={async () => { const r = await run(() => call(`/api/program/${programId}/dhis2/test`, { period })); if (r) setResult(r); }} data-testid="dhis2-test">Tester</Button>
        <Button variant="secondary" disabled={busy} onClick={async () => { if (!window.confirm(`Envoyer les chiffres de ${periodLabel(period)} à DHIS2 ?`)) return; const r = await run(() => call(`/api/program/${programId}/dhis2/send`, { period })); if (r) setResult(r); }}>Envoyer maintenant</Button>
        <a className="inline-flex h-9 items-center px-2 text-[13px] font-bold text-organic-accent-700" href={`/api/program/${programId}/dhis2/file?period=${period}&format=json`}>Fichier JSON</a>
        <a className="inline-flex h-9 items-center px-2 text-[13px] font-bold text-organic-accent-700" href={`/api/program/${programId}/dhis2/file?period=${period}&format=csv`}>Fichier CSV</a>
      </div>
      {msg && <span className="text-[13px] font-semibold">{msg}</span>}
      {result && (
        <div className="rounded-card bg-organic-surface p-organic-3 text-[13px]" data-testid="dhis2-result">
          <b>{result.mode === "dry_run" ? "Essai" : "Envoi"} · {status(result.status)}</b> · {result.values} valeurs{result.masked ? ` · ${result.masked} masquée(s) (moins de 3)` : ""}{result.unmapped ? ` · ${result.unmapped} cas sans correspondance` : ""}
          {result.importCount && <div>Importées {result.importCount.imported ?? 0} · mises à jour {result.importCount.updated ?? 0} · ignorées {result.importCount.ignored ?? 0}</div>}
          {result.conflicts?.length > 0 && <ul className="m-0 mt-1 pl-5">{result.conflicts.slice(0, 5).map((x: any, i: number) => <li key={i}>{x.object} : {x.value}</li>)}</ul>}
        </div>
      )}
      {data.exports.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold">Historique</span>
          {data.exports.map((e) => (
            <span key={e.id} className="text-[12px]">{new Date(e.created_at).toLocaleDateString("fr-FR")} · {periodLabel(e.period)} · {e.mode === "dry_run" ? "essai" : e.mode === "import" ? "envoi" : "fichier"} · {e.values_count} valeurs · {e.status === "error" ? `erreur${e.error ? ` : ${e.error}` : ""}` : e.status === "conflicts" ? `${e.conflicts?.length || 0} conflit(s)` : "OK"}{e.created_by === "cron" ? " · automatique" : ""}</span>
          ))}
        </div>
      )}
    </div>
  );
}
