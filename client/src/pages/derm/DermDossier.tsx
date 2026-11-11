import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, Card, Btn, Input, Textarea, Tabs, Tag, Notice, fr, profil, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Dossier médical · vue longitudinale (handoff §3.4). 7 onglets : vue
// clinique, consultations, antécédents, prescriptions, examens, photos,
// documents. Les analyses Glow restent indicatives ; l'ancienne page
// d'analyse détaillée reste accessible jusqu'à la Nouvelle consultation (D3).
// ════════════════════════════════════════════════════════════════════════

type Cons = { reportId: number; ref: string; date: string; source: string; title: string; summary: string; detail: { motif: string; obs: string; conclusion: string; conduite: string; suivi: string }; signed: boolean; sent: boolean; format: string };
type Rec = {
  patient: { id: number; firstName: string; lastName: string; age: number | null; sex: string | null; allergies: string | null; allergiesAt: string | null; photoConsentAt: string | null; createdAt: string };
  dx: string | null; synthesis: { conclusion: string; date: string; suivi: string } | null; nextControl: string | null; firstAt: string;
  consultations: Cons[];
  analyses: { id: number; date: string; photo: string | null; score: number | null; condition: string | null; note: string | null }[];
  notes: { ant: { id: number; date: string; body: string }[]; ex: { id: number; date: string; body: string }[] };
  prescriptions: { label: string; date: string; value: string; reportId: number | null }[];
  documents: ({ kind: "report"; id: number; name: string; date: string; signed: boolean; format: string } | { kind: "file"; id: number; name: string; date: string; mime: string; size: number })[];
};
type TabK = "vue" | "cons" | "ant" | "rx" | "ex" | "photo" | "docs";
const pad = (n: number) => String(n).padStart(2, "0");
const reportUrl = (id: number, format: string) => `/api/reports/${id}/view?v=${format === "a4" ? "a4" : "cabinet"}`;

function AddNote({ label, ph, onSave }: { label: string; ph: string; onSave: (t: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <Btn kind="link" onClick={() => setOpen(true)} style={{ alignSelf: "flex-start" }}>{label}</Btn>;
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <Textarea value={t} onChange={(e) => setT(e.target.value)} placeholder={ph} autoFocus />
      <div className="flex justify-end" style={{ gap: 8 }}>
        <Btn kind="secondary" onClick={() => { setOpen(false); setT(""); }} style={{ height: 32 }}>Annuler</Btn>
        <Btn kind="primary" disabled={!t.trim() || busy} style={{ height: 32 }} onClick={async () => { setBusy(true); await onSave(t.trim()); setBusy(false); setOpen(false); setT(""); }}>Ajouter au dossier</Btn>
      </div>
    </div>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return <span className="flex flex-col" style={{ gap: 2, padding: "8px 0", borderTop: `1px solid ${D.sep}` }}><span style={{ fontSize: 9, color: D.muted }}>{l}</span><span style={{ fontSize: 11.5, whiteSpace: "pre-wrap" }}>{v}</span></span>;
}

export default function DermDossier() {
  const [, params] = useRoute("/derm/dossiers/:id");
  const id = Number(params?.id);
  const [, go] = useLocation();
  const qc = useQueryClient();
  const key = `/api/derm/records/${id}`;
  const { data: acc } = useProAccount();
  const isSecretary = acc?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) go(`/derm/patients/${id}`); }, [isSecretary, id, go]);
  const { data, error } = useQuery<Rec>({ queryKey: [key], enabled: !!id && !!acc && !isSecretary });
  const [tab, setTab] = useState<TabK>(() => { try { return (new URLSearchParams(window.location.search).get("onglet") as TabK) || "vue"; } catch { return "vue"; } });
  const [openC, setOpenC] = useState<Record<number, boolean>>({});
  const [alEdit, setAlEdit] = useState(false);
  const [al, setAl] = useState("");
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: [key] }); qc.invalidateQueries({ queryKey: ["/api/derm/records"] }); };
  const patch = async (b: unknown) => { try { await api(key, "PATCH", b); refresh(); } catch (e: any) { setMsg({ t: e.message, tone: "err" }); } };
  const addNote = (kind: "ant" | "rx" | "ex") => async (body: string) => { try { await api(`${key}/notes`, "POST", { kind, body }); refresh(); } catch (e: any) { setMsg({ t: e.message, tone: "err" }); } };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setMsg({ t: "Fichier trop lourd (5 Mo au plus).", tone: "err" }); return; }
    const r = new FileReader();
    r.onload = async () => {
      try { await api(`${key}/documents`, "POST", { name: f.name, data: String(r.result) }); setMsg({ t: `${f.name} ajouté au dossier.`, tone: "ok" }); refresh(); }
      catch (err: any) { setMsg({ t: err.message, tone: "err" }); }
    };
    r.readAsDataURL(f);
  };

  if (error) return <DermShell active="dossiers"><Page><Notice tone="err">Dossier introuvable.</Notice><Btn kind="link" onClick={() => go("/derm/dossiers")}>← Tous les dossiers</Btn></Page></DermShell>;
  if (!data) return <DermShell active="dossiers"><Page><span style={{ fontSize: 12, color: D.muted }}>Chargement du dossier…</span></Page></DermShell>;

  const p = data.patient;
  const code = patientCode(p.id);
  const ofP = p.sex === "M" ? "du patient" : p.sex === "F" ? "de la patiente" : "du patient";
  const dr = `Dr. ${String((acc?.account as any)?.fullName || "").replace(/^dr\.?\s+/i, "")}`;
  const show = { allergy: tab === "vue" || tab === "ant", synth: tab === "vue", cons: tab === "vue" || tab === "cons", docs: tab === "vue" || tab === "docs", ant: tab === "vue" || tab === "ant", rx: tab === "vue" || tab === "rx", ex: tab === "vue" || tab === "ex", photo: tab === "vue" || tab === "photo" };
  const visits = data.consultations.length;
  const strip: { l: string; v: string; cta?: string; go?: () => void }[] = [
    { l: "PATIENT", v: profil(p.age, p.sex), cta: "Fiche administrative →", go: () => go(`/derm/patients/${p.id}`) },
    { l: "CONSULTATIONS", v: `${pad(visits)} depuis le ${fr(data.firstAt, { day: "numeric", month: "long", year: "numeric" })}` },
    { l: "DOCUMENTS CLINIQUES", v: `${pad(data.documents.length)} document${data.documents.length > 1 ? "s" : ""}` },
    { l: "PROCHAIN CONTRÔLE", v: data.nextControl ? fr(data.nextControl, { day: "numeric", month: "long", year: "numeric" }) : "Aucun contrôle programmé",
      cta: data.nextControl ? "Ouvrir l'agenda →" : "Programmer un contrôle →", go: () => go("/derm/agenda") },
  ];
  const consShown = tab === "vue" ? data.consultations.slice(0, 2) : data.consultations;
  const docsShown = tab === "vue" ? data.documents.slice(0, 3) : data.documents;
  const h = (t: string, right?: React.ReactNode) => <div className="flex flex-wrap items-center justify-between" style={{ gap: 8, marginBottom: 6 }}><b style={{ fontSize: 14, fontWeight: 600 }}>{t}</b>{right}</div>;

  return (
    <DermShell active="dossiers">
      <Page>
        <ScreenHeader kicker="DOSSIERS MÉDICAUX · VUE LONGITUDINALE" title={`Dossier médical · ${code}`}
          sub={`Toutes les informations cliniques ${ofP}, au fil de ses consultations. ${p.lastName} ${p.firstName}.`}
          actions={<>
            <Btn kind="link" onClick={() => go("/derm/dossiers")}>← Tous les dossiers</Btn>
            <Btn kind="secondary" onClick={() => window.open(`${key}/export`, "_blank", "noopener")} data-testid="dossier-export">Exporter le dossier ↓</Btn>
            <Btn kind="primary" onClick={() => go(`/derm/dossiers/${p.id}/compte-rendu`)} data-testid="dossier-new">Nouvelle consultation +</Btn>
          </>} />
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, marginBottom: 16 }}>
          {strip.map((s, i) => (
            <div key={s.l} className="flex flex-col" style={{ gap: 6, padding: "16px 20px", borderLeft: i ? `1px solid ${D.border}` : 0 }}>
              <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: .8, color: D.muted }}>{s.l}</span>
              <b style={{ fontSize: 13, fontWeight: 600 }}>{s.v}</b>
              {s.cta && <Btn kind="link" onClick={s.go} style={{ alignSelf: "flex-start", fontSize: 10 }}>{s.cta}</Btn>}
            </div>
          ))}
        </section>

        <div style={{ marginBottom: 16 }}>
          <Tabs value={tab} onChange={setTab} items={[["vue", "Vue clinique"], ["cons", `Consultations · ${visits}`], ["ant", "Antécédents"], ["rx", "Prescriptions"], ["ex", "Examens"], ["photo", "Photos cliniques"], ["docs", `Documents · ${data.documents.length}`]]} />
        </div>

        {show.allergy && (
          <div className="flex flex-wrap items-center justify-between" data-testid="allergy"
            style={{ gap: 12, padding: "13px 16px", borderRadius: 10, marginBottom: 16, background: p.allergies ? D.tintChip : "#fbf5e6", color: p.allergies ? D.action : "#9a6a14" }}>
            <span className="flex min-w-0 flex-col" style={{ gap: 3 }}>
              <b style={{ fontSize: 10, letterSpacing: .6 }}>{p.allergies ? "ALLERGIES" : "ALLERGIES À VÉRIFIER"}</b>
              <span style={{ fontSize: 11.5, color: D.text }}>{p.allergies ? `${p.allergies} · renseigné le ${fr(p.allergiesAt, { day: "numeric", month: "short", year: "numeric" })}` : `Statut allergique non renseigné. À vérifier auprès ${ofP} avant toute prescription.`}</span>
            </span>
            {alEdit ? (
              <span className="flex" style={{ gap: 8 }}>
                <Input value={al} onChange={(e) => setAl(e.target.value)} placeholder="Ex. aucune allergie connue, pénicilline…" style={{ width: 260 }} autoFocus />
                <Btn kind="primary" disabled={!al.trim()} onClick={async () => { await patch({ allergies: al }); setAlEdit(false); }} style={{ height: 36 }}>Enregistrer</Btn>
              </span>
            ) : <Btn kind="link" onClick={() => { setAl(p.allergies || ""); setAlEdit(true); }} data-testid="allergy-edit">{p.allergies ? "Modifier" : "Renseigner →"}</Btn>}
          </div>
        )}

        <section className="grid items-start" style={{ gridTemplateColumns: tab === "vue" ? "minmax(0,1.45fr) minmax(280px,1fr)" : "minmax(0,1fr)", gap: 16 }}>
          {(show.synth || show.cons || show.docs) && (
            <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
              {show.synth && (
                <Card>
                  {h("Synthèse dermatologique", <span style={{ fontSize: 11, color: D.muted }}>{data.dx || "Diagnostic non documenté"}</span>)}
                  {data.synthesis ? (
                    <>
                      <p style={{ margin: "4px 0", fontSize: 12 }}>Conclusion signée le {fr(data.synthesis.date, { day: "numeric", month: "long" })} : {data.synthesis.conclusion || "non renseignée"}</p>
                      <p style={{ margin: 0, fontSize: 11.5, color: D.muted }}>{data.synthesis.suivi || "Pas de suivi programmé."}</p>
                    </>
                  ) : <p style={{ margin: "4px 0 0", fontSize: 11.5, color: D.muted }}>Aucun compte rendu signé pour l'instant. La synthèse reprendra la conclusion et le suivi du dernier compte rendu validé.</p>}
                </Card>
              )}
              {show.cons && (
                <Card>
                  {h("Consultations", tab === "vue" && visits > 2 ? <Btn kind="link" onClick={() => setTab("cons")}>Tout l'historique →</Btn> : undefined)}
                  {consShown.map((c, i) => (
                    <div key={c.reportId} className="grid" style={{ gridTemplateColumns: "56px minmax(0,1fr) auto", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${D.sep}` : 0 }} data-testid={`cons-${c.reportId}`}>
                      <span className="flex flex-col"><b style={{ fontSize: 12, fontWeight: 700 }}>{fr(c.date, { day: "2-digit", month: "short" }).toUpperCase().replace(".", "")}</b><span style={{ fontSize: 9.5, color: D.muted }}>{new Date(c.date).getFullYear()}</span></span>
                      <span className="flex min-w-0 flex-col" style={{ gap: 3 }}>
                        <b style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</b>
                        {c.summary && <span style={{ fontSize: 11.5 }}>{c.summary}</span>}
                        <span style={{ fontSize: 10, color: D.muted }}>{dr} · {c.signed ? `Compte rendu signé${c.sent ? " · remis au patient" : ""}` : "Compte rendu en brouillon"}</span>
                        {openC[c.reportId] && (
                          <span style={{ marginTop: 6, padding: 10, borderRadius: 8, background: "#f8faf7", fontSize: 11, whiteSpace: "pre-wrap" }}>
                            {[["Motif", c.detail.motif], ["Observations", c.detail.obs], ["Conclusion", c.detail.conclusion], ["Conduite à tenir", c.detail.conduite], ["Suivi", c.detail.suivi]].filter(([, v]) => v).map(([l, v]) => `${l} : ${v}`).join("\n") || "Aucun élément saisi."}
                          </span>
                        )}
                        {!c.signed && c.source === "visit" && (
                          <span className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 4 }}>
                            <Tag tone="draft">Compte rendu en brouillon</Tag>
                            <Btn kind="link" onClick={() => go(`/derm/dossiers/${p.id}/compte-rendu`)}>Relire et valider</Btn>
                          </span>
                        )}
                        {c.signed && <Btn kind="link" onClick={() => window.open(reportUrl(c.reportId, c.format), "_blank", "noopener")} style={{ alignSelf: "flex-start", marginTop: 2 }}>Ouvrir le document</Btn>}
                      </span>
                      <Btn kind="link" onClick={() => setOpenC((o) => ({ ...o, [c.reportId]: !o[c.reportId] }))}>{openC[c.reportId] ? "Fermer" : "Lire →"}</Btn>
                    </div>
                  ))}
                  {!visits && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: D.muted }}>Aucune consultation documentée. « Nouvelle consultation + » ouvre le compte rendu.</p>}
                  {(tab === "cons" || tab === "vue") && data.analyses.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${D.sep}` }}>
                      <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Analyses Glow · {data.analyses.length} <span style={{ fontWeight: 400, color: D.muted }}>(indicatives)</span></span>
                        <Btn kind="link" onClick={() => go(`/derm/patient/${p.id}`)} data-testid="analyses-legacy">Analyses Glow détaillées →</Btn>
                      </div>
                      {(tab === "cons" ? data.analyses : data.analyses.slice(0, 2)).map((a) => (
                        <span key={a.id} className="flex justify-between" style={{ gap: 10, padding: "6px 0", fontSize: 11 }}>
                          <span>{fr(a.date)} · {a.condition || "Analyse"}{a.note ? ` · ${a.note.slice(0, 80)}` : ""}</span>
                          {a.score != null && <span style={{ color: D.muted }}>Score {a.score}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              {show.docs && (
                <Card>
                  {h("Documents du dossier", <><Btn kind="link" onClick={() => fileRef.current?.click()} data-testid="doc-add">+ Ajouter un document</Btn><input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} /></>)}
                  {docsShown.map((d, i) => (
                    <div key={`${d.kind}-${d.id}`} className="flex items-center justify-between" style={{ gap: 12, padding: "11px 0", borderTop: i ? `1px solid ${D.sep}` : 0 }}>
                      <span className="flex min-w-0 items-center" style={{ gap: 10 }}>
                        <span style={{ flex: "none", padding: "4px 6px", borderRadius: 3, background: "#f0f1ee", fontSize: 8.5, fontWeight: 700, color: D.muted }}>{d.kind === "report" ? "A4" : (d.name.split(".").pop() || "DOC").slice(0, 4).toUpperCase()}</span>
                        <span className="flex min-w-0 flex-col"><b className="truncate" style={{ fontSize: 11.5, fontWeight: 600 }}>{d.name}</b>
                          <span style={{ fontSize: 10, color: D.muted }}>{fr(d.date)} · {d.kind === "report" ? (d.signed ? "Document signé" : "Brouillon · non transmissible") : "Ajouté au dossier"}</span></span>
                      </span>
                      <Btn kind="link" onClick={() => window.open(d.kind === "report" ? reportUrl(d.id, d.format) : `${key}/documents/${d.id}`, "_blank", "noopener")}>Ouvrir →</Btn>
                    </div>
                  ))}
                  {!data.documents.length && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: D.muted }}>Aucun document. Les comptes rendus signés et les fichiers ajoutés apparaîtront ici.</p>}
                  {tab === "vue" && data.documents.length > 3 && <Btn kind="link" onClick={() => setTab("docs")} style={{ marginTop: 6 }}>Tous les documents →</Btn>}
                </Card>
              )}
            </div>
          )}

          {(show.ant || show.rx || show.ex || show.photo) && (
            <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
              {show.ant && (
                <Card className="flex flex-col" style={{ gap: 4 }}>
                  {h("Antécédents & traitements habituels")}
                  {data.notes.ant.length ? data.notes.ant.map((n) => <Line key={n.id} l={`Renseigné · ${fr(n.date)}`} v={n.body} />)
                    : <><Line l="Personnels et familiaux" v="Non renseignés" /><Line l="Traitements habituels" v="Non renseignés" /></>}
                  <AddNote label="Compléter avec le patient →" ph="Antécédents personnels, familiaux, traitements en cours…" onSave={addNote("ant")} />
                </Card>
              )}
              {show.rx && (
                <Card className="flex flex-col" style={{ gap: 4 }}>
                  {h("Prescriptions")}
                  {data.prescriptions.length ? data.prescriptions.map((x, i) => <Line key={i} l={`${x.label} · ${fr(x.date)}`} v={x.value} />)
                    : <span style={{ fontSize: 11.5, color: D.muted, padding: "6px 0" }}>Aucune ordonnance jointe au dossier.</span>}
                  <AddNote label="Ajouter une ordonnance +" ph="Médicament, posologie, durée…" onSave={addNote("rx")} />
                </Card>
              )}
              {show.ex && (
                <Card className="flex flex-col" style={{ gap: 4 }}>
                  {h("Examens & résultats")}
                  {data.notes.ex.length ? data.notes.ex.map((n) => <Line key={n.id} l={`Résultat · ${fr(n.date)}`} v={n.body} />)
                    : <span style={{ fontSize: 11.5, color: D.muted, padding: "6px 0" }}>Aucun résultat joint au dossier.</span>}
                  <AddNote label="Ajouter un résultat +" ph="Examen, date, résultat…" onSave={addNote("ex")} />
                </Card>
              )}
              {show.photo && (
                <Card className="flex flex-col" style={{ gap: 10 }}>
                  {h("Photographies cliniques")}
                  <span style={{ fontSize: 11.5, color: D.muted }}>{p.photoConsentAt ? `Consentement documenté le ${fr(p.photoConsentAt, { day: "numeric", month: "short", year: "numeric" })} · Prise de vue et usage au sein du cabinet uniquement.` : "Consentement non documenté. À recueillir avant toute prise de vue ou utilisation."}</span>
                  <Btn kind={p.photoConsentAt ? "secondary" : "primary"} onClick={() => patch({ photoConsent: !p.photoConsentAt })} data-testid="photo-consent"
                    style={p.photoConsentAt ? { background: D.tintChip, color: D.action, borderColor: "#9dc3a9" } : undefined}>
                    {p.photoConsentAt ? "Consentement documenté ✓" : "Documenter le consentement"}
                  </Btn>
                  {tab === "photo" && (
                    data.analyses.filter((a) => a.photo).length ? (
                      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                        {data.analyses.filter((a) => a.photo).map((a) => (
                          <a key={a.id} href={a.photo!} target="_blank" rel="noopener noreferrer" className="flex flex-col no-underline" style={{ gap: 4, color: D.text }}>
                            <img src={a.photo!} alt={`Photo du ${fr(a.date)}`} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8, background: "#f0f1ee" }} />
                            <span style={{ fontSize: 10, color: D.muted }}>{fr(a.date)}{a.condition ? ` · ${a.condition}` : ""}</span>
                          </a>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 11.5, color: D.muted }}>Aucune photo dans le dossier.</span>
                  )}
                  {tab === "vue" && data.analyses.some((a) => a.photo) && <Btn kind="link" onClick={() => setTab("photo")} style={{ alignSelf: "flex-start" }}>Voir les {data.analyses.filter((a) => a.photo).length} photo{data.analyses.filter((a) => a.photo).length > 1 ? "s" : ""} →</Btn>}
                </Card>
              )}
            </div>
          )}
        </section>
      </Page>
    </DermShell>
  );
}
