import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import type { AnalysisResult } from "@shared/schema";
import { resultStateOf } from "@shared/resultB2C";
import { AREA_LABEL } from "@/lib/resultView";
import { ResultB2C } from "@/components/b2c/ResultB2C";

// ════════════════════════════════════════════════════════════════════════
// Ma peau (refonte Organic) — maquette « GlowScan App » › Ma peau.
// Courbe du Glow Score sur 6 mois, avant / après, comptes rendus des médecins,
// historique des analyses. Uniquement les vrais scans : un scan sans score
// (photo inexploitable) n'entre pas dans la courbe.
// ════════════════════════════════════════════════════════════════════════

type ScanLite = { id: number; score: number | null; area: string; condition: string | null; createdAt: string | Date | null; imageUrl?: string | null; recommendations?: any; analysis?: string | null; motivation?: string | null };
type ConsultationLite = { id: number; status: string | null; condition: string | null; createdAt: string | null; doctorName?: string | null };

const MONTHS = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const drName = (n?: string | null) => (!n ? "Votre médecin" : /^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const fmt = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  d ? new Date(d).toLocaleDateString("fr-FR", opts) : "";

function stateOfScan(s: ScanLite) {
  return resultStateOf(s.recommendations?._fullResult ?? { score: s.score, condition: s.condition });
}
const usableScore = (s: ScanLite) => (stateOfScan(s) !== "unusable" && typeof s.score === "number" ? s.score : null);

function toResult(s: ScanLite): AnalysisResult {
  const full = s.recommendations?._fullResult;
  if (full) return full as AnalysisResult;
  // Ancien scan sans résultat complet : aucune mesure inventée.
  return {
    condition: s.condition || "Analyse", severity: "", score: s.score as number, skinType: "",
    details: s.analysis || "", motivation: s.motivation || "",
    stats: { lesions: "–", zones: "–", pores: "–", marks: "–" },
    balance: undefined as unknown as AnalysisResult["balance"],
    recommendations: { products: [], morning: [], evening: [], weekly: "" },
  };
}

export default function MaPeau() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: scansRaw } = useScans();
  const { data: consultData } = useQuery<{ consultations: ConsultationLite[] }>({ queryKey: ["/api/consultations/mine"], enabled: !!user });
  const [open, setOpen] = useState<ScanLite | null>(null);

  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);

  const scans = useMemo<ScanLite[]>(
    () => (Array.isArray(scansRaw) ? [...(scansRaw as ScanLite[])] : [])
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [scansRaw],
  );

  // ?scan=<id> (Accueil, message WhatsApp) ouvre directement l'analyse.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || scans.length === 0) return;
    const id = Number(new URLSearchParams(window.location.search).get("scan"));
    const found = scans.find((s) => s.id === id);
    if (found) { deepLinked.current = true; setOpen(found); }
  }, [scans]);

  // Courbe : dernier score utilisable de chacun des 6 derniers mois.
  const curve = useMemo(() => {
    const now = new Date();
    const pts: { m: string; v: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = scans.find((x) => {
        const c = x.createdAt ? new Date(x.createdAt) : null;
        return c && c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && usableScore(x) !== null;
      });
      if (s) pts.push({ m: MONTHS[d.getMonth()], v: usableScore(s)! });
    }
    const min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v));
    return pts.map((p, i) => ({ ...p, h: 24 + ((p.v - min) / Math.max(1, max - min)) * 66, last: i === pts.length - 1 }));
  }, [scans]);

  // Avant / après : première et dernière analyse du visage avec photo et score.
  const faces = scans.filter((s) => s.area === "face" && s.imageUrl && usableScore(s) !== null);
  const before = faces.length >= 2 ? faces[faces.length - 1] : null;
  const after = faces.length >= 2 ? faces[0] : null;

  const reports = (consultData?.consultations ?? []).filter((c) => c.status === "answered" || c.status === "closed");

  if (open) {
    return (
      <div data-clarity-mask="true" className="min-h-screen bg-organic-bg">
        <div className="mx-auto max-w-[480px] px-5 pb-6 pt-4">
          <ResultB2C
            result={toResult(open)}
            area={open.area || "face"}
            imageUrl={open.imageUrl || null}
            createdAt={open.createdAt}
            scanId={open.id}
            onBack={() => { setOpen(null); if (window.location.search) window.history.replaceState(null, "", "/ma-peau"); }}
          />
        </div>
      </div>
    );
  }

  const card = "flex flex-col gap-2.5 rounded-lg bg-organic-surface p-4";
  const circleBg = (s: ScanLite) => {
    const st = stateOfScan(s);
    return st === "good" ? "var(--color-accent-2-200)" : st === "unusable" ? "var(--color-neutral-200)" : "var(--color-accent-200)";
  };

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <h1 className="m-0 text-[28px]">Ma peau</h1>

        <div className={card}>
          <span className="text-[13px] font-bold">Glow Score · 6 derniers mois</span>
          {curve.length >= 2 ? (
            <div className="flex h-[120px] items-end gap-2.5">
              {curve.map((c) => (
                <div key={c.m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-bold">{c.v}</span>
                  <div className="w-full rounded-t-pill rounded-b-[10px]" style={{ height: c.h, background: c.last ? "var(--color-accent)" : "var(--color-accent-300)" }} />
                  <span className="text-[10px] text-organic-neutral-700">{c.m}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[13px] text-organic-neutral-700">La courbe apparaît à partir de deux mois d'analyses.</span>
          )}
        </div>

        {before && after && (
          <div className={card}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold">Avant / après</span>
              <span className="text-[11px] text-organic-neutral-700">première et dernière analyse du visage</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[before, after].map((s) => (
                <button key={s.id} type="button" onClick={() => setOpen(s)} className="flex flex-col gap-1 border-0 bg-transparent p-0 text-organic-text">
                  <div className="h-[120px] w-full rounded-[20px] bg-cover bg-center" style={{ backgroundColor: "#7a5234", backgroundImage: `url(${s.imageUrl})` }} />
                  <span className="text-center text-[11px]">{fmt(s.createdAt)} · {usableScore(s)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {reports.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold">Comptes rendus de vos médecins</span>
            {reports.map((c) => (
              <a
                key={c.id}
                href={`/api/consultations/${c.id}/report/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg bg-organic-surface px-3.5 py-3 text-organic-text no-underline"
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-bold">{drName(c.doctorName)}</span>
                  <span className="text-[12px] text-organic-neutral-700">{[fmt(c.createdAt), c.condition].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="rounded-pill bg-organic-accent-2-100 px-2.5 py-[3px] text-[11px] text-organic-accent-2-800">PDF</span>
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Mes analyses</span>
          {scans.length === 0 && <span className="text-[13px] text-organic-neutral-700">Aucune analyse pour l'instant.</span>}
          {scans.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpen(s)}
              className="flex items-center gap-3 rounded-pill border-0 bg-organic-surface py-2.5 pl-2.5 pr-3.5 text-left text-organic-text"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-pill font-heading text-[15px]" style={{ background: circleBg(s) }}>
                {usableScore(s) ?? "—"}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[14px] font-bold">{AREA_LABEL[s.area] || "Analyse"}</span>
                <span className="text-[12px] text-organic-neutral-700">{fmt(s.createdAt, { day: "numeric", month: "long" })}</span>
              </span>
              <span aria-hidden className="font-bold text-organic-accent-700">→</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
