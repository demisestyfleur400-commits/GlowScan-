import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CGU_VERSION, CGU_CHECK_PATIENT, CGU_CHECK_PRO, CGU_REACCEPT_TEXT, RESEARCH_CONSENT_TITLE, RESEARCH_CONSENT_TEXT } from "@shared/cgu";

// Écran bloquant de ré-acceptation des CGU (version 2026-11-v2).
// Tout compte connecté dont la version acceptée est absente ou différente doit cocher
// la case et valider : continuer à utiliser l'appli ne vaut PAS acceptation.
// Les pages de lecture (CGU, confidentialité, vérification d'ordonnance) restent ouvertes.
const OPEN_PATHS = [/^\/cgu\/?$/, /^\/confidentialite\/?$/, /^\/derm\/conditions\/?$/, /^\/verif(\/|$)/, /^\/avis\//];

type CguState = { required: string; version: string | null; ok: boolean; pro: boolean };

const C = { ink: "#17392c", body: "#3d4f48", muted: "#5f6f69", line: "#e3e8e2", accent: "#164034", soft: "#e7eedc", err: "#b42318" };

export function CguGate() {
  const { user, logout } = useAuth();
  const [path] = useLocation();
  const qc = useQueryClient();
  const { data } = useQuery<CguState | null>({
    queryKey: ["/api/me/cgu"],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const r = await fetch("/api/me/cgu", { credentials: "include" });
      if (!r.ok) return null; // jamais bloquer sur une erreur réseau ou serveur
      return r.json();
    },
  });
  const [cgu, setCgu] = useState(false);
  const [research, setResearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!user || !data || data.ok || OPEN_PATHS.some((re) => re.test(path))) return null;

  const accept = async () => {
    if (!cgu) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/cgu", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: CGU_VERSION, accepted: true, ...(data.pro ? {} : { research }) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Enregistrement impossible. Réessayez.");
      qc.setQueryData(["/api/me/cgu"], { ...data, version: CGU_VERSION, ok: true });
      if (!data.pro) qc.invalidateQueries({ queryKey: ["/api/me/consents"] });
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const box = (on: boolean): React.CSSProperties => ({
    width: 18, height: 18, flex: "none", marginTop: 2, borderRadius: 4,
    ...(on ? { background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 } : { border: `1.5px solid #9aa8a2`, background: "#fff" }),
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cgu-gate-title" data-testid="cgu-gate"
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(13,38,32,.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 16, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: 18, padding: 24, color: C.ink, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="cgu-gate-title" style={{ margin: 0, fontSize: 19, fontWeight: 700, fontFamily: "Manrope, 'DM Sans', sans-serif" }}>Conditions générales mises à jour</h2>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.body }}>{CGU_REACCEPT_TEXT}</p>
        <a href={data.pro ? "/derm/conditions" : "/cgu"} target="_blank" rel="noreferrer" data-testid="cgu-gate-read"
          style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 700, color: C.accent }}>Lire les Conditions générales (version {CGU_VERSION})</a>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 10, border: `1px solid ${cgu ? C.accent : C.line}`, cursor: "pointer" }}>
          <input type="checkbox" checked={cgu} onChange={(e) => { setCgu(e.target.checked); setErr(""); }} data-testid="cgu-gate-check" style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
          <span style={box(cgu)} aria-hidden>{cgu ? "✓" : ""}</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.55 }}>{data.pro ? CGU_CHECK_PRO : CGU_CHECK_PATIENT}</span>
        </label>

        {!data.pro && (
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 10, border: `1px solid ${research ? C.accent : C.line}`, background: "#f8f8f6", cursor: "pointer" }}>
            <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} data-testid="cgu-gate-research" style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
            <span style={box(research)} aria-hidden>{research ? "✓" : ""}</span>
            <span style={{ fontSize: 12, lineHeight: 1.55, color: C.body }}><strong style={{ color: C.ink }}>{RESEARCH_CONSENT_TITLE}</strong> {RESEARCH_CONSENT_TEXT}</span>
          </label>
        )}

        {err && <span style={{ fontSize: 12.5, color: C.err }}>{err}</span>}
        <button type="button" disabled={!cgu || busy} onClick={accept} data-testid="cgu-gate-accept"
          style={{ height: 46, borderRadius: 12, border: 0, background: cgu ? C.accent : "#b9c4bf", color: "#fff", fontSize: 14, fontWeight: 800, cursor: cgu && !busy ? "pointer" : "default" }}>
          {busy ? "Enregistrement…" : "Accepter et continuer"}
        </button>
        <span style={{ fontSize: 11.5, lineHeight: 1.5, color: C.muted, textAlign: "center" }}>
          Si vous n'acceptez pas, vous pouvez vous déconnecter et demander la fermeture de votre compte.{" "}
          <button type="button" onClick={() => logout()} data-testid="cgu-gate-logout" style={{ border: 0, background: "none", padding: 0, color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 11.5 }}>Se déconnecter</button>
        </span>
      </div>
    </div>
  );
}
