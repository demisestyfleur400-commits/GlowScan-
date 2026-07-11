import { useEffect, useState } from "react";
import { ProLayout } from "@/components/ProLayout";
import { useProAccount } from "@/hooks/use-pro";
import { ConsultationChat } from "@/components/ConsultationChat";

interface Consult { id: number; condition?: string; status?: string; unreadDoctor?: number; patientFirstName?: string; patientEmail?: string; lastMessageAt?: string; createdAt?: string; }

const INK = "#f3f0ff";
const MUTED = "rgba(255,255,255,0.45)";

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
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Aucune consultation pour l'instant. Activez « consultable en B2C » dans votre profil pour en recevoir.</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => (
            <button key={c.id} onClick={() => setOpenId(c.id)}
              style={{ textAlign: "left", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧑🏾</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: INK, margin: 0 }}>{c.patientFirstName || "Patient"}</p>
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
