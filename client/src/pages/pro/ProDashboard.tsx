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
import { useProAccount, useProPatients, useUpdateProAccount, useProStats, useProPendingPatients } from "@/hooks/use-pro";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { DermNotifPrompt } from "@/components/DermNotifPrompt";
import { DERM, DERM_LOGO } from "@/lib/design-tokens";
import { computeProfileScore, profileLabel } from "@/lib/profile-score";

const DS = {
  bg: DERM.bg,
  surface: DERM.surface,
  violet: DERM.violet,
  violetMid: DERM.violetMid,
  violetLight: DERM.violetLight,
  pink: DERM.pink,
  textPrimary: DERM.text,
  textBody: DERM.textBody,
  textMuted: DERM.textMuted,
  cardBorder: DERM.border,
  cardVioletBg: "rgba(124,58,237,0.06)",
  cardVioletBorder: "rgba(124,58,237,0.20)",
  subtleBg: "#F1F5F9",
  statBg: "#F1F5F9",
  statBorder: DERM.border,
  successBg: "rgba(5,150,105,0.08)",
  successBorder: "rgba(5,150,105,0.25)",
  successText: "#047857",
  warningBg: "rgba(217,119,6,0.08)",
  warningBorder: "rgba(217,119,6,0.25)",
  warningText: "#b45309",
  soft: "#F1F5F9",
  blue: "#0369A1",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};

// Étapes d'onboarding — cliquables, disparaissent quand tout est fait
function computeOnboarding(acc: any, patientCount: number) {
  const cabinetDone = !!(acc?.cabinetName && acc?.phone && acc?.city);
  const publicDone = acc?.b2cAvailable === true;
  const firstPatientDone = patientCount > 0;
  const steps = [
    { key: "cabinet", label: "Complétez votre profil cabinet", hint: "2 min", to: "/derm/cabinet", done: cabinetDone },
    { key: "public", label: "Activez votre profil public", hint: "recevez des patients", to: "/derm/profil-public", done: publicDone },
    { key: "patient", label: "Analysez votre premier patient", hint: "3 min", to: "/derm/analyse?nouveau=1", done: firstPatientDone },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, allDone: doneCount === steps.length, pct: Math.round((doneCount / steps.length) * 100) };
}

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
  const { data: pendingData } = useProPendingPatients();
  const updateAcc = useUpdateProAccount();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  // File d'attente de validation (fait croître le volume de données GOLD réelles)
  const [pending, setPending] = useState<any[]>([]);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  const loadPending = async () => {
    try {
      const res = await fetch("/api/pro/pending-validations", { credentials: "include" });
      if (res.ok) { const d = await res.json(); setPending(d.items || []); }
    } catch {}
  };
  useEffect(() => { if (accData?.account) loadPending(); }, [accData?.account?.id]);

  const validatePending = async (scanId: number) => {
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

  const role = accData?.user?.role;

  useEffect(() => {
    // Redirige vers la landing uniquement les visiteurs SANS compte ET non-secrétaires.
    // La secrétaire a une session valide (mais pas de proAccount) → écran dédié ci-dessous.
    if (!isLoading && !accData?.account && role !== "secretary") setLocation("/derm");
  }, [isLoading, accData, role]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // 🔑 SÉCURITÉ : Les secrétaires n'ont pas accès au tableau de bord (vérifié AVANT
  // la garde account-null, car une secrétaire n'a pas de proAccount).
  if (role === "secretary") {
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

  // Pas de compte (et pas secrétaire) → l'effet ci-dessus redirige vers /derm ;
  // on affiche le loader le temps que la navigation se fasse.
  if (!accData?.account) {
    return <LoadingScreen />;
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

  // ── Onboarding + complétion profil public ──
  const onboarding = computeOnboarding(acc as any, patientCount);
  const a: any = acc;
  const profileFields = [a.fullName, a.cabinetName, a.phone, a.city, a.photoUrl || a.avatarUrl, a.bio, (a.specialties?.length || a.specialty), a.licenseNumber];
  const profileFilled = profileFields.filter(Boolean).length;
  const profilePct = Math.round((profileFilled / profileFields.length) * 100);
  const profileComplete = profilePct >= 100;

  const closeTour = async () => {
    setTourOpen(false);
    await updateAcc.mutateAsync({ onboardingDone: true });
  };

  const profileScore = computeProfileScore({
    email: (accData?.user as any)?.email,
    fullName: (acc as any).fullName, city: (acc as any).city, phone: (acc as any).phone,
    country: (acc as any).country, licenseNumber: (acc as any).licenseNumber, cabinetName: (acc as any).cabinetName,
  });

  return (
    <ProLayout>
      {/* ══ BANNIÈRE COMPLÉTION PROFIL (priorité absolue — disparaît à 100%) ══ */}
      {profileScore < 100 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
          <div style={{ borderRadius: 18, padding: "16px 18px", background: "linear-gradient(135deg, rgba(8,145,178,0.08), rgba(124,58,237,0.06))", border: "1px solid rgba(8,145,178,0.22)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>{profileLabel(profileScore)}</p>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#0891B2", fontVariantNumeric: "tabular-nums" }}>{profileScore}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: "#E2E8F0", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${profileScore}%`, borderRadius: 9999, background: "linear-gradient(90deg,#0891B2,#7C3AED)", transition: "width .4s" }} />
            </div>
            <Link href="/derm/profil" data-testid="link-complete-profile"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#7C3AED", color: "#fff", borderRadius: 9999, padding: "9px 18px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
              Compléter maintenant <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      )}

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
              <div key={i} style={{ background: "#F1F5F9", borderRadius: 12, padding: "10px 12px" }}>
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

      <DermNotifPrompt />

      {/* ══ 2 · PROFIL PUBLIC — remonté sous le greeting, avec barre de complétion ══ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
        <Link href="/derm/profil-public" data-testid="link-public-profile-top"
          style={{ display: "block", padding: "16px 18px", borderRadius: 20, textDecoration: "none",
            background: DS.surface, border: `1px solid ${profileComplete ? DS.successBorder : DS.cardVioletBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>✦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>Mon profil public</p>
              <p style={{ fontSize: 11.5, color: DS.textBody, margin: "2px 0 0" }}>
                Photo, bio, spécialités + votre lien à partager pour attirer des patients.
              </p>
            </div>
            <span style={{ color: profileComplete ? DS.successText : DS.violet, fontSize: 18, flexShrink: 0 }}>→</span>
          </div>
          {/* Barre de complétion */}
          <div style={{ height: 8, borderRadius: 9999, background: DS.soft, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${profilePct}%`, borderRadius: 9999,
              background: profileComplete ? DERM.green : DS.violet, transition: "width .3s" }} />
          </div>
          <p style={{ fontSize: 11.5, fontWeight: 700, margin: "8px 0 0",
            color: profileComplete ? DS.successText : DS.violet }}>
            {profileComplete
              ? "✓ Profil complet — vous êtes visible par les patients GlowScan"
              : `Profil complété à ${profilePct}% — Complétez pour recevoir des patients GlowScan`}
          </p>
        </Link>
      </motion.div>

      {/* ══ 3 · CARTE PATIENTS GLOWSCAN B2C ══ */}
      {!(acc as any).b2cAvailable && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 18px", borderRadius: 20,
            background: "linear-gradient(135deg, rgba(3,105,161,0.08), rgba(8,145,178,0.04))",
            border: "1px solid rgba(3,105,161,0.20)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <p style={{ fontSize: 14, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>Patients GlowScan B2C</p>
            </div>
            <p style={{ fontSize: 12, color: DS.textBody, margin: "0 0 12px", lineHeight: 1.6 }}>
              Des patients font leur analyse sur glow-scan.com. Quand leur score est bas, GlowScan les oriente
              vers vous. Activez votre profil public pour commencer à en recevoir.
            </p>
            <Link href="/derm/profil-public" data-testid="link-activate-b2c"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: DS.blue, color: "#fff",
                borderRadius: 9999, padding: "9px 18px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
              Activer mon profil <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ══ Réseau confrères — second avis ══ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ marginBottom: 16 }}>
        <Link href="/derm/confreres" data-testid="link-peer-reviews"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 20, textDecoration: "none",
            background: DS.surface, border: `1px solid ${DS.border}` }}>
          <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: "rgba(3,105,161,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users style={{ width: 18, height: 18, color: DS.blue }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>Second avis entre confrères</p>
            <p style={{ fontSize: 11.5, color: DS.textBody, margin: "2px 0 0" }}>Un cas difficile ? Demandez l'avis d'un confrère (anonymisé).</p>
          </div>
          <span style={{ color: DS.blue, fontSize: 18 }}>→</span>
        </Link>
      </motion.div>

      {/* ══ 4 · ONBOARDING — checklist 3 étapes (disparaît quand tout est fait) ══ */}
      {!onboarding.allDone && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 18px", borderRadius: 20, background: DS.surface, border: `1px solid ${DS.cardVioletBorder}` }}>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: DS.textPrimary, margin: "0 0 4px" }}>
              Pour recevoir vos premiers patients :
            </p>
            <p style={{ fontSize: 11, color: DS.textMuted, margin: "0 0 12px" }}>
              {onboarding.doneCount}/{onboarding.steps.length} étapes complétées
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {onboarding.steps.map((s) => (
                <Link key={s.key} href={s.to} data-testid={`onboarding-${s.key}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12,
                    textDecoration: "none", background: DS.soft,
                    border: `1px solid ${s.done ? DS.successBorder : DS.border}` }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 9999,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900,
                    background: s.done ? DERM.green : "#fff",
                    border: `1px solid ${s.done ? DERM.green : DS.border}`, color: s.done ? "#fff" : DS.textMuted }}>
                    {s.done ? "✓" : ""}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0,
                      color: s.done ? DS.textMuted : DS.textPrimary,
                      textDecoration: s.done ? "line-through" : "none" }}>{s.label}</p>
                    <p style={{ fontSize: 10.5, color: DS.textMuted, margin: "1px 0 0" }}>{s.hint}</p>
                  </div>
                  {!s.done && <ChevronRight style={{ width: 16, height: 16, color: DS.violet, flexShrink: 0 }} />}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ PATIENTS EN ATTENTE D'ANALYSE (dossiers préparés par la secrétaire) ══ */}
      {(pendingData?.patients?.length || 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
          <div style={{ background: "rgba(124,58,237,0.08)", border: `1px solid ${DS.cardVioletBorder}`, borderRadius: 20, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>
                📋 {pendingData!.patients.length} patient{pendingData!.patients.length > 1 ? "s" : ""} en attente d'analyse
              </p>
              <span style={{ fontSize: 10, color: DS.textMuted }}>Dossier prêt · reprends l'examen</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingData!.patients.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/derm/analyse?patient=${p.id}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#F1F5F9", borderRadius: 12, padding: "10px 12px", textDecoration: "none" }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: DS.textPrimary, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {[p.firstName, p.lastName].filter(Boolean).join(" ") || "Patient"}
                    </p>
                    <p style={{ fontSize: 10, color: DS.textMuted, margin: "1px 0 0" }}>
                      {p.age ? `${p.age} ans · ` : ""}{p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : ""}
                    </p>
                  </div>
                  <span style={{ flexShrink: 0, background: DS.violet, color: "#fff", borderRadius: 9999, padding: "6px 14px", fontSize: 11, fontWeight: 800 }}>
                    Continuer →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ FILE D'ATTENTE DE VALIDATION (données GOLD) ══ */}
      {pending.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
          <div style={{ background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, borderRadius: 20, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>
                🩺 {pending.length} diagnostic{pending.length > 1 ? "s" : ""} à valider
              </p>
              <span style={{ fontSize: 10, color: DS.textMuted }}>Valider enrichit le dataset GlowScan</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pending.slice(0, 5).map((s) => (
                <div key={s.scanId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#F1F5F9", borderRadius: 12, padding: "9px 12px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: DS.textPrimary, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.condition || "Diagnostic"}
                    </p>
                    <p style={{ fontSize: 10, color: DS.textMuted, margin: "1px 0 0" }}>
                      {[s.firstName, s.lastName].filter(Boolean).join(" ") || "Patient"}
                      {s.createdAt ? ` · ${new Date(s.createdAt).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => validatePending(s.scanId)}
                    disabled={validatingId === s.scanId}
                    style={{ flexShrink: 0, background: "#10b981", color: "#fff", border: "none", borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", opacity: validatingId === s.scanId ? 0.6 : 1 }}
                  >
                    {validatingId === s.scanId ? "…" : "✓ Valider"}
                  </button>
                  <Link href={`/derm/patient/${s.patientId}`} style={{ flexShrink: 0, background: "#F1F5F9", color: DS.textBody, borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
                    Corriger
                  </Link>
                </div>
              ))}
            </div>
            {pending.length > 5 && (
              <p style={{ fontSize: 10, color: DS.textMuted, margin: "8px 0 0", textAlign: "center" }}>
                + {pending.length - 5} autre{pending.length - 5 > 1 ? "s" : ""} — voir les fiches patients
              </p>
            )}
          </div>
        </motion.div>
      )}

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
                      borderBottom: i < recentPatients.length - 1 ? `1px solid #E2E8F0` : "none",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        background: "rgba(124,58,237,0.12)",
                        border: "1px solid rgba(124,58,237,0.25)",
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
                  Continuez après l'essai pour <strong>10 000 FCFA / mois</strong>. Mobile Money, résiliable à tout moment.
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
                  background: "#F1F5F9",
                  border: "1px solid #E2E8F0",
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
                      background: "#F1F5F9",
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
        background: "#F1F5F9",
        border: "1px solid #E2E8F0",
        borderRadius: 16,
        padding: 14,
        textDecoration: "none",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ marginBottom: 10 }}>{icon}</div>
      {value !== undefined && value !== null && (
        <p style={{ fontSize: 24, fontWeight: 800, color: DERM.text, margin: "0 0 2px" }}>{value}</p>
      )}
      <p style={{ fontSize: 11, fontWeight: 700, color: DERM.textMuted, margin: value !== undefined && value !== null ? 0 : "4px 0 0" }}>{label}</p>
    </Link>
  );
}

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "#FFFFFF",
        fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
      }}
    >
      {/* Logo GlowScan DERM — pulse doux */}
      <div style={{ textAlign: "center", animation: "gs-pulse 1.6s ease-in-out infinite" }}>
        <img
          src={DERM_LOGO}
          alt="GlowScan"
          width={56}
          height={56}
          style={{ borderRadius: 16, objectFit: "cover", border: "1px solid #E2E8F0", display: "block", margin: "0 auto 10px" }}
        />
        <p style={{ fontSize: 15, fontWeight: 900, color: "#0F172A", margin: 0 }}>GlowScan DERM</p>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "#7c3aed", margin: "2px 0 0" }}>
          Clinical Engine
        </p>
      </div>
      {/* Barre de progression fine violette */}
      <div style={{ width: 160, height: 3, borderRadius: 9999, background: "#EDE9FE", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "40%", borderRadius: 9999, background: "#7c3aed", animation: "gs-bar 1.2s ease-in-out infinite" }} />
      </div>
      <style>{`
        @keyframes gs-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .6; transform: scale(.97); } }
        @keyframes gs-bar { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }
      `}</style>
    </div>
  );
}
