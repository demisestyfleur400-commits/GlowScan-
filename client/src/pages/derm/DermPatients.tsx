import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, StatCard, Card, Btn, Input, Select, Chip, Tabs, Tag, Notice, Label, fr, profil, phoneFmt, api } from "@/components/derm/ui";

// ════════════════════════════════════════════════════════════════════════
// Patients · répertoire administratif (handoff §3.3). Identité, coordonnées
// et préférences de contact ; les données cliniques sont dans Dossiers.
// Import CSV : lu et montré à l'écran, importé seulement après vérification.
// ════════════════════════════════════════════════════════════════════════

export type AdminPatient = {
  id: number; firstName: string; lastName: string; age: number | null; sex: string | null; birthDate: string | null;
  phone: string | null; email: string | null; city: string | null; archived: boolean; createdAt: string | null; lastVisit: string | null;
  status?: string | null;
};
// Statut de suivi clinique (même règle que la page Analyses Glow).
type Suivi = "priority" | "monitoring" | "stable" | "resolved";
const suiviOf = (s?: string | null): Suivi => (s === "red" || s === "priority" ? "priority" : s === "yellow" || s === "monitoring" ? "monitoring" : s === "resolved" ? "resolved" : "stable");
const SUIVI_LABEL: Record<Suivi, string> = { priority: "Priorité haute", monitoring: "En suivi", stable: "Stable", resolved: "Résolu" };
type ListResp = { items: AdminPatient[]; stats: { total: number; seenThisMonth: number; newThisMonth: number; archived: number }; month: string };
type ImportRow = { firstName: string; lastName: string; age: string; sex: string; phone: string };

const RECENT_KEY = "derm_recent_patients";
export function rememberPatient(id: number) {
  try {
    const cur: number[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...cur.filter((x) => x !== id)].slice(0, 3)));
  } catch {}
}
const recentIds = (): number[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };

/** Lecture d'un CSV (séparateur ; ou ,) : nom, prénom, âge, sexe, téléphone. */
function parseCsv(text: string): ImportRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const cells = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const norm = (h: string) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  const head = cells(lines[0]).map(norm);
  const find = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  const iFull = find("nometprenom", "nomcomplet", "fullname");
  const iLast = find("nom", "lastname");
  const iFirst = find("prenom", "firstname");
  const iAge = find("age");
  const iSex = find("sexe", "sex", "genre");
  const iPhone = find("tel", "phone", "whatsapp", "mobile");
  const hasHeader = [iFull, iLast, iFirst, iAge, iSex, iPhone].some((i) => i >= 0);
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map((l) => {
    const c = cells(l);
    let firstName = iFirst >= 0 && iFirst !== iLast ? c[iFirst] || "" : "";
    let lastName = iLast >= 0 && iLast !== iFirst ? c[iLast] || "" : "";
    if (iFull >= 0 || (!hasHeader)) {
      const full = (iFull >= 0 ? c[iFull] : c[0]) || "";
      const parts = full.split(/\s+/).filter(Boolean);
      lastName = lastName || parts[0] || ""; firstName = firstName || parts.slice(1).join(" ");
    }
    return { firstName, lastName, age: iAge >= 0 ? c[iAge] || "" : hasHeader ? "" : c[1] || "", sex: iSex >= 0 ? c[iSex] || "" : hasHeader ? "" : c[2] || "", phone: iPhone >= 0 ? c[iPhone] || "" : hasHeader ? "" : c[3] || "" };
  }).filter((r) => r.firstName || r.lastName);
}

export default function DermPatients() {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data } = useQuery<ListResp>({ queryKey: ["/api/derm/patients"] });
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "arch">("all");
  const [when, setWhen] = useState<"all" | "7" | "month" | "old">("all");
  const [sex, setSex] = useState<"all" | "F" | "M">("all");
  // ?filtre=priority (tableau de bord « patients en priorité haute »).
  const [suivi, setSuivi] = useState<"all" | Suivi>(() => { try { const f = new URLSearchParams(window.location.search).get("filtre"); return f === "priority" || f === "monitoring" || f === "stable" || f === "resolved" ? f : "all"; } catch { return "all"; } });
  const [more, setMore] = useState(false);
  const [sort, setSort] = useState<"last" | "code">("last");
  const [imp, setImp] = useState<{ file: string; rows: ImportRow[] } | null>(null);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "warn" | "err" } | null>(null);
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState({ lastName: "", firstName: "", age: "", sex: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = data?.items || [];
  const st = data?.stats || { total: 0, seenThisMonth: 0, newThisMonth: 0, archived: 0 };
  const month = data?.month || "";
  const now = Date.now();
  const thisMonth = (v: string | null) => { if (!v) return false; const d = new Date(v), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = items.filter((p) =>
      (tab === "all" || (tab === "arch" ? p.archived : !p.archived)) &&
      (sex === "all" || p.sex === sex) &&
      (suivi === "all" || suiviOf(p.status) === suivi) &&
      (when === "all" || (when === "7" ? !!p.lastVisit && now - new Date(p.lastVisit).getTime() <= 7 * 86400000 : when === "month" ? thisMonth(p.lastVisit) : !thisMonth(p.lastVisit))) &&
      (!term || `${patientCode(p.id)} ${p.firstName} ${p.lastName} ${profil(p.age, p.sex)} ${fr(p.lastVisit)} ${p.phone || ""}`.toLowerCase().includes(term)));
    r = r.slice().sort((a, b) => sort === "code" ? a.id - b.id : new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime());
    return r;
  }, [items, q, tab, sex, when, sort, suivi]); // eslint-disable-line react-hooks/exhaustive-deps
  const nPrio = items.filter((p) => !p.archived && suiviOf(p.status) === "priority").length;

  const nArch = items.filter((p) => p.archived).length;
  const recent = recentIds().map((id) => items.find((p) => p.id === id)).filter(Boolean) as AdminPatient[];
  const open = (id: number) => { rememberPatient(id); go(`/derm/patients/${id}`); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImp({ file: f.name, rows: parseCsv(String(r.result || "")) });
    r.readAsText(f);
  };
  const doImport = async () => {
    if (!imp) return;
    setBusy(true);
    try {
      const d = await api<{ created: number; skipped: number }>("/api/derm/patients/import", "POST", { rows: imp.rows });
      setMsg({ t: `${d.created} fiche${d.created > 1 ? "s" : ""} créée${d.created > 1 ? "s" : ""}${d.skipped ? ` · ${d.skipped} ligne${d.skipped > 1 ? "s" : ""} ignorée${d.skipped > 1 ? "s" : ""} (nom manquant ou téléphone déjà enregistré)` : ""}.`, tone: "ok" });
      setImp(null);
      qc.invalidateQueries({ queryKey: ["/api/derm/patients"] });
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };
  const create = async () => {
    setBusy(true);
    try {
      const d = await api<{ id: number }>("/api/derm/patients", "POST", nf);
      qc.invalidateQueries({ queryKey: ["/api/derm/patients"] });
      rememberPatient(d.id);
      go(`/derm/patients/${d.id}?edit=1`);
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };

  const th: React.CSSProperties = { color: D.muted, fontSize: 8.5, fontWeight: 600, letterSpacing: .8 };
  const grid = "minmax(200px,2fr) minmax(120px,1.2fr) minmax(130px,1.3fr) minmax(110px,1fr) 90px 70px";

  return (
    <DermShell active="patients">
      <Page>
        <ScreenHeader kicker="RÉPERTOIRE ADMINISTRATIF" title="Vos patients, au même endroit."
          sub="Identité, coordonnées et préférences de contact. Les données cliniques ont leur espace dédié."
          actions={<>
            <Btn kind="link" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }} data-testid="import-btn">Importer des patients</Btn>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" data-testid="import-file" />
            <Btn kind="primary" onClick={() => setCreating((c) => !c)} data-testid="new-patient">Nouveau patient +</Btn>
          </>} />

        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}
        {imp && (
          <Card style={{ marginBottom: 14, background: D.tint3, border: 0 }} testid="import-preview">
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
              <span style={{ fontSize: 12, color: D.actionDark }}><b>{imp.file}</b> · {imp.rows.length} ligne{imp.rows.length > 1 ? "s" : ""} détectée{imp.rows.length > 1 ? "s" : ""} · à vérifier avant import (nom, âge, sexe, téléphone).</span>
              <span className="flex" style={{ gap: 10 }}>
                <Btn kind="secondary" onClick={() => setImp(null)}>Annuler</Btn>
                <Btn kind="primary" disabled={!imp.rows.length || busy} onClick={doImport} data-testid="import-confirm">Importer {imp.rows.length} patient{imp.rows.length > 1 ? "s" : ""}</Btn>
              </span>
            </div>
            {imp.rows.length > 0 ? (
              <div style={{ marginTop: 12, fontSize: 11, color: D.text }}>
                {imp.rows.slice(0, 5).map((r, i) => <div key={i} style={{ padding: "5px 0", borderTop: i ? `1px solid #d8e4d2` : 0 }}>{r.lastName} {r.firstName} · {r.age || "âge ?"} · {r.sex || "sexe ?"} · {r.phone || "téléphone ?"}</div>)}
                {imp.rows.length > 5 && <div style={{ color: D.muted, marginTop: 4 }}>… et {imp.rows.length - 5} autre{imp.rows.length - 5 > 1 ? "s" : ""}.</div>}
              </div>
            ) : <p style={{ margin: "10px 0 0", fontSize: 11, color: D.warn }}>Aucune ligne lisible. Colonnes attendues : nom ; prénom ; âge ; sexe ; téléphone.</p>}
          </Card>
        )}
        {creating && (
          <Card style={{ marginBottom: 14 }} testid="create-card">
            <b style={{ fontSize: 14, fontWeight: 600 }}>Nouvelle fiche patient</b>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 12 }}>
              <Label text="Nom"><Input value={nf.lastName} onChange={(e) => setNf({ ...nf, lastName: e.target.value })} /></Label>
              <Label text="Prénom"><Input value={nf.firstName} onChange={(e) => setNf({ ...nf, firstName: e.target.value })} /></Label>
              <Label text="Âge"><Input inputMode="numeric" value={nf.age} onChange={(e) => setNf({ ...nf, age: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></Label>
              <Label text="Sexe"><span className="flex" style={{ gap: 6 }}><Chip on={nf.sex === "F"} onClick={() => setNf({ ...nf, sex: "F" })}>Femme</Chip><Chip on={nf.sex === "M"} onClick={() => setNf({ ...nf, sex: "M" })}>Homme</Chip></span></Label>
              <Label text="Téléphone WhatsApp"><Input inputMode="tel" value={nf.phone} onChange={(e) => setNf({ ...nf, phone: e.target.value })} placeholder="6XX XX XX XX" /></Label>
            </div>
            <div className="flex justify-end" style={{ gap: 10, marginTop: 14 }}>
              <Btn kind="secondary" onClick={() => setCreating(false)}>Annuler</Btn>
              <Btn kind="primary" disabled={busy || !nf.lastName.trim() || !nf.firstName.trim()} onClick={create} data-testid="create-confirm">Créer la fiche →</Btn>
            </div>
          </Card>
        )}

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
          <StatCard label="Patients enregistrés" value={st.total} sub="L'ensemble du cabinet" />
          <StatCard label={`Patients vus en ${month.split(" ")[0] || "ce mois"}`} value={st.seenThisMonth} sub="Activité du mois" onClick={() => { setWhen("month"); setTab("all"); }} />
          <StatCard label={`Nouveaux en ${month.split(" ")[0] || "ce mois"}`} value={st.newThisMonth} sub="Première visite ce mois-ci" />
          <StatCard tone="dark" label="Fiches archivées" value={st.archived} sub={`${st.archived} fiche${st.archived > 1 ? "s" : ""} sur ${st.total} au total`} onClick={() => setTab("arch")} />
        </section>

        <Card style={{ padding: "18px 20px" }}>
          <div className="flex flex-wrap" style={{ gap: 10 }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par identifiant, profil ou date…" style={{ flex: 1, minWidth: 220, height: 34 }} data-testid="patients-q" />
            <Select value={tab} onChange={(e) => setTab(e.target.value as any)} style={{ height: 34 }}>
              <option value="all">Statut : tous</option><option value="active">Statut : active</option><option value="arch">Statut : archivée</option>
            </Select>
            <Select value={when} onChange={(e) => setWhen(e.target.value as any)} style={{ height: 34 }}>
              <option value="all">Dernière visite : toutes</option><option value="7">7 derniers jours</option>
              <option value="month">{month ? month.charAt(0).toUpperCase() + month.slice(1) : "Ce mois-ci"}</option><option value="old">Avant ce mois</option>
            </Select>
            <Select value={suivi} onChange={(e) => setSuivi(e.target.value as any)} style={{ height: 34 }} data-testid="patients-suivi">
              <option value="all">Suivi : tous</option><option value="priority">Priorité haute{nPrio ? ` · ${nPrio}` : ""}</option>
              <option value="monitoring">En suivi</option><option value="stable">Stable</option><option value="resolved">Résolu</option>
            </Select>
            <Btn kind="secondary" onClick={() => setMore(!more)} style={{ height: 34, background: more ? D.tintChip : "#fff", borderColor: more ? "#9dc3a9" : D.border }}>Plus de filtres</Btn>
          </div>
          {more && (
            <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 10, color: D.muted, marginRight: 4 }}>Profil</span>
              <Chip on={sex === "all"} onClick={() => setSex("all")}>Tous</Chip>
              <Chip on={sex === "F"} onClick={() => setSex("F")}>Femmes</Chip>
              <Chip on={sex === "M"} onClick={() => setSex("M")}>Hommes</Chip>
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between" style={{ gap: 10, marginTop: 14 }}>
            <Tabs underline value={tab} onChange={setTab} items={[["all", `Tous les patients · ${items.length}`], ["active", `Fiches actives · ${items.length - nArch}`], ["arch", `Archivées · ${nArch}`]]} />
            <Select value={sort} onChange={(e) => setSort(e.target.value as any)} style={{ height: 30, border: 0, fontSize: 10.5, color: D.muted }}>
              <option value="last">Tri : dernière visite</option><option value="code">Tri : identifiant</option>
            </Select>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 560, overflowY: "auto" }}>
            <div style={{ minWidth: 760 }}>
              <div className="grid items-center" style={{ gridTemplateColumns: grid, gap: 12, padding: "14px 0 10px", borderBottom: `1px solid ${D.sep}`, ...th }}>
                <span>PATIENT</span><span>PROFIL</span><span>COORDONNÉES</span><span>DERNIÈRE VISITE</span><span>FICHE</span><span>ACCÈS</span>
              </div>
              {rows.map((p) => (
                <div key={p.id} role="button" tabIndex={0} onClick={() => open(p.id)} onKeyDown={(e) => { if (e.key === "Enter") open(p.id); }}
                  className="grid cursor-pointer items-center hover:bg-[#f8faf7]" data-testid={`patient-row-${p.id}`}
                  style={{ gridTemplateColumns: grid, gap: 12, minHeight: 49, padding: "8px 0", borderBottom: `1px solid ${D.sep}`, fontSize: 11 }}>
                  <span className="flex min-w-0 flex-col"><b style={{ fontSize: 11.5, fontWeight: 600 }}>Patient {patientCode(p.id)}</b><span className="truncate" style={{ fontSize: 9.5, color: D.muted }}>{p.lastName} {p.firstName}</span></span>
                  <span>{profil(p.age, p.sex)}</span>
                  <span>{p.phone ? phoneFmt(p.phone) : <span style={{ color: D.faint }}>Non renseigné</span>}</span>
                  <span>{fr(p.lastVisit)}</span>
                  <span className="flex flex-wrap" style={{ gap: 4 }}>{p.archived ? <Tag tone="muted">Archivée</Tag> : <Tag>Active</Tag>}{!p.archived && suiviOf(p.status) === "priority" && <Tag tone="err">{SUIVI_LABEL.priority}</Tag>}</span>
                  <span style={{ color: D.action, fontWeight: 600 }}>Ouvrir →</span>
                </div>
              ))}
              {!rows.length && <p style={{ margin: 0, padding: "26px 0", fontSize: 12, color: D.muted, textAlign: "center" }}>{items.length ? "Aucune fiche ne correspond à ces filtres." : "Aucun patient pour l'instant. Créez une fiche ou importez vos patients."}</p>}
            </div>
          </div>
          <span style={{ display: "block", marginTop: 12, fontSize: 9.5, color: D.muted }}>{rows.length} fiche{rows.length > 1 ? "s" : ""} affichée{rows.length > 1 ? "s" : ""} sur {items.length}</span>
        </Card>

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginTop: 16 }}>
          <Card style={{ background: D.tint3, border: 0 }}>
            <b style={{ fontSize: 14, fontWeight: 600 }}>Retrouver une fiche patient</b>
            <p style={{ margin: "4px 0 12px", fontSize: 11, color: D.muted }}>Accès rapide aux dernières fiches administratives consultées.</p>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {recent.length ? recent.map((p) => <Btn key={p.id} kind="secondary" onClick={() => open(p.id)} style={{ height: 32 }}>Patient {patientCode(p.id)} →</Btn>)
                : <span style={{ fontSize: 11, color: D.muted }}>Les fiches que vous ouvrez apparaîtront ici.</span>}
            </div>
          </Card>
          <Card>
            <b style={{ fontSize: 14, fontWeight: 600 }}>Des données de santé à protéger</b>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: D.muted }}>L'accès aux dossiers et leur partage doivent être limités aux personnes autorisées.</p>
          </Card>
        </section>
      </Page>
    </DermShell>
  );
}
