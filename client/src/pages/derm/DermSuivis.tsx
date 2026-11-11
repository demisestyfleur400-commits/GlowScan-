import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { DermShell } from "@/components/derm/DermShell";
import { D, FONT_UI, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, StatCard, Card, Btn, Input, Label, Tabs, Tag, Notice, fr, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Suivis · continuité des soins (handoff §3.6). Un suivi = un patient avec un
// prochain contrôle. Statuts : aujourd'hui · à relancer (contrôle dépassé) ·
// planifié. Relance WhatsApp sans détail médical, confirmée à l'écran.
// ════════════════════════════════════════════════════════════════════════

export type Fu = { id: number; firstName: string; lastName: string; phone: string | null; reason: string | null; dx: string | null; due: string; lastVisit: string | null;
  status: "today" | "late" | "plan"; lateDays: number; apptStatus: string | null; relancedAt: string | null; lastMsg: string | null };
type Resp = { items: Fu[]; stats: { active: number; today: number; late: number; plan: number }; today: { id: number; at: string; patientId: number | null; name: string; notes: string | null }[]; relanceText: string };
type K = "all" | "today" | "late" | "plan";
const pad = (n: number) => String(n).padStart(2, "0");
const hm = (v: string) => new Date(v).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const ST: Record<Fu["status"], [string, "draft" | "err" | "ok"]> = { today: ["Aujourd'hui", "draft"], late: ["À relancer", "err"], plan: ["Planifié", "ok"] };

export function RelanceModal({ items, text, onClose, onSent }: { items: { id: number; label: string; phone: string | null }[]; text: string; onClose: () => void; onSent: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const d = await api<{ sent: number; results: { id: number; sent: boolean; reason?: string }[] }>("/api/derm/followups/relance", "POST", { patientIds: items.map((x) => x.id) });
      const fails = d.results.filter((r) => !r.sent);
      onSent(`${d.sent} relance${d.sent > 1 ? "s" : ""} envoyée${d.sent > 1 ? "s" : ""}${fails.length ? ` · ${fails.length} non envoyée${fails.length > 1 ? "s" : ""} (${Array.from(new Set(fails.map((f) => f.reason))).join(", ")})` : ""}.`);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center" style={{ padding: 16 }}>
      <div className="absolute inset-0" style={{ background: "rgba(13,41,41,.35)" }} onClick={onClose} />
      <div className="relative flex w-full max-w-[520px] flex-col" style={{ gap: 14, padding: 24, borderRadius: 12, background: "#fff", fontFamily: FONT_UI, color: D.text }} data-testid="relance-modal">
        <div className="flex items-center justify-between"><b style={{ fontSize: 17, fontWeight: 600 }}>Préparer une relance</b>
          <button type="button" aria-label="Fermer" onClick={onClose} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted }}><X size={18} /></button></div>
        <span style={{ fontSize: 11.5, color: D.muted }}>Message WhatsApp envoyé à {items.length} patient{items.length > 1 ? "s" : ""}, sans aucun détail médical :</span>
        <div style={{ padding: 14, borderRadius: 8, background: "#e7f3e8", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{text}{"\n\n"}Pour ne plus recevoir ces rappels, répondez ARRÊT SUIVI</div>
        <div style={{ fontSize: 11 }}>{items.map((x) => <div key={x.id} style={{ padding: "4px 0", borderBottom: `1px solid ${D.sep}` }}>{x.label}{x.phone ? "" : <span style={{ color: D.err }}> · pas de numéro</span>}</div>)}</div>
        {err && <span style={{ fontSize: 11, color: D.err }}>{err}</span>}
        <div className="flex justify-end" style={{ gap: 8 }}>
          <Btn kind="secondary" onClick={onClose}>Annuler</Btn>
          <Btn kind="primary" disabled={busy || !items.some((x) => x.phone)} onClick={send} data-testid="relance-send">Envoyer {items.length > 1 ? `les ${items.length} relances` : "la relance"}</Btn>
        </div>
      </div>
    </div>
  );
}

export function CreateFollowup({ onClose, onDone, presetId }: { onClose: () => void; onDone: (msg: string, id: number) => void; presetId?: number }) {
  const { data: pts } = useQuery<{ items: { id: number; firstName: string; lastName: string; archived: boolean }[] }>({ queryKey: ["/api/derm/patients"] });
  const [q, setQ] = useState("");
  const [pid, setPid] = useState<number | null>(presetId || null);
  const [date, setDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().slice(0, 10); });
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const list = (pts?.items || []).filter((p) => !p.archived);
  const p = list.find((x) => x.id === pid);
  const hits = q.trim().length >= 2 ? list.filter((x) => `${patientCode(x.id)} ${x.firstName} ${x.lastName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const submit = async () => {
    if (!pid) return;
    setBusy(true); setErr("");
    try { await api("/api/derm/followups", "POST", { patientId: pid, date, time, reason }); onDone("Suivi créé : le contrôle est dans l'Agenda, rappel WhatsApp la veille.", pid); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" style={{ background: "rgba(13,41,41,.35)" }} onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col overflow-y-auto" style={{ gap: 14, padding: 24, background: "#fff", fontFamily: FONT_UI, color: D.text }} data-testid="create-followup">
        <div className="flex items-center justify-between"><b style={{ fontSize: 17, fontWeight: 600 }}>Créer un suivi</b>
          <button type="button" aria-label="Fermer" onClick={onClose} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted }}><X size={18} /></button></div>
        <Label text="Patient">
          {p ? (
            <span className="flex items-center justify-between" style={{ padding: "8px 10px", borderRadius: 4, background: D.tintChip, fontSize: 12 }}>
              <span>Patient {patientCode(p.id)} · {p.firstName} {p.lastName}</span>{!presetId && <Btn kind="link" onClick={() => setPid(null)}>Changer</Btn>}
            </span>
          ) : (
            <>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par code ou nom" />
              {hits.map((x) => <button key={x.id} type="button" onClick={() => setPid(x.id)} className="cursor-pointer text-left hover:bg-[#f3f7f1]" style={{ padding: "7px 10px", border: 0, borderBottom: `1px solid ${D.sep}`, background: "#fff", fontSize: 11.5, fontFamily: FONT_UI, color: D.text }}>Patient {patientCode(x.id)} · {x.firstName} {x.lastName}</button>)}
            </>
          )}
        </Label>
        <Label text="Cas suivi"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. Acné inflammatoire, mélasma…" /></Label>
        <div className="grid" style={{ gridTemplateColumns: "1fr 110px", gap: 8 }}>
          <Label text="Date du contrôle"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Label>
          <Label text="Heure"><Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Label>
        </div>
        <span style={{ fontSize: 10.5, color: D.muted }}>Le contrôle est ajouté à l'Agenda (décalé de 30 min si le créneau est pris). Le patient reçoit le rappel WhatsApp la veille.</span>
        {err && <span style={{ fontSize: 11, color: D.err }}>{err}</span>}
        <Btn kind="primary" disabled={busy || !pid || !date} onClick={submit} data-testid="create-followup-submit">Créer le suivi</Btn>
      </aside>
    </div>
  );
}

export default function DermSuivis() {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data: acc } = useProAccount();
  const isSecretary = acc?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) go("/derm/agenda"); }, [isSecretary, go]);
  const { data } = useQuery<Resp>({ queryKey: ["/api/derm/followups"], enabled: !!acc && !isSecretary });
  const [f, setF] = useState<K>("all");
  const [q, setQ] = useState("");
  const [relance, setRelance] = useState<Fu[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const refresh = () => qc.invalidateQueries({ predicate: (x) => String(x.queryKey[0]).startsWith("/api/derm/followups") });

  const items = data?.items || [];
  const n = (k: Fu["status"]) => items.filter((x) => x.status === k).length;
  const rows = useMemo(() => items.filter((x) => (f === "all" || x.status === f) && (!q.trim() || `${patientCode(x.id)} ${x.firstName} ${x.lastName} ${x.dx || ""}`.toLowerCase().includes(q.toLowerCase()))), [items, f, q]);
  const late = items.filter((x) => x.status === "late");
  const pending = late.filter((x) => !x.relancedAt);
  const prep = items.find((x) => x.status === "today") || items.find((x) => x.status === "plan");
  const st = data?.stats || { active: 0, today: 0, late: 0, plan: 0 };
  const grid = "minmax(140px,1.3fr) minmax(120px,1.3fr) minmax(100px,1fr) 100px 60px";
  const dueSub = (x: Fu) => (x.status === "late" ? `${x.lateDays} jour${x.lateDays > 1 ? "s" : ""} de retard` : hm(x.due));
  const lateNote = (x: Fu) => (x.relancedAt ? "Relancé · en attente de réponse" : x.apptStatus === "scheduled" ? "Rendez-vous non confirmé" : x.lastMsg ? "Message reçu, à traiter" : "Sans réponse");

  return (
    <DermShell active="suivis">
      <Page>
        <ScreenHeader kicker="CONTINUITÉ DES SOINS" title="Chaque patient, un suivi continu." sub="Contrôles, évolutions et relances : tout votre suivi au même endroit."
          actions={<><span style={{ fontSize: 12, color: D.muted }}>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span><Btn kind="primary" onClick={() => setCreating(true)} data-testid="suivis-new">Créer un suivi +</Btn></>} />
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 18 }}>
          <StatCard label="Suivis actifs" value={pad(st.active)} sub="Toutes évolutions en cours" onClick={() => setF("all")} />
          <StatCard label="À réaliser aujourd'hui" value={pad(st.today)} sub={`${st.today} contrôle${st.today > 1 ? "s" : ""} au cabinet`} onClick={() => setF("today")} />
          <StatCard tone={st.late ? "warn" : "light"} label="Relances à traiter" value={pad(st.late)} sub={st.late ? "Échéances dépassées" : "Toutes envoyées ✓"} onClick={() => setF("late")} />
          <StatCard label="Contrôles planifiés" value={pad(st.plan)} sub="Prochaines étapes confirmées" onClick={() => setF("plan")} />
        </section>

        <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,1fr)", gap: 16 }}>
          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card>
              <div className="flex flex-wrap items-center justify-between" style={{ gap: 10 }}>
                <b style={{ fontSize: 17, fontWeight: 600 }}>Mes suivis</b>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient…" style={{ width: 220, height: 32 }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <Tabs underline value={f} onChange={setF} items={[["all", `Tous · ${items.length}`], ["today", `Aujourd'hui · ${n("today")}`], ["late", `À relancer · ${n("late")}`], ["plan", `Planifiés · ${n("plan")}`]]} />
              </div>
              <div className="overflow-x-auto">
                <div style={{ minWidth: 540 }}>
                  <div className="grid" style={{ gridTemplateColumns: grid, gap: 12, padding: "12px 0 10px", borderBottom: `1px solid ${D.sep}`, color: D.muted, fontSize: 8.5, fontWeight: 600, letterSpacing: .8 }}>
                    <span>PATIENT · DERNIÈRE VISITE</span><span>CAS SUIVI</span><span>ÉCHÉANCE</span><span>STATUT</span><span style={{ textAlign: "right" }}>ACTION</span>
                  </div>
                  {rows.map((x) => (
                    <div key={x.id} role="button" tabIndex={0} onClick={() => go(`/derm/suivis/${x.id}`)} onKeyDown={(e) => { if (e.key === "Enter") go(`/derm/suivis/${x.id}`); }}
                      className="grid cursor-pointer items-center hover:bg-[#f8faf7]" data-testid={`suivi-row-${x.id}`}
                      style={{ gridTemplateColumns: grid, gap: 12, minHeight: 50, padding: "8px 0", borderBottom: `1px solid ${D.sep}`, fontSize: 11 }}>
                      <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>Patient {patientCode(x.id)}</b><span style={{ fontSize: 9.5, color: D.muted }}>{fr(x.lastVisit)}</span></span>
                      <span className="truncate">{x.dx || <span style={{ color: D.faint }}>Non précisé</span>}</span>
                      <span className="flex flex-col"><span>{fr(x.due, { day: "numeric", month: "short" })}</span><span style={{ fontSize: 9.5, color: x.status === "late" ? D.err : D.muted }}>{dueSub(x)}</span></span>
                      <span><Tag tone={x.status === "late" && x.relancedAt ? "ok" : ST[x.status][1]}>{x.status === "late" && x.relancedAt ? "Relancé ✓" : ST[x.status][0]}</Tag></span>
                      <span style={{ color: D.action, fontWeight: 600, textAlign: "right" }}>Ouvrir →</span>
                    </div>
                  ))}
                  {!rows.length && <p style={{ margin: 0, padding: "24px 0", textAlign: "center", fontSize: 12, color: D.muted }}>{items.length ? "Aucun suivi ne correspond." : "Aucun suivi en cours. Un contrôle choisi dans un compte rendu, ou « Créer un suivi + », l'ajoute ici."}</p>}
                </div>
              </div>
              <span style={{ display: "block", marginTop: 12, fontSize: 9.5, color: D.muted }}>{rows.length} suivi{rows.length > 1 ? "s" : ""} affiché{rows.length > 1 ? "s" : ""}</span>
            </Card>
            {prep && (
              <Card style={{ background: D.tint3, border: 0 }} className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col" style={{ gap: 4 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>À préparer · Patient {patientCode(prep.id)}</b>
                  <span style={{ fontSize: 11.5 }}>Contrôle du {fr(prep.due, { day: "numeric", month: "long" })}{prep.dx ? ` · ${prep.dx}` : ""} : revoir l'évolution, la tolérance et l'observance.</span>
                  {prep.lastMsg && <span style={{ fontSize: 10, color: D.muted }}>Un retour du patient a été reçu.</span>}
                </span>
                <Btn kind="primary" onClick={() => go(`/derm/suivis/${prep.id}`)}>Ouvrir le suivi →</Btn>
              </Card>
            )}
          </div>

          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card>
              <span style={{ padding: "4px 8px", borderRadius: 3, background: D.tintChip, color: D.action, fontSize: 9, fontWeight: 700, letterSpacing: .5 }}>AUJOURD'HUI · {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).toUpperCase()}</span>
              <b style={{ display: "block", margin: "12px 0 6px", fontSize: 16, fontWeight: 600 }}>{data?.today.length ? `${data.today.length === 1 ? "Un rendez-vous" : `${data.today.length} rendez-vous`} pour faire le point.` : "Aucun contrôle aujourd'hui."}</b>
              {(data?.today || []).map((a) => (
                <button key={a.id} type="button" onClick={() => a.patientId && go(`/derm/suivis/${a.patientId}`)} className="flex w-full cursor-pointer items-center text-left"
                  style={{ gap: 16, padding: "12px 0", border: 0, borderTop: `1px solid ${D.sep}`, background: "none", fontFamily: FONT_UI, color: D.text }}>
                  <span style={{ fontSize: 15 }}>{hm(a.at)}</span>
                  <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>{a.patientId ? `Patient ${patientCode(a.patientId)}` : a.name}</b><span style={{ fontSize: 9.5, color: D.muted }}>{a.notes || "Contrôle"}</span></span>
                </button>
              ))}
              <Btn kind="link" onClick={() => go("/derm/agenda")} style={{ marginTop: 6 }}>Voir l'agenda complet →</Btn>
            </Card>
            <Card className="flex flex-col" style={{ gap: 6 }} testid="suivis-late">
              <b style={{ fontSize: 16, fontWeight: 600 }}>Garder le lien, sans oublier.</b>
              <span style={{ fontSize: 11, color: D.muted }}>{pending.length ? `${pending.length} contrôle${pending.length > 1 ? "s dépassés nécessitent" : " dépassé nécessite"} une action du cabinet.` : late.length ? "Toutes les relances sont parties. Les réponses arriveront ici." : "Aucun contrôle dépassé."}</span>
              {late.map((x) => (
                <button key={x.id} type="button" onClick={() => go(`/derm/suivis/${x.id}`)} className="flex w-full cursor-pointer items-center justify-between text-left"
                  style={{ gap: 10, padding: "10px 0", border: 0, borderTop: `1px solid ${D.sep}`, background: "none", fontFamily: FONT_UI, color: D.text }}>
                  <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>Patient {patientCode(x.id)}</b><span style={{ fontSize: 9.5, color: D.muted }}>{lateNote(x)}</span></span>
                  <Tag tone={x.relancedAt ? "ok" : "err"}>{x.relancedAt ? "Relancé ✓" : `${x.lateDays} jour${x.lateDays > 1 ? "s" : ""}`}</Tag>
                </button>
              ))}
              <Btn kind="primary" disabled={!pending.length} onClick={() => setRelance(pending)} style={{ marginTop: 8, width: "100%" }} data-testid="suivis-relance">{pending.length ? "Préparer une relance →" : "Relances envoyées ✓"}</Btn>
            </Card>
            <div style={{ padding: "4px 18px" }}>
              <b style={{ fontSize: 12, fontWeight: 600 }}>Des rappels respectueux de la confidentialité</b>
              <p style={{ margin: "4px 0 0", fontSize: 10.5, color: D.muted }}>Vérifiez le consentement et le canal avant l'envoi. Aucun détail médical dans le rappel. Le patient peut répondre ARRÊT SUIVI à tout moment.</p>
            </div>
          </div>
        </section>
      </Page>
      {relance && <RelanceModal items={relance.map((x) => ({ id: x.id, label: `Patient ${patientCode(x.id)} · ${x.firstName} ${x.lastName}`, phone: x.phone }))} text={data?.relanceText.replace("[prénom]", relance.length === 1 ? relance[0].firstName : "[prénom du patient]") || ""}
        onClose={() => setRelance(null)} onSent={(t) => { setRelance(null); setMsg({ t, tone: "ok" }); refresh(); }} />}
      {creating && <CreateFollowup onClose={() => setCreating(false)} onDone={(t, id) => { setCreating(false); setMsg({ t, tone: "ok" }); refresh(); go(`/derm/suivis/${id}`); }} />}
    </DermShell>
  );
}
