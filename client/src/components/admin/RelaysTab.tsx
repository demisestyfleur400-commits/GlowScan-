import { useEffect, useState } from "react";
import { professionLabel } from "@shared/relayOnboarding";

// ════════════════════════════════════════════════════════════════════════
// /admin › Relais (étape 10) : cartes professionnelles à vérifier (recto +
// selfie, chargés avec la clé admin, jamais d'URL publique), parrainage
// GlowScan après l'appel au centre de santé pour les inscriptions libres.
// ════════════════════════════════════════════════════════════════════════

type DS = { surface: string; text: string; body: string; muted: string; border: string; violet: string };
type Relay = {
  id: number; full_name: string; phone: string | null; profession: string; center: string | null; district: string | null; country: string | null;
  status: string; card_status: string; card_reject_reason: string | null; order_number: string | null;
  sponsor_type: string | null; sponsor_name: string | null; created_at: string;
};
const STATUS: Record<string, string> = {
  pending_card: "Carte à vérifier", pending_sponsor: "Parrain manquant", pending_training: "Module photo à faire", active: "Actif", suspended: "Suspendu", invited: "Invité",
};

function CardImage({ id, side, adminKey }: { id: number; side: "front" | "selfie"; adminKey: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    fetch(`/api/admin/relays/${id}/card/${side}`, { headers: { "x-admin-key": adminKey } })
      .then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) { revoke = URL.createObjectURL(b); setUrl(revoke); } }).catch(() => {});
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [id, side, adminKey]);
  return url
    ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={side === "front" ? "Carte recto" : "Selfie avec la carte"} className="h-28 w-40 rounded-xl object-cover" /></a>
    : <div className="flex h-28 w-40 items-center justify-center rounded-xl text-xs" style={{ background: "#0003" }}>…</div>;
}

function LicenseDoc({ id, adminKey }: { id: number; adminKey: string }) {
  const open = async () => {
    const r = await fetch(`/api/admin/licenses/${id}/document`, { headers: { "x-admin-key": adminKey } });
    if (!r.ok) return window.alert("Justificatif introuvable");
    window.open(URL.createObjectURL(await r.blob()), "_blank");
  };
  return <button onClick={open} style={{ background: "#475569", color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Voir le justificatif</button>;
}

function LicensesSection({ adminKey, DS }: { adminKey: string; DS: DS }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const r = await fetch("/api/admin/licenses", { headers: { "x-admin-key": adminKey } });
    setItems(r.ok ? (await r.json()).items || [] : []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminKey]);
  const decide = async (id: number, decision: "verified" | "rejected") => {
    const reason = decision === "rejected" ? window.prompt("Motif du refus (envoyé au dermatologue)")?.trim() : "";
    if (decision === "rejected" && !reason) return;
    const r = await fetch(`/api/admin/licenses/${id}`, { method: "POST", headers: { "x-admin-key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason }) });
    if (!r.ok) window.alert((await r.json().catch(() => ({})))?.message || "Action impossible");
    load();
  };
  const btn = (bg: string) => ({ background: bg, color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" });
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-extrabold" style={{ color: DS.text }}>Autorisations d'exercer (consultation directe)</h3>
      <p className="text-xs" style={{ color: DS.muted }}>Un dermatologue n'apparaît dans l'appli patient d'un pays qu'avec une autorisation vérifiée pour ce pays. La télé-expertise reste ouverte à tout le réseau.</p>
      {items.length === 0 && <p className="text-sm" style={{ color: DS.muted }}>Rien à vérifier.</p>}
      {items.map((l) => (
        <div key={l.id} className="rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <span className="text-sm" style={{ color: DS.body }}>
            <b style={{ color: DS.text }}>{l.full_name}</b> · {l.country} · {l.kind === "home" ? `ONMC ${l.license_number || "non renseigné"}` : "autorisation"} ·{" "}
            <span style={{ color: l.status === "verified" ? "#10b981" : l.status === "rejected" ? "#b91c1c" : "#b45309", fontWeight: 800 }}>
              {l.status === "verified" ? "vérifiée" : l.status === "rejected" ? `refusée (${l.reject_reason})` : "à vérifier"}
            </span>
          </span>
          {l.status === "pending" && (
            <span className="flex flex-wrap gap-1.5">
              {l.has_doc && <LicenseDoc id={l.id} adminKey={adminKey} />}
              <button onClick={() => decide(l.id, "verified")} style={btn("#10b981")}>Vérifiée</button>
              <button onClick={() => decide(l.id, "rejected")} style={btn("#b91c1c")}>Refuser</button>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HospitalsSection({ adminKey, DS }: { adminKey: string; DS: DS }) {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState({ name: "", service: "Dermatologie", country: "Cameroun", district: "", city: "", phone: "", lat: "", lng: "" });
  const [msg, setMsg] = useState("");
  const load = async () => { const r = await fetch("/api/admin/hospitals", { headers: { "x-admin-key": adminKey } }); setItems(r.ok ? (await r.json()).items || [] : []); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminKey]);
  const add = async () => {
    const body = { ...f, lat: f.lat ? Number(f.lat.replace(",", ".")) : null, lng: f.lng ? Number(f.lng.replace(",", ".")) : null };
    const r = await fetch("/api/admin/hospitals", { method: "POST", headers: { "x-admin-key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Hôpital ajouté." : d?.message || "Erreur");
    if (r.ok) { setF({ ...f, name: "", district: "", city: "", phone: "", lat: "", lng: "" }); load(); }
  };
  const input = { background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}`, color: DS.text, borderRadius: 12, padding: "8px 10px", fontSize: 13 };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-extrabold" style={{ color: DS.text }}>Hôpitaux de référence</h3>
      <p className="text-xs" style={{ color: DS.muted }}>Proposés au dermatologue quand il oriente un patient : même district d'abord, puis le plus proche (coordonnées GPS facultatives).</p>
      <div className="grid sm:grid-cols-4 gap-2">
        {([["name", "Nom (ex. Hôpital régional de Maroua)"], ["service", "Service"], ["country", "Pays"], ["district", "District"], ["city", "Ville"], ["phone", "Téléphone"], ["lat", "Latitude"], ["lng", "Longitude"]] as const).map(([k, ph]) => (
          <input key={k} style={input} placeholder={ph} value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        ))}
      </div>
      <button onClick={add} disabled={f.name.trim().length < 3} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Ajouter l'hôpital</button>
      {msg && <p className="text-xs" style={{ color: DS.body }}>{msg}</p>}
      {items.map((h) => (
        <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: DS.body }}>
          <span><b style={{ color: DS.text }}>{h.name}</b> · {[h.service, h.district, h.city, h.country].filter(Boolean).join(" · ")}{h.lat != null ? " · GPS" : ""}{h.active ? "" : " · désactivé"}</span>
          <button onClick={async () => { await fetch(`/api/admin/hospitals/${h.id}/active`, { method: "POST", headers: { "x-admin-key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify({ active: !h.active }) }); load(); }}
            className="underline text-xs">{h.active ? "Désactiver" : "Réactiver"}</button>
        </div>
      ))}
    </div>
  );
}

export function RelaysTab({ adminKey, DS }: { adminKey: string; DS: DS }) {
  const [items, setItems] = useState<Relay[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const load = async () => {
    const r = await fetch("/api/admin/relays", { headers: { "x-admin-key": adminKey } });
    setItems(r.ok ? (await r.json()).items || [] : []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminKey]);
  const act = async (url: string, body?: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "x-admin-key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Enregistré." : d?.message || "Action impossible");
    load();
  };
  const btn = (bg: string) => ({ background: bg, color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" });

  return (
    <div className="space-y-4">
      <LicensesSection adminKey={adminKey} DS={DS} />
      <HospitalsSection adminKey={adminKey} DS={DS} />
      <h3 className="text-lg font-extrabold" style={{ color: DS.text }}>Relais : vérification</h3>
      <p className="text-xs" style={{ color: DS.muted }}>Deux validations avant le 1er cas : carte vérifiée et parrain (dermatologue, programme, ou GlowScan après appel du centre). Le relais passe ensuite le module photo.</p>
      {msg && <p className="text-xs font-bold" style={{ color: DS.body }}>{msg}</p>}
      {items.length === 0 && <p className="text-sm" style={{ color: DS.muted }}>Aucun relais à vérifier.</p>}
      {items.map((r) => (
        <div key={r.id} className="rounded-2xl p-4 space-y-2" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm" style={{ color: DS.body }}>
              <b style={{ color: DS.text }}>{r.full_name}</b> · {professionLabel(r.profession)} · {r.center || "—"}{r.district ? `, ${r.district}` : ""} · {r.country || "—"} · +{r.phone}
            </span>
            <span className="text-xs font-extrabold" style={{ color: r.status === "active" ? "#10b981" : "#b45309" }}>{STATUS[r.status] || r.status}</span>
          </div>
          <div className="text-xs" style={{ color: DS.muted }}>
            Carte : {r.card_status === "verified" ? "vérifiée" : r.card_status === "rejected" ? `refusée (${r.card_reject_reason})` : "à vérifier"}
            {r.order_number ? ` · N° d'ordre : ${r.order_number}` : ""} · Parrain : {r.sponsor_type ? `${r.sponsor_type === "derm" ? "Dr " : ""}${r.sponsor_name || "GlowScan"}` : "aucun (appeler le centre)"}
            {" "}· inscrit le {new Date(r.created_at).toLocaleDateString("fr-FR")}
          </div>
          {r.card_status !== "verified" && (
            open === r.id ? (
              <div className="flex flex-wrap gap-3">
                <CardImage id={r.id} side="front" adminKey={adminKey} />
                <CardImage id={r.id} side="selfie" adminKey={adminKey} />
              </div>
            ) : (
              <button onClick={() => setOpen(r.id)} style={{ ...btn("#475569") }}>Voir la carte et le selfie</button>
            )
          )}
          <div className="flex flex-wrap gap-2">
            {r.card_status !== "verified" && open === r.id && (
              <>
                <button onClick={() => act(`/api/admin/relays/${r.id}/card`, { decision: "verified" })} style={btn("#10b981")}>Carte vérifiée</button>
                <button onClick={() => { const reason = window.prompt("Motif du refus (envoyé au relais)")?.trim(); if (reason) act(`/api/admin/relays/${r.id}/card`, { decision: "rejected", reason }); }} style={btn("#b91c1c")}>Refuser</button>
              </>
            )}
            {!r.sponsor_type && (
              <button onClick={() => { if (window.confirm("Vous avez appelé le centre de santé et confirmé ce soignant ?")) act(`/api/admin/relays/${r.id}/sponsor-glowscan`); }} style={btn("#2563eb")}>
                Parrainage GlowScan (appel fait)
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
