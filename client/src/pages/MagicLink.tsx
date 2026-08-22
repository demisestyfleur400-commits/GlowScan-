import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MagicLink() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setError("Lien invalide."); return; }
    (async () => {
      try {
        await apiRequest("POST", "/api/auth/login/magic/consume", { token });
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setLocation("/");
      } catch (e: any) {
        setError("Lien invalide ou expiré. Redemandez un lien de connexion.");
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "#faf8f6", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      {error ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1f2a26" }}>{error}</p>
          <button onClick={() => setLocation("/auth")} style={{ padding: "11px 22px", borderRadius: 14, background: "#2f9e6e", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Retour à la connexion
          </button>
        </>
      ) : (
        <p style={{ fontSize: 14, fontWeight: 600, color: "#4a5a52" }}>Connexion en cours…</p>
      )}
    </div>
  );
}
