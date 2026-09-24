import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useSubscription } from "@/hooks/use-subscription";
import { GsTopBar } from "@/components/GsTopBar";
import { ResultCard } from "@/components/ResultCard";
import { GS, GsMono, GsMarks, useGsFonts } from "@/lib/gs-ui";
import {
  Loader2, ArrowLeft, ArrowRight, ChevronRight, Settings, ScanFace,
  MessageCircle, Package, FileText, ListChecks, GitCompare, Download,
  ShieldCheck, Trash2, Check, X, Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { AnalysisResult } from "@shared/schema";

// ════════════════════════════════════════════════════════════════════════
// PROFIL PATIENT — refonte fidèle au design (Profil.dc.html) : trois écrans
//   PR1 Profil       — état de la peau + prochaine action + raccourcis
//   PR2 Historique   — timeline analyses / consultations / achats + comparaison
//   PR3 Réglages     — compte, rappels, données de santé (RGPD)
// Langage gs-ui (encre/turquoise, IBM Plex, angles droits). Tout est câblé aux
// vraies données/endpoints — aucun bouton mort. Fidélité/parrainage retirés.
// ════════════════════════════════════════════════════════════════════════

const AREA_LABELS: Record<string, string> = { face: "Visage", body: "Corps", hair: "Cheveux" };

type ScanRecord = {
  id: number; area: string; condition: string | null; analysis: string | null;
  recommendations: unknown; score: number | null; motivation: string | null;
  createdAt: Date | null; imageUrl: string | null;
};

function scanToAnalysisResult(scan: ScanRecord): AnalysisResult {
  const recs = (scan.recommendations as any) || {};
  if (recs._fullResult) return recs._fullResult as AnalysisResult;
  return {
    condition: scan.condition || "Analyse", severity: "modérée", score: scan.score || 0,
    skinType: "Normal", details: scan.analysis || "", motivation: scan.motivation || "",
    stats: { lesions: "–", zones: "–", pores: "–", marks: "–" },
    balance: { inflammation: 50, sebum: 50, pores: 50, sensitivity: 50, scars: 50 },
    recommendations: {
      products: Array.isArray(recs.products) ? recs.products : [],
      morning: Array.isArray(recs.morning) ? recs.morning : [],
      evening: Array.isArray(recs.evening) ? recs.evening : [],
      weekly: recs.weekly || "",
    },
  };
}

const fmtDate = (d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
  d ? new Date(d).toLocaleDateString("fr-FR", opts || { day: "2-digit", month: "short" }) : "";
const fmtShort = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";

// ── Modale : détail d'une analyse (réutilise ResultCard) ──────────────────
function ScanDetailModal({ scan, onClose }: { scan: ScanRecord; onClose: () => void }) {
  const { user } = useAuth();
  const result = scanToAnalysisResult(scan);
  return (
    <div data-clarity-mask="true" style={{ position: "fixed", inset: 0, zIndex: 300, background: GS.mintBg, overflowY: "auto", fontFamily: GS.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", borderBottom: `1px solid ${GS.line}` }}>
        <button onClick={onClose} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 0 }}><ArrowLeft className="w-5 h-5" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: GS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scan.condition || "Analyse"}</div>
          <GsMono style={{ letterSpacing: 0 }}>{fmtDate(scan.createdAt, { day: "numeric", month: "long", year: "numeric" })}</GsMono>
        </div>
        <div style={{ fontFamily: GS.mono, fontSize: 16, fontWeight: 600, color: GS.ink, fontVariantNumeric: "tabular-nums" }}>{scan.score ?? 0}<span style={{ fontSize: 10, color: GS.faint }}>/100</span></div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 16px 40px" }}>
        <ResultCard result={result} scanId={scan.id} area={scan.area as any} imageUrl={(scan as any).imageUrl || null} userFirstName={(user as any)?.firstName || null} />
      </div>
    </div>
  );
}

// ── Modale : comparaison de deux analyses ─────────────────────────────────
function CompareModal({ scanA, scanB, onClose }: { scanA: ScanRecord; scanB: ScanRecord; onClose: () => void }) {
  const delta = (scanB.score || 0) - (scanA.score || 0);
  const deltaColor = delta > 0 ? GS.teal : delta < 0 ? GS.red : GS.muted;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: GS.mintBg, overflowY: "auto", fontFamily: GS.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", borderBottom: `1px solid ${GS.line}` }}>
        <button onClick={onClose} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 0 }}><ArrowLeft className="w-5 h-5" /></button>
        <div style={{ fontSize: 15, fontWeight: 600, color: GS.ink }}>Comparaison</div>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ border: `1px solid ${GS.line}`, padding: 16 }}>
          <GsMono style={{ display: "block", marginBottom: 14 }}>Évolution du Glow Score</GsMono>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <GsMono style={{ letterSpacing: 0 }}>{fmtDate(scanA.createdAt, { day: "numeric", month: "short", year: "numeric" })}</GsMono>
              <div style={{ fontFamily: GS.mono, fontSize: 34, fontWeight: 600, color: GS.ink, letterSpacing: "-1px", marginTop: 4 }}>{scanA.score ?? 0}</div>
              <div style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>{AREA_LABELS[scanA.area] || scanA.area}</div>
            </div>
            <div style={{ textAlign: "center", flex: "none" }}>
              <div style={{ fontFamily: GS.mono, fontSize: 22, fontWeight: 600, color: deltaColor }}>{delta > 0 ? `+${delta}` : delta}</div>
              <GsMono style={{ letterSpacing: 0 }}>PTS</GsMono>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <GsMono style={{ letterSpacing: 0 }}>{fmtDate(scanB.createdAt, { day: "numeric", month: "short", year: "numeric" })}</GsMono>
              <div style={{ fontFamily: GS.mono, fontSize: 34, fontWeight: 600, color: GS.ink, letterSpacing: "-1px", marginTop: 4 }}>{scanB.score ?? 0}</div>
              <div style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>{AREA_LABELS[scanB.area] || scanB.area}</div>
            </div>
          </div>
        </div>
        <div style={{ border: `1px solid ${GS.line}`, padding: 16 }}>
          <GsMono style={{ display: "block", marginBottom: 12 }}>Condition détectée</GsMono>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: GS.line, border: `1px solid ${GS.line}` }}>
            <div style={{ background: "#fff", padding: 12 }}><GsMono style={{ letterSpacing: 0 }}>{fmtDate(scanA.createdAt)}</GsMono><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 4 }}>{scanA.condition || "–"}</div></div>
            <div style={{ background: GS.mintBg, padding: 12 }}><GsMono color={GS.teal} style={{ letterSpacing: 0 }}>{fmtDate(scanB.createdAt)}</GsMono><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 4 }}>{scanB.condition || "–"}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Interrupteur (toggle) au langage design ───────────────────────────────
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{ width: 36, height: 20, flex: "none", padding: 0, cursor: "pointer", position: "relative", background: on ? GS.ink : "#fff", border: on ? "none" : `1px solid ${GS.disabled}`, boxSizing: "border-box" }}>
      <span style={{ position: "absolute", top: on ? 3 : 2, [on ? "right" : "left"]: on ? 3 : 2, width: 14, height: 14, background: on ? GS.accent : GS.disabled } as React.CSSProperties} />
    </button>
  );
}

export default function Profile() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { data: scans, isLoading: scansLoading } = useScans();
  const { isPremium, data: subData } = useSubscription();
  const [, setLocation] = useLocation();
  useGsFonts();

  const [view, setView] = useState<"profil" | "history" | "settings">("profil");
  const [histFilter, setHistFilter] = useState<"tout" | "analyses" | "consult" | "achats">("tout");
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSel, setCompareSel] = useState<number[]>([]);
  const [compareScans, setCompareScans] = useState<{ a: ScanRecord; b: ScanRecord } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Préférences de rappel (par appareil).
  const [remRoutine, setRemRoutine] = useState(true);
  const [remRescan, setRemRescan] = useState(true);
  const [remWhatsapp, setRemWhatsapp] = useState(false);
  useEffect(() => {
    try {
      const r = localStorage.getItem("gs_rem_routine"); if (r != null) setRemRoutine(r === "1");
      const s = localStorage.getItem("gs_rem_rescan"); if (s != null) setRemRescan(s === "1");
      const w = localStorage.getItem("gs_rem_whatsapp"); if (w != null) setRemWhatsapp(w === "1");
    } catch {}
  }, []);
  const persist = (k: string, v: boolean, set: (b: boolean) => void) => { set(v); try { localStorage.setItem(k, v ? "1" : "0"); } catch {} };

  const { data: consultData } = useQuery<{ consultations: any[] }>({ queryKey: ["/api/consultations/mine"], enabled: !!user });
  const { data: ordersData } = useQuery<any[]>({ queryKey: ["/api/orders"], enabled: !!user });
  const { data: routineData } = useQuery<any>({ queryKey: ["/api/routines"], enabled: !!user });

  if (authLoading || scansLoading) {
    return (
      <div style={{ minHeight: "100dvh", background: GS.mintBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.sans }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GS.teal }} />
      </div>
    );
  }
  if (!user) { window.location.href = "/auth"; return null; }

  const scanList: ScanRecord[] = Array.isArray(scans) ? (scans as any[]) : [];
  const consultations: any[] = consultData?.consultations || [];
  const orders: any[] = Array.isArray(ordersData) ? ordersData : [];
  const routines: any[] = routineData?.routines || [];
  const evening = routines.find((r) => r.period === "evening");
  const morning = routines.find((r) => r.period === "morning");
  const todayCompletions: number[] = routineData?.todayCompletions || [];
  const streak = routineData?.stats?.streak || 0;

  // ── Métriques dérivées (PR1) ──
  const scored = scanList.filter((s) => typeof s.score === "number");
  const latest = scored[0];
  const latestScore = latest?.score ?? 0;
  const prevScore = scored[1]?.score ?? null;
  const scoreDelta = prevScore != null ? latestScore - prevScore : null;
  const last3 = scored.slice(0, 3).reverse(); // ancien → récent
  const lastFull: any = (latest?.recommendations as any)?._fullResult || {};
  const phototype = lastFull.fitzpatrick || lastFull.phototype || null;
  const skinType = lastFull.skinType || null;
  const phototypeLine = [phototype ? `PHOTOTYPE ${String(phototype).toUpperCase()}` : null, skinType ? String(skinType).toUpperCase() : null].filter(Boolean).join(" · ") || "PROFIL PATIENT";
  const daysSince = latest?.createdAt ? Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86400000) : null;
  const nextIn = daysSince != null ? Math.max(0, 7 - daysSince) : null;

  const consultOngoing = consultations.filter((c) => c.status && c.status !== "closed").length;
  const ordersInDelivery = orders.filter((o) => /livr|shipp|delivery|cours/i.test(String(o.status || ""))).length;
  const ordonnancesCount = consultations.filter((c) => c.status === "closed" || c.reportStatus).length;

  const eveDone = (evening?.steps || []).filter((s: any) => todayCompletions.includes(s.id)).length;
  const eveTotal = (evening?.steps || []).length;

  const openScan = (s: ScanRecord) => setSelectedScan(s);
  const toggleCompare = (id: number) => setCompareSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : (prev.length >= 2 ? prev : [...prev, id]));
  const launchCompare = () => {
    if (compareSel.length < 2) return;
    const a = scanList.find((s) => s.id === compareSel[0]);
    const b = scanList.find((s) => s.id === compareSel[1]);
    if (a && b) {
      const [x, y] = [a, b].sort((m, n) => new Date(m.createdAt!).getTime() - new Date(n.createdAt!).getTime());
      setCompareScans({ a: x as ScanRecord, b: y as ScanRecord });
    }
  };
  const doDelete = async () => {
    if (!confirm("Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/me", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "SUPPRIMER" }) });
      if (res.ok) { window.location.href = "/"; return; }
      alert("Suppression impossible. Réessayez ou contactez le support.");
    } catch { alert("Erreur réseau."); } finally { setDeleting(false); }
  };
  const doLogout = () => { try { logout(); } catch {} setLocation("/auth"); };

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: "100dvh", background: GS.mintBg, fontFamily: GS.sans, color: GS.ink }}>
      <GsTopBar />
      <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: "16px 24px 40px", boxSizing: "border-box" }}>{children}</div>
    </div>
  );

  // ════════ PR3 · RÉGLAGES & DONNÉES ════════
  if (view === "settings") {
    const rowLine: React.CSSProperties = { padding: 12, borderBottom: `1px solid ${GS.hair}`, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" };
    return shell(<>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <button onClick={() => setView("profil")} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 0 }}><ArrowLeft className="w-5 h-5" /></button>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px" }}>Réglages</div>
      </div>

      <GsMono style={{ display: "block", marginBottom: 8 }}>Compte</GsMono>
      <div style={{ border: `1px solid ${GS.line}`, marginBottom: 16 }}>
        <div style={rowLine}><span style={{ fontSize: 12, color: GS.muted }}>Téléphone</span><span style={{ fontFamily: GS.mono, fontSize: 12, color: GS.ink }}>{(user as any).phone || "—"}</span></div>
        <div style={rowLine}><span style={{ fontSize: 12, color: GS.muted }}>Email</span><span style={{ fontSize: 12, color: GS.ink, wordBreak: "break-all" }}>{(user as any).email || "—"}</span></div>
        <div style={{ ...rowLine, borderBottom: "none" }}><span style={{ fontSize: 12, color: GS.muted }}>Mot de passe · 2FA email</span><GsMono color={GS.teal} style={{ letterSpacing: 0 }}>ACTIVÉE</GsMono></div>
      </div>

      <GsMono style={{ display: "block", marginBottom: 8 }}>Rappels</GsMono>
      <div style={{ border: `1px solid ${GS.line}`, marginBottom: 16 }}>
        <div style={rowLine}><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Routine matin et soir</span><Toggle on={remRoutine} onClick={() => persist("gs_rem_routine", !remRoutine, setRemRoutine)} /></div>
        <div style={rowLine}><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Nouvelle analyse conseillée</span><Toggle on={remRescan} onClick={() => persist("gs_rem_rescan", !remRescan, setRemRescan)} /></div>
        <div style={{ ...rowLine, borderBottom: "none" }}><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Messages sur WhatsApp</span><Toggle on={remWhatsapp} onClick={() => persist("gs_rem_whatsapp", !remWhatsapp, setRemWhatsapp)} /></div>
      </div>

      <GsMono style={{ display: "block", marginBottom: 8 }}>Mes données de santé</GsMono>
      <div style={{ border: `1px solid ${GS.line}`, marginBottom: 24 }}>
        <a href="/api/user/me/export" style={{ ...rowLine, textDecoration: "none" }}><Download size={16} style={{ color: GS.ink, flex: "none" }} /><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Exporter mon dossier (données + photos)</span><ChevronRight size={15} style={{ color: GS.faint, flex: "none" }} /></a>
        <a href="/confidentialite" style={{ ...rowLine, textDecoration: "none" }}><ShieldCheck size={16} style={{ color: GS.ink, flex: "none" }} /><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Consentements &amp; confidentialité</span><ChevronRight size={15} style={{ color: GS.faint, flex: "none" }} /></a>
        <button onClick={doDelete} disabled={deleting} style={{ ...rowLine, borderBottom: "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}><Trash2 size={16} style={{ color: GS.red, flex: "none" }} /><span style={{ flex: 1, fontSize: 12, color: GS.red }}>{deleting ? "Suppression…" : "Supprimer mon compte"}</span><ChevronRight size={15} style={{ color: GS.faint, flex: "none" }} /></button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <a href="https://wa.me/237674377959" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 11, border: `1px solid ${GS.line}`, padding: 12, textDecoration: "none" }}>
          <MessageCircle size={16} style={{ color: GS.teal, flex: "none" }} /><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Aide · WhatsApp GlowScan</span><ArrowRight size={15} style={{ color: GS.ink, flex: "none" }} />
        </a>
        <button onClick={doLogout} style={{ background: "#fff", border: `1px solid ${GS.ink}`, color: GS.ink, padding: 14, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Se déconnecter</button>
      </div>
    </>);
  }

  // ════════ PR2 · HISTORIQUE ════════
  if (view === "history") {
    type Item = { kind: "analyse" | "consult" | "achat"; date: Date | null; scan?: ScanRecord; node: React.ReactNode };
    const items: Item[] = [];
    if (histFilter === "tout" || histFilter === "achats") {
      orders.forEach((o) => {
        const first = Array.isArray(o.items) && o.items[0] ? (typeof o.items[0] === "string" ? o.items[0] : o.items[0]?.name) : "Commande";
        const amount = o.total ?? o.amount ?? o.totalFcfa;
        items.push({ kind: "achat", date: o.createdAt ? new Date(o.createdAt) : null, node: (
          <div style={{ position: "relative", border: `1px solid ${GS.line}`, padding: 12 }}>
            <span style={{ position: "absolute", left: -22, top: 15, width: 9, height: 9, background: GS.accent }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><GsMono color={GS.teal} style={{ letterSpacing: ".06em" }}>COMMANDE{o.status ? ` · ${String(o.status).toUpperCase()}` : ""}</GsMono><GsMono style={{ letterSpacing: 0 }}>{fmtShort(o.createdAt)}</GsMono></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 5 }}>{first}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><GsMono style={{ letterSpacing: 0 }}>{o.orderNumber || ""}</GsMono>{amount != null && <span style={{ fontFamily: GS.mono, fontSize: 11, fontWeight: 600, color: GS.ink }}>{Number(amount).toLocaleString("fr-FR")} F</span>}</div>
          </div>
        ) });
      });
    }
    if (histFilter === "tout" || histFilter === "consult") {
      consultations.forEach((c) => {
        items.push({ kind: "consult", date: c.createdAt ? new Date(c.createdAt) : null, node: (
          <div style={{ position: "relative", border: `1px solid ${GS.line}`, padding: 12 }}>
            <span style={{ position: "absolute", left: -22, top: 15, width: 9, height: 9, border: `1px solid ${GS.accent}`, background: GS.mintTint }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><GsMono color={GS.teal} style={{ letterSpacing: ".06em" }}>CONSULTATION{c.status ? ` · ${String(c.status).toUpperCase()}` : ""}</GsMono><GsMono style={{ letterSpacing: 0 }}>{fmtShort(c.createdAt)}</GsMono></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 5 }}>{c.condition || "Consultation dermatologue"}</div>
            {c.reportStatus && <div style={{ fontSize: 11, color: GS.muted, marginTop: 3 }}>Compte rendu transmis</div>}
          </div>
        ) });
      });
    }
    if (histFilter === "tout" || histFilter === "analyses") {
      scanList.forEach((s) => {
        items.push({ kind: "analyse", date: s.createdAt ? new Date(s.createdAt) : null, scan: s, node: (
          <button onClick={() => openScan(s)} style={{ position: "relative", border: `1px solid ${GS.line}`, padding: 12, display: "flex", gap: 12, alignItems: "center", width: "100%", background: "#fff", cursor: "pointer", textAlign: "left" }}>
            <span style={{ position: "absolute", left: -22, top: 15, width: 9, height: 9, border: `1px solid ${GS.disabled}`, background: "#fff" }} />
            <div style={{ width: 46, height: 46, flex: "none", background: GS.panel, border: `1px solid ${GS.line}`, overflow: "hidden" }}>{s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><GsMono style={{ letterSpacing: ".06em" }}>ANALYSE · {(AREA_LABELS[s.area] || s.area).toUpperCase()}</GsMono><GsMono style={{ letterSpacing: 0 }}>{fmtShort(s.createdAt)}</GsMono></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 5 }}><span style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>{s.condition || "Analyse"}</span><span style={{ fontFamily: GS.mono, fontSize: 13, fontWeight: 600, color: GS.ink }}>{s.score ?? "–"}</span></div>
            </div>
          </button>
        ) });
      });
    }
    items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    const filters: { k: typeof histFilter; label: string }[] = [
      { k: "tout", label: "TOUT" }, { k: "analyses", label: "ANALYSES" }, { k: "consult", label: "CONSULT." }, { k: "achats", label: "ACHATS" },
    ];
    return shell(<>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <button onClick={() => { setView("profil"); setCompareMode(false); setCompareSel([]); }} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 0 }}><ArrowLeft className="w-5 h-5" /></button>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px" }}>Historique</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: `1px solid ${GS.ink}`, marginBottom: 16 }}>
        {filters.map((f, i) => {
          const on = histFilter === f.k;
          return <button key={f.k} onClick={() => setHistFilter(f.k)} style={{ padding: "10px 0", textAlign: "center", fontFamily: GS.mono, fontSize: 9, fontWeight: 600, letterSpacing: ".06em", cursor: "pointer", border: "none", borderLeft: i > 0 ? `1px solid ${GS.ink}` : "none", background: on ? GS.ink : "#fff", color: on ? "#fff" : GS.ink }}>{f.label}</button>;
        })}
      </div>

      {compareMode && (
        <div style={{ border: `1px solid ${GS.accent}`, background: GS.mintBg, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Sélectionnez 2 analyses · {compareSel.length}/2</span>
          <button disabled={compareSel.length < 2} onClick={launchCompare} style={{ background: compareSel.length < 2 ? GS.disabled : GS.ink, color: "#fff", border: "none", fontFamily: GS.mono, fontSize: 10, fontWeight: 600, padding: "8px 12px", cursor: compareSel.length < 2 ? "not-allowed" : "pointer" }}>COMPARER</button>
          <button onClick={() => { setCompareMode(false); setCompareSel([]); }} aria-label="Annuler" style={{ background: "none", border: "none", cursor: "pointer", color: GS.muted, display: "flex" }}><X size={16} /></button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ border: `1px solid ${GS.line}`, padding: 24, textAlign: "center", fontSize: 12.5, color: GS.muted }}>Rien pour l'instant dans cette catégorie.</div>
      ) : (
        <div style={{ borderLeft: `1px solid ${GS.line}`, paddingLeft: 16, marginLeft: 5, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it, i) => (
            compareMode && it.kind === "analyse" && it.scan ? (
              <button key={i} onClick={() => toggleCompare(it.scan!.id)} style={{ position: "relative", border: `1px solid ${compareSel.includes(it.scan.id) ? GS.ink : GS.line}`, background: compareSel.includes(it.scan.id) ? GS.mintBg : "#fff", padding: 12, display: "flex", gap: 12, alignItems: "center", width: "100%", cursor: "pointer", textAlign: "left" }}>
                <span style={{ position: "absolute", left: -22, top: 15, width: 9, height: 9, border: `1px solid ${GS.disabled}`, background: "#fff" }} />
                <span style={{ width: 22, height: 22, flex: "none", border: `1px solid ${GS.ink}`, display: "flex", alignItems: "center", justifyContent: "center", background: compareSel.includes(it.scan.id) ? GS.ink : "#fff" }}>{compareSel.includes(it.scan.id) && <Check size={13} style={{ color: GS.accent }} strokeWidth={3} />}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><GsMono style={{ letterSpacing: ".06em" }}>ANALYSE · {(AREA_LABELS[it.scan.area] || it.scan.area).toUpperCase()}</GsMono><GsMono style={{ letterSpacing: 0 }}>{fmtShort(it.scan.createdAt)}</GsMono></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 5 }}><span style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>{it.scan.condition || "Analyse"}</span><span style={{ fontFamily: GS.mono, fontSize: 13, fontWeight: 600, color: GS.ink }}>{it.scan.score ?? "–"}</span></div>
                </div>
              </button>
            ) : <div key={i}>{it.node}</div>
          ))}
        </div>
      )}

      {scored.length >= 2 && !compareMode && (
        <div style={{ marginTop: 22 }}>
          <button onClick={() => { setCompareMode(true); setCompareSel([]); setHistFilter("analyses"); }} style={{ width: "100%", background: "#fff", border: `1px solid ${GS.ink}`, color: GS.ink, padding: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <GitCompare size={16} /> Comparer deux analyses
          </button>
        </div>
      )}

      {selectedScan && <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />}
      {compareScans && <CompareModal scanA={compareScans.a} scanB={compareScans.b} onClose={() => { setCompareScans(null); setCompareMode(false); setCompareSel([]); }} />}
    </>);
  }

  // ════════ PR1 · PROFIL ════════
  const tiles = [
    { icon: ScanFace, label: "Analyses", meta: `${scanList.length} RAPPORT${scanList.length > 1 ? "S" : ""}`, metaColor: GS.muted, onClick: () => { setHistFilter("analyses"); setView("history"); } },
    { icon: MessageCircle, label: "Consultations", meta: consultOngoing > 0 ? `${consultOngoing} EN COURS` : `${consultations.length} AU TOTAL`, metaColor: consultOngoing > 0 ? GS.teal : GS.muted, onClick: () => setLocation("/consultations") },
    { icon: Package, label: "Commandes", meta: ordersInDelivery > 0 ? `${ordersInDelivery} EN LIVRAISON` : `${orders.length} AU TOTAL`, metaColor: GS.muted, onClick: () => { setHistFilter("achats"); setView("history"); } },
    { icon: FileText, label: "Ordonnances", meta: `${ordonnancesCount} VALABLE${ordonnancesCount > 1 ? "S" : ""}`, metaColor: GS.muted, onClick: () => { setHistFilter("consult"); setView("history"); } },
  ];

  return shell(<>
    {/* En-tête profil */}
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 58, height: 58, flex: "none", border: `1px solid ${GS.line}`, background: GS.panel, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.mono, fontSize: 22, fontWeight: 600, color: GS.ink }}>
        {(user.firstName || "U").charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 600, color: GS.ink, letterSpacing: "-.4px" }}>{user.firstName || "Mon profil"}</div>
        <GsMono style={{ letterSpacing: 0, marginTop: 3, display: "block" }}>{phototypeLine}</GsMono>
      </div>
      <button onClick={() => setView("settings")} aria-label="Réglages" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 4 }}><Settings size={20} /></button>
    </div>

    {/* Carte Glow Score */}
    <div style={{ position: "relative", marginTop: 18, border: `1px solid ${GS.ink}`, padding: 16 }}>
      <GsMarks />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <GsMono style={{ letterSpacing: ".14em" }}>Glow Score · {scored.length} analyse{scored.length > 1 ? "s" : ""}</GsMono>
        {scoreDelta != null && scoreDelta !== 0 && <GsMono color={GS.teal} style={{ letterSpacing: 0 }}>{scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} PTS</GsMono>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 10 }}>
        <div style={{ fontFamily: GS.mono, fontSize: 40, fontWeight: 600, color: GS.ink, letterSpacing: "-1.5px", lineHeight: 1 }}>{latestScore}<span style={{ fontSize: 14, color: GS.muted }}>/100</span></div>
        {last3.length >= 2 && (
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6, height: 44 }}>
            {last3.map((s, i) => {
              const isLast = i === last3.length - 1;
              const h = Math.max(8, Math.round(((s.score || 0) / 100) * 40));
              return <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: h, background: isLast ? GS.grad : (i === last3.length - 2 ? GS.accentMint : "#C9EFE8") }} />
                <span style={{ fontFamily: GS.mono, fontSize: 8, fontWeight: isLast ? 600 : 400, color: isLast ? GS.ink : GS.muted }}>{s.score}</span>
              </div>;
            })}
          </div>
        )}
      </div>
      {nextIn != null && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTop: `1px solid ${GS.line}` }}>
          <span style={{ fontSize: 12, color: GS.ink }}>Prochaine analyse conseillée</span>
          <GsMono style={{ letterSpacing: 0, color: GS.ink }}>{nextIn === 0 ? "MAINTENANT" : `DANS ${nextIn} J`}</GsMono>
        </div>
      )}
    </div>

    {/* Bandeau Premium */}
    {isPremium ? (
      <button onClick={() => setLocation("/premium")} style={{ marginTop: 12, width: "100%", border: `1px solid ${GS.accent}`, background: GS.mintBg, padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
        <span style={{ background: GS.grad, padding: "4px 8px", fontFamily: GS.mono, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: GS.deep, flex: "none" }}>PREMIUM</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: GS.ink }}>Actif{subData?.subscription?.expiresAt ? ` jusqu'au ${fmtShort(subData.subscription.expiresAt)}` : ""}</div>
        </div>
        <GsMono style={{ letterSpacing: 0, color: GS.ink }}>GÉRER</GsMono>
      </button>
    ) : (
      <button onClick={() => setLocation("/premium")} style={{ marginTop: 12, width: "100%", border: `1px solid ${GS.accent}`, background: GS.mintBg, padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Passer Premium · 2 000 F/mois</div>
          <GsMono style={{ letterSpacing: 0, marginTop: 3, display: "block" }}>SCAN PRODUIT · ROUTINE · SUIVI</GsMono>
        </div>
        <span style={{ background: GS.ink, color: "#fff", padding: "10px 14px", fontSize: 12, fontWeight: 600, flex: "none" }}>Voir</span>
      </button>
    )}

    {/* Tuiles */}
    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: GS.line, border: `1px solid ${GS.line}` }}>
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.label} onClick={t.onClick} style={{ background: "#fff", padding: 13, border: "none", cursor: "pointer", textAlign: "left" }}>
            <Icon size={18} style={{ color: GS.teal }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 7 }}>{t.label}</div>
            <GsMono color={t.metaColor} style={{ letterSpacing: 0, marginTop: 2, display: "block" }}>{t.meta}</GsMono>
          </button>
        );
      })}
    </div>

    {/* Routine du soir */}
    <button onClick={() => setLocation("/routine")} style={{ marginTop: 12, width: "100%", border: `1px solid ${GS.line}`, background: "#fff", padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
      <ListChecks size={18} style={{ color: GS.teal, flex: "none" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: GS.ink }}>Routine du soir · {eveDone} / {eveTotal}</div>
        <GsMono style={{ letterSpacing: 0, marginTop: 2, display: "block" }}>{streak > 0 ? `SÉRIE ${streak} JOUR${streak > 1 ? "S" : ""}` : "À COMMENCER"}</GsMono>
      </div>
      <ArrowRight size={16} style={{ color: GS.ink, flex: "none" }} />
    </button>

    {selectedScan && <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />}
  </>);
}
