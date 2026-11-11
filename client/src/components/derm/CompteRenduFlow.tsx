import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, AudioLines, Images, Info, ShieldCheck, Lock, Check, ArrowUpRight, ArrowLeft, Pencil, Save, Trash2 } from "lucide-react";
import { D, FONT_UI, patientCode } from "@/components/derm/tokens";
import { Btn, Input, Textarea, Notice, fr, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";
import { reportPayloadSchema, a4Points, SUIVI_CHOICES, suiviDate, reportRef, type ReportPayload } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Compte rendu · « Relire, corriger, valider. » (maquette PDF du fondateur et
// handoff §3.5). Trois points obligatoires (conclusion, conduite à tenir,
// suivi), relecture attestée, code de signature à 4 chiffres vérifié par le
// serveur. Après validation : le document A4 et « Remettre au patient »
// (WhatsApp, email, impression). Aucun envoi automatique ; aucun traitement
// n'est déduit par l'IA.
// ════════════════════════════════════════════════════════════════════════

type Opened = { report: { id: number; signedAt: string | null; sentPatientAt: string | null; createdAt: string; payload: ReportPayload } };
type Rec = {
  patient: { id: number; firstName: string; lastName: string; age: number | null; sex: string | null };
  analyses: { id: number; date: string; photo: string | null; note: string | null }[];
};
type Med = ReportPayload["meds"][number];
const emptyMed = (): Med => ({ m: "", f: "", v: "", p: "", d: "", c: "" });
const MED_FIELDS: [keyof Med, string, string][] = [["m", "Médicament ou soin", "Nom du médicament ou du soin"], ["f", "Forme / dosage", "Crème, 15 %"], ["v", "Voie d'administration", "Cutanée"], ["p", "Posologie", "1 application le soir"], ["d", "Durée", "8 semaines"], ["c", "Consignes (si pertinentes)", "Si pertinentes"]];

function SourceCard({ icon: Icon, title, meta, body, cta, onCta }: { icon: typeof Info; title: string; meta: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="flex flex-col" style={{ gap: 6, padding: "14px 14px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff" }}>
      <b className="flex items-center" style={{ gap: 8, fontSize: 11.5, fontWeight: 600 }}><Icon size={15} strokeWidth={1.8} color={D.action} />{title}</b>
      <span style={{ fontSize: 9.5, color: D.muted }}>{meta}</span>
      <span style={{ fontSize: 11, lineHeight: 1.5, color: D.text, whiteSpace: "pre-wrap" }}>{body}</span>
      {cta && <button type="button" onClick={onCta} className="flex cursor-pointer items-center justify-between" style={{ border: 0, background: "none", padding: 0, color: D.action, fontSize: 10.5, fontWeight: 600, fontFamily: FONT_UI }}>{cta}<ArrowUpRight size={12} /></button>}
    </div>
  );
}

function FieldBlock({ id, label, tag, required, value, onChange, ph, rows = 2 }: { id: string; label: string; tag?: string; required?: boolean; value: string; onChange: (v: string) => void; ph: string; rows?: number }) {
  const done = !!value.trim();
  const status = required ? (done ? "COMPLÉTÉ" : "À COMPLÉTER") : tag;
  return (
    <div id={id} className="flex flex-col" style={{ gap: 7 }}>
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <b style={{ fontSize: 12, fontWeight: 600 }}>{label}</b>
        {status && <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .5, color: required ? (done ? D.action : D.warn) : D.faint }}>{status}</span>}
      </div>
      <div className="relative">
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} rows={rows}
          style={{ minHeight: rows * 22 + 18, paddingRight: 28, background: required && !done ? "#fdf6ea" : "#fff", borderColor: required && !done ? "#efd9b0" : D.border, color: D.text }} />
        <Pencil size={12} color={D.faint} style={{ position: "absolute", right: 10, top: 12 }} />
      </div>
    </div>
  );
}

export type CrPrefill = { motif?: string; exam?: string; conclusion?: string };

/** Écran « Relire, corriger, valider » puis « Remettre au patient ». Page (D2) ou étape 5 de la Nouvelle consultation (D3). */
export function CompteRenduFlow({ pid, prefill, embedded, onDone }: { pid: number; prefill?: CrPrefill; embedded?: boolean; onDone?: () => void }) {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data: acc } = useProAccount();
  const account = acc?.account as any;
  const isSecretary = acc?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) go(`/derm/patients/${pid}`); }, [isSecretary, pid, go]);
  const { data: rec } = useQuery<Rec>({ queryKey: [`/api/derm/records/${pid}`], enabled: !!pid && !!acc && !isSecretary });
  const { data: fiche } = useQuery<{ patient: { birthDate: string | null; email: string | null; phone: string | null } }>({ queryKey: [`/api/derm/patients/${pid}`], enabled: !!pid && !!acc && !isSecretary });

  const [rid, setRid] = useState<number | null>(null);
  const [p, setP] = useState<ReportPayload | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [attest, setAttest] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [setup, setSetup] = useState<{ a: string; b: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "warn" | "err" } | null>(null);
  const [ch, setCh] = useState({ wa: true, mail: false, print: false });
  const [delivered, setDelivered] = useState<string[] | null>(null);
  const [links, setLinks] = useState<{ wa?: string; print?: string }>({});
  const opened = useRef(false);

  // Ouvre le brouillon en cours (ou en crée un, prérempli) au format A4.
  useEffect(() => {
    if (!pid || !acc || isSecretary || opened.current) return;
    opened.current = true;
    api<Opened>("/api/pro/reports", "POST", { source: "visit", patientId: pid, format: "a4", prefill })
      .then((d) => {
        setRid(d.report.id);
        setP(reportPayloadSchema.parse(d.report.payload || {}));
        setCreatedAt(d.report.createdAt);
        setSignedAt(d.report.signedAt);
        setSentAt(d.report.sentPatientAt);
      })
      .catch((e) => setMsg({ t: e.message, tone: "err" }));
  }, [pid, acc, isSecretary]);
  useEffect(() => { if (fiche?.patient?.email) setCh((c) => ({ ...c, mail: true })); }, [fiche?.patient?.email]);
  // Le médecin valide ou corrige le diagnostic après l'ouverture du brouillon : la
  // conclusion suit, tant qu'il ne l'a pas rédigée lui-même (vide ou texte prérempli).
  const autoConcl = useRef<string>("");
  useEffect(() => {
    const c = prefill?.conclusion?.trim();
    if (!c || !p || signedAt) return;
    const cur = (p.conclusion || "").trim();
    if (cur && cur !== autoConcl.current && !cur.startsWith("Diagnostic retenu :")) return;
    if (cur === c) { autoConcl.current = c; return; }
    autoConcl.current = c;
    up({ conclusion: c });
  }, [prefill?.conclusion, !!p, signedAt]);

  const up = (patch: Partial<ReportPayload>) => { setP((cur) => (cur ? { ...cur, ...patch } : cur)); setDirty(true); };
  const meds = p?.meds?.length ? p.meds : [emptyMed()];
  const setMed = (i: number, k: keyof Med, v: string) => up({ meds: meds.map((m, j) => (j === i ? { ...m, [k]: v } : m)) });
  const done3 = p ? a4Points(p) : [false, false, false];
  const left = done3.filter((x) => !x).length;
  const can = !left && attest;
  const stage = signedAt ? "doc" : "edit";

  const save = async (quiet = false) => {
    if (!rid || !p || signedAt) return true;
    try {
      await api(`/api/pro/reports/${rid}`, "PUT", { payload: { ...p, meds: p.meds.filter((m) => Object.values(m).some((v) => v.trim())) } });
      setDirty(false); setSavedOnce(true);
      if (!quiet) setMsg({ t: "Brouillon enregistré.", tone: "ok" });
      qc.invalidateQueries({ queryKey: ["/api/derm/records"] });
      return true;
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); return false; }
  };
  // Enregistrement automatique discret après 3 s sans frappe.
  useEffect(() => { if (!dirty || signedAt) return; const t = setTimeout(() => { save(true); }, 3000); return () => clearTimeout(t); }, [p, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToMissing = () => {
    const ids = ["f-conclusion", "f-conduite", "f-suivi"];
    const i = done3.findIndex((x) => !x);
    document.getElementById(ids[i >= 0 ? i : 0])?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const preview = async () => { if (await save(true)) window.open(`/api/reports/${rid}/view?v=a4`, "_blank", "noopener"); };
  const sign = async () => {
    if (!rid || !can) return;
    setBusy(true); setMsg(null);
    try {
      if (!(await save(true))) return;
      await api(`/api/pro/reports/${rid}/sign`, "POST", { pin });
      setSignedAt(new Date().toISOString()); setPinOpen(false); setPin("");
      qc.invalidateQueries({ queryKey: [`/api/derm/records/${pid}`] }); qc.invalidateQueries({ queryKey: ["/api/derm/records"] });
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      if (e.code === "SIGN_PIN_SETUP") setSetup({ a: "", b: "" });
      setMsg({ t: e.message, tone: "err" });
    } finally { setBusy(false); }
  };
  const createPin = async () => {
    if (!setup || !/^\d{4}$/.test(setup.a) || setup.a !== setup.b) return;
    setBusy(true);
    try { await api("/api/pro/sign-pin", "POST", { pin: setup.a }); setSetup(null); setPin(setup.a); setMsg({ t: "Code de signature enregistré. Vous pouvez valider.", tone: "ok" }); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };
  const deliver = async () => {
    if (!rid) return;
    setBusy(true); setMsg(null);
    const out: string[] = [];
    const nl: { wa?: string; print?: string } = {};
    // Onglet ouvert tout de suite (pendant le clic), sinon le navigateur le bloque.
    const win = ch.wa || ch.print ? window.open("about:blank", "_blank") : null;
    try {
      if (ch.wa) {
        const d = await api<{ sent: boolean; url: string; waLink: string }>(`/api/pro/reports/${rid}/send`, "POST", { mode: "link" });
        nl.wa = d.waLink;
        out.push(fiche?.patient?.phone ? `WhatsApp ouvert avec le message et le lien pour +${fiche.patient.phone} : appuyez sur Envoyer` : "WhatsApp ouvert avec le message et le lien : choisissez le contact du patient, puis Envoyer");
      }
      if (ch.mail) {
        try { const d = await api<{ sent: boolean }>(`/api/pro/reports/${rid}/email`, "POST", {}); out.push(d.sent ? "Compte rendu envoyé par email" : "Email non parti : réessayez plus tard"); }
        catch (e: any) { out.push(e.message); }
      }
      if (ch.print) {
        await api(`/api/pro/reports/${rid}/handed`, "POST", {});
        nl.print = `/api/reports/${rid}/view?v=a4&print=1`;
        out.push("Fenêtre d'impression ouverte · choisissez l'imprimante ou « Enregistrer au format PDF »");
      }
      const first = nl.wa || nl.print;
      if (win) { if (first) { try { win.opener = null; } catch {} win.location.href = first; } else win.close(); }
      setLinks(nl);
      setSentAt(new Date().toISOString());
      setDelivered(out);
      qc.invalidateQueries({ queryKey: [`/api/derm/records/${pid}`] });
    } catch (e: any) { try { win?.close(); } catch {} setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };

  const pt = rec?.patient;
  const name = pt ? `${pt.firstName} ${pt.lastName}` : "";
  const dr = `Dr ${String(account?.fullName || "").replace(/^dr\.?\s+/i, "")}`;
  const born = fiche?.patient?.birthDate ? `Né${pt?.sex === "F" ? "e" : ""} le ${fr(fiche.patient.birthDate, { day: "2-digit", month: "2-digit", year: "numeric" })}` : pt?.age ? `${pt.age} ans` : "Âge non renseigné";
  const consultDate = fr(createdAt || new Date().toISOString(), { day: "2-digit", month: "2-digit", year: "numeric" });
  const lastNote = rec?.analyses?.find((a) => a.note);
  const photos = (rec?.analyses || []).filter((a) => a.photo).length;
  const control = p?.suiviChoice && p.suiviChoice !== "Aucun suivi" ? suiviDate(p.suiviChoice, signedAt ? new Date(signedAt) : new Date()) : null;
  const badge = stage === "edit" ? (savedOnce ? "Brouillon enregistré" : "Brouillon à relire") : sentAt ? "Validé · remis au patient" : "Validé · à remettre";
  const steps: [string, "done" | "on" | "off"][] = [["Observations et dictée", "done"], ["Relecture et validation", stage === "edit" ? "on" : "done"], ["Document patient et remise", stage === "edit" ? "off" : sentAt ? "done" : "on"]];
  const footer = useMemo(() => can ? "Tout est prêt. Validez pour signer avec votre code." : `Complétez ${left ? `${left === 3 ? "les 3 points" : `${left} point${left > 1 ? "s" : ""}`}` : ""}${left && !attest ? " et " : ""}${!attest ? "confirmez votre relecture" : ""} pour valider.`, [can, left, attest]);

  if (!p || !rec) {
    return <div style={{ padding: embedded ? 0 : 32 }}>{msg ? <Notice tone="err">{msg.t}</Notice> : <span style={{ fontSize: 12, color: D.muted }}>Préparation du compte rendu…</span>}</div>;
  }

  return (
    <>
      <div style={embedded ? { paddingBottom: 100, color: D.text, fontFamily: FONT_UI } : { maxWidth: 1240, margin: "auto", padding: "26px 32px 120px", color: D.text, fontFamily: FONT_UI }}>
        {!embedded && <div className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 11, color: D.muted, marginBottom: 18 }}>
          <button type="button" onClick={() => go("/derm/dossiers")} className="flex cursor-pointer items-center" style={{ gap: 6, border: 0, background: "none", padding: 0, color: D.muted, fontSize: 11, fontFamily: FONT_UI }}><ArrowLeft size={13} />Dossiers médicaux</button>
          <span>/</span>
          <button type="button" onClick={() => go(`/derm/dossiers/${pid}`)} className="cursor-pointer" style={{ border: 0, background: "none", padding: 0, color: D.muted, fontSize: 11, fontFamily: FONT_UI }}>{name || `Patient ${patientCode(pid)}`}</button>
          <span>/</span><span style={{ color: D.text }}>Compte rendu</span>
        </div>}
        <div className="flex flex-wrap items-start justify-between" style={{ gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: "0 0 6px", font: `500 ${embedded ? 24 : 30}px/1.15 Lora, Georgia, serif`, color: D.text }}>{stage === "edit" ? "Relire, corriger, valider." : "Remettre le compte rendu."}</h1>
            <p style={{ margin: 0, fontSize: 12.5, color: D.muted }}>Vous êtes l'auteur du compte rendu. Glow prépare, vous décidez.</p>
          </div>
          <div className="flex flex-col items-end" style={{ gap: 8 }}>
            <span style={{ padding: "5px 10px", borderRadius: 4, background: stage === "edit" ? "#fbefd9" : "#e3f3ef", color: stage === "edit" ? "#7a5a17" : "#138c84", fontSize: 10.5, fontWeight: 600 }} data-testid="cr-badge">● {badge}</span>
            <span style={{ fontSize: 10.5, color: D.muted }}>Consultation du {consultDate}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center" style={{ gap: 14, marginBottom: 20 }}>
          {steps.map(([label, s], i) => (
            <span key={label} className="flex items-center" style={{ gap: 8, fontSize: 11, color: s === "off" ? "#9fb0ab" : D.text, fontWeight: s === "on" ? 600 : 500 }}>
              <span className="grid place-items-center" style={{ width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700, background: s === "on" ? D.cta : "#fff", color: s === "on" ? "#fff" : D.teal, border: `1px solid ${s === "off" ? "#d5ddd9" : s === "done" ? "#9fd9d2" : D.cta}` }}>
                {s === "done" ? <Check size={11} /> : s === "off" ? <Lock size={10} /> : i + 1}
              </span>{label}
              {i < 2 && <span style={{ width: 40, height: 1, background: "#d5ddd9", marginLeft: 6 }} />}
            </span>
          ))}
        </div>
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        {stage === "edit" ? (
          <section className="grid items-start" style={{ gridTemplateColumns: embedded ? "220px minmax(0,1fr)" : "200px 240px minmax(0,1fr)", gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 10, ...(embedded ? { gridColumn: 1, gridRow: 1 } : {}) }}>
              <div><b style={{ fontSize: 13, fontWeight: 600 }}>Sources de consultation</b><p style={{ margin: "4px 0 0", fontSize: 10.5, color: D.muted }}>Retrouvez les éléments à l'origine du brouillon.</p></div>
              <SourceCard icon={NotebookPen} title="Observations du médecin" meta={lastNote ? `Notes saisies · ${fr(lastNote.date, { day: "numeric", month: "short" })}` : "Aucune note saisie"}
                body={lastNote?.note || "Les notes saisies pendant l'examen apparaîtront ici."} cta="Consulter les notes" onCta={() => go(`/derm/patient/${pid}`)} />
              <SourceCard icon={AudioLines} title="Dictée de consultation" meta="Aucun enregistrement" body="Aucune dictée pour cette consultation." />
              <SourceCard icon={Images} title="Visuels de consultation" meta={`${photos} pièce${photos > 1 ? "s" : ""} jointe${photos > 1 ? "s" : ""}`}
                body={photos ? "Visuels joints au dossier par le praticien." : "Aucun visuel joint au dossier."} cta={photos ? "Ouvrir les pièces jointes" : undefined} onCta={() => go(`/derm/dossiers/${pid}?onglet=photo`)} />
              <span className="flex" style={{ gap: 6, fontSize: 9.5, color: D.muted }}><Info size={12} className="flex-none" />Une transcription ou un visuel ne constitue pas un diagnostic validé.</span>
            </div>

            <div className="flex flex-col" style={{ gap: 12, ...(embedded ? { gridColumn: 1, gridRow: 2 } : {}) }}>
              <div className="flex flex-col" style={{ gap: 10, padding: 16, border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff" }}>
                <div className="flex items-center justify-between"><b style={{ fontSize: 13, fontWeight: 600 }}>Points à confirmer</b><span className="grid place-items-center" style={{ width: 22, height: 22, borderRadius: "50%", background: left ? "#fbefd9" : D.tintChip, color: left ? "#7a5a17" : D.action, fontSize: 10, fontWeight: 700 }}>{left}</span></div>
                <span style={{ fontSize: 10.5, color: D.muted }}>Ces rubriques nécessitent votre décision avant toute validation.</span>
                {([["Conclusion médicale", "Renseigner la conclusion que vous retenez à l'issue de l'examen."], ["Conduite à tenir", "Préciser les décisions, conseils ou prescriptions, le cas échéant."], ["Modalités de suivi", "Définir le suivi ou préciser explicitement qu'il n'est pas indiqué."]] as const).map(([t, s], i) => (
                  <div key={t} className="flex" style={{ gap: 9 }}>
                    <span className="grid flex-none place-items-center" style={{ width: 15, height: 15, marginTop: 1, borderRadius: 3, border: `1.5px solid ${done3[i] ? D.cta : "#c9d3d0"}`, background: done3[i] ? D.cta : "#fff", color: "#fff" }}>{done3[i] && <Check size={10} strokeWidth={3} />}</span>
                    <span className="flex flex-col" style={{ gap: 2 }}><b style={{ fontSize: 11, fontWeight: 600 }}>{t}</b><span style={{ fontSize: 9.5, color: D.muted }}>{s}</span></span>
                  </div>
                ))}
                {left > 0 && <button type="button" onClick={scrollToMissing} className="flex cursor-pointer items-center" style={{ gap: 6, border: 0, background: "none", padding: 0, color: D.action, fontSize: 10.5, fontWeight: 600, fontFamily: FONT_UI }}>Compléter dans le rapport <ArrowLeft size={12} /></button>}
              </div>
              <div className="flex flex-col" style={{ gap: 10, padding: 16, border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff" }}>
                <b className="flex items-center" style={{ gap: 7, fontSize: 13, fontWeight: 600 }}><ShieldCheck size={15} color={D.action} />Votre validation fait foi</b>
                <label className="flex cursor-pointer" style={{ gap: 9, fontSize: 11, lineHeight: 1.5 }}>
                  <input type="checkbox" checked={attest} onChange={() => setAttest(!attest)} style={{ marginTop: 2, accentColor: D.cta }} data-testid="cr-attest" />
                  J'ai relu et corrigé l'ensemble du compte rendu et confirme les éléments médicaux qui y figurent.
                </label>
                <span style={{ fontSize: 9.5, color: D.muted }}>Validation réservée au dermatologue connecté. L'assistance ne signe pas le rapport.</span>
              </div>
              <div className="flex flex-col" style={{ gap: 8, padding: 16, borderRadius: 8, background: "#e8f0ec" }}>
                <b className="flex items-center" style={{ gap: 7, fontSize: 12, fontWeight: 600, color: D.actionDark }}><Lock size={13} />Après votre validation</b>
                <span style={{ fontSize: 10.5 }}>Le document du cabinet pourra être préparé pour le patient, puis remis par vos soins.</span>
                <span style={{ fontSize: 9.5, color: D.action }}>Aucun envoi automatique au patient.</span>
              </div>
            </div>

            <div className="min-w-0" style={{ border: `1px solid ${D.border}`, borderRadius: 10, background: "#fff", ...(embedded ? { gridColumn: 2, gridRow: "1 / span 2" } : {}) }}>
              <div className="flex items-center justify-between" style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border}` }}>
                <b className="flex items-center" style={{ gap: 8, fontSize: 11.5, fontWeight: 600 }}><NotebookPen size={14} />Compte rendu éditable</b>
                <span style={{ fontSize: 10, color: D.muted }}>Version de travail · v1</span>
              </div>
              <div className="flex flex-col" style={{ gap: 18, padding: "20px 18px" }}>
                <div>
                  <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .8, color: D.action }}>{String(account?.cabinetName || "Cabinet").toUpperCase()} · DERMATOLOGIE</span>
                  <h2 style={{ margin: "8px 0 8px", font: "500 23px/1.2 Lora, Georgia, serif" }}>Compte rendu de consultation</h2>
                  <span style={{ display: "block", fontSize: 10.5, color: D.muted }}>{name} · {born}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: D.muted }}>Consultation du {consultDate} · {dr}</span>
                </div>
                <div className="flex" style={{ gap: 8, padding: "11px 13px", borderRadius: 6, background: "#e8f0ec", color: D.actionDark, fontSize: 10.5 }}>
                  <Info size={13} className="mt-0.5 flex-none" />Synthèse assistée des sources du médecin, à relire intégralement. Aucun ajout clinique sans votre confirmation.
                </div>
                <FieldBlock id="f-motif" label="Motif de consultation" tag="Source : notes" value={p.motif} onChange={(v) => up({ motif: v })} ph="Motif rapporté par le patient, à relire et corriger" />
                <FieldBlock id="f-obs" label="Observations cliniques" tag="Sources : notes · dictée" value={p.exam} onChange={(v) => up({ exam: v })} ph="Constatations de l'examen consignées par le médecin" rows={3} />
                <FieldBlock id="f-conclusion" label="Conclusion du dermatologue" required value={p.conclusion} onChange={(v) => up({ conclusion: v })} ph="À compléter par le dermatologue" />
                <FieldBlock id="f-conduite" label="Conduite à tenir" required value={p.conduite} onChange={(v) => up({ conduite: v })} ph="À préciser : décisions et conseils retenus par le médecin" />
                <div id="f-suivi" className="flex flex-col" style={{ gap: 7 }}>
                  <div className="flex items-baseline justify-between"><b style={{ fontSize: 12, fontWeight: 600 }}>Suivi</b><span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .5, color: p.suiviChoice ? D.action : D.warn }}>{p.suiviChoice ? "COMPLÉTÉ" : "À COMPLÉTER"}</span></div>
                  <div className="flex flex-wrap" style={{ gap: 6, padding: p.suiviChoice ? 0 : 8, borderRadius: 4, background: p.suiviChoice ? "transparent" : "#fdf6ea", border: p.suiviChoice ? 0 : "1px solid #efd9b0" }}>
                    {SUIVI_CHOICES.map((k) => (
                      <button key={k} type="button" onClick={() => up({ suiviChoice: k })} className="cursor-pointer" data-testid={`suivi-${k}`}
                        style={{ height: 30, padding: "0 13px", borderRadius: 999, border: `1px solid ${p.suiviChoice === k ? D.side : D.border}`, background: p.suiviChoice === k ? D.side : "#fff", color: p.suiviChoice === k ? "#fff" : "#5f706c", fontSize: 11, fontWeight: 600, fontFamily: FONT_UI }}>{k}</button>
                    ))}
                  </div>
                  <Input value={p.suiviText} onChange={(e) => up({ suiviText: e.target.value })} placeholder="Précisions sur le suivi (facultatif)" />
                  <span style={{ fontSize: 9.5, color: D.muted }}>{control ? `À la validation, le contrôle du ${fr(control, { day: "numeric", month: "long" })} est ajouté à l'Agenda et le rappel WhatsApp part la veille.` : p.suiviChoice === "Aucun suivi" ? "Aucun contrôle ne sera programmé." : "Le contrôle choisi sera ajouté à l'Agenda à la validation."}</span>
                </div>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  <div className="flex items-baseline justify-between"><b style={{ fontSize: 12, fontWeight: 600 }}>Prescription</b><Btn kind="link" onClick={() => up({ meds: [...meds, emptyMed()] })} disabled={meds.length >= 12}>+ Ajouter un médicament</Btn></div>
                  {meds.map((m, i) => (
                    <div key={i} className="flex flex-col" style={{ gap: 8, padding: meds.length > 1 ? 10 : 0, border: meds.length > 1 ? `1px solid ${D.sep}` : 0, borderRadius: 6 }}>
                      {meds.length > 1 && <div className="flex items-center justify-between"><span style={{ fontSize: 9.5, fontWeight: 600, color: D.muted }}>Médicament {i + 1}</span><button type="button" aria-label="Retirer" onClick={() => up({ meds: meds.filter((_, j) => j !== i) })} className="cursor-pointer" style={{ border: 0, background: "none", color: D.faint, padding: 2 }}><Trash2 size={13} /></button></div>}
                      {MED_FIELDS.map(([k, label, ph]) => (
                        <label key={k} className="flex flex-col" style={{ gap: 5, fontSize: 10.5, fontWeight: 600 }}>{label}
                          <Input value={m[k]} onChange={(e) => setMed(i, k, e.target.value)} placeholder={ph} style={{ background: "#fff" }} />
                        </label>
                      ))}
                    </div>
                  ))}
                  <span className="flex" style={{ gap: 6, fontSize: 9.5, color: D.muted }}><Info size={12} className="flex-none" />La prescription doit être saisie ou confirmée explicitement par le dermatologue. Aucun traitement n'est déduit ou inventé par l'IA.</span>
                </div>
                <div className="flex flex-wrap justify-between" style={{ gap: 8, paddingTop: 12, borderTop: `1px solid ${D.sep}`, fontSize: 10 }}>
                  <span style={{ color: D.muted }}>Auteur : {dr}</span><span style={{ color: D.warn }}>Non signé · Non transmissible</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid items-start" style={{ gridTemplateColumns: embedded ? "minmax(0,1fr)" : "minmax(0,1.3fr) minmax(280px,.7fr)", gap: 16 }}>
            <div className="min-w-0" style={{ border: `1px solid ${D.border}`, borderRadius: 10, background: "#fff" }}>
              <div className="flex flex-wrap items-center justify-between" style={{ gap: 8, padding: "12px 18px", borderBottom: `1px solid ${D.border}` }}>
                <b style={{ fontSize: 12, fontWeight: 600 }}>Document remis au patient · A4</b>
                <Btn kind="secondary" onClick={() => window.open(`/api/reports/${rid}/view?v=a4&print=1`, "_blank", "noopener")} style={{ height: 32 }}>Imprimer ou enregistrer en PDF</Btn>
              </div>
              <iframe title="Compte rendu" src={`/api/reports/${rid}/view?v=a4`} style={{ width: "100%", height: 1140, border: 0, display: "block", background: "#f1f3f1" }} />
            </div>
            <div className="flex flex-col" style={{ gap: 14 }}>
              <div className="flex flex-col" style={{ gap: 10, padding: 18, border: `1px solid ${D.border}`, borderRadius: 10, background: "#fff" }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>Remettre au patient</b>
                <span style={{ fontSize: 10.5, color: D.muted }}>Choisissez un ou plusieurs moyens.</span>
                {([["wa", "WhatsApp", fiche?.patient?.phone ? `Depuis votre WhatsApp · +${fiche.patient.phone}` : "Depuis votre WhatsApp · contact à choisir"], ["mail", "Email", fiche?.patient?.email || "Aucune adresse dans la fiche"], ["print", "Imprimer", "Remis en main propre"]] as const).map(([k, t, s]) => {
                  const on = ch[k];
                  const off = k === "mail" && !fiche?.patient?.email;
                  return (
                    <button key={k} type="button" disabled={off || !!delivered} onClick={() => setCh({ ...ch, [k]: !on })} className="flex cursor-pointer items-center text-left" data-testid={`ch-${k}`}
                      style={{ gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${on ? "#9fd9d2" : D.border}`, background: on ? "#f0f8f6" : "#fff", opacity: off ? .5 : 1, fontFamily: FONT_UI }}>
                      <span className="grid flex-none place-items-center" style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${on ? D.cta : "#c9d3d0"}`, background: on ? D.cta : "#fff", color: "#fff" }}>{on && <Check size={10} strokeWidth={3} />}</span>
                      <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600, color: D.text }}>{t}</b><span style={{ fontSize: 10, color: D.muted }}>{s}</span></span>
                    </button>
                  );
                })}
                {fiche && !fiche.patient.email && <Btn kind="link" onClick={() => go(`/derm/patients/${pid}?edit=1`)} style={{ alignSelf: "flex-start", fontSize: 10 }}>Ajouter l'email dans la fiche →</Btn>}
                <Btn kind="primary" disabled={busy || !!delivered || !(ch.wa || ch.mail || ch.print)} onClick={deliver} data-testid="cr-deliver" style={{ width: "100%" }}>{delivered ? "Remis au patient ✓" : "Remettre au patient"}</Btn>
              </div>
              {delivered && (
                <div className="flex flex-col" style={{ gap: 8, padding: 18, borderRadius: 10, background: D.tint3 }} data-testid="cr-updated">
                  <b style={{ fontSize: 13, fontWeight: 600, color: D.actionDark }}>Ce que Glow a mis à jour</b>
                  {[...delivered,
                    `Compte rendu ${reportRef(rid!)} rangé dans le dossier de ${pt?.firstName || "votre patient"}`,
                    control ? `Contrôle du ${fr(control, { day: "numeric", month: "long" })} ajouté à l'Agenda et aux Suivis, rappel WhatsApp la veille` : "Aucun contrôle ajouté",
                    `Document vérifiable sur glow-scan.com/verif/${reportRef(rid!)}`].map((t) => (
                    <span key={t} className="flex" style={{ gap: 8, fontSize: 11 }}><Check size={13} color={D.action} className="mt-0.5 flex-none" />{t}</span>
                  ))}
                  {(links.wa || links.print) && (
                    <div className="flex flex-wrap" style={{ gap: 8, marginTop: 4 }}>
                      {links.wa && <a href={links.wa} target="_blank" rel="noopener noreferrer" data-testid="cr-open-wa" style={{ padding: "10px 16px", borderRadius: 6, background: "#1f7a4d", color: "#fff", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>Ouvrir WhatsApp avec le message</a>}
                      {links.print && <a href={links.print} target="_blank" rel="noopener noreferrer" data-testid="cr-open-print" style={{ padding: "10px 16px", borderRadius: 6, border: `1px solid ${D.borderAlt}`, background: "#fff", color: D.text, fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>Imprimer ou enregistrer en PDF</a>}
                    </div>
                  )}
                  <div className="flex flex-wrap" style={{ gap: 8, marginTop: 6 }}>
                    <Btn kind="primary" onClick={() => go(`/derm/dossiers/${pid}`)}>Ouvrir le dossier médical →</Btn>
                    {onDone ? <Btn kind="secondary" onClick={onDone}>Patient suivant</Btn> : <Btn kind="secondary" onClick={() => go("/derm/dossiers")}>Retour aux dossiers</Btn>}
                  </div>
                </div>
              )}
              {!delivered && sentAt && <span style={{ fontSize: 10.5, color: D.muted }}>Déjà remis le {fr(sentAt, { day: "numeric", month: "long" })}. Vous pouvez le remettre à nouveau.</span>}
            </div>
          </section>
        )}
      </div>

      {stage === "edit" && (
        <div className="fixed bottom-0 right-0 z-20 md:left-[250px] left-0" style={{ background: "#fff", borderTop: `1px solid ${D.border}`, boxShadow: "0 -10px 30px rgba(13,41,41,.06)" }}>
          <div className="flex flex-wrap items-center justify-between" style={{ maxWidth: 1240, margin: "auto", gap: 12, padding: "14px 32px" }}>
            <span className="flex flex-col"><b style={{ fontSize: 12, fontWeight: 600 }}>Le rapport reste sous votre contrôle.</b><span style={{ fontSize: 10.5, color: D.muted }} data-testid="cr-footer">{footer}</span></span>
            <span className="flex flex-wrap items-center" style={{ gap: 10 }}>
              <Btn kind="link" onClick={preview}>Aperçu du document</Btn>
              <Btn kind="secondary" onClick={() => save()} data-testid="cr-save"><Save size={14} />{savedOnce && !dirty ? "Brouillon enregistré ✓" : "Enregistrer le brouillon"}</Btn>
              {setup ? (
                <span className="flex items-center" style={{ gap: 6 }}>
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="Nouveau code" value={setup.a} onChange={(e) => setSetup({ ...setup, a: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ width: 110 }} />
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="Confirmer" value={setup.b} onChange={(e) => setSetup({ ...setup, b: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ width: 100 }} />
                  <Btn kind="primary" disabled={busy || setup.a.length !== 4 || setup.a !== setup.b} onClick={createPin}>Enregistrer le code</Btn>
                </span>
              ) : pinOpen ? (
                <span className="flex items-center" style={{ gap: 6 }}>
                  <Input type="password" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Code à 4 chiffres" value={pin} autoFocus aria-label="Code de signature"
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) sign(); }} style={{ width: 130 }} data-testid="cr-pin" />
                  <Btn kind="primary" disabled={busy || pin.length !== 4} onClick={sign} data-testid="cr-sign">Valider et signer</Btn>
                </span>
              ) : (
                <Btn kind="primary" disabled={!can} onClick={() => setPinOpen(true)} data-testid="cr-validate" style={!can ? undefined : { background: D.cta }}><Lock size={13} />Valider le compte rendu</Btn>
              )}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
