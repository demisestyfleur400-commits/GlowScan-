import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Sun, Moon, Plus, Trash2, Bell, BellOff, Flame, ChevronLeft, X, Check, Sparkles, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { catalog, type Product, getProductBrand } from "@shared/catalog";
import { productImages } from "@/lib/productImages";

// ─────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────
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
//  Add Step Modal
// ─────────────────────────────────────────────────────────────────────
function AddStepModal({
  period,
  onClose,
}: {
  period: Period;
  onClose: () => void;
}) {
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
      toast({ title: "✨ Étape ajoutée" });
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
    ? ["💧 Boire 1 grand verre d'eau", "☀️ Mettre crème solaire SPF50", "🥒 Manger un fruit frais", "🧘 5 min respiration profonde"]
    : ["🍵 Tisane sans caféine", "💤 Couper les écrans 1h avant de dormir", "🌸 Massage du visage 2 min", "💧 Boire un verre d'eau"];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
        data-testid="add-step-backdrop"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl"
        data-testid="modal-add-step"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform" data-testid="button-close-add-step" aria-label="Fermer">
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <h3 className="text-base font-bold text-gray-900">Ajouter une étape</h3>
          <div className="w-9" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setTab("product")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === "product" ? "bg-pink-500 text-white shadow-sm" : "bg-gray-100 text-gray-600"}`}
            data-testid="tab-product"
          >
            🧴 Produit
          </button>
          <button
            onClick={() => setTab("care")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === "care" ? "bg-pink-500 text-white shadow-sm" : "bg-gray-100 text-gray-600"}`}
            data-testid="tab-care"
          >
            ✨ Soin perso
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {tab === "product" ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chercher un produit..."
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-100"
                  data-testid="input-search-product"
                />
              </div>
              <div className="space-y-2">
                {filteredProducts.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">Aucun produit trouvé</p>
                )}
                {filteredProducts.map((p) => {
                  const img = productImages[p.id];
                  const brand = getProductBrand(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addMut.mutate({ kind: "product", label: p.name, productId: p.id })}
                      disabled={addMut.isPending}
                      className="w-full flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl hover:border-pink-300 active:scale-[0.98] transition-all text-left"
                      data-testid={`pick-product-${p.id}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🧴</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600">{brand}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      </div>
                      <Plus className="w-4 h-4 text-pink-500 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                value={careLabel}
                onChange={(e) => setCareLabel(e.target.value)}
                placeholder="Ex: Boire 2L d'eau, Massage visage..."
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
                maxLength={120}
                data-testid="input-care-label"
              />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Suggestions</p>
              <div className="space-y-1.5">
                {careSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setCareLabel(s)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-pink-50 text-sm text-gray-700 active:scale-[0.98] transition-all"
                    data-testid={`suggestion-${s.slice(0, 20)}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sticky footer for care tab */}
        {tab === "care" && (
          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => careLabel.trim() && addMut.mutate({ kind: "care", label: careLabel.trim() })}
              disabled={!careLabel.trim() || addMut.isPending}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white py-3 rounded-xl text-sm font-bold transition-colors active:scale-[0.98]"
              data-testid="button-confirm-care"
            >
              {addMut.isPending ? "Ajout..." : "Ajouter ce soin"}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Routine Card (matin ou soir)
// ─────────────────────────────────────────────────────────────────────
function RoutineCard({
  period,
  routine,
  todayCompletions,
}: {
  period: Period;
  routine: Routine | undefined;
  todayCompletions: number[];
}) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const isMorning = period === "morning";
  const Icon = isMorning ? Sun : Moon;
  const title = isMorning ? "Routine Matin" : "Routine Soir";
  const emoji = isMorning ? "🌅" : "🌙";
  const accentBg = isMorning ? "bg-pink-50" : "bg-gray-900";
  const accentText = "text-pink-600";
  const accentTitleText = isMorning ? "text-gray-900" : "text-white";
  const accentLabelText = isMorning ? "text-gray-400" : "text-pink-300";
  const accentBorder = isMorning ? "border-pink-200" : "border-gray-200";

  // Local optimistic state for the time picker
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
    onError: () => toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" }),
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
      toast({ title: "Étape supprimée" });
    },
  });

  const steps = routine?.steps || [];
  const reminderEnabled = routine?.reminderEnabled ?? true;
  const completedCount = steps.filter((s) => todayCompletions.includes(s.id)).length;
  const allDone = steps.length > 0 && completedCount === steps.length;

  return (
    <>
      <div className={`bg-white rounded-2xl border ${accentBorder} shadow-sm overflow-hidden`} data-testid={`card-routine-${period}`}>
        {/* Header */}
        <div className={`${accentBg} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
              <Icon className={`w-5 h-5 ${accentText}`} />
            </div>
            <div>
              <p className={`text-xs font-bold ${accentLabelText} uppercase tracking-wider`}>{emoji} Période</p>
              <p className={`text-sm font-bold ${accentTitleText}`}>{title}</p>
            </div>
          </div>
          {steps.length > 0 && (
            <div className={`px-2.5 py-1 rounded-full bg-white ${accentText} text-xs font-extrabold`}>
              {completedCount}/{steps.length}
            </div>
          )}
        </div>

        {/* Reminder time picker */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => updateMut.mutate({ reminderEnabled: !reminderEnabled })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${reminderEnabled ? "bg-pink-50 text-pink-600" : "bg-gray-100 text-gray-400"}`}
            data-testid={`button-toggle-reminder-${period}`}
            aria-label="Activer/désactiver rappel"
          >
            {reminderEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">⏰ Rappel</p>
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
              className="text-lg font-bold text-gray-900 bg-transparent focus:outline-none disabled:text-gray-400"
              data-testid={`input-time-${period}`}
            />
          </div>
        </div>

        {/* Steps list */}
        <div className="px-4 py-3 space-y-1.5 min-h-[60px]">
          {steps.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-3">Aucune étape — appuie sur + pour commencer</p>
          )}
          {steps.map((step) => {
            const done = todayCompletions.includes(step.id);
            return (
              <div key={step.id} className="flex items-center gap-2 group" data-testid={`step-${step.id}`}>
                <button
                  onClick={() => checkMut.mutate(step.id)}
                  disabled={checkMut.isPending}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${done ? "bg-pink-50 border-pink-100" : "bg-gray-50 border-gray-100 hover:border-gray-200"}`}
                  data-testid={`button-check-step-${step.id}`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${done ? "bg-pink-500 border-pink-500" : "border-gray-300 bg-white"}`}>
                    {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm flex-1 min-w-0 truncate ${done ? "text-pink-700 font-semibold line-through decoration-pink-300" : "text-gray-700"}`}>
                    {step.kind === "product" && !step.label.match(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u) && "🧴 "}
                    {step.label}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer "${step.label}" ?`)) deleteMut.mutate(step.id);
                  }}
                  className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center active:scale-90 transition-all"
                  data-testid={`button-delete-step-${step.id}`}
                  aria-label={`Supprimer ${step.label}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2.5 mt-2 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl border border-pink-200"
            >
              <p className="text-sm font-bold text-pink-700">🎉 Routine complète, bravo !</p>
            </motion.div>
          )}
        </div>

        {/* Add button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowAdd(true)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed ${accentBorder} ${accentText} text-sm font-bold hover:bg-gray-50 active:scale-[0.98] transition-all`}
            data-testid={`button-add-step-${period}`}
          >
            <Plus className="w-4 h-4" />
            Ajouter une étape
          </button>
        </div>
      </div>

      {showAdd && <AddStepModal period={period} onClose={() => setShowAdd(false)} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Page principale
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
      <div className="min-h-screen bg-[#FFF8FB] flex items-center justify-center">
        <div className="animate-pulse text-sm text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFF8FB] flex flex-col items-center justify-center px-6 text-center">
        <Sparkles className="w-12 h-12 text-pink-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connecte-toi</h2>
        <p className="text-sm text-gray-600 mb-5">Pour créer ta routine, on a besoin de te reconnaître.</p>
        <Link href="/auth">
          <a className="px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-bold" data-testid="button-login">Se connecter</a>
        </Link>
      </div>
    );
  }

  const morning = data?.routines.find((r) => r.period === "morning");
  const evening = data?.routines.find((r) => r.period === "evening");
  const todayCompletions = data?.todayCompletions || [];
  const stats = data?.stats || { streak: 0, weeklyPct: 0, totalSteps: 0, today: "" };

  return (
    <div className="min-h-screen bg-[#FFF8FB] pb-24">
      <Navbar />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            data-testid="button-back-home"
            aria-label="Retour"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-gray-900">Ma Routine</h1>
            <p className="text-[11px] text-gray-400">Matin & soir, étape par étape</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Stats card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3" data-testid="card-streak">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Flame className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Streak</p>
              <p className="text-lg font-extrabold text-gray-900" data-testid="text-streak-value">
                {stats.streak} <span className="text-xs font-bold text-gray-500">jour{stats.streak > 1 ? "s" : ""} 🔥</span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3" data-testid="card-weekly">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cette sem.</p>
              <p className="text-lg font-extrabold text-gray-900" data-testid="text-weekly-value">{stats.weeklyPct}%</p>
            </div>
          </div>
        </div>

        {/* Streak motivation message */}
        {stats.streak >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl border border-pink-200 px-4 py-2.5"
          >
            <p className="text-sm font-bold text-pink-700">
              Tu as suivi ta routine {stats.streak} jours de suite 🔥
            </p>
          </motion.div>
        )}

        {/* Morning routine */}
        <RoutineCard period="morning" routine={morning} todayCompletions={todayCompletions} />

        {/* Evening routine */}
        <RoutineCard period="evening" routine={evening} todayCompletions={todayCompletions} />

        {/* Helper text */}
        <p className="text-[11px] text-gray-400 text-center px-4 pt-2">
          On t'enverra une notification à l'heure choisie. Tu pourras désactiver le rappel à tout moment.
        </p>
      </div>
    </div>
  );
}
