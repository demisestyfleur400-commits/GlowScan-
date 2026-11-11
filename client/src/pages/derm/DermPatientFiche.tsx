import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, Card, Btn, Input, Select, Chip, Label, Notice, fr, sexLabel, phoneFmt, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";
import { rememberPatient } from "./DermPatients";

// ════════════════════════════════════════════════════════════════════════
// Patients · fiche administrative (handoff §3.3). Identité et coordonnées
// uniquement ; les informations cliniques sont dans le dossier médical.
// ════════════════════════════════════════════════════════════════════════

type Fiche = {
  patient: {
    id: number; firstName: string; lastName: string; age: number | null; sex: string | null; birthDate: string | null;
    phone: string | null; email: string | null; city: string | null; archived: boolean; archivedAt: string | null; createdAt: string | null;
    emergencyName: string | null; emergencyPhone: string | null; legalRep: string | null; contactChannels: string[]; contactUsage: string;
  };
  cabinet: { doctor: string; cabinetName: string | null; city: string | null };
};
const USAGES = ["Rappels de rendez-vous uniquement.", "Rappels et résultats disponibles (sans détail).", "Aucun rappel."];
const CHANNELS = ["SMS", "WhatsApp", "Appel"];

function Field({ label, value, edit, children }: { label: string; value: React.ReactNode; edit: boolean; children?: React.ReactNode }) {
  return (
    <Label text={label}>
      {edit && children ? children : <span style={{ fontSize: 12, color: D.text, minHeight: 18 }}>{value}</span>}
    </Label>
  );
}

export default function DermPatientFiche() {
  const [, params] = useRoute("/derm/patients/:id");
  const id = Number(params?.id);
  const [, go] = useLocation();
  const qc = useQueryClient();
  const key = `/api/derm/patients/${id}`;
  const { data, error } = useQuery<Fiche>({ queryKey: [key], enabled: !!id });
  const { data: acc } = useProAccount();
  const isDoctor = acc?.user?.role !== "secretary";
  const [edit, setEdit] = useState(() => { try { return new URLSearchParams(window.location.search).get("edit") === "1"; } catch { return false; } });
  const [f, setF] = useState<Record<string, string>>({});
  const [pref, setPref] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);

  const p = data?.patient;
  useEffect(() => { if (id) rememberPatient(id); }, [id]);
  const startEdit = () => {
    if (!p) return;
    setF({ lastName: p.lastName, firstName: p.firstName, birthDate: p.birthDate || "", age: p.age ? String(p.age) : "", sex: p.sex || "",
      phone: p.phone || "", email: p.email || "", city: p.city || "", emergencyName: p.emergencyName || "", emergencyPhone: p.emergencyPhone || "", legalRep: p.legalRep || "" });
    setEdit(true);
  };
  useEffect(() => { if (edit && p && !Object.keys(f).length) startEdit(); }, [edit, p]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: Record<string, unknown>, done?: string) => {
    setBusy(true); setMsg(null);
    try {
      await api(`/api/derm/patients/${id}`, "PATCH", patch);
      await qc.invalidateQueries({ queryKey: [key] });
      qc.invalidateQueries({ queryKey: ["/api/derm/patients"] });
      if (done) setMsg({ t: done, tone: "ok" });
      return true;
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); return false; }
    finally { setBusy(false); }
  };
  const saveFiche = async () => { if (await save(f, "Fiche enregistrée.")) { setEdit(false); setF({}); } };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((cur) => ({ ...cur, [k]: e.target.value }));

  if (error) return <DermShell active="patients"><Page><Notice tone="err">Fiche introuvable.</Notice><Btn kind="link" onClick={() => go("/derm/patients")}>← Tous les patients</Btn></Page></DermShell>;
  if (!p || !data) return <DermShell active="patients"><Page><span style={{ fontSize: 12, color: D.muted }}>Chargement de la fiche…</span></Page></DermShell>;

  const code = patientCode(p.id);
  const birth = p.birthDate ? `${fr(p.birthDate, { day: "numeric", month: "long", year: "numeric" })}${p.age ? ` · ${p.age} ans` : ""}` : p.age ? `${p.age} ans` : "À renseigner";
  const cabCity = data.cabinet.city ? `${data.cabinet.city} · Cameroun` : "Non renseigné";
  const strip: [string, string][] = [["IDENTIFIANT UNIQUE", code], ["FICHE CRÉÉE LE", fr(p.createdAt, { day: "numeric", month: "long", year: "numeric" })], ["CABINET", cabCity], ["STATUT ADMINISTRATIF", p.archived ? "Fiche archivée" : "Fiche active"]];
  const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };
  const h = (t: string, s?: string) => <div className="flex flex-wrap items-baseline justify-between" style={{ gap: 8 }}><b style={{ fontSize: 14, fontWeight: 600 }}>{t}</b>{s && <span style={{ fontSize: 10, color: D.muted }}>{s}</span>}</div>;

  return (
    <DermShell active="patients">
      <Page>
        <ScreenHeader kicker="PATIENTS · FICHE ADMINISTRATIVE" title={`Patient ${code}`}
          sub="Identité et coordonnées uniquement. Les informations cliniques sont dans le dossier médical."
          actions={<>
            <Btn kind="link" onClick={() => go("/derm/patients")}>← Tous les patients</Btn>
            <Btn kind="secondary" onClick={() => (edit ? null : startEdit())} disabled={edit} data-testid="fiche-edit">{edit ? "Modification en cours…" : "Modifier la fiche"}</Btn>
            {isDoctor && <Btn kind="primary" onClick={() => go(`/derm/dossiers/${p.id}`)} data-testid="fiche-to-dossier">Ouvrir le dossier médical →</Btn>}
          </>} />
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, marginBottom: 16 }}>
          {strip.map(([l, v], i) => (
            <div key={l} className="flex flex-col" style={{ gap: 6, padding: "16px 20px", borderLeft: i ? `1px solid ${D.border}` : 0 }}>
              <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: .8, color: D.muted }}>{l}</span>
              <b style={{ fontSize: 13, fontWeight: 600 }}>{v}</b>
              {i === 3 && (
                <Btn kind="link" onClick={() => { if (p.archived || window.confirm("Archiver cette fiche ? Elle restera consultable dans l'onglet Archivées.")) save({ archived: !p.archived }, p.archived ? "Fiche réactivée." : "Fiche archivée."); }} style={{ alignSelf: "flex-start", fontSize: 10 }} data-testid="fiche-archive">
                  {p.archived ? "Réactiver la fiche" : "Archiver la fiche"}
                </Btn>
              )}
            </div>
          ))}
        </section>

        <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(280px,1fr)", gap: 16 }}>
          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card style={box}>
              {h("Identité")}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                <Field label="Nom" value={p.lastName} edit={edit}><Input value={f.lastName || ""} onChange={set("lastName")} /></Field>
                <Field label="Prénom" value={p.firstName} edit={edit}><Input value={f.firstName || ""} onChange={set("firstName")} /></Field>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
                <Field label="Date de naissance" value={birth} edit={edit}><Input type="date" value={f.birthDate || ""} onChange={set("birthDate")} /></Field>
                <Field label="Âge" value={p.age ? `${p.age} ans` : "Non renseigné"} edit={edit}><Input inputMode="numeric" value={f.age || ""} onChange={(e) => setF((c) => ({ ...c, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))} /></Field>
                <Field label="Sexe" value={sexLabel(p.sex)} edit={edit}>
                  <span className="flex" style={{ gap: 6 }}><Chip on={f.sex === "F"} onClick={() => setF((c) => ({ ...c, sex: "F" }))}>Femme</Chip><Chip on={f.sex === "M"} onClick={() => setF((c) => ({ ...c, sex: "M" }))}>Homme</Chip></span>
                </Field>
              </div>
            </Card>
            <Card style={box}>
              {h("Coordonnées")}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                <Field label="Téléphone" value={phoneFmt(p.phone)} edit={edit}><Input inputMode="tel" value={f.phone || ""} onChange={set("phone")} /></Field>
                <Field label="Adresse e-mail" value={p.email || "Non renseignée"} edit={edit}><Input type="email" value={f.email || ""} onChange={set("email")} /></Field>
              </div>
              <Field label="Lieu de résidence" value={p.city || "Non renseigné"} edit={edit}><Input value={f.city || ""} onChange={set("city")} placeholder="Ville, quartier" /></Field>
            </Card>
            <Card style={box}>
              {h("Contact d'urgence & représentation")}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                <Field label="Personne à contacter" value={p.emergencyName || "Non renseignée"} edit={edit}><Input value={f.emergencyName || ""} onChange={set("emergencyName")} /></Field>
                <Field label="Téléphone du contact" value={p.emergencyPhone || "Non renseigné"} edit={edit}><Input inputMode="tel" value={f.emergencyPhone || ""} onChange={set("emergencyPhone")} /></Field>
              </div>
              <Field label="Représentant légal" value={p.legalRep || "À renseigner si nécessaire, selon la situation du patient."} edit={edit}><Input value={f.legalRep || ""} onChange={set("legalRep")} /></Field>
              {!edit && <Btn kind="link" onClick={startEdit} style={{ alignSelf: "flex-start" }}>+ Ajouter un contact</Btn>}
              {edit && (
                <div className="flex justify-end" style={{ gap: 10 }}>
                  <Btn kind="secondary" onClick={() => { setEdit(false); setF({}); }}>Annuler</Btn>
                  <Btn kind="primary" disabled={busy || !String(f.lastName || "").trim() || !String(f.firstName || "").trim()} onClick={saveFiche} data-testid="fiche-save">Enregistrer la fiche</Btn>
                </div>
              )}
            </Card>
          </div>

          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card style={{ ...box, gap: 6 }}>
              <b style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Rattachement au cabinet</b>
              <b style={{ fontSize: 12.5, fontWeight: 600 }}>Dr. {String(data.cabinet.doctor || "").replace(/^dr\.?\s+/i, "")}</b>
              <span style={{ fontSize: 11, color: D.muted }}>Médecin référent · Dermatologue</span>
              <span style={{ fontSize: 11, color: D.muted }}>{[data.cabinet.cabinetName || "Cabinet dermatologique", data.cabinet.city].filter(Boolean).join(" · ")}</span>
            </Card>
            <Card style={{ ...box, gap: 10 }}>
              <b style={{ fontSize: 14, fontWeight: 600 }}>Préférences de contact</b>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {p.contactChannels.length ? p.contactChannels.map((c) => <span key={c} style={{ padding: "4px 10px", borderRadius: 999, background: D.tintChip, color: D.actionDark, fontSize: 10.5, fontWeight: 600 }}>Rappels {c} autorisés</span>)
                  : <span style={{ padding: "4px 10px", borderRadius: 999, background: "#f0f1ee", color: D.muted, fontSize: 10.5 }}>Aucun canal autorisé</span>}
              </div>
              <Label text="Usage autorisé"><span style={{ fontSize: 12, color: D.text }}>{p.contactUsage}</span></Label>
              <span style={{ fontSize: 10, color: D.muted }}>Les rappels ne doivent contenir aucun détail médical.</span>
              {pref && (
                <div className="flex flex-col" style={{ gap: 10, padding: 12, borderRadius: 8, background: "#f3f7f1" }}>
                  <div className="flex flex-wrap" style={{ gap: 6 }}>
                    {CHANNELS.map((c) => {
                      const on = p.contactChannels.includes(c);
                      return <Chip key={c} on={on} onClick={() => save({ contactChannels: on ? p.contactChannels.filter((x) => x !== c) : [...p.contactChannels, c] })}>{on ? "✓ " : ""}{c}</Chip>;
                    })}
                  </div>
                  <Select value={p.contactUsage} onChange={(e) => save({ contactUsage: e.target.value })} style={{ width: "100%" }}>
                    {USAGES.map((u) => <option key={u}>{u}</option>)}
                  </Select>
                </div>
              )}
              <Btn kind="secondary" onClick={() => setPref(!pref)} data-testid="fiche-pref">{pref ? "Terminé" : "Mettre à jour les préférences"}</Btn>
            </Card>
            {isDoctor && (
              <Card style={{ ...box, gap: 8, background: D.tint3, border: 0 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>L'histoire médicale a son espace.</b>
                <span style={{ fontSize: 11, color: D.muted }}>Consultations, antécédents, prescriptions et examens sont regroupés dans le dossier médical longitudinal.</span>
                <span style={{ fontSize: 11, color: D.muted }}>Une seule identité patient, sans duplication des informations.</span>
                <Btn kind="link" onClick={() => go(`/derm/dossiers/${p.id}`)} style={{ alignSelf: "flex-start", marginTop: 4 }}>Accéder au dossier médical →</Btn>
              </Card>
            )}
          </div>
        </section>
      </Page>
    </DermShell>
  );
}
