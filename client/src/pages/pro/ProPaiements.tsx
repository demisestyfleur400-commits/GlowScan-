import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProLayout, LoadingScreen } from "@/components/ProLayout";
import { useProAccount } from "@/hooks/use-pro";
import { formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Paiements (refonte Organic) — maquette « Derm Portal », écran Paiements.
// Séparé du dossier clinique : une ligne par consultation en ligne, ce que le
// patient a payé, la part du médecin (shared/splits.ts) et l'état du versement
// lu dans le registre (séquestre → « Consultation en cours », disponible →
// « À verser »). Les retraits se font depuis le Portefeuille.
// ════════════════════════════════════════════════════════════════════════

type Row = {
  id: number; name: string; ref: string; at: string; price: number; dermShare: number;
  payment: "paid" | "refunded" | "pending"; payout: "awaiting_patient" | "in_progress" | "to_pay" | null;
};

const BADGE: Record<Row["payment"], { label: string; tag: string }> = {
  paid: { label: "Paiement confirmé", tag: "bg-organic-accent-2-200 text-organic-accent-2-900" },
  refunded: { label: "Remboursé", tag: "bg-organic-neutral-200 text-organic-neutral-900" },
  pending: { label: "Paiement en attente", tag: "bg-organic-accent-200 text-organic-accent-900" },
};
const PAYOUT: Record<NonNullable<Row["payout"]>, string> = {
  awaiting_patient: "En attente du paiement patient",
  in_progress: "Consultation en cours",
  to_pay: "À verser",
};

export default function ProPaiements() {
  const [, setLocation] = useLocation();
  const { data: accData } = useProAccount();
  const isSecretary = accData?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) setLocation("/derm/patients"); }, [isSecretary, setLocation]);
  const { data, isLoading, isError } = useQuery<{ items: Row[]; paidTotal: number; toPay: number; sharePct: number }>({
    queryKey: ["/api/pro/payments"], enabled: !!accData && !isSecretary,
  });
  if (isSecretary) return <LoadingScreen />;

  const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "short" });
  const amount = (n: number) => formatF(n).replace(/\s?F$/, "");

  return (
    <ProLayout>
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">Séparé du dossier clinique</span>
        <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Paiements</h1>
      </header>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-organic-3">
        <div className="flex flex-col gap-1 rounded-card bg-organic-surface p-organic-6">
          <span className="text-[12px] font-bold text-organic-neutral-700">Payé par les patients</span>
          <span className="font-heading text-[40px] leading-none">{amount(data?.paidTotal ?? 0)}</span>
          <span className="text-[12px] text-organic-neutral-700">FCFA</span>
        </div>
        <div className="flex flex-col gap-1 rounded-card bg-organic-accent-2-100 p-organic-6">
          <span className="text-[12px] font-bold text-organic-accent-2-800">À verser (enregistré)</span>
          <span className="font-heading text-[40px] leading-none">{amount(data?.toPay ?? 0)}</span>
          <span className="text-[12px] text-organic-accent-2-800">FCFA</span>
        </div>
      </section>
      <p className="m-0 text-[13px] text-organic-neutral-700">
        Montants issus des enregistrements de la plateforme. Les versements sont réglés par GlowScan selon le barème en vigueur.{" "}
        <Link href="/derm/portefeuille" className="font-bold text-organic-accent-700">Ouvrir mon portefeuille</Link>
      </p>

      {isLoading ? (
        <div className="rounded-card bg-organic-surface p-organic-6 text-[14px] text-organic-neutral-700">Chargement…</div>
      ) : isError ? (
        <div className="rounded-card bg-organic-surface p-organic-6 text-[14px]">Paiements indisponibles pour le moment.</div>
      ) : !data?.items.length ? (
        <div className="flex flex-col gap-1 rounded-card bg-organic-surface p-organic-8">
          <span className="font-heading text-[17px]">Aucun paiement pour l'instant</span>
          <p className="m-0 text-[13px] opacity-80">Les consultations en ligne payées par vos patients apparaîtront ici.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-organic-2">
          {data.items.map((p) => (
            <div key={p.id} className="grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-card bg-organic-surface px-organic-4 py-3.5 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr_1.3fr_auto]" data-testid={`payment-${p.id}`}>
              <span className="col-span-2 flex min-w-0 flex-col md:col-span-1">
                <span className="truncate text-[14px] font-bold">{p.name}</span>
                <span className="text-[12px] text-organic-neutral-700">{p.ref} · {date(p.at)}</span>
              </span>
              <span className="flex flex-col"><span className="text-[11px] text-organic-neutral-700">Payé patient</span><span className="text-[14px] font-bold">{formatF(p.price)}</span></span>
              <span className="flex flex-col"><span className="text-[11px] text-organic-neutral-700">Votre part ({data.sharePct} %)</span><span className="text-[14px] font-bold">{p.payment === "refunded" ? "—" : formatF(p.dermShare)}</span></span>
              <span className="flex flex-col"><span className="text-[11px] text-organic-neutral-700">Versement</span><span className="text-[13px] font-semibold">{p.payout ? PAYOUT[p.payout] : "—"}</span></span>
              <span><span className={`inline-flex rounded-pill px-2.5 py-1 text-[12px] font-semibold ${BADGE[p.payment].tag}`}>{BADGE[p.payment].label}</span></span>
            </div>
          ))}
        </div>
      )}
    </ProLayout>
  );
}
