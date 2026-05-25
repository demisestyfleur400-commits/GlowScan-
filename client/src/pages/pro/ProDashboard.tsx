import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Users,
  ScanLine,
  BarChart3,
  Crown,
  X,
  ChevronRight,
  Sparkles,
  Activity,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useProAccount, useProPatients, useUpdateProAccount } from "@/hooks/use-pro";
import { ProLayout, ProCard, NAVY, GREEN, } from "@/components/ProLayout";

const TOUR_STEPS = [
  { title: "Bienvenue sur votre tableau de bord", body: "Retrouvez ici votre vue d'ensemble et le bouton principal pour analyser un patient." },
  { title: "Mes patients", body: "Tous vos patients sont accessibles depuis l'onglet Patients, avec recherche et statuts cliniques." },
  { title: "Analyser un patient", body: "Le bouton central lance une analyse en 4 étapes : photo → questionnaire → dossier auto → validation." },
  { title: "Dossier automatique", body: "L'IA enregistre photo, diagnostic, métriques et produits recommandés sans saisie manuelle." },
  { title: "Statistiques cabinet", body: "Suivez votre activité : top conditions, top produits, évolution des Glow Scores." },
  { title: "Mon cabinet", body: "Gérez votre profil, votre liste patients et exportez vos données quand vous voulez." },
];

export default function ProDashboard() {
  const [, setLocation] = useLocation();
  const { data: accData, isLoading } = useProAccount();
  const { data: patientsData } = useProPatients("");
  const updateAcc = useUpdateProAccount();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (accData?.account && !accData.account.onboardingDone) setTourOpen(true);
  }, [accData?.account?.onboardingDone]);

  useEffect(() => {
    if (!isLoading && !accData?.account) setLocation("/pro");
  }, [isLoading, accData]);

  if (isLoading || !accData?.account) {
    return <LoadingScreen />;
  }

  const acc = accData.account;
  const patients = patientsData?.patients || [];
  const patientCount = patients.length;
  const isTrial = acc.subscriptionStatus === "trial";

  // Mini-stats dérivées
  const recentPatients = patients.slice(0, 4);
  const statusCounts = patients.reduce(
    (acc, p) => {
      const s = (p.status || "green") as "red" | "yellow" | "green";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { red: 0, yellow: 0, green: 0 } as Record<string, number>
  );

  const closeTour = async () => {
    setTourOpen(false);
    await updateAcc.mutateAsync({ onboardingDone: true });
  };

  return (
    <ProLayout>
      {/* WELCOME HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Tableau de bord</p>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>
          Bonjour, Dr {acc.fullName.split(" ").slice(-1)[0] || acc.fullName}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {patientCount > 0
            ? `Vous suivez ${patientCount} patient${patientCount > 1 ? "s" : ""} sur GlowScan Pro.`
            : "Votre cabinet GlowScan Pro est prêt. Commencez par analyser un patient."}
        </p>
      </motion.div>

      {/* CTA principal */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link
          href="/pro/analyse"
          data-testid="button-analyze-patient"
          className="group block bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-700 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: NAVY }}>
              <ScanLine className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base" style={{ color: INK }}>Analyser un patient</p>
              <p className="text-xs text-slate-500 mt-0.5">Photo → IA → questionnaire → dossier en 4 étapes</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" style={{ color: NAVY }} />
          </div>
        </Link>
      </motion.div>

      {/* KPI grid */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <KpiCard
          to="/pro/patients"
          icon={<Users className="w-4 h-4" />}
          accent={NAVY}
          value={patientCount}
          label="Patients"
          testid="kpi-patients"
        />
        <KpiCard
          to="/pro/statistiques"
          icon={<BarChart3 className="w-4 h-4" />}
          accent={GREEN}
          value="—"
          label="Voir stats"
          testid="kpi-stats"
        />
        <KpiCard
          to="/pro/patients"
          icon={<Activity className="w-4 h-4" />}
          accent="#EF4444"
          value={statusCounts.red}
          label="Cas urgents"
          testid="kpi-urgent"
        />
        <KpiCard
          to="/pro/patients"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="#0EA5E9"
          value={statusCounts.green}
          label="En progrès"
          testid="kpi-progress"
        />
      </motion.div>

      {/* GRID 2 colonnes : derniers patients / abonnement */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* Derniers patients */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
          <ProCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Activité récente</p>
                <h3 className="text-base font-bold" style={{ color: INK }}>Derniers patients</h3>
              </div>
              <Link href="/pro/patients" className="text-xs font-semibold hover:underline" style={{ color: NAVY }} data-testid="link-all-patients">
                Voir tout
              </Link>
            </div>

            {recentPatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">Aucun patient encore enregistré</p>
                <Link
                  href="/pro/analyse?nouveau=1"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: NAVY }}
                  data-testid="link-add-first"
                >
                  <ScanLine className="w-4 h-4" />
                  Analyser un patient
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPatients.map((p) => (
                  <Link
                    key={p.id}
                    href={`/pro/patient/${p.id}`}
                    data-testid={`row-patient-${p.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: NAVY }}>
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: INK }}>
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {p.age ? `${p.age} ans · ` : ""}
                        {p.lastScanAt ? `dernier scan ${new Date(p.lastScanAt).toLocaleDateString("fr-FR")}` : "jamais analysé"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                ))}
              </div>
            )}
          </ProCard>
        </motion.div>

        {/* Abonnement */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {isTrial ? (
            <ProCard className="p-5 h-full" testid="card-trial">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Essai en cours</p>
              </div>
              <p className="text-3xl font-bold" style={{ color: INK }}>
                {accData.daysLeftTrial}<span className="text-base font-semibold text-slate-500"> jours</span>
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">restants sur votre essai gratuit</p>

              <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100">
                <p className="text-xs text-slate-700">
                  Continuez après l'essai pour <strong>20 000 FCFA / mois</strong>. Mobile Money, résiliable à tout moment.
                </p>
              </div>

              <Link
                href="/pro/cabinet"
                data-testid="link-subscribe"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold"
                style={{ background: NAVY }}
              >
                <Crown className="w-4 h-4" />
                Activer mon abonnement
              </Link>
            </ProCard>
          ) : (
            <ProCard className="p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Abonnement actif</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: INK }}>Plan Pro</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Toutes les fonctionnalités cliniques activées</p>
              <Link
                href="/pro/cabinet"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                data-testid="link-cabinet"
              >
                Gérer mon cabinet
                <ChevronRight className="w-4 h-4" />
              </Link>
            </ProCard>
          )}
        </motion.div>
      </div>

      {/* Onboarding tour modal */}
      <AnimatePresence>
        {tourOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 z-50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full pointer-events-auto shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: NAVY }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NAVY }}>
                      Étape {tourStep + 1}/{TOUR_STEPS.length}
                    </span>
                  </div>
                  <button onClick={closeTour} className="p-1 rounded-md hover:bg-slate-100" data-testid="button-skip-tour">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <h3 className="text-lg font-bold mb-2" data-testid="text-tour-title" style={{ color: INK }}>
                  {TOUR_STEPS[tourStep].title}
                </h3>
                <p className="text-sm text-slate-600 mb-5 leading-relaxed">{TOUR_STEPS[tourStep].body}</p>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={closeTour} className="text-xs text-slate-400 font-semibold" data-testid="button-skip-tour-bottom">
                    Passer
                  </button>
                  <button
                    onClick={() => (tourStep < TOUR_STEPS.length - 1 ? setTourStep(tourStep + 1) : closeTour())}
                    data-testid="button-next-tour"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ background: NAVY }}
                  >
                    {tourStep < TOUR_STEPS.length - 1 ? (
                      <>
                        Suivant <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      "Terminer"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ProLayout>
  );
}

function KpiCard({ to, icon, accent, value, label, testid }: any) {
  return (
    <Link
      href={to}
      data-testid={testid}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{ background: accent }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: INK }}>
        {value}
      </p>
      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</p>
    </Link>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex items-center gap-3 text-slate-500">
        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-700 animate-spin" />
        <span className="text-sm font-medium">Chargement…</span>
      </div>
    </div>
  );
}
