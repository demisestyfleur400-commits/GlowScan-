import { Fragment, useEffect, useMemo, useState } from "react";
import { DermShell } from "@/components/derm/DermShell";
import { D, FONT_UI } from "@/components/derm/tokens";
import { Page, ScreenHeader, Card, Input, Notice } from "@/components/derm/ui";
import { ConsultationChat } from "@/components/ConsultationChat";
import { ConsultReportPanel } from "@/components/derm/ConsultReportPanel";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Messagerie · consultations en ligne (handoff §3.9). Trois colonnes :
// conversations (filtres En cours / À valider), échange avec le patient
// (logique existante : messages, photos, appel, résumé IA, validation du
// diagnostic Glow), « Rapport & ordonnance » au modèle A4 unique.
// Patients anonymisés « Patiente GP-148 » (numéro de la consultation).
// ════════════════════════════════════════════════════════════════════════

type Consult = {
  id: number; condition?: string | null; status?: string; unreadDoctor?: number; patientFirstName?: string | null; lastMessageAt?: string | null; createdAt?: string | null; isDemo?: boolean;
  patientAge?: string | null; patientSex?: "F" | "M" | null; patientCity?: string | null; linkedPatientId?: number | null; lastBody?: string | null; lastSender?: string | null;
  doctorMessages?: number; reportId?: number | null; reportSignedAt?: string | null; reportSentAt?: string | null;
};
type F = "all" | "open" | "validate";
const TZ = "Africa/Douala";
const gp = (c: Consult) => `${c.patientSex === "F" ? "Patiente" : "Patient"} GP-${String(c.id).padStart(3, "0")}`;
const when = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v), today = d.toLocaleDateString("fr-CA", { timeZone: TZ }) === new Date().toLocaleDateString("fr-CA", { timeZone: TZ });
  return today ? d.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "short" });
};
// « À valider » : le médecin a déjà répondu, le compte rendu n'est pas encore signé.
const toValidate = (c: Consult) => c.status !== "closed" && !c.reportSignedAt && (c.doctorMessages || 0) > 0;
const stateOf = (c: Consult): [string, string] =>
  c.reportSentAt ? ["Rapport remis", D.action] : c.reportSignedAt ? ["Validé · à remettre", "#138c84"] : (c.unreadDoctor || 0) > 0 ? ["Nouveau message", D.action] : toValidate(c) ? ["À valider", D.warn] : c.status === "closed" ? ["Clôturée", D.muted] : ["En cours", D.muted];
const stageOf = (c?: Consult | null) => (!c ? 0 : c.reportSignedAt ? 3 : (c.doctorMessages || 0) > 0 ? 2 : 1);

export default function DermMessagerie() {
  const { data: acc } = useProAccount();
  const myUserId = (acc as any)?.user?.id || null;
  const [list, setList] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(() => { try { return Number(new URLSearchParams(window.location.search).get("c")) || null; } catch { return null; } });
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const load = () => fetch("/api/pro/consultations", { credentials: "include" }).then((r) => r.json()).then((d) => setList(d.consultations || [])).catch(() => setList([])).finally(() => setLoading(false));
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (openId == null && list.length) setOpenId(list[0].id); }, [list, openId]);

  const rows = useMemo(() => list.filter((c) => (f === "all" || (f === "validate" ? toValidate(c) : c.status !== "closed")) && (!q.trim() || `${gp(c)} ${c.patientFirstName || ""} ${c.condition || ""}`.toLowerCase().includes(q.toLowerCase()))), [list, f, q]);
  const cur = list.find((c) => c.id === openId) || null;
  const stage = stageOf(cur);
  const nOpen = list.filter((c) => c.status !== "closed").length, nVal = list.filter(toValidate).length;
  const open = (id: number) => { setOpenId(id); setList((l) => l.map((c) => (c.id === id ? { ...c, unreadDoctor: 0 } : c))); };

  return (
    <DermShell active="messagerie">
      <Page wide>
        <ScreenHeader kicker="CONSULTATIONS EN LIGNE" title="Un échange. Un avis médical. Un suivi." sub="Échangez avec les patients du grand public, puis validez leurs documents de consultation."
          actions={<span style={{ padding: "10px 14px", border: `1px solid ${D.border}`, borderRadius: 4, background: "#fff", fontSize: 12 }}>Patients de la plateforme grand public</span>} />

        <div className="grid items-center" style={{ gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 12, padding: "12px 16px", borderRadius: 10, background: D.tint3, marginBottom: 18 }} data-testid="msg-stages">
          {([["01", "Recueil patient & pré-rapport IA", "Indicatif · à relire par le médecin"], ["02", "Conversation & validation médicale", "Corrigez, complétez et validez"], ["03", "Rapport final & ordonnance", "PDF ou image, transmis au patient"]] as const).map(([n, t, s], i) => (
            <Fragment key={n}>
              <span className="flex items-center" style={{ gap: 12, opacity: stage && i + 1 > stage ? .55 : 1 }}>
                <span className="grid flex-none place-items-center" style={{ width: 30, height: 30, borderRadius: 4, background: stage === i + 1 ? D.actionDark : "#fff", color: stage === i + 1 ? "#fff" : D.text, fontSize: 11, fontWeight: 700 }}>{n}</span>
                <span className="flex flex-col"><b style={{ fontSize: 12, fontWeight: 600 }}>{t}</b><span style={{ fontSize: 9.5, color: D.muted }}>{s}</span></span>
              </span>
              {i < 2 && <span style={{ color: D.action }}>→</span>}
            </Fragment>
          ))}
        </div>

        {!loading && !list.length ? (
          <Card><b style={{ fontSize: 15, fontWeight: 600 }}>Aucune consultation en ligne pour l'instant</b><p style={{ margin: "6px 0 0", fontSize: 12, color: D.muted }}>Activez « Accepter les consultations à distance » dans votre profil public (menu de votre nom, en bas à gauche) pour en recevoir.</p></Card>
        ) : (
          <section className="grid items-start" style={{ gridTemplateColumns: "minmax(250px,.8fr) minmax(0,1.3fr) minmax(320px,1.1fr)", gap: 16 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 16px 10px" }}>
                <div className="flex items-center justify-between"><b style={{ fontSize: 16, fontWeight: 600 }}>Conversations</b><span style={{ padding: "2px 8px", borderRadius: 4, background: D.tintChip, fontSize: 10, fontWeight: 700 }}>{String(list.length).padStart(2, "0")}</span></div>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient…" style={{ marginTop: 10, height: 34 }} />
                <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
                  {([["open", `En cours · ${nOpen}`, D.action, "#9dc3a9"], ["validate", `À valider · ${nVal}`, D.warn, "#efd9b0"]] as const).map(([k, l, c, b]) => (
                    <button key={k} type="button" onClick={() => setF(f === k ? "all" : k)} className="cursor-pointer" data-testid={`msg-filter-${k}`}
                      style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${b}`, background: f === k ? (k === "open" ? D.tintChip : "#fdf6ea") : "#fff", color: c, fontSize: 10.5, fontWeight: 600, fontFamily: FONT_UI }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 640, overflowY: "auto" }}>
                {rows.map((c) => {
                  const [st, col] = stateOf(c), on = c.id === openId;
                  return (
                    <button key={c.id} type="button" onClick={() => open(c.id)} className="flex w-full cursor-pointer flex-col text-left" data-testid={`msg-${c.id}`}
                      style={{ gap: 3, padding: "12px 16px", border: 0, borderTop: `1px solid ${D.sep}`, borderLeft: `3px solid ${on ? D.actionDark : "transparent"}`, background: on ? "#f3f7f1" : "#fff", fontFamily: FONT_UI, color: D.text }}>
                      <span className="flex items-center justify-between" style={{ gap: 8 }}>
                        <b style={{ fontSize: 12, fontWeight: 600 }}>{gp(c)}{c.isDemo ? " · Démo" : ""}</b>
                        <span style={{ fontSize: 9.5, color: D.faint }}>{when(c.lastMessageAt || c.createdAt)}</span>
                      </span>
                      <span className="truncate" style={{ fontSize: 10.5, color: D.muted }}>{c.lastBody || c.condition || "Consultation"}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: col }}>{st}{(c.unreadDoctor || 0) > 1 ? ` · ${c.unreadDoctor}` : ""}</span>
                    </button>
                  );
                })}
                {!rows.length && <p style={{ margin: 0, padding: "18px 16px", fontSize: 11.5, color: D.muted }}>{loading ? "Chargement…" : "Aucune conversation ne correspond."}</p>}
              </div>
              <div style={{ padding: "14px 16px", borderTop: `1px solid ${D.sep}` }}>
                <b style={{ fontSize: 11.5, fontWeight: 600 }}>Un espace de soin fermé</b>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: D.muted }}>Les échanges et documents restent accessibles au patient et au médecin.</p>
              </div>
            </Card>

            <div className="derm-theme min-w-0 overflow-hidden" style={{ height: "calc(100vh - 300px)", minHeight: 560, border: `1px solid ${D.border}`, borderRadius: 12, background: "#fff" }}>
              {cur ? <ConsultationChat key={cur.id} consultationId={cur.id} myUserId={myUserId} derm title={gp(cur)} />
                : <div style={{ padding: 20, fontSize: 12, color: D.muted }}>Choisissez une conversation.</div>}
            </div>

            <Card style={{ padding: "18px 18px" }}>
              {cur ? <ConsultReportPanel key={cur.id} consultationId={cur.id} code={`TC-${String(cur.id).padStart(4, "0")}`} closed={cur.status === "closed" && !!cur.reportSignedAt} linkedPatientId={cur.linkedPatientId || null} onChanged={load} />
                : <Notice tone="ok">Le compte rendu de la conversation choisie s'affiche ici.</Notice>}
            </Card>
          </section>
        )}
      </Page>
    </DermShell>
  );
}
