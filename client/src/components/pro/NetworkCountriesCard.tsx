import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { NETWORK_COUNTRIES } from "@shared/peer";

// ════════════════════════════════════════════════════════════════════════
// D1 · Dermatologue · pays où j'exerce (maquette « Programmes ONG »).
// Télé-expertise ouverte à tous les pays du réseau ; consultation directe
// seulement dans les pays où l'autorisation est vérifiée par GlowScan.
// ════════════════════════════════════════════════════════════════════════

type Settings = {
  languages: ("fr" | "en")[]; dailyCap: number; country: string;
  licenses: { id: number; country: string; kind: "home" | "authorization"; status: "pending" | "verified" | "rejected"; reject_reason: string | null; has_doc: boolean }[];
};
const STATUS = { verified: "Vérifié", pending: "Document envoyé", rejected: "À reprendre" } as const;
const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;
const toDataUrl = (f: File) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(f); });

export function NetworkCountriesCard() {
  const { data, refetch } = useQuery<Settings>({ queryKey: ["/api/pro/network-settings"] });
  const [adding, setAdding] = useState(false);
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  if (!data) return null;

  const post = async (url: string, body: unknown) => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
      await refetch();
      return true;
    } catch (e: any) { setMsg(e.message); return false; } finally { setBusy(false); }
  };
  const save = (patch: Partial<Pick<Settings, "languages" | "dailyCap">>) => post("/api/pro/network-settings", { languages: patch.languages ?? data.languages, dailyCap: patch.dailyCap ?? data.dailyCap });
  const toggleLang = (l: "fr" | "en") => {
    const next = data.languages.includes(l) ? data.languages.filter((x) => x !== l) : [...data.languages, l];
    if (next.length) save({ languages: next });
  };
  const upload = async (f?: File | null) => {
    if (!f || !country) return;
    if (f.size > 6_000_000) { setMsg("Fichier trop lourd (6 Mo au maximum)."); return; }
    if (await post("/api/pro/licenses", { country, document: await toDataUrl(f) })) { setAdding(false); setCountry(""); setMsg("Justificatif envoyé : GlowScan le vérifie."); }
  };
  const available = NETWORK_COUNTRIES.filter((c) => !data.licenses.some((l) => l.country === c && l.status !== "rejected"));

  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6" data-testid="network-countries">
      <div className="flex flex-col">
        <span className="text-[11px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Réseau entre pays</span>
        <span className="font-heading text-[22px]">Pays où j'exerce</span>
      </div>
      <div className="flex flex-col gap-0.5 rounded-card bg-organic-bg p-organic-3">
        <span className="text-[14px] font-bold">Télé-expertise (avis à un soignant)</span>
        <span className="text-[13px] text-organic-neutral-800">Tous les pays du réseau · le soignant local reste responsable du patient</span>
      </div>
      <div className="flex flex-col gap-2 rounded-card bg-organic-bg p-organic-3">
        <span className="text-[14px] font-bold">Consultation directe au patient</span>
        {data.licenses.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span>{l.country} · {l.kind === "home" ? "ONMC" : "autorisation"}</span>
            <span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${l.status === "verified" ? "bg-organic-accent-2-100 text-organic-accent-2-800" : l.status === "rejected" ? "bg-organic-accent-100 text-organic-accent-900" : "bg-organic-neutral-200"}`}>
              {STATUS[l.status]}{l.status === "rejected" && l.reject_reason ? ` : ${l.reject_reason}` : ""}
            </span>
          </div>
        ))}
        {adding ? (
          <div className="flex flex-col gap-2">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 rounded-pill border border-organic-divider bg-organic-surface px-3 font-body text-[14px]" aria-label="Pays" data-testid="license-country">
              <option value="">Choisir le pays</option>
              {available.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => fileRef.current?.click()} disabled={!country || busy}>Envoyer le justificatif</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Annuler</Button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="cursor-pointer self-start border-0 bg-transparent p-0 font-body text-[13px] font-bold text-organic-accent-700" data-testid="license-add">
            + Ajouter un pays <span className="font-normal text-organic-neutral-700">· justificatif requis</span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">Langues</span>
        <div className="flex flex-wrap gap-1.5">
          {([["fr", "Français"], ["en", "Anglais"]] as const).map(([k, l]) => <button key={k} type="button" disabled={busy} className={chip(data.languages.includes(k))} onClick={() => toggleLang(k)}>{l}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">Avis de réseau par jour</span>
        <div className="flex flex-wrap gap-1.5">
          {[5, 10, 20].map((n) => <button key={n} type="button" disabled={busy} className={chip(data.dailyCap === n)} onClick={() => save({ dailyCap: n })} data-testid={`cap-${n}`}>{n}</button>)}
        </div>
      </div>
      {msg && <span className="text-[13px] font-semibold">{msg}</span>}
    </div>
  );
}
