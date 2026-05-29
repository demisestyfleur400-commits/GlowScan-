/**
 * DatasetReview — composants partagés entre /admin et /dermato
 * Utilisés à la fois dans le tableau de bord admin et dans le portail dermato.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Stethoscope, Database, Filter, Image as ImageIcon,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
};

// ── DatasetStatCard ──────────────────────────────────────────────────────────
export function DatasetStatCard({
  label, value, color, extra,
}: { label: string; value: number; color: string; extra?: string }) {
  const c: Record<string, { bg: string; border: string; text: string }> = {
    gray:    { bg: "rgba(255,255,255,0.04)",  border: DS.border,                    text: DS.body },
    emerald: { bg: "rgba(16,185,129,0.1)",    border: "rgba(16,185,129,0.25)",      text: "#6ee7b7" },
    rose:    { bg: "rgba(248,113,113,0.1)",   border: "rgba(248,113,113,0.25)",     text: "#f87171" },
    amber:   { bg: "rgba(251,191,36,0.1)",    border: "rgba(251,191,36,0.25)",      text: "#fbbf24" },
  };
  const style = c[color] || c.gray;
  return (
    <div className="rounded-xl p-3" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <p className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: style.text, opacity: 0.8 }}>{label}</p>
      <p className="text-2xl font-extrabold mt-1" style={{ color: style.text }}>
        {value}{extra && <span className="text-xs font-extrabold ml-1">({extra})</span>}
      </p>
    </div>
  );
}

// ── DatasetCard ──────────────────────────────────────────────────────────────
interface DatasetCardProps {
  scan: any;
  /** Clé admin ou clé dermato — utilisée pour le proxy image */
  accessKey: string;
  busy: boolean;
  onReview: (id: number, ok: boolean, note: string, corrected: string) => void;
}

export function DatasetCard({ scan, accessKey, busy, onReview }: DatasetCardProps) {
  const [note, setNote] = useState<string>(scan.expertNote || "");
  const [corrected, setCorrected] = useState<string>(scan.expertCorrectedCondition || "");
  const [imgError, setImgError] = useState(false);

  // Proxy endpoint — pas de dépendance session, key transmise en query param
  const hasStoredImg = typeof scan.imageUrl === "string" && scan.imageUrl.startsWith("/objects/scans/");
  const imgSrc = hasStoredImg
    ? `/api/admin/scan-image/${scan.id}?key=${encodeURIComponent(accessKey)}`
    : (typeof scan.imageUrl === "string" && scan.imageUrl.startsWith("data:")
        ? scan.imageUrl
        : "");

  const isAlreadyVerified = scan.isVerified === true;
  const isAlreadyRejected = scan.isVerified === false && !!scan.expertReviewedAt;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: DS.surface,
        border: `1px solid ${isAlreadyVerified ? "rgba(16,185,129,0.35)" : isAlreadyRejected ? "rgba(248,113,113,0.35)" : DS.border}`,
      }}
      data-testid={`dataset-card-${scan.id}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
        {/* Image */}
        <div
          className="flex items-center justify-center min-h-[200px]"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {imgSrc && !imgError ? (
            <img
              src={imgSrc}
              alt={`Scan #${scan.id}`}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover max-h-[280px]"
              data-testid={`img-scan-${scan.id}`}
            />
          ) : (
            <div className="text-center py-8" style={{ color: DS.muted }}>
              <ImageIcon className="w-8 h-8 mx-auto mb-1" />
              <p className="text-[10px]">Pas d'image</p>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-mono" style={{ color: DS.muted }}>
                Scan #{scan.id} · {scan.area} · {new Date(scan.createdAt).toLocaleDateString("fr-FR")}
              </p>
              <h3 className="text-sm font-extrabold mt-0.5" style={{ color: DS.text }}>{scan.condition || "—"}</h3>
              <p className="text-xs" style={{ color: DS.body }}>
                Score IA : <strong style={{ color: DS.text }}>{scan.score}/100</strong>
              </p>
            </div>
            {isAlreadyVerified && (
              <span
                className="text-[10px] font-extrabold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7" }}
              >
                ✅ Validé par {scan.expertReviewer || "?"}
              </span>
            )}
            {isAlreadyRejected && (
              <span
                className="text-[10px] font-extrabold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}
              >
                ❌ Rejeté par {scan.expertReviewer || "?"}
              </span>
            )}
          </div>

          {scan.analysis && (
            <details className="text-xs">
              <summary className="cursor-pointer font-extrabold" style={{ color: DS.body }}>
                📋 Analyse complète IA
              </summary>
              <p
                className="mt-2 leading-relaxed p-2 rounded-lg"
                style={{ color: DS.body, background: "rgba(255,255,255,0.04)" }}
              >
                {scan.analysis}
              </p>
            </details>
          )}

          <div className="space-y-2 pt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
            {/* Correction diagnostic */}
            <div
              className="rounded-xl p-2.5"
              style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
            >
              <label
                className="block text-[11px] font-extrabold mb-1"
                style={{ color: "#fbbf24" }}
              >
                ⭐ Diagnostic corrigé (entraîne l'IA en temps réel)
              </label>
              <input
                type="text"
                value={corrected}
                onChange={(e) => setCorrected(e.target.value)}
                placeholder="Ex: Dermatite séborrhéique modérée"
                data-testid={`input-corrected-${scan.id}`}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(251,191,36,0.35)", color: DS.text }}
              />
              <p
                className="text-[10px] mt-1 leading-snug"
                style={{ color: "#fbbf24", opacity: 0.8 }}
              >
                Ce que tu écris ici sera injecté dans le prompt à chaque future analyse de la même zone.
              </p>
            </div>

            {/* Note dermato */}
            <div>
              <label className="block text-[10px] font-extrabold mb-1" style={{ color: DS.muted }}>
                Note dermato
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Observations, justification, contexte clinique…"
                rows={2}
                data-testid={`textarea-note-${scan.id}`}
                className="w-full text-xs px-2 py-1.5 rounded-xl outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${DS.border}`, color: DS.text }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onReview(scan.id, true, note, corrected)}
                disabled={busy}
                data-testid={`button-validate-${scan.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 text-white font-extrabold text-xs py-2 rounded-full transition-all active:scale-[0.97]"
                style={{ background: "#10b981" }}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Valider
              </button>
              <button
                onClick={() => onReview(scan.id, false, note, corrected)}
                disabled={busy}
                data-testid={`button-reject-${scan.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 text-white font-extrabold text-xs py-2 rounded-full transition-all active:scale-[0.97]"
                style={{ background: "#ef4444" }}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Rejeter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DatasetTab ───────────────────────────────────────────────────────────────
export interface DatasetTabProps {
  items: any[];
  total: number;
  page: number;
  limit: number;
  setPage: (n: number) => void;
  status: "pending" | "verified" | "rejected" | "all";
  setStatus: (s: "pending" | "verified" | "rejected" | "all") => void;
  area: "all" | "face" | "body" | "hair";
  setArea: (a: "all" | "face" | "body" | "hair") => void;
  stats: { total: number; verified: number; rejected: number; pending: number; withImage: number } | null;
  loading: boolean;
  reviewerName: string;
  setReviewerName: (s: string) => void;
  reviewBusy: number | null;
  reviewMsg: string;
  onReview: (id: number, isVerified: boolean, note: string, corrected: string) => void;
  /** Clé d'accès transmise au proxy image */
  accessKey: string;
}

export function DatasetTab({
  items, total, page, limit, setPage,
  status, setStatus, area, setArea,
  stats, loading,
  reviewerName, setReviewerName,
  reviewBusy, reviewMsg,
  onReview, accessKey,
}: DatasetTabProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const verifPct = stats && stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="tab-dataset">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-5 h-5" style={{ color: "#6ee7b7" }} />
          <h2 className="text-base font-extrabold" style={{ color: "#6ee7b7" }}>Pipeline Dataset RLHF</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: DS.body }}>
          Valide ou rejette les analyses IA. Les scans validés constituent le dataset officiel d'entraînement.
        </p>
        <label className="block text-[11px] font-extrabold mb-1" style={{ color: "#6ee7b7" }}>
          Ton nom (apparaît sur chaque validation)
        </label>
        <input
          type="text"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Ex: Dr Mbarga"
          data-testid="input-reviewer-name"
          className="w-full text-sm px-3 py-2 rounded-xl outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.3)", color: DS.text }}
        />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <DatasetStatCard label="Total scans"  value={stats.total}    color="gray" />
          <DatasetStatCard label="✅ Validés"   value={stats.verified} color="emerald" extra={`${verifPct}%`} />
          <DatasetStatCard label="❌ Rejetés"   value={stats.rejected} color="rose" />
          <DatasetStatCard label="⏳ À valider" value={stats.pending}  color="amber" />
        </div>
      )}

      {/* Filtres */}
      <div
        className="rounded-2xl p-3 flex flex-wrap gap-2 items-center"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
      >
        <Filter className="w-4 h-4" style={{ color: DS.muted }} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          data-testid="select-dataset-status"
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.body }}
        >
          <option value="pending">⏳ À valider</option>
          <option value="verified">✅ Validés</option>
          <option value="rejected">❌ Rejetés</option>
          <option value="all">Tous</option>
        </select>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as any)}
          data-testid="select-dataset-area"
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.body }}
        >
          <option value="all">Toutes zones</option>
          <option value="face">Visage</option>
          <option value="body">Corps</option>
          <option value="hair">Cheveux</option>
        </select>
        <span className="ml-auto text-xs" style={{ color: DS.muted }}>
          {total} résultat{total > 1 ? "s" : ""}
        </span>
      </div>

      {/* Message review */}
      {reviewMsg && (
        <div
          className="px-4 py-2 rounded-xl text-sm font-extrabold"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
          data-testid="dataset-review-msg"
        >
          {reviewMsg}
        </div>
      )}

      {/* Chargement / vide */}
      {loading && <p className="text-center text-sm py-8" style={{ color: DS.muted }}>Chargement…</p>}
      {!loading && items.length === 0 && (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
        >
          <Database className="w-10 h-10 mx-auto mb-2" style={{ color: DS.muted }} />
          <p className="text-sm" style={{ color: DS.muted }}>Aucun scan dans cette catégorie.</p>
        </div>
      )}

      {/* Cartes */}
      <div className="space-y-3">
        {items.map((scan) => (
          <DatasetCard
            key={scan.id}
            scan={scan}
            accessKey={accessKey}
            busy={reviewBusy === scan.id}
            onReview={onReview}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            data-testid="button-dataset-prev"
            className="px-3 py-1.5 text-xs font-extrabold rounded-full disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.body }}
          >
            ← Précédent
          </button>
          <span className="text-xs font-medium" style={{ color: DS.muted }}>
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            data-testid="button-dataset-next"
            className="px-3 py-1.5 text-xs font-extrabold rounded-full disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.body }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
