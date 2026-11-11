import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, Activity, Sparkles, ArrowRight, Plus, X, ClipboardCheck, MessageSquare, AlertTriangle, Inbox } from "lucide-react";
import { DermShell } from "@/components/derm/DermShell";
import { D, FONT_HEAD, patientCode } from "@/components/derm/tokens";
import { useProAccount, useProPatients } from "@/hooks/use-pro";
import { asProProfile, proHomeOf } from "@shared/proProfile";
import { patientStatusOf } from "@/components/ProLayout";
import { SubscriptionExpiredBanner } from "@/components/pro/SubscriptionExpiredBanner";

// ════════════════════════════════════════════════════════════════════════
// Vue d'ensemble de l'espace médical (handoff « espace médical », §3.1).
// Chiffres réels uniquement : rendez-vous à venir, patients, suivis
// (statut « Priorité haute » ou « En suivi »). « Ouvrir mon brief IA » ouvre
// un panneau construit avec les seules données du cabinet, sans texte inventé.
// ════════════════════════════════════════════════════════════════════════

type Appt = { id: number; appointment_date: string; patient_name?: string | null; type?: string | null; status?: string | null };
type Pending = { scanId: number; patientId: number; condition: string | null; firstName: string; lastName: string };
type BriefLine = { icon: typeof Calendar; text: string; href: string; tone: "info" | "warn" | "err" };

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hhmm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (d: Date) => {
  const now = new Date();
  if (sameDay(d, now)) return "Aujourd'hui";
  const t = new Date(now); t.setDate(t.getDate() + 1);
  if (sameDay(d, t)) return "Demain";
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function Arrow() { return <ArrowRight size={11} strokeWidth={2} />; }

function Empty({ icon: Icon, title, text, cta, onCta }: { icon: typeof Calendar; title: string; text: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 154, padding: "34px 20px" }}>
      <span className="grid place-items-center" style={{ width: 44, height: 44, borderRadius: 12, background: "#e5f4f0", color: "#16978f" }}><Icon size={19} strokeWidth={1.8} /></span>
      <h3 style={{ margin: "15px 0 6px", font: `700 13px ${FONT_HEAD}`, color: D.text }}>{title}</h3>
      <p style={{ margin: "0 0 14px", maxWidth: 300, color: "#7f8e8a", fontSize: 8, lineHeight: 1.5 }}>{text}</p>
      <button type="button" onClick={onCta} className="flex cursor-pointer items-center" style={{ gap: 6, color: "#12847d", fontSize: 8, fontWeight: 700, border: 0, background: "none", padding: 0 }}>{cta} <Arrow /></button>
    </div>
  );
}

function Panel({ kicker, title, link, onLink, children }: { kicker: string; title: string; link: string; onLink: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e7e3", borderRadius: 14 }} className="min-w-0">
      <div className="flex items-center justify-between" style={{ minHeight: 67, padding: "16px 19px", borderBottom: "1px solid #e5eae7", boxSizing: "border-box" }}>
        <div><span style={{ color: "#82968f", letterSpacing: 1.4, fontSize: 7, fontWeight: 800 }}>{kicker}</span><h2 style={{ margin: "5px 0 0", font: `700 14px ${FONT_HEAD}`, color: D.text }}>{title}</h2></div>
        <button type="button" onClick={onLink} className="cursor-pointer" style={{ color: D.teal, fontSize: 8, fontWeight: 700, border: 0, background: "none", padding: 0 }}>{link}</button>
      </div>
      {children}
    </div>
  );
}

function Row({ left, sub, right, onClick, testid }: { left: string; sub: string; right: React.ReactNode; onClick: () => void; testid?: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testid} className="flex w-full cursor-pointer items-center justify-between text-left hover:bg-[#f8faf7]"
      style={{ gap: 12, padding: "12px 19px", border: 0, borderBottom: `1px solid ${D.sep}`, background: "transparent" }}>
      <span className="flex min-w-0 flex-col"><b className="truncate" style={{ fontSize: 11, color: D.text }}>{left}</b><span className="truncate" style={{ fontSize: 9, color: D.muted }}>{sub}</span></span>
      <span className="flex-none" style={{ fontSize: 9.5, color: D.muted }}>{right}</span>
    </button>
  );
}

export default function DermVue() {
  const [, go] = useLocation();
  const { data: accData, isLoading } = useProAccount();
  const acc = accData?.account as any;
  const role = accData?.user?.role;
  const isSecretary = role === "secretary";
  const isDoctor = !!acc && !isSecretary;
  const [brief, setBrief] = useState(false);

  // Accès : sans compte Derm → page d'accueil Derm ; relais et ONG → leur espace.
  useEffect(() => {
    if (isLoading) return;
    if (!acc) { go("/derm"); return; }
    const p = asProProfile(acc.profile);
    if (!isSecretary && p !== "derm") go(proHomeOf(p, role));
  }, [isLoading, acc, isSecretary, role, go]);

  const { data: pData } = useProPatients("");
  const { data: aData } = useQuery<{ appointments: Appt[] }>({ queryKey: ["/api/pro/appointments"], enabled: !!acc });
  const { data: pend } = useQuery<{ items: Pending[] }>({ queryKey: ["/api/pro/pending-validations"], enabled: isDoctor });
  const { data: unread } = useQuery<{ count: number }>({ queryKey: ["/api/pro/consultations/unread-count"], enabled: isDoctor });
  const { data: intake } = useQuery<{ count: number }>({ queryKey: ["/api/pro/pending-patients"], enabled: !!acc });

  const patients = (pData?.patients || []) as any[];
  const now = new Date();
  const upcoming = useMemo(() => (aData?.appointments || [])
    .map((a) => ({ ...a, at: new Date(a.appointment_date) }))
    .filter((a) => a.at.getTime() >= now.getTime() - 30 * 60000 && a.status !== "done" && a.status !== "completed")
    .sort((a, b) => a.at.getTime() - b.at.getTime()), [aData]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayAppts = upcoming.filter((a) => sameDay(a.at, now));
  const followed = patients.filter((p) => { const s = patientStatusOf(p.status); return s === "priority" || s === "monitoring"; });
  const priority = patients.filter((p) => patientStatusOf(p.status) === "priority");
  const evolutions = patients
    .filter((p) => Array.isArray(p.scoreTrend) && p.scoreTrend.length >= 2)
    .sort((a, b) => new Date(b.lastScanAt || 0).getTime() - new Date(a.lastScanAt || 0).getTime())
    .slice(0, 5);
  const pending = pend?.items || [];
  const unreadN = Number(unread?.count) || 0;
  const intakeN = Number(intake?.count) || 0;

  const lines: BriefLine[] = [
    todayAppts.length ? { icon: Calendar, text: `${plural(todayAppts.length, "rendez-vous", "rendez-vous")} aujourd'hui, le premier à ${hhmm(todayAppts[0].at)}.`, href: "/derm/agenda", tone: "info" } : null,
    priority.length ? { icon: AlertTriangle, text: `${plural(priority.length, "patient", "patients")} en priorité haute.`, href: "/derm/patientele?filtre=priority", tone: "err" } : null,
    pending.length ? { icon: ClipboardCheck, text: `${plural(pending.length, "analyse", "analyses")} à valider.`, href: `/derm/patient/${pending[0].patientId}`, tone: "warn" } : null,
    unreadN ? { icon: MessageSquare, text: `${plural(unreadN, "demande", "demandes")} en ligne en attente de réponse.`, href: "/derm/consultations", tone: "warn" } : null,
    intakeN ? { icon: Inbox, text: `${plural(intakeN, "dossier préparé", "dossiers préparés")} par l'accueil, en attente d'analyse.`, href: "/derm/patients", tone: "info" } : null,
  ].filter(Boolean) as BriefLine[];

  if (isLoading || !acc) return <div style={{ minHeight: "100vh", background: D.page }} />;

  const first = String(acc.fullName || "").replace(/^dr\.?\s+/i, "").trim().split(/\s+/)[0] || "";
  const hello = isSecretary ? `Bonjour, ${accData?.user?.firstName || ""}`.trim() : `Bonjour, Dr. ${first}`;
  const bannerText = followed.length || upcoming.length
    ? `${plural(upcoming.length, "rendez-vous à venir", "rendez-vous à venir")} · ${plural(followed.length, "patient suivi", "patients suivis")}.`
    : "Ajoutez vos premiers suivis pour activer les analyses longitudinales.";
  const metrics = [
    { icon: Calendar, label: "Rendez-vous", value: upcoming.length, sub: "dans votre agenda", href: "/derm/agenda" },
    { icon: Users, label: "Patients actifs", value: patients.length, sub: "dossiers centralisés", href: "/derm/patients" },
    { icon: Activity, label: "Suivis à examiner", value: followed.length, sub: "priorisés par Glow", href: "/derm/patientele?filtre=monitoring" },
  ];
  const tone = { info: [D.info, D.infoBg], warn: [D.warn, D.warnBg], err: [D.err, D.errBg] } as const;

  return (
    <DermShell active="vue">
      <div className="px-4 md:px-[35px]" style={{ maxWidth: 1480, margin: "auto", paddingTop: 31, paddingBottom: 60 }}>
        {isDoctor && <div className="mb-4"><SubscriptionExpiredBanner /></div>}
        <div className="flex flex-wrap items-end justify-between" style={{ marginBottom: 25, gap: 16 }}>
          <div>
            <span style={{ color: D.teal2, letterSpacing: 1.7, fontSize: 8, fontWeight: 800 }}>CENTRE CLINIQUE</span>
            <h1 style={{ margin: "7px 0 5px", font: `700 28px ${FONT_HEAD}`, letterSpacing: -1.1, color: D.textAlt }} data-testid="derm-hello">{hello}</h1>
            <p style={{ margin: 0, color: "#758681", fontSize: 10 }}>Glow a préparé l'essentiel de votre activité.</p>
          </div>
          <button type="button" onClick={() => go(isSecretary ? "/derm/accueil" : "/derm/consultation")} className="flex cursor-pointer items-center justify-center"
            style={{ gap: 7, minHeight: 39, padding: "0 15px", borderRadius: 9, background: D.cta, color: "#fff", fontSize: 9, fontWeight: 700, border: 0, boxShadow: "0 7px 16px rgba(29,112,105,.13)", whiteSpace: "nowrap" }}>
            <Plus size={13} strokeWidth={2} />Nouvelle consultation
          </button>
        </div>

        <section className="relative grid items-center overflow-hidden md:grid-cols-[1fr_270px]"
          style={{ minHeight: 210, marginBottom: 15, padding: "28px 32px", borderRadius: 17, color: "#fff", boxSizing: "border-box",
            background: "radial-gradient(circle at 75%,rgba(26,172,162,.2),transparent 26%),linear-gradient(115deg,#102d2e,#133b3a)" }}>
          <div className="absolute inset-0" style={{ opacity: .12, backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)", backgroundSize: "32px 32px", WebkitMaskImage: "linear-gradient(90deg,transparent,#000,transparent)", maskImage: "linear-gradient(90deg,transparent,#000,transparent)" }} />
          <div className="relative z-[1]">
            <span style={{ color: "#62d8ce", letterSpacing: 1.4, fontSize: 7, fontWeight: 700 }}>INTELLIGENCE CLINIQUE ACTIVE</span>
            <h2 style={{ margin: "13px 0 8px", font: `700 22px/1.2 ${FONT_HEAD}`, letterSpacing: -.8 }}>Tout ce qui exige votre regard.<br />Rien de plus.</h2>
            <p style={{ margin: "0 0 16px", color: "#97afaa", fontSize: 9 }}>{bannerText}</p>
            {isDoctor && (
              <button type="button" onClick={() => setBrief(true)} data-testid="derm-brief-open" className="flex cursor-pointer items-center"
                style={{ gap: 7, color: "#73e1d8", fontSize: 8, fontWeight: 700, border: 0, background: "none", padding: 0 }}>Ouvrir mon brief IA <Arrow /></button>
            )}
          </div>
          <div className="relative z-[1] hidden place-items-center justify-self-center md:grid" style={{ width: 130, height: 130 }}>
            <span className="absolute" style={{ width: 130, height: 130, borderRadius: "50%", border: "1px dashed rgba(105,225,215,.2)" }} />
            <i className="absolute" style={{ width: 88, height: 88, borderRadius: "50%", border: "1px solid rgba(105,225,215,.2)" }} />
            <b className="grid place-items-center" style={{ width: 52, height: 52, borderRadius: "50%", color: "#70ded5", background: "rgba(30,172,162,.2)", boxShadow: "0 0 35px rgba(42,192,181,.25)" }}><Sparkles size={16} strokeWidth={1.8} /></b>
          </div>
        </section>

        <section className="grid sm:grid-cols-3" style={{ gap: 14, marginBottom: 15 }}>
          {metrics.map((m) => (
            <button key={m.label} type="button" onClick={() => go(m.href)} className="flex cursor-pointer items-center text-left" data-testid={`derm-metric-${m.label}`}
              style={{ gap: 13, minHeight: 105, padding: 18, borderRadius: 13, background: "#fff", border: "1px solid #e0e7e3", boxSizing: "border-box" }}>
              <span className="grid flex-none place-items-center" style={{ width: 39, height: 39, borderRadius: 10, background: "#e3f3ef", color: "#138c84" }}><m.icon size={17} strokeWidth={1.8} /></span>
              <div><small style={{ display: "block", color: "#72837f", fontSize: 8 }}>{m.label}</small><strong style={{ display: "block", margin: "3px 0", font: `700 21px ${FONT_HEAD}`, color: D.textAlt }}>{m.value}</strong><p style={{ margin: 0, color: "#91a09c", fontSize: 7 }}>{m.sub}</p></div>
            </button>
          ))}
        </section>

        <section className="grid lg:grid-cols-[1.45fr_.75fr]" style={{ gap: 15 }}>
          <Panel kicker="VOTRE JOURNÉE" title="Prochains rendez-vous" link="Voir l'agenda" onLink={() => go("/derm/agenda")}>
            {upcoming.length === 0
              ? <Empty icon={Calendar} title="Votre agenda est prêt" text="Planifiez votre première consultation pour démarrer." cta="Ajouter un rendez-vous" onCta={() => go("/derm/agenda")} />
              : upcoming.slice(0, 5).map((a) => (
                <Row key={a.id} testid={`derm-appt-${a.id}`} onClick={() => go("/derm/agenda")}
                  left={a.patient_name || "Patient"} sub={a.type === "suivi" ? "Suivi" : a.type === "urgence" ? "Urgence" : "Consultation"}
                  right={<>{dayLabel(a.at)} · <b style={{ color: D.text }}>{hhmm(a.at)}</b></>} />
              ))}
          </Panel>
          <Panel kicker="SUIVI CLINIQUE" title="Évolutions récentes" link="Tout voir" onLink={() => go("/derm/patientele?filtre=monitoring")}>
            {evolutions.length === 0
              ? <Empty icon={Activity} title="Aucun suivi actif" text="Les évolutions cliniques apparaîtront ici." cta="Créer un suivi" onCta={() => go("/derm/patients")} />
              : evolutions.map((p) => {
                const t = p.scoreTrend as number[];
                const a = t[t.length - 2], b = t[t.length - 1];
                return (
                  <Row key={p.id} testid={`derm-evo-${p.id}`} onClick={() => go(`/derm/patient/${p.id}`)}
                    left={`${patientCode(p.id)} · ${p.firstName} ${p.lastName}`} sub={p.lastCondition || "Diagnostic non renseigné"}
                    right={<span style={{ color: b >= a ? D.action : D.err, fontWeight: 700 }}>{a} → {b}</span>} />
                );
              })}
          </Panel>
        </section>
      </div>

      {brief && (
        <div className="fixed inset-0 z-50" data-testid="derm-brief">
          <div className="absolute inset-0" style={{ background: "rgba(13,41,41,.35)" }} onClick={() => setBrief(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col overflow-y-auto" style={{ background: "#fff", padding: "26px 24px", boxShadow: "0 10px 30px rgba(13,41,41,.1)" }}>
            <div className="flex items-start justify-between" style={{ gap: 12 }}>
              <div>
                <span style={{ color: D.action, fontSize: 10, fontWeight: 700, letterSpacing: .4 }}>BRIEF DU JOUR</span>
                <h2 style={{ margin: "8px 0 4px", font: `700 20px ${FONT_HEAD}`, color: D.text, letterSpacing: -.5 }}>Votre brief du jour</h2>
                <p style={{ margin: 0, fontSize: 11, color: D.muted }}>{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · établi à partir des données de votre cabinet.</p>
              </div>
              <button type="button" onClick={() => setBrief(false)} aria-label="Fermer" className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted, padding: 4 }}><X size={18} /></button>
            </div>
            <div className="flex flex-col" style={{ gap: 10, marginTop: 20 }}>
              {lines.length === 0 ? (
                <div style={{ padding: "18px 16px", borderRadius: 12, background: D.tint3, color: D.actionDark, fontSize: 12, fontWeight: 600 }}>Rien d'urgent aujourd'hui.</div>
              ) : lines.map((l, i) => (
                <button key={i} type="button" onClick={() => { setBrief(false); go(l.href); }} className="flex cursor-pointer items-center text-left"
                  style={{ gap: 12, padding: "13px 14px", borderRadius: 12, border: `1px solid ${D.border}`, background: "#fff" }}>
                  <span className="grid flex-none place-items-center" style={{ width: 34, height: 34, borderRadius: 9, background: tone[l.tone][1], color: tone[l.tone][0] }}><l.icon size={16} strokeWidth={1.8} /></span>
                  <span className="flex-1" style={{ fontSize: 12, color: D.text }}>{l.text}</span>
                  <ArrowRight size={14} color={D.faint} />
                </button>
              ))}
            </div>
            <p style={{ margin: "auto 0 0", paddingTop: 20, fontSize: 10, color: D.faint }}>Analyse indicative : seul votre examen fait foi.</p>
          </aside>
        </div>
      )}
    </DermShell>
  );
}
