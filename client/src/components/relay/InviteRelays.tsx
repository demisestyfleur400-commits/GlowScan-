import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProInput } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// Invitations des relais (étape 10) : lien personnel + QR (dermatologue, qui
// devient parrain), SMS, et import CSV d'une liste d'agents (ONG).
// ════════════════════════════════════════════════════════════════════════

async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
  return d;
}

// Inviter un relais (étape 10) : lien personnel et QR code (parrainage automatique), ou SMS.
export function InviteRelays({ programId }: { programId?: number }) {
  const qc = useQueryClient();
  const key = programId ? `/api/relay-invitations?programId=${programId}` : "/api/relay-invitations";
  const { data } = useQuery<{ items: any[]; link: string | null; qr: string | null }>({ queryKey: [key] });
  const [f, setF] = useState({ phone: "", name: "", center: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const send = async () => {
    setBusy(true); setMsg("");
    try {
      const d = await post("/api/relay-invitations", { ...f, programId });
      setMsg(d.created ? (d.sent ? "Invitation envoyée par SMS." : "Invitation créée ; le SMS n'a pas pu partir, réessayez plus tard.") : `Numéro refusé : ${(d.invalid || []).join(", ")}`);
      if (d.created) setF({ phone: "", name: "", center: "" });
      qc.invalidateQueries({ queryKey: [key] });
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };
  const statusLabel = (i: any) => (i.status === "accepted" ? "Inscrit" : i.expired || i.status === "expired" ? "Expirée" : "Envoyée");
  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6" data-testid="invite-relays">
      <h3 className="m-0 text-[22px]">{programId ? "Inviter des agents" : "Inviter un relais"}</h3>
      {data?.link && (
        <div className="flex flex-wrap items-center gap-organic-3">
          {data.qr && <img src={data.qr} alt="QR code de votre lien d'invitation" className="h-24 w-24 rounded-xl" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[13px] text-organic-neutral-800">Votre lien personnel : le relais qui s'inscrit avec lui est parrainé par vous.</span>
            <input readOnly value={data.link} onFocus={(e) => e.target.select()} className="box-border h-10 w-full rounded-pill border border-organic-divider bg-organic-bg px-3 font-body text-[12px]" />
            <Button variant="secondary" size="sm" className="self-start" onClick={() => { navigator.clipboard?.writeText(data.link!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>
              {copied ? "Lien copié" : "Copier le lien"}
            </Button>
          </div>
        </div>
      )}
      <span className="text-[13px] font-semibold">Ou par SMS</span>
      <div className="grid grid-cols-1 gap-organic-2 sm:grid-cols-3">
        <ProInput label="Téléphone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="+237 6XX XX XX XX" testid="invite-phone" />
        <ProInput label="Nom (facultatif)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <ProInput label="Centre (facultatif)" value={f.center} onChange={(e) => setF({ ...f, center: e.target.value })} />
      </div>
      <Button onClick={send} disabled={busy || f.phone.replace(/\D/g, "").length < 9} className="self-start" data-testid="invite-send">Envoyer l'invitation</Button>
      {msg && <span className="text-[13px] font-semibold">{msg}</span>}
      {(data?.items || []).length > 0 && (
        <div className="flex flex-col gap-1">
          {(data?.items || []).slice(0, 8).map((i) => (
            <span key={i.id} className="flex justify-between gap-2 text-[12px] text-organic-neutral-800">
              <span className="truncate">{i.name || i.phone}{i.center ? ` · ${i.center}` : ""}</span>
              <span className="flex-none font-semibold">{statusLabel(i)}</span>
            </span>
          ))}
          <span className="text-[11px] text-organic-neutral-700">Relances automatiques à J+2 et J+7 ; le lien expire après 14 jours.</span>
        </div>
      )}
    </div>
  );
}


/** CSV « nom ; téléphone ; centre » (séparateur , ou ;, ligne d'en-tête facultative). */
export function parseAgentsCsv(text: string): { name: string; phone: string; center: string }[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((l) => l.split(l.includes(";") ? ";" : ",").map((c) => c.trim().replace(/^"|"$/g, "")));
  const out: { name: string; phone: string; center: string }[] = [];
  for (const r of rows) {
    const phoneIdx = r.findIndex((c) => c.replace(/\D/g, "").length >= 9);
    if (phoneIdx < 0) continue; // en-tête ou ligne sans téléphone
    const rest = r.filter((_, i) => i !== phoneIdx);
    out.push({ phone: r[phoneIdx], name: rest[0] || "", center: rest[1] || "" });
  }
  return out;
}

/** Excel → CSV (première feuille), avec SheetJS chargé depuis cdnjs seulement quand il sert. */
async function excelToCsv(file: File): Promise<string> {
  const w = window as any;
  if (!w.XLSX) {
    await new Promise<void>((ok, ko) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload = () => ok(); sc.onerror = () => ko(new Error("SheetJS"));
      document.head.appendChild(sc);
    });
  }
  const wb = w.XLSX.read(await file.arrayBuffer(), { type: "array" });
  return w.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: ";" });
}

export function CsvInvite({ programId }: { programId: number }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<{ name: string; phone: string; center: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = async (file: File) => {
    setMsg("");
    let text = "";
    if (/\.csv$/i.test(file.name)) text = await file.text();
    else if (/\.xlsx?$/i.test(file.name)) {
      try { text = await excelToCsv(file); } catch { setMsg("Fichier Excel illisible. Enregistrez-le en CSV et réessayez."); return; }
    } else { setMsg("Choisissez un fichier CSV ou Excel (.xlsx)."); return; }
    const r = parseAgentsCsv(text);
    if (!r.length) { setMsg("Aucune ligne avec un numéro de téléphone."); return; }
    if (r.length > 300) { setMsg("300 agents au maximum par import."); return; }
    setRows(r);
  };
  const send = async () => {
    if (!rows) return;
    setBusy(true); setMsg("");
    try {
      const d = await post("/api/relay-invitations", { programId, rows });
      setMsg(`${d.created} invitation(s) créée(s), ${d.sent} SMS envoyé(s).${d.invalid?.length ? ` Refusés : ${d.invalid.join(", ")}.` : ""}`);
      setRows(null);
      qc.invalidateQueries({ queryKey: [`/api/relay-invitations?programId=${programId}`] });
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-organic-2 rounded-card bg-organic-surface p-organic-6" data-testid="csv-invite">
      <span className="font-heading text-[20px]">Importer un fichier (CSV, Excel)</span>
      <span className="text-[13px] text-organic-neutral-800">Une ligne par agent : nom, téléphone, centre de santé. Chaque agent reçoit une invitation par SMS.</span>
      <Button variant="secondary" className="self-start" onClick={() => ref.current?.click()}>Choisir le fichier</Button>
      <input ref={ref} type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
      {rows && (
        <>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-card bg-organic-bg p-organic-3 text-[12px]">
            {rows.map((r, i) => <span key={i} className="truncate">{r.name || "—"} · {r.phone} · {r.center || "—"}</span>)}
          </div>
          <Button onClick={send} disabled={busy} className="self-start" data-testid="csv-send">Inviter {rows.length} agent{rows.length > 1 ? "s" : ""}</Button>
        </>
      )}
      {msg && <span className="text-[13px] font-semibold">{msg}</span>}
    </div>
  );
}
