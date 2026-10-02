import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// O5 · Connecteurs (étape 16, maquette « Programmes ONG ») : Bogou (RAFT) et
// « Autres plateformes » (API ouverte). Chiffres réels uniquement.
// ════════════════════════════════════════════════════════════════════════

type Connectors = { bogouEmail: string; bogouShared: number; bogouImported: number; partners: { name: string; kind: string; active: boolean; cases: number }[] };
const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
const KIND: Record<string, string> = { bogou: "Bogou", telemed: "Télémédecine", hospital: "Hôpital", ministry: "Ministère", other: "Autre" };

export function ConnectorCards({ programId }: { programId: number }) {
  const qc = useQueryClient();
  const key = `/api/program/${programId}/connectors`;
  const { data } = useQuery<Connectors>({ queryKey: [key] });
  const [email, setEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  if (!data || !Array.isArray(data.partners)) return null;
  const save = async () => {
    setMsg("");
    const r = await fetch(`/api/program/${programId}/bogou`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: (email ?? data.bogouEmail).trim() }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Adresse enregistrée." : d?.message || "Erreur");
    if (r.ok) { setEmail(null); qc.invalidateQueries({ queryKey: [key] }); }
  };
  return (
    <>
      <div className={card} data-testid="bogou-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-[22px]">Bogou (RAFT)</span>
          <span className={`rounded-pill px-3 py-1 text-[12px] font-bold ${data.bogouEmail ? "bg-organic-accent-2-100 text-organic-accent-2-800" : "bg-organic-neutral-200"}`}>{data.bogouEmail ? "Actif" : "À paramétrer"}</span>
        </div>
        <span className="text-[13px] text-organic-neutral-800">Un cas peut être envoyé aussi vers un cercle Bogou, ou reçu depuis Bogou. Le dossier part en PDF + photos.</span>
        <span className="text-[13px]">{data.bogouShared} cas partagé{data.bogouShared > 1 ? "s" : ""} ce trimestre{data.bogouImported ? ` · ${data.bogouImported} reçu${data.bogouImported > 1 ? "s" : ""} de Bogou` : ""}</span>
        <label className="flex flex-col gap-1 text-[12px]">Adresse email du cercle Bogou
          <input value={email ?? data.bogouEmail} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="cercle@bogou.org"
            className="box-border h-10 w-full rounded-pill border border-organic-divider bg-organic-bg px-3 font-body text-[13px] outline-none focus:border-organic-accent" data-testid="bogou-email" />
        </label>
        <Button variant="secondary" className="self-start" onClick={save} disabled={email === null}>Paramétrer</Button>
        {msg && <span className="text-[13px] font-semibold">{msg}</span>}
      </div>
      <div className={card} data-testid="api-card">
        <span className="font-heading text-[22px]">Autres plateformes</span>
        <span className="text-[13px] text-organic-neutral-800">Connexion ouverte (API) pour tout réseau de télémédecine, hôpital ou ministère : envoi et réception de cas, résultats, statistiques. Même format pour tous.</span>
        {data.partners.length === 0
          ? <span className="text-[13px]">Aucune plateforme connectée à ce programme. GlowScan crée la clé d'accès du partenaire sur demande.</span>
          : data.partners.map((p) => <span key={p.name} className="text-[13px]"><b>{p.name}</b> · {KIND[p.kind] || p.kind} · {p.cases} cas{p.active ? "" : " · suspendu"}</span>)}
        <a href="/developpeurs" target="_blank" rel="noopener noreferrer" className="self-start text-[13px] font-bold text-organic-accent-700">Documentation de l'API</a>
      </div>
    </>
  );
}
