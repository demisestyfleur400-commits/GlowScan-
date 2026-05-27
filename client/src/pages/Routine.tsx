import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Sun, Moon, Plus, Trash2, Bell, BellOff, Flame, ChevronLeft, X, Check, Sparkles, Search, CheckCircle2, Loader2 } from "lucide-react";
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
//  MODAL D'AJOUT D'ÉTAPE (DARK PREMIUM)
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
        className="fixed inset-0 z-250 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.7)" }}
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
        className="fixed inset-x-0 bottom-0 z-250 rounded-t-3xl max-h-[85vh] flex flex-col"
        style={{ background: "#0D0A0E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)" }}
        data-testid="modal-add-step"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }} data-testid="button-close-add-step">
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Configurer une action</h3>
          <div className="w-8" />
        </div>

        {/* Switch Onglets */}
        <div className="flex p-1 rounded-xl mx-4 my-3 flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setTab("product")}
            className="flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
            style={tab === "product" ? { background: "linear-gradient(135deg, #E91E8C, #f43f5e)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}
            data-testid="tab-product"
          >
            🧴 Actif Spécifique
          </button>
          <button
            onClick={() => setTab("care")}
            className="flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
            style={tab === "care" ? { background: "linear-gradient(135deg, #E91E8C, #f43f5e)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}
            data-testid="tab-care"
          >
            ✨ Geste Hygiène
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {tab === "product" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une formulation..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                  data-testid="input-search-product"
                />
              </div>
              <div className="space-y-2">
                {filteredProducts.length === 0 && (
                  <p className="text-center text-xs py-6" style={{ color: "rgba(255,255,255,0.3)" }}>Formulation introuvable</p>
                )}
                {filteredProducts.map((p) => {
                  const img = productImages[p.id];
                  const brand = getProductBrand(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addMut.mutate({ kind: "product", label: p.name, productId: p.id })}
                      disabled={addMut.isPending}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.99] transition-all text-left"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid={`pick-product-${p.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>INCI</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{brand}</p>
                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      </div>
                      <Plus className="w-4 h-4 flex-shrink-0" style={{ color: "#E91E8C" }} />
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
                className="w-full px-3 py-3 rounded-xl text-xs font-medium focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                maxLength={120}
                data-testid="input-care-label"
              />
              <p className="text-[10px] font-black uppercase tracking-widest pt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Protocoles suggérés</p>
              <div className="space-y-1.5">
                {careSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setCareLabel(s)}
                    className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold active:scale-[0.99] transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
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
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}>
            <button
              onClick={() => careLabel.trim() && addMut.mutate({ kind: "care", label: careLabel.trim() })}
              disabled={!careLabel.trim() || addMut.isPending}
              className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)", color: "white" }}
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
//  ROUTINE CARD (DARK PREMIUM)
// ─────────────────────────────────────────────────────────────────────
function RoutineCard({ period, routine, todayCompletions }: { period: Period; routine: Routine | undefined; todayCompletions: number[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const isMorning = period === "morning";

  const Icon = isMorning ? Sun : Moon;
  const title = isMorning ? "Protocole Matinal" : "Protocole Nocturne";
  const accentColor = isMorning ? "#fb923c" : "#8b5cf6";
  const accentBg = isMorning ? "rgba(251,146,60,0.12)" : "rgba(139,92,246,0.12)";
  const accentBorder = isMorning ? "rgba(251,146,60,0.25)" : "rgba(139,92,246,0.25)";

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
      <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid={`card-routine-${period}`}>

        {/* Header */}
        <div className="px-4 py-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Cycle journalier</p>
              <p className="text-xs font-black uppercase tracking-wider text-white">{title}</p>
            </div>
          </div>
          {steps.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
              {completedCount} / {steps.length} VALIDE(S)
            </div>
          )}
        </div>

        {/* Horloge */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}>
          <button
            onClick={() => updateMut.mutate({ reminderEnabled: !reminderEnabled })}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-90"
            style={reminderEnabled
              ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
            }
            data-testid={`button-toggle-reminder-${period}`}
          >
            {reminderEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Alerte Push</p>
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
              className="text-sm font-black bg-transparent focus:outline-none font-mono"
              style={{ color: reminderEnabled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)" }}
              data-testid={`input-time-${period}`}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 py-3.5 space-y-2 min-h-[60px]">
          {steps.length === 0 && (
            <p className="text-center text-xs py-4 italic" style={{ color: "rgba(255,255,255,0.3)" }}>Aucun traitement programmé sur ce créneau.</p>
          )}
          {steps.map((step) => {
            const done = todayCompletions.includes(step.id);
            return (
              <div key={step.id} className="flex items-center gap-2" data-testid={`step-${step.id}`}>
                <button
                  onClick={() => checkMut.mutate(step.id)}
                  disabled={checkMut.isPending}
                  className="flex-1 flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left"
                  style={done
                    ? { background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                  data-testid={`button-check-step-${step.id}`}
                >
                  <div className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 border transition-all" style={done ? { background: "#10b981", borderColor: "#10b981" } : { border: "1px solid rgba(255,255,255,0.2)", background: "transparent" }}>
                    {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-bold flex-1 min-w-0 truncate" style={done ? { color: "rgba(255,255,255,0.3)", textDecoration: "line-through" } : { color: "rgba(255,255,255,0.8)" }}>
                    {step.kind === "product" && !step.label.match(/^[\u{1F300}-\u{1FAFF}☀-➿]/u) && "🧴 "}
                    {step.label}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Retirer l'étape "${step.label}" ?`)) deleteMut.mutate(step.id);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
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
              className="text-center py-3 mt-2 rounded-xl flex items-center justify-center gap-2"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: "#10b981" }} />
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: "#10b981" }}>Index de conformité atteint pour ce cycle !</p>
            </motion.div>
          )}
        </div>

        {/* Add button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.99]"
            style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
            data-testid={`button-add-step-${period}`}
          >
            <Plus className="w-4 h-4" />
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0A0E" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#E91E8C" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "#0D0A0E" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}>
          <Sparkles className="w-6 h-6" style={{ color: "#E91E8C" }} />
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-1">Authentification Requise</h2>
        <p className="text-xs max-w-[260px] mx-auto leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Connecte-toi pour synchroniser tes formules et suivre tes cycles.</p>
        <Link href="/auth">
          <a className="px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-white" style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)" }} data-testid="button-login">S'identifier</a>
        </Link>
      </div>
    );
  }

  const morning = data?.routines.find((r) => r.period === "morning");
  const evening = data?.routines.find((r) => r.period === "evening");
  const todayCompletions = data?.todayCompletions || [];
  const stats = data?.stats || { streak: 0, weeklyPct: 0, totalSteps: 0, today: "" };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0D0A0E" }}>
      <Navbar />

      {/* Ambient orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full" style={{ background: "radial-gradient(circle, rgba(233,30,140,0.1) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <div className="sticky top-16 z-30" style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            data-testid="button-back-home"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-black uppercase tracking-wider text-white">Suivi Chrono-Cutané</h1>
            <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Contrôle de la régularité et des applications</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 flex items-center gap-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="card-streak">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)" }}>
              <Flame className="w-4 h-4" style={{ color: "#fb923c" }} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Régularité</p>
              <p className="text-base font-black text-white" data-testid="text-streak-value">
                {stats.streak} <span className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Jour{stats.streak > 1 ? "s" : ""}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex items-center gap-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="card-weekly">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "#10b981" }} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Complétion</p>
              <p className="text-base font-black text-white" data-testid="text-weekly-value">{stats.weeklyPct}%</p>
            </div>
          </div>
        </div>

        {/* Streak message */}
        {stats.streak >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3.5 text-center"
            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}
          >
            <p className="text-xs font-bold leading-normal" style={{ color: "rgba(255,255,255,0.75)" }}>
              ⚡ Discipline maintenue sur <span className="font-black" style={{ color: "#fb923c" }}>{stats.streak} cycles</span>. Chaque jour valide forge ta transformation pour 2027.
            </p>
          </motion.div>
        )}

        <RoutineCard period="morning" routine={morning} todayCompletions={todayCompletions} />
        <RoutineCard period="evening" routine={evening} todayCompletions={todayCompletions} />

        <p className="text-[10px] font-medium text-center px-6 pt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
          Les alertes push s'adaptent automatiquement à ton fuseau local pour respecter la chronobiologie cutanée.
        </p>
      </div>
    </div>
  );
}
