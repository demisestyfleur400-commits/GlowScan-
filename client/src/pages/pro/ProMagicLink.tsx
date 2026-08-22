import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";

export default function ProMagicLink() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setError("Lien invalide."); return; }
    (async () => {
      try {
        const res = await fetch("/api/pro/login/magic/consume", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Lien expiré");
        await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
        await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setLocation(data.role === "secretary" ? "/derm/patients" : "/derm/dashboard");
      } catch (e: any) {
        setError(e?.message || "Lien invalide ou expiré");
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#FFFFFF", fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif', padding: 24 }}>
      {error ? (
        <>
          <XCircle style={{ width: 40, height: 40, color: "#dc2626" }} />
          <p style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: 0, textAlign: "center" }}>{error}</p>
          <button onClick={() => setLocation("/derm/connexion")}
            style={{ padding: "11px 22px", borderRadius: 9999, background: "#7c3aed", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
            Retour à la connexion
          </button>
        </>
      ) : (
        <>
          <Loader2 style={{ width: 28, height: 28, color: "#7c3aed", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "#475569", margin: 0 }}>Connexion en cours…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}
