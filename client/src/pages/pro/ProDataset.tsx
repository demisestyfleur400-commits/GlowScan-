/**
 * ProDataset — Dashboard du dataset GlowScan
 * Statistiques, top conditions, évolution, export JSONL / OpenAI
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { useProAccount } from "@/hooks/use-pro";

const NAVY = "#7c3aed";
const INK  = "#f3f0ff";
const DS   = {
  body:   "rgba(200,185,255,0.65)",
  muted:  "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

interface Stats {
  total: number;
  gold: number;
  pending: number;
  b2b: number;
  b2c: number;
  validationRate: number;
  topConditions: { condition: string; count: number }[];
  weekly: { week: string; gold: number; pending: number; total: number }[];
  categoryBreakdown?: { category: string; gold: number; total: number }[];
  phototypeBreakdown?: { phototype: string; count: number }[];
  avgAnnotationScore?: number;
}

// Catégories ICD-10 GlowScan AI
const CATEGORIES: Record<string, { label: string; emoji: string; color: string; target: number }> = {
  acne:              { label: "Acné",                     emoji: "🔴", color: "#ef4444", target: 1500 },
  hyperpigmentation: { label: "Hyperpigmentation",        emoji: "🟤", color: "#92400e", target: 2000 },
  black_skin_specific:{ label: "Spéc. peaux noires",     emoji: "⚫", color: "#a78bfa", target: 2500 },
  eczema:            { label: "Eczéma / Dermatite",       emoji: "🟡", color: "#d97706", target: 800  },
  infections:        { label: "Infections cutanées",      emoji: "🟠", color: "#ea580c", target: 600  },
  xerosis:           { label: "Xérose / Sécheresse",      emoji: "💧", color: "#0284c7", target: 400  },
  photoaging:        { label: "Photoaging",               emoji: "☀️", color: "#7c3aed", target: 300  },
  loss_texture:      { label: "Texture / Pores",          emoji: "🌀", color: "#059669", target: 500  },
  other:             { label: "Autre",                    emoji: "⚪", color: "#6b7280", target: 400  },
};

const DATASET_TARGET = 10000;

// ── Hook stats ─────────────────────────────────────────────────────────────
function useDatasetStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/training/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Erreur " + r.status);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

// ── Sous-composants ────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; icon: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "16px 18px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <p style={{ fontSize: 10, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          {label}
        </p>
      </div>
      <p style={{ fontSize: 28, fontWeight: 900, color: color || INK, margin: 0, lineHeight: 1 }}>
        {value.toLocaleString("fr-FR")}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: DS.body, margin: "4px 0 0" }}>{sub}</p>
      )}
    </div>
  );
}

function ConditionBar({ condition, count, max }: { condition: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: INK, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
          {condition}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: NAVY, flexShrink: 0 }}>
          {count.toLocaleString("fr-FR")}
        </span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 999 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: NAVY, borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ProDataset() {
  const [, setLocation] = useLocation();
  const { data: accData, isLoading: accLoading } = useProAccount();
  const { stats, loading, error } = useDatasetStats();

  // Redirection si pas admin
  useEffect(() => {
    if (!accLoading && accData && !accData.isAdmin) {
      setLocation("/pro/dashboard");
    }
  }, [accData, accLoading]);

  if (accLoading || (!accData?.isAdmin && !accLoading)) return null;
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"jsonl" | "openai">("jsonl");
  const [exportStatus, setExportStatus] = useState<"validated" | "all">("validated");

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = `/api/training/export?format=${exportFormat}&status=${exportStatus}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur export");

      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `glowscan-dataset-${exportStatus}-${date}.jsonl`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      alert("Erreur lors de l'export : " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const maxCond = stats?.topConditions?.[0]?.count || 1;

  return (
    <ProLayout title="Dataset GlowScan" back="/pro/dashboard">
      <div className="max-w-2xl mx-auto space-y-5 pb-10">

        {/* ── Header pipeline ── */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(16,185,129,0.08) 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: 20,
            padding: "20px 20px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 32, flexShrink: 0 }}>🧬</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 4px" }}>
                Dataset Peaux Africaines
              </p>
              <p style={{ fontSize: 12, color: DS.body, margin: 0, lineHeight: 1.6 }}>
                Chaque scan GlowScan DERM est automatiquement enregistré en <strong style={{ color: "#fbbf24" }}>gold standard</strong> (poids 3×).
                Les scans B2C entrent en <em style={{ color: DS.muted }}>pending</em> (poids 1×) jusqu'à validation dermato.
              </p>
            </div>
          </div>

          {/* Pipeline visuel */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { icon: "📸", label: "Scan" },
              { icon: "→", label: "" },
              { icon: "🤖", label: "IA" },
              { icon: "→", label: "" },
              { icon: "🧬", label: "Taxonomie" },
              { icon: "→", label: "" },
              { icon: "🏆", label: "Gold (DERM)" },
              { icon: "→", label: "" },
              { icon: "📦", label: "Export JSONL" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  ...(s.label === "" ? { padding: "0 4px" } : {}),
                }}
              >
                <span style={{ fontSize: s.label === "" ? 14 : 18, color: s.label === "" ? DS.muted : "inherit" }}>
                  {s.icon}
                </span>
                {s.label && (
                  <span style={{ fontSize: 9, color: DS.muted, marginTop: 2, fontWeight: 700 }}>
                    {s.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats cards ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0", color: DS.muted, fontSize: 13 }}>
            Chargement des statistiques…
          </div>
        )}

        {error && (
          <div style={{ padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Ligne 1 : KPIs principaux */}
            <div style={{ display: "flex", gap: 10 }}>
              <StatCard icon="🗂️" label="Total scans" value={stats.total} sub="dans la base" />
              <StatCard icon="🏆" label="Gold (DERM)" value={stats.gold} sub="poids 3× · entraînables" color="#fbbf24" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <StatCard icon="⏳" label="En attente" value={stats.pending} sub="B2C non validés" color="rgba(200,185,255,0.65)" />
              <StatCard icon="✅" label="Taux validation" value={`${stats.validationRate}%`} sub="gold / total" color="#6ee7b7" />
            </div>

            {/* Mode B2B / B2C */}
            <ProCard className="p-4">
              <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Répartition B2B / B2C
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "GlowScan DERM (B2B)", value: stats.b2b, color: NAVY, icon: "🏥" },
                  { label: "GlowScan App (B2C)", value: stats.b2c, color: "#10b981", icon: "📱" },
                ].map((m) => {
                  const pct = stats.total > 0 ? Math.round((m.value / stats.total) * 100) : 0;
                  return (
                    <div key={m.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ fontSize: 11, color: DS.muted, margin: "0 0 4px" }}>{m.icon} {m.label}</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: m.color, margin: 0 }}>{m.value.toLocaleString("fr-FR")}</p>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 999, marginTop: 8 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 999 }} />
                      </div>
                      <p style={{ fontSize: 10, color: DS.muted, margin: "4px 0 0", textAlign: "right" }}>{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </ProCard>

            {/* Top conditions */}
            {stats.topConditions.length > 0 && (
              <ProCard className="p-4">
                <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                  🏅 Top conditions (gold uniquement)
                </p>
                {stats.topConditions.map((c) => (
                  <ConditionBar key={c.condition} condition={c.condition} count={c.count} max={maxCond} />
                ))}
              </ProCard>
            )}

            {/* ── Objectif 10 000 cas par catégorie ── */}
            <ProCard className="p-4">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  🎯 Objectif 10 000 — par catégorie
                </p>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24" }}>
                  {stats.gold.toLocaleString("fr-FR")} / {DATASET_TARGET.toLocaleString("fr-FR")}
                </span>
              </div>

              {/* Barre globale */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min((stats.gold / DATASET_TARGET) * 100, 100)}%`,
                    background: "linear-gradient(90deg, #7c3aed, #fbbf24)",
                    borderRadius: 999,
                    transition: "width 1s ease",
                  }} />
                </div>
                <p style={{ fontSize: 10, color: DS.muted, marginTop: 4, textAlign: "right" }}>
                  {Math.round((stats.gold / DATASET_TARGET) * 100)}% vers l'objectif GlowScan AI v1
                </p>
              </div>

              {/* Par catégorie */}
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const row = stats.categoryBreakdown?.find(c => c.category === key);
                const goldCount = row?.gold || 0;
                const pct = Math.min(Math.round((goldCount / cat.target) * 100), 100);
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: INK, fontWeight: 600 }}>
                        {cat.emoji} {cat.label}
                      </span>
                      <span style={{ fontSize: 10, color: cat.color, fontWeight: 800 }}>
                        {goldCount.toLocaleString("fr-FR")} / {cat.target.toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 999 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 999, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </ProCard>

            {/* ── Distribution phototype IV / V / VI ── */}
            {(stats.phototypeBreakdown?.length || 0) > 0 && (
              <ProCard className="p-4">
                <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                  🎨 Phototypes Fitzpatrick (gold)
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { id: "IV", bg: "#c8956c", label: "IV — Brun clair" },
                    { id: "V",  bg: "#8b5e3c", label: "V — Peau noire" },
                    { id: "VI", bg: "#3b1f0e", label: "VI — Ébène" },
                  ].map(pt => {
                    const row = stats.phototypeBreakdown?.find(p => p.phototype === pt.id);
                    const cnt = row?.count || 0;
                    const total = stats.phototypeBreakdown?.reduce((a, b) => a + b.count, 0) || 1;
                    const pct = Math.round((cnt / total) * 100);
                    return (
                      <div key={pt.id} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, padding: "12px 8px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: pt.bg, margin: "0 auto 8px", border: "2px solid rgba(255,255,255,0.15)" }} />
                        <p style={{ fontSize: 14, fontWeight: 900, color: INK, margin: 0 }}>{cnt.toLocaleString("fr-FR")}</p>
                        <p style={{ fontSize: 9, color: DS.muted, margin: "2px 0 0", fontWeight: 700 }}>{pt.label}</p>
                        <p style={{ fontSize: 11, color: "#fbbf24", margin: "3px 0 0", fontWeight: 800 }}>{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </ProCard>
            )}

            {/* ── Score qualité annotation ── */}
            {(stats.avgAnnotationScore ?? 0) > 0 && (
              <ProCard className="p-4">
                <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                  📊 Qualité des annotations
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)", width: 80, height: 80 }}>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.8" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={stats.avgAnnotationScore! >= 80 ? "#10b981" : stats.avgAnnotationScore! >= 60 ? "#fbbf24" : "#ef4444"}
                        strokeWidth="3.8"
                        strokeDasharray={`${stats.avgAnnotationScore} ${100 - stats.avgAnnotationScore!}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 1s ease" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color: INK, margin: 0 }}>{stats.avgAnnotationScore}</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: INK, margin: "0 0 4px" }}>Score moyen / 100</p>
                    <p style={{ fontSize: 12, color: DS.body, margin: 0, lineHeight: 1.6 }}>
                      Score calculé sur : phototype, condition, sévérité, zones, lésions, risques PIH/chéloïde.
                      <br />Un score ≥80 → poids 5× dans l'entraînement.
                    </p>
                  </div>
                </div>
              </ProCard>
            )}

            {/* Évolution hebdomadaire */}
            {stats.weekly.length > 0 && (
              <ProCard className="p-4">
                <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                  📅 Évolution (8 semaines)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stats.weekly.slice(0, 8).map((w, i) => {
                    const weekDate = new Date(w.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    const maxW = Math.max(...stats.weekly.map((x) => x.total), 1);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 10, color: DS.muted, width: 50, flexShrink: 0 }}>{weekDate}</span>
                        <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(w.gold / maxW) * 100}%`, background: "#fbbf24", opacity: 0.8 }} />
                          <div style={{ position: "absolute", left: `${(w.gold / maxW) * 100}%`, top: 0, bottom: 0, width: `${(w.pending / maxW) * 100}%`, background: NAVY, opacity: 0.5 }} />
                        </div>
                        <span style={{ fontSize: 10, color: DS.muted, width: 24, textAlign: "right", flexShrink: 0 }}>{w.total}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "#fbbf24" }}>■ Gold (DERM)</span>
                    <span style={{ fontSize: 10, color: "rgba(124,58,237,0.7)" }}>■ Pending (B2C)</span>
                  </div>
                </div>
              </ProCard>
            )}
          </>
        )}

        {/* ── Export ── */}
        <ProCard className="p-5">
          <p style={{ fontSize: 11, fontWeight: 800, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            📦 Exporter le dataset
          </p>
          <p style={{ fontSize: 12, color: DS.body, marginBottom: 16, lineHeight: 1.6 }}>
            Télécharge un fichier <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>.jsonl</code> prêt pour le fine-tuning.
            Chaque ligne = un exemple d'entraînement.
          </p>

          {/* Format */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: DS.muted, marginBottom: 8 }}>Format d'export</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["jsonl", "openai"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: exportFormat === f ? `1.5px solid ${NAVY}` : "1px solid rgba(255,255,255,0.1)",
                    background: exportFormat === f ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
                    color: exportFormat === f ? "#a78bfa" : DS.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left" as const,
                  }}
                >
                  {f === "jsonl" ? (
                    <>
                      <span style={{ display: "block", fontSize: 13 }}>📋 JSONL Standard</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>Hugging Face · tous les champs</span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: "block", fontSize: 13 }}>🤖 OpenAI Fine-tune</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>Format chat completions</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: DS.muted, marginBottom: 8 }}>Périmètre</p>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                { v: "validated", label: "🏆 Gold uniquement", sub: `${stats?.gold ?? "…"} records · recommandé` },
                { v: "all", label: "📦 Tout le dataset", sub: `${stats?.total ?? "…"} records · gold + pending` },
              ] as const).map((s) => (
                <button
                  key={s.v}
                  onClick={() => setExportStatus(s.v)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: exportStatus === s.v ? "1.5px solid #fbbf24" : "1px solid rgba(255,255,255,0.1)",
                    background: exportStatus === s.v ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)",
                    color: exportStatus === s.v ? "#fbbf24" : DS.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left" as const,
                  }}
                >
                  <span style={{ display: "block", fontSize: 12 }}>{s.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bouton export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: exporting ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              cursor: exporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: exporting ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {exporting ? (
              <>⏳ Génération en cours…</>
            ) : (
              <>
                ⬇️ Télécharger le dataset
                <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>
                  {exportFormat === "openai" ? "· OpenAI" : "· JSONL"}
                  {" · "}{exportStatus === "validated" ? "gold" : "complet"}
                </span>
              </>
            )}
          </button>

          <p style={{ fontSize: 10, color: DS.muted, marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
            Le fichier est marqué comme exporté · Données anonymisées · Conforme RGPD
          </p>
        </ProCard>

        {/* Lien retour */}
        <div style={{ textAlign: "center" }}>
          <Link href="/pro/dashboard" style={{ fontSize: 12, color: DS.muted, textDecoration: "underline" }}>
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    </ProLayout>
  );
}
