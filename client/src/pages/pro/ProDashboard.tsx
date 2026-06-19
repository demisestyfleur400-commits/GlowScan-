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
import { useProAccount, useProPatients, useUpdateProAccount, useProStats } from "@/hooks/use-pro";
import { ProLayout, ProCard } from "@/components/ProLayout";

const DS = {
  bg: "#0d0a0e",
  surface: "#13101f",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  pink: "#E91E8C",
  textPrimary: "#f3f0ff",
  textBody: "rgba(200,185,255,0.65)",
  textMuted: "rgba(255,255,255,0.35)",
  cardBorder: "rgba(255,255,255,0.07)",
  cardVioletBg: "rgba(167,139,250,0.06)",
  cardVioletBorder: "rgba(167,139,250,0.18)",
  subtleBg: "rgba(255,255,255,0.04)",
  statBg: "rgba(255,255,255,0.03)",
  statBorder: "rgba(255,255,255,0.06)",
  successBg: "rgba(16,185,129,0.08)",
  successBorder: "rgba(16,185,129,0.2)",
  successText: "#6ee7b7",
  warningBg: "rgba(245,158,11,0.08)",
  warningBorder: "rgba(245,158,11,0.2)",
  warningText: "#fbbf24",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};

const TOUR_STEPS = [
  { title: "Bienvenue sur votre tableau de bord", body: "Retrouvez ici votre vue d'ensemble et le bouton principal pour analyser un patient." },
  { title: "Mes patients", body: "Tous vos patients sont accessibles depuis l'onglet Patients, avec recherche et statuts cliniques." },
  { title: "Analyser un patient", body: "Le bouton central lance une analyse en 5 étapes : patient → photo → diagnostic IA → anamnèse → dossier." },
  { title: "Dossier automatique", body: "L'IA enregistre photo, diagnostic, métriques et produits recommandés sans saisie manuelle." },
  { title: "Statistiques cabinet", body: "Suivez votre activité : top conditions, top produits, évolution des Glow Scores." },
  { title: "Mon cabinet", body: "Gérez votre profil, votre liste patients et exportez vos données quand vous voulez." },
];

export default function ProDashboard() {
  const [, setLocation] = useLocation();
  const { data: accData, isLoading } = useProAccount();
  const { data: patientsData } = useProPatients("");
  const { data: stats } = useProStats();
  const updateAcc = useUpdateProAccount();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (accData?.account && !accData.account.onboardingDone) setTourOpen(true);
  }, [accData?.account?.onboardingDone]);

  useEffect(() => {
    if (!isLoading && !accData?.account) setLocation("/derm");
  }, [isLoading, accData]);

  if (isLoading || !accData?.account) {
    return <LoadingScreen />;
  }

  // 🔑 SÉCURITÉ : Les secrétaires n'ont pas accès au tableau de bord
  if (accData?.user?.role === "secretary") {
    return (
      <div style={{
        minHeight: "100vh",
        background: DS.bg,
        color: DS.textPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
        padding: "24px",
        fontFamily: DS.font,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Accès refusé</h1>
          <p style={{ color: DS.textBody, marginBottom: 24, lineHeight: 1.6 }}>
            Les secrétaires ont accès à la création de patients et la prise de photos.
            Le tableau de bord est réservé aux médecins.
          </p>
          <button
            onClick={() => setLocation("/derm/patients")}
            style={{
              padding: "12px 24px",
              background: DS.violet,
              color: "#fff",
              border: "none",
              borderRadius: 9999,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Aller aux patients
          </button>
        </div>
      </div>
    );
  }

  const acc = accData.account;
  const patients = patientsData?.patients || [];
  const patientCount = patients.length;
  const isTrial = acc.subscriptionStatus === "trial";

  const recentPatients = patients.slice(0, 4);
  // Compatibilité ancien système (red/yellow/green) + nouveau (priority/monitoring/stable/resolved)
  const statusCounts = patients.reduce(
    (acc, p) => {
      const s = p.status || "stable";
      // Mapper ancien → nouveau
      const mapped = s === "red" ? "priority" : s === "yellow" ? "monitoring" : s === "green" ? "stable" : s;
      acc[mapped] = (acc[mapped] || 0) + 1;
      return acc;
    },
    { priority: 0, monitoring: 0, stable: 0, resolved: 0 } as Record<string, number>
  );

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const closeTour = async () => {
    setTourOpen(false);
    await updateAcc.mutateAsync({ onboardingDone: true });
  };

  return (
    <ProLayout>
      {/* ══ WELCOME WIDGET ══ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.04))",
          border: `1px solid ${DS.cardVioletBorder}`,
          borderRadius: 24, padding: "20px 22px",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", color: DS.textMuted, marginBottom: 4 }}>
            {today}
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: DS.textPrimary, margin: "0 0 14px" }}>
            Bonjour, Dr {acc.fullName.split(" ")[0]} 👋
          </h2>

          {/* Stats rapides */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Patients total", value: patientCount, color: DS.violetMid },
              { label: "Priorité haute", value: statusCounts.priority, color: "#f87171" },
              { label: "En suivi", value: statusCounts.monitoring, color: "#fbbf24" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: DS.textMuted, margin: "2px 0 0", fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <Link href="/derm/analyse?nouveau=1"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: DS.violet, color: "#fff", borderRadius: 9999,
              padding: "10px 20px", fontSize: 13, fontWeight: 800, textDecoration: "none",
            }}>
            <ScanLine size={14} /> + Nouveau patient
          </Link>
        </div>
      </motion.div>

      {/* Primary CTA */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link
          href="/derm/analyse?nouveau=1"
          data-testid="button-analyze-patient"
          style={{
            display: "block",
            background: DS.cardVioletBg,
            border: `1px solid ${DS.cardVioletBorder}`,
            borderRadius: 24,
            padding: 20,
            textDecoration: "none",
            transition: "border-color 0.15s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: DS.violet,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ScanLine style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: DS.textPrimary, margin: "0 0 3px" }}>Analyser un patient</p>
              <p style={{ fontSize: 12, color: DS.textBody, margin: 0 }}>Patient → photo → IA → questionnaire → dossier en 5 étapes</p>
            </div>
            <ArrowRight style={{ width: 18, height: 18, color: DS.violetMid, flexShrink: 0 }} />
          </div>
        </Link>
      </motion.div>

      {/* KPI grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 16 }}
      >
        <KpiCard to="/derm/patients" icon={<Users style={{ width: 16, height: 16, color: DS.violetMid }} />} value={patientCount} label="Patients" testid="kpi-patients" />
        <KpiCard to="/derm/statistiques" icon={<BarChart3 style={{ width: 16, height: 16, color: DS.successText }} />} value={stats?.totalScans ?? 0} label="Analyses" testid="kpi-stats" />
        <KpiCard to="/derm/patients" icon={<Activity style={{ width: 16, height: 16, color: "#f87171" }} />} value={statusCounts.priority} label="Priorité haute" testid="kpi-urgent" />
        {accData?.isAdmin && (
          <KpiCard to="/derm/dataset" icon={<span style={{ fontSize: 14 }}>🧬</span>} label="Dataset IA" testid="kpi-dataset" />
        )}
      </motion.div>

      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
        {/* Recent patients */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <ProCard style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: DS.textMuted, margin: "0 0 3px" }}>
                  Activité récente
                </p>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>Derniers patients</h3>
              </div>
              <Link
                href="/derm/patients"
                data-testid="link-all-patients"
                style={{ fontSize: 12, fontWeight: 700, color: DS.violetMid, textDecoration: "none" }}
              >
                Voir tout
              </Link>
            </div>

            {recentPatients.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Users style={{ width: 32, height: 32, color: DS.textMuted, margin: "0 auto 10px", display: "block" }} />
                <p style={{ fontSize: 13, color: DS.textBody, marginBottom: 14 }}>Aucun patient encore enregistré</p>
                <Link
                  href="/derm/analyse?nouveau=1"
                  data-testid="link-add-first"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    borderRadius: 9999,
                    background: DS.violet,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  <ScanLine style={{ width: 14, height: 14 }} />
                  Analyser un patient
                </Link>
              </div>
            ) : (
              <div>
                {recentPatients.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/derm/patient/${p.id}`}
                    data-testid={`row-patient-${p.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: i < recentPatients.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        background: `rgba(167,139,250,0.2)`,
                        border: `1px solid rgba(167,139,250,0.3)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: DS.violetLight,
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: DS.textPrimary, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.firstName} {p.lastName}
                      </p>
                      <p style={{ fontSize: 11, color: DS.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.age ? `${p.age} ans · ` : ""}
                        {p.lastScanAt ? `dernier scan ${new Date(p.lastScanAt).toLocaleDateString("fr-FR")}` : "jamais analysé"}
                      </p>
                    </div>
                    <ChevronRight style={{ width: 16, height: 16, color: DS.textMuted, flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            )}
          </ProCard>
        </motion.div>

        {/* Subscription */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {isTrial ? (
            <ProCard testid="card-trial" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Clock style={{ width: 15, height: 15, color: DS.warningText }} />
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: DS.warningText, margin: 0 }}>
                  Essai en cours
                </p>
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: DS.textPrimary, margin: "0 0 2px" }}>
                {accData.daysLeftTrial}
                <span style={{ fontSize: 15, fontWeight: 600, color: DS.textBody }}> jours</span>
              </p>
              <p style={{ fontSize: 12, color: DS.textMuted, marginBottom: 14 }}>restants sur votre essai gratuit</p>
              <div
                style={{
                  background: DS.warningBg,
                  border: `1px solid ${DS.warningBorder}`,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <p style={{ fontSize: 12, color: DS.warningText, margin: 0 }}>
                  Continuez après l'essai pour <strong>30 000 FCFA / mois</strong>. Mobile Money, résiliable à tout moment.
                </p>
              </div>
              <Link
                href="/derm/cabinet"
                data-testid="link-subscribe"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px 20px",
                  borderRadius: 9999,
                  background: DS.pink,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                <Crown style={{ width: 14, height: 14 }} />
                Activer mon abonnement
              </Link>
            </ProCard>
          ) : (
            <ProCard style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: DS.successText, display: "inline-block" }} />
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: DS.successText, margin: 0 }}>
                  Abonnement actif
                </p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: DS.textPrimary, margin: "0 0 4px" }}>Plan Pro</p>
              <p style={{ fontSize: 12, color: DS.textBody, marginBottom: 16 }}>Toutes les fonctionnalités cliniques activées</p>
              <Link
                href="/derm/cabinet"
                data-testid="link-cabinet"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px 20px",
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: DS.textPrimary,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Gérer mon cabinet
                <ChevronRight style={{ width: 14, height: 14 }} />
              </Link>
            </ProCard>
          )}
        </motion.div>
      </div>

      {/* Onboarding tour modal */}
      <AnimatePresence>
        {tourOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 51,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  background: DS.surface,
                  border: `1px solid ${DS.cardVioletBorder}`,
                  borderRadius: 28,
                  padding: 28,
                  maxWidth: 360,
                  width: "100%",
                  pointerEvents: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles style={{ width: 15, height: 15, color: DS.violetMid }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: DS.violetMid }}>
                      Étape {tourStep + 1}/{TOUR_STEPS.length}
                    </span>
                  </div>
                  <button
                    onClick={closeTour}
                    data-testid="button-skip-tour"
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X style={{ width: 14, height: 14, color: DS.textMuted }} />
                  </button>
                </div>
                <h3
                  style={{ fontSize: 17, fontWeight: 800, color: DS.textPrimary, marginBottom: 8 }}
                  data-testid="text-tour-title"
                >
                  {TOUR_STEPS[tourStep].title}
                </h3>
                <p style={{ fontSize: 13, color: DS.textBody, marginBottom: 20, lineHeight: 1.6 }}>
                  {TOUR_STEPS[tourStep].body}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <button
                    onClick={closeTour}
                    data-testid="button-skip-tour-bottom"
                    style={{ fontSize: 12, color: DS.textMuted, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
                  >
                    Passer
                  </button>
                  <button
                    onClick={() => (tourStep < TOUR_STEPS.length - 1 ? setTourStep(tourStep + 1) : closeTour())}
                    data-testid="button-next-tour"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 18px",
                      borderRadius: 9999,
                      background: DS.violet,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {tourStep < TOUR_STEPS.length - 1 ? (
                      <>Suivant <ArrowRight style={{ width: 13, height: 13 }} /></>
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

function KpiCard({ to, icon, value, label, testid }: any) {
  return (
    <Link
      href={to}
      data-testid={testid}
      style={{
        display: "block",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 14,
        textDecoration: "none",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ marginBottom: 10 }}>{icon}</div>
      {value !== undefined && value !== null && (
        <p style={{ fontSize: 24, fontWeight: 800, color: "#f3f0ff", margin: "0 0 2px" }}>{value}</p>
      )}
      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", margin: value !== undefined && value !== null ? 0 : "4px 0 0" }}>{label}</p>
    </Link>
  );
}

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0a0e",
        fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(200,185,255,0.65)" }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 9999,
            border: "2px solid rgba(167,139,250,0.2)",
            borderTopColor: "#a78bfa",
            animation: "spin 1s linear infinite",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Chargement…</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
