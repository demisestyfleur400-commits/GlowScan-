import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ProLayout } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APPT_TYPES, apptTypeOf, dayKeyOf, doualaIso, hhmmOf, type ApptType } from "@/lib/apptTypes";

// ════════════════════════════════════════════════════════════════════════
// Agenda (refonte Organic) — maquette « Derm Portal », écran Agenda.
// Semaine (lundi → dimanche) avec pastilles, journée de 8 h à 18 h, création
// d'un rendez-vous (classement automatique : « urgent » / « douleur » dans les
// notes passent le RDV en urgence, côté serveur) et détection de conflit.
// Géré par le médecin ou la secrétaire.
// ════════════════════════════════════════════════════════════════════════

interface Appt {
  id: number; patient_name?: string; patient_contact?: string; appointment_date: string;
  duration_minutes?: number; type?: string; notes?: string; status?: string;
}

const START_H = 8;
const END_H = 18;
const PX_PER_MIN = 1;
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function mondayOf(key: string) {
  const d = new Date(`${key}T12:00:00+01:00`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };

export default function ProAgenda() {
  const [day, setDay] = useState(() => dayKeyOf(new Date()));
  const [week, setWeek] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(false);

  const monday = useMemo(() => mondayOf(day), [day]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  const load = () => {
    const from = doualaIso(dayKeyOf(days[0]), "00:00");
    const to = doualaIso(dayKeyOf(addDays(days[0], 7)), "00:00");
    fetch(`/api/pro/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials: "include" })
      .then((r) => r.json()).then((d) => setWeek((d.appointments || []).filter((a: Appt) => a.status !== "cancelled")))
      .catch(() => setWeek([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [monday.getTime()]);

  const byDay = (key: string) => week
    .filter((a) => dayKeyOf(new Date(a.appointment_date)) === key)
    .sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date));
  const dayAppts = byDay(day);
  const totalMin = dayAppts.reduce((s, a) => s + (a.duration_minutes || 30), 0);
  const dayDate = new Date(`${day}T12:00:00+01:00`);
  const dayTitle = dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", timeZone: "Africa/Douala" });
  const monthTitle = dayDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Africa/Douala" });
  const today = dayKeyOf(new Date());

  // Ligne « maintenant » (uniquement aujourd'hui, pendant les heures affichées).
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const [nh, nm] = hhmmOf(now).split(":").map(Number);
  const nowTop = ((nh - START_H) * 60 + nm) * PX_PER_MIN;
  const showNow = day === today && nh >= START_H && nh < END_H;

  const cancel = async (a: Appt) => {
    if (!confirm(`Annuler le rendez-vous de ${a.patient_name || "ce patient"} ?`)) return;
    await fetch(`/api/pro/appointments/${a.id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
    load();
  };

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <ProLayout>
      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">{cap(monthTitle)}</span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">{cap(dayTitle)}</h1>
          <p className="m-0 text-[15px] text-organic-neutral-700">
            {dayAppts.length ? `${dayAppts.length} rendez-vous · ${totalMin} min de consultation` : "Aucun rendez-vous ce jour."}
          </p>
        </div>
        <Button onClick={() => setDlg(true)} className="h-auto px-[22px] py-3 text-[15px]" data-testid="button-new-appt">
          <Plus size={16} /> Nouveau rendez-vous
        </Button>
      </header>

      <div className="flex items-center gap-2">
        <button type="button" aria-label="Semaine précédente" onClick={() => setDay(dayKeyOf(addDays(monday, -7)))}
          className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-organic-surface text-organic-text">
          <ChevronLeft size={18} />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const key = dayKeyOf(d);
            const on = key === day;
            const dots = byDay(key).slice(0, 4);
            return (
              <button key={key} type="button" onClick={() => setDay(key)} aria-pressed={on}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-card border-0 px-1 py-2.5 font-body ${on ? "bg-organic-accent text-organic-bg" : "bg-organic-surface text-organic-text"}`}
                data-testid={`day-${key}`}>
                <span className="text-[11px] font-bold uppercase">{DOW[i]}</span>
                <span className={`font-heading text-[20px] leading-none ${key === today && !on ? "text-organic-accent-700" : ""}`}>{d.getUTCDate()}</span>
                <span className="flex h-1.5 gap-[3px]">
                  {dots.map((a) => <span key={a.id} className="h-1.5 w-1.5 rounded-full" style={{ background: on ? "var(--color-bg)" : APPT_TYPES[apptTypeOf(a.type)].dot }} />)}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Semaine suivante" onClick={() => setDay(dayKeyOf(addDays(monday, 7)))}
          className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-organic-surface text-organic-text">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(Object.keys(APPT_TYPES) as ApptType[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[12px] font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: APPT_TYPES[k].dot }} />{APPT_TYPES[k].label}
          </span>
        ))}
      </div>

      <div className="flex gap-3 overflow-hidden rounded-card bg-organic-surface p-organic-4">
        <div className="flex flex-none flex-col" style={{ width: 40 }}>
          {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
            <span key={i} className="text-[11px] text-organic-neutral-700" style={{ height: i === END_H - START_H ? "auto" : 60 * PX_PER_MIN }}>{START_H + i} h</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: (END_H - START_H) * 60 * PX_PER_MIN }}>
          {Array.from({ length: END_H - START_H }, (_, i) => (
            <span key={i} className="absolute inset-x-0 border-t border-organic-divider" style={{ top: i * 60 * PX_PER_MIN + 7 }} />
          ))}
          {showNow && (
            <span className="absolute inset-x-0 z-10 h-0.5 bg-organic-accent" style={{ top: nowTop + 7 }}>
              <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-organic-accent" />
            </span>
          )}
          {!loading && dayAppts.length === 0 && (
            <span className="absolute left-3 top-4 text-[14px] text-organic-neutral-700">Aucun rendez-vous ce jour.</span>
          )}
          {dayAppts.map((a) => {
            const t = APPT_TYPES[apptTypeOf(a.type)];
            const d = new Date(a.appointment_date);
            const [h, m] = hhmmOf(d).split(":").map(Number);
            const top = Math.max(0, ((h - START_H) * 60 + m) * PX_PER_MIN) + 7;
            const dur = a.duration_minutes || 30;
            return (
              <div key={a.id} className="absolute inset-x-0 flex items-start gap-3 overflow-hidden rounded-2xl px-3 py-1.5"
                style={{ top, height: Math.max(28, dur * PX_PER_MIN - 4), background: t.bg, color: t.fg }} data-testid={`appt-${a.id}`}>
                <span className="flex-none font-heading text-[14px]">{hhmmOf(d)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-bold">
                    {a.patient_name || "Patient"}
                    {a.status === "confirmed" && <span className="ml-1.5 text-[11px] font-semibold opacity-80">· Confirmé</span>}
                  </span>
                  {dur >= 30 && (
                    <span className="truncate text-[12px] opacity-80">{t.label} · {dur} min{a.notes ? ` · ${a.notes}` : ""}</span>
                  )}
                </span>
                <button type="button" onClick={() => cancel(a)} title="Annuler" aria-label="Annuler le rendez-vous"
                  className="flex-none cursor-pointer border-0 bg-transparent p-1 opacity-70 hover:opacity-100" style={{ color: t.fg }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {dlg && <ApptDialog day={day} onClose={() => setDlg(false)} onCreated={() => { setDlg(false); load(); }} />}
    </ProLayout>
  );
}

function ApptDialog({ day, onClose, onCreated }: { day: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("09:00");
  const [contact, setContact] = useState("");
  const [type, setType] = useState<"consultation" | "suivi" | "urgence">("consultation");
  const [dur, setDur] = useState(30);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const create = async (force = false) => {
    if (!name.trim()) return setErr("Indiquez le nom du patient.");
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/pro/appointments", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: name.trim(), patientContact: contact.trim(), appointmentDate: doualaIso(day, time), type, durationMinutes: dur, notes: notes.trim(), forceConflict: force }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) {
        const ex = d.existing ? hhmmOf(new Date(d.existing.appointment_date)) : "";
        if (confirm(`Vous avez déjà un rendez-vous à cette heure${ex ? ` (${ex})` : ""}. Voulez-vous quand même le créer ?`)) return create(true);
        return;
      }
      if (!res.ok) throw new Error(d.message || "Rendez-vous non créé.");
      onCreated();
    } catch (e: any) { setErr(e.message || "Erreur réseau."); } finally { setBusy(false); }
  };

  const chip = (on: boolean) =>
    `cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-organic-neutral-900/45 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="appt-title" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[480px] flex-col gap-organic-3 overflow-auto rounded-t-[32px] bg-organic-bg p-organic-6 sm:rounded-card">
        <span id="appt-title" className="font-heading text-[22px]">Nouveau rendez-vous</span>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Patient</span>
          <Input className="h-11 bg-organic-surface" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du patient" data-testid="input-appt-name" />
        </label>
        <div className="flex gap-3">
          <label className="flex w-[120px] flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Heure</span>
            <Input className="h-11 bg-organic-surface" type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-appt-time" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Contact WhatsApp</span>
            <Input className="h-11 bg-organic-surface" inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="6XX XXX XXX" data-testid="input-appt-contact" />
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {(["consultation", "suivi", "urgence"] as const).map((k) => (
              <button key={k} type="button" className={chip(type === k)} onClick={() => setType(k)}>{APPT_TYPES[k].label}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Durée</span>
          <div className="flex flex-wrap gap-1.5">
            {[15, 30, 45, 60].map((m) => (
              <button key={m} type="button" className={chip(dur === m)} onClick={() => setDur(m)}>{m} min</button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-organic-neutral-700">Notes — « urgent » ou « douleur » passent le RDV en urgence</span>
          <Input className="h-11 bg-organic-surface" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motif, précisions…" data-testid="input-appt-notes" />
        </label>
        {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => create()} isLoading={busy} disabled={busy} data-testid="button-create-appt">Créer le rendez-vous</Button>
        </div>
      </div>
    </div>
  );
}
