import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import {
  Users,
  Globe,
  MapPin,
  ScanFace,
  MessageCircle,
  TrendingUp,
  ShieldCheck,
  Eye,
  BarChart3,
  RefreshCw,
  Calendar,
  CalendarDays,
  CalendarRange,
  Infinity,
  Package,
  DollarSign,
  Phone,
  User,
  Crown,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart2,
  Store,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Database,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { formatPrice, catalog, type Product } from "@shared/catalog";
import { TractionDashboard } from "@/components/admin/TractionDashboard";

interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  visits6h: number;
  visits24h: number;
  totalAnalyses: number;
  totalWhatsappClicks: number;
  totalOrders: number;
  orderRevenue: number;
  ordersByBrand: { brand: string; count: number; revenue: number }[];
  recentOrders: any[];
  visitsByCountry: { country: string; count: number }[];
  visitsByCity: { city: string; country: string; count: number }[];
  whatsappByBrand: { brand: string; count: number }[];
  whatsappByProduct: { productName: string; brand: string; count: number }[];
  recentVisits: any[];
  recentWhatsappClicks: any[];
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
  id: string;
  name: string | null;
  email: string | null;
  profileImage: string | null;
  isPremium: boolean;
  expiresAt: string | null;
  plan: string | null;
  note: string | null;
  scansThisMonth: number;
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [adminTab, setAdminTab] = useState<"traction" | "stats" | "premium" | "leads" | "partenaires" | "vedettes" | "dataset">("traction");
  // === Dataset RLHF (review dermato) ===
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
  // Partners state
  const [partnersData, setPartnersData] = useState<any[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);
  const [newPartner, setNewPartner] = useState({ name: "", location: "", whatsapp: "", description: "", category: "parfumerie" });
  const [newProduct, setNewProduct] = useState<{ [partnerId: number]: { name: string; category: string; description: string; price: string } }>({});
  const [partnerMsg, setPartnerMsg] = useState("");

  const savedKey = sessionStorage.getItem("glowscan_admin_key");

  useEffect(() => {
    if (savedKey) {
      setAdminKey(savedKey);
      setIsAuthenticated(true);
      fetchData(savedKey, period);
      fetchSubscribers(savedKey);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminKey) {
      fetchData(adminKey, period);
    }
  }, [period]);

  useEffect(() => {
    if (isAuthenticated && adminKey && adminTab === "premium") {
      fetchSubscribers(adminKey);
      fetchPremiumRequests(adminKey);
    }
    if (isAuthenticated && adminKey && adminTab === "leads") {
      fetchLeads(adminKey);
    }
    if (isAuthenticated && adminKey && adminTab === "partenaires") {
      fetchPartners(adminKey);
    }
    if (isAuthenticated && adminKey && adminTab === "dataset") {
      fetchDataset(adminKey);
      fetchDatasetStats(adminKey);
    }
    if (isAuthenticated && adminKey && adminTab === "vedettes") {
      fetchFeatured();
    }
  }, [adminTab]);

  const fetchFeatured = async () => {
    setFeaturedLoading(true);
    try {
      const res = await fetch("/api/featured-products");
      if (res.ok) {
        const json = await res.json();
        const items = (Array.isArray(json) ? json : [])
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
          .map((it: any) => ({ productId: it.productId, badge: it.badge || "" }));
        setFeaturedItems(items);
      }
    } catch {}
    finally { setFeaturedLoading(false); }
  };

  const saveFeatured = async () => {
    setFeaturedMsg("");
    try {
      const res = await fetch("/api/admin/featured-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ items: featuredItems }),
      });
      if (res.ok) {
        setFeaturedMsg("✅ Sélection enregistrée");
        await fetchFeatured();
      } else {
        setFeaturedMsg("❌ Erreur sauvegarde");
      }
    } catch { setFeaturedMsg("❌ Erreur réseau"); }
    setTimeout(() => setFeaturedMsg(""), 4000);
  };

  const toggleFeatured = (productId: string) => {
    setFeaturedItems((prev) => {
      const idx = prev.findIndex((p) => p.productId === productId);
      if (idx >= 0) return prev.filter((p) => p.productId !== productId);
      if (prev.length >= 12) return prev; // limite raisonnable
      return [...prev, { productId, badge: "" }];
    });
  };

  const moveFeatured = (productId: string, dir: -1 | 1) => {
    setFeaturedItems((prev) => {
      const idx = prev.findIndex((p) => p.productId === productId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const updateBadge = (productId: string, badge: string) => {
    setFeaturedItems((prev) => prev.map((p) => (p.productId === productId ? { ...p, badge } : p)));
  };

  const fetchSubscribers = async (key: string) => {
    setSubLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        const json = await res.json();
        setSubscribers(json || []);
      }
    } catch {}
    finally { setSubLoading(false); }
  };

  const fetchPremiumRequests = async (key: string) => {
    setPremiumReqsLoading(true);
    try {
      const res = await fetch("/api/admin/premium/requests", { headers: { "x-admin-key": key } });
      if (res.ok) {
        const json = await res.json();
        setPremiumReqs(json.requests || []);
      }
    } catch {}
    finally { setPremiumReqsLoading(false); }
  };

  const confirmPremiumRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/premium/confirm/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ note: "Paiement confirmé via admin" }),
      });
      if (res.ok) {
        setPremiumReqMsg("✅ Premium activé avec succès");
        fetchPremiumRequests(adminKey);
        fetchSubscribers(adminKey);
      } else {
        setPremiumReqMsg("❌ Erreur lors de l'activation");
      }
    } catch { setPremiumReqMsg("❌ Erreur réseau"); }
    setTimeout(() => setPremiumReqMsg(""), 4000);
  };

  const rejectPremiumRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/premium/reject/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ reason: "Paiement non reçu" }),
      });
      if (res.ok) {
        setPremiumReqMsg("🚫 Demande rejetée");
        fetchPremiumRequests(adminKey);
      }
    } catch {}
    setTimeout(() => setPremiumReqMsg(""), 4000);
  };

  const fetchLeads = async (key: string) => {
    setLeadsLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { headers: { "x-admin-key": key } });
      if (res.ok) setLeadsData(await res.json());
    } catch {}
    finally { setLeadsLoading(false); }
  };

  const fetchPartners = async (key: string) => {
    setPartnersLoading(true);
    try {
      const res = await fetch("/api/admin/partners", { headers: { "x-admin-key": key } });
      if (res.ok) setPartnersData(await res.json());
    } catch {}
    finally { setPartnersLoading(false); }
  };

  // === Dataset RLHF ===
  const fetchDataset = async (key: string) => {
    setDatasetLoading(true);
    try {
      const params = new URLSearchParams({
        status: datasetStatus,
        area: datasetArea,
        page: String(datasetPage),
        limit: String(DATASET_LIMIT),
      });
      const res = await fetch(`/api/admin/dataset?${params}`, { headers: { "x-admin-key": key } });
      if (res.ok) {
        const j = await res.json();
        setDatasetItems(j.items || []);
        setDatasetTotal(j.total || 0);
      }
    } catch (e) { console.error("[dataset] fetch err", e); }
    finally { setDatasetLoading(false); }
  };

  const fetchDatasetStats = async (key: string) => {
    try {
      const res = await fetch("/api/admin/dataset/stats", { headers: { "x-admin-key": key } });
      if (res.ok) setDatasetStats(await res.json());
    } catch {}
  };

  const reviewScan = async (id: number, isVerified: boolean, expertNote: string, expertCorrectedCondition: string) => {
    if (!reviewerName.trim()) {
      setReviewMsg("❌ Indique d'abord ton nom (en haut)");
      setTimeout(() => setReviewMsg(""), 3000);
      return;
    }
    setReviewBusy(id);
    try {
      const res = await fetch(`/api/admin/dataset/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          isVerified,
          expertNote: expertNote || null,
          expertCorrectedCondition: expertCorrectedCondition || null,
          expertReviewer: reviewerName.trim(),
        }),
      });
      if (res.ok) {
        setReviewMsg(isVerified ? `✅ Scan #${id} validé` : `❌ Scan #${id} rejeté`);
        await fetchDataset(adminKey);
        await fetchDatasetStats(adminKey);
        setTimeout(() => setReviewMsg(""), 2500);
      } else {
        setReviewMsg("❌ Erreur lors de l'enregistrement");
      }
    } catch (e) {
      setReviewMsg("❌ Erreur réseau");
    } finally {
      setReviewBusy(null);
    }
  };

  // Recharger quand filtres changent
  useEffect(() => {
    if (isAuthenticated && adminKey && adminTab === "dataset") {
      fetchDataset(adminKey);
    }
  }, [datasetStatus, datasetArea, datasetPage]);

  useEffect(() => {
    localStorage.setItem("dermato_reviewer", reviewerName);
  }, [reviewerName]);

  const createPartner = async () => {
    if (!newPartner.name || !newPartner.location || !newPartner.whatsapp) {
      setPartnerMsg("❌ Nom, quartier et WhatsApp sont requis");
      setTimeout(() => setPartnerMsg(""), 3000);
      return;
    }
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(newPartner),
    });
    if (res.ok) {
      setNewPartner({ name: "", location: "", whatsapp: "", description: "", category: "parfumerie" });
      setPartnerMsg("✅ Partenaire ajouté !");
      fetchPartners(adminKey);
    } else {
      const d = await res.json();
      setPartnerMsg(`❌ ${d.message}`);
    }
    setTimeout(() => setPartnerMsg(""), 3000);
  };

  const togglePartner = async (id: number, active: boolean) => {
    await fetch(`/api/admin/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ active }),
    });
    fetchPartners(adminKey);
  };

  const addProduct = async (partnerId: number) => {
    const p = newProduct[partnerId];
    if (!p?.name) return;
    await fetch(`/api/admin/partners/${partnerId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ ...p, price: parseInt(p.price) || 0 }),
    });
    setNewProduct(prev => ({ ...prev, [partnerId]: { name: "", category: "soin", description: "", price: "" } }));
    fetchPartners(adminKey);
  };

  const toggleProduct = async (id: number, active: boolean) => {
    await fetch(`/api/admin/partners/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ active }),
    });
    fetchPartners(adminKey);
  };

  const markOrdered = async () => {
    if (!markOrderCode.trim()) return;
    try {
      const res = await fetch("/api/admin/leads/mark-ordered", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ referenceCode: markOrderCode.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (res.ok) {
        setMarkOrderMsg(`✅ Commande confirmée pour ${json.lead?.brandName || markOrderCode}`);
        setMarkOrderCode("");
        fetchLeads(adminKey);
      } else {
        setMarkOrderMsg(`❌ ${json.message || "Code non trouvé"}`);
      }
    } catch {
      setMarkOrderMsg("❌ Erreur réseau");
    }
  };

  const activateUser = async (userId: string, durationDays = 30) => {
    setActionUserId(userId);
    try {
      const res = await fetch("/api/admin/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ userId, durationDays, note: actionMsg || "Paiement WhatsApp confirmé" }),
      });
      if (res.ok) {
        setActionMsg("");
        await fetchSubscribers(adminKey);
      }
    } catch {}
    finally { setActionUserId(null); }
  };

  const deactivateUser = async (userId: string) => {
    setActionUserId(userId);
    try {
      const res = await fetch("/api/admin/subscription/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) await fetchSubscribers(adminKey);
    } catch {}
    finally { setActionUserId(null); }
  };

  const fetchData = async (key: string, p: Period = "all") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`, {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError("Clé admin incorrecte");
          setIsAuthenticated(false);
          sessionStorage.removeItem("glowscan_admin_key");
        } else {
          setError("Erreur serveur");
        }
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
      setIsAuthenticated(true);
      sessionStorage.setItem("glowscan_admin_key", key);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) {
      fetchData(adminKey.trim(), period);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFF8FB]">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-pink-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-center text-gray-900 mb-2" data-testid="text-admin-title">
              Tableau de Bord Admin
            </h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              Entrez votre clé admin pour accéder aux statistiques
            </p>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Clé admin"
                data-testid="input-admin-key"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent mb-4"
              />
              {error && (
                <p className="text-sm text-red-500 mb-3 text-center" data-testid="text-admin-error">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                data-testid="button-admin-login"
                className="w-full py-3 rounded-xl bg-pink-600 text-white font-bold text-sm hover:bg-pink-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Chargement..." : "Accéder"}
              </button>
            </form>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-admin-dashboard-title">
                Tableau de Bord
              </h1>
              <p className="text-sm text-gray-400 font-medium">Administration GlowScan</p>
            </div>
            <button
              onClick={() => { fetchData(adminKey, period); fetchSubscribers(adminKey); }}
              disabled={loading}
              data-testid="button-refresh-stats"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          {/* Onglets principaux */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm">
            <button
              onClick={() => setAdminTab("dataset")}
              data-testid="button-tab-dataset"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center relative ${adminTab === "dataset" ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Dataset</span>
              {datasetStats && datasetStats.pending > 0 && (
                <span className={`absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${adminTab === "dataset" ? "bg-white text-emerald-700" : "bg-emerald-500 text-white"}`}>
                  {datasetStats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setAdminTab("traction")}
              data-testid="button-tab-traction"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center ${adminTab === "traction" ? "bg-gradient-to-br from-pink-600 to-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Traction</span>
            </button>
            <button
              onClick={() => setAdminTab("stats")}
              data-testid="button-tab-stats"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center ${adminTab === "stats" ? "bg-pink-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Stats</span>
            </button>
            <button
              onClick={() => setAdminTab("premium")}
              data-testid="button-tab-premium"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center relative ${adminTab === "premium" ? "bg-pink-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Crown className="w-4 h-4" />
              <span>Abonnés</span>
              {subscribers.filter(s => s.isPremium).length > 0 && (
                <span className={`absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${adminTab === "premium" ? "bg-white text-pink-600" : "bg-pink-500 text-white"}`}>
                  {subscribers.filter(s => s.isPremium).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setAdminTab("leads")}
              data-testid="button-tab-leads"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center ${adminTab === "leads" ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Commandes</span>
            </button>
            <button
              onClick={() => setAdminTab("partenaires")}
              data-testid="button-tab-partenaires"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center ${adminTab === "partenaires" ? "bg-violet-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Store className="w-4 h-4" />
              <span>Partenaires</span>
            </button>
            <button
              onClick={() => setAdminTab("vedettes")}
              data-testid="button-tab-vedettes"
              className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all justify-center relative ${adminTab === "vedettes" ? "bg-amber-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Package className="w-4 h-4" />
              <span>Vedettes</span>
              {featuredItems.length > 0 && (
                <span className={`absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${adminTab === "vedettes" ? "bg-white text-amber-600" : "bg-amber-500 text-white"}`}>
                  {featuredItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Période (stats + traction) */}
          {(adminTab === "stats" || adminTab === "traction") && (
            <div className="flex gap-2 bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm" data-testid="period-selector">
              {PERIOD_LABELS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  data-testid={`button-period-${value}`}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
                    period === value ? "bg-pink-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== ONGLET PREMIUM ===== */}
        {adminTab === "premium" && (
          <div className="space-y-4">

            {/* ── Demandes de paiement Premium ── */}
            <div className="bg-white rounded-2xl border border-pink-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-pink-200 bg-pink-50">
                <Crown className="w-4 h-4 text-pink-600" />
                <h2 className="text-sm font-bold text-pink-700">Demandes de paiement Premium</h2>
                <button onClick={() => fetchPremiumRequests(adminKey)} className="ml-auto p-1.5 rounded-lg bg-pink-100 hover:bg-pink-200 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-pink-600" />
                </button>
              </div>

              {premiumReqMsg && (
                <div className="px-5 py-2 text-sm font-bold text-gray-700 bg-pink-50 border-b border-pink-200">{premiumReqMsg}</div>
              )}

              {premiumReqsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                </div>
              ) : premiumReqs.filter(r => r.status === "pending").length === 0 ? (
                <p className="text-sm text-gray-400 italic p-6 text-center">Aucune demande en attente</p>
              ) : (
                <div className="divide-y divide-pink-100">
                  {premiumReqs.filter(r => r.status === "pending").map(req => (
                    <div key={req.id} className="px-5 py-4" data-testid={`row-premium-req-${req.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-bold text-gray-900">{req.userFirstName || req.userEmail || req.userId}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              req.method === "mtn_momo" ? "bg-yellow-100 text-yellow-700" : "bg-orange-100 text-orange-700"
                            }`}>
                              {req.method === "mtn_momo" ? "🟡 MTN MoMo" : "🟠 Orange Money"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-0.5">📱 {req.phone}</p>
                          <p className="text-xs text-gray-500 mb-0.5">
                            🔑 Réf: <span className="font-black text-pink-700">{req.reference}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            💵 {req.amount} FCFA · {new Date(req.createdAt).toLocaleDateString("fr-FR")} à {new Date(req.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => confirmPremiumRequest(req.id)}
                            data-testid={`button-confirm-req-${req.id}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmer
                          </button>
                          <button
                            onClick={() => rejectPremiumRequest(req.id)}
                            data-testid={`button-reject-req-${req.id}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
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
                { label: "Total utilisateurs", value: subscribers.length, color: "blue" },
                { label: "Abonnés Premium", value: subscribers.filter(s => s.isPremium).length, color: "amber" },
                { label: "Gratuits", value: subscribers.filter(s => !s.isPremium).length, color: "gray" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm`}>
                  <p className={`text-2xl font-bold ${color === "amber" ? "text-pink-600" : color === "blue" ? "text-pink-600" : "text-gray-500"}`}>{value}</p>
                  <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Table des utilisateurs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="section-subscribers">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Crown className="w-4 h-4 text-pink-500" />
                <h2 className="text-sm font-bold text-gray-900">Gestion des abonnements</h2>
                <span className="ml-auto text-xs text-gray-400">{subscribers.length} compte{subscribers.length > 1 ? "s" : ""}</span>
              </div>

              {/* Barre de recherche */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <input
                  type="text"
                  value={subSearch}
                  onChange={e => setSubSearch(e.target.value)}
                  placeholder="Rechercher par nom ou email..."
                  data-testid="input-sub-search"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                />
              </div>

              {subLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                </div>
              ) : subscribers.length === 0 ? (
                <p className="text-sm text-gray-400 italic p-6">Aucun utilisateur enregistré</p>
              ) : (() => {
                const filtered = subscribers.filter(s => {
                  if (!subSearch.trim()) return true;
                  const q = subSearch.toLowerCase();
                  return (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q);
                });
                if (filtered.length === 0) return (
                  <p className="text-sm text-gray-400 italic p-6">Aucun résultat pour "{subSearch}"</p>
                );
                return (
                <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                  {filtered.map((sub) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                      data-testid={`row-subscriber-${sub.id}`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {sub.profileImage
                          ? <img src={sub.profileImage} alt="" className="w-full h-full object-cover" />
                          : <User className="w-5 h-5 text-gray-400" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 truncate">{sub.name || "Utilisateur"}</p>
                          {sub.isPremium ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
                              <Crown className="w-2.5 h-2.5" /> PREMIUM
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">GRATUIT</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{sub.email || sub.id.slice(0, 16) + "..."}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-[11px] text-gray-500">
                            {sub.scansThisMonth} analyse{sub.scansThisMonth !== 1 ? "s" : ""} ce mois
                          </p>
                          {sub.isPremium && sub.expiresAt && (
                            <p className="text-[11px] text-pink-600 font-medium">
                              Expire le {new Date(sub.expiresAt).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                          {sub.note && (
                            <p className="text-[11px] text-gray-400 italic">"{sub.note}"</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {actionUserId === sub.id ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : sub.isPremium ? (
                          <button
                            onClick={() => deactivateUser(sub.id)}
                            data-testid={`button-deactivate-${sub.id}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Désactiver
                          </button>
                        ) : (
                          <button
                            onClick={() => activateUser(sub.id, 30)}
                            data-testid={`button-activate-${sub.id}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-xl hover:bg-pink-100 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Activer 30j
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

        {/* ===== ONGLET LEADS ===== */}
        {adminTab === "leads" && (
          <div className="space-y-4">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : !leadsData ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-gray-400 text-sm">Aucune donnée disponible</p>
              </div>
            ) : (
              <>
                {/* Métriques de conversion */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Clics WhatsApp", value: leadsData.total, color: "blue", sub: "total" },
                    { label: "Messages confirmés", value: leadsData.confirmed, color: "green", sub: `${leadsData.conversionRate}% conversion` },
                    { label: "Commandes réelles", value: leadsData.ordered, color: "emerald", sub: "validées par marque" },
                  ].map(({ label, value, color, sub }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <p className={`text-2xl font-bold ${color === "green" ? "text-green-600" : color === "emerald" ? "text-emerald-600" : "text-pink-600"}`}>{value}</p>
                      <p className="text-xs text-gray-700 font-semibold mt-0.5">{label}</p>
                      <p className="text-[10px] text-gray-400">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Par marque */}
                {leadsData.byBrand && Object.keys(leadsData.byBrand).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-800">Performance par marque</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {Object.entries(leadsData.byBrand).map(([brand, stats]: any) => (
                        <div key={brand} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{brand}</p>
                            <p className="text-[11px] text-gray-400">{stats.clicks} clics · {stats.confirmed} confirmés</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-emerald-600">{stats.ordered}</span>
                            <p className="text-[10px] text-gray-400">commandes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmer une commande (code soumis par la marque) */}
                <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-4 space-y-3">
                  <p className="text-sm font-bold text-gray-800">Confirmer une commande</p>
                  <p className="text-xs text-gray-500">La marque vous communique un code de référence → entrez-le ici pour valider la commande réelle.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={markOrderCode}
                      onChange={e => { setMarkOrderCode(e.target.value.toUpperCase()); setMarkOrderMsg(""); }}
                      placeholder="GS-XXXX-XXXX"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={markOrdered}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl active:scale-95 transition-all"
                    >
                      Valider
                    </button>
                  </div>
                  {markOrderMsg && (
                    <p className="text-xs font-medium text-gray-700">{markOrderMsg}</p>
                  )}
                </div>

                {/* 20 derniers leads */}
                {leadsData.recent && leadsData.recent.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-800">Leads récents</p>
                      <button onClick={() => fetchLeads(adminKey)} className="text-xs text-pink-600 font-medium">Rafraîchir</button>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                      {leadsData.recent.map((lead: any) => (
                        <div key={lead.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-bold text-gray-700">{lead.referenceCode}</p>
                              <p className="text-[11px] text-gray-500 truncate">{lead.brandName} — {lead.productNames}</p>
                              {lead.totalPrice > 0 && <p className="text-[10px] text-pink-600 font-semibold">{lead.totalPrice.toLocaleString()} FCFA</p>}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                lead.status === "ordered" ? "bg-emerald-100 text-emerald-700" :
                                lead.status === "confirmed" ? "bg-green-100 text-green-700" :
                                "bg-gray-100 text-gray-500"
                              }`}>
                                {lead.status === "ordered" ? "✅ Commandé" : lead.status === "confirmed" ? "✓ Envoyé" : "👁 Clic"}
                              </span>
                              <p className="text-[9px] text-gray-300 mt-0.5">{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</p>
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

        {/* ===== ONGLET PARTENAIRES ===== */}
        {adminTab === "partenaires" && (
          <div className="space-y-4">
            {/* Formulaire ajout partenaire */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-600" />
                Ajouter une parfumerie partenaire
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nom de la boutique *"
                  value={newPartner.name}
                  onChange={e => setNewPartner(p => ({ ...p, name: e.target.value }))}
                  data-testid="input-partner-name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                />
                <input
                  type="text"
                  placeholder="Quartier / Ville * (ex: Akwa, Douala)"
                  value={newPartner.location}
                  onChange={e => setNewPartner(p => ({ ...p, location: e.target.value }))}
                  data-testid="input-partner-location"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                />
                <input
                  type="text"
                  placeholder="WhatsApp * (ex: 237677000000)"
                  value={newPartner.whatsapp}
                  onChange={e => setNewPartner(p => ({ ...p, whatsapp: e.target.value }))}
                  data-testid="input-partner-whatsapp"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newPartner.category}
                    onChange={e => setNewPartner(p => ({ ...p, category: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  >
                    <option value="parfumerie">Parfumerie</option>
                    <option value="boutique">Boutique beauté</option>
                    <option value="pharmacie">Pharmacie</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Description (optionnel)"
                    value={newPartner.description}
                    onChange={e => setNewPartner(p => ({ ...p, description: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </div>
                <button
                  onClick={createPartner}
                  data-testid="button-create-partner"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Ajouter ce partenaire
                </button>
                {partnerMsg && <p className="text-sm font-semibold text-center">{partnerMsg}</p>}
              </div>
            </div>

            {/* Liste des partenaires */}
            {partnersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
            ) : partnersData.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun partenaire encore. Commence par en ajouter un !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partnersData.map((partner: any) => (
                  <div key={partner.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* En-tête partenaire */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${partner.active ? "bg-green-500" : "bg-gray-300"}`} />
                            <h4 className="text-sm font-black text-gray-900">{partner.name}</h4>
                            <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold capitalize">{partner.category}</span>
                          </div>
                          <p className="text-xs text-gray-500">📍 {partner.location}</p>
                          <p className="text-xs text-green-600 font-semibold">📱 {partner.whatsapp}</p>
                          {partner.description && <p className="text-xs text-gray-400 mt-0.5">{partner.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePartner(partner.id, !partner.active)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${partner.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                          >
                            {partner.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600"
                          >
                            {expandedPartner === partner.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{partner.products?.length || 0} produit(s)</p>
                    </div>

                    {/* Section produits (expansible) */}
                    {expandedPartner === partner.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <p className="text-xs font-black text-gray-700 mb-3">Produits de {partner.name}</p>

                        {/* Produits existants */}
                        {(partner.products || []).map((prod: any) => (
                          <div key={prod.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 mb-2 border border-gray-100">
                            <div>
                              <p className="text-xs font-bold text-gray-800">{prod.name}</p>
                              <p className="text-[10px] text-gray-400">{prod.category} · {prod.price > 0 ? `${prod.price.toLocaleString()} FCFA` : "Prix sur demande"}</p>
                              {prod.description && <p className="text-[10px] text-gray-400 italic">{prod.description}</p>}
                            </div>
                            <button
                              onClick={() => toggleProduct(prod.id, !prod.active)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${prod.active ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-400"}`}
                            >
                              {prod.active ? "Actif" : "Inactif"}
                            </button>
                          </div>
                        ))}

                        {/* Formulaire ajout produit */}
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Ajouter un produit</p>
                          <input
                            type="text"
                            placeholder="Nom du produit *"
                            value={newProduct[partner.id]?.name || ""}
                            onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: e.target.value, category: prev[partner.id]?.category || "soin", description: prev[partner.id]?.description || "", price: prev[partner.id]?.price || "" } }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-violet-400 bg-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newProduct[partner.id]?.category || "soin"}
                              onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: prev[partner.id]?.name || "", category: e.target.value, description: prev[partner.id]?.description || "", price: prev[partner.id]?.price || "" } }))}
                              className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none bg-white"
                            >
                              <option value="soin">Soin</option>
                              <option value="parfum">Parfum</option>
                              <option value="cheveux">Cheveux</option>
                              <option value="maquillage">Maquillage</option>
                              <option value="corps">Corps</option>
                            </select>
                            <input
                              type="number"
                              placeholder="Prix FCFA (0 = sur demande)"
                              value={newProduct[partner.id]?.price || ""}
                              onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: prev[partner.id]?.name || "", category: prev[partner.id]?.category || "soin", description: prev[partner.id]?.description || "", price: e.target.value } }))}
                              className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none bg-white"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Description courte (optionnel)"
                            value={newProduct[partner.id]?.description || ""}
                            onChange={e => setNewProduct(prev => ({ ...prev, [partner.id]: { ...prev[partner.id], name: prev[partner.id]?.name || "", category: prev[partner.id]?.category || "soin", description: e.target.value, price: prev[partner.id]?.price || "" } }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-violet-400 bg-white"
                          />
                          <button
                            onClick={() => addProduct(partner.id)}
                            data-testid={`button-add-product-${partner.id}`}
                            className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                          >
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

        {/* ===== ONGLET DATASET (validation dermato — pipeline RLHF) ===== */}
        {adminTab === "dataset" && (
          <DatasetTab
            items={datasetItems}
            total={datasetTotal}
            page={datasetPage}
            limit={DATASET_LIMIT}
            setPage={setDatasetPage}
            status={datasetStatus}
            setStatus={(s) => { setDatasetStatus(s); setDatasetPage(1); }}
            area={datasetArea}
            setArea={(a) => { setDatasetArea(a); setDatasetPage(1); }}
            stats={datasetStats}
            loading={datasetLoading}
            reviewerName={reviewerName}
            setReviewerName={setReviewerName}
            reviewBusy={reviewBusy}
            reviewMsg={reviewMsg}
            onReview={reviewScan}
            adminKey={adminKey}
          />
        )}

        {/* ===== ONGLET VEDETTES (produits mis en avant sur la home) ===== */}
        {adminTab === "vedettes" && (
          <FeaturedTab
            featuredItems={featuredItems}
            featuredLoading={featuredLoading}
            featuredMsg={featuredMsg}
            featuredCatSearch={featuredCatSearch}
            setFeaturedCatSearch={setFeaturedCatSearch}
            toggleFeatured={toggleFeatured}
            moveFeatured={moveFeatured}
            updateBadge={updateBadge}
            saveFeatured={saveFeatured}
          />
        )}

        {/* ===== ONGLET TRACTION (KPIs investisseur) ===== */}
        {adminTab === "traction" && (
          <TractionDashboard adminKey={adminKey} period={period} />
        )}

        {/* ===== ONGLET STATISTIQUES ===== */}
        {adminTab === "stats" && loading && !data && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        )}

        {adminTab === "stats" && data && (
          <div className="space-y-6">
            {/* Carte live visites en temps réel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="card-live-visits">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm font-bold text-gray-800">Activité en temps réel</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-pink-50 rounded-xl p-3 text-center border border-pink-100">
                  <p className="text-2xl font-black text-pink-700" data-testid="stat-visits-6h">{data.visits6h}</p>
                  <p className="text-[11px] text-pink-500 font-semibold mt-0.5">Visites · 6 dernières heures</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-3 text-center border border-pink-100">
                  <p className="text-2xl font-black text-pink-700" data-testid="stat-visits-24h">{data.visits24h}</p>
                  <p className="text-[11px] text-pink-500 font-semibold mt-0.5">Visites · Dernières 24h</p>
                </div>
              </div>
              {data.visits6h === 0 && data.totalVisits === 0 && (
                <p className="text-[11px] text-pink-600 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 mt-2">
                  ⚠️ Le suivi de visites était inactif. Il est maintenant réactivé — les chiffres se rempliront dès les prochaines visites.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                icon={<Eye className="w-5 h-5" />}
                label="Total Visites"
                value={data.totalVisits}
                color="blue"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Visiteurs Uniques"
                value={data.uniqueVisitors}
                color="teal"
              />
              <StatCard
                icon={<ScanFace className="w-5 h-5" />}
                label="Analyses IA"
                value={data.totalAnalyses}
                color="purple"
              />
              <StatCard
                icon={<MessageCircle className="w-5 h-5" />}
                label="Clics WhatsApp"
                value={data.totalWhatsappClicks}
                color="green"
              />
              <StatCard
                icon={<Package className="w-5 h-5" />}
                label="Commandes"
                value={data.totalOrders}
                color="amber"
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Chiffre d'Affaires"
                value={data.orderRevenue}
                color="orange"
                formatAsCurrency
              />
            </div>

            {data.ordersByBrand.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="section-orders-brand">
                  {data.ordersByBrand.map((item, i) => {
                    const brandColors = ["from-pink-500 to-pink-600", "from-pink-400 to-emerald-500", "from-violet-400 to-purple-500", "from-rose-400 to-pink-500"];
                    const bgColors = ["bg-pink-50", "bg-pink-50", "bg-violet-50", "bg-rose-50"];
                    const textColors = ["text-pink-700", "text-pink-700", "text-violet-700", "text-rose-700"];
                    const gradient = brandColors[i % brandColors.length];
                    const bg = bgColors[i % bgColors.length];
                    const textColor = textColors[i % textColors.length];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                        data-testid={`card-brand-${i}`}
                      >
                        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                        <div className="p-4">
                          <div className={`inline-flex items-center gap-1.5 ${bg} px-2.5 py-1 rounded-lg mb-3`}>
                            <Package className={`w-3.5 h-3.5 ${textColor}`} />
                            <span className={`text-xs font-bold ${textColor}`}>{item.brand}</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-2xl font-extrabold text-gray-900">{item.count}</p>
                              <p className="text-[11px] text-gray-400 font-medium">commandes</p>
                            </div>
                            <div className="pt-2 border-t border-gray-50">
                              <p className={`text-lg font-bold ${textColor}`}>{formatPrice(item.revenue)}</p>
                              <p className="text-[11px] text-gray-400 font-medium">chiffre d'affaires</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <SectionCard
                  title="Dernières Commandes"
                  icon={<Package className="w-4 h-4 text-orange-600" />}
                  testId="section-recent-orders"
                >
                  {data.recentOrders.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Aucune commande enregistrée</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">N°</th>
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Client</th>
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Marque</th>
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Articles</th>
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentOrders.slice(0, 25).map((order: any, i: number) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" data-testid={`row-order-${i}`}>
                              <td className="py-2.5">
                                <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full">{order.orderNumber}</span>
                              </td>
                              <td className="py-2.5">
                                <p className="text-sm font-medium text-gray-800">{order.clientName}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{order.clientPhone}</p>
                                {order.clientAddress && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{order.clientAddress}</p>}
                              </td>
                              <td className="py-2.5">
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-50 text-pink-700">{order.brand}</span>
                              </td>
                              <td className="py-2.5 text-xs text-gray-600 max-w-[200px]">
                                {Array.isArray(order.items) ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ") : "—"}
                              </td>
                              <td className="py-2.5 text-sm font-bold text-gray-800 whitespace-nowrap">{formatPrice(order.totalPrice)}</td>
                              <td className="py-2.5">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${order.status === "envoyée" ? "bg-pink-50 text-pink-600" : order.status === "livrée" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}>
                                  {order.status === "envoyée" ? "📦 Envoyée" : order.status === "livrée" ? "✅ Livrée" : order.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-gray-400 text-xs whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
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
              <SectionCard
                title="Clics WhatsApp par Marque"
                icon={<BarChart3 className="w-4 h-4 text-green-600" />}
                testId="section-whatsapp-brand"
              >
                {data.whatsappByBrand.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {data.whatsappByBrand.map((item, i) => {
                      const maxCount = data.whatsappByBrand[0]?.count || 1;
                      const percentage = Math.round((item.count / maxCount) * 100);
                      return (
                        <div key={i} data-testid={`stat-brand-${i}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-800">{item.brand}</span>
                            <span className="text-sm font-bold text-green-600">{item.count} clics</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Produits les plus demandés"
                icon={<TrendingUp className="w-4 h-4 text-pink-600" />}
                testId="section-whatsapp-products"
              >
                {data.whatsappByProduct.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {data.whatsappByProduct.slice(0, 10).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0" data-testid={`stat-product-${i}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-snug">{item.productName}</p>
                          <p className="text-xs text-gray-400">{item.brand}</p>
                        </div>
                        <span className="text-sm font-bold text-pink-600 ml-3 whitespace-nowrap">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard
                title="Visiteurs par Pays"
                icon={<Globe className="w-4 h-4 text-pink-600" />}
                testId="section-visits-country"
              >
                {data.visitsByCountry.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {data.visitsByCountry.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0" data-testid={`stat-country-${i}`}>
                        <span className="text-sm font-medium text-gray-800">{item.country || "Inconnu"}</span>
                        <span className="text-sm font-bold text-pink-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Visiteurs par Ville"
                icon={<MapPin className="w-4 h-4 text-purple-600" />}
                testId="section-visits-city"
              >
                {data.visitsByCity.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {data.visitsByCity.slice(0, 15).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0" data-testid={`stat-city-${i}`}>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{item.city || "Inconnue"}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.country}</span>
                        </div>
                        <span className="text-sm font-bold text-purple-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {data.visitsByDay.length > 0 && (
              <SectionCard
                title={period === "month" ? "Visites par Semaine" : "Visites par Jour"}
                icon={<TrendingUp className="w-4 h-4 text-pink-600" />}
                testId="section-visits-day"
              >
                <div className="space-y-1.5">
                  {data.visitsByDay.slice(-14).map((item, i) => {
                    const maxCount = Math.max(...data.visitsByDay.map(d => d.count));
                    const percentage = Math.round((item.count / (maxCount || 1)) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3" data-testid={`stat-day-${i}`}>
                        <span className="text-xs text-gray-500 w-24 font-mono">{item.day}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-pink-700 w-10 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            <SectionCard
              title="Derniers Clics WhatsApp"
              icon={<MessageCircle className="w-4 h-4 text-green-600" />}
              testId="section-recent-whatsapp"
            >
              {data.recentWhatsappClicks.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun clic enregistré</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Produit</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Marque</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Pays</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentWhatsappClicks.slice(0, 20).map((click, i) => (
                        <tr key={i} className="border-b border-gray-50" data-testid={`row-whatsapp-${i}`}>
                          <td className="py-2 text-gray-800 font-medium">{click.productName}</td>
                          <td className="py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">{click.brand}</span>
                          </td>
                          <td className="py-2 text-gray-500">{click.country || "—"}</td>
                          <td className="py-2 text-gray-400 text-xs">{click.createdAt ? new Date(click.createdAt).toLocaleString("fr-FR") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Dernières Visites"
              icon={<Eye className="w-4 h-4 text-pink-600" />}
              testId="section-recent-visits"
            >
              {data.recentVisits.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune visite enregistrée</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Page</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Pays</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Ville</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentVisits.slice(0, 20).map((visit, i) => (
                        <tr key={i} className="border-b border-gray-50" data-testid={`row-visit-${i}`}>
                          <td className="py-2 text-gray-800 font-medium">{visit.page}</td>
                          <td className="py-2 text-gray-500">{visit.country || "—"}</td>
                          <td className="py-2 text-gray-500">{visit.city || "—"}</td>
                          <td className="py-2 text-gray-400 text-xs">{visit.createdAt ? new Date(visit.createdAt).toLocaleString("fr-FR") : "—"}</td>
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

function StatCard({
  icon,
  label,
  value,
  color,
  formatAsCurrency,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "teal" | "purple" | "green" | "amber" | "orange";
  formatAsCurrency?: boolean;
}) {
  const colorMap = {
    blue: { bg: "bg-pink-50", text: "text-pink-600", value: "text-pink-700" },
    teal: { bg: "bg-pink-50", text: "text-pink-600", value: "text-pink-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", value: "text-purple-700" },
    green: { bg: "bg-green-50", text: "text-green-600", value: "text-green-700" },
    amber: { bg: "bg-pink-50", text: "text-pink-600", value: "text-pink-700" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", value: "text-orange-700" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.text} mb-3`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${c.value}`}>{formatAsCurrency ? formatPrice(value) : value.toLocaleString("fr-FR")}</p>
      <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
    </motion.div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  testId,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ============== Featured products tab ==============
interface FeaturedTabProps {
  featuredItems: { productId: string; badge: string }[];
  featuredLoading: boolean;
  featuredMsg: string;
  featuredCatSearch: string;
  setFeaturedCatSearch: (v: string) => void;
  toggleFeatured: (id: string) => void;
  moveFeatured: (id: string, dir: -1 | 1) => void;
  updateBadge: (id: string, badge: string) => void;
  saveFeatured: () => void;
}

function FeaturedTab({
  featuredItems,
  featuredLoading,
  featuredMsg,
  featuredCatSearch,
  setFeaturedCatSearch,
  toggleFeatured,
  moveFeatured,
  updateBadge,
  saveFeatured,
}: FeaturedTabProps) {
  const selectedIds = new Set(featuredItems.map((f) => f.productId));
  const filteredCatalog: Product[] = catalog.filter((p) => {
    if (!featuredCatSearch) return true;
    const q = featuredCatSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4" data-testid="tab-vedettes">
      {/* Sélection actuelle (ordonnable) */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-200 bg-amber-50">
          <Package className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-bold text-amber-700">
            Sélection en home ({featuredItems.length})
          </h2>
          <button
            onClick={saveFeatured}
            disabled={featuredLoading}
            data-testid="button-save-featured"
            className="ml-auto inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            {featuredLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
        {featuredMsg && (
          <div className="px-5 py-2 text-xs font-medium text-amber-800 bg-amber-50 border-b border-amber-100" data-testid="featured-msg">
            {featuredMsg}
          </div>
        )}
        <div className="p-4">
          {featuredItems.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Aucun produit sélectionné. Coche des produits ci-dessous puis enregistre.
            </p>
          ) : (
            <ul className="space-y-2">
              {featuredItems.map((it, i) => {
                const p = catalog.find((c) => c.id === it.productId);
                return (
                  <li
                    key={it.productId}
                    className="flex items-center gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/40"
                    data-testid={`featured-row-${it.productId}`}
                  >
                    <span className="text-[10px] font-black text-amber-700 w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{p?.name || it.productId}</p>
                      <p className="text-[10px] text-gray-500 truncate">{p?.brand || "—"} · {p?.price ? formatPrice(p.price) : "—"}</p>
                    </div>
                    <input
                      type="text"
                      value={it.badge}
                      onChange={(e) => updateBadge(it.productId, e.target.value)}
                      placeholder="Badge"
                      data-testid={`input-badge-${it.productId}`}
                      className="w-24 text-[10px] px-2 py-1 rounded border border-amber-200 outline-none focus:border-amber-400 bg-white"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveFeatured(it.productId, -1)}
                        data-testid={`button-up-${it.productId}`}
                        className="w-6 h-6 rounded bg-amber-100 hover:bg-amber-200 flex items-center justify-center"
                        aria-label="Monter"
                      >
                        <ChevronUp className="w-3 h-3 text-amber-700" />
                      </button>
                      <button
                        onClick={() => moveFeatured(it.productId, 1)}
                        data-testid={`button-down-${it.productId}`}
                        className="w-6 h-6 rounded bg-amber-100 hover:bg-amber-200 flex items-center justify-center"
                        aria-label="Descendre"
                      >
                        <ChevronDown className="w-3 h-3 text-amber-700" />
                      </button>
                    </div>
                    <button
                      onClick={() => toggleFeatured(it.productId)}
                      data-testid={`button-remove-featured-${it.productId}`}
                      className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 flex items-center justify-center"
                      aria-label="Retirer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Catalog picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <ShieldCheck className="w-4 h-4 text-pink-600" />
          <h2 className="text-sm font-bold text-gray-900">Catalogue ({catalog.length} produits)</h2>
          <input
            type="text"
            value={featuredCatSearch}
            onChange={(e) => setFeaturedCatSearch(e.target.value)}
            placeholder="Rechercher…"
            data-testid="input-search-catalog"
            className="ml-auto w-40 text-xs px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-pink-400 bg-white"
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredCatalog.map((p) => {
            const isSelected = selectedIds.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleFeatured(p.id)}
                data-testid={`button-toggle-${p.id}`}
                className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                    : "border-gray-100 bg-white hover:border-pink-200 hover:bg-pink-50/40"
                }`}
              >
                <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-amber-500" : "bg-gray-100"}`}>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{p.brand || "—"} · {p.category}</p>
                  {typeof p.price === "number" && (
                    <p className="text-[10px] font-bold text-pink-700">{formatPrice(p.price)}</p>
                  )}
                </div>
              </button>
            );
          })}
          {filteredCatalog.length === 0 && (
            <p className="col-span-full text-center text-xs text-gray-500 py-6">Aucun produit ne correspond.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============== Dataset Tab — Validation dermato (RLHF) ==============
interface DatasetTabProps {
  items: any[];
  total: number;
  page: number;
  limit: number;
  setPage: (n: number) => void;
  status: "pending" | "verified" | "rejected" | "all";
  setStatus: (s: "pending" | "verified" | "rejected" | "all") => void;
  area: "all" | "face" | "body" | "hair";
  setArea: (a: "all" | "face" | "body" | "hair") => void;
  stats: { total: number; verified: number; rejected: number; pending: number; withImage: number } | null;
  loading: boolean;
  reviewerName: string;
  setReviewerName: (s: string) => void;
  reviewBusy: number | null;
  reviewMsg: string;
  onReview: (id: number, isVerified: boolean, note: string, corrected: string) => void;
  adminKey: string;
}

function DatasetTab({
  items, total, page, limit, setPage, status, setStatus, area, setArea,
  stats, loading, reviewerName, setReviewerName, reviewBusy, reviewMsg,
  onReview, adminKey,
}: DatasetTabProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const verifPct = stats && stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="tab-dataset">
      {/* En-tête + nom du reviewer */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-bold text-emerald-900">Pipeline Dataset RLHF</h2>
        </div>
        <p className="text-xs text-emerald-800 mb-3">
          Valide ou rejette les analyses IA. Les scans validés constituent le dataset officiel d'entraînement.
        </p>
        <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Ton nom (apparaît sur chaque validation)</label>
        <input
          type="text"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Ex: Dr Mbarga"
          data-testid="input-reviewer-name"
          className="w-full text-sm px-3 py-2 rounded-lg border border-emerald-300 outline-none focus:border-emerald-500 bg-white"
        />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <DatasetStatCard label="Total scans" value={stats.total} color="gray" />
          <DatasetStatCard label="✅ Validés" value={stats.verified} color="emerald" extra={`${verifPct}%`} />
          <DatasetStatCard label="❌ Rejetés" value={stats.rejected} color="rose" />
          <DatasetStatCard label="⏳ À valider" value={stats.pending} color="amber" />
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          data-testid="select-dataset-status"
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-emerald-500"
        >
          <option value="pending">⏳ À valider</option>
          <option value="verified">✅ Validés</option>
          <option value="rejected">❌ Rejetés</option>
          <option value="all">Tous</option>
        </select>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as any)}
          data-testid="select-dataset-area"
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-emerald-500"
        >
          <option value="all">Toutes zones</option>
          <option value="face">Visage</option>
          <option value="body">Corps</option>
          <option value="hair">Cheveux</option>
        </select>
        <span className="ml-auto text-xs text-gray-500">{total} résultat{total > 1 ? "s" : ""}</span>
      </div>

      {reviewMsg && (
        <div className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800" data-testid="dataset-review-msg">
          {reviewMsg}
        </div>
      )}

      {loading && <p className="text-center text-sm text-gray-500 py-8">Chargement…</p>}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Database className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucun scan dans cette catégorie.</p>
        </div>
      )}

      {/* Liste des scans */}
      <div className="space-y-3">
        {items.map((scan) => (
          <DatasetCard
            key={scan.id}
            scan={scan}
            adminKey={adminKey}
            busy={reviewBusy === scan.id}
            onReview={onReview}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            data-testid="button-dataset-prev"
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-600 font-medium">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            data-testid="button-dataset-next"
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

function DatasetStatCard({ label, value, color, extra }: { label: string; value: number; color: string; extra?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-black mt-1">{value}{extra && <span className="text-xs font-bold ml-1">({extra})</span>}</p>
    </div>
  );
}

function DatasetCard({
  scan, adminKey, busy, onReview,
}: { scan: any; adminKey: string; busy: boolean; onReview: (id: number, ok: boolean, note: string, corrected: string) => void }) {
  const [note, setNote] = useState(scan.expertNote || "");
  const [corrected, setCorrected] = useState(scan.expertCorrectedCondition || "");
  const [imgError, setImgError] = useState(false);
  const hasImg = typeof scan.imageUrl === "string" && scan.imageUrl.startsWith("/objects/scans/");
  // La session est marquée admin dès que GET /api/admin/dataset a réussi (cookie session)
  // → pas besoin de passer la clé dans l'URL (qui finirait dans les logs HTTP/historique).
  const imgSrc = hasImg ? scan.imageUrl : (scan.imageUrl?.startsWith("data:") ? scan.imageUrl : "");
  const isAlreadyVerified = scan.isVerified === true;
  const isAlreadyRejected = scan.isVerified === false && !!scan.expertReviewedAt;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isAlreadyVerified ? "border-emerald-300" : isAlreadyRejected ? "border-rose-300" : "border-gray-200"}`}
      data-testid={`dataset-card-${scan.id}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
        {/* Photo */}
        <div className="bg-gray-100 flex items-center justify-center min-h-[200px]">
          {imgSrc && !imgError ? (
            <img
              src={imgSrc}
              alt={`Scan #${scan.id}`}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover max-h-[280px]"
              data-testid={`img-scan-${scan.id}`}
            />
          ) : (
            <div className="text-center text-gray-400 py-8">
              <ImageIcon className="w-8 h-8 mx-auto mb-1" />
              <p className="text-[10px]">Pas d'image</p>
            </div>
          )}
        </div>

        {/* Diagnostic + actions */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] text-gray-400 font-mono">Scan #{scan.id} · {scan.area} · {new Date(scan.createdAt).toLocaleDateString("fr-FR")}</p>
              <h3 className="text-sm font-bold text-gray-900 mt-0.5">{scan.condition || "—"}</h3>
              <p className="text-xs text-gray-500">Score IA : <strong className="text-gray-800">{scan.score}/100</strong></p>
            </div>
            {isAlreadyVerified && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">✅ Validé par {scan.expertReviewer || "?"}</span>}
            {isAlreadyRejected && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">❌ Rejeté par {scan.expertReviewer || "?"}</span>}
          </div>

          {scan.analysis && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 font-semibold hover:text-emerald-700">📋 Analyse complète IA</summary>
              <p className="mt-2 text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">{scan.analysis}</p>
            </details>
          )}

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <label className="block text-[11px] font-black text-amber-900 mb-1">
                ⭐ Diagnostic corrigé (entraîne l'IA en temps réel)
              </label>
              <input
                type="text"
                value={corrected}
                onChange={(e) => setCorrected(e.target.value)}
                placeholder="Ex: Dermatite séborrhéique modérée"
                data-testid={`input-corrected-${scan.id}`}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-amber-300 outline-none focus:border-amber-500 bg-white"
              />
              <p className="text-[10px] text-amber-700 mt-1 leading-snug">
                Ce que tu écris ici sera injecté dans le prompt à chaque future analyse de la même zone — l'IA arrête de répéter cette erreur dès la prochaine validation.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">Note dermato</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Observations, justification, contexte clinique…"
                rows={2}
                data-testid={`textarea-note-${scan.id}`}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-emerald-500 bg-white resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onReview(scan.id, true, note, corrected)}
                disabled={busy}
                data-testid={`button-validate-${scan.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Valider
              </button>
              <button
                onClick={() => onReview(scan.id, false, note, corrected)}
                disabled={busy}
                data-testid={`button-reject-${scan.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Rejeter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
