import { useEffect, useState } from "react";
import { ProLayout } from "@/components/ProLayout";
import { useProAccount } from "@/hooks/use-pro";
import { ConsultationChat } from "@/components/ConsultationChat";

interface Consult { id: number; condition?: string; status?: string; unreadDoctor?: number; patientFirstName?: string; patientEmail?: string; lastMessageAt?: string; createdAt?: string; isDemo?: boolean; }

const INK = "#0F172A";
const MUTED = "#64748B";

export default function ProConsultations() {
  const { data: accData } = useProAccount();
  const [list, setList] = useState<Consult[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/pro/consultations", { credentials: "include" })
      .then((r) => r.json()).then((d) => setList(d.consultations || []))
      .catch(() => setList([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Deep-link depuis la notification (push/email) : /derm/consultations?c=<id>
  // → ouvre DIRECTEMENT le dossier, jamais un nouveau flux d'analyse.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cid = parseInt(p.get("c") || "");
    if (cid && !Number.isNaN(cid)) setOpenId(cid);
  }, []);

  if (openId) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
        <ConsultationChat consultationId={openId} myUserId={(accData as any)?.user?.id || null} dark onBack={() => { setOpenId(null); load(); }} />
      </div>
    );
  }

  return (
    <ProLayout>
      <div style={{ padding: "4px 2px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: INK, margin: "0 0 4px" }}>Consultations</h1>
        <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 18px" }}>Les patients qui vous consultent en ligne depuis GlowScan.</p>

        {loading && <p style={{ color: MUTED, fontSize: 13 }}>Chargement…</p>}
        {!loading && list.length === 0 && (
          <div style={{ background: "#F1F5F9", border: "1px solid #F1F5F9", borderRadius: 16, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Aucune consultation pour l'instant. Activez « consultable en B2C » dans votre profil pour en recevoir.</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => (
            <button key={c.id} onClick={() => setOpenId(c.id)}
              style={{ textAlign: "left", background: "#F1F5F9", border: "1px solid #F1F5F9", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧑🏾</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: INK, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  {c.patientFirstName || "Patient"}
                  {c.isDemo && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#b45309", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 9999, padding: "1px 7px" }}>DÉMO</span>}
                </p>
                <p style={{ fontSize: 11.5, color: MUTED, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.condition || "Consultation"}</p>
              </div>
              {(c.unreadDoctor || 0) > 0 && (
                <span style={{ background: "#ef4444", color: "#fff", borderRadius: 9999, minWidth: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{c.unreadDoctor}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </ProLayout>
  );
}
