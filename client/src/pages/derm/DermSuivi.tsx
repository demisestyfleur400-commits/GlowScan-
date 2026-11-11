import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, Card, Btn, Select, Textarea, Tabs, Tag, Notice, fr, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";
import { RelanceModal, CreateFollowup } from "./DermSuivis";

// ════════════════════════════════════════════════════════════════════════
// Suivi · fiche individuelle (handoff §3.6) : prochain contrôle, rappel,
// dernier message du patient (sa voix, entre guillemets), fil d'évolution.
// ════════════════════════════════════════════════════════════════════════

type Ev = { at: string; kind: string; eventId: number | null; title: string; body: string; evolution: string | null; attachment: string | null; reportId?: number; format?: string };
type Fiche = {
  patient: { id: number; firstName: string; lastName: string; age: number | null; sex: string | null; phone: string | null; closedAt: string | null };
  followup: { status: "today" | "late" | "plan"; lateDays: number; apptStatus: string | null; relancedAt: string | null } | null;
  reason: string | null; openedAt: string | null; lastConsult: string | null; evolution: { value: string; at: string } | null;
  nextControl: string | null; nextAppt: { id: number; at: string; status: string } | null; lastPatientMsg: { body: string; at: string } | null; remindersStoppedAt: string | null;
  timeline: Ev[]; appointments: { id: number; at: string; type: string; status: string; notes: string | null }[];
  documents: { kind: string; id: number; label: string; at: string; sub: string; url?: string; format?: string }[];
  reminders: { at: string; label: string; tag: string }[]; relanceText: string;
};
type Tab = "evo" | "rdv" | "docs" | "rem";
const EVOS = ["Amélioration nette", "Amélioration partielle", "Stable", "Aggravation", "À confirmer en consultation"];
const APPT: Record<string, string> = { scheduled: "À confirmer", confirmed: "Confirmé", done: "Réalisé", cancelled: "Annulé" };

export default function DermSuivi() {
  const [, params] = useRoute("/derm/suivis/:id");
  const id = Number(params?.id);
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data: acc } = useProAccount();
  const isSecretary = acc?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) go("/derm/agenda"); }, [isSecretary, go]);
  const key = `/api/derm/followups/${id}`;
  const { data, error } = useQuery<Fiche>({ queryKey: [key], enabled: !!id && !!acc && !isSecretary });
  const [tab, setTab] = useState<Tab>("evo");
  const [evo, setEvo] = useState(EVOS[4]);
  const [note, setNote] = useState("");
  const [att, setAtt] = useState<{ name: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const [relance, setRelance] = useState(false);
  const [planning, setPlanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries({ predicate: (x) => String(x.queryKey[0]).startsWith("/api/derm/followups") });

  if (error) return <DermShell active="suivis"><Page><Notice tone="err">Suivi introuvable.</Notice><Btn kind="link" onClick={() => go("/derm/suivis")}>← Tous les suivis</Btn></Page></DermShell>;
  if (!data) return <DermShell active="suivis"><Page><span style={{ fontSize: 12, color: D.muted }}>Chargement du suivi…</span></Page></DermShell>;

  const p = data.patient;
  const code = patientCode(p.id);
  const closed = !!p.closedAt;
  const dr = `Dr. ${String((acc?.account as any)?.fullName || "").replace(/^dr\.?\s+/i, "")}`;
  const ctlStatus = closed ? "Suivi clos" : !data.nextControl ? "Aucun contrôle programmé" : data.followup?.status === "late" ? "À reprogrammer" : data.nextAppt?.status === "confirmed" ? "Au cabinet · Confirmé" : "Au cabinet · À confirmer";
  const strip: [string, string, string][] = [
    ["CAS SUIVI", data.reason || "Non précisé", data.openedAt ? `Suivi ouvert le ${fr(data.openedAt, { day: "numeric", month: "long" })}` : ""],
    ["DERNIÈRE CONSULTATION", data.lastConsult ? fr(data.lastConsult, { day: "numeric", month: "long", year: "numeric" }) : "Aucune", dr],
    ["ÉVOLUTION DOCUMENTÉE", data.evolution?.value || "À documenter", data.evolution ? `Observation du médecin · ${fr(data.evolution.at, { day: "numeric", month: "short" })}` : "Ajoutez une observation ci-dessous"],
    ["PROCHAIN CONTRÔLE", data.nextControl ? fr(data.nextControl, { day: "numeric", month: "long" }) : "—", ctlStatus],
  ];
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setMsg({ t: "Pièce jointe trop lourde (5 Mo au plus).", tone: "err" }); return; }
    const r = new FileReader(); r.onload = () => setAtt({ name: f.name, data: String(r.result) }); r.readAsDataURL(f);
  };
  const saveObs = async () => {
    setBusy(true);
    try { await api(`${key}/observation`, "POST", { evolution: evo, note, attachment: att?.data, attachmentName: att?.name }); setNote(""); setAtt(null); setMsg({ t: "Observation enregistrée.", tone: "ok" }); refresh(); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };
  const toggleClose = async () => {
    if (!closed && !window.confirm("Clore ce suivi ? Il sortira de la liste des suivis actifs. Vous pourrez le rouvrir.")) return;
    try { await api(`${key}/close`, "POST", { closed: !closed }); setMsg({ t: closed ? "Suivi rouvert." : "Suivi clos.", tone: "ok" }); refresh(); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
  };
  const openDoc = (d: Fiche["documents"][number]) => window.open(d.kind === "report" ? `/api/reports/${d.id}/view?v=${d.format === "a4" ? "a4" : "cabinet"}` : d.kind === "photo" ? d.url! : `${key}/attachments/${d.id}`, "_blank", "noopener");

  return (
    <DermShell active="suivis">
      <Page>
        <ScreenHeader kicker="SUIVI · FICHE INDIVIDUELLE" title={`Suivi · Patient ${code}`} sub={`${p.lastName} ${p.firstName}${p.age ? ` · ${p.age} ans` : ""}`}
          actions={<>
            <Btn kind="link" onClick={() => go("/derm/suivis")}>← Tous les suivis</Btn>
            <Btn kind="secondary" onClick={toggleClose} data-testid="suivi-close">{closed ? "Suivi clos ✓ · Rouvrir" : "Clore le suivi"}</Btn>
            <Btn kind="primary" onClick={() => go(`/derm/dossiers/${p.id}`)}>Ouvrir le dossier médical →</Btn>
          </>} />
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, marginBottom: 16 }}>
          {strip.map(([l, v, s], i) => (
            <div key={l} className="flex flex-col" style={{ gap: 5, padding: "16px 20px", borderLeft: i ? `1px solid ${D.border}` : 0 }}>
              <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: .8, color: D.muted }}>{l}</span>
              <b style={{ fontSize: 13, fontWeight: 600 }}>{v}</b>
              <span style={{ fontSize: 10, color: i === 3 && data.followup?.status === "late" ? D.err : D.muted }}>{s}</span>
            </div>
          ))}
        </section>

        <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1.45fr) minmax(290px,1fr)", gap: 16 }}>
          <Card>
            <Tabs value={tab} onChange={setTab} items={[["evo", "Évolution & observations"], ["rdv", "Rendez-vous"], ["docs", "Documents"], ["rem", "Historique des rappels"]]} />
            {tab === "evo" && (
              <div style={{ marginTop: 16 }}>
                <div className="flex flex-col" style={{ gap: 10, padding: 14, borderRadius: 8, background: "#f8faf7", border: `1px solid ${D.sep}` }} data-testid="suivi-obs">
                  <div className="flex items-center justify-between"><b style={{ fontSize: 13, fontWeight: 600 }}>Nouvelle observation</b><Tag tone="muted">Brouillon</Tag></div>
                  <Select value={evo} onChange={(e) => setEvo(e.target.value)} style={{ width: "100%" }}>{EVOS.map((x) => <option key={x}>{x}</option>)}</Select>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce que vous observez : évolution des lésions, tolérance, observance…" rows={3} />
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
                    <Btn kind="link" onClick={() => fileRef.current?.click()}>{att ? `${att.name} ✓` : "+ Joindre un document"}</Btn>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
                    <Btn kind="primary" disabled={busy || (!note.trim() && !evo)} onClick={saveObs} data-testid="suivi-obs-save">Enregistrer l'observation</Btn>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 10.5, color: D.muted }}>{data.timeline.length} événement{data.timeline.length > 1 ? "s" : ""}</span>
                  {data.timeline.map((e, i) => (
                    <div key={i} className="grid" style={{ gridTemplateColumns: "60px 16px minmax(0,1fr)", gap: 8, paddingTop: 12 }}>
                      <b style={{ fontSize: 11, fontWeight: 700 }}>{fr(e.at, { day: "2-digit", month: "short" }).toUpperCase().replace(".", "")}</b>
                      <span className="flex flex-col items-center"><span style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? D.action : "#b9cdbf", marginTop: 3 }} /><span style={{ flex: 1, width: 1, background: i === data.timeline.length - 1 ? "transparent" : D.border }} /></span>
                      <span className="flex flex-col" style={{ gap: 3, paddingBottom: 6 }}>
                        <b style={{ fontSize: 12, fontWeight: 600 }}>{e.title}{e.evolution ? ` · ${e.evolution}` : ""}</b>
                        {e.body && <span style={{ fontSize: 11.5, fontStyle: e.kind === "patient_msg" ? "italic" : undefined }}>{e.kind === "patient_msg" ? `« ${e.body} »` : e.body}</span>}
                        <span style={{ fontSize: 10, color: D.muted }}>{e.kind === "patient_msg" ? "WhatsApp du patient" : dr}</span>
                        {e.attachment && e.eventId && <Btn kind="link" onClick={() => window.open(`${key}/attachments/${e.eventId}`, "_blank", "noopener")} style={{ alignSelf: "flex-start", fontSize: 10 }}>{e.attachment} →</Btn>}
                        {e.reportId && <Btn kind="link" onClick={() => window.open(`/api/reports/${e.reportId}/view?v=${e.format === "a4" ? "a4" : "cabinet"}`, "_blank", "noopener")} style={{ alignSelf: "flex-start", fontSize: 10 }}>Ouvrir le compte rendu →</Btn>}
                      </span>
                    </div>
                  ))}
                  {!data.timeline.length && <p style={{ margin: "10px 0 0", fontSize: 11.5, color: D.muted }}>Aucun événement pour l'instant.</p>}
                </div>
              </div>
            )}
            {tab !== "evo" && (
              <div style={{ marginTop: 14 }}>
                <b style={{ fontSize: 13, fontWeight: 600 }}>{{ rdv: "Rendez-vous", docs: "Documents du suivi", rem: "Historique des rappels" }[tab]}</b>
                <p style={{ margin: "2px 0 8px", fontSize: 10.5, color: D.muted }}>{{ rdv: "Passés et à venir", docs: "Comptes rendus, photos et pièces jointes", rem: "Messages envoyés au patient · sans détail médical" }[tab]}</p>
                {tab === "rdv" && data.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between" style={{ gap: 10, padding: "10px 0", borderTop: `1px solid ${D.sep}` }}>
                    <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>{fr(a.at, { weekday: "short", day: "numeric", month: "long" })} · {new Date(a.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b><span style={{ fontSize: 10, color: D.muted }}>{a.type === "suivi" ? "Contrôle au cabinet" : "Consultation"}{a.notes ? ` · ${a.notes}` : ""}</span></span>
                    <Tag tone={a.status === "confirmed" || a.status === "done" ? "ok" : a.status === "cancelled" ? "muted" : "warn"}>{APPT[a.status] || a.status}</Tag>
                  </div>
                ))}
                {tab === "docs" && data.documents.map((d) => (
                  <div key={`${d.kind}-${d.id}`} className="flex items-center justify-between" style={{ gap: 10, padding: "10px 0", borderTop: `1px solid ${D.sep}` }}>
                    <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>{d.label} · {fr(d.at)}</b><span style={{ fontSize: 10, color: D.muted }}>{d.sub}</span></span>
                    <Btn kind="link" onClick={() => openDoc(d)}>Ouvrir →</Btn>
                  </div>
                ))}
                {tab === "rem" && data.reminders.map((r, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ gap: 10, padding: "10px 0", borderTop: `1px solid ${D.sep}` }}>
                    <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>{fr(r.at, { day: "numeric", month: "short" })} · {new Date(r.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b><span style={{ fontSize: 10, color: D.muted }}>{r.label}</span></span>
                    <Tag>{r.tag}</Tag>
                  </div>
                ))}
                {((tab === "rdv" && !data.appointments.length) || (tab === "docs" && !data.documents.length) || (tab === "rem" && !data.reminders.length)) && <p style={{ margin: 0, fontSize: 11.5, color: D.muted }}>Rien pour l'instant.</p>}
              </div>
            )}
          </Card>

          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card className="flex flex-col" style={{ gap: 6 }}>
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .8, color: D.action }}>PROCHAIN CONTRÔLE</span>
              <b style={{ fontSize: 18, fontWeight: 600 }}>{data.nextControl ? fr(data.nextControl, { weekday: "long", day: "numeric", month: "long" }) : "Aucun contrôle"}</b>
              <span style={{ fontSize: 11, color: D.muted }}>{data.nextControl ? `${new Date(data.nextControl).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${ctlStatus}` : "Programmez un contrôle pour garder le lien."}</span>
              <div className="flex flex-wrap" style={{ gap: 8, marginTop: 6 }}>
                <Btn kind="secondary" onClick={() => setPlanning(true)}>{data.nextControl ? "Reprogrammer" : "Programmer un contrôle"}</Btn>
                <Btn kind="link" onClick={() => go("/derm/agenda")}>Voir l'agenda →</Btn>
              </div>
            </Card>
            <Card className="flex flex-col" style={{ gap: 6 }} testid="suivi-voice">
              <b style={{ fontSize: 13, fontWeight: 600 }}>Dernier message du patient</b>
              {data.lastPatientMsg ? (
                <>
                  <span style={{ fontSize: 10, color: D.muted }}>Reçu le {fr(data.lastPatientMsg.at, { day: "numeric", month: "long" })} · WhatsApp</span>
                  <p style={{ margin: "4px 0 0", fontSize: 13, fontStyle: "italic", lineHeight: 1.5 }}>« {data.lastPatientMsg.body} »</p>
                </>
              ) : <span style={{ fontSize: 11.5, color: D.muted }}>Aucun retour reçu.</span>}
            </Card>
            <Card className="flex flex-col" style={{ gap: 8 }}>
              <b style={{ fontSize: 13, fontWeight: 600 }}>Rappel</b>
              {data.remindersStoppedAt ? (
                <span style={{ fontSize: 11, color: D.err }}>Le patient a demandé l'arrêt des rappels de suivi le {fr(data.remindersStoppedAt, { day: "numeric", month: "long" })}. Contactez-le directement.</span>
              ) : (
                <>
                  <span style={{ fontSize: 11, color: D.muted }}>{data.followup?.relancedAt ? `Dernière relance le ${fr(data.followup.relancedAt, { day: "numeric", month: "long" })}.` : "Le rappel de la veille part automatiquement avant chaque contrôle confirmé."}</span>
                  <Btn kind={data.followup?.status === "late" ? "primary" : "secondary"} disabled={!p.phone || closed} onClick={() => setRelance(true)} data-testid="suivi-relance">{p.phone ? "Préparer un rappel" : "Pas de numéro WhatsApp"}</Btn>
                </>
              )}
            </Card>
          </div>
        </section>
      </Page>
      {relance && <RelanceModal items={[{ id: p.id, label: `Patient ${code} · ${p.firstName} ${p.lastName}`, phone: p.phone }]} text={data.relanceText} onClose={() => setRelance(false)} onSent={(t) => { setRelance(false); setMsg({ t, tone: "ok" }); refresh(); }} />}
      {planning && <CreateFollowup presetId={p.id} onClose={() => setPlanning(false)} onDone={(t) => { setPlanning(false); setMsg({ t, tone: "ok" }); refresh(); }} />}
    </DermShell>
  );
}
