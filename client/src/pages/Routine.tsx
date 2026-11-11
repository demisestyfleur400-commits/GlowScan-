import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, Bell, X, ArrowLeft, Droplet, Sun, Moon, Sparkles, Package, Check, Sunrise } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { catalog, getProductBrand } from "@shared/catalog";
import { ensureDermFonts } from "@/components/derm/tokens";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Soins › Ma routine (nouvelle maquette B2C). GRATUITE pour tous : la routine
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
  const seg = (on: boolean) => cn("flex-1 rounded-[8px] border-0 p-2 text-[14px] font-semibold", on ? "bg-white text-organic-accent shadow-organic-md" : "bg-transparent text-organic-neutral-700");

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Ajouter une étape · ${PERIOD_LABEL[period]}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 border-0" style={{ background: "color-mix(in srgb, var(--color-neutral-900) 50%, transparent)" }} />
      <div className="b2c-theme relative flex max-h-[85vh] w-full max-w-[480px] flex-col gap-3 rounded-t-card bg-organic-bg p-5 shadow-organic-lg">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[20px]">Ajouter · {PERIOD_LABEL[period]}</span>
          <button type="button" onClick={onClose} aria-label="Fermer" className="border-0 bg-transparent p-1 text-organic-text"><X size={21} strokeWidth={1.75} /></button>
        </div>
        <div className="flex gap-1 rounded-[10px] bg-organic-accent-200 p-1">
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
              <button type="submit" disabled={!label.trim() || addMut.isPending} className="rounded-[10px] border-0 bg-organic-accent px-4 text-[14px] font-semibold text-white disabled:opacity-45">Ajouter</button>
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

// Palette de la nouvelle maquette B2C.
const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec" };
const FR_DAY = (d = new Date()) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());
// Icône d'une étape, d'après son libellé.
function StepIcon({ s }: { s: RoutineStep }) {
  const l = s.label.toLowerCase();
  const I = /solaire|spf|soleil/.test(l) ? Sun : /nettoy|démaquill|savon|lav/.test(l) ? Droplet : /hydrat|crème|creme|lait|beurre|huile/.test(l) ? Sparkles : s.kind === "product" ? Package : Droplet;
  return <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px]" style={{ background: G.sage, color: G.dark }}><I size={19} strokeWidth={1.7} /></span>;
}

function PeriodBlock({ period, routine, done }: { period: Period; routine?: Routine; done: number[] }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const steps = routine?.steps ?? [];
  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
  const checkMut = useMutation({ mutationFn: async (stepId: number) => (await apiRequest("POST", "/api/routines/check", { stepId })).json(), onSuccess: inv });
  const deleteMut = useMutation({ mutationFn: async (stepId: number) => { await apiRequest("DELETE", `/api/routines/steps/${stepId}`); }, onSuccess: inv });
  const reminderMut = useMutation({
    mutationFn: async (payload: { reminderEnabled?: boolean; reminderTime?: string }) => (await apiRequest("PUT", `/api/routines/${period}`, payload)).json(),
    onSuccess: inv,
    onError: () => toast({ title: "Réglage non enregistré", variant: "destructive" }),
  });
  const reminderOn = routine?.reminderEnabled ?? false;
  const time = routine?.reminderTime || (period === "morning" ? "07:00" : "20:00");
  const doneHere = steps.filter((s) => done.includes(s.id)).length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <b className="text-[15px] font-semibold">Votre routine du {period === "morning" ? "matin" : "soir"}</b>
        {steps.length > 0 && <span className="text-[13px]" style={{ color: G.muted }}>{doneHere} / {steps.length} fait{doneHere > 1 ? "s" : ""}</span>}
      </div>

      {steps.length === 0 && (
        <div className="rounded-[14px] border bg-white p-4 text-[14px] leading-relaxed" style={{ borderColor: G.line, color: G.muted }}>
          Pour l'instant, votre routine du {period === "morning" ? "matin" : "soir"} est vide. Ajoutez un premier geste : un nettoyant doux suffit pour commencer.
        </div>
      )}

      {steps.map((s) => {
        const on = done.includes(s.id);
        return (
          <div key={s.id} className="flex items-center gap-3 rounded-[14px] border bg-white px-3 py-3" style={{ borderColor: G.line }}>
            <StepIcon s={s} />
            <button type="button" onClick={() => checkMut.mutate(s.id)} aria-pressed={on} aria-label={on ? `Décocher ${s.label}` : `Cocher ${s.label}`}
              className="flex min-w-0 flex-1 flex-col border-0 bg-transparent p-0 text-left" style={{ color: G.text }}>
              <span className={cn("text-[15px] font-semibold", on && "line-through decoration-1 opacity-60")}>{s.label}</span>
              <span className="text-[12.5px]" style={{ color: G.muted }}>{s.kind === "product" ? "Produit" : "Geste"}</span>
            </button>
            <button type="button" onClick={() => deleteMut.mutate(s.id)} aria-label={`Retirer ${s.label}`} className="border-0 bg-transparent p-1" style={{ color: "#9fb0a6" }}>
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => checkMut.mutate(s.id)} aria-label={on ? `Décocher ${s.label}` : `Cocher ${s.label}`}
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-pill border-2 p-0"
              style={{ borderColor: on ? G.dark : "#c9d3cc", background: on ? G.dark : "transparent", color: "#fff" }}>
              {on && <Check size={15} strokeWidth={2.6} />}
            </button>
          </div>
        );
      })}

      <button type="button" onClick={() => setAdding(true)} className="flex items-center justify-center gap-1.5 rounded-[14px] border border-dashed bg-transparent p-3 text-[14px] font-semibold" style={{ borderColor: "#c9d3cc", color: G.dark }}>
        <Plus size={16} strokeWidth={1.9} /> Ajouter une étape
      </button>

      {routine && (
        <div className="mt-1 flex flex-col gap-2 rounded-[16px] p-4 text-white" style={{ background: G.dark }}>
          <div className="flex items-start gap-3">
            <Bell size={18} strokeWidth={1.8} className="mt-0.5 flex-none" />
            <span className="flex flex-1 flex-col">
              <b className="text-[15px] font-semibold">Votre rappel du {period === "morning" ? "matin" : "soir"}</b>
              <span className="text-[13px] opacity-80">{reminderOn ? `Chaque jour à ${time}` : "Désactivé"}</span>
            </span>
            <button type="button" role="switch" aria-checked={reminderOn} aria-label="Activer le rappel"
              onClick={() => reminderMut.mutate({ reminderEnabled: !reminderOn })}
              className="relative h-[26px] w-[46px] flex-none rounded-pill border-0 p-0 transition-colors" style={{ background: reminderOn ? "#cfe08a" : "rgba(255,255,255,.25)" }}>
              <span className="absolute top-[3px] h-5 w-5 rounded-pill transition-all" style={{ left: reminderOn ? 23 : 3, background: reminderOn ? G.dark : "#fff" }} />
            </button>
          </div>
          {editTime ? (
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("t") || ""); if (v) reminderMut.mutate({ reminderTime: v, reminderEnabled: true }); setEditTime(false); }}>
              <input name="t" type="time" defaultValue={time} className="h-10 rounded-[8px] border-0 px-3 text-[15px]" style={{ color: G.text }} />
              <button type="submit" className="h-10 rounded-[8px] border-0 px-4 text-[14px] font-semibold" style={{ background: "#cfe08a", color: G.dark }}>Enregistrer</button>
              <button type="button" onClick={() => setEditTime(false)} className="border-0 bg-transparent text-[13px] text-white opacity-80">Annuler</button>
            </form>
          ) : (
            <button type="button" onClick={() => setEditTime(true)} className="self-start border-0 bg-transparent p-0 text-[13.5px] font-semibold text-white">Modifier l'heure du rappel →</button>
          )}
        </div>
      )}
      {adding && <AddStepSheet period={period} onClose={() => setAdding(false)} />}
    </div>
  );
}

export default function RoutinePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data } = useQuery<RoutinesResponse>({ queryKey: ["/api/routines"], enabled: !!user });
  const { data: consultData } = useQuery<{ consultations: ConsultationLite[] }>({ queryKey: ["/api/consultations/mine"], enabled: !!user });
  const [period, setPeriod] = useState<Period>(() => (new Date().getHours() < 15 ? "morning" : "evening"));
  useEffect(() => { ensureDermFonts(); }, []);

  const header = (
    <>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/"))} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
          <ArrowLeft size={20} strokeWidth={1.9} />
        </button>
        <span className="flex-1 text-[16px] font-semibold">Ma routine</span>
        <button type="button" onClick={() => setLocation("/shop")} className="rounded-pill border bg-white px-3 py-1 text-[12.5px] font-semibold" style={{ borderColor: G.line, color: G.dark }}>Boutique</button>
        <button type="button" onClick={() => setLocation("/premium")} className="rounded-pill border-0 px-3 py-1 text-[12px] font-bold uppercase tracking-[.06em] text-white" style={{ background: G.dark }}>Plus</button>
      </div>
      <h1 className="m-0 text-[30px] leading-[1.12]">Un petit geste.<br />Chaque jour.</h1>
    </>
  );

  if (!authLoading && !user) {
    return (
      <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
        <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
          {header}
          <div className="flex flex-col gap-3 rounded-[16px] p-5" style={{ background: G.sage }}>
            <b className="text-[17px] font-semibold">Votre routine, matin et soir</b>
            <p className="m-0 text-[14px] leading-relaxed" style={{ color: G.muted }}>Créez un compte gratuit pour suivre votre routine et celle que votre médecin vous prescrit.</p>
            <button type="button" onClick={() => setLocation("/auth")} className="rounded-[12px] border-0 p-3.5 text-[15px] font-semibold text-white" style={{ background: G.dark }}>Créer mon compte gratuit</button>
          </div>
        </main>
      </div>
    );
  }

  const routines = data?.routines ?? [];
  const done = data?.todayCompletions ?? [];
  const total = data?.stats?.totalSteps ?? 0;
  const prescriptions = (consultData?.consultations ?? []).filter((c) => c.prescription && c.prescription.trim());
  const pill = (on: boolean) => cn("flex flex-1 items-center justify-center gap-2 rounded-[10px] border-0 p-2.5 text-[14px] font-semibold", on ? "bg-white shadow-organic-md" : "bg-transparent");

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        {header}
        <span className="-mt-2 text-[13px]" style={{ color: G.muted }}>{FR_DAY()}{total > 0 ? ` · ${done.length} / ${total} gestes faits aujourd'hui` : ""}</span>

        {/* Routine prescrite par le médecin : toujours gratuite */}
        {prescriptions.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5 rounded-[16px] p-4" style={{ background: G.sage, color: G.dark }}>
            <span className="text-[11px] font-bold uppercase tracking-[.1em]">Prescrite par {drName(c.doctorName)}</span>
            <p className="m-0 whitespace-pre-line text-[14px] leading-relaxed">{c.prescription}</p>
          </div>
        ))}

        <div className="flex gap-1 rounded-[12px] p-1" style={{ background: G.sage }}>
          <button type="button" className={pill(period === "morning")} style={{ color: G.dark }} onClick={() => setPeriod("morning")}><Sunrise size={16} strokeWidth={1.8} /> Matin</button>
          <button type="button" className={pill(period === "evening")} style={{ color: G.dark }} onClick={() => setPeriod("evening")}><Moon size={16} strokeWidth={1.8} /> Soir</button>
        </div>

        <PeriodBlock key={period} period={period} routine={routines.find((r) => r.period === period)} done={done} />

        <span className="text-[12.5px] leading-relaxed" style={{ color: G.muted }}>Votre routine et celle prescrite par votre médecin restent gratuites.</span>
      </main>
    </div>
  );
}
