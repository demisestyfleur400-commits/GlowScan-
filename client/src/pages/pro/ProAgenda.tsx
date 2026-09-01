import { useEffect, useState } from "react";
import { ProLayout } from "@/components/ProLayout";
import { Plus, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// AGENDA DERM — Vue Jour (mobile-first). Timeline des RDV colorés par type,
// création rapide avec classification auto + détection de conflit.
// ════════════════════════════════════════════════════════════════════════

const INK = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";

interface Appt {
  id: number; patient_name?: string; patient_contact?: string;
  appointment_date: string; duration_minutes?: number;
  type?: string; priority?: string; notes?: string; status?: string;
}

const TYPE_META: Record<string, { label: string; color: string; dot: string }> = {
  glowscan: { label: "Consultation en ligne", color: "#7c3aed", dot: "🟣" },
  consultation: { label: "Consultation", color: "#2563eb", dot: "🔵" },
  suivi: { label: "Suivi", color: "#d97706", dot: "🟡" },
  urgence: { label: "Urgence", color: "#dc2626", dot: "🔴" },
};

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function frDay(d: Date) { return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); }

export default function ProAgenda() {
  const [day, setDay] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/pro/appointments?date=${ymd(day)}`, { credentials: "include" })
      .then((r) => r.json()).then((d) => setAppts(d.appointments || []))
      .catch(() => setAppts([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [day]);

  const shift = (n: number) => { const d = new Date(day); d.setDate(d.getDate() + n); setDay(d); };
  const isToday = ymd(day) === ymd(new Date());

  return (
    <ProLayout>
      <div style={{ position: "relative", minHeight: "70vh" }}>
        {/* En-tête jour */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: INK, margin: 0, textTransform: "capitalize" }}>{frDay(day)}</h1>
          {!isToday && <button onClick={() => setDay(new Date())} style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", background: "transparent", border: "none", cursor: "pointer" }}>Aujourd'hui</button>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button onClick={() => shift(-1)} style={{ padding: 6, borderRadius: 10, background: "#F1F5F9", border: "none", cursor: "pointer" }}><ChevronLeft size={18} color={INK} /></button>
          <button onClick={() => shift(1)} style={{ padding: 6, borderRadius: 10, background: "#F1F5F9", border: "none", cursor: "pointer" }}><ChevronRight size={18} color={INK} /></button>
          <input type="date" value={ymd(day)} onChange={(e) => e.target.value && setDay(new Date(e.target.value))}
            style={{ marginLeft: "auto", padding: "7px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: INK }} />
        </div>

        {loading && <p style={{ fontSize: 13, color: MUTED }}>Chargement…</p>}
        {!loading && appts.length === 0 && (
          <div style={{ background: "#F1F5F9", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Aucun rendez-vous ce jour. Appuyez sur ＋ pour en ajouter.</p>
          </div>
        )}

        {/* Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {appts.map((a) => {
            const meta = TYPE_META[a.type || "consultation"] || TYPE_META.consultation;
            const time = new Date(a.appointment_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={a.id} style={{ display: "flex", gap: 12, background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ flexShrink: 0, textAlign: "center", minWidth: 48 }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: INK, margin: 0 }}>{time}</p>
                  <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{a.duration_minutes || 30} min</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: INK, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    {a.patient_name || "Patient"}
                    <span style={{ fontSize: 10, fontWeight: 800, color: meta.color, background: `${meta.color}18`, borderRadius: 9999, padding: "1px 8px" }}>{meta.dot} {meta.label}</span>
                  </p>
                  {a.notes && <p style={{ fontSize: 12, color: MUTED, margin: "3px 0 0", lineHeight: 1.4 }}>{a.notes}</p>}
                  {a.patient_contact && <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0" }}>📞 {a.patient_contact}</p>}
                </div>
                <button onClick={async () => { if (confirm("Annuler ce RDV ?")) { await fetch(`/api/pro/appointments/${a.id}`, { method: "DELETE", credentials: "include" }); load(); } }}
                  style={{ flexShrink: 0, padding: 6, borderRadius: 8, background: "rgba(244,63,94,0.1)", border: "none", cursor: "pointer", alignSelf: "flex-start" }} title="Annuler">
                  <Trash2 size={14} color="#f43f5e" />
                </button>
              </div>
            );
          })}
        </div>

        {/* FAB + */}
        <button onClick={() => setShowForm(true)}
          style={{ position: "fixed", right: 20, bottom: 84, width: 56, height: 56, borderRadius: "50%", background: "#7c3aed", color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(124,58,237,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <Plus size={26} />
        </button>

        {showForm && <ApptForm day={day} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
      </div>
    </ProLayout>
  );
}

function ApptForm({ day, onClose, onCreated }: { day: Date; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState(ymd(day));
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState("consultation");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (force = false) => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const appointmentDate = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch("/api/pro/appointments", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: name.trim(), patientContact: contact.trim(), appointmentDate, type, durationMinutes: parseInt(duration, 10), notes: notes.trim(), forceConflict: force }),
      });
      if (res.status === 409) {
        const d = await res.json();
        const ex = d.existing ? new Date(d.existing.appointment_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
        if (confirm(`⚠️ Vous avez déjà un RDV à cette heure${ex ? ` (${ex})` : ""}.\nVoulez-vous quand même confirmer ?`)) { setBusy(false); return submit(true); }
        setBusy(false); return;
      }
      if (res.ok) { onCreated(); return; }
      const d = await res.json().catch(() => ({}));
      setErr(d.message || "Erreur");
    } catch { setErr("Erreur réseau"); } finally { setBusy(false); }
  };

  const field = { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, color: INK };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontSize: 17, fontWeight: 900, color: INK, margin: 0 }}>Nouveau rendez-vous</p>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={22} color={MUTED} /></button>
        </div>
        {err && <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{err}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 4 }}>Patient</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du patient" style={field} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 4 }}>Contact (WhatsApp)</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="6XX XXX XXX" inputMode="tel" style={field} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
            </div>
            <div style={{ width: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 4 }}>Heure</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={field} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>Type</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["consultation", "suivi", "urgence"] as const).map((t) => {
                const meta = TYPE_META[t];
                return (
                  <button key={t} onClick={() => setType(t)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
                      background: type === t ? `${meta.color}18` : "#F1F5F9", color: type === t ? meta.color : MUTED, border: type === t ? `1.5px solid ${meta.color}` : `1px solid ${BORDER}` }}>
                    {meta.dot} {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>Durée</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["15", "30", "45", "60"].map((d) => (
                <button key={d} onClick={() => setDuration(d)}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
                    background: duration === d ? "rgba(124,58,237,0.1)" : "#F1F5F9", color: duration === d ? "#7c3aed" : MUTED, border: duration === d ? "1.5px solid #7c3aed" : `1px solid ${BORDER}` }}>
                  {d} min
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 4 }}>Notes <span style={{ fontWeight: 500 }}>(mots comme « urgent », « douleur » → priorité auto)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Motif, précisions…" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <button onClick={() => submit(false)} disabled={busy || !date || !time}
            style={{ width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "13px", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: busy || !date || !time ? 0.5 : 1 }}>
            {busy ? "Enregistrement…" : "Créer le rendez-vous"}
          </button>
        </div>
      </div>
    </div>
  );
}
