import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Link } from "wouter";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LINE_STATUS_LABEL, LINE_MOMENTS, reportMissing, emptyReport, type ReportPayload, type ReportLine, type LineStatus } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Saisie unique du compte rendu (étape 9a, maquette « Derm Compte Rendu ») :
// elle produit la version patient, le dossier du cabinet et l'ordonnance.
// Visite au cabinet : signature ici (code à 4 chiffres). Consultation en ligne :
// la signature se fait à la clôture (ConsultationChat), qui appelle `saveRef`.
// ════════════════════════════════════════════════════════════════════════

type Summary = {
  id: number; ref: string; signedAt: string | null; sentPatientAt: string | null;
  prescription: { ref: string; status: string } | null;
};
type DoctorInfo = { licenseNumber: string | null; cabinetAddress: string | null; specialtyTitle: string };

const field = "box-border w-full rounded-2xl border border-organic-divider bg-organic-bg px-3.5 py-2.5 font-body text-[14px] text-organic-text outline-none focus:border-organic-accent";
const chip = (on: boolean) => `cursor-pointer rounded-pill border px-3 py-1 font-body text-[12px] font-bold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`;

async function call(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, { method, credentials: "include", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d?.message || "Erreur. Réessayez."), { code: d?.code });
  return d;
}

function Area({ label, hint, value, onChange, rows = 3, testid }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number; testid?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-organic-neutral-800">{label}</span>
      {hint && <span className="text-[12px] text-organic-neutral-700">{hint}</span>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${field} resize-y`} data-testid={testid} />
    </label>
  );
}
function Line({ label, value, onChange, type = "text", list, testid }: { label: string; value: string; onChange: (v: string) => void; type?: string; list?: string; testid?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-organic-neutral-800">{label}</span>
      <input type={type} value={value} list={list} onChange={(e) => onChange(e.target.value)} className={`${field} h-11`} data-testid={testid} />
    </label>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-bg p-organic-4">
      <span className="font-heading text-[18px]">{title}</span>
      {children}
    </div>
  );
}

export function ReportEditor({ source, patientId, consultationId, saveRef, onReportId, narrow = false }: {
  source: "visit" | "consultation"; patientId?: number; consultationId?: number; narrow?: boolean;
  saveRef?: MutableRefObject<(() => Promise<number | null>) | null>;
  onReportId?: (id: number) => void;
}) {
  const [report, setReport] = useState<Summary | null>(null);
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [p, setP] = useState<ReportPayload>(emptyReport());
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sendInfo, setSendInfo] = useState<{ sent: boolean; url: string } | null>(null);
  const two = narrow ? "grid grid-cols-1" : "grid grid-cols-1 sm:grid-cols-2";
  const dirty = useRef(false);
  const latest = useRef(p);
  latest.current = p;

  const open = async () => {
    setLoadErr("");
    try {
      const d = await call("/api/pro/reports", "POST", { source, patientId, consultationId });
      setReport(d.report); setDoctor(d.doctor); setP({ ...emptyReport(), ...d.report.payload });
      onReportId?.(d.report.id);
    } catch (e: any) { setLoadErr(e.message); }
  };
  useEffect(() => { open(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [source, patientId, consultationId]);

  const save = async (): Promise<number | null> => {
    if (!report) return null;
    if (report.signedAt || !dirty.current) return report.id;
    setSaving("saving");
    try { await call(`/api/pro/reports/${report.id}`, "PUT", { payload: latest.current }); dirty.current = false; setSaving("saved"); }
    catch (e: any) { setSaving("idle"); setErr(e.message); throw e; }
    return report.id;
  };
  if (saveRef) saveRef.current = save;

  // Enregistrement automatique 1 s après la dernière frappe.
  useEffect(() => {
    if (!dirty.current || report?.signedAt) return;
    const t = setTimeout(() => { save().catch(() => {}); }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const set = <K extends keyof ReportPayload>(k: K, v: ReportPayload[K]) => { dirty.current = true; setSaving("idle"); setP((x) => ({ ...x, [k]: v })); };
  const setLine = (i: number, patch: Partial<ReportLine>) => set("lines", p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => set("lines", [...p.lines, { name: "", qty: "", when: "", how: "", duration: "", status: "ajoute", reason: "" }]);

  if (loadErr) return <div className="rounded-card bg-organic-accent-100 p-organic-4 text-[13px] text-organic-accent-900">{loadErr} <button type="button" onClick={open} className="font-bold underline">Réessayer</button></div>;
  if (!report || !doctor) return <div className="p-organic-4 text-[14px] text-organic-neutral-700">Chargement du compte rendu…</div>;

  const signed = !!report.signedAt;
  const missing = reportMissing(p, doctor);
  const view = (v: "patient" | "cabinet" | "ordonnance") => async () => { await save().catch(() => {}); window.open(`/api/reports/${report.id}/view?v=${v}`, "_blank", "noopener"); };

  const sign = async () => {
    setBusy(true); setErr("");
    try {
      await save();
      await call(`/api/pro/reports/${report.id}/sign`, "POST", { pin });
      setPin(""); await open();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true); setErr("");
    try { const d = await call(`/api/pro/reports/${report.id}/send`, "POST", {}); setSendInfo(d); await open(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!report.prescription || !window.confirm("Annuler cette ordonnance ? Le pharmacien la verra « annulée » sur /verif.")) return;
    setBusy(true); setErr("");
    try { await call(`/api/pro/prescriptions/${report.prescription.ref}/revoke`, "POST", {}); await open(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const previews = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-organic-neutral-700">Aperçu :</span>
      <button type="button" className={chip(false)} onClick={view("patient")}>Patient</button>
      <button type="button" className={chip(false)} onClick={view("cabinet")}>Dossier du cabinet</button>
      {p.withPrescription && <button type="button" className={chip(false)} onClick={view("ordonnance")}>Ordonnance</button>}
    </div>
  );

  if (signed) {
    return (
      <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6" data-testid="report-signed">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-[20px]">Compte rendu signé</span>
          <span className="rounded-pill bg-organic-accent-2-100 px-3 py-1 text-[12px] font-bold text-organic-accent-2-800">{report.ref} · {new Date(report.signedAt!).toLocaleDateString("fr-FR")}</span>
        </div>
        <span className="text-[14px]"><b>Diagnostic :</b> {p.diagnosis}</span>
        {report.prescription && (
          <span className="text-[13px]">Ordonnance {report.prescription.ref}{report.prescription.status === "revoked" ? " (annulée)" : ""}</span>
        )}
        {previews}
        {source === "visit" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={send} disabled={busy} data-testid="report-send">{report.sentPatientAt ? "Renvoyer au patient sur WhatsApp" : "Envoyer au patient sur WhatsApp"}</Button>
            {report.prescription?.status === "valid" && <Button variant="ghost" onClick={revoke} disabled={busy}>Annuler l'ordonnance</Button>}
          </div>
        )}
        {report.sentPatientAt && <span className="text-[12px] text-organic-accent-2-700">Copie envoyée au patient le {new Date(report.sentPatientAt).toLocaleDateString("fr-FR")}.</span>}
        {sendInfo && !sendInfo.sent && (
          <div className="flex flex-col gap-1.5 rounded-card bg-organic-bg p-organic-3 text-[13px]">
            <span>WhatsApp n'a pas pu être envoyé automatiquement (numéro absent ou service indisponible). Copiez ce lien pour le patient :</span>
            <input readOnly value={sendInfo.url} onFocus={(e) => e.target.select()} className={`${field} h-10 text-[12px]`} />
          </div>
        )}
        {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-4 sm:p-organic-6" data-testid="report-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="font-heading text-[20px]">Compte rendu</span>
          <span className="text-[12px] text-organic-neutral-700">Une saisie, trois documents : patient, dossier du cabinet et ordonnance.</span>
        </span>
        <span className="text-[12px] text-organic-neutral-700">{report.ref} · {saving === "saving" ? "Enregistrement…" : saving === "saved" ? "Brouillon enregistré" : "Brouillon"}</span>
      </div>

      <Section title="Pour le dossier">
        <Area label="Motif" value={p.motif} onChange={(v) => set("motif", v)} rows={2} testid="report-motif" />
        <Area label="Examen" value={p.exam} onChange={(v) => set("exam", v)} rows={3} testid="report-exam" />
        <div className={`${two} gap-organic-3`}>
          <Line label="Phototype" value={p.phototype} onChange={(v) => set("phototype", v)} />
          <Line label="Poids (kg)" type="number" value={p.weightKg == null ? "" : String(p.weightKg)}
            onChange={(v) => { const n = Number(v); set("weightKg", v === "" || !Number.isFinite(n) || n <= 0 ? null : Math.min(300, n)); }} testid="report-weight" />
          <Line label="Allergies" value={p.allergies} onChange={(v) => set("allergies", v)} />
          <Line label="Antécédent" value={p.antecedents} onChange={(v) => set("antecedents", v)} />
        </div>
      </Section>

      <Section title="Diagnostic">
        <Line label="Diagnostic retenu" value={p.diagnosis} onChange={(v) => set("diagnosis", v)} testid="report-dx" />
        {p.aiSuggestion && <span className="text-[12px] text-organic-neutral-700">Suggestion IA (analyse indicative) : {p.aiSuggestion}</span>}
        <Area label="Ce que j'ai vu, pour le patient" hint="En mots simples, avec le terme médical expliqué une fois. Ex. : « Vos taches brunes sur les deux joues sont un mélasma. C'est fréquent et ce n'est pas grave. »"
          value={p.diagnosisPlain} onChange={(v) => set("diagnosisPlain", v)} testid="report-plain" />
      </Section>

      <Section title="Traitement">
        <datalist id="report-moments">{LINE_MOMENTS.map((m) => <option key={m} value={m} />)}</datalist>
        {p.lines.length === 0 && <span className="text-[13px] text-organic-neutral-700">Aucun produit pour l'instant.</span>}
        {p.lines.map((l, i) => (
          <div key={i} className="flex flex-col gap-organic-2 rounded-card border border-organic-divider p-organic-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(LINE_STATUS_LABEL) as LineStatus[]).map((k) => (
                <button key={k} type="button" className={chip(l.status === k)} onClick={() => setLine(i, { status: k })}>{LINE_STATUS_LABEL[k]}</button>
              ))}
              <button type="button" aria-label="Retirer ce produit" onClick={() => set("lines", p.lines.filter((_, j) => j !== i))}
                className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-organic-neutral-700"><Trash2 size={16} /></button>
            </div>
            <div className={`${two} gap-organic-2`}>
              <Line label="Produit" value={l.name} onChange={(v) => setLine(i, { name: v })} testid={`report-line-name-${i}`} />
              <Line label="Quantité" value={l.qty} onChange={(v) => setLine(i, { qty: v })} />
              {l.status !== "arrete" && <Line label="Moment" value={l.when} list="report-moments" onChange={(v) => setLine(i, { when: v })} />}
              {l.status !== "arrete" && <Line label="Durée" value={l.duration} onChange={(v) => setLine(i, { duration: v })} testid={`report-line-duration-${i}`} />}
            </div>
            {l.status !== "arrete" && <Line label="Mode d'emploi" value={l.how} onChange={(v) => setLine(i, { how: v })} />}
            {l.status !== "poursuivi" && <Line label="Pourquoi" value={l.reason} onChange={(v) => setLine(i, { reason: v })} />}
          </div>
        ))}
        <Button variant="secondary" onClick={addLine} className="self-start" disabled={p.lines.length >= 12}><Plus size={16} /> Ajouter un produit</Button>
        <Line label="Ne pas utiliser" value={p.avoid} onChange={(v) => set("avoid", v)} testid="report-avoid" />
      </Section>

      <Section title="Pour le patient">
        <Area label="Mot personnel (facultatif)" value={p.personalNote} onChange={(v) => set("personalNote", v)} rows={2} />
        <Area label="À quoi vous attendre" value={p.expect} onChange={(v) => set("expect", v)} rows={2} />
        <Line label="Écrivez-moi tout de suite si" value={p.alertIf} onChange={(v) => set("alertIf", v)} />
        <Line label="Photo de contrôle" type="date" value={p.controlPhotoDate || ""} onChange={(v) => set("controlPhotoDate", v || null)} />
      </Section>

      <Section title="Suite : qui fait quoi, quand">
        <Line label="Patient" value={p.next.patient} onChange={(v) => set("next", { ...p.next, patient: v })} />
        <Line label="Secrétariat" value={p.next.secretariat} onChange={(v) => set("next", { ...p.next, secretariat: v })} />
        <Line label="Médecin" value={p.next.doctor} onChange={(v) => set("next", { ...p.next, doctor: v })} />
      </Section>

      <label className="flex cursor-pointer items-start gap-2.5 text-[14px] font-semibold">
        <input type="checkbox" checked={p.withPrescription} onChange={(e) => set("withPrescription", e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" data-testid="report-with-rx" />
        Joindre une ordonnance (page 2)
      </label>
      {p.withPrescription && (!doctor.licenseNumber || !doctor.cabinetAddress) && (
        <span className="text-[13px] text-organic-accent-800">
          L'ordonnance exige votre n° ONMC et l'adresse du cabinet. <Link href="/derm/cabinet" className="font-bold underline">Compléter dans Mon cabinet</Link>
        </span>
      )}

      {previews}

      {missing.length > 0 && <span className="text-[13px] text-organic-neutral-800">Avant de signer, il manque : {missing.join(", ")}.</span>}

      {source === "visit" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-organic-neutral-700">Code de signature</span>
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="box-border h-11 w-32 rounded-pill border border-organic-divider bg-organic-bg px-4 text-center font-body text-[18px] tracking-[.4em] outline-none focus:border-organic-accent" data-testid="report-pin" />
          </label>
          <Button onClick={sign} disabled={busy || pin.length !== 4 || missing.length > 0} data-testid="report-sign">Signer le compte rendu</Button>
        </div>
      )}
      {source === "consultation" && <span className="text-[12px] text-organic-neutral-700">Le compte rendu est signé avec votre code quand vous validez la consultation.</span>}
      {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
    </div>
  );
}
