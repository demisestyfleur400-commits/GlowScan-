import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Sun, Moon, Plus, Trash2, Bell, BellOff, Flame, ChevronLeft, X, Check, Sparkles, Search, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { catalog, type Product, getProductBrand } from "@shared/catalog";
import { productImages } from "@/lib/productImages";

type Period = "morning" | "evening";

interface RoutineStep {
  id: number;
  routineId: number;
  kind: "product" | "care";
  label: string;
  productId: string | null;
  position: number;
}

interface Routine {
  id: number;
  userId: string;
  period: Period;
  reminderTime: string | null;
  reminderEnabled: boolean;
  steps: RoutineStep[];
}

interface RoutinesResponse {
  routines: Routine[];
  todayCompletions: number[];
  stats: { streak: number; weeklyPct: number; totalSteps: number; today: string };
}

// ─────────────────────────────────────────────────────────────────────
//  MODAL D'AJOUT D'ÉTAPE (STYLE LABO)
// ─────────────────────────────────────────────────────────────────────
function AddStepModal({ period, onClose }: { period: Period; onClose: () => void }) {
  const [tab, setTab] = useState<"product" | "care">("product");
  const [search, setSearch] = useState("");
  const [careLabel, setCareLabel] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const addMut = useMutation({
    mutationFn: async (payload: { kind: "product" | "care"; label: string; productId?: string }) => {
      const r = await apiRequest("POST", `/api/routines/${period}/steps`, payload);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      toast({ title: "Étape enregistrée ⚡" });
      onClose();
    },
    onError: () => toast({ title: "Erreur", description: "Impossible d'ajouter l'étape", variant: "destructive" }),
  });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return catalog.slice(0, 30);
    const q = search.toLowerCase();
    return catalog.filter((p) => p.name.toLowerCase().includes(q) || (getProductBrand(p) || "").toLowerCase().includes(q)).slice(0, 30);
  }, [search]);

  const careSuggestions = period === "morning"
    ? ["💧 Eau fraîche au réveil", "☀️ Protection Solaire SPF 50+", "🌸 Massage tonifiant (60s)", "🥒 Application Gel Aloé Véra"]
    : ["🧪 Nettoyage Double (Huile + Gel)", "🍵 Tisane antioxydante", "💤 Écrans coupés 45 min avant", "🌸 Massage lymphatique drainant"];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-250"
        onClick={onClose}
        data-testid="add-step-backdrop"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-250 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200"
        data-testid="modal-add-step"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center active:scale-90 transition-transform" data-testid="button-close-add-step">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Configurer une action</h3>
          <div className="w-8" />
        </div>

        {/* Switch Onglets Cliniques */}
        <div className="flex bg-slate-100 p-1 rounded-xl mx-4 my-3 border border-slate-200/40 flex-shrink-0">
          <button
            onClick={() => setTab("product")}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === "product" ? "bg-slate-950 text-white shadow-xs" : "text-slate-500"}`}
            data-testid="tab-product"
          >
            🧴 Actif Spécifique
          </button>
          <button
            onClick={() => setTab("care")}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === "care" ? "bg-slate-950 text-white shadow-xs" : "text-slate-500"}`}
            data-testid="tab-care"
          >
            ✨ Geste Hygiène
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {tab === "product" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une formulation de la boutique..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors"
                  data-testid="input-search-product"
                />
              </div>
              <div className="space-y-2">
                {filteredProducts.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">Formulation introuvable</p>
                )}
                {filteredProducts.map((p) => {
                  const img = productImages[p.id];
                  const brand = getProductBrand(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addMut.mutate({ kind: "product", label: p.name, productId: p.id })}
                      disabled={addMut.isPending}
                      className="w-full flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-400 active:scale-[0.99] transition-all text-left"
                      data-testid={`pick-product-${p.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                        {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-400">INCI</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{brand}</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                      </div>
                      <Plus className="w-4 h-4 text-slate-900 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={careLabel}
                onChange={(e) => setCareLabel(e.target.value)}
                placeholder="Ex: Massage facial à l'eau froide..."
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors"
                maxLength={120}
                data-testid="input-care-label"
              />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">Protocoles suggérés</p>
              <div className="space-y-1.5">
                {careSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setCareLabel(s)}
                    className="w-full text-left px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200/40 hover:bg-slate-100 text-xs font-bold text-slate-700 active:scale-[0.99] transition-all"
                    data-testid={`suggestion-${s.slice(0, 20)}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {tab === "care" && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => careLabel.trim() && addMut.mutate({ kind: "care", label: careLabel.trim() })}
              disabled={!careLabel.trim() || addMut.isPending}
              className="w-full bg-slate-950 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:bg-slate-200 disabled:text-slate-400"
              data-testid="button-confirm-care"
            >
              {addMut.isPending ? "Validation..." : "Confirmer le geste"}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  ROUTINE CARD (GESTION MATIN ET SOIR DIFFÉRENCIÉE)
// ─────────────────────────────────────────────────────────────────────
function RoutineCard({ period, routine, todayCompletions }: { period: Period; routine: Routine | undefined; todayCompletions: number[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const isMorning = period === "morning";
  
  const Icon = isMorning ? Sun : Moon;
  const title = isMorning ? "Protocole Matinal" : "Protocole Nocturne";
  
  // Style Labo Matin vs Nuit Intercalé
  const headerBg = isMorning ? "bg-slate-50 border-b border-slate-100" : "bg-slate-950 text-white";
  const titleColor = isMorning ? "text-slate-900" : "text-white";
  const descColor = isMorning ? "text-slate-400" : "text-slate-400";
  const containerBorder = isMorning ? "border-slate-200/80" : "border-slate-950";

  const [localTime, setLocalTime] = useState(routine?.reminderTime || (isMorning ? "07:00" : "21:00"));
  useEffect(() => {
    if (routine?.reminderTime) setLocalTime(routine.reminderTime);
  }, [routine?.reminderTime]);

  const updateMut = useMutation({
    mutationFn: async (payload: { reminderTime?: string | null; reminderEnabled?: boolean }) => {
      const r = await apiRequest("PUT", `/api/routines/${period}`, payload);
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] }),
    onError: () => toast({ title: "Erreur de synchronisation", variant: "destructive" }),
  });

  const checkMut = useMutation({
    mutationFn: async (stepId: number) => {
      const r = await apiRequest("POST", "/api/routines/check", { stepId });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (stepId: number) => {
      await apiRequest("DELETE", `/api/routines/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      toast({ title: "Action retirée de la liste" });
    },
  });

  const steps = routine?.steps || [];
  const reminderEnabled = routine?.reminderEnabled ?? true;
  const completedCount = steps.filter((s) => todayCompletions.includes(s.id)).length;
  const allDone = steps.length > 0 && completedCount === steps.length;

  return (
    <>
      <div className={`bg-white rounded-3xl border ${containerBorder} shadow-xs overflow-hidden`} data-testid={`card-routine-${period}`}>
        
        {/* En-tête de Carte Dynamique */}
        <div className={`${headerBg} px-4 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isMorning ? "bg-white border-slate-200 text-amber-500" : "bg-slate-900 border-slate-800 text-indigo-400"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${descColor}`}>Cycle journalier</p>
              <p className={`text-xs font-black uppercase tracking-wider ${titleColor}`}>{title}</p>
            </div>
          </div>
          {steps.length > 0 && (
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${isMorning ? "bg-slate-200/60 text-slate-800" : "bg-white/10 text-white"}`}>
              {completedCount} / {steps.length} VALIDE(S)
            </div>
          )}
        </div>

        {/* Bloc Horloge Clinique */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3">
          <button
            onClick={() => updateMut.mutate({ reminderEnabled: !reminderEnabled })}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${reminderEnabled ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-400 border-slate-200"}`}
            data-testid={`button-toggle-reminder-${period}`}
          >
            {reminderEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alerte Push</p>
            <input
              type="time"
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
              onBlur={() => {
                if (localTime && /^\d{2}:\d{2}$/.test(localTime) && localTime !== routine?.reminderTime) {
                  updateMut.mutate({ reminderTime: localTime });
                }
              }}
              disabled={!reminderEnabled}
              className="text-sm font-black text-slate-900 bg-transparent focus:outline-none disabled:text-slate-300 font-mono"
              data-testid={`input-time-${period}`}
            />
          </div>
        </div>

        {/* Liste des validations */}
        <div className="px-4 py-3.5 space-y-2 min-h-[60px]">
          {steps.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4 italic">Aucun traitement programmé sur ce créneau.</p>
          )}
          {steps.map((step) => {
            const done = todayCompletions.includes(step.id);
            return (
              <div key={step.id} className="flex items-center gap-2" data-testid={`step-${step.id}`}>
                <button
                  onClick={() => checkMut.mutate(step.id)}
                  disabled={checkMut.isPending}
                  className={`flex-1 flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}
                  data-testid={`button-check-step-${step.id}`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"}`}>
                    {done && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
                  <span className={`text-xs font-bold flex-1 min-w-0 truncate ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {step.kind === "product" && !step.label.match(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u) && "🧴 "}
                    {step.label}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Retirer l'étape "${step.label}" ?`)) deleteMut.mutate(step.id);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all"
                  data-testid={`button-delete-step-${step.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-3 mt-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-black text-emerald-800 uppercase tracking-wide">Index de conformité atteint pour ce cycle !</p>
            </motion.div>
          )}
        </div>

        {/* Bouton d'ajout */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-800 text-xs font-black uppercase tracking-wider hover:bg-slate-50 active:scale-[0.99] transition-all"
            data-testid={`button-add-step-${period}`}
          >
            <Plus className="w-4 h-4 text-slate-500" />
            Planifier un soin
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && <AddStepModal period={period} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────
export default function Routine() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<RoutinesResponse>({
    queryKey: ["/api/routines"],
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-950 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <Sparkles className="w-10 h-10 text-slate-400 mb-4" />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-1">Authentification Requise</h2>
        <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed mb-6">Connecte-toi pour synchroniser tes formules et suivre tes cycles.</p>
        <Link href="/auth">
          <a className="px-6 py-3.5 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md" data-testid="button-login">S'identifier</a>
        </Link>
      </div>
    );
  }

  const morning = data?.routines.find((r) => r.period === "morning");
  const evening = data?.routines.find((r) => r.period === "evening");
  const todayCompletions = data?.todayCompletions || [];
  const stats = data?.stats || { streak: 0, weeklyPct: 0, totalSteps: 0, today: "" };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Navbar />

      {/* Header Premium de Page */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3🎁">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center active:scale-90 transition-transform"
            data-testid="button-back-home"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">Suivi Chrono-Cutané</h1>
            <p className="text-[11px] text-slate-400 font-medium">Contrôle de la régularité et des applications</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Grille de performance (1% Progress Compounding) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-4 flex items-center gap-3.5" data-testid="card-streak">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Régularité</p>
              <p className="text-base font-black text-slate-900" data-testid="text-streak-value">
                {stats.streak} <span className="text-[10px] font-bold text-slate-500 uppercase">Jour{stats.streak > 1 ? "s" : ""}</span>
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-4 flex items-center gap-3.5" data-testid="card-weekly">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Complétion</p>
              <p className="text-base font-black text-slate-900" data-testid="text-weekly-value">{stats.weeklyPct}%</p>
            </div>
          </div>
        </div>

        {/* Message d'ancrage psychologique */}
        {stats.streak >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950 text-white rounded-xl p-3.5 border border-slate-900 text-center"
          >
            <p className="text-xs font-bold leading-normal">
              ⚡ Discipline maintenue sur <span className="text-amber-400 font-black">{stats.streak} cycles</span>. Chaque jour valide forge ta transformation pour 2027.
            </p>
          </motion.div>
        )}

        {/* Les blocs de cycles matin et soir */}
        <RoutineCard period="morning" routine={morning} todayCompletions={todayCompletions} />
        <RoutineCard period="evening" routine={evening} todayCompletions={todayCompletions} />

        <p className="text-[10px] text-slate-400 font-medium text-center px-6 pt-2 leading-relaxed">
          Les alertes push s'adaptent automatiquement à ton fuseau local pour respecter la chronobiologie cutanée.
        </p>
      </div>
    </div>
  );
}
