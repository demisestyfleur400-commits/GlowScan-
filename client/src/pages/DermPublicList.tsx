import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useScans } from "@/hooks/use-scans";
import { SPECIALTY_LABEL } from "@shared/dermSpecialties";
import { formatF } from "@shared/delivery";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Dermatologues (refonte Organic) — maquette « GlowScan App » › Dermatologues.
// Filtre par spécialité, délai de réponse RÉEL (médiane, affiché à partir de
// 3 consultations), prix fixé par chaque médecin. Mène à « Réserver » (/dr/:slug).
// ════════════════════════════════════════════════════════════════════════

type Derm = {
  id: number; fullName: string; city: string | null; price: number; slug: string | null;
  specialties: string[]; recommendedFor: boolean; rating: number; ratingsCount: number;
  responseHours: number | null; certified: boolean; photoUrl: string | null;
};

const initials = (n: string) => n.replace(/^(dr|pr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const drName = (n: string) => (/^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const AVATAR_BG = ["var(--color-accent-2-500)", "var(--color-accent)", "var(--color-accent-700)"];

export default function DermPublicList() {
  const [, setLocation] = useLocation();
  const { data: scans } = useScans();
  const [derms, setDerms] = useState<Derm[]>([]);
  const [recoLabel, setRecoLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [spec, setSpec] = useState<string>("all");
  const urgent = new URLSearchParams(window.location.search).get("urgent") === "1";

  useSEO({
    title: "Dermatologues certifiés — Peaux africaines | GlowScan",
    description: "Trouvez un dermatologue spécialiste des peaux mélanisées (phototypes IV à VI). Consultation en ligne, paiement Mobile Money.",
    canonical: "https://glow-scan.com/dermatologues",
  });

  const lastCondition: string | null = Array.isArray(scans) && scans.length ? (scans[0] as any).condition || null : null;
  useEffect(() => {
    setLoading(true);
    fetch(`/api/b2c/dermatologists${lastCondition ? `?condition=${encodeURIComponent(lastCondition)}` : ""}`)
      .then((r) => r.json())
      .then((d) => { setDerms(Array.isArray(d.dermatologists) ? d.dermatologists : []); setRecoLabel(d.recommendedLabel || null); })
      .catch(() => setDerms([]))
      .finally(() => setLoading(false));
  }, [lastCondition]);

  const specs = useMemo(() => {
    const set = new Set<string>();
    derms.forEach((d) => d.specialties.forEach((s) => set.add(s)));
    return Array.from(set).filter((s) => SPECIALTY_LABEL[s]);
  }, [derms]);
  const list = derms.filter((d) => spec === "all" || d.specialties.includes(spec));
  const chip = (on: boolean) => cn(
    "whitespace-nowrap rounded-pill border px-4 py-[9px] text-[14px] font-semibold",
    on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text",
  );

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <button type="button" onClick={() => setLocation("/consultations")} className="flex items-center gap-1 self-start border-0 bg-transparent p-0 font-bold text-organic-accent-700">
          <ArrowLeft size={18} strokeWidth={1.75} /> Messages
        </button>
        <h1 className="m-0 text-[28px]">Dermatologues</h1>
        {urgent && (
          <div className="rounded-lg bg-organic-accent-800 p-4 text-[13px] text-organic-neutral-100">
            Choisissez un médecin qui répond vite : votre analyse demande un examen rapide.
          </div>
        )}
        {specs.length > 0 && (
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
            <button type="button" className={chip(spec === "all")} onClick={() => setSpec("all")}>Tous</button>
            {specs.map((s) => <button key={s} type="button" className={chip(spec === s)} onClick={() => setSpec(s)}>{SPECIALTY_LABEL[s]}</button>)}
          </div>
        )}

        {loading ? (
          <span className="text-[13px] text-organic-neutral-700">Chargement…</span>
        ) : list.length === 0 ? (
          <span className="text-[13px] text-organic-neutral-700">Aucun dermatologue disponible pour le moment.</span>
        ) : (
          (urgent ? [...list].sort((a, b) => (a.responseHours ?? 999) - (b.responseHours ?? 999)) : list).map((d, i) => (
            <button
              key={d.id}
              type="button"
              disabled={!d.slug}
              onClick={() => d.slug && setLocation(`/dr/${d.slug}${urgent ? "?urgent=1" : ""}`)}
              className="flex flex-col gap-2.5 rounded-lg border-0 bg-organic-surface p-4 text-left text-organic-text disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                {d.photoUrl
                  ? <img src={d.photoUrl} alt="" className="h-12 w-12 flex-none rounded-pill object-cover" />
                  : <span className="flex h-12 w-12 flex-none items-center justify-center rounded-pill text-[15px] font-bold text-organic-bg" style={{ background: AVATAR_BG[i % AVATAR_BG.length] }}>{initials(d.fullName)}</span>}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-bold">{drName(d.fullName)}</span>
                  <span className="text-[12px] text-organic-neutral-700">
                    {d.city}
                    {d.ratingsCount > 0 && <span className="ml-1 inline-flex items-center gap-0.5">{d.city ? "· " : ""}<Star size={12} strokeWidth={1.75} className="text-organic-accent-400" /> {String(d.rating).replace(".", ",")}</span>}
                  </span>
                </span>
                <span className="flex-none text-[14px] font-bold">{formatF(d.price)}</span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {d.recommendedFor && recoLabel && <span className="rounded-pill bg-organic-accent-2-100 px-2.5 py-[3px] text-[11px] text-organic-accent-2-800">Adapté à votre cas</span>}
                {d.specialties.slice(0, 2).map((s) => SPECIALTY_LABEL[s] && <span key={s} className="rounded-pill bg-organic-neutral-100 px-2.5 py-[3px] text-[11px] text-organic-neutral-800">{SPECIALTY_LABEL[s]}</span>)}
                {d.responseHours !== null && <span className="rounded-pill bg-organic-accent-100 px-2.5 py-[3px] text-[11px] text-organic-accent-800">Répond en {d.responseHours} h environ</span>}
              </span>
            </button>
          ))
        )}
      </main>
    </div>
  );
}
