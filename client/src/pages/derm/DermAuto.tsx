import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Trash2 } from "lucide-react";
import { DermShell } from "@/components/derm/DermShell";
import { D, FONT_UI, patientCode } from "@/components/derm/tokens";
import { Page, ScreenHeader, Card, Btn, Input, Select, Textarea, Tag, Notice, fr, api } from "@/components/derm/ui";

// ════════════════════════════════════════════════════════════════════════
// Auto-évaluation & apprentissage (handoff §3.8). Onglets : Mon apprentissage,
// Mon bilan hebdomadaire, Avis patients, Recherche & mémoires. Assistant
// d'apprentissage Gemini (agrégats et avis anonymes seulement). PubMed est
// interrogé depuis le navigateur : seuls les mots-clés partent.
// ════════════════════════════════════════════════════════════════════════

type Tab = "learn" | "bilan" | "avis" | "research";
type Fb = { rating: number; comment: string | null; at: string | null; source: string };
type Learning = { rating: number | null; ratingCount: number; invitations: number; reviews: { total: number; done: number }; last: { weekStart: string; scores: number[]; done: boolean; goal: string; good: string } | null; goals: string[]; month: { patients: number; consultations: number; toReview: number }; feedback: Fb[] };
type Review = { weekStart: string; review: { scores: number[]; good: string; goal: string; retours: { patientId: number | null; evolution: string; obs: string }[]; doneAt: string | null } | null; stats: { patients: number; consultations: number; toReview: number; toComplete: number }; patients: { id: number; dx: string | null }[]; history: { weekStart: string; done: boolean }[] };
type Msg = { role: "doctor" | "ai"; text: string; error?: boolean };
type Ref = { id: string; title: string; meta: string; url: string };
type Sec = { t: string; b: string };

const SCALES = ["Confiance dans mes évaluations cliniques", "Qualité du suivi de mes patients", "Clarté des conseils donnés au patient"];
const EVOS = ["À réévaluer", "En amélioration", "Stabilisé", "Aggravation"];
const PLAN = ["Introduction", "Revue de la littérature", "Question de recherche et objectifs", "Méthode (recueil de données anonymisées)", "Résultats attendus", "Discussion", "Conclusion"];
const mondayOf = (d: Date) => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
const weekLabel = (ws: string) => { const a = new Date(`${ws}T00:00:00Z`), b = new Date(a.getTime() + 6 * 86400000); return `${a.getUTCDate()} au ${b.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`; };
const QUICK: Record<"learn" | "avis" | "research", [string, string][]> = {
  learn: [["M'aider à préparer une fiche de conseils", "Aidez-moi à rédiger une fiche de conseils de soins claire, à remettre au patient après la consultation (structure, langage simple, format)."], ["Chercher des publications scientifiques", "Quelles publications consulter sur l'observance thérapeutique en dermatologie, notamment sur peaux noires ? Donnez-moi des mots-clés et une équation PubMed."], ["Comment progresser à partir de mes avis ?", "Comment progresser à partir des retours de mes patients ?"]],
  avis: [["Que retenir de mes avis ?", "Que puis-je retenir de l'ensemble de mes avis patients, et quelle action concrète tester cette semaine ?"]],
  research: [["Affiner ma question de recherche", "Aidez-moi à affiner ma question de recherche (format PICO, faisable en cabinet en Afrique)."], ["Proposer des mots-clés PubMed", "Proposez des mots-clés MeSH et une équation de recherche PubMed pour mon sujet."], ["Plan de mémoire", "Proposez un plan de mémoire en 6 parties et la méthode de recueil des données anonymisées."]],
};

function Rich({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  return <>{text.split("\n").map((l, i) => { const t = l.trim(); if (!t) return <span key={i} style={{ display: "block", height: 6 }} />; const li = /^[-*•]\s+(.*)$/.exec(t); return <span key={i} style={{ display: "block", margin: "2px 0", paddingLeft: li ? 10 : 0 }}>{li ? <>• {bold(li[1])}</> : bold(t.replace(/^#+\s*/, ""))}</span>; })}</>;
}

function LearnAssistant({ mode, ask, onAsked, doc }: { mode: "learn" | "avis" | "research"; ask: string | null; onAsked: () => void; doc?: { title: string; sections: Sec[] } }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs]);
  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history = msgs.filter((m) => !m.error).slice(-12);
    setMsgs((c) => [...c, { role: "doctor", text: question }, { role: "ai", text: "" }]); setInput(""); setBusy(true);
    const patch = (f: (m: Msg) => Msg) => setMsgs((c) => { const n = c.slice(); n[n.length - 1] = f(n[n.length - 1]); return n; });
    try {
      const r = await fetch("/api/pro/glow/learn", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, question, history, doc }) });
      if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || "L'assistant ne répond pas pour le moment."); }
      const reader = r.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() || "";
        for (const part of parts) { let o: any; try { o = JSON.parse(part.replace(/^data:\s?/, "")); } catch { continue; } if (o.t) patch((m) => ({ ...m, text: m.text + o.t })); if (o.error) patch((m) => ({ ...m, text: o.error, error: true })); }
      }
    } catch (e: any) { patch((m) => ({ ...m, text: e.message, error: true })); }
    setBusy(false);
  };
  useEffect(() => { if (ask) { send(ask); onAsked(); } }, [ask]); // eslint-disable-line react-hooks/exhaustive-deps
  const ctx = { learn: "Contexte : bilan et avis agrégés", avis: "Contexte : avis patients anonymisés", research: "Contexte : recherche scientifique" }[mode];
  return (
    <div className="flex flex-col" style={{ background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, overflow: "hidden", fontFamily: FONT_UI, color: D.text }} data-testid="learn-assistant">
      <div className="flex items-start justify-between" style={{ padding: "16px 18px", background: "#17392c", color: "#fff" }}>
        <span className="flex flex-col"><b style={{ fontSize: 14 }}>Glowscan Assistant</b><span style={{ fontSize: 10.5, color: "#bcd0c8" }}>{mode === "research" ? "Mode recherche & rédaction" : "Votre partenaire d'apprentissage"}</span></span>
        <span style={{ padding: "3px 7px", borderRadius: 3, background: "#2a6b4f", fontSize: 9, fontWeight: 700 }}>IA</span>
      </div>
      <div className="flex items-center justify-between" style={{ padding: "8px 18px", borderBottom: `1px solid ${D.sep}` }}>
        <span style={{ padding: "3px 8px", borderRadius: 3, background: D.tintChip, fontSize: 9.5, color: D.action }}>{ctx}</span>
        <Btn kind="link" onClick={() => setMsgs([])} style={{ fontSize: 10.5 }}>Nouvelle conversation</Btn>
      </div>
      <div ref={list} className="flex flex-col" style={{ gap: 12, padding: "14px 18px", minHeight: 260, maxHeight: 520, overflowY: "auto" }}>
        {!msgs.length && <span style={{ fontSize: 11.5, color: D.muted }}>Posez une question sur votre pratique, vos avis ou un travail de recherche.</span>}
        {msgs.map((m, i) => m.role === "doctor"
          ? <div key={i} className="self-end" style={{ maxWidth: "85%", padding: "9px 12px", borderRadius: 8, background: D.tintChip, fontSize: 11.5 }}>{m.text}</div>
          : <div key={i} className="flex flex-col" style={{ gap: 4 }}><span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .6, color: D.action }}>GLOWSCAN ASSISTANT</span>
              <div style={{ fontSize: 11.5, lineHeight: 1.55, color: m.error ? D.err : D.text }}>{m.text ? <Rich text={m.text} /> : <span style={{ color: D.faint }}>L'assistant réfléchit…</span>}</div></div>)}
      </div>
      <div className="flex flex-col" style={{ gap: 6, padding: "0 18px 10px" }}>
        {QUICK[mode].map(([t, q]) => <button key={t} type="button" disabled={busy} onClick={() => send(q)} className="cursor-pointer text-left hover:bg-[#f3f7f1]" style={{ padding: "8px 12px", border: `1px solid ${D.border}`, borderRadius: 4, background: "#f8faf7", fontSize: 11, color: D.text, fontFamily: FONT_UI }}>{t}</button>)}
        <span style={{ fontSize: 9.5, color: D.muted }}>Ne partagez pas de données identifiantes. Les suggestions IA restent à vérifier.</span>
      </div>
      <div className="flex" style={{ gap: 8, padding: "12px 18px", borderTop: `1px solid ${D.sep}` }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(input); }} placeholder="Posez une question à mon assistant…" data-testid="learn-input" />
        <Btn kind="primary" disabled={busy || !input.trim()} onClick={() => send(input)}>Envoyer ↑</Btn>
      </div>
      <span style={{ padding: "0 18px 12px", fontSize: 9, color: D.faint }}>IA d'accompagnement · Ne remplace pas votre jugement</span>
    </div>
  );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const { data } = useQuery<{ candidates: { id: number; name: string; invitedAt: string | null }[] }>({ queryKey: ["/api/derm/feedback"] });
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const invite = async (id: number) => {
    setBusy(id); setErr("");
    try {
      const d = await api<{ sent: boolean; url: string }>("/api/derm/feedback/invite", "POST", { patientId: id });
      if (!d.sent) { try { await navigator.clipboard.writeText(d.url); } catch {} }
      onDone(d.sent ? "Invitation envoyée sur WhatsApp. L'avis apparaîtra ici dès sa réponse." : "WhatsApp indisponible : le lien d'avis a été copié, partagez-le au patient.");
    } catch (e: any) { setErr(e.message); }
    setBusy(null);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center" style={{ padding: 16 }}>
      <div className="absolute inset-0" style={{ background: "rgba(13,41,41,.35)" }} onClick={onClose} />
      <div className="relative flex w-full max-w-[480px] flex-col" style={{ gap: 12, padding: 22, borderRadius: 12, background: "#fff", fontFamily: FONT_UI, color: D.text }} data-testid="invite-modal">
        <div className="flex items-center justify-between"><b style={{ fontSize: 16, fontWeight: 600 }}>Recueillir un avis</b><button type="button" aria-label="Fermer" onClick={onClose} className="cursor-pointer" style={{ border: 0, background: "none", color: D.muted }}><X size={18} /></button></div>
        <span style={{ fontSize: 11.5, color: D.muted }}>Le patient reçoit sur WhatsApp un lien vers une page d'avis (note de 1 à 5 et commentaire). L'avis s'affiche ici sans son identité.</span>
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {(data?.candidates || []).map((c) => (
            <div key={c.id} className="flex items-center justify-between" style={{ gap: 10, padding: "9px 0", borderBottom: `1px solid ${D.sep}` }}>
              <span className="flex flex-col"><b style={{ fontSize: 12, fontWeight: 600 }}>Patient {patientCode(c.id)} · {c.name}</b>{c.invitedAt && <span style={{ fontSize: 10, color: D.muted }}>Invité le {fr(c.invitedAt, { day: "numeric", month: "long" })}</span>}</span>
              <Btn kind="secondary" disabled={busy !== null} onClick={() => invite(c.id)} style={{ height: 30 }}>{busy === c.id ? "Envoi…" : "Inviter"}</Btn>
            </div>
          ))}
          {data && !data.candidates.length && <span style={{ fontSize: 11.5, color: D.muted }}>Aucun patient avec un numéro WhatsApp.</span>}
        </div>
        {err && <span style={{ fontSize: 11, color: D.err }}>{err}</span>}
      </div>
    </div>
  );
}

function FeedbackRow({ f, onAnalyse }: { f: Fb; onAnalyse?: () => void }) {
  return (
    <div className="flex items-start" style={{ gap: 12, padding: "12px 0", borderTop: `1px solid ${D.sep}` }}>
      <span style={{ flex: "none", padding: "3px 7px", borderRadius: 3, background: D.tintChip, color: D.action, fontSize: 10.5, fontWeight: 700 }}>{f.rating} / 5</span>
      <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 3 }}>
        <span style={{ fontSize: 9.5, color: D.muted }}>Avis reçu · {fr(f.at, { day: "numeric", month: "long" })} · {f.source}</span>
        <span style={{ fontSize: 12 }}>{f.comment ? `« ${f.comment} »` : <span style={{ color: D.muted }}>Sans commentaire</span>}</span>
      </span>
      {onAnalyse && f.comment && <Btn kind="link" onClick={onAnalyse}>Analyser →</Btn>}
    </div>
  );
}

export default function DermAuto() {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>(() => { try { const t = new URLSearchParams(window.location.search).get("onglet"); return (["learn", "bilan", "avis", "research"].includes(t || "") ? t : "learn") as Tab; } catch { return "learn"; } });
  const [ask, setAsk] = useState<string | null>(null);
  const [mode, setMode] = useState<"learn" | "avis" | "research">(tab === "research" ? "research" : tab === "avis" ? "avis" : "learn");
  const [invite, setInvite] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" | "warn" } | null>(null);
  const { data: L, isError: lErr, refetch: lRefetch } = useQuery<Learning>({ queryKey: ["/api/derm/learning"], retry: 1 });
  const { data: F } = useQuery<{ items: Fb[]; avg: number | null; invitations: number }>({ queryKey: ["/api/derm/feedback"], enabled: tab === "avis" });
  const goTab = (t: Tab) => { setTab(t); if (t !== "bilan") setMode(t === "research" ? "research" : t === "avis" ? "avis" : "learn"); window.history.replaceState(null, "", `/derm/auto-evaluation?onglet=${t}`); };
  const askIn = (m: "learn" | "avis" | "research", q: string) => { setMode(m); setAsk(q); };

  // ── Bilan hebdomadaire ──
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const { data: R } = useQuery<Review>({ queryKey: [`/api/derm/reviews?week=${week}`], enabled: tab === "bilan" || tab === "learn" });
  const [form, setForm] = useState<{ scores: number[]; good: string; goal: string; retours: { patientId: number | null; evolution: string; obs: string }[] } | null>(null);
  useEffect(() => { if (R) setForm({ scores: R.review?.scores?.length ? R.review.scores : [3, 3, 3], good: R.review?.good || "", goal: R.review?.goal || "", retours: R.review?.retours?.length ? R.review.retours : [{ patientId: R.patients[0]?.id ?? null, evolution: "À réévaluer", obs: "" }] }); }, [R]);
  const done = !!R?.review?.doneAt;
  const saveReview = async (finish: boolean) => {
    if (!form) return;
    try {
      await api("/api/derm/reviews", "PUT", { weekStart: week, ...form, done: finish });
      setMsg({ t: finish ? "Bilan terminé. Vos retours sont rangés dans les fiches de suivi de vos patients." : "Brouillon enregistré.", tone: "ok" });
      qc.invalidateQueries({ predicate: (q) => /\/api\/derm\/(reviews|learning|activity)/.test(String(q.queryKey[0])) });
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
  };
  const weeks = [0, 1, 2, 3].map((i) => { const d = new Date(); d.setDate(d.getDate() - 7 * i); return mondayOf(d); });

  // ── Recherche & mémoires ──
  const { data: RD } = useQuery<{ title: string; sections: Sec[]; library: Ref[]; updatedAt: string | null }>({ queryKey: ["/api/derm/research"], enabled: tab === "research" });
  const [doc, setDoc] = useState<{ title: string; sections: Sec[]; library: Ref[] } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const [pq, setPq] = useState("");
  const [pres, setPres] = useState<Ref[] | null>(null);
  const [pbusy, setPbusy] = useState(false);
  const [perr, setPerr] = useState(false);
  useEffect(() => { if (RD && !doc) { setDoc({ title: RD.title || "Mon mémoire", sections: RD.sections.length ? RD.sections : [{ t: "Introduction", b: "" }], library: RD.library }); setSavedAt(RD.updatedAt); } }, [RD]); // eslint-disable-line react-hooks/exhaustive-deps
  const upDoc = (p: Partial<{ title: string; sections: Sec[]; library: Ref[] }>) => { setDoc((d) => (d ? { ...d, ...p } : d)); setDirty(true); };
  const saveDoc = async () => { if (!doc) return; try { const d = await api<{ savedAt: string }>("/api/derm/research", "PUT", doc); setDirty(false); setSavedAt(d.savedAt); } catch (e: any) { setMsg({ t: e.message, tone: "err" }); } };
  useEffect(() => { if (!dirty) return; const t = setTimeout(saveDoc, 3000); return () => clearTimeout(t); }, [doc, dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  const pubmed = async () => {
    if (!pq.trim()) return;
    setPbusy(true); setPerr(false); setPres(null);
    try {
      const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
      const ids: string[] = (await (await fetch(`${base}esearch.fcgi?db=pubmed&retmode=json&retmax=6&sort=relevance&term=${encodeURIComponent(pq)}`)).json()).esearchresult?.idlist || [];
      let res: Ref[] = [];
      if (ids.length) {
        const sum = (await (await fetch(`${base}esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`)).json()).result || {};
        res = ids.map((id) => { const d = sum[id] || {}; const a = (d.authors || [])[0]; return { id, title: String(d.title || "").replace(/\.$/, ""), meta: [a ? `${a.name} et al.` : "", d.source, String(d.pubdate || "").slice(0, 4), `PMID ${id}`].filter(Boolean).join(" · "), url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` }; });
      }
      setPres(res);
    } catch { setPerr(true); }
    setPbusy(false);
  };
  const exportDoc = (kind: "word" | "pdf") => {
    if (!doc) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const html = `<html><head><meta charset="utf-8"><title>${esc(doc.title)}</title></head><body style="font-family:Georgia,serif;max-width:680px;margin:40px auto;line-height:1.6"><h1>${esc(doc.title)}</h1>${doc.sections.map((s, i) => `<h2>${String(i + 1).padStart(2, "0")} ${esc(s.t)}</h2><p>${esc(s.b).replace(/\n/g, "<br>")}</p>`).join("")}<h2>Références</h2><ol>${doc.library.map((c) => `<li>${esc(c.title)}. ${esc(c.meta)}</li>`).join("")}</ol></body></html>`;
    if (kind === "word") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + html], { type: "application/msword" })); a.download = `Memoire - ${doc.title.slice(0, 40)}.doc`; a.click(); }
    else { const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); } }
  };

  const strip = L ? [
    ["Note des patients", L.rating != null ? `${String(L.rating).replace(".", ",")} / 5` : "—", `${L.ratingCount} réponse${L.ratingCount > 1 ? "s" : ""} · ${L.invitations} invitation${L.invitations > 1 ? "s" : ""}`],
    ["Bilans complétés", `${L.reviews.done} / ${L.reviews.total}`, new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })],
    ["Objectifs de progression", String(L.goals.length).padStart(2, "0"), L.goals[0] ? L.goals[0].slice(0, 40) : "Fixés à la fin de chaque bilan"],
  ] : [];

  return (
    <DermShell active="auto">
      <Page>
        <ScreenHeader kicker={tab === "research" ? "AUTO-ÉVALUATION · RECHERCHE & MÉMOIRES" : tab === "bilan" ? <span>AUTO-ÉVALUATION · <button type="button" onClick={() => goTab("learn")} style={{ border: 0, background: "none", padding: 0, color: D.action, fontWeight: 700, cursor: "pointer", fontSize: 10 }}>← MON APPRENTISSAGE</button> · BILAN HEBDOMADAIRE</span> : "AUTO-ÉVALUATION & APPRENTISSAGE"}
          title={tab === "research" ? "De la pratique au savoir." : "Chaque retour fait progresser."}
          sub={tab === "research" ? "Rechercher, structurer et rédiger, avec une IA à vos côtés." : "Écouter vos patients. Faire le point. Apprendre avec votre assistant IA."}
          actions={<span style={{ fontSize: 12, color: D.muted }}>Semaine du {weekLabel(mondayOf(new Date()))}</span>} />
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", padding: 4, marginBottom: 18, background: "#fff", border: `1px solid ${D.border}`, borderRadius: 8 }}>
          {([["learn", "Mon apprentissage"], ["bilan", "Mon bilan hebdomadaire"], ["avis", "Avis patients"], ["research", "Recherche & mémoires"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} type="button" onClick={() => goTab(k)} className="cursor-pointer" data-testid={`auto-tab-${k}`}
              style={{ height: 36, border: 0, borderRadius: 4, background: tab === k ? D.tintChip : "transparent", color: tab === k ? D.text : D.muted, fontWeight: tab === k ? 600 : 500, fontSize: 12, fontFamily: FONT_UI }}>{l}</button>
          ))}
        </div>
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}

        <section className="grid items-start" style={{ gridTemplateColumns: tab === "bilan" ? "minmax(0,1.45fr) minmax(260px,.72fr)" : "minmax(0,1.5fr) minmax(330px,1fr)", gap: 18 }}>
          <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
            {tab === "learn" && lErr && (
              <Card><b style={{ fontSize: 15, fontWeight: 600 }}>Votre synthèse n'a pas pu être chargée.</b><p style={{ margin: "6px 0 12px", fontSize: 12, color: D.muted }}>Vérifiez votre connexion internet, puis réessayez. Le bilan hebdomadaire reste accessible.</p>
                <span className="flex" style={{ gap: 8 }}><Btn kind="primary" onClick={() => lRefetch()}>Réessayer</Btn><Btn kind="secondary" onClick={() => goTab("bilan")}>Faire mon bilan</Btn></span></Card>
            )}
            {tab === "learn" && !L && !lErr && <span style={{ fontSize: 12, color: D.muted }}>Chargement…</span>}
            {tab === "learn" && L && (
              <>
                <Card className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", padding: "18px 0" }}>
                  {strip.map(([l, v, s], i) => <div key={l} className="flex flex-col" style={{ gap: 6, padding: "0 16px", borderLeft: i ? `1px solid ${D.border}` : 0 }}><span style={{ fontSize: 10, color: D.muted }}>{l}</span><b style={{ fontSize: 24, fontWeight: 600 }}>{v}</b><span style={{ fontSize: 9.5, color: D.muted }}>{s}</span></div>)}
                </Card>
                <Card>
                  <div className="flex flex-wrap items-start justify-between" style={{ gap: 8 }}><span className="flex flex-col"><b style={{ fontSize: 16, fontWeight: 600 }}>Mon regard sur ma pratique</b><span style={{ fontSize: 11, color: D.muted }}>Votre ressenti et les avis patients sont deux éclairages complémentaires.</span></span>
                    <span style={{ padding: "3px 8px", borderRadius: 3, background: D.tintChip, fontSize: 9.5, color: D.action }}>{L.last ? `Bilan du ${fr(L.last.weekStart, { day: "numeric", month: "short" })} · ${L.last.done ? "Complété" : "Brouillon"}` : "Aucun bilan"}</span></div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8, margin: "14px 0 10px" }}>
                    {["Confiance clinique", "Qualité du suivi", "Clarté des conseils"].map((t, i) => <span key={t} className="flex justify-between" style={{ padding: "10px 12px", borderRadius: 4, background: "#f3f6f3", fontSize: 11.5 }}>{t}<b>{L.last?.scores?.[i] ? `${L.last.scores[i]} / 5` : "—"}</b></span>)}
                  </div>
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}><span style={{ fontSize: 10, color: D.muted }}>{L.month.patients} patients · {L.month.consultations} consultations ce mois · {L.month.toReview} cas à revoir</span><Btn kind="link" onClick={() => goTab("bilan")}>Compléter mon bilan →</Btn></div>
                </Card>
                <Card>
                  <div className="flex items-start justify-between" style={{ gap: 8 }}><span className="flex flex-col"><b style={{ fontSize: 16, fontWeight: 600 }}>Ce que mes patients me disent</b><span style={{ fontSize: 11, color: D.muted }}>Avis anonymisés · Partagés avec le consentement du patient</span></span><Btn kind="link" onClick={() => setInvite(true)} data-testid="invite-open">Recueillir un avis +</Btn></div>
                  <div style={{ marginTop: 8 }}>{L.feedback.map((f, i) => <FeedbackRow key={i} f={f} onAnalyse={() => askIn("avis", `Que puis-je retenir de cet avis patient : « ${f.comment} » (${f.rating}/5) ?`)} />)}
                    {!L.feedback.length && <p style={{ margin: "10px 0 0", fontSize: 11.5, color: D.muted }}>Aucun avis pour l'instant. Invitez un patient à donner le sien.</p>}</div>
                  <p style={{ margin: "10px 0 0", fontSize: 9.5, color: D.muted }}>La satisfaction ne mesure pas à elle seule la qualité clinique.</p>
                </Card>
                <Card style={{ background: D.tint3, border: 0 }}>
                  <b style={{ fontSize: 17, fontWeight: 600 }}>De mes observations à mon prochain pas</b>
                  <div className="flex flex-col" style={{ gap: 8, margin: "12px 0 16px" }}>
                    {L.goals.length ? L.goals.map((g, i) => <span key={i} className="flex" style={{ gap: 12, fontSize: 12 }}><b style={{ fontSize: 10, color: D.muted }}>{String(i + 1).padStart(2, "0")}</b>{g}</span>)
                      : <span style={{ fontSize: 11.5, color: D.muted }}>Terminez un bilan hebdomadaire pour fixer vos objectifs.</span>}
                  </div>
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    <Btn kind="primary" onClick={() => askIn("learn", L.goals[0] ? `Mon objectif est : « ${L.goals[0]} ». Proposez-moi un plan concret sur 4 semaines et des ressources pour l'atteindre.` : "Aidez-moi à choisir un objectif de progression concret pour mon cabinet ce mois-ci.")}>Explorer avec l'IA →</Btn>
                    <Btn kind="secondary" onClick={() => goTab("research")}>Ouvrir mon atelier de mémoire →</Btn>
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: 9.5, color: D.muted }}>Objectifs fixés par vous dans vos bilans.</p>
                </Card>
              </>
            )}

            {tab === "bilan" && R && form && (
              <>
                <Card>
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 10 }}>
                    <span className="flex flex-col"><b style={{ fontSize: 16, fontWeight: 600 }}>Semaine du {weekLabel(R.weekStart)}</b><span style={{ fontSize: 11, color: D.muted }}>Un moment pour prendre du recul.</span></span>
                    <Tag tone={done ? "ok" : "warn"}>{done ? "Complété" : R.review ? "Brouillon enregistré" : "Brouillon"}</Tag>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 14, border: `1px solid ${D.border}`, borderRadius: 8 }}>
                    {([[R.stats.patients, "patients suivis"], [R.stats.consultations, "consultations"], [R.stats.toReview, "cas à revoir"], [R.stats.toComplete, "retours à compléter"]] as [number, string][]).map(([v, l], i) => <div key={l} className="flex flex-col" style={{ padding: "12px 14px", borderLeft: i ? `1px solid ${D.border}` : 0 }}><b style={{ fontSize: 20, fontWeight: 600 }}>{String(v).padStart(2, "0")}</b><span style={{ fontSize: 10, color: D.muted }}>{l}</span></div>)}
                  </div>
                </Card>
                <Card>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>Mon regard sur la semaine</b>
                  {SCALES.map((t, i) => (
                    <div key={t} className="flex flex-wrap items-center justify-between" style={{ gap: 10, padding: "12px 0", borderBottom: i < 2 ? `1px solid ${D.sep}` : 0 }}>
                      <span style={{ fontSize: 12 }}>{t}</span>
                      <span className="flex" style={{ gap: 6 }}>{[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" disabled={done} onClick={() => setForm({ ...form, scores: form.scores.map((x, j) => (j === i ? n : x)) })} className="cursor-pointer" data-testid={`scale-${i}-${n}`}
                          style={{ width: 32, height: 32, border: 0, borderRadius: 4, background: form.scores[i] === n ? D.action : "#eef2ea", color: form.scores[i] === n ? "#fff" : D.muted, fontSize: 12, fontWeight: 600, fontFamily: FONT_UI }}>{n}</button>
                      ))}</span>
                    </div>
                  ))}
                </Card>
                <Card>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>Retours sur mes patients</b>
                  <p style={{ margin: "2px 0 10px", fontSize: 10.5, color: D.muted }}>À la fin du bilan, chaque retour rejoint la fiche de suivi du patient.</p>
                  {form.retours.map((r, i) => (
                    <div key={i} className="flex flex-col" style={{ gap: 8, padding: "12px 0", borderTop: i ? `1px solid ${D.sep}` : 0 }}>
                      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr auto", gap: 8 }}>
                        <Select disabled={done} value={r.patientId ?? ""} onChange={(e) => setForm({ ...form, retours: form.retours.map((x, j) => (j === i ? { ...x, patientId: Number(e.target.value) || null } : x)) })} style={{ width: "100%" }}>
                          <option value="">Choisir un patient suivi</option>{R.patients.map((p) => <option key={p.id} value={p.id}>Patient {patientCode(p.id)}{p.dx ? ` · ${p.dx}` : ""}</option>)}
                        </Select>
                        <Select disabled={done} value={r.evolution} onChange={(e) => setForm({ ...form, retours: form.retours.map((x, j) => (j === i ? { ...x, evolution: e.target.value } : x)) })} style={{ width: "100%" }}>{EVOS.map((x) => <option key={x}>{x}</option>)}</Select>
                        {!done && form.retours.length > 1 && <button type="button" aria-label="Retirer" onClick={() => setForm({ ...form, retours: form.retours.filter((_, j) => j !== i) })} className="cursor-pointer" style={{ border: 0, background: "none", color: D.faint }}><Trash2 size={14} /></button>}
                      </div>
                      <Textarea disabled={done} value={r.obs} onChange={(e) => setForm({ ...form, retours: form.retours.map((x, j) => (j === i ? { ...x, obs: e.target.value } : x)) })} rows={2} placeholder="Observation : évolution, tolérance, observance…" />
                    </div>
                  ))}
                  {!done && <Btn kind="link" onClick={() => setForm({ ...form, retours: [...form.retours, { patientId: null, evolution: "À réévaluer", obs: "" }] })}>+ Ajouter un retour</Btn>}
                  {!R.patients.length && <p style={{ margin: "6px 0 0", fontSize: 10.5, color: D.muted }}>Aucun patient en suivi actif pour l'instant.</p>}
                </Card>
                <Card className="flex flex-col" style={{ gap: 12 }}>
                  <label className="flex flex-col" style={{ gap: 6, fontSize: 12, fontWeight: 600 }}>Ce qui a bien marché cette semaine<Textarea disabled={done} value={form.good} onChange={(e) => setForm({ ...form, good: e.target.value })} rows={2} /></label>
                  <label className="flex flex-col" style={{ gap: 6, fontSize: 12, fontWeight: 600 }}>Mon objectif pour la semaine prochaine<Textarea disabled={done} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={2} /></label>
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 10 }}>
                    <span style={{ fontSize: 10.5, color: D.muted }}>{done ? "Bilan terminé. Vos retours sont rangés dans les dossiers de vos patients." : "Votre bilan reste privé dans votre espace médecin."}</span>
                    {!done && <span className="flex" style={{ gap: 8 }}><Btn kind="secondary" onClick={() => saveReview(false)}>Enregistrer le brouillon</Btn><Btn kind="primary" onClick={() => saveReview(true)} data-testid="bilan-finish">Terminer mon bilan</Btn></span>}
                  </div>
                </Card>
              </>
            )}

            {tab === "avis" && (
              <Card>
                <div className="flex flex-wrap items-start justify-between" style={{ gap: 10 }}>
                  <span className="flex flex-col"><b style={{ fontSize: 16, fontWeight: 600 }}>Avis patients</b><span style={{ fontSize: 11, color: D.muted }}>{F ? `${F.avg != null ? `${String(F.avg).replace(".", ",")} / 5 · ` : ""}${F.items.length} avis · ${F.invitations} invitation${F.invitations > 1 ? "s" : ""}` : "Chargement…"}</span></span>
                  <Btn kind="primary" onClick={() => setInvite(true)}>Recueillir un avis +</Btn>
                </div>
                <div style={{ marginTop: 10 }}>{(F?.items || []).map((f, i) => <FeedbackRow key={i} f={f} onAnalyse={() => askIn("avis", `Que puis-je retenir de cet avis patient : « ${f.comment} » (${f.rating}/5) ?`)} />)}
                  {F && !F.items.length && <p style={{ margin: "10px 0 0", fontSize: 11.5, color: D.muted }}>Aucun avis pour l'instant.</p>}</div>
                <p style={{ margin: "12px 0 0", fontSize: 9.5, color: D.muted }}>La satisfaction ne mesure pas à elle seule la qualité clinique. Les avis sont affichés sans l'identité du patient.</p>
              </Card>
            )}

            {tab === "research" && doc && (
              <>
                <Card>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>Chercher dans PubMed</b>
                  <div className="flex" style={{ gap: 8, marginTop: 10 }}>
                    <Input value={pq} onChange={(e) => setPq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") pubmed(); }} placeholder="Mots-clés (en anglais), ex. acne patient education adherence" data-testid="pubmed-q" />
                    <Btn kind="primary" disabled={pbusy || !pq.trim()} onClick={pubmed}>{pbusy ? "Recherche…" : "Rechercher →"}</Btn>
                  </div>
                  {perr && <p style={{ margin: "8px 0 0", fontSize: 11, color: D.err }}>PubMed ne répond pas. <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(pq)}`} target="_blank" rel="noopener noreferrer" style={{ color: D.action }}>Ouvrir la recherche sur PubMed →</a></p>}
                  {pres && <p style={{ margin: "8px 0 4px", fontSize: 10.5, color: D.muted }}>{pres.length ? `${pres.length} résultats PubMed · par pertinence` : "Aucun résultat · essayez d'autres mots-clés"}</p>}
                  {(pres || []).map((r) => { const on = doc.library.some((c) => c.id === r.id); return (
                    <div key={r.id} className="flex items-start justify-between" style={{ gap: 10, padding: "9px 0", borderTop: `1px solid ${D.sep}` }}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-col no-underline" style={{ color: D.text }}><b style={{ fontSize: 11.5, fontWeight: 600 }}>{r.title}</b><span style={{ fontSize: 9.5, color: D.muted }}>{r.meta}</span></a>
                      <Btn kind="secondary" onClick={() => upDoc({ library: on ? doc.library.filter((c) => c.id !== r.id) : [...doc.library, r] })} style={{ height: 28, flex: "none", background: on ? D.tintChip : "#fff" }}>{on ? "Ajoutée ✓" : "+ Bibliothèque"}</Btn>
                    </div>
                  ); })}
                </Card>
                <Card className="flex flex-col" style={{ gap: 12 }}>
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
                    <span style={{ fontSize: 10, color: D.muted }}>{dirty ? "Modifications non enregistrées" : savedAt ? `Enregistré le ${fr(savedAt, { day: "numeric", month: "short" })} à ${new Date(savedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Nouveau document"}</span>
                    <span className="flex flex-wrap" style={{ gap: 8 }}>
                      <Btn kind="secondary" onClick={() => upDoc({ sections: PLAN.map((t) => ({ t, b: doc.sections.find((s) => s.t === t)?.b || "" })) })} style={{ height: 32 }}>Insérer le plan proposé</Btn>
                      <Btn kind="secondary" onClick={() => exportDoc("word")} style={{ height: 32 }}>Word</Btn>
                      <Btn kind="secondary" onClick={() => exportDoc("pdf")} style={{ height: 32 }}>PDF</Btn>
                      <Btn kind="primary" onClick={saveDoc} style={{ height: 32 }} disabled={!dirty}>{dirty ? "Enregistrer" : "Enregistré ✓"}</Btn>
                    </span>
                  </div>
                  <Input value={doc.title} onChange={(e) => upDoc({ title: e.target.value })} style={{ height: 42, fontSize: 16, fontWeight: 600, background: "#fff" }} data-testid="research-title" />
                  {doc.sections.map((s, i) => (
                    <div key={i} onClick={() => setFocus(i)} className="flex flex-col" style={{ gap: 6, padding: 12, borderRadius: 8, border: `1px solid ${i === focus ? "#9dc3a9" : D.border}` }}>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <b style={{ fontSize: 10, color: D.muted }}>{String(i + 1).padStart(2, "0")}</b>
                        <Input value={s.t} onChange={(e) => upDoc({ sections: doc.sections.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)) })} style={{ height: 30, fontWeight: 600, background: "#fff" }} />
                        <button type="button" aria-label="Retirer la section" onClick={(e) => { e.stopPropagation(); upDoc({ sections: doc.sections.filter((_, j) => j !== i) }); setFocus(0); }} className="cursor-pointer" style={{ border: 0, background: "none", color: D.faint }}><Trash2 size={13} /></button>
                      </div>
                      <Textarea value={s.b} onChange={(e) => upDoc({ sections: doc.sections.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)) })} rows={4} style={{ background: "#fff" }} />
                    </div>
                  ))}
                  <Btn kind="link" onClick={() => { upDoc({ sections: [...doc.sections, { t: "Nouvelle section", b: "" }] }); setFocus(doc.sections.length); }} style={{ alignSelf: "flex-start" }}>+ Ajouter une section</Btn>
                </Card>
                <Card>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>Bibliothèque · {doc.library.length} référence{doc.library.length > 1 ? "s" : ""}</b>
                  <p style={{ margin: "2px 0 8px", fontSize: 10, color: D.muted }}>Auteurs et PMID à vérifier sur PubMed. « Citer » ajoute [n] à la section sélectionnée ({doc.sections[focus]?.t || "—"}).</p>
                  {doc.library.map((c, i) => (
                    <div key={c.id || i} className="flex items-start justify-between" style={{ gap: 10, padding: "8px 0", borderTop: `1px solid ${D.sep}` }}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-col no-underline" style={{ color: D.text }}><span style={{ fontSize: 11.5 }}><b>[{i + 1}]</b> {c.title}</span><span style={{ fontSize: 9.5, color: D.muted }}>{c.meta}</span></a>
                      <span className="flex flex-none" style={{ gap: 6 }}>
                        <Btn kind="link" onClick={() => upDoc({ sections: doc.sections.map((x, j) => (j === focus ? { ...x, b: `${x.b.replace(/\s+$/, "")} [${i + 1}]` } : x)) })}>Citer</Btn>
                        <button type="button" aria-label="Retirer" onClick={() => upDoc({ library: doc.library.filter((_, j) => j !== i) })} className="cursor-pointer" style={{ border: 0, background: "none", color: D.faint }}><Trash2 size={13} /></button>
                      </span>
                    </div>
                  ))}
                  {!doc.library.length && <span style={{ fontSize: 11, color: D.muted }}>Ajoutez des références depuis PubMed.</span>}
                </Card>
              </>
            )}
          </div>

          {tab === "bilan" ? (
            <div className="flex flex-col" style={{ gap: 16 }}>
              <Card>
                <b style={{ fontSize: 14, fontWeight: 600 }}>Mes semaines</b>
                {weeks.map((w) => { const h = R?.history.find((x) => x.weekStart === w); return (
                  <button key={w} type="button" onClick={() => setWeek(w)} className="flex w-full cursor-pointer items-center justify-between text-left"
                    style={{ gap: 8, marginTop: 6, padding: "9px 10px", border: 0, borderRadius: 4, background: w === week ? "#eef4ec" : "transparent", fontFamily: FONT_UI, color: D.text }}>
                    <span style={{ fontSize: 11.5 }}>Semaine du {fr(w, { day: "numeric", month: "short" })}</span>
                    <Tag tone={h?.done ? "ok" : "warn"}>{h?.done ? "Complété" : h ? "Brouillon" : "À faire"}</Tag>
                  </button>
                ); })}
              </Card>
              <Card style={{ background: D.tint3, border: 0 }}>
                <b style={{ fontSize: 13, fontWeight: 600 }}>Pourquoi ce bilan ?</b>
                <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.55 }}>Cinq minutes par semaine pour noter ce qui marche, documenter l'évolution de vos patients et fixer un objectif. Vos objectifs alimentent « Mon apprentissage ».</p>
                <Btn kind="link" onClick={() => go("/derm/activite")} style={{ marginTop: 8 }}>Voir mon activité →</Btn>
              </Card>
            </div>
          ) : (
            <LearnAssistant mode={mode} ask={ask} onAsked={() => setAsk(null)} doc={tab === "research" && doc ? { title: doc.title, sections: doc.sections } : undefined} />
          )}
        </section>
      </Page>
      {invite && <InviteModal onClose={() => setInvite(false)} onDone={(t) => { setInvite(false); setMsg({ t, tone: "ok" }); qc.invalidateQueries({ queryKey: ["/api/derm/feedback"] }); qc.invalidateQueries({ queryKey: ["/api/derm/learning"] }); }} />}
    </DermShell>
  );
}
