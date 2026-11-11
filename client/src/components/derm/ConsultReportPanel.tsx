import { useEffect, useRef, useState } from "react";
import { Check, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { D, FONT_UI, patientCode } from "./tokens";
import { Btn, Input, Textarea, Toggle, Notice, fr, api } from "./ui";
import { reportPayloadSchema, a4Points, SUIVI_CHOICES, type ReportPayload } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Messagerie (D5) · colonne « Rapport & ordonnance » : le compte rendu d'une
// consultation en ligne, au modèle A4 unique. 01 Rapport médical, 02
// Prescription, 03 Suivi ; « Votre validation fait foi » ; signature par code
// à 4 chiffres (clôture existante : /close) ; remise au patient (/send-report) ;
// « Ajouter à mes patients » (/to-patient). L'IA ne prescrit pas.
// ════════════════════════════════════════════════════════════════════════

type Med = ReportPayload["meds"][number];
const emptyMed = (): Med => ({ m: "", f: "", v: "", p: "", d: "", c: "" });
const FOLLOW: Record<string, string> = { "J+14": "2_weeks", "J+28": "1_month", "3 mois": "3_months", "Aucun suivi": "" };
const SUIVI_LABEL: Record<string, string> = { "J+14": "Réévaluation en ligne à 14 jours, ou avant si aggravation.", "J+28": "Réévaluation en ligne à 28 jours, ou avant si aggravation.", "3 mois": "Réévaluation en ligne à 3 mois, ou avant si aggravation.", "Aucun suivi": "Pas de suivi programmé." };

async function downloadImage(url: string, name: string) {
  const w = window as any;
  if (!w.html2canvas) {
    await new Promise<void>((ok, ko) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; s.onload = () => ok(); s.onerror = () => ko(new Error("load")); document.head.appendChild(s); });
  }
  const ifr = document.createElement("iframe");
  ifr.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1300px;border:0";
  ifr.src = url;
  document.body.appendChild(ifr);
  await new Promise((ok) => { ifr.onload = ok; });
  await new Promise((ok) => setTimeout(ok, 600));
  const page = ifr.contentDocument?.querySelector(".page") as HTMLElement | null;
  if (!page) { ifr.remove(); throw new Error("page"); }
  const canvas = await w.html2canvas(page, { scale: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png"); a.download = `${name}.png`; a.click();
  ifr.remove();
}

function Section({ n, title, editing, onEdit, children, testid }: { n: string; title: string; editing: boolean; onEdit?: () => void; children: React.ReactNode; testid?: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 10, padding: "14px 14px", border: `1px solid ${D.border}`, borderRadius: 8, background: editing ? "#fff" : "#f8faf7" }} data-testid={testid}>
      <div className="flex items-center justify-between">
        <b style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6 }}>{n} {title}</b>
        {onEdit && <Btn kind="secondary" onClick={onEdit} style={{ height: 28, padding: "0 10px", fontSize: 10.5 }}>{editing ? "Terminé" : "Modifier"}</Btn>}
      </div>
      {children}
    </div>
  );
}
const Value = ({ label, v, warn }: { label?: string; v: string; warn?: string }) => (
  <div className="flex flex-col" style={{ gap: 3 }}>
    {label && <span style={{ fontSize: 9.5, color: D.muted }}>{label}</span>}
    <span style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", color: v.trim() ? D.text : D.warn }}>{v.trim() || warn || "À compléter"}</span>
  </div>
);

export function ConsultReportPanel({ consultationId, code, closed, linkedPatientId, onChanged }: { consultationId: number; code: string; closed: boolean; linkedPatientId: number | null; onChanged: () => void }) {
  const [rid, setRid] = useState<number | null>(null);
  const [p, setP] = useState<ReportPayload | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, boolean>>({});
  const [attest, setAttest] = useState(false);
  const [pin, setPin] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [setup, setSetup] = useState<{ a: string; b: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "warn" | "err" } | null>(null);
  const [linked, setLinked] = useState<number | null>(linkedPatientId);
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loaded.current = false;
    setP(null); setRid(null); setMsg(null); setAttest(false); setPinOpen(false); setPin(""); setEdit({}); setLinked(linkedPatientId);
    api<{ report: { id: number; signedAt: string | null; sentPatientAt: string | null; payload: ReportPayload } }>("/api/pro/reports", "POST", { source: "consultation", consultationId, format: "a4" })
      .then((d) => {
        const q = reportPayloadSchema.parse(d.report.payload || {});
        setRid(d.report.id); setP(q); setSignedAt(d.report.signedAt); setSentAt(d.report.sentPatientAt);
        // Les champs encore vides s'ouvrent directement en saisie.
        setEdit({ rep: !q.conclusion.trim() || !q.conduite.trim(), rx: false, suivi: !q.suiviChoice });
        loaded.current = true;
      })
      .catch((e) => setMsg({ t: e.message, tone: "err" }));
  }, [consultationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const up = (patch: Partial<ReportPayload>) => { setP((cur) => (cur ? { ...cur, ...patch } : cur)); setDirty(true); };
  const save = async (quiet = false) => {
    if (!rid || !p || signedAt) return true;
    try {
      await api(`/api/pro/reports/${rid}`, "PUT", { payload: { ...p, meds: p.meds.filter((m) => Object.values(m).some((v) => v.trim())) } });
      setDirty(false); if (!quiet) setMsg({ t: "Brouillon enregistré.", tone: "ok" }); return true;
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); return false; }
  };
  useEffect(() => { if (!dirty || signedAt) return; const t = setTimeout(() => { save(true); }, 3000); return () => clearTimeout(t); }, [p, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <div style={{ padding: 20, fontSize: 12, color: D.muted }}>{msg ? <Notice tone="err">{msg.t}</Notice> : "Préparation du compte rendu…"}</div>;

  const legacy = !!signedAt && p.format !== "a4";
  const signed = !!signedAt;
  const done3 = a4Points(p);
  const left = done3.filter((x) => !x).length;
  const can = !signed && !closed && !left && attest;
  const meds = p.meds.length ? p.meds : [emptyMed()];
  const setMed = (i: number, k: keyof Med, v: string) => up({ meds: meds.map((m, j) => (j === i ? { ...m, [k]: v } : m)) });
  const docUrl = rid ? `/api/reports/${rid}/view?v=${legacy ? "patient" : "a4"}` : "";
  const status = sentAt ? ["Remis au patient", D.tintChip, D.action] : signed ? ["Validé · à remettre", "#e3f3ef", "#138c84"] : ["Validation requise", "#fbefd9", "#7a5a17"];

  const validate = async () => {
    if (!rid || !can) return;
    setBusy(true); setMsg(null);
    try {
      if (!(await save(true))) return;
      const d = await api<{ payoutFcfa?: number; demo?: boolean }>(`/api/pro/consultations/${consultationId}/close`, "POST", { reportId: rid, pin, followUp: FOLLOW[p.suiviChoice] || undefined });
      setSignedAt(new Date().toISOString()); setPinOpen(false); setPin("");
      setMsg({ t: d.demo ? "Consultation de démonstration validée (aucun envoi réel)." : `Compte rendu signé.${d.payoutFcfa ? ` Votre part : ${d.payoutFcfa.toLocaleString("fr-FR")} FCFA.` : ""} Remettez-le au patient ci-dessous.`, tone: "ok" });
      onChanged();
    } catch (e: any) {
      if (e.code === "SIGN_PIN_SETUP") setSetup({ a: "", b: "" });
      setMsg({ t: e.message, tone: "err" });
    } finally { setBusy(false); }
  };
  const createPin = async () => {
    if (!setup || !/^\d{4}$/.test(setup.a) || setup.a !== setup.b) return;
    setBusy(true);
    try { await api("/api/pro/sign-pin", "POST", { pin: setup.a }); setSetup(null); setPin(setup.a); setPinOpen(true); setMsg({ t: "Code de signature enregistré. Vous pouvez valider.", tone: "ok" }); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };
  const sendToPatient = async () => {
    setBusy(true); setMsg(null);
    try { await api(`/api/pro/consultations/${consultationId}/send-report`, "POST", {}); setSentAt(new Date().toISOString()); setMsg({ t: "Rapport et ordonnance envoyés au patient (WhatsApp, notification et email).", tone: "ok" }); onChanged(); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };
  const toggleLink = async (on: boolean) => {
    if (!on) return; // un dossier créé n'est pas supprimé d'ici
    try { const d = await api<{ patientId: number }>(`/api/pro/consultations/${consultationId}/to-patient`, "POST", {}); setLinked(d.patientId); setMsg({ t: `Dossier ${patientCode(d.patientId)} créé dans vos patients, compte rendu archivé.`, tone: "ok" }); onChanged(); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
  };

  return (
    <div className="flex flex-col" style={{ gap: 12, fontFamily: FONT_UI, color: D.text }} data-testid="consult-report">
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        <span className="flex flex-col"><b style={{ fontSize: 17, fontWeight: 600 }}>Rapport & ordonnance</b><span style={{ fontSize: 10.5, color: D.muted }}>Version médecin · consultation {code}</span></span>
        <span style={{ padding: "4px 8px", borderRadius: 4, background: status[1], color: status[2], fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{status[0]}</span>
      </div>
      {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

      {legacy ? (
        <div className="flex flex-col" style={{ gap: 8, padding: 14, borderRadius: 8, background: "#f8faf7", fontSize: 11.5 }}>
          <span>Compte rendu signé le {fr(signedAt, { day: "numeric", month: "long" })} avec l'ancien modèle.</span>
          <Btn kind="link" onClick={() => window.open(docUrl, "_blank", "noopener")} style={{ alignSelf: "flex-start" }}>Ouvrir le document →</Btn>
        </div>
      ) : (
        <>
          <Section n="01" title="RAPPORT MÉDICAL" editing={!!edit.rep && !signed} onEdit={signed ? undefined : () => setEdit({ ...edit, rep: !edit.rep })} testid="cr-rep">
            {edit.rep && !signed ? (
              <>
                {([["motif", "Motif de consultation", 2], ["exam", "Observations cliniques", 3], ["conclusion", "Conclusion du dermatologue", 2], ["conduite", "Conduite à tenir", 2]] as const).map(([k, l, rows]) => (
                  <label key={k} className="flex flex-col" style={{ gap: 4, fontSize: 9.5, color: D.muted }}>
                    <span className="flex justify-between">{l}{(k === "conclusion" || k === "conduite") && <b style={{ fontSize: 8.5, color: p[k].trim() ? D.action : D.warn }}>{p[k].trim() ? "COMPLÉTÉ" : "À COMPLÉTER"}</b>}</span>
                    <Textarea rows={rows} value={p[k]} onChange={(e) => up({ [k]: e.target.value } as any)}
                      style={{ minHeight: rows * 20 + 16, background: (k === "conclusion" || k === "conduite") && !p[k].trim() ? "#fdf6ea" : "#fff", borderColor: (k === "conclusion" || k === "conduite") && !p[k].trim() ? "#efd9b0" : D.border }} />
                  </label>
                ))}
              </>
            ) : (
              <>
                <Value label="Motif de consultation" v={p.motif} warn="Non renseigné" />
                <Value label="Observations cliniques" v={p.exam} warn="Non renseigné" />
                <Value label="Conclusion du dermatologue" v={p.conclusion} />
                <Value label="Conduite à tenir" v={p.conduite} />
              </>
            )}
          </Section>

          <Section n="02" title="PRESCRIPTION" editing={!!edit.rx && !signed} onEdit={signed ? undefined : () => setEdit({ ...edit, rx: !edit.rx })} testid="cr-rx">
            {edit.rx && !signed ? (
              <>
                {meds.map((m, i) => (
                  <div key={i} className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 6, paddingBottom: 8, borderBottom: `1px solid ${D.sep}` }}>
                    {([["m", "Médicament ou soin"], ["f", "Forme / dosage"], ["v", "Voie"], ["p", "Posologie"], ["d", "Durée"], ["c", "Consignes"]] as [keyof Med, string][]).map(([k, l]) => (
                      <Input key={k} value={m[k]} onChange={(e) => setMed(i, k, e.target.value)} placeholder={l} style={{ height: 32, background: "#fff", gridColumn: k === "m" || k === "c" ? "1 / span 2" : undefined }} />
                    ))}
                    {meds.length > 1 && <button type="button" onClick={() => up({ meds: meds.filter((_, j) => j !== i) })} className="flex cursor-pointer items-center" style={{ gap: 4, border: 0, background: "none", color: D.faint, fontSize: 10, fontFamily: FONT_UI }}><Trash2 size={11} />Retirer</button>}
                  </div>
                ))}
                <Btn kind="link" onClick={() => up({ meds: [...meds, emptyMed()] })} style={{ alignSelf: "flex-start" }}>+ Ajouter un médicament</Btn>
              </>
            ) : p.meds.filter((m) => m.m.trim()).length ? p.meds.filter((m) => m.m.trim()).map((m, i) => (
              <div key={i} className="flex flex-col" style={{ gap: 2 }}><b style={{ fontSize: 13, fontWeight: 600 }}>{m.m}</b><span style={{ fontSize: 10.5, color: D.muted }}>{[m.f, m.v, m.p, m.d, m.c].filter(Boolean).join(" · ")}</span></div>
            )) : <span style={{ fontSize: 11.5, color: D.muted }}>Aucune prescription. Ajoutez-en une si nécessaire.</span>}
            <span style={{ fontSize: 9.5, color: D.faint }}>Saisie ou confirmée par vous. Aucun traitement n'est déduit ou inventé par l'IA.</span>
          </Section>

          <Section n="03" title="SUIVI" editing={!!edit.suivi && !signed} onEdit={signed ? undefined : () => setEdit({ ...edit, suivi: !edit.suivi })} testid="cr-suivi">
            {edit.suivi && !signed ? (
              <>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {SUIVI_CHOICES.map((k) => (
                    <button key={k} type="button" onClick={() => up({ suiviChoice: k })} className="cursor-pointer" data-testid={`cr-suivi-${k}`}
                      style={{ height: 28, padding: "0 11px", borderRadius: 999, border: `1px solid ${p.suiviChoice === k ? D.side : D.border}`, background: p.suiviChoice === k ? D.side : "#fff", color: p.suiviChoice === k ? "#fff" : "#5f706c", fontSize: 10.5, fontWeight: 600, fontFamily: FONT_UI }}>{k}</button>
                  ))}
                </div>
                <Input value={p.suiviText} onChange={(e) => up({ suiviText: e.target.value })} placeholder="Précisions (facultatif)" style={{ height: 32, background: "#fff" }} />
              </>
            ) : <Value v={p.suiviChoice ? [SUIVI_LABEL[p.suiviChoice], p.suiviText].filter(Boolean).join(" ") : ""} />}
          </Section>

          {!signed && (
            <label className="flex cursor-pointer" style={{ gap: 10, padding: 14, border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff" }}>
              <input type="checkbox" checked={attest} onChange={() => setAttest(!attest)} style={{ marginTop: 2, accentColor: D.cta }} data-testid="cr-attest" />
              <span className="flex flex-col" style={{ gap: 3 }}><b style={{ fontSize: 12, fontWeight: 600 }}>Votre validation fait foi</b><span style={{ fontSize: 10.5, color: D.muted }}>J'ai relu et corrigé l'ensemble du compte rendu et confirme les éléments médicaux qui y figurent.</span></span>
            </label>
          )}
          <Btn kind="link" onClick={async () => { if (await save(true)) window.open(docUrl, "_blank", "noopener"); }} style={{ alignSelf: "flex-start" }}>{signed ? "Ouvrir le document →" : "Aperçu du document (brouillon) →"}</Btn>
        </>
      )}

      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: .8, color: D.muted }}>DOCUMENTS GÉNÉRÉS APRÈS VALIDATION</span>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {([["PDF", FileText, "Imprimer · PDF"], ["IMAGE", ImageIcon, "Télécharger l'image"]] as const).map(([k, Icon, l]) => (
          <button key={k} type="button" disabled={!signed} data-testid={`cr-doc-${k}`}
            onClick={async () => { if (k === "PDF") window.open(docUrl, "_blank", "noopener"); else { try { await downloadImage(docUrl, `Compte rendu ${code}`); } catch { setMsg({ t: "Image indisponible : utilisez « Imprimer · PDF ».", tone: "warn" }); } } }}
            className="flex cursor-pointer items-center text-left" style={{ gap: 10, padding: "10px 12px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff", opacity: signed ? 1 : .5, fontFamily: FONT_UI }}>
            <span className="grid flex-none place-items-center" style={{ width: 28, height: 28, borderRadius: 4, background: "#f0f1ee", color: D.muted }}><Icon size={14} /></span>
            <span className="flex flex-col"><b style={{ fontSize: 11, fontWeight: 600, color: D.text }}>Rapport + ordonnance</b><span style={{ fontSize: 9.5, color: D.muted }}>{signed ? l : "Après validation"}</span></span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between" style={{ gap: 12, padding: 14, border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff" }}>
        <span className="flex flex-col" style={{ gap: 3 }}>
          <b style={{ fontSize: 12, fontWeight: 600 }}>Ajouter à mes patients</b>
          <span style={{ fontSize: 10.5, color: D.muted }}>{linked ? <>Dossier {patientCode(linked)} créé · <a href={`/derm/dossiers/${linked}`} style={{ color: D.action, fontWeight: 600 }}>Ouvrir le dossier →</a></> : "Facultatif · Avec l'accord du patient, créer son dossier médical et y archiver les documents."}</span>
        </span>
        <Toggle on={!!linked} onChange={toggleLink} label="Ajouter à mes patients" />
      </div>

      {!legacy && (
        <>
          <span style={{ fontSize: 10, color: D.muted }}>La validation engage le médecin. L'IA ne prescrit pas.</span>
          {!signed ? (
            setup ? (
              <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
                <Input type="password" inputMode="numeric" maxLength={4} placeholder="Nouveau code" value={setup.a} onChange={(e) => setSetup({ ...setup, a: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ width: 120 }} />
                <Input type="password" inputMode="numeric" maxLength={4} placeholder="Confirmer" value={setup.b} onChange={(e) => setSetup({ ...setup, b: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ width: 110 }} />
                <Btn kind="primary" disabled={busy || setup.a.length !== 4 || setup.a !== setup.b} onClick={createPin}>Enregistrer le code</Btn>
              </div>
            ) : pinOpen ? (
              <div className="flex items-center" style={{ gap: 6 }}>
                <Input type="password" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Code à 4 chiffres" value={pin} autoFocus aria-label="Code de signature"
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) validate(); }} style={{ flex: 1 }} data-testid="cr-pin" />
                <Btn kind="primary" disabled={busy || pin.length !== 4} onClick={validate} data-testid="cr-sign"><Check size={14} />Signer</Btn>
              </div>
            ) : (
              <Btn kind="primary" disabled={!can} onClick={() => setPinOpen(true)} style={{ width: "100%", height: 42 }} data-testid="cr-validate">Valider et générer les documents →</Btn>
            )
          ) : (
            <Btn kind="primary" disabled={busy || !!sentAt} onClick={sendToPatient} style={{ width: "100%", height: 42 }} data-testid="cr-send">{sentAt ? `Remis au patient le ${fr(sentAt, { day: "numeric", month: "long" })} ✓` : "Envoyer au patient →"}</Btn>
          )}
          <span className="text-center" style={{ fontSize: 10, color: D.muted }}>
            {signed ? "Le patient reçoit le lien du rapport sur WhatsApp, par notification et par email." : left ? `Complétez ${left === 3 ? "les 3 points" : `${left} point${left > 1 ? "s" : ""}`} (conclusion, conduite, suivi)` : !attest ? "Confirmez votre relecture pour valider" : "Tout est prêt"}
            {!signed && <> · <button type="button" onClick={() => save()} className="cursor-pointer" style={{ border: 0, background: "none", padding: 0, color: D.action, fontSize: 10, fontWeight: 600, fontFamily: FONT_UI }}>Enregistrer le brouillon</button></>}
          </span>
        </>
      )}
    </div>
  );
}
