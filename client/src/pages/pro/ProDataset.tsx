/**
 * ProDataset — Dashboard du dataset GlowScan
 * Statistiques, top conditions, évolution, export JSONL / OpenAI
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ProLayout, ProCard } from "@/components/ProLayout";

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
}

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
  const { stats, loading, error } = useDatasetStats();
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
              { icon: "💾", label: "training_data" },
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
