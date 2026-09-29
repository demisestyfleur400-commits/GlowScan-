import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useProAccount, useProPatients, useUpdateProAccount, useProStats, useProPendingPatients, useLastOpenedPatient } from "@/hooks/use-pro";
import { ProLayout, LoadingScreen, patientStatusOf } from "@/components/ProLayout";
import { SubscriptionExpiredBanner } from "@/components/pro/SubscriptionExpiredBanner";
import { DermOnboarding } from "@/components/pro/DermOnboarding";
import { DermNotifPrompt } from "@/components/DermNotifPrompt";
import { Button } from "@/components/ui/button";
import { PRO_SUBSCRIPTION_FCFA } from "@shared/premium";
import { formatF } from "@shared/delivery";

export { LoadingScreen };

// ════════════════════════════════════════════════════════════════════════
// Tableau de bord GlowScan Derm (refonte Organic) — maquette « Derm Portal »,
// écran « Tableau de bord ». Chiffres réels uniquement : patients, analyses,
// dossiers préparés (secrétaire), diagnostics IA à valider, rendez-vous du jour.
// Conserve la reprise automatique du dernier dossier ouvert (< 4 h).
// ════════════════════════════════════════════════════════════════════════

const TZ = "Africa/Douala";
const dayKey = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: TZ }); // AAAA-MM-JJ
const hhmm = (d: Date) => d.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const shortDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "short" }) : "";
const initials = (first?: string | null, last?: string | null) =>
  `${(first || "").trim()[0] || ""}${(last || "").trim()[0] || ""}`.toUpperCase() || "?";

// Types de rendez-vous (colonne appointments.type) : pastille de couleur + libellé.
export const APPT_TYPES: Record<string, { label: string; dot: string }> = {
  consultation: { label: "Consultation", dot: "var(--color-accent)" },
  suivi: { label: "Suivi", dot: "var(--color-accent-2-600)" },
  urgence: { label: "Urgence", dot: "var(--color-accent-800)" },
};

type PendingValidation = { scanId: number; patientId: number; condition: string | null; createdAt: string; firstName: string; lastName: string };

export default function ProDashboard() {
  const [, setLocation] = useLocation();
  const { data: accData, isLoading } = useProAccount();
  const { data: patientsData } = useProPatients("");
  const { data: stats } = useProStats();
  const { data: waitingData } = useProPendingPatients();
  const updateAcc = useUpdateProAccount();
  const role = accData?.user?.role;
  const isDoctor = !!accData?.account && role !== "secretary";

  const [tourOpen, setTourOpen] = useState(false);
  const [pending, setPending] = useState<PendingValidation[]>([]);
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const today = dayKey(new Date());
  const { data: apptData } = useQuery<{ appointments: any[] }>({
    queryKey: ["/api/pro/appointments", today],
    queryFn: async () => {
      const r = await fetch(`/api/pro/appointments?date=${today}`, { credentials: "include" });
      return r.ok ? r.json() : { appointments: [] };
    },
    enabled: isDoctor,
  });
  const { data: referral } = useQuery<{ code: number | null; count: number }>({ queryKey: ["/api/pro/referral"], enabled: isDoctor });

  const loadPending = async () => {
    try {
      const res = await fetch("/api/pro/pending-validations", { credentials: "include" });
      if (res.ok) setPending((await res.json()).items || []);
    } catch {}
  };
  useEffect(() => { if (isDoctor) loadPending(); }, [isDoctor, accData?.account?.id]);

  const validate = async (scanId: number) => {
    setValidatingId(scanId);
    try {
      const res = await fetch(`/api/pro/scans/${scanId}/validate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: true }),
      });
      if (res.ok) setPending((p) => p.filter((x) => x.scanId !== scanId));
    } catch {} finally { setValidatingId(null); }
  };

  useEffect(() => {
    if (accData?.account && !accData.account.onboardingDone) setTourOpen(true);
  }, [accData?.account?.onboardingDone]);

  // Secrétaire : pas de tableau de bord → ses patients. Sans compte → landing.
  useEffect(() => {
    if (isLoading) return;
    if (role === "secretary") setLocation("/derm/patients");
    else if (!accData?.account) setLocation("/derm");
  }, [isLoading, accData, role, setLocation]);

  // ── REPRISE AUTOMATIQUE DU DERNIER DOSSIER (médecin uniquement) ──────────
  // Si le médecin a ouvert un dossier dans les 4 dernières heures, on l'y
  // renvoie. Anti-enfermement : « ?stay=1 » (lien du logo) et un drapeau
  // one-shot par onglet, réinitialisé à la connexion.
  const { data: lastOpened, isLoading: lastOpenedLoading } = useLastOpenedPatient(isDoctor);
  const resumeAllowed = (() => {
    if (!isDoctor) return false;
    try {
      if (new URLSearchParams(window.location.search).get("stay") === "1") return false;
      if (sessionStorage.getItem("derm_autoresumed") === "1") return false;
    } catch {}
    return true;
  })();
  const resumePatient = resumeAllowed ? lastOpened?.patient : null;
  const resumeTarget = resumePatient
    ? (resumePatient.intakePending ? `/derm/analyse?patient=${resumePatient.id}` : `/derm/patient/${resumePatient.id}`)
    : null;
  useEffect(() => {
    try {
      if (isDoctor && new URLSearchParams(window.location.search).get("stay") === "1") sessionStorage.setItem("derm_autoresumed", "1");
    } catch {}
  }, [isDoctor]);
  useEffect(() => {
    if (!resumeTarget) return;
    try { sessionStorage.setItem("derm_autoresumed", "1"); } catch {}
    setLocation(resumeTarget);
  }, [resumeTarget, setLocation]);
  useEffect(() => {
    if (isDoctor && !lastOpenedLoading && !resumeTarget) {
      try { sessionStorage.setItem("derm_autoresumed", "1"); } catch {}
    }
  }, [isDoctor, lastOpenedLoading, resumeTarget]);

  if (isLoading || !accData?.account || role === "secretary") return <LoadingScreen />;
  if (resumeAllowed && lastOpenedLoading) return <LoadingScreen />;
  if (resumeTarget) return <LoadingScreen />;

  const acc: any = accData.account;
  const patients = patientsData?.patients || [];
  const waiting = waitingData?.patients || [];
  const appts = (apptData?.appointments || []).filter((a) => a.status !== "cancelled");
  const counts = patients.reduce((m, p) => { const k = patientStatusOf(p.status); m[k] = (m[k] || 0) + 1; return m; }, {} as Record<string, number>);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = patients.filter((p) => p.createdAt && new Date(p.createdAt).toISOString().slice(0, 7) === thisMonth).length;
  const scansThisMonth = stats?.monthly?.find((m) => m.month === thisMonth)?.count ?? 0;
  const todo = pending.length + waiting.length;
  const firstName = String(acc.fullName || "").replace(/^dr\.?\s+/i, "").split(/\s+/)[0] || "";

  const profileFields = [acc.fullName, acc.cabinetName, acc.phone, acc.city, acc.photoUrl || acc.avatarUrl, acc.bio, acc.specialties?.length || acc.specialty, acc.licenseNumber];
  const profilePct = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  const isTrial = acc.subscriptionStatus === "trial";
  const isActive = acc.subscriptionStatus === "active";
  const refLink = referral?.code ? `${window.location.origin}/derm/inscription?ref=${referral.code}` : "";
  const waInvite = refLink
    ? `https://wa.me/?text=${encodeURIComponent(`Je vous invite sur GlowScan Derm, l'outil des dermatologues africains : ${refLink}`)}`
    : "";

  const kpis = [
    { label: "Patients", value: patients.length, note: `+${newThisMonth} ce mois-ci`, to: "/derm/patients", bg: "bg-organic-surface", ink: "text-organic-neutral-700" },
    { label: "Analyses", value: stats?.totalScans ?? "—", note: `${scansThisMonth} ce mois-ci`, to: "/derm/statistiques", bg: "bg-organic-surface", ink: "text-organic-neutral-700" },
    { label: "Priorité haute", value: counts.priority || 0, note: "à revoir cette semaine", to: "/derm/patients?filtre=priority", bg: "bg-organic-accent-100", ink: "text-organic-accent-800" },
    { label: "En suivi", value: counts.monitoring || 0, note: "rappels programmés", to: "/derm/patients?filtre=monitoring", bg: "bg-organic-accent-2-100", ink: "text-organic-accent-2-800" },
  ];

  const sectionLabel = "text-[11px] font-bold uppercase tracking-[.1em] text-organic-neutral-700";

  return (
    <ProLayout>
      <SubscriptionExpiredBanner />

      <header className="flex flex-wrap items-end justify-between gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">
            {new Date().toLocaleDateString("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })}
          </span>
          <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Bonjour, Dr {firstName}</h1>
          <p className="m-0 text-[15px] text-organic-neutral-700">
            {todo} dossier{todo > 1 ? "s" : ""} vous attend{todo > 1 ? "ent" : ""} et {appts.length} rendez-vous aujourd'hui.
          </p>
        </div>
        <div className="flex flex-wrap gap-organic-2">
          <Button variant="secondary" onClick={() => setLocation("/derm/patients")} className="h-auto px-5 py-3">Mes patients</Button>
          <Button onClick={() => setLocation("/derm/analyse?nouveau=1")} className="h-auto px-[22px] py-3 text-[15px]" data-testid="button-new-patient">
            <Plus size={16} /> Nouveau patient
          </Button>
        </div>
      </header>

      {profilePct < 100 && (
        <div className="flex flex-wrap items-center gap-organic-4 rounded-card bg-organic-accent-2-100 px-organic-4 py-organic-3">
          <span className="font-heading text-[22px] text-organic-accent-2-800">{profilePct}%</span>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-bold text-organic-accent-2-900">Profil public presque prêt — ajoutez votre bio et votre photo pour recevoir des patients GlowScan.</span>
            <div className="h-2 overflow-hidden rounded-pill bg-organic-accent-2-200">
              <div className="h-full rounded-pill bg-organic-accent-2-600" style={{ width: `${profilePct}%` }} />
            </div>
          </div>
          <Button variant="secondary" onClick={() => setLocation("/derm/profil-public")} className="border-organic-accent-2-600 text-organic-accent-2-900" data-testid="link-complete-profile">
            Compléter
          </Button>
        </div>
      )}

      <DermNotifPrompt />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-organic-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.to} className={`flex flex-col gap-1.5 rounded-card p-organic-4 text-organic-text no-underline hover:shadow-organic-md ${k.bg}`} data-testid={`kpi-${k.label}`}>
            <span className={`text-[12px] font-bold ${k.ink}`}>{k.label}</span>
            <span className="font-heading text-[40px] leading-none">{k.value}</span>
            <span className="text-[12px] text-organic-neutral-700">{k.note}</span>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-organic-4">
        <div className="flex flex-col gap-organic-4 rounded-card bg-organic-surface p-organic-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-[22px]">À faire aujourd'hui</h3>
            <span className="rounded-pill bg-organic-accent-200 px-2.5 py-1 text-[12px] font-semibold text-organic-accent-900">{todo} en attente</span>
          </div>

          {waiting.length > 0 && (
            <div className="flex flex-col gap-organic-2">
              <span className={sectionLabel}>Dossiers préparés par la secrétaire</span>
              {waiting.map((w) => (
                <Link key={w.id} href={`/derm/analyse?patient=${w.id}`}
                  className="flex items-center gap-3 rounded-pill bg-organic-bg py-2.5 pl-2.5 pr-3 text-organic-text no-underline hover:bg-organic-neutral-100">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-organic-accent-200 text-[12px] font-bold text-organic-accent-800">{initials(w.firstName, w.lastName)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-bold">{w.firstName} {w.lastName}</span>
                    <span className="text-[12px] text-organic-neutral-700">
                      {[w.age ? `${w.age} ans` : null, w.createdAt ? `photos prises à ${hhmm(new Date(w.createdAt))}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-[13px] font-bold text-organic-accent-700">Continuer →</span>
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-organic-2">
            <span className={sectionLabel}>Diagnostics IA à valider</span>
            {pending.slice(0, 5).map((p) => (
              <div key={p.scanId} className="flex flex-wrap items-center gap-2.5 rounded-card bg-organic-bg py-2.5 pl-4 pr-2.5 sm:rounded-pill">
                <span className="flex min-w-[160px] flex-1 flex-col">
                  <span className="text-[14px] font-bold">{p.condition}</span>
                  <span className="text-[12px] text-organic-neutral-700">{p.firstName} {p.lastName} · {shortDate(p.createdAt)}</span>
                </span>
                <Button variant="ghost" onClick={() => setLocation(`/derm/patient/${p.patientId}`)} className="px-3">Corriger</Button>
                <Button onClick={() => validate(p.scanId)} disabled={validatingId === p.scanId}
                  className="bg-organic-accent-2-600 px-4 text-organic-bg hover:bg-organic-accent-2-700" data-testid={`button-validate-${p.scanId}`}>
                  Valider
                </Button>
              </div>
            ))}
            {pending.length > 5 && (
              <Link href="/derm/patients" className="text-[13px] font-bold text-organic-accent-700">+ {pending.length - 5} autres diagnostics à valider</Link>
            )}
            {pending.length === 0 && (
              <div className="rounded-pill bg-organic-accent-2-100 px-[18px] py-3.5 text-[13px] font-semibold text-organic-accent-2-800">
                Tout est validé. Chaque validation rend l'IA plus précise.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-[22px]">Aujourd'hui à l'agenda</h3>
            <Link href="/derm/agenda" className="text-[13px] font-bold text-organic-accent-700">Voir l'agenda</Link>
          </div>
          {appts.length === 0 && <span className="text-[14px] text-organic-neutral-700">Aucun rendez-vous aujourd'hui.</span>}
          {appts.map((a) => {
            const t = APPT_TYPES[a.type] || APPT_TYPES.consultation;
            return (
              <div key={a.id} className="flex items-center gap-3.5 py-2">
                <span className="w-[52px] flex-none font-heading text-[17px]">{hhmm(new Date(a.appointment_date))}</span>
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: t.dot }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-bold">{a.patient_name || "Patient"}</span>
                  <span className="text-[12px] text-organic-neutral-700">{t.label} · {a.duration_minutes || 30} min</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-organic-4">
        {isTrial && (
          <div className="flex flex-col gap-organic-2 rounded-card bg-organic-accent-100 p-organic-6">
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Essai gratuit</span>
            <span className="font-heading text-[40px] leading-none">{accData.daysLeftTrial ?? 0} <span className="text-[18px]">jours restants</span></span>
            <p className="m-0 text-[13px] text-organic-accent-900">Ensuite {formatF(PRO_SUBSCRIPTION_FCFA)} / mois via Mobile Money. Résiliable à tout moment.</p>
            <Button onClick={() => setLocation("/derm/cabinet")} className="mt-1.5 self-start">Activer mon abonnement</Button>
          </div>
        )}
        {isActive && (
          <div className="flex flex-col gap-organic-2 rounded-card bg-organic-accent-2-100 p-organic-6">
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-2-700">Abonnement actif</span>
            <span className="font-heading text-[28px] leading-[1.1]">Plan Pro</span>
            <p className="m-0 text-[13px] text-organic-accent-2-900">
              Toutes les fonctionnalités cliniques activées.
              {acc.subscriptionExpiresAt ? ` Prochain paiement le ${new Date(acc.subscriptionExpiresAt).toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "long" })}.` : ""}
            </p>
            <Button variant="secondary" onClick={() => setLocation("/derm/cabinet")} className="mt-1.5 self-start">Gérer mon cabinet</Button>
          </div>
        )}
        <div className="flex flex-col gap-organic-2 rounded-card bg-organic-surface p-organic-6">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Réseau</span>
          <span className="font-heading text-[20px] leading-tight">Second avis entre confrères</span>
          <p className="m-0 text-[13px] text-organic-neutral-800">Un cas difficile ? Partagez-le anonymisé avec un dermatologue du réseau.</p>
          <Button variant="secondary" onClick={() => setLocation("/derm/confreres")} className="mt-1.5 self-start">Demander un avis</Button>
        </div>
        {refLink && (
          <div className="flex flex-col gap-organic-2 rounded-card bg-organic-surface p-organic-6">
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Parrainage</span>
            <span className="font-heading text-[20px] leading-tight">Invitez un confrère</span>
            <p className="m-0 text-[13px] text-organic-neutral-800">
              {referral?.count ? `Déjà ${referral.count} confrère${referral.count > 1 ? "s" : ""} invité${referral.count > 1 ? "s" : ""}.` : "Partagez votre lien d'inscription."}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-organic-2">
              <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(refLink).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
                {copied ? "Lien copié ✓" : "Copier mon lien"}
              </Button>
              <a href={waInvite} target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center rounded-pill bg-organic-accent-2-600 px-4 py-2 text-[14px] font-bold text-organic-bg no-underline hover:bg-organic-accent-2-700">
                Inviter sur WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>

      {tourOpen && (
        <DermOnboarding
          dermName={acc.fullName || accData?.user?.firstName}
          onDone={async () => { setTourOpen(false); await updateAcc.mutateAsync({ onboardingDone: true }); }}
        />
      )}
    </ProLayout>
  );
}
