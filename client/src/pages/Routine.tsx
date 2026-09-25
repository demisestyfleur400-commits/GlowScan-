import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, Bell, BellOff, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { catalog, getProductBrand } from "@shared/catalog";
import { CareTabs } from "@/components/b2c/CareTabs";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Soins › Ma routine (refonte Organic). GRATUITE pour tous : la routine
// prescrite par le médecin n'est jamais derrière un paiement.
// ════════════════════════════════════════════════════════════════════════

type Period = "morning" | "evening";
interface RoutineStep { id: number; routineId: number; kind: "product" | "care"; label: string; productId: string | null; position: number }
interface Routine { id: number; period: Period; reminderTime: string | null; reminderEnabled: boolean; steps: RoutineStep[] }
interface RoutinesResponse { routines: Routine[]; todayCompletions: number[]; stats: { streak: number; weeklyPct: number; totalSteps: number; today: string } }
type ConsultationLite = { id: number; prescription?: string | null; doctorName?: string | null; closedAt?: string | null };

const PERIOD_LABEL: Record<Period, string> = { morning: "Matin", evening: "Soir" };
const CARE_SUGGESTIONS: Record<Period, string[]> = {
  morning: ["Nettoyant doux", "Écran solaire SPF 50", "Crème hydratante"],
  evening: ["Nettoyant doux", "Retirer l'écran solaire", "Crème hydratante"],
};
const drName = (n?: string | null) => (!n ? "votre médecin" : /^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);

function AddStepSheet({ period, onClose }: { period: Period; onClose: () => void }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"care" | "product">("care");
  const [label, setLabel] = useState("");
  const [search, setSearch] = useState("");
  const addMut = useMutation({
    mutationFn: async (payload: { kind: "product" | "care"; label: string; productId?: string }) =>
      (await apiRequest("POST", `/api/routines/${period}/steps`, payload)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/routines"] }); onClose(); },
    onError: () => toast({ title: "Ajout impossible", description: "Réessayez dans un instant.", variant: "destructive" }),
  });
  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (q ? catalog.filter((p) => p.name.toLowerCase().includes(q) || (getProductBrand(p) || "").toLowerCase().includes(q)) : catalog).slice(0, 20);
  }, [search]);
  const seg = (on: boolean) => cn("flex-1 rounded-pill border-0 p-2 text-[13px] font-bold", on ? "bg-organic-accent text-organic-bg" : "bg-transparent text-organic-text");

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Ajouter une étape · ${PERIOD_LABEL[period]}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 border-0" style={{ background: "color-mix(in srgb, var(--color-neutral-900) 50%, transparent)" }} />
      <div className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col gap-3 rounded-t-card bg-organic-bg p-5 shadow-organic-lg">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[20px]">Ajouter · {PERIOD_LABEL[period]}</span>
          <button type="button" onClick={onClose} aria-label="Fermer" className="border-0 bg-transparent p-1 text-organic-text"><X size={21} strokeWidth={1.75} /></button>
        </div>
        <div className="flex gap-1.5 rounded-pill bg-organic-surface p-1">
          <button type="button" className={seg(tab === "care")} onClick={() => setTab("care")}>Un geste</button>
          <button type="button" className={seg(tab === "product")} onClick={() => setTab("product")}>Un produit</button>
        </div>
        {tab === "care" ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {CARE_SUGGESTIONS[period].map((s) => (
                <button key={s} type="button" onClick={() => addMut.mutate({ kind: "care", label: s })} className="rounded-pill border border-organic-divider bg-transparent px-3.5 py-2 text-[13px] font-semibold">{s}</button>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (label.trim()) addMut.mutate({ kind: "care", label: label.trim() }); }}>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Autre geste" maxLength={80}
                className="h-11 flex-1 rounded-pill border border-organic-divider bg-organic-surface px-3.5 text-[15px] focus-visible:border-organic-accent focus-visible:outline-none" />
              <button type="submit" disabled={!label.trim() || addMut.isPending} className="rounded-pill border-0 bg-organic-accent px-4 text-[14px] font-bold text-organic-neutral-100 disabled:opacity-45">Ajouter</button>
            </form>
          </>
        ) : (
          <>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chercher un produit"
              className="h-11 rounded-pill border border-organic-divider bg-organic-surface px-3.5 text-[15px] focus-visible:border-organic-accent focus-visible:outline-none" />
            <div className="flex flex-col gap-1.5 overflow-y-auto">
              {products.map((p) => (
                <button key={p.id} type="button" onClick={() => addMut.mutate({ kind: "product", label: p.name, productId: p.id })}
                  className="flex items-center justify-between gap-2 rounded-pill border-0 bg-organic-surface px-3.5 py-2.5 text-left text-[13px] text-organic-text">
                  <span className="font-semibold">{p.name}</span>
                  <Plus size={16} strokeWidth={1.75} className="flex-none text-organic-accent" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PeriodBlock({ period, routine, done }: { period: Period; routine?: Routine; done: number[] }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const steps = routine?.steps ?? [];
  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
  const checkMut = useMutation({ mutationFn: async (stepId: number) => (await apiRequest("POST", "/api/routines/check", { stepId })).json(), onSuccess: inv });
  const deleteMut = useMutation({ mutationFn: async (stepId: number) => { await apiRequest("DELETE", `/api/routines/steps/${stepId}`); }, onSuccess: inv });
  const reminderMut = useMutation({
    mutationFn: async (payload: { reminderEnabled: boolean }) => (await apiRequest("PUT", `/api/routines/${period}`, payload)).json(),
    onSuccess: inv,
    onError: () => toast({ title: "Réglage non enregistré", variant: "destructive" }),
  });
  const reminderOn = routine?.reminderEnabled ?? false;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{PERIOD_LABEL[period]}</span>
        {routine && (
          <button type="button" onClick={() => reminderMut.mutate({ reminderEnabled: !reminderOn })}
            className="flex items-center gap-1 rounded-pill border-0 bg-transparent px-2 py-1 text-[12px] font-semibold text-organic-neutral-700 hover:bg-organic-text/[.07]">
            {reminderOn ? <Bell size={14} strokeWidth={1.75} /> : <BellOff size={14} strokeWidth={1.75} />}
            {reminderOn ? `Rappel ${routine.reminderTime ?? ""}`.trim() : "Sans rappel"}
          </button>
        )}
      </div>
      {steps.map((s) => {
        const on = done.includes(s.id);
        return (
          <div key={s.id} className="flex items-center gap-2 rounded-lg px-3.5 py-3" style={{ background: on ? "var(--color-accent-2-100)" : "var(--color-surface)" }}>
            <button type="button" onClick={() => checkMut.mutate(s.id)} aria-pressed={on} aria-label={on ? `Décocher ${s.label}` : `Cocher ${s.label}`}
              className="flex flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left text-organic-text">
              <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-pill border-2 text-[12px] font-bold text-organic-bg"
                style={{ borderColor: on ? "var(--color-accent-2-600)" : "var(--color-neutral-400)", background: on ? "var(--color-accent-2-600)" : "transparent" }}>
                {on ? "✓" : ""}
              </span>
              <span className="text-[14px] font-semibold">{s.label}</span>
            </button>
            <button type="button" onClick={() => deleteMut.mutate(s.id)} aria-label={`Retirer ${s.label}`} className="border-0 bg-transparent p-1 text-organic-neutral-600">
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => setAdding(true)} className="flex items-center justify-center gap-1.5 rounded-pill border border-dashed border-organic-divider bg-transparent p-2.5 text-[13px] font-bold text-organic-accent">
        <Plus size={16} strokeWidth={1.75} /> Ajouter une étape
      </button>
      {adding && <AddStepSheet period={period} onClose={() => setAdding(false)} />}
    </div>
  );
}

export default function RoutinePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data } = useQuery<RoutinesResponse>({ queryKey: ["/api/routines"], enabled: !!user });
  const { data: consultData } = useQuery<{ consultations: ConsultationLite[] }>({ queryKey: ["/api/consultations/mine"], enabled: !!user });

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-organic-bg font-body text-organic-text">
        <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
          <CareTabs active="routine" />
          <div className="flex flex-col gap-3 rounded-lg bg-organic-surface p-5">
            <span className="font-heading text-[20px]">Votre routine, matin et soir</span>
            <p className="m-0 text-[14px]">Créez un compte gratuit pour suivre votre routine et celle que votre médecin vous prescrit.</p>
            <button type="button" onClick={() => setLocation("/auth")} className="rounded-pill border-0 bg-organic-accent p-3.5 text-[15px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">Créer mon compte</button>
          </div>
        </main>
      </div>
    );
  }

  const routines = data?.routines ?? [];
  const done = data?.todayCompletions ?? [];
  const total = data?.stats?.totalSteps ?? 0;
  const prescriptions = (consultData?.consultations ?? []).filter((c) => c.prescription && c.prescription.trim());

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <CareTabs active="routine" />

        {/* Routine prescrite par le médecin : toujours gratuite */}
        {prescriptions.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5 rounded-lg bg-organic-accent-2-100 p-4 text-organic-accent-2-900">
            <span className="text-[11px] font-bold uppercase tracking-[.12em]">Prescrite par {drName(c.doctorName)}</span>
            <p className="m-0 whitespace-pre-line text-[14px] leading-normal">{c.prescription}</p>
          </div>
        ))}

        {total > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-organic-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-organic-neutral-700">Aujourd'hui</span>
              <span className="font-heading text-[22px]">{done.length} / {total}</span>
            </div>
            <div className="h-1.5 rounded-pill bg-organic-neutral-200">
              <div className="h-full rounded-pill bg-organic-accent-2-600" style={{ width: `${Math.round((done.length / total) * 100)}%` }} />
            </div>
          </div>
        )}

        {(["morning", "evening"] as Period[]).map((p) => (
          <PeriodBlock key={p} period={p} routine={routines.find((r) => r.period === p)} done={done} />
        ))}
      </main>
    </div>
  );
}
