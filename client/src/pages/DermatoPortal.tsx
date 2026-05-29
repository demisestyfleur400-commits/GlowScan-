/**
 * DermatoPortal — Interface de review dataset pour les dermatologues partenaires.
 * Accès via /dermato — clé DERMATO_KEY séparée, aucune donnée business exposée.
 * Ne donne accès qu'à la validation/rejection des scans IA (dataset RLHF).
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Stethoscope, ShieldCheck, RefreshCw, LogOut } from "lucide-react";
import { DatasetTab } from "@/components/admin/DatasetReview";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
  emerald: "#10b981",
  emeraldLight: "#6ee7b7",
};

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const SESSION_KEY = "glowscan_dermato_key";
const DATASET_LIMIT = 10;

export default function DermatoPortal() {
  const [accessKey, setAccessKey]     = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [inputKey, setInputKey]       = useState("");
  const [isAuth, setIsAuth]           = useState(false);
  const [authError, setAuthError]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Dataset state
  const [items, setItems]             = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [status, setStatus]           = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [area, setArea]               = useState<"all" | "face" | "body" | "hair">("all");
  const [stats, setStats]             = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [reviewerName, setReviewerName] = useState<string>(() => localStorage.getItem("dermato_reviewer") || "");
  const [reviewBusy, setReviewBusy]   = useState<number | null>(null);
  const [reviewMsg, setReviewMsg]     = useState("");

  // Restaurer la session au chargement
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) { setAccessKey(saved); verifyAndLoad(saved); }
  }, []);

  useEffect(() => {
    localStorage.setItem("dermato_reviewer", reviewerName);
  }, [reviewerName]);

  useEffect(() => {
    if (isAuth && accessKey) fetchDataset();
  }, [status, area, page, isAuth]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const verifyAndLoad = async (key: string) => {
    setAuthLoading(true); setAuthError("");
    try {
      const res = await fetch("/api/admin/dataset/stats", {
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        setIsAuth(true);
        sessionStorage.setItem(SESSION_KEY, key);
        setAccessKey(key);
        const s = await res.json();
        setStats(s);
        fetchDatasetWithKey(key);
      } else {
        setAuthError("Clé invalide — contacte l'administrateur GlowScan.");
        setIsAuth(false);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      setAuthError("Erreur de connexion — vérifie ta connexion internet.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) verifyAndLoad(inputKey.trim());
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuth(false); setAccessKey(""); setInputKey("");
    setItems([]); setStats(null);
  };

  // ── Dataset API ───────────────────────────────────────────────────────────
  const fetchDatasetWithKey = async (key: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, area, page: String(page), limit: String(DATASET_LIMIT) });
      const res = await fetch(`/api/admin/dataset?${params}`, { headers: { "x-admin-key": key } });
      if (res.ok) { const j = await res.json(); setItems(j.items || []); setTotal(j.total || 0); }
    } catch (e) { console.error("[dermato] fetchDataset err", e); }
    finally { setLoading(false); }
  };

  const fetchDataset = () => fetchDatasetWithKey(accessKey);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/dataset/stats", { headers: { "x-admin-key": accessKey } });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const reviewScan = async (id: number, isVerified: boolean, expertNote: string, expertCorrectedCondition: string) => {
    if (!reviewerName.trim()) { setReviewMsg("❌ Indique d'abord ton nom"); setTimeout(() => setReviewMsg(""), 3000); return; }
    setReviewBusy(id);
    try {
      const res = await fetch(`/api/admin/dataset/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": accessKey },
        body: JSON.stringify({
          isVerified,
          expertNote: expertNote || null,
          expertCorrectedCondition: expertCorrectedCondition || null,
          expertReviewer: reviewerName.trim(),
        }),
      });
      if (res.ok) {
        setReviewMsg(isVerified ? `✅ Scan #${id} validé` : `❌ Scan #${id} rejeté`);
        await fetchDataset();
        await fetchStats();
        setTimeout(() => setReviewMsg(""), 2500);
      } else {
        setReviewMsg("❌ Erreur enregistrement");
      }
    } catch { setReviewMsg("❌ Erreur réseau"); }
    finally { setReviewBusy(null); }
  };

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (!isAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: DS.base, fontFamily: FONT }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl p-8"
          style={{ background: DS.surface, border: "1px solid rgba(16,185,129,0.25)" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              <Stethoscope className="w-8 h-8" style={{ color: DS.emeraldLight }} />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-extrabold" style={{ color: DS.text }}>GlowScan · Portail Dermato</h1>
              <p className="text-xs mt-1" style={{ color: DS.muted }}>Validation du dataset IA dermatologique</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold mb-1.5" style={{ color: DS.emeraldLight }}>
                Clé d'accès dermato
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Saisir la clé fournie par GlowScan"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  color: DS.text,
                }}
              />
            </div>
            {authError && (
              <p className="text-xs font-medium text-center" style={{ color: "#f87171" }}>{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading || !inputKey.trim()}
              className="w-full py-3 rounded-full text-white font-extrabold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{ background: DS.emerald }}
            >
              {authLoading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Vérification…</>
                : <><ShieldCheck className="w-4 h-4" /> Accéder au portail</>
              }
            </button>
          </form>

          <p className="text-[11px] text-center mt-6" style={{ color: DS.muted }}>
            Accès réservé aux dermatologues partenaires GlowScan.<br />
            Aucune donnée commerciale n'est accessible via ce portail.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── PORTAIL DATASET ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: DS.base, fontFamily: FONT }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: DS.base, borderBottom: "1px solid rgba(16,185,129,0.15)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <Stethoscope className="w-4 h-4" style={{ color: DS.emeraldLight }} />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight" style={{ color: DS.text }}>GlowScan Dermato</p>
            <p className="text-[10px]" style={{ color: DS.muted }}>Pipeline dataset RLHF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchDataset(); fetchStats(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.muted }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <DatasetTab
          items={items}
          total={total}
          page={page}
          limit={DATASET_LIMIT}
          setPage={(n) => setPage(n)}
          status={status}
          setStatus={(s) => { setStatus(s); setPage(1); }}
          area={area}
          setArea={(a) => { setArea(a); setPage(1); }}
          stats={stats}
          loading={loading}
          reviewerName={reviewerName}
          setReviewerName={setReviewerName}
          reviewBusy={reviewBusy}
          reviewMsg={reviewMsg}
          onReview={reviewScan}
          accessKey={accessKey}
        />
      </main>
    </div>
  );
}
