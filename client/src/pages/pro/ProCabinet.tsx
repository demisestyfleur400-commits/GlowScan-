import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Download, Crown, CheckCircle2, Loader2, Phone, Clock } from "lucide-react";
import { useProAccount, useProPatients, useUpdateProAccount } from "@/hooks/use-pro";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ProLayout, ProCard, ProInput, LogoutButton, NAVY, GREEN, INK } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";

const MTN_NUMBER = "674377959";
const ORANGE_NUMBER = "674377959";
const PRO_PRICE = 20000;

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
              <h2 className="font-bold text-base" style={{ color: INK }}>Profil dermatologue</h2>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-semibold hover:underline"
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
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: NAVY }}
                >
                  {updateAcc.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enregistrer"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
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
            <Crown className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-base" style={{ color: INK }}>Abonnement</h2>
          </div>
          {isTrial ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-sm">
                  Essai gratuit · <strong>{accData.daysLeftTrial} jours restants</strong>
                </p>
              </div>
              <p className="text-xs text-slate-500 mb-4">Continuer après l'essai pour 20 000 FCFA / mois.</p>
              {statusData?.request?.status === "pending" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    Demande de paiement en attente · <strong>{statusData.request.reference}</strong>
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubscribe(true)}
                  data-testid="button-subscribe"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-sm"
                  style={{ background: NAVY }}
                >
                  <Crown className="w-4 h-4" />
                  S'abonner — 20 000 FCFA / mois
                </button>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: GREEN }}>
              <CheckCircle2 className="w-4 h-4" />
              Abonnement actif
            </p>
          )}
        </ProCard>

        {/* Liste patients */}
        <ProCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base" style={{ color: INK }}>
              Mes patients ({patients.length})
            </h2>
            <button
              onClick={exportData}
              disabled={patients.length === 0}
              data-testid="button-export"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              Exporter CSV
            </button>
          </div>
          {patients.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Aucun patient encore</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {patients.map((p) => (
                <Link
                  key={p.id}
                  href={`/pro/patient/${p.id}`}
                  data-testid={`link-cabinet-patient-${p.id}`}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50 rounded-md transition-colors"
                >
                  <span className="text-sm font-semibold" style={{ color: INK }}>
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-[11px] text-slate-500">
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
              className="fixed inset-0 bg-slate-900/60 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-md mx-auto"
              style={{ color: INK, fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {!subRef ? (
                <>
                  <h3 className="text-lg font-bold mb-1">Activer mon abonnement Pro</h3>
                  <p className="text-xs text-slate-500 mb-4">20 000 FCFA / mois — Mobile Money</p>
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
                        className={`p-3 rounded-lg border-2 transition-all ${
                          method === m.id ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ background: m.color }} />
                        <p className="text-xs font-bold">{m.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-600 font-semibold">Envoyer {PRO_PRICE} FCFA au :</p>
                    <p className="text-lg font-bold mt-1" style={{ color: NAVY }}>{paymentNumber}</p>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Votre numéro de paiement</label>
                    <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2.5">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={payPhone}
                        onChange={(e) => setPayPhone(e.target.value)}
                        placeholder="675 000 000"
                        data-testid="input-pay-phone"
                        className="flex-1 text-sm font-semibold outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={subLoading || !payPhone}
                    data-testid="button-confirm-subscribe"
                    className="w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
                    style={{ background: NAVY }}
                  >
                    {subLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "J'ai effectué le paiement"}
                  </button>
                  <button onClick={() => setShowSubscribe(false)} className="w-full mt-2 py-2 text-xs text-slate-400 font-semibold">
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: GREEN }}>
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-center mb-1">Demande envoyée</h3>
                  <p className="text-xs text-slate-500 text-center mb-4">Activation sous 24 h après vérification du paiement.</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Référence</p>
                    <p className="text-lg font-bold" style={{ color: NAVY }}>{subRef}</p>
                  </div>
                  {subWaUrl && (
                    <a
                      href={subWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="link-confirm-whatsapp"
                      className="block w-full text-center py-3 rounded-lg text-white font-semibold text-sm mb-2"
                      style={{ background: GREEN }}
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
                    className="w-full py-2 text-xs text-slate-400 font-semibold"
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
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      <span className="text-sm font-semibold" data-testid={testid}>{value}</span>
    </div>
  );
}
