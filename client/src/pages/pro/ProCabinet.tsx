import { SPLITS, splitConsultation } from "@shared/splits";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Download, Crown, CheckCircle2, Loader2, Phone, Clock, UserPlus, Users, Copy, Trash2, ShieldCheck, Lock } from "lucide-react";
import { useProAccount, useProPatients, useUpdateProAccount, useSecretaries, useCreateSecretary, useDeleteSecretary } from "@/hooks/use-pro";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ProLayout, ProCard, ProInput, LogoutButton, LoadingScreen } from "@/components/ProLayout";
import { Button } from "@/components/ui/button";
import { formatF } from "@shared/delivery";
import { PRO_SUBSCRIPTION_FCFA } from "@shared/premium";
import { NotifSettingsCard } from "@/components/NotifSettingsCard";
import { DermSubscribeFlow } from "@/components/DermSubscribeFlow";
import { DERM } from "@/lib/design-tokens";

const NAVY = "var(--color-accent-700)";
const BLUE = "var(--color-accent-2-700)";
const GRADIENT = "var(--color-accent)";
const INK = "var(--color-text)";
const GREEN = "var(--color-accent-2-700)";

const MTN_NUMBER = "674377959";
const ORANGE_NUMBER = "690501392";
const PRO_PRICE = PRO_SUBSCRIPTION_FCFA;

// Prix consultation en ligne — MODIFIABLE par chaque dermatologue.
const DEFAULT_CONSULT_PRICE = 4800; // défaut ; chaque dermato peut le modifier

const DS = {
  surface: "var(--color-surface)",
  border: "var(--color-divider)",
  body: "var(--color-neutral-800)",
  muted: "var(--color-neutral-700)",
};

// Fonds/bordures légers réutilisés (remplacent les anciens rgba(255,255,255,…) du thème sombre)
const SOFT_BG = "var(--color-bg)";
const SOFT_BORDER = "var(--color-divider)";

export default function ProCabinet() {
  const { data: accData } = useProAccount();
  const { data: patientsData } = useProPatients("");
  const updateAcc = useUpdateProAccount();
  const { toast } = useToast();

  const [saved, setSaved] = useState(false);
  const [exported, setExported] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  // Opt-in consultation B2C
  const [b2cAvailable, setB2cAvailable] = useState(false);
  const [consultPrice, setConsultPrice] = useState("4800");
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
      toast({ title: "Secrétaire créée", description: "Communiquez-lui ses identifiants ci-dessous." });
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
      setConsultPrice(String((accData.account as any).consultPriceFcfa ?? 4800));
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
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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
    setExported(true);
    setTimeout(() => setExported(false), 1800);
  };


  // Secrétaire : pas d'accès aux réglages du cabinet → ses patients.
  if (accData?.user?.role === "secretary") {
    return (
      <ProLayout>
        <div className="rounded-card bg-organic-surface p-organic-6 text-[14px]">Les réglages du cabinet sont réservés au médecin.</div>
      </ProLayout>
    );
  }

  const card = "flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6";
  const toggle = (on: boolean, onClick: () => void, testid: string, label: string) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} data-testid={testid}
      className={`relative h-7 w-12 flex-none cursor-pointer rounded-pill border-0 transition-colors ${on ? "bg-organic-accent-2-600" : "bg-organic-neutral-400"}`}>
      <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-organic-neutral-100 transition-all ${on ? "left-[23px]" : "left-[3px]"}`} />
    </button>
  );

  return (
    <ProLayout>
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">Réglages</span>
        <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Cabinet</h1>
      </header>

      <section className="grid items-start gap-organic-4 lg:grid-cols-2">
        <div className="flex flex-col gap-organic-4">
          {/* Profil du cabinet */}
          <div className={card}>
            <h3 className="m-0 text-[22px]">Profil du cabinet</h3>
            <ProInput label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} testid="input-fullname" />
            <ProInput label="Nom du cabinet" value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} testid="input-cabinet" />
            <div className="grid grid-cols-1 gap-organic-3 sm:grid-cols-2">
              <ProInput label="Ville" value={city} onChange={(e) => setCity(e.target.value)} testid="input-city" />
              <ProInput label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" testid="input-phone" />
              <ProInput label="N° d'ordre" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} testid="input-license" />
              <ProInput label="Pays" value={country} onChange={(e) => setCountry(e.target.value)} testid="input-country" />
            </div>
            <Button onClick={handleSave} isLoading={updateAcc.isPending} disabled={updateAcc.isPending || !fullName.trim()} className="self-start" data-testid="button-save">
              {saved ? "Enregistré ✓" : "Enregistrer"}
            </Button>
          </div>

          {/* Consultation en ligne (B2C) */}
          <div className={card}>
            <h3 className="m-0 text-[22px]">Consultation en ligne</h3>
            <p className="m-0 text-[13px] text-organic-neutral-800">
              Activez-la pour recevoir des patients directement depuis l'appli GlowScan et échanger avec eux en ligne.
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-bold">Accepter les consultations à distance</span>
              {toggle(b2cAvailable, () => setB2cAvailable((v) => !v), "toggle-b2c", "Accepter les consultations à distance")}
            </div>
            {b2cAvailable && (() => {
              const priceNum = Math.max(0, parseInt(consultPrice, 10) || 0);
              const dermShare = splitConsultation(priceNum).pro;
              return (
                <div className="flex flex-col gap-2 rounded-card bg-organic-bg p-organic-4">
                  <ProInput label="Prix de votre consultation en ligne (FCFA)" type="number" inputMode="numeric" value={consultPrice}
                    onChange={(e) => setConsultPrice(e.target.value)} placeholder="4800" testid="input-consult-price" />
                  <p className="m-0 text-[13px] leading-relaxed text-organic-neutral-800">
                    Vous fixez votre prix. Vous recevez <b className="text-organic-accent-2-700">{formatF(dermShare)}</b> par consultation
                    ({SPLITS.consultation.pro} % ; GlowScan garde {SPLITS.consultation.platform} %).
                  </p>
                  <p className="m-0 text-[12px] text-organic-neutral-700">Prix conseillé : 4 800 FCFA. Modifiable à tout moment.</p>
                </div>
              );
            })()}
            <Button
              onClick={async () => {
                setSavingB2c(true);
                try {
                  await updateAcc.mutateAsync({ b2cAvailable, consultPriceFcfa: Math.max(500, parseInt(consultPrice, 10) || DEFAULT_CONSULT_PRICE) } as any);
                  toast({ title: b2cAvailable ? "Consultation en ligne activée" : "Consultation en ligne désactivée" });
                } catch { toast({ title: "Erreur", variant: "destructive" }); }
                finally { setSavingB2c(false); }
              }}
              isLoading={savingB2c} disabled={savingB2c} className="self-start" data-testid="button-save-b2c">
              Enregistrer
            </Button>
          </div>

          {/* Abonnement */}
          <div className={card}>
            <h3 className="m-0 text-[22px]">Abonnement</h3>
            {isTrial ? (
              <>
                <p className="m-0 text-[14px]">Essai gratuit · <b>{accData.daysLeftTrial} jours restants</b></p>
                <p className="m-0 text-[13px] text-organic-neutral-700">Ensuite {formatF(PRO_PRICE)} / mois via Mobile Money. Vos gains en consultations et en avis sont déduits automatiquement.</p>
                {statusData?.request?.status === "pending" ? (
                  <div className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">
                    Demande de paiement en attente · {statusData.request.reference}
                  </div>
                ) : (
                  <Button onClick={() => setShowSubscribe(true)} className="self-start" data-testid="button-subscribe">Activer mon abonnement</Button>
                )}
              </>
            ) : (
              <p className="m-0 text-[14px] font-bold text-organic-accent-2-700">Abonnement actif</p>
            )}
          </div>

          <NotifSettingsCard />
        </div>

        <div className="flex flex-col gap-organic-4">
          {/* Secrétaires */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 text-[22px]">Secrétaires</h3>
              {!showSecretaryForm && (
                <Button variant="ghost" onClick={() => { setShowSecretaryForm(true); setCreatedSecretary(null); }} data-testid="button-add-secretary">
                  <UserPlus size={16} /> Ajouter
                </Button>
              )}
            </div>

            {createdSecretary && (
              <div className="flex flex-col gap-1.5 rounded-card bg-organic-accent-2-100 p-organic-4">
                <span className="text-[13px] font-bold text-organic-accent-2-900">Identifiants à transmettre à votre secrétaire</span>
                <IdLine label="Email" value={createdSecretary.email} onCopy={() => { navigator.clipboard.writeText(createdSecretary.email); toast({ title: "Email copié" }); }} />
                <IdLine label="Mot de passe" value={createdSecretary.password} onCopy={() => { navigator.clipboard.writeText(createdSecretary.password); toast({ title: "Mot de passe copié" }); }} />
                <span className="text-[12px] text-organic-accent-2-900">Notez ce mot de passe maintenant : il ne sera plus affiché. Elle se connecte sur la page de connexion habituelle.</span>
              </div>
            )}

            {showSecretaryForm && (
              <div className="flex flex-col gap-organic-3 rounded-card bg-organic-bg p-organic-4">
                <ProInput label="Nom complet" value={secFullName} onChange={(e) => setSecFullName(e.target.value)} placeholder="Marie Mbarga" testid="input-secretary-name" />
                <ProInput label="Email" type="email" value={secEmail} onChange={(e) => setSecEmail(e.target.value)} placeholder="secretaire@cabinet.cm" testid="input-secretary-email" />
                <span className="text-[12px] text-organic-neutral-700">Un mot de passe est généré automatiquement et affiché après la création.</span>
                <div className="flex gap-2">
                  <Button onClick={handleCreateSecretary} isLoading={createSecretary.isPending} disabled={createSecretary.isPending} data-testid="button-confirm-secretary">Créer l'accès</Button>
                  <Button variant="ghost" onClick={() => { setShowSecretaryForm(false); setSecFullName(""); setSecEmail(""); }}>Annuler</Button>
                </div>
              </div>
            )}

            {secretaries.length === 0 && !showSecretaryForm && (
              <span className="text-[13px] text-organic-neutral-700">Aucune secrétaire pour le moment.</span>
            )}
            {secretaries.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-pill bg-organic-bg py-2 pl-2 pr-2" data-testid={`secretary-row-${s.id}`}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[12px] font-bold text-organic-accent-2-800">
                  {s.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-bold">{s.fullName}</span>
                  <span className="truncate text-[12px] text-organic-neutral-700">{s.email}</span>
                </span>
                <Button variant="ghost" onClick={() => handleDeleteSecretary(s.id, s.fullName)} data-testid={`button-delete-secretary-${s.id}`}>Retirer</Button>
              </div>
            ))}
            <span className="text-[12px] text-organic-neutral-700">Elles créent les dossiers et prennent les photos. Pas d'accès aux chiffres ni aux paiements.</span>
          </div>

          <SecuritySection currentEmail={(accData?.user as any)?.email} />

          <SignPinCard />

          {((accData?.account as any)?.profile || "derm") === "derm" && <PeerAvailabilityCard />}

          {/* Données */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-[14px] font-bold">Exporter mes patients</span>
                <span className="text-[12px] text-organic-neutral-700">Fichier CSV · {patients.length} dossier{patients.length > 1 ? "s" : ""}</span>
              </span>
              <Button variant="secondary" onClick={exportData} disabled={patients.length === 0} data-testid="button-export">
                <Download size={16} /> {exported ? "Téléchargé ✓" : "Exporter"}
              </Button>
            </div>
          </div>

          <div className={card}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-[14px] font-bold">Visite guidée</span>
                <span className="text-[12px] text-organic-neutral-700">Revoir la présentation de GlowScan Derm en 2 minutes.</span>
              </span>
              <Button variant="secondary" onClick={async () => { try { await updateAcc.mutateAsync({ onboardingDone: false }); } catch {} window.location.href = "/derm/dashboard?stay=1"; }}>
                Revoir
              </Button>
            </div>
          </div>

          <LogoutButton />
        </div>
      </section>

      {/* Abonnement dermatologue — flux fidèle au design (D1→D4) */}
      {showSubscribe && (
        <DermSubscribeFlow
          fullName={acc.fullName}
          licenseNumber={(acc as any).licenseNumber}
          email={(accData as any)?.user?.email || null}
          refNo={`GS-DRM-${String(acc.id).padStart(4, "0")}`}
          defaultPhone={acc.phone}
          onClose={() => setShowSubscribe(false)}
        />
      )}
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
function SecuritySection({ currentEmail }: { currentEmail?: string }) {
  const { toast } = useToast();
  // Changement d'email
  const [emailStep, setEmailStep] = useState<"idle" | "confirm">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [changedEmail, setChangedEmail] = useState<string | null>(null);

  const requestEmailChange = async () => {
    if (!newEmail.includes("@")) { toast({ title: "Email invalide", variant: "destructive" }); return; }
    setEmailBusy(true);
    try {
      const r = await fetch("/api/pro/account/email/request", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ newEmail }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setEmailStep("confirm");
      toast({ title: "Code envoyé au nouvel email ", description: d.devFallback ? "Mode dev : voir les logs." : `Vérifiez ${d.emailHint}.` });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setEmailBusy(false); }
  };
  const confirmEmailChange = async () => {
    setEmailBusy(true);
    try {
      const r = await fetch("/api/pro/account/email/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code: emailCode }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setChangedEmail(d.email); setEmailStep("idle"); setNewEmail(""); setEmailCode("");
      toast({ title: "Email modifié ", description: `Votre email de connexion est maintenant ${d.email}.` });
    } catch (e: any) { toast({ title: "Code incorrect", description: e?.message, variant: "destructive" }); }
    finally { setEmailBusy(false); }
  };

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<"idle" | "confirm" | "disable">("idle");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const refreshStatus = () => {
    fetch("/api/pro/2fa/status", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { enabled: false })
      .then((d) => { setEnabled(!!d.enabled); setRemaining(typeof d.backupCodesRemaining === "number" ? d.backupCodesRemaining : null); })
      .catch(() => setEnabled(false));
  };
  useEffect(() => { refreshStatus(); }, []);

  const regenerateCodes = async () => {
    if (!window.confirm("Générer de nouveaux codes ? Les anciens ne fonctionneront plus.")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/pro/2fa/backup-codes/generate", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setNewCodes(d.codes || []); refreshStatus();
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const requestCode = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/2fa/email/request", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setHint(d.emailHint || ""); setStep("confirm");
      toast({ title: "Code envoyé ", description: d.devFallback ? "Mode dev : voir les logs serveur." : `Envoyé sur ${d.emailHint}.` });
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
      if (Array.isArray(d.backupCodes) && d.backupCodes.length) setNewCodes(d.backupCodes);
      refreshStatus();
      toast({ title: "Vérification en 2 étapes activée ", description: "Un code vous sera demandé à chaque connexion." });
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
      toast({ title: "Vérification en 2 étapes désactivée" });
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
                style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: "var(--color-accent-800)" }} data-testid="button-2fa-disable">
                Désactiver la vérification en 2 étapes
              </button>
            ) : (
              <button onClick={requestCode} disabled={busy} className="w-full py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50"
                style={{ background: GRADIENT }} data-testid="button-2fa-enable">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Activer la vérification en 2 étapes"}
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
                <button onClick={confirmEnable} disabled={busy || code.length < 6} className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: GRADIENT }} data-testid="button-2fa-confirm">
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
                <button onClick={disable} disabled={busy || !pwd} className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: "var(--color-accent-800)" }} data-testid="button-2fa-disable-confirm">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Désactiver"}
                </button>
                <button onClick={() => { setStep("idle"); setPwd(""); }} className="px-4 py-2.5 rounded-full text-sm font-extrabold" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: DS.body }}>Annuler</button>
              </div>
            </div>
          )}

          {/* Codes de secours affichés une fois (après activation / régénération) */}
          {newCodes.length > 0 && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <p className="text-[12px] font-extrabold mb-1" style={{ color: "var(--color-accent-800)" }}>Notez ces codes — ils ne seront plus affichés</p>
              <div className="grid grid-cols-2 gap-1.5 mb-2" style={{ fontFamily: "monospace" }}>
                {newCodes.map((c, i) => (
                  <div key={i} className="text-center text-sm font-bold rounded" style={{ background: "var(--color-neutral-100)", border: "1px solid #FDE68A", padding: "6px 4px", letterSpacing: 1, color: INK }}>{c}</div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { navigator.clipboard.writeText(newCodes.join("\n")); toast({ title: "Codes copiés" }); }}
                  className="text-[12px] font-extrabold" style={{ color: BLUE }}>Copier</button>
                <button onClick={() => setNewCodes([])} className="text-[12px] font-extrabold" style={{ color: "var(--color-accent-800)" }}>J'ai noté, masquer</button>
              </div>
            </div>
          )}

          {/* Statut des codes de secours + régénération */}
          {enabled && newCodes.length === 0 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px]" style={{ color: remaining !== null && remaining <= 2 ? "var(--color-accent-800)" : DS.muted }}>
                Codes de secours restants : <strong>{remaining ?? "…"}</strong>
              </span>
              <button onClick={regenerateCodes} disabled={busy} className="text-[11px] font-extrabold" style={{ color: BLUE }} data-testid="button-regen-backup">
                Régénérer
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Changer d'email de connexion ── */}
      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${DS.border}` }}>
        <p className="text-sm font-extrabold mb-1" style={{ color: INK }}>Email de connexion</p>
        <p className="text-xs mb-3" style={{ color: DS.muted }}>
          Actuel : <strong style={{ color: INK }}>{changedEmail || currentEmail || "—"}</strong>
          {enabled ? " · c’est aussi votre email de vérification de sécurité." : ""}
        </p>
        {emailStep === "idle" ? (
          <div className="flex gap-2">
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nouvel@email.com" data-testid="input-new-email"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK }} />
            <button onClick={requestEmailChange} disabled={emailBusy || !newEmail} className="px-4 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: GRADIENT }} data-testid="button-request-email-change">
              {emailBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Changer"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: DS.body }}>Entrez le code envoyé à <strong style={{ color: INK }}>{newEmail}</strong> :</p>
            <input value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" placeholder="000000" data-testid="input-email-change-code"
              className="w-full px-3 py-2.5 rounded-xl text-lg font-extrabold text-center outline-none" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: INK, letterSpacing: 6 }} />
            <div className="flex gap-2">
              <button onClick={confirmEmailChange} disabled={emailBusy || emailCode.length < 6} className="flex-1 py-2.5 rounded-full text-white text-sm font-extrabold disabled:opacity-50" style={{ background: GRADIENT }} data-testid="button-confirm-email-change">
                {emailBusy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer le nouvel email"}
              </button>
              <button onClick={() => { setEmailStep("idle"); setEmailCode(""); }} className="px-4 py-2.5 rounded-full text-sm font-extrabold" style={{ background: SOFT_BG, border: `1px solid ${SOFT_BORDER}`, color: DS.body }}>Annuler</button>
            </div>
          </div>
        )}
      </div>
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

// ── Code de signature à 4 chiffres (signe chaque compte rendu) ─────────────
// Confrères : visible dans l'annuaire et proposé pour « premier disponible ».
function PeerAvailabilityCard() {
  const { data, refetch } = useQuery<{ available: boolean }>({ queryKey: ["/api/peer/settings"] });
  const [busy, setBusy] = useState(false);
  const on = data?.available !== false;
  const toggle = async () => {
    setBusy(true);
    try {
      await fetch("/api/peer/settings", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available: !on }) });
      await refetch();
    } finally { setBusy(false); }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-card bg-organic-surface p-organic-6">
      <span className="flex flex-col">
        <span className="text-[14px] font-bold">Disponible pour les avis confrères</span>
        <span className="text-[12px] text-organic-neutral-700">
          Les confrères peuvent vous envoyer des cas complexes ({formatF(3000)} ou {formatF(5000)}, {SPLITS.peer.peer} % pour vous). Votre pays et vos expertises apparaissent dans l'annuaire.
        </span>
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={busy || !data} data-testid="toggle-peer-available"
        className={`relative h-7 w-12 flex-none cursor-pointer rounded-pill border-0 transition-colors ${on ? "bg-organic-accent-2-600" : "bg-organic-neutral-400"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

function SignPinCard() {
  const { toast } = useToast();
  const { data, refetch } = useQuery<{ set: boolean }>({ queryKey: ["/api/pro/sign-pin"] });
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isSet = data?.set === true;
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const save = async () => {
    if (pin.length !== 4) return setErr("Le code doit comporter exactement 4 chiffres.");
    if (pin !== pin2) return setErr("Les deux codes ne correspondent pas.");
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/pro/sign-pin", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, currentPin: isSet ? current : undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Code non enregistré.");
      toast({ title: isSet ? "Code de signature modifié" : "Code de signature enregistré" });
      setOpen(false); setCurrent(""); setPin(""); setPin2("");
      refetch();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const pinInput = (label: string, v: string, set: (s: string) => void, testid: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-organic-neutral-700">{label}</span>
      <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={v} data-testid={testid}
        onChange={(e) => { set(digits(e.target.value)); setErr(""); }}
        className="box-border h-11 w-full rounded-pill border border-organic-divider bg-organic-bg px-4 text-center font-body text-[18px] tracking-[.4em] text-organic-text outline-none focus:border-organic-accent" />
    </label>
  );

  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-[14px] font-bold">Code de signature</span>
          <span className="text-[12px] text-organic-neutral-700">
            {isSet ? "Votre code à 4 chiffres vaut signature de chaque compte rendu." : "Pas encore choisi : il vous sera demandé au premier compte rendu."}
          </span>
        </span>
        {!open && <Button variant="secondary" onClick={() => setOpen(true)} data-testid="button-sign-pin">{isSet ? "Modifier" : "Choisir"}</Button>}
      </div>
      {open && (
        <div className="flex flex-col gap-organic-3">
          <div className={`grid gap-organic-3 ${isSet ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {isSet && pinInput("Code actuel", current, setCurrent, "input-current-pin")}
            {pinInput("Nouveau code", pin, setPin, "input-cab-new-pin")}
            {pinInput("Confirmez le code", pin2, setPin2, "input-cab-new-pin2")}
          </div>
          {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
          <div className="flex gap-2">
            <Button onClick={save} isLoading={busy} disabled={busy} data-testid="button-save-sign-pin">Enregistrer le code</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setErr(""); }}>Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
}
