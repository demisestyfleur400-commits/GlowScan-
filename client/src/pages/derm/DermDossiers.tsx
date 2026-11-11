import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, StatCard, Card, Btn, Input, Select, Tag, fr } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Dossiers médicaux · espace clinique (handoff §3.4). Réservé au médecin.
// ════════════════════════════════════════════════════════════════════════

type Item = { id: number; firstName: string; lastName: string; dx: string | null; lastAt: string | null; openedAt: string | null; report: "ok" | "draft" | "none"; visits: number; docs: number; month: boolean };
type Resp = { items: Item[]; stats: { consulted: number; consultationsMonth: number; drafts: number }; drafts: { reportId: number; patientId: number; createdAt: string }[]; lastOpened: Item | null; month: string };

const pad = (n: number) => String(n).padStart(2, "0");

export default function DermDossiers() {
  const [, go] = useLocation();
  const { data: acc } = useProAccount();
  const isSecretary = acc?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) go("/derm/patients"); }, [isSecretary, go]);
  const { data } = useQuery<Resp>({ queryKey: ["/api/derm/records"], enabled: !!acc && !isSecretary });
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "ok" | "draft">(() => { try { return new URLSearchParams(window.location.search).get("cr") === "draft" ? "draft" : "all"; } catch { return "all"; } });

  const items = data?.items || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term ? items : items.filter((x) => x.month);
    return base.filter((x) => (f === "all" || x.report === f) && (!term || `${patientCode(x.id)} ${x.firstName} ${x.lastName} ${x.dx || ""}`.toLowerCase().includes(term)));
  }, [items, q, f]);
  const st = data?.stats || { consulted: 0, consultationsMonth: 0, drafts: 0 };
  const drafts = data?.drafts || [];
  const last = data?.lastOpened || null;
  const month = data?.month ? data.month.charAt(0).toUpperCase() + data.month.slice(1) : "";
  const grid = "minmax(140px,1.6fr) minmax(110px,1.4fr) 84px 84px 52px";
  const th: React.CSSProperties = { color: D.muted, fontSize: 8.5, fontWeight: 600, letterSpacing: .8 };

  return (
    <DermShell active="dossiers">
      <Page>
        <ScreenHeader kicker="DOSSIERS MÉDICAUX · ESPACE CLINIQUE" title="La mémoire clinique du cabinet."
          sub="Un dossier par patient pour relier toutes ses consultations et ses épisodes de soins."
          actions={<><span style={{ fontSize: 12, color: D.muted }}>{month}</span><Btn kind="primary" onClick={() => go("/derm/accueil")} data-testid="dossiers-new">Nouvelle consultation +</Btn></>} />

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
          <StatCard label="Dossiers consultés" value={pad(st.consulted)} sub={`En ${data?.month || "ce mois"}`} onClick={() => setF("all")} />
          <StatCard label="Consultations du mois" value={pad(st.consultationsMonth)} sub="Premières visites et contrôles" onClick={() => setF("all")} />
          <StatCard tone={st.drafts ? "warn" : "light"} label="Comptes rendus à finaliser" value={pad(st.drafts)} sub={st.drafts ? "Brouillons du médecin" : "Tout est validé ✓"} onClick={() => setF("draft")} testid="stat-drafts" />
          <StatCard tone="dark" label="Dossier par patient" value="01" sub="Toute son histoire clinique" onClick={last ? () => go(`/derm/dossiers/${last.id}`) : undefined} />
        </section>

        <section className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,1fr)", gap: 16 }}>
          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card>
              <b style={{ fontSize: 17, fontWeight: 600 }}>Dossiers consultés ce mois</b>
              <div className="flex flex-wrap" style={{ gap: 10, margin: "14px 0 4px" }}>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient ou un cas documenté…" style={{ flex: 1, minWidth: 200, height: 34 }} data-testid="dossiers-q" />
                <Select value={f} onChange={(e) => setF(e.target.value as any)} style={{ height: 34 }}>
                  <option value="all">Compte rendu : tous</option><option value="ok">Validés</option><option value="draft">Brouillons</option>
                </Select>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: 460, overflowY: "auto" }}>
                <div style={{ minWidth: 500 }}>
                  <div className="grid" style={{ gridTemplateColumns: grid, gap: 12, padding: "12px 0 10px", borderBottom: `1px solid ${D.sep}`, ...th }}>
                    <span>PATIENT</span><span>DERNIER CAS DOCUMENTÉ</span><span>CONSULTATION</span><span>COMPTE RENDU</span><span>ACCÈS</span>
                  </div>
                  {rows.map((x) => (
                    <div key={x.id} role="button" tabIndex={0} onClick={() => go(`/derm/dossiers/${x.id}`)} onKeyDown={(e) => { if (e.key === "Enter") go(`/derm/dossiers/${x.id}`); }}
                      className="grid cursor-pointer items-center hover:bg-[#f8faf7]" data-testid={`dossier-row-${x.id}`}
                      style={{ gridTemplateColumns: grid, gap: 12, minHeight: 49, padding: "8px 0", borderBottom: `1px solid ${D.sep}`, fontSize: 11 }}>
                      <span className="flex min-w-0 flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>Patient {patientCode(x.id)}</b><span className="truncate" style={{ fontSize: 9.5, color: D.muted }}>{x.lastName} {x.firstName} · Dossier longitudinal</span></span>
                      <span className="truncate">{x.dx || <span style={{ color: D.faint }}>Non documenté</span>}</span>
                      <span>{fr(x.lastAt || x.openedAt)}</span>
                      <span>{x.report === "draft" ? <Tag tone="draft">Brouillon</Tag> : x.report === "ok" ? <Tag>Validé</Tag> : <Tag tone="muted">Aucun</Tag>}</span>
                      <span style={{ color: D.action, fontWeight: 600 }}>Ouvrir →</span>
                    </div>
                  ))}
                  {!rows.length && (
                    <p style={{ margin: 0, padding: "24px 0", fontSize: 12, color: D.muted, textAlign: "center" }}>
                      {q ? "Aucun dossier ne correspond." : f === "draft" ? "Aucun brouillon à relire." : "Aucun dossier ouvert ce mois-ci. Recherchez un patient pour ouvrir son dossier."}
                    </p>
                  )}
                </div>
              </div>
              <span style={{ display: "block", marginTop: 12, fontSize: 9.5, color: D.muted }}>{rows.length} sur {q ? items.length : st.consulted} dossier{(q ? items.length : st.consulted) > 1 ? "s" : ""} {q ? "au total" : "consultés ce mois"}</span>
            </Card>
            {last && (
              <Card style={{ background: D.tint3, border: 0 }} className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col" style={{ gap: 4 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>Reprendre le dossier médical · {patientCode(last.id)}</b>
                  <span style={{ fontSize: 11.5 }}>{[last.dx, last.lastAt ? `Dernière consultation le ${fr(last.lastAt, { day: "numeric", month: "long" })}` : null].filter(Boolean).join(" · ") || `${last.lastName} ${last.firstName}`}</span>
                  <span style={{ fontSize: 10, color: D.muted }}>{last.visits} consultation{last.visits > 1 ? "s" : ""} · {last.docs} document{last.docs > 1 ? "s" : ""} clinique{last.docs > 1 ? "s" : ""}</span>
                </span>
                <Btn kind="primary" onClick={() => go(`/derm/dossiers/${last.id}`)}>Ouvrir le dossier →</Btn>
              </Card>
            )}
          </div>

          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            <Card className="flex flex-col" style={{ gap: 10 }} testid="drafts-card">
              <span style={{ alignSelf: "flex-start", padding: "4px 8px", borderRadius: 3, background: drafts.length ? "#f6efd9" : D.tintChip, color: drafts.length ? "#7a5a12" : D.action, fontSize: 9, fontWeight: 700, letterSpacing: .5 }}>
                {pad(drafts.length)} BROUILLON{drafts.length > 1 ? "S" : ""} À RELIRE
              </span>
              <b style={{ fontSize: 16, fontWeight: 600 }}>Finaliser vos observations.</b>
              <span style={{ fontSize: 11, color: D.muted }}>Les brouillons ne sont pas des comptes rendus validés.</span>
              {drafts.slice(0, 5).map((d) => (
                <div key={d.reportId} className="flex items-center justify-between" style={{ gap: 10, padding: "10px 0", borderTop: `1px solid ${D.sep}` }}>
                  <span className="flex flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>Patient {patientCode(d.patientId)}</b><span style={{ fontSize: 10, color: D.muted }}>Consultation du {fr(d.createdAt, { day: "numeric", month: "long" })}</span></span>
                  <Btn kind="link" onClick={() => go(`/derm/dossiers/${d.patientId}/compte-rendu`)}>Reprendre →</Btn>
                </div>
              ))}
              {!drafts.length && <span style={{ fontSize: 11.5, color: D.action }}>Tous les comptes rendus sont validés ✓</span>}
              <Btn kind="primary" disabled={!drafts.length} onClick={() => setF("draft")} style={{ width: "100%", marginTop: 4 }}>Voir les comptes rendus à finaliser</Btn>
            </Card>
            <Card className="flex flex-col" style={{ gap: 6 }}>
              <b style={{ fontSize: 14, fontWeight: 600 }}>Un accès réservé aux soins.</b>
              <span style={{ fontSize: 11, color: D.muted }}>Les informations cliniques restent séparées des coordonnées administratives.</span>
              <span style={{ fontSize: 10, color: D.faint }}>Seul le médecin ouvre les dossiers et valide les comptes rendus. La secrétaire gère les fiches administratives.</span>
            </Card>
            <div className="flex flex-col" style={{ gap: 6, padding: "6px 20px" }}>
              <b style={{ fontSize: 13, fontWeight: 600 }}>Besoin de modifier les coordonnées ?</b>
              <span style={{ fontSize: 11, color: D.muted }}>L'identité et les contacts se gèrent dans Patients.</span>
              <Btn kind="link" onClick={() => go("/derm/patients")} style={{ alignSelf: "flex-start" }}>Accéder au répertoire Patients →</Btn>
            </div>
          </div>
        </section>
      </Page>
    </DermShell>
  );
}
