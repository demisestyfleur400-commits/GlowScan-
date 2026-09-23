import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Sun, Moon, Plus, Trash2, Bell, BellOff, Flame, ChevronLeft, X, Check, Sparkles, Search, CheckCircle2, Loader2, Crown, Lock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { catalog, type Product, getProductBrand } from "@shared/catalog";
import { GS, GsMono, useGsFonts } from "@/lib/gs-ui";
import { Home as HomeIcon, Camera, Calendar, User as UserIcon, ShoppingBag, ArrowRight } from "lucide-react";
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

// Repointé sur la palette de la refonte B2C (turquoise/encre, filets 1px).
const DS = {
  base: "#ffffff",
  surface: "#ffffff",
  text: "#0B1719",
  body: "#5D6E71",
  muted: "#8C9C9E",
  border: "#DCE4E5",
};

// ─────────────────────────────────────────────────────────────────────
//  MODAL D'AJOUT D'ÉTAPE
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
        style={{ background: DS.surface, border: "1px solid rgba(37,99,235,0.18)" }}
        data-testid="modal-add-step"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.15)" }} />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${DS.border}` }}>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "rgba(0,0,0,0.07)", border: `1px solid ${DS.border}`, color: DS.muted }}
            data-testid="button-close-add-step"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: DS.text }}>Configurer une action</h3>
          <div className="w-8" />
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-xl mx-4 my-3 flex-shrink-0" style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${DS.border}` }}>
          <button
            onClick={() => setTab("product")}
            className="flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all"
            style={tab === "product" ? { background: "#2563eb", color: "white" } : { color: DS.muted }}
            data-testid="tab-product"
          >
            🧴 Actif spécifique
          </button>
          <button
            onClick={() => setTab("care")}
            className="flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all"
            style={tab === "care" ? { background: "#2563eb", color: "white" } : { color: DS.muted }}
            data-testid="tab-care"
          >
            ✨ Geste hygiène
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {tab === "product" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: DS.muted }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une formulation..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  style={{ background: DS.base, border: "1px solid rgba(37,99,235,0.2)", color: DS.text }}
                  data-testid="input-search-product"
                />
              </div>
              <div className="space-y-2">
                {filteredProducts.length === 0 && (
                  <p className="text-center text-xs py-6" style={{ color: DS.muted }}>Formulation introuvable</p>
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
                      style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${DS.border}` }}
                      data-testid={`pick-product-${p.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(0,0,0,0.07)", border: `1px solid ${DS.border}` }}>
                        {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: DS.muted }}>INCI</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: DS.muted }}>{brand}</p>
                        <p className="text-xs font-bold truncate" style={{ color: DS.text }}>{p.name}</p>
                      </div>
                      <Plus className="w-4 h-4 flex-shrink-0" style={{ color: "#a78bfa" }} />
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
                className="w-full px-3 py-3 rounded-xl text-xs font-medium focus:outline-none"
                style={{ background: DS.base, border: "1px solid rgba(37,99,235,0.2)", color: DS.text }}
                maxLength={120}
                data-testid="input-care-label"
              />
              <p className="text-[10px] font-extrabold uppercase tracking-widest pt-1" style={{ color: DS.muted }}>Protocoles suggérés</p>
              <div className="space-y-1.5">
                {careSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setCareLabel(s)}
                    className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold active:scale-[0.99] transition-all"
                    style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${DS.border}`, color: DS.body }}
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
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${DS.border}`, background: "rgba(0,0,0,0.3)" }}>
            <button
              onClick={() => careLabel.trim() && addMut.mutate({ kind: "care", label: careLabel.trim() })}
              disabled={!careLabel.trim() || addMut.isPending}
              className="w-full py-3.5 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all disabled:opacity-40"
              style={{ background: "#2563eb", color: "white" }}
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
//  ROUTINE CARD
// ─────────────────────────────────────────────────────────────────────
function RoutineCard({ period, routine, todayCompletions }: { period: Period; routine: Routine | undefined; todayCompletions: number[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const isMorning = period === "morning";

  const Icon = isMorning ? Sun : Moon;
  const title = isMorning ? "Protocole matinal" : "Protocole nocturne";
  // Palette design (turquoise) — matin/soir gardent l'icône Sun/Moon pour se distinguer.
  const accentColor = "#0A6E72";
  const accentBg = "#F4FEFC";
  const accentBorder = "#12D8BE";

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
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${DS.border}` }}
        data-testid={`card-routine-${period}`}
      >
        {/* Header */}
        <div className="px-4 py-4 flex items-center justify-between" style={{ background: "rgba(0,0,0,0.03)", borderBottom: `1px solid ${DS.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: DS.muted }}>Cycle journalier</p>
              <p className="text-xs font-extrabold" style={{ color: DS.text }}>{title}</p>
            </div>
          </div>
          {steps.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold" style={{ background: "rgba(0,0,0,0.07)", color: DS.muted }}>
              {completedCount} / {steps.length}
            </div>
          )}
        </div>

        {/* Reminder */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(0,0,0,0.05)`, background: "rgba(0,0,0,0.15)" }}>
          <button
            onClick={() => updateMut.mutate({ reminderEnabled: !reminderEnabled })}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-90"
            style={reminderEnabled
              ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }
              : { background: "rgba(0,0,0,0.05)", border: `1px solid ${DS.border}`, color: DS.muted }
            }
            data-testid={`button-toggle-reminder-${period}`}
          >
            {reminderEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(0,0,0,0.25)" }}>Alerte push</p>
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
              className="text-sm font-extrabold bg-transparent focus:outline-none font-mono"
              style={{ color: reminderEnabled ? "rgba(0,0,0,0.85)" : DS.muted }}
              data-testid={`input-time-${period}`}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 py-3.5 space-y-2 min-h-[60px]">
          {steps.length === 0 && (
            <p className="text-center text-xs py-4 italic" style={{ color: DS.muted }}>Aucun traitement programmé sur ce créneau.</p>
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
                    : { background: "rgba(0,0,0,0.04)", border: `1px solid ${DS.border}` }
                  }
                  data-testid={`button-check-step-${step.id}`}
                >
                  <div
                    className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 border transition-all"
                    style={done ? { background: "#10b981", borderColor: "#10b981" } : { border: `1px solid ${DS.muted}`, background: "transparent" }}
                  >
                    {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <span
                    className="text-xs font-bold flex-1 min-w-0 truncate"
                    style={done ? { color: DS.muted, textDecoration: "line-through" } : { color: DS.body }}
                  >
                    {step.kind === "product" && !step.label.match(/^[\u{1F300}-\u{1FAFF}☀-➿]/u) && "🧴 "}
                    {step.label}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Retirer l'étape "${step.label}" ?`)) deleteMut.mutate(step.id);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: "rgba(0,0,0,0.05)", border: `1px solid ${DS.border}`, color: DS.muted }}
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
              <p className="text-xs font-extrabold" style={{ color: "#6ee7b7" }}>Cycle complété avec succès !</p>
            </motion.div>
          )}
        </div>

        {/* Add button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.99]"
            style={{ border: "1px dashed rgba(37,99,235,0.25)", color: DS.muted }}
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
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<RoutinesResponse>({
    queryKey: ["/api/routines"],
    enabled: !!user && isPremium,
  });

  // Données dérivées (guards inclus) + tous les hooks AVANT les gates.
  const morning = data?.routines.find((r) => r.period === "morning");
  const evening = data?.routines.find((r) => r.period === "evening");
  const todayCompletions = data?.todayCompletions || [];
  const stats = data?.stats || { streak: 0, weeklyPct: 0, totalSteps: 0, today: "" };

  useGsFonts();
  const [period, setPeriod] = useState<Period>("morning");
  const [showAddR, setShowAddR] = useState(false);
  const [view, setView] = useState<"day" | "reminders" | "orders">("day");
  const [remMorning, setRemMorning] = useState("07:30");
  const [remEvening, setRemEvening] = useState("21:00");
  const [channelWa, setChannelWa] = useState(true);
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  useEffect(() => {
    if (morning?.reminderTime) setRemMorning(morning.reminderTime);
    if (evening?.reminderTime) setRemEvening(evening.reminderTime);
  }, [morning?.reminderTime, evening?.reminderTime]);
  const checkMutR = useMutation({
    mutationFn: async (stepId: number) => { const r = await apiRequest("POST", "/api/routines/check", { stepId }); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] }),
  });
  const deleteMutR = useMutation({
    mutationFn: async (stepId: number) => { await apiRequest("DELETE", `/api/routines/steps/${stepId}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] }),
  });
  const reminderMutR = useMutation({
    mutationFn: async (p: { period: Period; reminderTime?: string | null; reminderEnabled?: boolean }) => { const r = await apiRequest("PUT", `/api/routines/${p.period}`, { reminderTime: p.reminderTime, reminderEnabled: p.reminderEnabled }); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] }),
  });
  const { data: ordersData } = useQuery<any[]>({ queryKey: ["/api/orders"], enabled: !!user && isPremium });
  const addFromOrderMut = useMutation({
    mutationFn: async (label: string) => { const r = await apiRequest("POST", "/api/routines/morning/steps", { kind: "product", label }); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/routines"] }),
  });
  const saveReminders = () => {
    reminderMutR.mutate({ period: "morning", reminderTime: remMorning });
    reminderMutR.mutate({ period: "evening", reminderTime: remEvening });
    try { localStorage.setItem("gs_routine_channel", channelWa ? "wa" : "push"); localStorage.setItem("gs_routine_days", JSON.stringify(days)); } catch {}
    setView("day");
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DS.base }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a78bfa" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: DS.base }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }}>
          <Sparkles className="w-6 h-6" style={{ color: "#a78bfa" }} />
        </div>
        <h2 className="text-sm font-extrabold mb-1" style={{ color: DS.text }}>Authentification requise</h2>
        <p className="text-xs max-w-[260px] mx-auto leading-relaxed mb-6" style={{ color: DS.body }}>
          Connecte-toi pour synchroniser tes formules et suivre tes cycles.
        </p>
        <Link href="/auth">
          <a
            className="px-6 py-3 rounded-full text-xs font-extrabold text-white"
            style={{ background: "#2563eb" }}
            data-testid="button-login"
          >
            Se connecter
          </a>
        </Link>
      </div>
    );
  }

  // ── Gate : premium requis ──
  if (!isPremium) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      >
        <div
          style={{
            position: "fixed", top: "-80px", left: "50%", transform: "translateX(-50%)",
            width: "500px", height: "500px",
            background: "radial-gradient(circle, rgba(37,99,235,0.12), transparent)",
            pointerEvents: "none",
          }}
        />

        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)" }}
        >
          <Lock className="w-7 h-7" style={{ color: "#f9a8d4" }} />
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 mb-4"
          style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: "9999px" }}
        >
          <Crown className="w-3 h-3" style={{ color: "#f9a8d4" }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: "#f9a8d4" }}>FONCTIONNALITÉ PREMIUM</span>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: DS.text, fontWeight: 800 }}>
          Routine Tracker
        </h1>
        <p className="text-xs max-w-xs mx-auto mb-2 leading-relaxed" style={{ color: DS.body }}>
          Programme tes soins matin et soir, coche chaque étape et construis des habitudes qui transforment ta peau en 30 jours.
        </p>
        <p className="text-[11px] max-w-[220px] mx-auto mb-8 font-bold" style={{ color: "rgba(0,0,0,0.3)" }}>
          Tes analyses faciales restent gratuites et illimitées.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => setLocation("/premium")}
            className="w-full py-4 text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#2563eb,#f43f5e)", borderRadius: "12px", color: "#fff", fontWeight: 800 }}
          >
            <Crown className="w-4 h-4" />
            Débloquer pour 2 000 FCFA
          </button>
          <button
            onClick={() => setLocation("/")}
            className="w-full py-3 text-xs font-bold transition-all active:scale-[0.98]"
            style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px", color: DS.body }}
          >
            Retour à l'accueil
          </button>
        </div>

        <div className="mt-8 w-full max-w-xs space-y-2">
          {[
            "Protocoles matin & soir personnalisables",
            "Rappels chrono selon ta chronobiologie",
            "Streak de régularité et taux de complétion",
          ].map(f => (
            <div key={f} className="flex items-center gap-2.5 text-[11px]" style={{ color: "#4a5568" }}>
              <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: "#a78bfa" }} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = period === "morning" ? morning : evening;
  const steps = active?.steps || [];
  const cnt = (r?: Routine) => { const st = r?.steps || []; return { total: st.length, done: st.filter((s) => todayCompletions.includes(s.id)).length }; };
  const activeCnt = cnt(active);
  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  const todayIdx = (new Date().getDay() + 6) % 7; // Lundi = 0
  const dayLetters = ["L", "M", "M", "J", "V", "S", "D"];
  const nav = [
    { icon: HomeIcon, label: "ACCUEIL", path: "/", on: false },
    { icon: Camera, label: "SCAN", path: "/analyze", on: false },
    { icon: Calendar, label: "ROUTINE", path: "/routine", on: true },
    { icon: UserIcon, label: "DOSSIER", path: "/profile", on: false },
  ];

  // Cadre commun des sous-écrans (R2/R3) : plein écran, IBM Plex.
  const shellR = (children: React.ReactNode) => (
    <div style={{ minHeight: "100dvh", background: "#fff", fontFamily: GS.sans, color: GS.ink }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", padding: "14px 24px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>{children}</div>
    </div>
  );

  // ── R2 · RÉGLAGE DES RAPPELS ──
  if (view === "reminders") {
    return shellR(<>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <button onClick={() => setView("day")} aria-label="Retour" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: GS.ink, display: "flex" }}><ChevronLeft className="w-5 h-5" /></button>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px" }}>Mes rappels</div>
      </div>

      <GsMono style={{ display: "block", marginBottom: 10 }}>Horaires</GsMono>
      <div style={{ display: "flex", gap: 1, background: GS.line, border: `1px solid ${GS.line}` }}>
        <div style={{ flex: 1, background: "#fff", padding: 16, textAlign: "center" }}>
          <GsMono style={{ letterSpacing: ".12em" }}>Matin</GsMono>
          <input type="time" value={remMorning} onChange={(e) => setRemMorning(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", border: "none", textAlign: "center", fontFamily: GS.mono, fontSize: 26, fontWeight: 600, color: GS.ink, marginTop: 6, outline: "none", background: "transparent" }} />
        </div>
        <div style={{ flex: 1, background: "#fff", padding: 16, textAlign: "center" }}>
          <GsMono style={{ letterSpacing: ".12em" }}>Soir</GsMono>
          <input type="time" value={remEvening} onChange={(e) => setRemEvening(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", border: "none", textAlign: "center", fontFamily: GS.mono, fontSize: 26, fontWeight: 600, color: GS.ink, marginTop: 6, outline: "none", background: "transparent" }} />
        </div>
      </div>

      <GsMono style={{ display: "block", margin: "20px 0 10px" }}>Par quel canal</GsMono>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => setChannelWa(true)} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${channelWa ? GS.ink : GS.line}`, background: channelWa ? GS.mintBg : "#fff", padding: 14, display: "flex", alignItems: "center", gap: 13 }}>
          <Bell size={19} style={{ color: GS.teal }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>WhatsApp</div><div style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>Arrive même quand l'app est fermée</div></div>
          <span style={{ width: 20, height: 20, flex: "none", ...(channelWa ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.disabled}` }) }}>{channelWa && <Check size={13} style={{ color: GS.accent }} strokeWidth={3} />}</span>
        </button>
        <button onClick={() => setChannelWa(false)} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${!channelWa ? GS.ink : GS.line}`, background: !channelWa ? GS.mintBg : "#fff", padding: 14, display: "flex", alignItems: "center", gap: 13 }}>
          <Bell size={19} style={{ color: GS.muted }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Notification de l'application</div></div>
          <span style={{ width: 20, height: 20, flex: "none", ...(!channelWa ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.disabled}` }) }}>{!channelWa && <Check size={13} style={{ color: GS.accent }} strokeWidth={3} />}</span>
        </button>
      </div>

      <GsMono style={{ display: "block", margin: "20px 0 10px" }}>Jours de traitement</GsMono>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <button key={i} onClick={() => setDays((arr) => arr.map((v, j) => j === i ? !v : v))}
            style={{ height: 42, cursor: "pointer", border: days[i] ? "none" : `1px solid ${GS.line}`, background: days[i] ? GS.ink : "#fff", color: days[i] ? "#fff" : GS.muted, fontFamily: GS.mono, fontSize: 12, fontWeight: 600 }}>{d}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: GS.muted, marginTop: 9, lineHeight: 1.5 }}>Les rappels suivent l'ordonnance : « un jour sur deux » se règle d'un geste.</div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <button onClick={saveReminders} disabled={reminderMutR.isPending} style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 17, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{reminderMutR.isPending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </>);
  }

  // ── R3 · AJOUT DEPUIS LES COMMANDES ──
  if (view === "orders") {
    const orders = Array.isArray(ordersData) ? ordersData : [];
    const inRoutine = new Set<string>([...(morning?.steps || []), ...(evening?.steps || [])].map((s) => (s.label || "").toLowerCase()));
    return shellR(<>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <button onClick={() => setView("day")} aria-label="Retour" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: GS.ink, display: "flex" }}><ChevronLeft className="w-5 h-5" /></button>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px" }}>Ajouter à ma routine</div>
      </div>
      <div style={{ border: `1px solid ${GS.line}`, padding: 13, display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
        <Sparkles size={17} style={{ color: GS.teal, marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted }}>Seuls les produits achetés sur GlowScan apparaissent ici. Nous connaissons leur composition et leur posologie — c'est ce qui rend les rappels fiables.</div>
      </div>
      {orders.length === 0 ? (
        <div style={{ border: `1px solid ${GS.line}`, padding: 18, textAlign: "center", fontSize: 12.5, color: GS.muted, lineHeight: 1.55 }}>Vos produits commandés sur GlowScan apparaîtront ici, prêts à ajouter à votre routine.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {orders.map((o: any, oi: number) => (
            <div key={oi}>
              <GsMono style={{ display: "block", marginBottom: 10 }}>Commande {o.orderNumber || ""}{o.status ? ` · ${o.status}` : ""}</GsMono>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(Array.isArray(o.items) ? o.items : []).map((it: any, ii: number) => {
                  const name = typeof it === "string" ? it : (it?.name || "Produit");
                  const already = inRoutine.has(name.toLowerCase());
                  return (
                    <div key={ii} style={{ border: `1px solid ${already ? GS.line : GS.ink}`, background: already ? GS.mintBg : "#fff", padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ width: 44, height: 44, flex: "none", background: GS.panel, border: `1px solid ${GS.hair}` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>{name}</div>
                        <div style={{ marginTop: 3 }}><GsMono color={already ? GS.teal : GS.muted} style={{ letterSpacing: 0 }}>{already ? "Déjà en routine" : "Posologie connue"}</GsMono></div>
                      </div>
                      {already
                        ? <Check size={18} style={{ color: GS.teal }} strokeWidth={2.5} />
                        : <button onClick={() => addFromOrderMut.mutate(name)} disabled={addFromOrderMut.isPending} style={{ background: GS.ink, color: "#fff", border: "none", fontFamily: GS.mono, fontSize: 10, fontWeight: 600, padding: "8px 10px", flex: "none", cursor: "pointer" }}>AJOUTER</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <button onClick={() => setView("day")} style={{ width: "100%", background: "#fff", color: GS.ink, border: `1px solid ${GS.ink}`, padding: 16, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Retour à ma routine</button>
      </div>
    </>);
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#fff", fontFamily: GS.sans, color: GS.ink, display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", padding: "14px 24px 0", boxSizing: "border-box" }}>

        {/* En-tête : date · Ma routine · streak */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <GsMono>{dateStr}</GsMono>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.7px", marginTop: 5 }}>Ma routine</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: GS.mono, fontSize: 20, fontWeight: 600, color: GS.ink, fontVariantNumeric: "tabular-nums" }}>{stats.streak}<span style={{ fontSize: 11, color: GS.muted }}> j</span></div>
            <GsMono style={{ letterSpacing: ".1em" }}>Sans oubli</GsMono>
          </div>
        </div>

        {/* Frise de la semaine (dérivée du streak) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 5 }}>
          {dayLetters.map((_, i) => {
            const isToday = i === todayIdx;
            const done = i < todayIdx && (todayIdx - i) <= stats.streak;
            const todayDone = isToday && activeCnt.total > 0 && activeCnt.done === activeCnt.total;
            return <div key={i} style={{ height: 26, border: `1px solid ${isToday || done ? GS.ink : GS.line}`, background: done || todayDone ? GS.accent : (isToday ? "#fff" : GS.accentMint) }} />;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 14, fontFamily: GS.mono, fontSize: 8, textAlign: "center" }}>
          {dayLetters.map((d, i) => <span key={i} style={{ color: i === todayIdx ? GS.ink : GS.faint, fontWeight: i === todayIdx ? 600 : 400 }}>{d}</span>)}
        </div>

        {/* Onglets Matin / Soir */}
        <div style={{ display: "flex", gap: 1, background: GS.line, border: `1px solid ${GS.line}`, marginBottom: 14 }}>
          {(["morning", "evening"] as Period[]).map((p) => {
            const on = period === p; const c = cnt(p === "morning" ? morning : evening);
            return <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, background: on ? GS.ink : "#fff", padding: 11, textAlign: "center", fontFamily: GS.mono, fontSize: 10, fontWeight: 600, letterSpacing: ".08em", color: on ? GS.accent : GS.muted, border: "none", cursor: "pointer" }}>{p === "morning" ? "MATIN" : "SOIR"} · {c.done}/{c.total}</button>;
          })}
        </div>

        {/* Étapes du créneau actif */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.length === 0 && <div style={{ fontSize: 12, color: GS.muted, fontStyle: "italic", padding: "8px 0" }}>Aucun soin sur ce créneau.</div>}
          {steps.map((step) => {
            const done = todayCompletions.includes(step.id);
            return (
              <div key={step.id} style={{ display: "flex", gap: 8 }}>
                <button onClick={() => checkMutR.mutate(step.id)} disabled={checkMutR.isPending}
                  style={{ flex: 1, display: "flex", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", border: `1px solid ${done ? GS.line : GS.ink}`, background: done ? GS.mintBg : "#fff", padding: 12 }}>
                  <span style={{ width: 24, height: 24, flex: "none", ...(done ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.ink}` }) }}>{done && <Check size={15} style={{ color: GS.accent }} strokeWidth={3} />}</span>
                  <span style={{ width: 44, height: 44, flex: "none", background: GS.panel, border: `1px solid ${GS.hair}` }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: GS.ink }}>{step.label}</span>
                    <span style={{ display: "block", marginTop: 3 }}><GsMono color={done ? GS.teal : GS.muted} style={{ letterSpacing: 0 }}>{done ? "Fait" : (period === "morning" ? "Matin" : "Soir")}</GsMono></span>
                  </span>
                </button>
                <button onClick={() => { if (confirm(`Retirer « ${step.label} » ?`)) deleteMutR.mutate(step.id); }} aria-label="Retirer" style={{ width: 44, flex: "none", border: `1px solid ${GS.line}`, background: "#fff", cursor: "pointer", color: GS.muted, display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>

        {/* Ajouter un produit (depuis les soins GlowScan) */}
        <button onClick={() => setView("orders")} style={{ marginTop: 13, border: `1px dashed ${GS.disabled}`, background: "#fff", padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <ShoppingBag size={18} style={{ color: GS.teal }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: GS.ink }}>Ajouter un produit commandé</div><div style={{ fontSize: 10, color: GS.muted, marginTop: 2 }}>Seuls vos soins GlowScan entrent en routine</div></div>
          <Plus size={16} style={{ color: GS.ink }} />
        </button>
        <button onClick={() => setView("reminders")} style={{ marginTop: 8, border: `1px solid ${GS.line}`, background: "#fff", padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <Bell size={18} style={{ color: GS.teal }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: GS.ink }}>Régler mes rappels</div><div style={{ fontSize: 10, color: GS.muted, marginTop: 2 }}>Horaires matin/soir, canal, jours</div></div>
          <ArrowRight size={16} style={{ color: GS.ink }} />
        </button>

        {/* Barre de navigation */}
        <div style={{ marginTop: "auto", paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 11, borderTop: `1px solid ${GS.hair}` }}>
            {nav.map((n) => { const I = n.icon; return (
              <button key={n.label} onClick={() => setLocation(n.path)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <I size={19} strokeWidth={1.6} style={{ color: n.on ? GS.ink : GS.faint }} />
                <span style={{ fontFamily: GS.mono, fontSize: 8, fontWeight: 600, color: n.on ? GS.ink : GS.faint, letterSpacing: ".06em" }}>{n.label}</span>
              </button>
            ); })}
          </div>
        </div>
      </div>

      <AnimatePresence>{showAddR && <AddStepModal period={period} onClose={() => setShowAddR(false)} />}</AnimatePresence>
    </div>
  );
}
