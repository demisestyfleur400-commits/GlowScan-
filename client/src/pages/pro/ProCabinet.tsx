import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Download, Crown, CheckCircle2, Loader2, Phone, Clock } from "lucide-react";
import { useProAccount, useProPatients, useUpdateProAccount } from "@/hooks/use-pro";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ProLayout, ProCard, ProInput, LogoutButton  } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";

const NAVY = "#7c3aed";
const INK = "#f3f0ff";
const GREEN = "#10b981";

const MTN_NUMBER = "674377959";
const ORANGE_NUMBER = "690501392";
const PRO_PRICE = 30000;

const DS = {
  surface: "#13101f",
  border: "rgba(255,255,255,0.07)",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
};

export default function ProCabinet() {
  const { data: accData } = useProAccount();
  const { data: patientsData } = useProPatients("");
  const updateAcc = useUpdateProAccount();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [showSubscribe, setShowSubscribe] = useState(false);
  const [method, setMethod] = useState<"mtn_momo" | "orange_money">("mtn_momo");
  const [payPhone, setPayPhone] = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subRef, setSubRef] = useState<string | null>(null);
  const [subWaUrl, setSubWaUrl] = useState<string | null>(null);

  const { data: statusData } = useQuery<{ request: { reference: string; status: string } | null }>({
    queryKey: ["/api/premium/status"],
    enabled: !!accData?.account,
  });

  useEffect(() => {
    if (accData?.account) {
      setFullName(accData.account.fullName);
      setCabinetName(accData.account.cabinetName || "");
      setPhone(accData.account.phone || "");
      setCity(accData.account.city || "");
    }
  }, [accData?.account]);

  if (!accData?.account) return <LoadingScreen />;

  const acc = accData.account;
  const patients = patientsData?.patients || [];
  const isTrial = acc.subscriptionStatus === "trial";

  const handleSave = async () => {
    try {
      await updateAcc.mutateAsync({
        fullName,
        cabinetName: cabinetName || null,
        phone: phone || null,
        city: city || null,
      });
      toast({ title: "Profil mis à jour" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleSubscribe = async () => {
    if (!payPhone.trim() || payPhone.length < 8) {
      toast({ title: "Numéro invalide", variant: "destructive" });
      return;
    }
    setSubLoading(true);
    try {
      const res = await fetch("/api/pro/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ method, phone: payPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubRef(data.request.reference);
      setSubWaUrl(data.ownerWaUrl);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubLoading(false);
    }
  };

  const exportData = () => {
    const csv = [
      ["Prénom", "Nom", "Âge", "Sexe", "WhatsApp", "Statut", "Dernier scan", "Créé le"].join(","),
      ...patients.map((p) =>
        [
          p.firstName,
          p.lastName,
          p.age || "",
          p.sex || "",
          p.whatsappNumber || "",
          p.status,
          p.lastScanAt ? new Date(p.lastScanAt).toLocaleDateString("fr-FR") : "",
          p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glowscan-pro-patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export téléchargé", description: `${patients.length} patients exportés` });
  };

  const paymentNumber = method === "mtn_momo" ? MTN_NUMBER : ORANGE_NUMBER;

  return (
    <ProLayout title="Mon cabinet" back="/pro/dashboard">
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Profil dermato */}
        <ProCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: NAVY }} />
              <h2 className="font-extrabold text-base" style={{ color: INK }}>Profil dermatologue</h2>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-extrabold hover:underline"
                style={{ color: NAVY }}
                data-testid="button-edit"
              >
                Modifier
              </button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-2.5">
              <Row label="Nom" value={acc.fullName} testid="text-fullname" />
              <Row label="Cabinet" value={acc.cabinetName || "—"} testid="text-cabinet" />
              <Row label="WhatsApp" value={acc.phone || "—"} testid="text-phone" />
              <Row label="Ville" value={acc.city || "—"} testid="text-city" />
            </div>
          ) : (
            <div className="space-y-3">
              <ProInput label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} testid="input-fullname" />
              <ProInput label="Cabinet" value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} testid="input-cabinet" />
              <ProInput label="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} testid="input-phone" />
              <ProInput label="Ville" value={city} onChange={(e) => setCity(e.target.value)} testid="input-city" />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={updateAcc.isPending}
                  data-testid="button-save"
                  className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50"
                  style={{ background: NAVY }}
                >
                  {updateAcc.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enregistrer"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2.5 rounded-full text-sm font-extrabold transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: DS.body }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </ProCard>

        {/* Abonnement */}
        <ProCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4" style={{ color: "#fbbf24" }} />
            <h2 className="font-extrabold text-base" style={{ color: INK }}>Abonnement</h2>
          </div>
          {isTrial ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                <p className="text-sm" style={{ color: DS.body }}>
                  Essai gratuit · <strong style={{ color: INK }}>{accData.daysLeftTrial} jours restants</strong>
                </p>
              </div>
              <p className="text-xs mb-4" style={{ color: DS.muted }}>Continuer après l'essai pour 30 000 FCFA / mois.</p>
              {statusData?.request?.status === "pending" ? (
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
                >
                  <p className="text-xs" style={{ color: "#fbbf24" }}>
                    Demande de paiement en attente · <strong>{statusData.request.reference}</strong>
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubscribe(true)}
                  data-testid="button-subscribe"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-white font-extrabold text-sm active:scale-[0.98] transition-all"
                  style={{ background: NAVY }}
                >
                  <Crown className="w-4 h-4" />
                  S'abonner — 30 000 FCFA / mois
                </button>
              )}
            </>
          ) : (
            <p className="text-sm font-extrabold flex items-center gap-2" style={{ color: GREEN }}>
              <CheckCircle2 className="w-4 h-4" />
              Abonnement actif
            </p>
          )}
        </ProCard>

        {/* Liste patients */}
        <ProCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-base" style={{ color: INK }}>
              Mes patients ({patients.length})
            </h2>
            <button
              onClick={exportData}
              disabled={patients.length === 0}
              data-testid="button-export"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
            >
              <Download className="w-3 h-3" />
              Exporter CSV
            </button>
          </div>
          {patients.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: DS.muted }}>Aucun patient encore</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {patients.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/pro/patient/${p.id}`}
                  data-testid={`link-cabinet-patient-${p.id}`}
                  className="flex items-center justify-between py-2.5 px-1 rounded-lg transition-colors"
                  style={{ borderBottom: i < patients.length - 1 ? `1px solid ${DS.border}` : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="text-sm font-extrabold" style={{ color: INK }}>
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-[11px]" style={{ color: DS.muted }}>
                    {p.lastScanAt ? new Date(p.lastScanAt).toLocaleDateString("fr-FR") : "jamais"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </ProCard>

        <LogoutButton />
      </div>

      {/* Modal subscribe */}
      <AnimatePresence>
        {showSubscribe && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !subRef && setShowSubscribe(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.7)" }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 max-w-md mx-auto"
              style={{ background: DS.surface, border: "1px solid rgba(167,139,250,0.2)", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
            >
              {!subRef ? (
                <>
                  <h3 className="text-lg font-extrabold mb-1" style={{ color: INK }}>Activer mon abonnement Pro</h3>
                  <p className="text-xs mb-4" style={{ color: DS.muted }}>30 000 FCFA / mois — Mobile Money</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {(
                      [
                        { id: "mtn_momo", label: "MTN MoMo", color: "#FFCC00" },
                        { id: "orange_money", label: "Orange Money", color: "#FF6600" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        data-testid={`button-method-${m.id}`}
                        className="p-3 rounded-xl border-2 transition-all text-center"
                        style={
                          method === m.id
                            ? { borderColor: NAVY, background: "rgba(124,58,237,0.15)" }
                            : { borderColor: DS.border, background: "rgba(255,255,255,0.04)" }
                        }
                      >
                        <div className="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ background: m.color }} />
                        <p className="text-xs font-extrabold" style={{ color: method === m.id ? INK : DS.body }}>{m.label}</p>
                      </button>
                    ))}
                  </div>
                  <div
                    className="rounded-xl p-3 mb-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                  >
                    <p className="text-xs font-extrabold" style={{ color: DS.body }}>Envoyer {PRO_PRICE} FCFA au :</p>
                    <p className="text-lg font-extrabold mt-1" style={{ color: NAVY }}>{paymentNumber}</p>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-extrabold mb-1.5 block" style={{ color: DS.body }}>Votre numéro de paiement</label>
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.2)" }}
                    >
                      <Phone className="w-4 h-4 flex-shrink-0" style={{ color: DS.muted }} />
                      <input
                        type="tel"
                        value={payPhone}
                        onChange={(e) => setPayPhone(e.target.value)}
                        placeholder="675 000 000"
                        data-testid="input-pay-phone"
                        className="flex-1 text-sm font-extrabold outline-none bg-transparent"
                        style={{ color: INK }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={subLoading || !payPhone}
                    data-testid="button-confirm-subscribe"
                    className="w-full py-3 rounded-full text-white font-extrabold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
                    style={{ background: NAVY }}
                  >
                    {subLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "J'ai effectué le paiement"}
                  </button>
                  <button onClick={() => setShowSubscribe(false)} className="w-full mt-2 py-2 text-xs font-extrabold" style={{ color: DS.muted }}>
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
                  >
                    <CheckCircle2 className="w-6 h-6" style={{ color: "#6ee7b7" }} />
                  </div>
                  <h3 className="text-lg font-extrabold text-center mb-1" style={{ color: INK }}>Demande envoyée</h3>
                  <p className="text-xs text-center mb-4" style={{ color: DS.muted }}>Activation sous 24 h après vérification du paiement.</p>
                  <div
                    className="rounded-xl p-3 mb-3 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
                  >
                    <p className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: DS.muted }}>Référence</p>
                    <p className="text-lg font-extrabold mt-1" style={{ color: NAVY }}>{subRef}</p>
                  </div>
                  {subWaUrl && (
                    <a
                      href={subWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="link-confirm-whatsapp"
                      className="block w-full text-center py-3 rounded-full text-white font-extrabold text-sm mb-2 active:scale-[0.98] transition-all"
                      style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
                    >
                      Envoyer la confirmation WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setShowSubscribe(false);
                      setSubRef(null);
                      setSubWaUrl(null);
                    }}
                    className="w-full py-2 text-xs font-extrabold"
                    style={{ color: DS.muted }}
                  >
                    Fermer
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ProLayout>
  );
}

function Row({ label, value, testid }: any) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="text-[11px] uppercase tracking-wider font-extrabold" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span className="text-sm font-extrabold" style={{ color: "#f3f0ff" }} data-testid={testid}>{value}</span>
    </div>
  );
}
