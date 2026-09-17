import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { useProAccount } from "@/hooks/use-pro";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";
import { DERM } from "@/lib/design-tokens";

// ════════════════════════════════════════════════════════════════════════
// Espace « Paiements » du dermatologue — SÉPARÉ du dossier clinique.
// Affiche UNIQUEMENT des valeurs réellement enregistrées côté serveur
// (prix payé, part dermato, part plateforme quand elles existent). Aucun
// recalcul, aucun taux codé en dur, aucun statut de versement inventé :
// il n'existe pas de preuve de virement en base, donc on n'affiche jamais
// « versé » — au mieux « à verser » pour une consultation validée et payée.
// ════════════════════════════════════════════════════════════════════════

const INK = DERM.text;
const MUTED = "#64748B";
const GREEN = DERM.green;

type Payment = {
  id: number;
  ref: string;
  patientFirstName: string | null;
  createdAt: string | null;
  status: string | null;
  paymentStatus: string | null;
  priceFcfa: number | null;
  dermatologuePayout: number | null;
  platformCommission: number | null;
  isDemo: boolean;
};

const fcfa = (n: number | null | undefined) =>
  n == null ? null : `${Number(n).toLocaleString("fr-FR")} FCFA`;

// Statut de paiement (données réelles : paid / unpaid, + défensif refunded/cancelled).
function paymentBadge(p: Payment): { label: string; bg: string; color: string } {
  const st = (p.status || "").toLowerCase();
  const pay = (p.paymentStatus || "").toLowerCase();
  if (pay === "refunded") return { label: "Remboursé", bg: "rgba(100,116,139,0.12)", color: "#475569" };
  if (st === "cancelled" || st === "canceled" || st === "annulee" || st === "timeout")
    return { label: "Annulé", bg: "rgba(100,116,139,0.12)", color: "#475569" };
  if (pay === "paid") return { label: "Paiement confirmé", bg: "rgba(5,150,105,0.1)", color: "#047857" };
  return { label: "Paiement en attente", bg: "rgba(217,119,6,0.1)", color: "#b45309" };
}

// Statut de versement — jamais « versé » (aucune donnée de virement en base).
function payoutLabel(p: Payment): string {
  const st = (p.status || "").toLowerCase();
  const pay = (p.paymentStatus || "").toLowerCase();
  if (pay === "refunded") return "—";
  if (st === "cancelled" || st === "canceled" || st === "timeout") return "Annulé";
  if (pay !== "paid") return "En attente du paiement patient";
  if (st === "closed") return "À verser";
  return "En attente (consultation en cours)";
}

export default function ProPayments() {
  const { data: accData } = useProAccount();
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    let stop = false;
    fetch("/api/pro/payments", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { payments: [] }))
      .then((d) => { if (!stop) setPayments(Array.isArray(d?.payments) ? d.payments : []); })
      .catch(() => { if (!stop) setPayments([]); });
    return () => { stop = true; };
  }, []);

  // Les secrétaires n'ont pas accès aux finances.
  if (accData?.user?.role === "secretary") {
    return (
      <ProLayout title="Paiements" back="/derm/dashboard">
        <div style={{ textAlign: "center", padding: "40px 24px", color: MUTED }}>
          <p>Les secrétaires n'ont pas accès aux paiements du cabinet.</p>
        </div>
      </ProLayout>
    );
  }

  if (payments === null) return <LoadingScreen />;

  const real = payments.filter((p) => !p.isDemo);
  const paidPatient = real
    .filter((p) => (p.paymentStatus || "").toLowerCase() === "paid")
    .reduce((s, p) => s + (p.priceFcfa || 0), 0);
  // « À verser » : uniquement les payouts RÉELLEMENT enregistrés sur consultations validées + payées.
  const toPayout = real
    .filter((p) => (p.paymentStatus || "").toLowerCase() === "paid" && (p.status || "").toLowerCase() === "closed" && p.dermatologuePayout != null)
    .reduce((s, p) => s + (p.dermatologuePayout || 0), 0);

  return (
    <ProLayout title="Paiements" back="/derm/dashboard">
      <div className="space-y-4">
        {/* Résumé — valeurs réelles agrégées */}
        <div className="grid grid-cols-2 gap-3">
          <ProCard className="p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: MUTED }}>Payé par les patients</p>
            <p className="text-lg font-black mt-1" style={{ color: INK }}>{paidPatient.toLocaleString("fr-FR")} FCFA</p>
          </ProCard>
          <ProCard className="p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: MUTED }}>À verser (enregistré)</p>
            <p className="text-lg font-black mt-1" style={{ color: GREEN }}>{toPayout.toLocaleString("fr-FR")} FCFA</p>
          </ProCard>
        </div>

        <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
          Montants issus des enregistrements de la plateforme. Les versements sont réglés par GlowScan
          selon le barème en vigueur ; ce tableau n'affiche que les données réelles disponibles.
        </p>

        {real.length === 0 ? (
          <ProCard className="p-6">
            <p className="text-sm text-center" style={{ color: MUTED }}>Aucun paiement pour le moment.</p>
          </ProCard>
        ) : (
          <div className="space-y-2.5">
            {real.map((p) => {
              const b = paymentBadge(p);
              return (
                <ProCard key={p.id} className="p-4" testid={`payment-${p.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold" style={{ color: INK }}>
                        {p.patientFirstName || p.ref}
                      </p>
                      <p className="text-[11px]" style={{ color: MUTED }}>
                        {p.ref}{p.createdAt ? ` · ${new Date(p.createdAt).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: b.bg, color: b.color }}>
                      {b.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Amount label="Payé patient" value={fcfa(p.priceFcfa)} />
                    <Amount label="Part dermato" value={fcfa(p.dermatologuePayout)} fallback="À la clôture" accent={GREEN} />
                    <Amount label="Part plateforme" value={fcfa(p.platformCommission)} fallback="À la clôture" />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    <span className="text-[11px] font-bold" style={{ color: MUTED }}>Versement : {payoutLabel(p)}</span>
                  </div>
                </ProCard>
              );
            })}
          </div>
        )}
      </div>
    </ProLayout>
  );
}

function Amount({ label, value, fallback, accent }: { label: string; value: string | null; fallback?: string; accent?: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{label}</p>
      {value ? (
        <p className="text-xs font-extrabold mt-0.5" style={{ color: accent || INK }}>{value}</p>
      ) : (
        <p className="text-[10px] font-semibold mt-0.5 italic" style={{ color: "#94A3B8" }}>{fallback || "—"}</p>
      )}
    </div>
  );
}
