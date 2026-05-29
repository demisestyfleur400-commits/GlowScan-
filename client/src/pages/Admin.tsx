import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import {
  Users, Globe, MapPin, ScanFace, MessageCircle, TrendingUp, ShieldCheck,
  Eye, BarChart3, RefreshCw, Calendar, CalendarDays, CalendarRange, Infinity,
  Package, DollarSign, Phone, User, Crown, CheckCircle2, XCircle, Loader2,
  BarChart2, Store, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown,
  ChevronUp, Stethoscope, Mail,
} from "lucide-react";
import { formatPrice, catalog, type Product } from "@shared/catalog";
import { TractionDashboard } from "@/components/admin/TractionDashboard";
import { DatasetTab } from "@/components/admin/DatasetReview";

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

interface AnalyticsData {
  totalVisits: number; uniqueVisitors: number; visits6h: number; visits24h: number;
  totalAnalyses: number; totalWhatsappClicks: number; totalOrders: number; orderRevenue: number;
  ordersByBrand: { brand: string; count: number; revenue: number }[];
  recentOrders: any[]; visitsByCountry: { country: string; count: number }[];
  visitsByCity: { city: string; country: string; count: number }[];
  whatsappByBrand: { brand: string; count: number }[];
  whatsappByProduct: { productName: string; brand: string; count: number }[];
  recentVisits: any[]; recentWhatsappClicks: any[];
  visitsByDay: { day: string; count: number }[];
}

type Period = "today" | "week" | "month" | "all";

const PERIOD_LABELS: { value: Period; label: string; icon: any }[] = [
  { value: "today", label: "Aujourd'hui", icon: Calendar },
  { value: "week", label: "7 jours", icon: CalendarDays },
  { value: "month", label: "30 jours", icon: CalendarRange },
  { value: "all", label: "Tout", icon: Infinity },
];

interface Subscriber {
  id: string; name: string | null; email: string | null; profileImage: string | null;
  isPremium: boolean; expiresAt: string | null; plan: string | null; note: string | null;
  scansThisMonth: number;
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [adminTab, setAdminTab] = useState<"traction" | "stats" | "premium" | "leads" | "partenaires" | "vedettes" | "dataset" | "retention">("traction");
  const [datasetItems, setDatasetItems] = useState<any[]>([]);
  const [datasetTotal, setDatasetTotal] = useState(0);
  const [datasetPage, setDatasetPage] = useState(1);
  const [datasetStatus, setDatasetStatus] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [datasetArea, setDatasetArea] = useState<"all" | "face" | "body" | "hair">("all");
  const [datasetStats, setDatasetStats] = useState<{ total: number; verified: number; rejected: number; pending: number; withImage: number } | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [reviewerName, setReviewerName] = useState<string>(() => localStorage.getItem("dermato_reviewer") || "");
  const [reviewBusy, setReviewBusy] = useState<number | null>(null);
  const [reviewMsg, setReviewMsg] = useState("");
  const DATASET_LIMIT = 10;
  const [featuredItems, setFeaturedItems] = useState<{ productId: string; badge: string }[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredMsg, setFeaturedMsg] = useState("");
  const [featuredCatSearch, setFeaturedCatSearch] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [leadsData, setLeadsData] = useState<any>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [markOrderCode, setMarkOrderCode] = useState("");
  const [markOrderMsg, setMarkOrderMsg] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [quickActivateMsg, setQuickActivateMsg] = useState("");
  const [premiumReqs, setPremiumReqs] = useState<any[]>([]);
  const [premiumReqsLoading, setPremiumReqsLoading] = useState(false);
  const [premiumReqMsg, setPremiumReqMsg] = useState("");
  const [partnersData, setPartnersData] = useState<any[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);
  const [newPartner, setNewPartner] = useState({ name: "", location: "", whatsapp: "", description: "", category: "parfumerie" });
  const [newProduct, setNewProduct] = useState<{ [partnerId: number]: { name: string; category: string; description: string; price: string } }>({});
  const [partnerMsg, setPartnerMsg] = useState("");
  const [retentionData, setRetentionData] = useState<any>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionSegment, setRetentionSegment] = useState<string>("expiring_soon");

  const savedKey = sessionStorage.getItem("glowscan_admin_key");

  useEffect(() => {
    if (savedKey) { setAdminKey(savedKey); setIsAuthenticated(true); fetchData(savedKey, period); fetchSubscribers(savedKey); }
  }, []);

  useEffect(() => { if (isAuthenticated && adminKey) fetchData(adminKey, period); }, [period]);

  const fetchRetention = async (key: string) => {
    setRetentionLoading(true);
    try {
      const res = await fetch("/api/admin/retention", { headers: { "x-admin-key": key } });
      if (res.ok) setRetentionData(await res.json());
    } catch {} finally { setRetentionLoading(false); }
  };

  useEffect(() => {
    if (!isAuthenticated || !adminKey) return;
    if (adminTab === "premium") { fetchSubscribers(adminKey); fetchPremiumRequests(adminKey); }
    if (adminTab === "leads") fetchLeads(adminKey);
    if (adminTab === "partenaires") fetchPartners(adminKey);
    if (adminTab === "dataset") { fetchDataset(adminKey); fetchDatasetStats(adminKey); }
    if (adminTab === "vedettes") fetchFeatured();
    if (adminTab === "retention") fetchRetention(adminKey);
  }, [adminTab]);

  const fetchFeatured = async () => {
    setFeaturedLoading(true);
    try {
      const res = await fetch("/api/featured-products");
      if (res.ok) {
        const json = await res.json();
        setFeaturedItems((Array.isArray(json) ? json : []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)).map((it: any) => ({ productId: it.productId, badge: it.badge || "" })));
      }
    } catch {} finally { setFeaturedLoading(false); }
  };

  const saveFeatured = async () => {
    setFeaturedMsg("");
    try {
      const res = await fetch("/api/admin/featured-products", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ items: featuredItems }) });
      setFeaturedMsg(res.ok ? "✅ Sélection enregistrée" : "❌ Erreur sauvegarde");
      if (res.ok) await fetchFeatured();
    } catch { setFeaturedMsg("❌ Erreur réseau"); }
    setTimeout(() => setFeaturedMsg(""), 4000);
  };

  const toggleFeatured = (productId: string) => {
    setFeaturedItems((prev) => {
      const idx = prev.findIndex((p) => p.productId === productId);
      if (idx >= 0) return prev.filter((p) => p.productId !== productId);
      if (prev.length >= 12) return prev;
      return [...prev, { productId, badge: "" }];
    });
  };

  const moveFeatured = (productId: string, dir: -1 | 1) => {
    setFeaturedItems((prev) => {
      const idx = prev.findIndex((p) => p.productId === productId);
      if (idx < 0) return prev;
      const next = [...prev]; const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const updateBadge = (productId: string, badge: string) => setFeaturedItems((prev) => prev.map((p) => (p.productId === productId ? { ...p, badge } : p)));

  const fetchSubscribers = async (key: string) => {
    setSubLoading(true);
    try { const res = await fetch("/api/admin/users", { headers: { "x-admin-key": key } }); if (res.ok) setSubscribers(await res.json() || []); } catch {} finally { setSubLoading(false); }
  };

  const fetchPremiumRequests = async (key: string) => {
    setPremiumReqsLoading(true);
    try { const res = await fetch("/api/admin/premium/requests", { headers: { "x-admin-key": key } }); if (res.ok) { const j = await res.json(); setPremiumReqs(j.requests || []); } } catch {} finally { setPremiumReqsLoading(false); }
  };

  const confirmPremiumRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/premium/confirm/${id}`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ note: "Paiement confirmé via admin" }) });
      setPremiumReqMsg(res.ok ? "✅ Premium activé avec succès" : "❌ Erreur lors de l'activation");
      if (res.ok) { fetchPremiumRequests(adminKey); fetchSubscribers(adminKey); }
    } catch { setPremiumReqMsg("❌ Erreur réseau"); }
    setTimeout(() => setPremiumReqMsg(""), 4000);
  };

  const rejectPremiumRequest = async (id: number) => {
    try { const res = await fetch(`/api/admin/premium/reject/${id}`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ reason: "Paiement non reçu" }) }); if (res.ok) { setPremiumReqMsg("🚫 Demande rejetée"); fetchPremiumRequests(adminKey); } } catch {}
    setTimeout(() => setPremiumReqMsg(""), 4000);
  };

  const fetchLeads = async (key: string) => {
    setLeadsLoading(true);
    try { const res = await fetch("/api/admin/leads", { headers: { "x-admin-key": key } }); if (res.ok) setLeadsData(await res.json()); } catch {} finally { setLeadsLoading(false); }
  };

  const fetchPartners = async (key: string) => {
    setPartnersLoading(true);
    try { const res = await fetch("/api/admin/partners", { headers: { "x-admin-key": key } }); if (res.ok) setPartnersData(await res.json()); } catch {} finally { setPartnersLoading(false); }
  };

  const fetchDataset = async (key: string) => {
    setDatasetLoading(true);
    try {
      const params = new URLSearchParams({ status: datasetStatus, area: datasetArea, page: String(datasetPage), limit: String(DATASET_LIMIT) });
      const res = await fetch(`/api/admin/dataset?${params}`, { headers: { "x-admin-key": key } });
      if (res.ok) { const j = await res.json(); setDatasetItems(j.items || []); setDatasetTotal(j.total || 0); }
    } catch (e) { console.error("[dataset] fetch err", e); } finally { setDatasetLoading(false); }
  };

  const fetchDatasetStats = async (key: string) => {
    try { const res = await fetch("/api/admin/dataset/stats", { headers: { "x-admin-key": key } }); if (res.ok) setDatasetStats(await res.json()); } catch {}
  };

  const reviewScan = async (id: number, isVerified: boolean, expertNote: string, expertCorrectedCondition: string) => {
    if (!reviewerName.trim()) { setReviewMsg("❌ Indique d'abord ton nom (en haut)"); setTimeout(() => setReviewMsg(""), 3000); return; }
    setReviewBusy(id);
    try {
      const res = await fetch(`/api/admin/dataset/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ isVerified, expertNote: expertNote || null, expertCorrectedCondition: expertCorrectedCondition || null, expertReviewer: reviewerName.trim() }) });
      if (res.ok) { setReviewMsg(isVerified ? `✅ Scan #${id} validé` : `❌ Scan #${id} rejeté`); await fetchDataset(adminKey); await fetchDatasetStats(adminKey); setTimeout(() => setReviewMsg(""), 2500); }
      else setReviewMsg("❌ Erreur lors de l'enregistrement");
    } catch { setReviewMsg("❌ Erreur réseau"); } finally { setReviewBusy(null); }
  };

  useEffect(() => { if (isAuthenticated && adminKey && adminTab === "dataset") fetchDataset(adminKey); }, [datasetStatus, datasetArea, datasetPage]);
  useEffect(() => { localStorage.setItem("dermato_reviewer", reviewerName); }, [reviewerName]);

  const createPartner = async () => {
    if (!newPartner.name || !newPartner.location || !newPartner.whatsapp) { setPartnerMsg("❌ Nom, quartier et WhatsApp sont requis"); setTimeout(() => setPartnerMsg(""), 3000); return; }
    const res = await fetch("/api/admin/partners", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify(newPartner) });
    if (res.ok) { setNewPartner({ name: "", location: "", whatsapp: "", description: "", category: "parfumerie" }); setPartnerMsg("✅ Partenaire ajouté !"); fetchPartners(adminKey); }
    else { const d = await res.json(); setPartnerMsg(`❌ ${d.message}`); }
    setTimeout(() => setPartnerMsg(""), 3000);
  };

  const togglePartner = async (id: number, active: boolean) => { await fetch(`/api/admin/partners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ active }) }); fetchPartners(adminKey); };
  const addProduct = async (partnerId: number) => {
    const p = newProduct[partnerId]; if (!p?.name) return;
    await fetch(`/api/admin/partners/${partnerId}/products`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ ...p, price: parseInt(p.price) || 0 }) });
    setNewProduct(prev => ({ ...prev, [partnerId]: { name: "", category: "soin", description: "", price: "" } }));
    fetchPartners(adminKey);
  };
  const toggleProduct = async (id: number, active: boolean) => { await fetch(`/api/admin/partners/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ active }) }); fetchPartners(adminKey); };

  const markOrdered = async () => {
    if (!markOrderCode.trim()) return;
    try {
      const res = await fetch("/api/admin/leads/mark-ordered", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ referenceCode: markOrderCode.trim().toUpperCase() }) });
      const json = await res.json();
      setMarkOrderMsg(res.ok ? `✅ Commande confirmée pour ${json.lead?.brandName || markOrderCode}` : `❌ ${json.message || "Code non trouvé"}`);
      if (res.ok) { setMarkOrderCode(""); fetchLeads(adminKey); }
    } catch { setMarkOrderMsg("❌ Erreur réseau"); }
  };

  const activateUser = async (userId: string, durationDays = 30) => {
    setActionUserId(userId);
    try { const res = await fetch("/api/admin/subscription/activate", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ userId, durationDays, note: actionMsg || "Paiement WhatsApp confirmé" }) }); if (res.ok) { setActionMsg(""); await fetchSubscribers(adminKey); } } catch {} finally { setActionUserId(null); }
  };

  const deactivateUser = async (userId: string) => {
    setActionUserId(userId);
    try { const res = await fetch("/api/admin/subscription/deactivate", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ userId }) }); if (res.ok) await fetchSubscribers(adminKey); } catch {} finally { setActionUserId(null); }
  };

  const fetchData = async (key: string, p: Period = "all") => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`, { headers: { "x-admin-key": key } });
      if (!res.ok) { if (res.status === 403) { setError("Clé admin incorrecte"); setIsAuthenticated(false); sessionStorage.removeItem("glowscan_admin_key"); } else setError("Erreur serveur"); setData(null); return; }
      setData(await res.json()); setIsAuthenticated(true); sessionStorage.setItem("glowscan_admin_key", key);
    } catch { setError("Erreur de connexion"); } finally { setLoading(false); }
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (adminKey.trim()) fetchData(adminKey.trim(), period); };

  // ── LOGIN ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-8"
            style={{ background: DS.surface, border: "1px solid rgba(167,139,250,0.2)" }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
              >
                <ShieldCheck className="w-6 h-6" style={{ color: DS.violetMid }} />
              </div>
            </div>
            <h1 className="text-xl font-extrabold text-center mb-2" style={{ color: DS.text }} data-testid="text-admin-title">
              Tableau de Bord Admin
            </h1>
            <p className="text-sm text-center mb-6" style={{ color: DS.muted }}>
              Entrez votre clé admin pour accéder aux statistiques
            </p>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Clé admin"
                data-testid="input-admin-key"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.25)", color: DS.text }}
              />
              {error && <p className="text-sm text-red-400 mb-3 text-center" data-testid="text-admin-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                data-testid="button-admin-login"
                className="w-full py-3 rounded-full text-white font-extrabold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
                style={{ background: DS.violet }}
              >
                {loading ? "Chargement..." : "Accéder"}
              </button>
            </form>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── DASHBOARD ──
  return (
    <div className="min-h-screen" style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: DS.text }} data-testid="text-admin-dashboard-title">Tableau de Bord</h1>
              <p className="text-sm font-medium" style={{ color: DS.muted }}>Administration GlowScan</p>
            </div>
            <button
              onClick={() => { fetchData(adminKey, period); fetchSubscribers(adminKey); }}
              disabled={loading}
              data-testid="button-refresh-stats"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-extrabold disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.body }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          {/* Tab nav */}
          <div
            className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 rounded-2xl p-1.5"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
          >
            {[
              { key: "dataset", label: "Dataset", icon: Stethoscope, badge: datasetStats?.pending || 0, activeColor: "#10b981" },
              { key: "traction", label: "Traction", icon: TrendingUp, badge: 0, activeColor: DS.violet },
              { key: "stats", label: "Stats", icon: BarChart2, badge: 0, activeColor: DS.violet },
              { key: "premium", label: "Abonnés", icon: Crown, badge: subscribers.filter(s => s.isPremium).length, activeColor: "#fbbf24" },
              { key: "retention", label: "Rétention", icon: MessageCircle, badge: retentionData?.segments?.expiring_soon || 0, activeColor: "#f43f5e" },
              { key: "leads", label: "Commandes", icon: Phone, badge: 0, activeColor: "#10b981" },
              { key: "partenaires", label: "Partenaires", icon: Store, badge: 0, activeColor: DS.violet },
              { key: "vedettes", label: "Vedettes", icon: Package, badge: featuredItems.length, activeColor: "#fbbf24" },
            ].map(({ key, label, icon: Icon, badge, activeColor }) => (
              <button
                key={key}
                onClick={() => setAdminTab(key as any)}
                data-testid={`button-tab-${key}`}
                className="flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl text-[10px] font-extrabold transition-all justify-center relative"
                style={adminTab === key
                  ? { background: activeColor, color: "white" }
                  : { color: DS.muted, background: "transparent" }
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold"
                    style={adminTab === key ? { background: "white", color: activeColor } : { background: activeColor, color: "white" }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Period selector */}
          {(adminTab === "stats" || adminTab === "traction") && (
            <div
              className="flex gap-2 rounded-2xl p-1.5"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
              data-testid="period-selector"
            >
              {PERIOD_LABELS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  data-testid={`button-period-${value}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex-1 justify-center"
                  style={period === value
                    ? { background: DS.violet, color: "white" }
                    : { color: DS.muted, background: "transparent" }
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== PREMIUM ===== */}
        {adminTab === "premium" && (
          <div className="space-y-4">
            {/* Demandes */}
            <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: "1px solid rgba(124,58,237,0.3)" }}>
              <div
                className="flex items-center gap-2 px-5 py-4"
                style={{ background: "rgba(124,58,237,0.1)", borderBottom: "1px solid rgba(124,58,237,0.2)" }}
              >
                <Crown className="w-4 h-4" style={{ color: DS.violetMid }} />
                <h2 className="text-sm font-extrabold" style={{ color: DS.violetMid }}>Demandes de paiement Premium</h2>
                <button onClick={() => fetchPremiumRequests(adminKey)} className="ml-auto p-1.5 rounded-lg transition-colors" style={{ background: "rgba(167,139,250,0.15)" }}>
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: DS.violetMid }} />
                </button>
              </div>
              {premiumReqMsg && <div className="px-5 py-2 text-sm font-extrabold" style={{ color: DS.body, background: "rgba(124,58,237,0.08)", borderBottom: `1px solid ${DS.border}` }}>{premiumReqMsg}</div>}
              {premiumReqsLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: DS.violetMid }} /></div>
              ) : premiumReqs.filter(r => r.status === "pending").length === 0 ? (
                <p className="text-sm italic p-6 text-center" style={{ color: DS.muted }}>Aucune demande en attente</p>
              ) : (
                <div>
                  {premiumReqs.filter(r => r.status === "pending").map(req => (
                    <div key={req.id} className="px-5 py-4" style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`row-premium-req-${req.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-extrabold" style={{ color: DS.text }}>{req.userFirstName || req.userEmail || req.userId}</p>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={req.method === "mtn_momo" ? { background: "rgba(251,191,36,0.15)", color: "#fbbf24" } : { background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                              {req.method === "mtn_momo" ? "🟡 MTN MoMo" : "🟠 Orange Money"}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: DS.body }}>📱 {req.phone}</p>
                          <p className="text-xs" style={{ color: DS.body }}>🔑 Réf: <span className="font-extrabold" style={{ color: DS.violetMid }}>{req.reference}</span></p>
                          <p className="text-xs" style={{ color: DS.muted }}>💵 {req.amount} FCFA · {new Date(req.createdAt).toLocaleDateString("fr-FR")} à {new Date(req.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={() => confirmPremiumRequest(req.id)} data-testid={`button-confirm-req-${req.id}`} className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-colors" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmer
                          </button>
                          <button onClick={() => rejectPremiumRequest(req.id)} data-testid={`button-reject-req-${req.id}`} className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-colors" style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                            <XCircle className="w-3.5 h-3.5" /> Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Résumé */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total utilisateurs", value: subscribers.length },
                { label: "Abonnés Premium", value: subscribers.filter(s => s.isPremium).length },
                { label: "Gratuits", value: subscribers.filter(s => !s.isPremium).length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                  <p className="text-2xl font-extrabold" style={{ color: DS.violetMid }}>{value}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: DS.muted }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Users table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }} data-testid="section-subscribers">
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
                <Crown className="w-4 h-4" style={{ color: DS.violetMid }} />
                <h2 className="text-sm font-extrabold" style={{ color: DS.text }}>Gestion des abonnements</h2>
                <span className="ml-auto text-xs" style={{ color: DS.muted }}>{subscribers.length} compte{subscribers.length > 1 ? "s" : ""}</span>
              </div>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DS.border}`, background: "rgba(255,255,255,0.02)" }}>
                <input
                  type="text" value={subSearch} onChange={e => setSubSearch(e.target.value)}
                  placeholder="Rechercher par nom ou email..."
                  data-testid="input-sub-search"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }}
                />
              </div>
              {subLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: DS.violetMid }} /></div>
              ) : subscribers.length === 0 ? (
                <p className="text-sm italic p-6" style={{ color: DS.muted }}>Aucun utilisateur enregistré</p>
              ) : (() => {
                const filtered = subscribers.filter(s => { if (!subSearch.trim()) return true; const q = subSearch.toLowerCase(); return (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q); });
                if (filtered.length === 0) return <p className="text-sm italic p-6" style={{ color: DS.muted }}>Aucun résultat pour "{subSearch}"</p>;
                return (
                  <div className="max-h-[70vh] overflow-y-auto">
                    {filtered.map((sub) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-4 px-5 py-4 transition-colors"
                        style={{ borderBottom: `1px solid ${DS.border}` }}
                        data-testid={`row-subscriber-${sub.id}`}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                          {sub.profileImage ? <img src={sub.profileImage} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5" style={{ color: DS.muted }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold truncate" style={{ color: DS.text }}>{sub.name || "Utilisateur"}</p>
                            {sub.isPremium ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: DS.violetMid }}>
                                <Crown className="w-2.5 h-2.5" /> PREMIUM
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: DS.muted }}>GRATUIT</span>
                            )}
                          </div>
                          <p className="text-xs truncate" style={{ color: DS.muted }}>{sub.email || sub.id.slice(0, 16) + "..."}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-[11px]" style={{ color: DS.body }}>{sub.scansThisMonth} analyse{sub.scansThisMonth !== 1 ? "s" : ""} ce mois</p>
                            {sub.isPremium && sub.expiresAt && <p className="text-[11px] font-medium" style={{ color: DS.violetMid }}>Expire le {new Date(sub.expiresAt).toLocaleDateString("fr-FR")}</p>}
                            {sub.note && <p className="text-[11px] italic" style={{ color: DS.muted }}>"{sub.note}"</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {actionUserId === sub.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: DS.muted }} />
                          ) : sub.isPremium ? (
                            <button onClick={() => deactivateUser(sub.id)} data-testid={`button-deactivate-${sub.id}`} className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
                              <XCircle className="w-3.5 h-3.5" /> Désactiver
                            </button>
                          ) : (
                            <button onClick={() => activateUser(sub.id, 30)} data-testid={`button-activate-${sub.id}`} className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: DS.violetMid }}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Activer 30j
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ===== LEADS ===== */}
        {adminTab === "leads" && (
          <div className="space-y-4">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#10b981" }} /></div>
            ) : !leadsData ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <p className="text-sm" style={{ color: DS.muted }}>Aucune donnée disponible</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Clics WhatsApp", value: leadsData.total, color: "#a78bfa" },
                    { label: "Messages confirmés", value: leadsData.confirmed, sub: `${leadsData.conversionRate}% conversion`, color: "#10b981" },
                    { label: "Commandes réelles", value: leadsData.ordered, sub: "validées par marque", color: "#6ee7b7" },
                  ].map(({ label, value, color, sub }: any) => (
                    <div key={label} className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
                      <p className="text-xs font-extrabold mt-0.5" style={{ color: DS.body }}>{label}</p>
                      {sub && <p className="text-[10px]" style={{ color: DS.muted }}>{sub}</p>}
                    </div>
                  ))}
                </div>

                {leadsData.byBrand && Object.keys(leadsData.byBrand).length > 0 && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                    <div className="p-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
                      <p className="text-sm font-extrabold" style={{ color: DS.text }}>Performance par marque</p>
                    </div>
                    {Object.entries(leadsData.byBrand).map(([brand, stats]: any) => (
                      <div key={brand} className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${DS.border}` }}>
                        <div>
                          <p className="text-sm font-extrabold" style={{ color: DS.text }}>{brand}</p>
                          <p className="text-[11px]" style={{ color: DS.muted }}>{stats.clicks} clics · {stats.confirmed} confirmés</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold" style={{ color: "#6ee7b7" }}>{stats.ordered}</span>
                          <p className="text-[10px]" style={{ color: DS.muted }}>commandes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl p-4 space-y-3" style={{ background: DS.surface, border: "1px solid rgba(16,185,129,0.25)" }}>
                  <p className="text-sm font-extrabold" style={{ color: DS.text }}>Confirmer une commande</p>
                  <p className="text-xs" style={{ color: DS.muted }}>La marque vous communique un code de référence → entrez-le ici pour valider la commande réelle.</p>
                  <div className="flex gap-2">
                    <input type="text" value={markOrderCode} onChange={e => { setMarkOrderCode(e.target.value.toUpperCase()); setMarkOrderMsg(""); }} placeholder="GS-XXXX-XXXX"
                      className="flex-1 px-3 py-2 rounded-xl text-sm font-mono outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.3)", color: DS.text }} />
                    <button onClick={markOrdered} className="px-4 py-2 text-white text-sm font-extrabold rounded-xl active:scale-95 transition-all" style={{ background: "#10b981" }}>Valider</button>
                  </div>
                  {markOrderMsg && <p className="text-xs font-medium" style={{ color: DS.body }}>{markOrderMsg}</p>}
                </div>

                {leadsData.recent && leadsData.recent.length > 0 && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                    <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DS.border}` }}>
                      <p className="text-sm font-extrabold" style={{ color: DS.text }}>Leads récents</p>
                      <button onClick={() => fetchLeads(adminKey)} className="text-xs font-extrabold" style={{ color: DS.violetMid }}>Rafraîchir</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {leadsData.recent.map((lead: any) => (
                        <div key={lead.id} className="px-4 py-3" style={{ borderBottom: `1px solid ${DS.border}` }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-extrabold" style={{ color: DS.body }}>{lead.referenceCode}</p>
                              <p className="text-[11px] truncate" style={{ color: DS.muted }}>{lead.brandName} — {lead.productNames}</p>
                              {lead.totalPrice > 0 && <p className="text-[10px] font-extrabold" style={{ color: DS.violetMid }}>{lead.totalPrice.toLocaleString()} FCFA</p>}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={lead.status === "ordered" ? { background: "rgba(16,185,129,0.15)", color: "#6ee7b7" } : lead.status === "confirmed" ? { background: "rgba(16,185,129,0.1)", color: "#10b981" } : { background: "rgba(255,255,255,0.06)", color: DS.muted }}>
                                {lead.status === "ordered" ? "✅ Commandé" : lead.status === "confirmed" ? "✓ Envoyé" : "👁 Clic"}
                              </span>
                              <p className="text-[9px] mt-0.5" style={{ color: DS.muted }}>{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== PARTENAIRES ===== */}
        {adminTab === "partenaires" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2" style={{ color: DS.text }}>
                <Plus className="w-4 h-4" style={{ color: DS.violetMid }} />
                Ajouter une parfumerie partenaire
              </h3>
              <div className="space-y-2">
                {[
                  { placeholder: "Nom de la boutique *", key: "name", testid: "input-partner-name" },
                  { placeholder: "Quartier / Ville * (ex: Akwa, Douala)", key: "location", testid: "input-partner-location" },
                  { placeholder: "WhatsApp * (ex: 237677000000)", key: "whatsapp", testid: "input-partner-whatsapp" },
                ].map(({ placeholder, key, testid }) => (
                  <input key={key} type="text" placeholder={placeholder} value={(newPartner as any)[key]}
                    onChange={e => setNewPartner(p => ({ ...p, [key]: e.target.value }))}
                    data-testid={testid}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }}
                  />
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <select value={newPartner.category} onChange={e => setNewPartner(p => ({ ...p, category: e.target.value }))}
                    className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }}>
                    <option value="parfumerie">Parfumerie</option>
                    <option value="boutique">Boutique beauté</option>
                    <option value="pharmacie">Pharmacie</option>
                  </select>
                  <input type="text" placeholder="Description (optionnel)" value={newPartner.description}
                    onChange={e => setNewPartner(p => ({ ...p, description: e.target.value }))}
                    className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }} />
                </div>
                <button onClick={createPartner} data-testid="button-create-partner"
                  className="w-full text-white font-extrabold py-2.5 rounded-full text-sm transition-all active:scale-[0.98]"
                  style={{ background: DS.violet }}>
                  Ajouter ce partenaire
                </button>
                {partnerMsg && <p className="text-sm font-extrabold text-center" style={{ color: DS.body }}>{partnerMsg}</p>}
              </div>
            </div>

            {partnersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: DS.violetMid }} /></div>
            ) : partnersData.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: DS.surface, border: `2px dashed ${DS.border}` }}>
                <Store className="w-8 h-8 mx-auto mb-2" style={{ color: DS.muted }} />
                <p className="text-sm" style={{ color: DS.muted }}>Aucun partenaire encore. Commence par en ajouter un !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partnersData.map((partner: any) => (
                  <div key={partner.id} className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: partner.active ? "#10b981" : DS.muted }} />
                            <h4 className="text-sm font-extrabold" style={{ color: DS.text }}>{partner.name}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold capitalize" style={{ background: "rgba(167,139,250,0.15)", color: DS.violetMid }}>{partner.category}</span>
                          </div>
                          <p className="text-xs" style={{ color: DS.body }}>📍 {partner.location}</p>
                          <p className="text-xs font-extrabold" style={{ color: "#6ee7b7" }}>📱 {partner.whatsapp}</p>
                          {partner.description && <p className="text-xs mt-0.5" style={{ color: DS.muted }}>{partner.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => togglePartner(partner.id, !partner.active)} className="text-xs font-extrabold px-3 py-1.5 rounded-xl transition-colors" style={partner.active ? { background: "rgba(16,185,129,0.12)", color: "#6ee7b7" } : { background: "rgba(255,255,255,0.06)", color: DS.muted }}>
                            {partner.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)} className="text-xs font-extrabold px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: DS.body }}>
                            {expandedPartner === partner.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: DS.muted }}>{partner.products?.length || 0} produit(s)</p>
                    </div>

                    {expandedPartner === partner.id && (
                      <div className="p-4" style={{ borderTop: `1px solid ${DS.border}`, background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-xs font-extrabold mb-3" style={{ color: DS.body }}>Produits de {partner.name}</p>
                        {(partner.products || []).map((prod: any) => (
                          <div key={prod.id} className="flex items-center justify-between rounded-xl px-3 py-2 mb-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}>
                            <div>
                              <p className="text-xs font-extrabold" style={{ color: DS.text }}>{prod.name}</p>
                              <p className="text-[10px]" style={{ color: DS.muted }}>{prod.category} · {prod.price > 0 ? `${prod.price.toLocaleString()} FCFA` : "Prix sur demande"}</p>
                              {prod.description && <p className="text-[10px] italic" style={{ color: DS.muted }}>{prod.description}</p>}
                            </div>
                            <button onClick={() => toggleProduct(prod.id, !prod.active)} className="text-[10px] font-extrabold px-2 py-1 rounded-lg" style={prod.active ? { background: "rgba(124,58,237,0.12)", color: DS.violetMid } : { background: "rgba(255,255,255,0.06)", color: DS.muted }}>
                              {prod.active ? "Actif" : "Inactif"}
                            </button>
                          </div>
                        ))}
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: DS.muted }}>Ajouter un produit</p>
                          <input type="text" placeholder="Nom du produit *" value={newProduct[partner.id]?.name || ""}
                            onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: e.target.value, category: prev[partner.id]?.category || "soin", description: prev[partner.id]?.description || "", price: prev[partner.id]?.price || "" } }))}
                            className="w-full rounded-xl px-3 py-2 text-xs outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }} />
                          <div className="grid grid-cols-2 gap-2">
                            <select value={newProduct[partner.id]?.category || "soin"}
                              onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: prev[partner.id]?.name || "", category: e.target.value, description: prev[partner.id]?.description || "", price: prev[partner.id]?.price || "" } }))}
                              className="rounded-xl px-3 py-2 text-xs outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }}>
                              <option value="soin">Soin</option><option value="parfum">Parfum</option><option value="cheveux">Cheveux</option><option value="maquillage">Maquillage</option><option value="corps">Corps</option>
                            </select>
                            <input type="number" placeholder="Prix FCFA (0 = sur demande)" value={newProduct[partner.id]?.price || ""}
                              onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: prev[partner.id]?.name || "", category: prev[partner.id]?.category || "soin", description: prev[partner.id]?.description || "", price: e.target.value } }))}
                              className="rounded-xl px-3 py-2 text-xs outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }} />
                          </div>
                          <input type="text" placeholder="Description courte (optionnel)" value={newProduct[partner.id]?.description || ""}
                            onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: prev[partner.id]?.name || "", category: prev[partner.id]?.category || "soin", description: e.target.value, price: prev[partner.id]?.price || "" } }))}
                            className="w-full rounded-xl px-3 py-2 text-xs outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }} />
                          <button onClick={() => addProduct(partner.id)} data-testid={`button-add-product-${partner.id}`}
                            className="w-full text-white font-extrabold py-2 rounded-full text-xs transition-all active:scale-[0.98]" style={{ background: DS.violet }}>
                            + Ajouter ce produit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== DATASET ===== */}
        {adminTab === "dataset" && (
          <DatasetTab
            items={datasetItems} total={datasetTotal} page={datasetPage} limit={DATASET_LIMIT}
            setPage={setDatasetPage} status={datasetStatus}
            setStatus={(s) => { setDatasetStatus(s as any); setDatasetPage(1); }}
            area={datasetArea} setArea={(a) => { setDatasetArea(a as any); setDatasetPage(1); }}
            stats={datasetStats} loading={datasetLoading}
            reviewerName={reviewerName} setReviewerName={setReviewerName}
            reviewBusy={reviewBusy} reviewMsg={reviewMsg}
            onReview={reviewScan} accessKey={adminKey}
          />
        )}

        {/* ===== RÉTENTION ===== */}
        {adminTab === "retention" && (
          <RetentionTab
            data={retentionData}
            loading={retentionLoading}
            segment={retentionSegment}
            setSegment={setRetentionSegment}
            onRefresh={() => fetchRetention(adminKey)}
          />
        )}

        {/* ===== VEDETTES ===== */}
        {adminTab === "vedettes" && (
          <FeaturedTab
            featuredItems={featuredItems} featuredLoading={featuredLoading} featuredMsg={featuredMsg}
            featuredCatSearch={featuredCatSearch} setFeaturedCatSearch={setFeaturedCatSearch}
            toggleFeatured={toggleFeatured} moveFeatured={moveFeatured}
            updateBadge={updateBadge} saveFeatured={saveFeatured}
          />
        )}

        {/* ===== TRACTION ===== */}
        {adminTab === "traction" && <TractionDashboard adminKey={adminKey} period={period} />}

        {/* ===== STATS ===== */}
        {adminTab === "stats" && loading && !data && (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin" style={{ color: DS.violetMid }} /></div>
        )}

        {adminTab === "stats" && data && (
          <div className="space-y-6">
            {/* Live */}
            <div className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }} data-testid="card-live-visits">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm font-extrabold" style={{ color: DS.text }}>Activité en temps réel</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: DS.violetMid }} data-testid="stat-visits-6h">{data.visits6h}</p>
                  <p className="text-[11px] font-extrabold mt-0.5" style={{ color: DS.body }}>Visites · 6 dernières heures</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: DS.violetMid }} data-testid="stat-visits-24h">{data.visits24h}</p>
                  <p className="text-[11px] font-extrabold mt-0.5" style={{ color: DS.body }}>Visites · Dernières 24h</p>
                </div>
              </div>
              {data.visits6h === 0 && data.totalVisits === 0 && (
                <p className="text-[11px] rounded-lg px-3 py-2 mt-2" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: DS.body }}>
                  ⚠️ Le suivi de visites était inactif. Il est maintenant réactivé — les chiffres se rempliront dès les prochaines visites.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={<Eye className="w-5 h-5" />} label="Total Visites" value={data.totalVisits} color="violet" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Visiteurs Uniques" value={data.uniqueVisitors} color="violet" />
              <StatCard icon={<ScanFace className="w-5 h-5" />} label="Analyses IA" value={data.totalAnalyses} color="violet" />
              <StatCard icon={<MessageCircle className="w-5 h-5" />} label="Clics WhatsApp" value={data.totalWhatsappClicks} color="green" />
              <StatCard icon={<Package className="w-5 h-5" />} label="Commandes" value={data.totalOrders} color="amber" />
              <StatCard icon={<DollarSign className="w-5 h-5" />} label="Chiffre d'Affaires" value={data.orderRevenue} color="amber" formatAsCurrency />
            </div>

            {data.ordersByBrand.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="section-orders-brand">
                  {data.ordersByBrand.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }} data-testid={`card-brand-${i}`}>
                      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${DS.violet}, ${DS.violetMid})` }} />
                      <div className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-3" style={{ background: "rgba(124,58,237,0.12)" }}>
                          <Package className="w-3.5 h-3.5" style={{ color: DS.violetMid }} />
                          <span className="text-xs font-extrabold" style={{ color: DS.violetMid }}>{item.brand}</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-2xl font-extrabold" style={{ color: DS.text }}>{item.count}</p>
                            <p className="text-[11px] font-medium" style={{ color: DS.muted }}>commandes</p>
                          </div>
                          <div className="pt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
                            <p className="text-lg font-extrabold" style={{ color: DS.violetMid }}>{formatPrice(item.revenue)}</p>
                            <p className="text-[11px] font-medium" style={{ color: DS.muted }}>chiffre d'affaires</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <SectionCard title="Dernières Commandes" icon={<Package className="w-4 h-4" style={{ color: DS.violetMid }} />} testId="section-recent-orders">
                  {data.recentOrders.length === 0 ? (
                    <p className="text-sm italic" style={{ color: DS.muted }}>Aucune commande enregistrée</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                            {["N°","Client","Marque","Articles","Total","Statut","Date"].map(h => (
                              <th key={h} className="text-left py-2 text-xs font-extrabold uppercase" style={{ color: DS.muted }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentOrders.slice(0, 25).map((order: any, i: number) => (
                            <tr key={i} className="transition-colors" style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`row-order-${i}`}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <td className="py-2.5"><span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.12)", color: DS.violetMid }}>{order.orderNumber}</span></td>
                              <td className="py-2.5">
                                <p className="text-sm font-medium" style={{ color: DS.text }}>{order.clientName}</p>
                                <p className="text-xs flex items-center gap-1" style={{ color: DS.muted }}><Phone className="w-3 h-3" />{order.clientPhone}</p>
                                {order.clientAddress && <p className="text-xs flex items-center gap-1" style={{ color: DS.muted }}><MapPin className="w-3 h-3" />{order.clientAddress}</p>}
                              </td>
                              <td className="py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ background: "rgba(124,58,237,0.12)", color: DS.violetMid }}>{order.brand}</span></td>
                              <td className="py-2.5 text-xs max-w-[200px]" style={{ color: DS.body }}>{Array.isArray(order.items) ? order.items.map((it: any) => `${it.name} x${it.quantity}`).join(", ") : "—"}</td>
                              <td className="py-2.5 text-sm font-extrabold whitespace-nowrap" style={{ color: DS.text }}>{formatPrice(order.totalPrice)}</td>
                              <td className="py-2.5"><span className="text-xs font-extrabold px-2.5 py-1 rounded-full" style={order.status === "livrée" ? { background: "rgba(16,185,129,0.12)", color: "#6ee7b7" } : { background: "rgba(124,58,237,0.1)", color: DS.violetMid }}>{order.status === "envoyée" ? "📦 Envoyée" : order.status === "livrée" ? "✅ Livrée" : order.status}</span></td>
                              <td className="py-2.5 text-xs whitespace-nowrap" style={{ color: DS.muted }}>{order.createdAt ? new Date(order.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Clics WhatsApp par Marque" icon={<BarChart3 className="w-4 h-4" style={{ color: "#10b981" }} />} testId="section-whatsapp-brand">
                {data.whatsappByBrand.length === 0 ? <p className="text-sm italic" style={{ color: DS.muted }}>Aucune donnée</p> : (
                  <div className="space-y-3">
                    {data.whatsappByBrand.map((item, i) => {
                      const pct = Math.round((item.count / (data.whatsappByBrand[0]?.count || 1)) * 100);
                      return (
                        <div key={i} data-testid={`stat-brand-${i}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-extrabold" style={{ color: DS.text }}>{item.brand}</span>
                            <span className="text-sm font-extrabold" style={{ color: "#6ee7b7" }}>{item.count} clics</span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #6ee7b7)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Produits les plus demandés" icon={<TrendingUp className="w-4 h-4" style={{ color: DS.violetMid }} />} testId="section-whatsapp-products">
                {data.whatsappByProduct.length === 0 ? <p className="text-sm italic" style={{ color: DS.muted }}>Aucune donnée</p> : (
                  <div className="space-y-2">
                    {data.whatsappByProduct.slice(0, 10).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`stat-product-${i}`}>
                        <div>
                          <p className="text-sm font-medium leading-snug" style={{ color: DS.text }}>{item.productName}</p>
                          <p className="text-xs" style={{ color: DS.muted }}>{item.brand}</p>
                        </div>
                        <span className="text-sm font-extrabold ml-3 whitespace-nowrap" style={{ color: DS.violetMid }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Visiteurs par Pays" icon={<Globe className="w-4 h-4" style={{ color: DS.violetMid }} />} testId="section-visits-country">
                {data.visitsByCountry.length === 0 ? <p className="text-sm italic" style={{ color: DS.muted }}>Aucune donnée</p> : (
                  <div className="space-y-2">
                    {data.visitsByCountry.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`stat-country-${i}`}>
                        <span className="text-sm font-medium" style={{ color: DS.text }}>{item.country || "Inconnu"}</span>
                        <span className="text-sm font-extrabold" style={{ color: DS.violetMid }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Visiteurs par Ville" icon={<MapPin className="w-4 h-4" style={{ color: DS.violetMid }} />} testId="section-visits-city">
                {data.visitsByCity.length === 0 ? <p className="text-sm italic" style={{ color: DS.muted }}>Aucune donnée</p> : (
                  <div className="space-y-2">
                    {data.visitsByCity.slice(0, 15).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`stat-city-${i}`}>
                        <div>
                          <span className="text-sm font-medium" style={{ color: DS.text }}>{item.city || "Inconnue"}</span>
                          <span className="text-xs ml-2" style={{ color: DS.muted }}>{item.country}</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: DS.violetMid }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {data.visitsByDay.length > 0 && (
              <SectionCard title={period === "month" ? "Visites par Semaine" : "Visites par Jour"} icon={<TrendingUp className="w-4 h-4" style={{ color: DS.violetMid }} />} testId="section-visits-day">
                <div className="space-y-1.5">
                  {data.visitsByDay.slice(-14).map((item, i) => {
                    const maxCount = Math.max(...data.visitsByDay.map(d => d.count));
                    const pct = Math.round((item.count / (maxCount || 1)) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3" data-testid={`stat-day-${i}`}>
                        <span className="text-xs w-24 font-mono" style={{ color: DS.muted }}>{item.day}</span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${DS.violet}, ${DS.violetMid})` }} />
                        </div>
                        <span className="text-xs font-extrabold w-10 text-right" style={{ color: DS.violetMid }}>{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Derniers Clics WhatsApp" icon={<MessageCircle className="w-4 h-4" style={{ color: "#10b981" }} />} testId="section-recent-whatsapp">
              {data.recentWhatsappClicks.length === 0 ? <p className="text-sm italic" style={{ color: DS.muted }}>Aucun clic enregistré</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                        {["Produit","Marque","Pays","Date"].map(h => <th key={h} className="text-left py-2 text-xs font-extrabold uppercase" style={{ color: DS.muted }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentWhatsappClicks.slice(0, 20).map((click, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`row-whatsapp-${i}`}>
                          <td className="py-2 font-medium" style={{ color: DS.text }}>{click.productName}</td>
                          <td className="py-2"><span className="px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7" }}>{click.brand}</span></td>
                          <td className="py-2" style={{ color: DS.muted }}>{click.country || "—"}</td>
                          <td className="py-2 text-xs" style={{ color: DS.muted }}>{click.createdAt ? new Date(click.createdAt).toLocaleString("fr-FR") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Dernières Visites" icon={<Eye className="w-4 h-4" style={{ color: DS.violetMid }} />} testId="section-recent-visits">
              {data.recentVisits.length === 0 ? <p className="text-sm italic" style={{ color: DS.muted }}>Aucune visite enregistrée</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                        {["Page","Pays","Ville","Date"].map(h => <th key={h} className="text-left py-2 text-xs font-extrabold uppercase" style={{ color: DS.muted }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentVisits.slice(0, 20).map((visit, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${DS.border}` }} data-testid={`row-visit-${i}`}>
                          <td className="py-2 font-medium" style={{ color: DS.text }}>{visit.page}</td>
                          <td className="py-2" style={{ color: DS.muted }}>{visit.country || "—"}</td>
                          <td className="py-2" style={{ color: DS.muted }}>{visit.city || "—"}</td>
                          <td className="py-2 text-xs" style={{ color: DS.muted }}>{visit.createdAt ? new Date(visit.createdAt).toLocaleString("fr-FR") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}

// ── StatCard ──
function StatCard({ icon, label, value, color, formatAsCurrency }: { icon: React.ReactNode; label: string; value: number; color: "violet" | "green" | "amber"; formatAsCurrency?: boolean }) {
  const c = {
    violet: { bg: "rgba(124,58,237,0.12)", text: "#a78bfa" },
    green: { bg: "rgba(16,185,129,0.12)", text: "#6ee7b7" },
    amber: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  }[color];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.bg }}>
        <span style={{ color: c.text }}>{icon}</span>
      </div>
      <p className="text-2xl font-extrabold" style={{ color: c.text }}>{formatAsCurrency ? formatPrice(value) : value.toLocaleString("fr-FR")}</p>
      <p className="text-xs font-medium mt-1" style={{ color: DS.muted }}>{label}</p>
    </motion.div>
  );
}

// ── SectionCard ──
function SectionCard({ title, icon, children, testId }: { title: string; icon: React.ReactNode; children: React.ReactNode; testId: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }} data-testid={testId}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-extrabold" style={{ color: DS.text }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ── FeaturedTab ──
interface FeaturedTabProps {
  featuredItems: { productId: string; badge: string }[];
  featuredLoading: boolean; featuredMsg: string; featuredCatSearch: string;
  setFeaturedCatSearch: (v: string) => void; toggleFeatured: (id: string) => void;
  moveFeatured: (id: string, dir: -1 | 1) => void; updateBadge: (id: string, badge: string) => void;
  saveFeatured: () => void;
}

function FeaturedTab({ featuredItems, featuredLoading, featuredMsg, featuredCatSearch, setFeaturedCatSearch, toggleFeatured, moveFeatured, updateBadge, saveFeatured }: FeaturedTabProps) {
  const selectedIds = new Set(featuredItems.map((f) => f.productId));
  const filteredCatalog: Product[] = catalog.filter((p) => {
    if (!featuredCatSearch) return true;
    const q = featuredCatSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4" data-testid="tab-vedettes">
      <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: "1px solid rgba(251,191,36,0.3)" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
          <Package className="w-4 h-4" style={{ color: "#fbbf24" }} />
          <h2 className="text-sm font-extrabold" style={{ color: "#fbbf24" }}>Sélection en home ({featuredItems.length})</h2>
          <button onClick={saveFeatured} disabled={featuredLoading} data-testid="button-save-featured"
            className="ml-auto inline-flex items-center gap-1.5 text-white font-extrabold text-xs px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "#fbbf24" }}>
            {featuredLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
        {featuredMsg && <div className="px-5 py-2 text-xs font-medium" style={{ color: "#fbbf24", background: "rgba(251,191,36,0.06)", borderBottom: "1px solid rgba(251,191,36,0.15)" }} data-testid="featured-msg">{featuredMsg}</div>}
        <div className="p-4">
          {featuredItems.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: DS.muted }}>Aucun produit sélectionné. Coche des produits ci-dessous puis enregistre.</p>
          ) : (
            <ul className="space-y-2">
              {featuredItems.map((it, i) => {
                const p = catalog.find((c) => c.id === it.productId);
                return (
                  <li key={it.productId} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }} data-testid={`featured-row-${it.productId}`}>
                    <span className="text-[10px] font-extrabold w-5 text-center" style={{ color: "#fbbf24" }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold truncate" style={{ color: DS.text }}>{p?.name || it.productId}</p>
                      <p className="text-[10px] truncate" style={{ color: DS.muted }}>{p?.brand || "—"} · {p?.price ? formatPrice(p.price) : "—"}</p>
                    </div>
                    <input type="text" value={it.badge} onChange={(e) => updateBadge(it.productId, e.target.value)} placeholder="Badge"
                      data-testid={`input-badge-${it.productId}`}
                      className="w-24 text-[10px] px-2 py-1 rounded-lg outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(251,191,36,0.3)", color: DS.text }} />
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveFeatured(it.productId, -1)} data-testid={`button-up-${it.productId}`} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)" }} aria-label="Monter">
                        <ChevronUp className="w-3 h-3" style={{ color: "#fbbf24" }} />
                      </button>
                      <button onClick={() => moveFeatured(it.productId, 1)} data-testid={`button-down-${it.productId}`} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)" }} aria-label="Descendre">
                        <ChevronDown className="w-3 h-3" style={{ color: "#fbbf24" }} />
                      </button>
                    </div>
                    <button onClick={() => toggleFeatured(it.productId)} data-testid={`button-remove-featured-${it.productId}`} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(248,113,113,0.12)" }} aria-label="Retirer">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
          <ShieldCheck className="w-4 h-4" style={{ color: DS.violetMid }} />
          <h2 className="text-sm font-extrabold" style={{ color: DS.text }}>Catalogue ({catalog.length} produits)</h2>
          <input type="text" value={featuredCatSearch} onChange={(e) => setFeaturedCatSearch(e.target.value)} placeholder="Rechercher…"
            data-testid="input-search-catalog"
            className="ml-auto w-40 text-xs px-3 py-1.5 rounded-lg outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", color: DS.text }} />
        </div>
        <div className="max-h-[480px] overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredCatalog.map((p) => {
            const isSelected = selectedIds.has(p.id);
            return (
              <button key={p.id} onClick={() => toggleFeatured(p.id)} data-testid={`button-toggle-${p.id}`}
                className="flex items-start gap-2 p-2.5 rounded-xl text-left transition-all"
                style={isSelected ? { border: "2px solid #fbbf24", background: "rgba(251,191,36,0.08)" } : { border: `1px solid ${DS.border}`, background: "rgba(255,255,255,0.02)" }}>
                <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center" style={{ background: isSelected ? "#fbbf24" : "rgba(255,255,255,0.08)" }}>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold truncate" style={{ color: DS.text }}>{p.name}</p>
                  <p className="text-[10px] truncate" style={{ color: DS.muted }}>{p.brand || "—"} · {p.category}</p>
                  {typeof p.price === "number" && <p className="text-[10px] font-extrabold" style={{ color: DS.violetMid }}>{formatPrice(p.price)}</p>}
                </div>
              </button>
            );
          })}
          {filteredCatalog.length === 0 && <p className="col-span-full text-center text-xs py-6" style={{ color: DS.muted }}>Aucun produit ne correspond.</p>}
        </div>
      </div>
    </div>
  );
}

// DatasetTab, DatasetCard, DatasetStatCard → importés depuis @/components/admin/DatasetReview

// ── RetentionTab ──────────────────────────────────────────────────────────────
const SEGMENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; msg: (name: string) => string }> = {
  // ─ Premium (utilisateurs qui ont déjà payé ou essayé de payer) ─
  expiring_soon: {
    label: "🔥 Expire < 7j", color: "#f43f5e", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.3)",
    msg: (name) => `Salut ${name} ! 💜\n\nTon suivi dermatologique GlowScan expire bientôt. Pour continuer à prendre soin de ta peau, renouvelle pour 2 000 FCFA.\n\n💛 MTN MoMo : 674377959\n🟠 Orange Money : 690501392\n\nEnvoie ton reçu ici, je t'active dans la foulée 🙏`,
  },
  recently_expired: {
    label: "😴 Expiré < 30j", color: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.3)",
    msg: (name) => `Salut ${name} ! 💜\n\nTon accès GlowScan Premium a expiré. Ta peau mérite un suivi régulier — reviens quand tu veux, je suis là.\n\n💛 MTN MoMo : 674377959\n🟠 Orange Money : 690501392\n\n2 000 FCFA/mois. Envoie ton reçu et je t'active 🙏`,
  },
  churned: {
    label: "💤 Churné > 30j", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.3)",
    msg: (name) => `Salut ${name} ! 💜\n\nNotre IA dermatologique s'est vraiment améliorée depuis ta dernière visite — corrections de vrais dermatologues sur peaux africaines 🩺\n\nSi tu veux reprendre le suivi de ta peau : 2 000 FCFA/mois.\n💛 674377959 (MTN) | 🟠 690501392 (Orange)`,
  },
  active: {
    label: "💎 Premium actif", color: "#6ee7b7", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)",
    msg: (name) => `Salut ${name} ! 💜\n\nPense à analyser ta peau régulièrement — une photo suffit, l'IA fait le reste 🔬\n\nDes questions sur ton diagnostic ou ta routine ? Je suis là.`,
  },
  pending: {
    label: "🕐 Jamais confirmé", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)",
    msg: (name) => `Salut ${name} ! 👋\n\nTu avais demandé un accès Premium GlowScan — on n'a pas reçu ton paiement.\n\nSi tu es encore intéressé(e) : 2 000 FCFA via\n💛 674377959 (MTN) | 🟠 690501392 (Orange)`,
  },
  // ─ Utilisateurs gratuits inactifs (ne savent pas que le premium existe) ─
  dormant_7d: {
    label: "💤 Inactif 7j+", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.3)",
    msg: (name) => `Salut ${name} ! 🔬\n\nGlowScan peut analyser ta peau gratuitement — diagnostic IA spécialisé peaux africaines en 30 secondes.\n\nDartre, acné, hyperpigmentation, Glow Score... tout est inclus sans payer.\n\n→ glow-scan.com 💜`,
  },
  dormant_30d: {
    label: "😶 Inactif 30j+", color: "#818cf8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.3)",
    msg: (name) => `Salut ${name} ! 💜\n\nGlowScan est toujours là pour prendre soin de ta peau.\n\nDiagnostic gratuit, spécialisé peaux africaines — 30 secondes et une photo suffisent 🔬\n\n→ glow-scan.com`,
  },
  new: {
    label: "🆕 Nouveau", color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)",
    msg: (name) => `Salut ${name} ! 💜\n\nBienvenue sur GlowScan ! Ta première analyse est gratuite — une photo et l'IA s'occupe du reste 🔬\n\n→ glow-scan.com/analyze`,
  },
  all: {
    label: "Tous", color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)",
    msg: (name) => `Salut ${name} ! 👋`,
  },
};

// Ordre d'affichage des segments dans les stats cards
const SEGMENT_ORDER = ["expiring_soon", "recently_expired", "churned", "active", "pending", "dormant_7d", "dormant_30d", "new"] as const;

function RetentionTab({ data, loading, segment, setSegment, onRefresh }: {
  data: any; loading: boolean;
  segment: string;
  setSegment: (s: string) => void;
  onRefresh: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const contacts: any[] = data?.contacts ?? [];
  const filtered = segment === "all" ? contacts : contacts.filter((c: any) => c.segment === segment);

  const getMsgForContact = (c: any) => {
    const seg = c.segment as string;
    const cfg = SEGMENT_CONFIG[seg] ?? SEGMENT_CONFIG.dormant_7d;
    return cfg.msg(c.name);
  };

  const waLink = (phone: string, c: any) => {
    const clean = phone.replace(/\D/g, "");
    const num = clean.startsWith("237") ? clean : `237${clean}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(getMsgForContact(c))}`;
  };

  const copyContact = (c: any) => {
    const val = c.phone ? c.phone.replace(/\D/g, "") : (c.email ?? "");
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedId(c.userId); setTimeout(() => setCopiedId(null), 1500);
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return "hier";
    if (diff < 0) return `dans ${Math.abs(diff)}j`;
    return `il y a ${diff}j`;
  };

  // Segments qui ont des contacts
  const activeSegs = SEGMENT_ORDER.filter((s) => (data?.segments?.[s] ?? 0) > 0);

  return (
    <div className="space-y-4" data-testid="tab-retention">
      {/* Header */}
      <div className="rounded-2xl p-5 flex items-start justify-between gap-4" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.25)" }}>
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: "#f87171" }}>
            <MessageCircle className="w-5 h-5" /> Rétention & Engagement
          </h2>
          <p className="text-xs mt-1" style={{ color: DS.body }}>
            {data?.total ?? 0} utilisateurs contactables · WhatsApp ou email · Messages pré-rédigés par segment.
          </p>
        </div>
        <button onClick={onRefresh} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${DS.border}`, color: DS.muted }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>

      {/* Segment stats */}
      {data && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {SEGMENT_ORDER.map((seg) => {
            const c = SEGMENT_CONFIG[seg];
            const n = data.segments?.[seg] ?? 0;
            return (
              <button key={seg} onClick={() => setSegment(seg)}
                className="rounded-xl p-2.5 text-left transition-all"
                style={{ background: segment === seg ? c.bg : "rgba(255,255,255,0.03)", border: `1px solid ${segment === seg ? c.border : DS.border}`, opacity: n === 0 ? 0.45 : 1 }}
              >
                <p className="text-lg font-extrabold" style={{ color: c.color }}>{n}</p>
                <p className="text-[9px] font-extrabold leading-tight mt-0.5" style={{ color: segment === seg ? c.color : DS.muted }}>{c.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtre Tous + résumé */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setSegment("all")} className="text-xs font-extrabold px-3 py-1.5 rounded-full transition-all"
          style={segment === "all" ? { background: DS.violet, color: "white" } : { background: "rgba(255,255,255,0.06)", color: DS.muted }}>
          Tous ({data?.total ?? 0})
        </button>
        {activeSegs.filter(s => s !== segment && s !== "all").slice(0, 4).map(s => (
          <button key={s} onClick={() => setSegment(s)} className="text-xs px-2.5 py-1 rounded-full transition-all"
            style={{ background: SEGMENT_CONFIG[s].bg, color: SEGMENT_CONFIG[s].color, border: `1px solid ${SEGMENT_CONFIG[s].border}` }}>
            {SEGMENT_CONFIG[s].label} ({data?.segments?.[s] ?? 0})
          </button>
        ))}
        <span className="text-xs ml-auto" style={{ color: DS.muted }}>{filtered.length} contact{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {loading && <p className="text-center text-sm py-8" style={{ color: DS.muted }}>Chargement…</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <Users className="w-10 h-10 mx-auto mb-2" style={{ color: DS.muted }} />
          <p className="text-sm" style={{ color: DS.muted }}>Aucun contact dans ce segment.</p>
        </div>
      )}

      {/* Liste contacts */}
      <div className="space-y-2">
        {filtered.map((c: any) => {
          const segCfg = SEGMENT_CONFIG[c.segment] ?? SEGMENT_CONFIG.dormant_7d;
          const hasWA = !!c.phone;
          return (
            <div key={c.userId} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold" style={{ background: segCfg.bg, border: `1px solid ${segCfg.border}`, color: segCfg.color }}>
                {(c.name?.[0] || "?").toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-extrabold truncate" style={{ color: DS.text }}>{c.name}</p>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: segCfg.bg, color: segCfg.color }}>{segCfg.label}</span>
                  {c.method === "mtn_momo"    && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>MTN</span>}
                  {c.method === "orange_money" && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>Orange</span>}
                  {!hasWA && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>✉️ Email</span>}
                </div>
                <p className="text-xs font-mono mt-0.5" style={{ color: DS.body }}>{c.phone ?? c.email}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {c.expiresAt  && <p className="text-[10px]" style={{ color: DS.muted }}>Expire {fmtDate(c.expiresAt)}</p>}
                  {c.lastScanAt && <p className="text-[10px]" style={{ color: DS.muted }}>Dernier scan {fmtDate(c.lastScanAt)}</p>}
                  {!c.lastScanAt && c.createdAt && <p className="text-[10px]" style={{ color: DS.muted }}>Inscrit {fmtDate(c.createdAt)}</p>}
                  {c.scanCount > 0 && <p className="text-[10px]" style={{ color: DS.muted }}>{c.scanCount} analyse{c.scanCount > 1 ? "s" : ""}</p>}
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {hasWA ? (
                  <a href={waLink(c.phone, c)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-white font-extrabold text-xs px-3 py-2 rounded-xl transition-all active:scale-95"
                    style={{ background: "#25D366" }}>
                    <MessageCircle className="w-3.5 h-3.5 fill-current" /> WhatsApp
                  </a>
                ) : (
                  <a href={`mailto:${c.email}?subject=GlowScan%20%E2%80%94%20On%20pense%20%C3%A0%20toi%20%F0%9F%92%9C&body=${encodeURIComponent(getMsgForContact(c))}`}
                    className="flex items-center gap-1.5 text-white font-extrabold text-xs px-3 py-2 rounded-xl transition-all active:scale-95"
                    style={{ background: "#6366f1" }}>
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                )}
                <button onClick={() => copyContact(c)}
                  className="text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, color: DS.muted }}>
                  {copiedId === c.userId ? "✅ Copié" : hasWA ? "📋 Numéro" : "📋 Email"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
