import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, StatCard, Card, Btn, Select, Tag, fr } from "@/components/derm/ui";

// ════════════════════════════════════════════════════════════════════════
// Votre activité · pilotage du cabinet (handoff §3.7). Chiffres réels du mois
// choisi : patients, consultations (cabinet et en ligne), cas à revoir,
// auto-évaluations, courbe hebdomadaire, pathologies, patients à suivre.
// ════════════════════════════════════════════════════════════════════════

type Act = {
  month: string; patients: number; prevPatients: number; newPatients: number; consultations: number; prevConsultations: number; suiviVisits: number; online: number;
  weeks: { start: string; label: string; patients: number }[]; pathologies: { name: string; count: number }[];
  toReview: number; toComplete: number; followupsTotal: number; toFollow: { id: number; dx: string | null; lastVisit: string | null; due: string; suivi: string; retour: string }[];
  reviews: { total: number; done: number }; months: string[]; currentWeek: string;
};
export const PATHO_COLORS: Record<string, string> = { "Acné": "#16b8ae", "Troubles pigmentaires": "#d7ad5a", "Eczéma": "#ed836f", "Psoriasis": "#52a9ff", "Autres": "#c4d3cf" };
const pad = (n: number) => String(n).padStart(2, "0");
const monthLabel = (m: string) => { const [y, mo] = m.split("-").map(Number); const s = new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }); return s.charAt(0).toUpperCase() + s.slice(1); };
const prevName = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 2, 1)).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" }); };
const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)} %` : a ? "Nouveau" : "—");

function LineChart({ weeks }: { weeks: Act["weeks"] }) {
  const W = 640, H = 170, P = { l: 30, r: 34, t: 18, b: 26 };
  const max = Math.max(10, ...weeks.map((w) => w.patients));
  const top = Math.ceil(max / 10) * 10;
  const x = (i: number) => P.l + (weeks.length > 1 ? (i * (W - P.l - P.r)) / (weeks.length - 1) : (W - P.l - P.r) / 2);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / top);
  const avg = weeks.length ? weeks.reduce((s, w) => s + w.patients, 0) / weeks.length : 0;
  const path = weeks.map((w, i) => `${i ? "L" : "M"}${x(i)},${y(w.patients)}`).join(" ");
  const area = weeks.length ? `${path} L${x(weeks.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Patients par semaine">
      <defs><linearGradient id="actfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f5c48" stopOpacity=".14" /><stop offset="100%" stopColor="#1f5c48" stopOpacity="0" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((f) => <g key={f}><line x1={P.l} x2={W - P.r} y1={y(top * f)} y2={y(top * f)} stroke="#eef1ec" /><text x={P.l - 8} y={y(top * f) + 3} textAnchor="end" fontSize="9" fill="#8a9894">{Math.round(top * f)}</text></g>)}
      {avg > 0 && <line x1={P.l} x2={W - P.r} y1={y(avg)} y2={y(avg)} stroke="#9dc3a9" strokeDasharray="5 4" />}
      {area && <path d={area} fill="url(#actfill)" />}
      {path && <path d={path} fill="none" stroke="#1f5c48" strokeWidth="2" />}
      {weeks.map((w, i) => (
        <g key={w.start}>
          <circle cx={x(i)} cy={y(w.patients)} r="4" fill="#fff" stroke="#1f5c48" strokeWidth="2" />
          <text x={x(i)} y={y(w.patients) - 9} textAnchor="middle" fontSize="11" fontWeight="600" fill="#17392c">{w.patients}</text>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#66766f">{w.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ items, total }: { items: Act["pathologies"]; total: number }) {
  const R = 50, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" style={{ width: 150, height: 150, flex: "none" }} role="img" aria-label="Répartition par pathologie">
      <circle cx="70" cy="70" r={R} fill="none" stroke="#eef1ec" strokeWidth="18" />
      {total > 0 && items.filter((p) => p.count).map((p) => {
        const len = (p.count / total) * C;
        const el = <circle key={p.name} cx="70" cy="70" r={R} fill="none" stroke={PATHO_COLORS[p.name]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
        acc += len; return el;
      })}
      <text x="70" y="70" textAnchor="middle" fontSize="24" fontWeight="600" fill="#17392c">{total}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="8.5" fill="#66766f">consultations</text>
    </svg>
  );
}

export default function DermActivite() {
  const [, go] = useLocation();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [exp, setExp] = useState(false);
  const { data: a, isError, refetch } = useQuery<Act>({ queryKey: [`/api/derm/activity?month=${month}`], retry: 1 });
  const months = a?.months || [month];
  const documented = a ? a.pathologies.filter((p) => p.count).length : 0;
  const avg = a && a.weeks.length ? Math.round(a.weeks.reduce((s, w) => s + w.patients, 0) / a.weeks.length) : 0;

  return (
    <DermShell active="activite">
      <Page>
        <ScreenHeader kicker="PILOTAGE DU CABINET" title="Votre activité, en un regard." sub="Retrouvez vos patients et faites progresser votre pratique."
          actions={<>
            <Select value={month} onChange={(e) => setMonth(e.target.value)} style={{ height: 40, minWidth: 170 }} data-testid="act-month">{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select>
            <span className="relative">
              <Btn kind="primary" onClick={() => setExp(!exp)} style={{ height: 40 }} data-testid="act-export">Exporter le bilan ↓</Btn>
              {exp && (
                <span className="absolute right-0 z-10 flex flex-col" style={{ top: 44, minWidth: 200, padding: 6, background: "#fff", border: `1px solid ${D.border}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(13,41,41,.1)" }}>
                  <a href={`/api/derm/activity/export?month=${month}`} onClick={() => setExp(false)} style={{ padding: "8px 10px", fontSize: 12, color: D.text, textDecoration: "none" }}>Fichier CSV (anonymisé)</a>
                  <button type="button" onClick={() => { setExp(false); setTimeout(() => window.print(), 100); }} className="cursor-pointer text-left" style={{ padding: "8px 10px", border: 0, background: "none", fontSize: 12, color: D.text }}>Imprimer · PDF</button>
                </span>
              )}
            </span>
          </>} />

        {isError ? (
          <Card style={{ padding: "26px 26px" }}>
            <b style={{ fontSize: 16, fontWeight: 600 }}>Votre activité n'a pas pu être chargée.</b>
            <p style={{ margin: "6px 0 14px", fontSize: 12.5, color: D.muted }}>Vérifiez votre connexion internet, puis réessayez.</p>
            <Btn kind="primary" onClick={() => refetch()}>Réessayer</Btn>
          </Card>
        ) : !a ? <span style={{ fontSize: 12, color: D.muted }}>Chargement de votre activité…</span> : (
          <>
            {a.consultations === 0 && a.patients === 0 && (
              <Card style={{ marginBottom: 18, background: D.tint3, border: 0, padding: "22px 24px" }} testid="act-empty">
                <b style={{ fontSize: 16, fontWeight: 600 }}>Pour l'instant, aucune activité en {monthLabel(a.month).toLowerCase()}.</b>
                <p style={{ margin: "6px 0 14px", fontSize: 12.5, color: D.muted }}>Vos chiffres apparaîtront ici dès votre première consultation ou votre premier rendez-vous.</p>
                <span className="flex flex-wrap" style={{ gap: 10 }}>
                  <Btn kind="primary" onClick={() => go("/derm/consultation")}>Démarrer une consultation →</Btn>
                  <Btn kind="secondary" onClick={() => go("/derm/patients")}>Ajouter mes patients</Btn>
                  <Btn kind="secondary" onClick={() => go("/derm/agenda")}>Planifier un rendez-vous</Btn>
                </span>
              </Card>
            )}
            <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 18 }}>
              <StatCard label="Patients suivis" value={a.patients} sub={<><span style={{ color: D.action, fontWeight: 600 }}>{delta(a.patients, a.prevPatients)} vs {prevName(a.month)}</span><br />{a.newPatients} nouveau{a.newPatients > 1 ? "x" : ""} patient{a.newPatients > 1 ? "s" : ""}</>} onClick={() => go("/derm/patients")} />
              <StatCard label="Consultations" value={a.consultations} sub={<><span style={{ color: D.action, fontWeight: 600 }}>{delta(a.consultations, a.prevConsultations)} vs {prevName(a.month)}</span><br />{a.suiviVisits} visite{a.suiviVisits > 1 ? "s" : ""} de suivi · {a.online} en ligne</>} onClick={() => go("/derm/dossiers")} />
              <StatCard label="Cas à revoir" value={pad(a.toReview)} sub={<><span style={{ color: D.warn, fontWeight: 600 }}>À suivre cette semaine</span><br />Dont {a.toComplete} retour{a.toComplete > 1 ? "s" : ""} à compléter</>} onClick={() => go("/derm/suivis")} />
              <StatCard tone="dark" label="Auto-évaluations" value={`${a.reviews.done} / ${a.reviews.total}`} sub={<><span style={{ color: "#cfe08a", fontWeight: 600 }}>{a.reviews.done < a.reviews.total ? `${a.reviews.total - a.reviews.done === 1 ? "Une semaine" : `${a.reviews.total - a.reviews.done} semaines`} à compléter` : "Toutes complétées ✓"}</span><br />Votre rendez-vous avec votre pratique</>} onClick={() => go("/derm/auto-evaluation?onglet=bilan")} />
            </section>

            <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(300px,1fr)", gap: 16, marginBottom: 16 }}>
              <Card>
                <div className="flex items-start justify-between" style={{ gap: 12 }}>
                  <span className="flex flex-col"><b style={{ fontSize: 17, fontWeight: 600 }}>Les patients de ce mois</b><span style={{ fontSize: 11, color: D.muted }}>Évolution hebdomadaire · {monthLabel(a.month)}</span></span>
                  <span><b style={{ fontSize: 30, fontWeight: 600 }}>{a.patients}</b> <span style={{ fontSize: 12, color: D.muted }}>patients</span></span>
                </div>
                <div className="flex flex-wrap justify-between" style={{ gap: 8, margin: "14px 0 6px", paddingTop: 12, borderTop: `1px solid ${D.sep}`, fontSize: 9.5, color: D.muted }}>
                  <span className="flex items-center" style={{ gap: 14 }}><span className="flex items-center" style={{ gap: 6 }}><span style={{ width: 16, height: 2, background: "#1f5c48" }} />Patients par semaine</span><span className="flex items-center" style={{ gap: 6 }}><span style={{ width: 16, borderTop: "2px dashed #9dc3a9" }} />Moyenne : {avg}</span></span>
                  <span>{a.newPatients} nouveaux · {Math.max(0, a.patients - a.newPatients)} déjà suivis</span>
                </div>
                <LineChart weeks={a.weeks} />
              </Card>
              <Card>
                <b style={{ fontSize: 17, fontWeight: 600 }}>Les cas pris en charge</b>
                <p style={{ margin: "2px 0 14px", fontSize: 11, color: D.muted, paddingBottom: 12, borderBottom: `1px solid ${D.sep}` }}>Répartition des {a.consultations} consultations</p>
                <div className="flex flex-wrap items-center" style={{ gap: 18 }}>
                  <Donut items={a.pathologies} total={a.consultations} />
                  <div className="flex flex-col" style={{ gap: 10 }}>
                    {a.pathologies.map((p) => (
                      <span key={p.name} className="flex flex-col"><span className="flex items-center" style={{ gap: 8, fontSize: 11.5 }}><span style={{ width: 9, height: 9, background: PATHO_COLORS[p.name] }} />{p.name}</span>
                        <span style={{ paddingLeft: 17, fontSize: 9.5, color: D.muted }}>{p.count} · {a.consultations ? Math.round((p.count / a.consultations) * 100) : 0} %</span></span>
                    ))}
                  </div>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 9.5, color: D.muted }}>{documented} motif{documented > 1 ? "s" : ""} de consultation documenté{documented > 1 ? "s" : ""}</p>
              </Card>
            </section>

            <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(300px,1fr)", gap: 16 }}>
              <Card>
                <div className="flex items-start justify-between" style={{ gap: 10 }}>
                  <span className="flex flex-col"><b style={{ fontSize: 17, fontWeight: 600 }}>Vos patients à suivre</b><span style={{ fontSize: 11, color: D.muted }}>Gardez une trace de chaque évolution clinique.</span></span>
                  <Btn kind="link" onClick={() => go("/derm/suivis")}>Voir les {a.followupsTotal} dossiers →</Btn>
                </div>
                <div style={{ marginTop: 14, borderRadius: 6, overflow: "hidden" }}>
                  <div className="grid" style={{ gridTemplateColumns: "1.1fr 1.4fr 1fr 1fr .9fr", gap: 10, padding: "10px 10px", background: "#f3f6f3", fontSize: 8.5, fontWeight: 600, letterSpacing: .7, color: D.muted }}>
                    <span>PATIENT</span><span>DERNIER CAS</span><span>CONSULTATION</span><span>SUIVI</span><span>RETOUR</span>
                  </div>
                  {a.toFollow.map((x) => (
                    <div key={x.id} role="button" tabIndex={0} onClick={() => go(`/derm/suivis/${x.id}`)} className="grid cursor-pointer items-center hover:bg-[#f8faf7]"
                      style={{ gridTemplateColumns: "1.1fr 1.4fr 1fr 1fr .9fr", gap: 10, padding: "12px 10px", borderBottom: `1px solid ${D.sep}`, fontSize: 11 }}>
                      <b style={{ fontWeight: 600 }}>Patient {patientCode(x.id)}</b>
                      <span className="truncate">{x.dx || "—"}</span>
                      <span>{fr(x.lastVisit)}</span>
                      <span><Tag tone={x.suivi === "À revoir" ? "warn" : "ok"}>{x.suivi}</Tag></span>
                      <span style={{ color: x.retour === "À compléter" ? D.warn : D.muted }}>{x.retour}</span>
                    </div>
                  ))}
                  {!a.toFollow.length && <p style={{ margin: 0, padding: "18px 10px", fontSize: 11.5, color: D.muted }}>Aucun patient en suivi. Un contrôle choisi dans un compte rendu l'ajoute ici.</p>}
                </div>
              </Card>
              <Card style={{ background: D.tint3, border: 0, padding: "24px 24px" }}>
                <span style={{ padding: "4px 8px", borderRadius: 3, background: D.tintChip, color: D.action, fontSize: 9, fontWeight: 700, letterSpacing: .5 }}>VOTRE BILAN HEBDOMADAIRE</span>
                <h2 style={{ margin: "16px 0 10px", font: "600 28px/1.15 'DM Sans',sans-serif", letterSpacing: -.5, color: D.text }}>Un moment pour prendre du recul.</h2>
                <b style={{ fontSize: 12.5, color: D.action, fontWeight: 600 }}>Semaine du {fr(a.currentWeek, { day: "numeric", month: "long" })}</b>
                <p style={{ margin: "10px 0 20px", fontSize: 11.5, color: D.muted, lineHeight: 1.6 }}>{a.patients} patients suivis ce mois, des cas à relire et vos pistes de progression à noter.</p>
                <Btn kind="primary" onClick={() => go("/derm/auto-evaluation?onglet=bilan")} style={{ width: "100%", height: 42 }} data-testid="act-to-bilan">Compléter mon auto-évaluation →</Btn>
                <p style={{ margin: "10px 0 0", fontSize: 9.5, color: D.muted }}>Environ 5 minutes · Réservé au médecin</p>
              </Card>
            </section>
            <div className="flex justify-between" style={{ marginTop: 24, fontSize: 9.5, color: D.muted }}><span>GlowScan Africa · L'activité clinique, mieux documentée.</span><span>Confidentiel · Espace professionnel</span></div>
          </>
        )}
      </Page>
    </DermShell>
  );
}
