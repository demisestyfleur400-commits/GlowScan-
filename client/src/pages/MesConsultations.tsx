import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { ConsultationChat } from "@/components/ConsultationChat";

interface Consult { id: number; condition?: string; status?: string; paymentStatus?: string; unreadPatient?: number; lastMessageAt?: string; createdAt?: string; rating?: number | null; reportStatus?: string | null; }

export default function MesConsultations() {
  const { user } = useAuth();
  const [list, setList] = useState<Consult[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/consultations/mine", { credentials: "include" })
      .then((r) => r.json()).then((d) => setList(d.consultations || []))
      .catch(() => setList([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Recharge la liste au retour sur la page (fini l'écran vide au retour du chat).
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  const statusLabel = (c: Consult) =>
    c.paymentStatus !== "paid" ? "En attente de confirmation du paiement"
      : c.status === "closed" ? "Consultation terminée"
      : c.status === "answered" ? "Le dermatologue a répondu"
      : "Consultation ouverte";

  const rate = async (id: number, stars: number) => {
    try {
      await fetch(`/api/consultations/${id}/rate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars }),
      });
      load();
    } catch {}
  };

  if (openId) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
        <ConsultationChat key={openId} consultationId={openId} myUserId={user?.id || null} onBack={() => { setOpenId(null); load(); }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb" }}>
      <Navbar />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 60px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", margin: "0 0 4px" }}>Mes consultations</h1>
        <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 18px" }}>Tes échanges avec les dermatologues, directement dans GlowScan.</p>

        {loading && <p style={{ color: "#9ca3af", fontSize: 13 }}>Chargement…</p>}
        {!loading && list.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Aucune consultation pour le moment. Lance une analyse puis « Consulter un dermatologue ».</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, overflow: "hidden" }}>
              <button onClick={() => c.paymentStatus === "paid" ? setOpenId(c.id) : undefined}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "12px 14px", cursor: c.paymentStatus === "paid" ? "pointer" : "default", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,rgba(167,139,250,0.25),rgba(124,58,237,0.15))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>👩🏾‍⚕️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>{c.condition || "Consultation dermatologique"}</p>
                  <p style={{ fontSize: 11.5, color: c.paymentStatus === "paid" ? "#059669" : "#d97706", margin: "2px 0 0" }}>{statusLabel(c)}</p>
                </div>
                {(c.unreadPatient || 0) > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: 9999, minWidth: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{c.unreadPatient}</span>
                )}
              </button>
              {/* Rapport — consultation terminée */}
              {c.status === "closed" && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: c.reportStatus === "sent" ? "#059669" : "#6b7280" }}>
                    {c.reportStatus === "sent" ? "✅ Rapport envoyé" : "📄 Rapport disponible"}
                  </span>
                  <a href={`/api/consultations/${c.id}/report/download`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: "#7c3aed", borderRadius: 9999, padding: "6px 12px", textDecoration: "none" }}>
                    📥 Télécharger
                  </a>
                </div>
              )}
              {/* Notation — consultation terminée */}
              {c.status === "closed" && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  {c.rating ? (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                      Merci pour ta note : <span style={{ color: "#f59e0b", letterSpacing: 1 }}>{"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}</span>
                    </p>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Note ta consultation :</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => rate(c.id, s)} aria-label={`${s} étoiles`}
                            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: "#f59e0b", padding: 0, lineHeight: 1 }}>☆</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
