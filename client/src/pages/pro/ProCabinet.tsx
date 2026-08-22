import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Download, Crown, CheckCircle2, Loader2, Phone, Clock, UserPlus, Users, Copy, Trash2, ShieldCheck, Lock } from "lucide-react";
import { useProAccount, useProPatients, useUpdateProAccount, useSecretaries, useCreateSecretary, useDeleteSecretary } from "@/hooks/use-pro";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ProLayout, ProCard, ProInput, LogoutButton  } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";
import { DERM } from "@/lib/design-tokens";

const NAVY = "#7c3aed";        // CTA violet
const BLUE = "#0369A1";        // accent bleu
const INK = "#0F172A";         // texte principal (foncé sur fond clair)
const GREEN = "#059669";

const MTN_NUMBER = "674377959";
const ORANGE_NUMBER = "690501392";
const PRO_PRICE = 10000;

// Prix consultation en ligne — FIXÉ par GlowScan (non éditable par le dermato)
const CONSULT_PRICE = 3500;
const DERM_SHARE = 2100;
const PLATFORM_SHARE = 1400;

const DS = {
  surface: DERM.surface,
  border: DERM.border,
  body: DERM.textBody,
  muted: DERM.textMuted,
};

// Fonds/bordures légers réutilisés (remplacent les anciens rgba(255,255,255,…) du thème sombre)
const SOFT_BG = "#F1F5F9";
const SOFT_BORDER = DERM.border;

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
  const [country, setCountry] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  // Opt-in consultation B2C
  const [b2cAvailable, setB2cAvailable] = useState(false);
  const [consultPrice, setConsultPrice] = useState("3000");
  const [savingB2c, setSavingB2c] = useState(false);

  // ── Équipe / secrétaires ──
  const { data: secretariesData } = useSecretaries();
  const createSecretary = useCreateSecretary();
  const deleteSecretary = useDeleteSecretary();
  const [showSecretaryForm, setShowSecretaryForm] = useState(false);
  const [secFullName, setSecFullName] = useState("");
  const [secEmail, setSecEmail] = useState("");
  const [createdSecretary, setCreatedSecretary] = useState<{ email: string; password: string } | null>(null);

  const secretaries = secretariesData?.secretaries || [];

  // Génère un mot de passe lisible (8 car. : 4 lettres + 4 chiffres)
  const genPassword = () => {
    const letters = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    let p = "";
    for (let i = 0; i < 4; i++) p += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 4; i++) p += digits[Math.floor(Math.random() * digits.length)];
    return p;
  };

  const handleCreateSecretary = async () => {
    if (!secFullName.trim() || !secEmail.trim()) {
      toast({ title: "Champs requis", description: "Nom et email obligatoires.", variant: "destructive" });
      return;
    }
    const password = genPassword();
    try {
      const res = await createSecretary.mutateAsync({ fullName: secFullName.trim(), email: secEmail.trim(), password });
      setCreatedSecretary({ email: secEmail.trim(), password: res.secretary?.plainPassword || password });
      setSecFullName("");
      setSecEmail("");
      setShowSecretaryForm(false);
      toast({ title: "Secrétaire créée ✅", description: "Communiquez-lui ses identifiants ci-dessous." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Création impossible", variant: "destructive" });
    }
  };

  const handleDeleteSecretary = async (id: number, name: string) => {
    if (!window.confirm(`Supprimer l'accès de ${name} ? Cette secrétaire ne pourra plus se connecter.`)) return;
    try {
      await deleteSecretary.mutateAsync(id);
      toast({ title: "Accès supprimé", description: `${name} ne peut plus se connecter.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Suppression impossible", variant: "destructive" });
    }
  };

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
      setCountry((accData.account as any).country || "");
      setLicenseNumber((accData.account as any).licenseNumber || "");
      setB2cAvailable((accData.account as any).b2cAvailable === true);
      setConsultPrice(String((accData.account as any).consultPriceFcfa ?? 3000));
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
        country: country || null,
        licenseNumber: licenseNumber || null,
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

  // 🔑 SÉCURITÉ : Les secrétaires n'ont pas accès aux paramètres cabinet
  if (accData?.user?.role === "secretary") {
    return (
      <ProLayout title="Mon cabinet" back="/derm/patients">
        <div style={{ textAlign: "center", padding: "40px 24px", color: "#475569" }}>
          <p>Les secrétaires n'ont pas accès aux paramètres cabinet.</p>
        </div>
      </ProLayout>
    );
  }

  return (
    <ProLayout title="Mon cabinet" back="/derm/dashboard">
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
              <Row label="Pays" value={(acc as any).country || "—"} testid="text-country" />
              <Row label="N° d'ordre" value={(acc as any).licenseNumber || "—"} testid="text-license" />
            </div>
          ) : (
            <div className="space-y-3">
              <ProInput label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} testid="input-fullname" />
              <ProInput label="Cabinet" value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} testid="input-cabinet" />
              <ProInput label="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} testid="input-phone" />
              <ProInput label="Ville" value={city} onChange={(e) => setCity(e.target.value)} testid="input-city" />
              <ProInput label="Pays" value={country} onChange={(e) => setCountry(e.target.value)} testid="input-country" />
              <ProInput label="N° d'ordre (ONMC)" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} testid="input-license" />
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
                  style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </ProCard>

        {/* Consultation en ligne (B2C) — opt-in */}
        <ProCard className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 16 }}>💬</span>
            <h2 className="font-extrabold text-base" style={{ color: INK }}>Consultation en ligne</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: DS.muted }}>
            Activez-la pour recevoir des patients directement depuis l'app GlowScan (grand public) et discuter en ligne.
          </p>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-extrabold" style={{ color: INK }}>Je suis consultable en ligne</span>
            <button
              onClick={() => setB2cAvailable((v) => !v)}
              data-testid="toggle-b2c"
              style={{
                width: 48, height: 28, borderRadius: 9999, border: "none", cursor: "pointer",
                background: b2cAvailable ? "#10b981" : "#CBD5E1", position: "relative", transition: "background .2s",
              }}
            >
              <span style={{ position: "absolute", top: 3, left: b2cAvailable ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </button>
          </div>
          {b2cAvailable && (
            <div className="mb-4 rounded-xl p-4" style={{ background: "rgba(3,105,161,0.06)", border: "1px solid rgba(3,105,161,0.18)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 15 }}>💬</span>
                <p className="text-sm font-extrabold" style={{ color: INK }}>
                  Consultations en ligne : {CONSULT_PRICE.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: DS.body }}>
                Prix <strong style={{ color: BLUE }}>fixé par GlowScan</strong> — vous recevez{" "}
                <strong style={{ color: GREEN }}>{DERM_SHARE.toLocaleString("fr-FR")} FCFA</strong> par consultation.
                GlowScan prend {PLATFORM_SHARE.toLocaleString("fr-FR")} FCFA.
              </p>
              <p className="text-[11px] mt-2" style={{ color: DS.muted }}>
                Un tarif unique pour tous : pas de négociation, plus de confiance côté patient.
              </p>
            </div>
          )}
          <button
            onClick={async () => {
              setSavingB2c(true);
              try {
                await updateAcc.mutateAsync({ b2cAvailable, consultPriceFcfa: CONSULT_PRICE });
                toast({ title: b2cAvailable ? "Consultation en ligne activée ✅" : "Consultation en ligne désactivée" });
              } catch { toast({ title: "Erreur", variant: "destructive" }); }
              finally { setSavingB2c(false); }
            }}
            disabled={savingB2c}
            className="w-full py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50"
            style={{ background: NAVY }}
          >
            {savingB2c ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enregistrer"}
          </button>
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
              <p className="text-xs mb-4" style={{ color: DS.muted }}>Continuer après l'essai pour 10 000 FCFA / mois.</p>
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
                  S'abonner — 10 000 FCFA / mois
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

        {/* Mon équipe — secrétaires */}
        <ProCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: NAVY }} />
              <h2 className="font-extrabold text-base" style={{ color: INK }}>Mon équipe ({secretaries.length})</h2>
            </div>
            {!showSecretaryForm && (
              <button
                onClick={() => { setShowSecretaryForm(true); setCreatedSecretary(null); }}
                data-testid="button-add-secretary"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95"
                style={{ background: NAVY, color: "#fff" }}
              >
                <UserPlus className="w-3 h-3" />
                Ajouter une secrétaire
              </button>
            )}
          </div>

          <p className="text-xs mb-4" style={{ color: DS.muted }}>
            Une secrétaire peut créer des patients, prendre des photos et remplir les antécédents.
            Elle ne peut pas lancer d'analyse ni voir le tableau de bord, les statistiques ou le cabinet.
          </p>

          {/* Identifiants générés (après création) */}
          {createdSecretary && (
            <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <p className="text-xs font-extrabold mb-2" style={{ color: "#6ee7b7" }}>
                ✅ Identifiants à transmettre à votre secrétaire
              </p>
              <div className="space-y-1.5">
                <IdLine label="Email" value={createdSecretary.email} onCopy={() => { navigator.clipboard.writeText(createdSecretary.email); toast({ title: "Email copié" }); }} />
                <IdLine label="Mot de passe" value={createdSecretary.password} onCopy={() => { navigator.clipboard.writeText(createdSecretary.password); toast({ title: "Mot de passe copié" }); }} />
              </div>
              <p className="text-[10px] mt-2" style={{ color: DS.muted }}>
                Notez ce mot de passe maintenant — il ne sera plus affiché. Connexion secrétaire : page de connexion habituelle.
              </p>
            </div>
          )}

          {/* Formulaire ajout */}
          {showSecretaryForm && (
            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: SOFT_BG, border: `1px solid ${DS.border}` }}>
              <ProInput label="Nom complet" value={secFullName} onChange={(e) => setSecFullName(e.target.value)} placeholder="Marie Mbarga" testid="input-secretary-name" />
              <ProInput label="Email" type="email" value={secEmail} onChange={(e) => setSecEmail(e.target.value)} placeholder="secretaire@cabinet.com" testid="input-secretary-email" />
              <p className="text-[11px]" style={{ color: DS.muted }}>🔑 Un mot de passe sécurisé sera généré automatiquement et affiché après création.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSecretary}
                  disabled={createSecretary.isPending}
                  data-testid="button-confirm-secretary"
                  className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50"
                  style={{ background: NAVY }}
                >
                  {createSecretary.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Créer l'accès"}
                </button>
                <button
                  onClick={() => { setShowSecretaryForm(false); setSecFullName(""); setSecEmail(""); }}
                  className="px-4 py-2.5 rounded-full text-sm font-extrabold"
                  style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste secrétaires */}
          {secretaries.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: DS.muted }}>Aucune secrétaire pour le moment</p>
          ) : (
            <div className="space-y-1">
              {secretaries.map((s) => (
                <div
                  key={s.id}
                  data-testid={`secretary-row-${s.id}`}
                  className="flex items-center justify-between py-2.5 px-1"
                  style={{ borderBottom: `1px solid ${DS.border}` }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold truncate" style={{ color: INK }}>{s.fullName}</p>
                    <p className="text-[11px] truncate" style={{ color: DS.muted }}>{s.email}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSecretary(s.id, s.fullName)}
                    data-testid={`button-delete-secretary-${s.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all active:scale-95 flex-shrink-0"
                    style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)", color: "#f9a8d4" }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
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
              style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK }}
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
                  href={`/derm/patient/${p.id}`}
                  data-testid={`link-cabinet-patient-${p.id}`}
                  className="flex items-center justify-between py-2.5 px-1 rounded-lg transition-colors"
                  style={{ borderBottom: i < patients.length - 1 ? `1px solid ${DS.border}` : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = SOFT_BG)}
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

        <SecuritySection />

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
                  <p className="text-xs mb-4" style={{ color: DS.muted }}>10 000 FCFA / mois — Mobile Money</p>
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
                            : { borderColor: DS.border, background: SOFT_BG }
                        }
                      >
                        <div className="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ background: m.color }} />
                        <p className="text-xs font-extrabold" style={{ color: method === m.id ? INK : DS.body }}>{m.label}</p>
                      </button>
                    ))}
                  </div>
                  <div
                    className="rounded-xl p-3 mb-4"
                    style={{ background: SOFT_BG, border: `1px solid ${DS.border}` }}
                  >
                    <p className="text-xs font-extrabold" style={{ color: DS.body }}>Envoyer {PRO_PRICE} FCFA au :</p>
                    <p className="text-lg font-extrabold mt-1" style={{ color: NAVY }}>{paymentNumber}</p>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-extrabold mb-1.5 block" style={{ color: DS.body }}>Votre numéro de paiement</label>
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{ background: SOFT_BG, border: "1px solid rgba(167,139,250,0.2)" }}
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
                    style={{ background: SOFT_BG, border: `1px solid ${DS.border}` }}
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

function IdLine({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: DERM.textMuted }}>{label} : </span>
        <span className="text-sm font-extrabold" style={{ color: INK }}>{value}</span>
      </div>
      <button
        onClick={onCopy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold flex-shrink-0"
        style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: BLUE }}
      >
        <Copy className="w-3 h-3" /> Copier
      </button>
    </div>
  );
}

// ── Sécurité : 2FA par email (activation/désactivation) ────────────────────
function SecuritySection() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<"idle" | "confirm" | "disable">("idle");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    fetch("/api/pro/2fa/status", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { enabled: false })
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  const requestCode = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/2fa/email/request", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setHint(d.emailHint || ""); setStep("confirm");
      toast({ title: "Code envoyé 📧", description: d.devFallback ? "Mode dev : voir les logs serveur." : `Envoyé sur ${d.emailHint}.` });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const confirmEnable = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/2fa/email/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setEnabled(true); setStep("idle"); setCode("");
      toast({ title: "2FA activée ✅", description: "Un code vous sera demandé à chaque connexion." });
    } catch (e: any) { toast({ title: "Code incorrect", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/2fa/email/disable", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ password: pwd }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setEnabled(false); setStep("idle"); setPwd("");
      toast({ title: "2FA désactivée" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <ProCard className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4" style={{ color: BLUE }} />
        <h2 className="font-extrabold text-base" style={{ color: INK }}>Sécurité — Vérification en 2 étapes</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: DS.muted }}>
        Un code à 6 chiffres vous est envoyé par email à chaque connexion. Recommandé : vous manipulez des données patients.
      </p>

      {enabled === null ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: BLUE }} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold" style={{ color: enabled ? GREEN : DS.muted }}>
              {enabled ? <><CheckCircle2 className="w-4 h-4" /> Activée</> : <><Lock className="w-4 h-4" /> Désactivée</>}
            </span>
          </div>

          {step === "idle" && (
            enabled ? (
              <button onClick={() => setStep("disable")} className="w-full py-2.5 rounded-full text-sm font-extrabold"
                style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: "#dc2626" }} data-testid="button-2fa-disable">
                Désactiver la 2FA
              </button>
            ) : (
              <button onClick={requestCode} disabled={busy} className="w-full py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50"
                style={{ background: BLUE }} data-testid="button-2fa-enable">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Activer la 2FA par email"}
              </button>
            )
          )}

          {step === "confirm" && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: DS.body }}>Entrez le code envoyé à {hint} :</p>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric"
                placeholder="000000" data-testid="input-2fa-confirm"
                className="w-full px-3 py-2.5 rounded-xl text-lg font-extrabold text-center outline-none" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK, letterSpacing: 6 }} />
              <div className="flex gap-2">
                <button onClick={confirmEnable} disabled={busy || code.length < 6} className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: BLUE }} data-testid="button-2fa-confirm">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer"}
                </button>
                <button onClick={() => { setStep("idle"); setCode(""); }} className="px-4 py-2.5 rounded-full text-sm font-extrabold" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: DS.body }}>Annuler</button>
              </div>
            </div>
          )}

          {step === "disable" && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: DS.body }}>Confirmez avec votre mot de passe :</p>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mot de passe" data-testid="input-2fa-pwd"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK }} />
              <div className="flex gap-2">
                <button onClick={disable} disabled={busy || !pwd} className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: "#dc2626" }} data-testid="button-2fa-disable-confirm">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Désactiver"}
                </button>
                <button onClick={() => { setStep("idle"); setPwd(""); }} className="px-4 py-2.5 rounded-full text-sm font-extrabold" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: DS.body }}>Annuler</button>
              </div>
            </div>
          )}
        </>
      )}
    </ProCard>
  );
}

function Row({ label, value, testid }: any) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${DERM.border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-extrabold" style={{ color: DERM.textMuted }}>{label}</span>
      <span className="text-sm font-extrabold" style={{ color: INK }} data-testid={testid}>{value}</span>
    </div>
  );
}
