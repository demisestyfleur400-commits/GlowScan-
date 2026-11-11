import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { DermShell } from "@/components/derm/DermShell";
import { D, FONT_UI, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, StatCard, Card, Btn, Input, Select, Chip, Label, Textarea, Tag, Notice, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Agenda · organisation du cabinet (handoff §3.2). Semaine du lundi au
// vendredi, 08:00–18:00, pause 12:00–13:00 (réglables en D7). Vues Jour /
// Semaine / Mois. Clic sur un rendez-vous : panneau de détail (confirmer,
// déplacer, terminer, annuler, démarrer la consultation le jour même si
// confirmé). Clic sur un créneau vide : nouveau rendez-vous.
// ════════════════════════════════════════════════════════════════════════

type Appt = {
  id: number; appointment_date: string; duration_minutes: number | null; type: string | null; status: string; patient_name: string | null;
  patient_contact: string | null; patient_record_id: number | null; notes: string | null; confirmed_at: string | null; reminder_j1_sent_at: string | null;
};
type PatientLite = { id: number; firstName: string; lastName: string; phone: string | null; archived: boolean };
type View = "day" | "week" | "month";

const PX = 50;
const hNum = (t: string | null | undefined, d: number) => { const m = /^(\d{2}):(\d{2})$/.exec(t || ""); return m ? Number(m[1]) + Number(m[2]) / 60 : d; };
const DAYS = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."];
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, "0");

function stateOf(a: Appt): { label: string; tone: "ok" | "draft" | "muted" | "warn" | "err" | "info" } {
  if (a.status === "done") return { label: "Terminé", tone: "muted" };
  if (a.status === "cancelled") return { label: "Annulé", tone: "muted" };
  if (a.status === "confirmed") return { label: a.confirmed_at ? "Confirmé" : "Confirmé par le cabinet", tone: "ok" };
  if (a.reminder_j1_sent_at && new Date(a.appointment_date).getTime() - Date.now() < 18 * 3600000) return { label: "Pas de réponse", tone: "err" };
  return { label: "À confirmer", tone: "warn" };
}
const typeLabel = (t: string | null) => (t === "suivi" ? "Suivi" : t === "urgence" ? "Urgence" : "Consultation");
const who = (a: Appt) => (a.patient_record_id ? `Patient ${patientCode(a.patient_record_id)}` : a.patient_name || "Patient");
function colors(a: Appt, selected: boolean) {
  if (selected) return { bg: "#1f4f45", fg: "#fff", sub: "#cfe0c4", bd: "#1f4f45" };
  if (a.status === "done") return { bg: "#f3f6f3", fg: D.muted, sub: D.faint, bd: "#e4e8e3" };
  if (a.status === "scheduled") return { bg: "#fdeee3", fg: D.text, sub: D.warn, bd: "#f3d6bf" };
  if (a.type === "suivi") return { bg: "#e5eedd", fg: D.text, sub: D.muted, bd: "#d3e2c8" };
  return { bg: "#e9efed", fg: D.text, sub: D.muted, bd: "#dbe4e0" };
}

export default function DermAgenda() {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data: acc } = useProAccount();
  const isSecretary = acc?.user?.role === "secretary";
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [miniMonth, setMiniMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [sel, setSel] = useState<Appt | null>(null);
  const [create, setCreate] = useState<{ date: string; time: string } | null>(null);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const range = useMemo(() => {
    if (view === "month") { const s = new Date(cursor.getFullYear(), cursor.getMonth(), 1); return { from: startOfWeek(s), to: addDays(startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)), 7) }; }
    const s = view === "day" ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()) : startOfWeek(cursor);
    return { from: s, to: addDays(s, view === "day" ? 1 : 7) };
  }, [view, cursor]);
  // Statistiques : toujours sur la semaine en cours et les 60 jours à venir.
  const weekS = startOfWeek(new Date());
  const statsKey = `/api/pro/appointments?from=${ymd(weekS)}&to=${ymd(addDays(new Date(), 60))}`;
  const listKey = `/api/pro/appointments?from=${ymd(range.from)}&to=${ymd(range.to)}`;
  const { data: list } = useQuery<{ appointments: Appt[] }>({ queryKey: [listKey] });
  const { data: stats } = useQuery<{ appointments: Appt[] }>({ queryKey: [statsKey] });
  const { data: pts } = useQuery<{ items: PatientLite[] }>({ queryKey: ["/api/derm/patients"] });
  // Horaires, pause et jours d'ouverture : Paramètres › Agenda & rappels (D7).
  const { data: cfg } = useQuery<{ settings: { openTime: string; closeTime: string; pauseStart: string | null; pauseEnd: string | null; openDays: number[]; slotMinutes: number } }>({ queryKey: ["/api/derm/settings"] });
  const S = cfg?.settings;
  const H0 = Math.floor(hNum(S?.openTime, 8)), H1 = Math.max(H0 + 1, Math.ceil(hNum(S?.closeTime, 18)));
  const PAUSE = S && S.pauseStart && S.pauseEnd ? [hNum(S.pauseStart, 12), hNum(S.pauseEnd, 13)] : S ? null : [12, 13];
  const openDays = S?.openDays?.length ? S.openDays : [1, 2, 3, 4, 5];
  const refresh = () => { qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/pro/appointments") }); };

  const appts = (list?.appointments || []).filter((a) => a.status !== "cancelled");
  const all = (stats?.appointments || []).filter((a) => a.status !== "cancelled");
  const weekAppts = all.filter((a) => new Date(a.appointment_date) < addDays(weekS, 7));
  const todayAppts = all.filter((a) => sameDay(new Date(a.appointment_date), now));
  const next = all.filter((a) => new Date(a.appointment_date).getTime() > now.getTime() - 15 * 60000 && a.status !== "done").sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date))[0];
  const nextSuivi = all.filter((a) => a.type === "suivi" && new Date(a.appointment_date).getTime() > now.getTime() - 60 * 60000 && a.status !== "done").sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date))[0];
  const upcomingSuivis = all.filter((a) => a.type === "suivi" && new Date(a.appointment_date) > now && a.status !== "done").length;
  const confirmedW = weekAppts.filter((a) => a.status === "confirmed" || a.status === "done").length;

  const days = view === "day" ? [new Date(range.from)] : openDays.map((d) => addDays(range.from, d - 1));
  const dayList = all.concat(appts).filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i).filter((a) => sameDay(new Date(a.appointment_date), cursor)).sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date));
  const canStart = (a: Appt) => !isSecretary && !!a.patient_record_id && sameDay(new Date(a.appointment_date), now) && a.status === "confirmed";
  const move = (dir: number) => setCursor((c) => (view === "month" ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * (view === "day" ? 1 : 7))));
  const title = view === "month" ? cap(cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))
    : view === "day" ? cap(cursor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))
    : `Semaine du ${range.from.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  const rangeLabel = `${range.from.getDate()} – ${addDays(range.from, Math.max(...openDays) - 1).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  const patch = async (a: Appt, body: Record<string, unknown>, done: string) => {
    try { await api(`/api/derm/appointments/${a.id}`, "PATCH", body); setMsg({ t: done, tone: "ok" }); setSel(null); refresh(); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
  };

  // ── Grille horaire ──
  const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
  const gridH = (H1 - H0) * PX;
  const nowTop = ((now.getHours() + now.getMinutes() / 60) - H0) * PX;

  return (
    <DermShell active="agenda">
      <Page wide>
        <ScreenHeader kicker="ORGANISATION DU CABINET" title="Votre agenda, en toute clarté." sub="Planifiez vos consultations et gardez le fil du suivi patient."
          actions={<>
            <span style={{ padding: "10px 16px", border: `1px solid ${D.border}`, borderRadius: 4, background: "#fff", fontSize: 12 }}>{view === "week" ? rangeLabel : title}</span>
            <Btn kind="primary" onClick={() => setCreate({ date: ymd(cursor), time: "09:00" })} data-testid="agenda-new">Nouveau rendez-vous +</Btn>
          </>} />
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 18 }}>
          <StatCard label="Rendez-vous cette semaine" value={pad(weekAppts.length)} sub={`${confirmedW} confirmé${confirmedW > 1 ? "s" : ""} · ${weekAppts.length - confirmedW} à confirmer`} onClick={() => { setView("week"); setCursor(new Date()); }} />
          <StatCard label="Aujourd'hui" value={pad(todayAppts.length)} sub={`${todayAppts.filter((a) => a.type !== "suivi").length} consultation${todayAppts.filter((a) => a.type !== "suivi").length > 1 ? "s" : ""} · ${todayAppts.filter((a) => a.type === "suivi").length} suivi${todayAppts.filter((a) => a.type === "suivi").length > 1 ? "s" : ""}`} onClick={() => { setView("day"); setCursor(new Date()); }} />
          <StatCard label="Suivis programmés" value={pad(upcomingSuivis)} sub="Pour garder le fil des soins" onClick={() => go(isSecretary ? "/derm/agenda" : "/derm/suivis")} />
          <StatCard tone="dark" label="Prochain rendez-vous" value={next ? hm(new Date(next.appointment_date)) : "—"}
            sub={next ? <span style={{ color: "#cfe08a" }}>{who(next)} · {typeLabel(next.type)}{sameDay(new Date(next.appointment_date), now) ? "" : ` · ${new Date(next.appointment_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}`}</span> : "Aucun rendez-vous à venir"}
            onClick={next ? () => setSel(next) : undefined} />
        </section>

        <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1fr) 336px", gap: 16 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 10, padding: "16px 18px", borderBottom: `1px solid ${D.sep}` }}>
              <span className="flex items-center" style={{ gap: 10 }}>
                <b style={{ fontSize: 15, fontWeight: 600 }}>{title}</b>
                <button type="button" onClick={() => setCursor(new Date())} className="cursor-pointer" style={{ padding: "5px 10px", border: 0, borderRadius: 4, background: D.tintChip, color: D.text, fontSize: 11, fontFamily: FONT_UI }}>Aujourd'hui</button>
                <button type="button" aria-label="Précédent" onClick={() => move(-1)} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted, padding: 4 }}><ChevronLeft size={16} /></button>
                <button type="button" aria-label="Suivant" onClick={() => move(1)} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted, padding: 4 }}><ChevronRight size={16} /></button>
              </span>
              <span className="flex" style={{ padding: 3, borderRadius: 6, background: "#f3f6f3" }}>
                {([["day", "Jour"], ["week", "Semaine"], ["month", "Mois"]] as [View, string][]).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setView(k)} className="cursor-pointer" data-testid={`agenda-view-${k}`}
                    style={{ padding: "6px 16px", border: 0, borderRadius: 4, background: view === k ? "#fff" : "transparent", boxShadow: view === k ? "0 1px 3px rgba(13,41,41,.08)" : "none", color: D.text, fontSize: 11, fontWeight: view === k ? 600 : 500, fontFamily: FONT_UI }}>{l}</button>
                ))}
              </span>
            </div>

            {view !== "month" ? (
              <div className="overflow-x-auto">
                <div style={{ minWidth: view === "day" ? 360 : 720 }}>
                  <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length},minmax(0,1fr))`, borderBottom: `1px solid ${D.sep}` }}>
                    <span />
                    {days.map((d) => {
                      const t = sameDay(d, now);
                      return (
                        <button key={d.toISOString()} type="button" onClick={() => setCursor(d)} className="flex cursor-pointer flex-col items-center" style={{ gap: 4, padding: "10px 0", border: 0, borderLeft: `1px solid ${D.sep}`, background: t ? "#f3f7f1" : "#fff", fontFamily: FONT_UI }}>
                          <span style={{ fontSize: 8.5, color: D.muted, letterSpacing: .6 }}>{DAYS[(d.getDay() + 6) % 7]}</span>
                          <span style={{ minWidth: 30, padding: "2px 6px", borderRadius: 4, background: t ? D.actionDark : "transparent", color: t ? "#fff" : D.text, fontSize: 17, fontWeight: 600 }}>{d.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length},minmax(0,1fr))` }}>
                    <div className="relative" style={{ height: gridH + 20 }}>
                      {hours.map((h) => <span key={h} className="absolute" style={{ top: (h - H0) * PX - 6 + 10, left: 10, fontSize: 9, color: D.faint }}>{pad(h)}:00</span>)}
                    </div>
                    {days.map((d) => {
                      const items = appts.filter((a) => sameDay(new Date(a.appointment_date), d));
                      const t = sameDay(d, now);
                      return (
                        <div key={d.toISOString()} className="relative" style={{ height: gridH + 20, borderLeft: `1px solid ${D.sep}`, background: t ? "#fafcf9" : "#fff" }}
                          onClick={(e) => {
                            if (e.target !== e.currentTarget) return;
                            const y = e.nativeEvent.offsetY - 10;
                            const mins = Math.max(0, Math.min((H1 - H0) * 60 - 30, Math.floor((y / PX) * 2) * 30));
                            setCreate({ date: ymd(d), time: `${pad(H0 + Math.floor(mins / 60))}:${pad(mins % 60)}` });
                          }}>
                          {hours.slice(0, -1).map((h) => <span key={h} className="pointer-events-none absolute left-0 right-0" style={{ top: (h - H0) * PX + 10, borderTop: `1px solid ${D.sep}` }} />)}
                          {PAUSE && <span className="pointer-events-none absolute left-0 right-0 flex items-center" style={{ top: (PAUSE[0] - H0) * PX + 10, height: (PAUSE[1] - PAUSE[0]) * PX, background: "#f1f4f0", paddingLeft: 8, fontSize: 9.5, color: D.faint }}>{d === days[0] || view === "day" ? "Pause déjeuner" : ""}</span>}
                          {t && nowTop > 0 && nowTop < gridH && (
                            <span className="pointer-events-none absolute left-0 right-0" style={{ top: nowTop + 10, borderTop: "1.5px solid #c8553d" }}><span style={{ position: "absolute", left: -4, top: -4, width: 7, height: 7, borderRadius: "50%", background: "#c8553d" }} /></span>
                          )}
                          {items.map((a) => {
                            const st = new Date(a.appointment_date);
                            const top = ((st.getHours() + st.getMinutes() / 60) - H0) * PX + 10;
                            const h = Math.max(28, ((a.duration_minutes || 30) / 60) * PX - 3);
                            const c = colors(a, sel?.id === a.id || (next?.id === a.id && sameDay(st, now)));
                            const end = new Date(st.getTime() + (a.duration_minutes || 30) * 60000);
                            return (
                              <button key={a.id} type="button" onClick={() => setSel(a)} data-testid={`appt-${a.id}`} className="absolute flex cursor-pointer flex-col overflow-hidden text-left"
                                style={{ top: Math.max(10, top), left: 4, right: 4, height: h, padding: "4px 8px", border: `1px solid ${c.bd}`, borderRadius: 4, background: c.bg, color: c.fg, fontFamily: FONT_UI, gap: 1 }}>
                                <span style={{ fontSize: 8.5, color: c.sub }}>{hm(st)} – {hm(end)}</span>
                                <b className="truncate" style={{ fontSize: 11, fontWeight: 600 }}>{who(a)}</b>
                                {h > 40 && <span className="truncate" style={{ fontSize: 8.5, color: c.sub }}>{typeLabel(a.type)}{a.status === "scheduled" ? " · À confirmer" : ""}</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
                {DAYS.map((d) => <span key={d} style={{ padding: "8px 10px", fontSize: 8.5, color: D.muted, borderBottom: `1px solid ${D.sep}` }}>{d}</span>)}
                {Array.from({ length: Math.round((range.to.getTime() - range.from.getTime()) / 86400000) }, (_, i) => addDays(range.from, i)).map((d) => {
                  const items = appts.filter((a) => sameDay(new Date(a.appointment_date), d)).sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date));
                  const other = d.getMonth() !== cursor.getMonth();
                  return (
                    <button key={d.toISOString()} type="button" onClick={() => { setCursor(d); setView("day"); }} className="flex cursor-pointer flex-col text-left"
                      style={{ minHeight: 96, gap: 3, padding: 6, border: 0, borderRight: `1px solid ${D.sep}`, borderBottom: `1px solid ${D.sep}`, background: sameDay(d, now) ? "#f3f7f1" : "#fff", opacity: other ? .45 : 1, fontFamily: FONT_UI }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{d.getDate()}</span>
                      {items.slice(0, 3).map((a) => { const c = colors(a, false); return <span key={a.id} className="truncate" style={{ padding: "2px 5px", borderRadius: 3, background: c.bg, fontSize: 9, color: c.fg }}>{hm(new Date(a.appointment_date))} {who(a)}</span>; })}
                      {items.length > 3 && <span style={{ fontSize: 9, color: D.muted }}>+ {items.length - 3} autre{items.length - 3 > 1 ? "s" : ""}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 10, padding: "12px 18px", borderTop: `1px solid ${D.sep}`, fontSize: 10, color: D.muted }}>
              <span className="flex flex-wrap" style={{ gap: 14 }}>
                {[["#e9efed", "Consultation"], ["#e5eedd", "Suivi"], ["#fdeee3", "À confirmer"]].map(([c, l]) => <span key={l} className="flex items-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}</span>)}
              </span>
              <span>Horaires du cabinet · {S?.openTime || "08:00"}–{S?.closeTime || "18:00"} · <a href="/derm/cabinet?section=agenda" style={{ color: D.action }}>Modifier</a></span>
            </div>
          </Card>

          <div className="flex flex-col" style={{ gap: 16 }}>
            <Card>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>{cap(miniMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</b>
                <span className="flex">
                  <button type="button" aria-label="Mois précédent" onClick={() => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth() - 1, 1))} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted }}><ChevronLeft size={15} /></button>
                  <button type="button" aria-label="Mois suivant" onClick={() => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 1))} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted }}><ChevronRight size={15} /></button>
                </span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", rowGap: 4, textAlign: "center" }}>
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} style={{ fontSize: 9, color: D.muted, padding: "4px 0" }}>{d}</span>)}
                {Array.from({ length: (miniMonth.getDay() + 6) % 7 }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 0).getDate() }, (_, i) => new Date(miniMonth.getFullYear(), miniMonth.getMonth(), i + 1)).map((d) => {
                  const inWeek = view === "week" && d >= range.from && d < addDays(range.from, 7);
                  const isSel = sameDay(d, cursor), isToday = sameDay(d, now), we = d.getDay() === 0 || d.getDay() === 6;
                  const has = all.some((a) => sameDay(new Date(a.appointment_date), d));
                  return (
                    <button key={d.getDate()} type="button" onClick={() => setCursor(d)} className="relative cursor-pointer"
                      style={{ height: 28, border: 0, borderRadius: 4, background: isSel ? D.actionDark : inWeek ? D.tintChip : "transparent", color: isSel ? "#fff" : we ? D.faint : D.text, fontSize: 11, fontWeight: isToday || isSel ? 700 : 400, fontFamily: FONT_UI }}>
                      {d.getDate()}
                      {has && !isSel && <span style={{ position: "absolute", bottom: 2, left: "50%", marginLeft: -2, width: 4, height: 4, borderRadius: "50%", background: D.teal }} />}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <b style={{ fontSize: 14, fontWeight: 600 }}>{cap(cursor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</b>
              <p style={{ margin: "3px 0 10px", fontSize: 10.5, color: D.muted }}>
                {dayList.length} rendez-vous · {dayList.filter((a) => new Date(a.appointment_date) > now && a.status !== "done").length} à venir, {dayList.filter((a) => a.status === "scheduled").length} à confirmer
              </p>
              {dayList.map((a) => {
                const s = stateOf(a), isNext = next?.id === a.id;
                return (
                  <button key={a.id} type="button" onClick={() => setSel(a)} className="flex w-full cursor-pointer text-left"
                    style={{ gap: 14, padding: "9px 10px", border: 0, borderRadius: 6, background: isNext ? D.tint3 : "transparent", fontFamily: FONT_UI }}>
                    <span style={{ width: 40, fontSize: 12, color: D.text }}>{hm(new Date(a.appointment_date))}</span>
                    <span className="flex min-w-0 flex-col"><b className="truncate" style={{ fontSize: 11.5, fontWeight: 600, color: D.text }}>{who(a)}</b>
                      <span style={{ fontSize: 9.5, color: s.tone === "warn" || s.tone === "err" ? D.warn : D.muted }}>{typeLabel(a.type)} · {isNext ? "Prochain rendez-vous" : s.label}</span></span>
                  </button>
                );
              })}
              {!dayList.length && <Btn kind="link" onClick={() => setCreate({ date: ymd(cursor), time: "09:00" })}>Aucun rendez-vous. Ajouter un rendez-vous →</Btn>}
            </Card>

            {nextSuivi && (
              <Card style={{ background: D.tint3, border: 0 }} testid="agenda-next-suivi">
                <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .8, color: D.action }}>VOTRE PROCHAIN SUIVI</span>
                <b style={{ display: "block", margin: "6px 0 4px", fontSize: 18, fontWeight: 600 }}>{who(nextSuivi)}</b>
                <span style={{ fontSize: 11, color: D.muted }}>{[nextSuivi.notes?.replace(/^Contrôle · /, ""), `Suivi ${sameDay(new Date(nextSuivi.appointment_date), now) ? "à" : `le ${new Date(nextSuivi.appointment_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à`} ${hm(new Date(nextSuivi.appointment_date))}`].filter(Boolean).join(" · ")}</span>
                <div className="flex flex-col" style={{ gap: 8, marginTop: 12 }}>
                  {!isSecretary && <Btn kind="secondary" disabled={!canStart(nextSuivi)} title={canStart(nextSuivi) ? "" : "Disponible le jour même, une fois le rendez-vous confirmé"} onClick={() => go(`/derm/consultation?patient=${nextSuivi.patient_record_id}&rdv=${nextSuivi.id}`)}>Démarrer la consultation</Btn>}
                  {nextSuivi.patient_record_id && <Btn kind="primary" onClick={() => go(isSecretary ? `/derm/patients/${nextSuivi.patient_record_id}` : `/derm/dossiers/${nextSuivi.patient_record_id}`)}>Voir le dossier patient →</Btn>}
                </div>
              </Card>
            )}
          </div>
        </section>
      </Page>

      {sel && <ApptPanel a={sel} canStart={canStart(sel)} isSecretary={isSecretary} onClose={() => setSel(null)} onPatch={(b, done) => patch(sel, b, done)} go={go} />}
      {create && <CreatePanel init={create} patients={(pts?.items || []).filter((p) => !p.archived)} onClose={() => setCreate(null)} onDone={(t) => { setCreate(null); setMsg({ t, tone: "ok" }); refresh(); }} />}
    </DermShell>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" style={{ background: "rgba(13,41,41,.35)" }} onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col overflow-y-auto" style={{ background: "#fff", padding: "24px 24px", gap: 14, fontFamily: FONT_UI, color: D.text }}>
        <div className="flex items-center justify-between"><b style={{ fontSize: 17, fontWeight: 600 }}>{title}</b>
          <button type="button" aria-label="Fermer" onClick={onClose} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted }}><X size={18} /></button></div>
        {children}
      </aside>
    </div>
  );
}

function ApptPanel({ a, canStart, isSecretary, onClose, onPatch, go }: { a: Appt; canStart: boolean; isSecretary: boolean; onClose: () => void; onPatch: (b: Record<string, unknown>, done: string) => void; go: (p: string) => void }) {
  const st = new Date(a.appointment_date);
  const s = stateOf(a);
  const [moving, setMoving] = useState(false);
  const [d, setD] = useState(ymd(st));
  const [t, setT] = useState(hm(st));
  return (
    <Drawer title="Rendez-vous" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 4 }} data-testid="appt-panel">
        <b style={{ fontSize: 15, fontWeight: 600 }}>{who(a)}</b>
        {a.patient_record_id && a.patient_name && <span style={{ fontSize: 11.5, color: D.muted }}>{a.patient_name}</span>}
        <span style={{ fontSize: 12 }}>{cap(st.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} · {hm(st)} · {a.duration_minutes || 30} min</span>
        <span className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 4 }}><Tag tone="info">{typeLabel(a.type)}</Tag><Tag tone={s.tone}>{s.label}</Tag></span>
        {a.notes && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: D.muted }}>{a.notes}</p>}
        {a.patient_contact && <span style={{ fontSize: 11, color: D.muted }}>WhatsApp : {a.patient_contact}</span>}
      </div>
      {!isSecretary && (
        <div className="flex flex-col" style={{ gap: 6 }}>
          <Btn kind="primary" disabled={!canStart} onClick={() => go(`/derm/consultation?patient=${a.patient_record_id}&rdv=${a.id}`)} data-testid="appt-start">Démarrer la consultation</Btn>
          {!canStart && <span style={{ fontSize: 10, color: D.muted }}>{!a.patient_record_id ? "Rattachez d'abord une fiche patient à ce rendez-vous." : "Disponible le jour même, une fois le rendez-vous confirmé."}</span>}
        </div>
      )}
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {a.status === "scheduled" && <Btn kind="secondary" onClick={() => onPatch({ status: "confirmed" }, "Rendez-vous confirmé.")}>Confirmer</Btn>}
        {a.status !== "done" && <Btn kind="secondary" onClick={() => setMoving(!moving)}>Déplacer</Btn>}
        {a.status !== "done" && <Btn kind="secondary" onClick={() => onPatch({ status: "done" }, "Rendez-vous marqué terminé.")}>Marquer terminé</Btn>}
      </div>
      {moving && (
        <div className="flex flex-col" style={{ gap: 10, padding: 12, borderRadius: 8, background: "#f3f7f1" }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 110px", gap: 8 }}>
            <Label text="Nouvelle date"><Input type="date" value={d} onChange={(e) => setD(e.target.value)} /></Label>
            <Label text="Heure"><Input type="time" step={900} value={t} onChange={(e) => setT(e.target.value)} /></Label>
          </div>
          <Btn kind="primary" disabled={!d || !t} onClick={() => onPatch({ appointmentDate: new Date(`${d}T${t}:00`).toISOString() }, "Rendez-vous déplacé. Le patient recevra un nouveau rappel la veille.")}>Enregistrer le nouveau créneau</Btn>
        </div>
      )}
      {a.patient_record_id && <Btn kind="link" onClick={() => go(isSecretary ? `/derm/patients/${a.patient_record_id}` : `/derm/dossiers/${a.patient_record_id}`)} style={{ alignSelf: "flex-start" }}>{isSecretary ? "Ouvrir la fiche patient →" : "Ouvrir le dossier médical →"}</Btn>}
      {a.status !== "done" && <Btn kind="link" onClick={() => { if (window.confirm("Annuler ce rendez-vous ?")) onPatch({ status: "cancelled" }, "Rendez-vous annulé."); }} style={{ alignSelf: "flex-start", color: D.err }}>Annuler le rendez-vous</Btn>}
    </Drawer>
  );
}

function CreatePanel({ init, patients, onClose, onDone }: { init: { date: string; time: string }; patients: PatientLite[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [q, setQ] = useState("");
  const [pid, setPid] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const { data: cfg } = useQuery<{ settings: { slotMinutes: number } }>({ queryKey: ["/api/derm/settings"] });
  const [dur, setDur] = useState("30");
  useEffect(() => { if (cfg?.settings?.slotMinutes) setDur(String(cfg.settings.slotMinutes)); }, [cfg?.settings?.slotMinutes]);
  const [type, setType] = useState<"consultation" | "suivi">("consultation");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = patients.find((x) => x.id === pid) || null;
  const hits = q.trim().length >= 2 ? patients.filter((x) => `${patientCode(x.id)} ${x.firstName} ${x.lastName} ${x.phone || ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const submit = async (force = false) => {
    setBusy(true); setErr("");
    try {
      await api("/api/pro/appointments", "POST", {
        appointmentDate: new Date(`${date}T${time}:00`).toISOString(), durationMinutes: Number(dur), type, notes,
        patientName: p ? `${p.firstName} ${p.lastName}` : name, patientContact: p ? p.phone : phone, patientRecordId: p?.id, forceConflict: force,
      });
      onDone("Rendez-vous ajouté. Le patient recevra le rappel WhatsApp la veille.");
    } catch (e: any) {
      if (e.status === 409) setConflict(true);
      setErr(e.message);
    }
    setBusy(false);
  };
  return (
    <Drawer title="Nouveau rendez-vous" onClose={onClose}>
      <Label text="Patient">
        {p ? (
          <span className="flex items-center justify-between" style={{ padding: "8px 10px", borderRadius: 4, background: D.tintChip, fontSize: 12 }}>
            <span>Patient {patientCode(p.id)} · {p.firstName} {p.lastName}</span>
            <Btn kind="link" onClick={() => setPid(null)}>Changer</Btn>
          </span>
        ) : (
          <>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par code, nom ou téléphone" data-testid="create-q" />
            {hits.map((x) => <button key={x.id} type="button" onClick={() => setPid(x.id)} className="cursor-pointer text-left hover:bg-[#f3f7f1]" style={{ padding: "7px 10px", border: 0, borderBottom: `1px solid ${D.sep}`, background: "#fff", fontSize: 11.5, fontFamily: FONT_UI, color: D.text }}>Patient {patientCode(x.id)} · {x.firstName} {x.lastName}</button>)}
          </>
        )}
      </Label>
      {!p && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Label text="Ou nouveau : nom"><Input value={name} onChange={(e) => setName(e.target.value)} /></Label>
          <Label text="Téléphone WhatsApp"><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Label>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: "1fr 110px", gap: 8 }}>
        <Label text="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Label>
        <Label text="Heure"><Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Label>
      </div>
      <Label text="Type"><span className="flex" style={{ gap: 6 }}><Chip on={type === "consultation"} onClick={() => setType("consultation")}>Consultation</Chip><Chip on={type === "suivi"} onClick={() => setType("suivi")}>Suivi</Chip></span></Label>
      <Label text="Durée"><Select value={dur} onChange={(e) => setDur(e.target.value)} style={{ width: "100%" }}>{["15", "20", "30", "45", "60"].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Label>
      <Label text="Note (facultatif, sans détail médical si le patient la reçoit)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></Label>
      {err && <span style={{ fontSize: 11, color: D.err }}>{err}</span>}
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <Btn kind="primary" disabled={busy || !date || !time || (!p && name.trim().length < 2)} onClick={() => submit(false)} data-testid="create-submit">Ajouter le rendez-vous</Btn>
        {conflict && <Btn kind="secondary" disabled={busy} onClick={() => submit(true)}>Ajouter quand même</Btn>}
      </div>
    </Drawer>
  );
}
