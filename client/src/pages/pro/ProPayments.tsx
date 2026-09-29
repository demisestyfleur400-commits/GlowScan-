import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProAccount } from "@/hooks/use-pro";
import { useToast } from "@/hooks/use-toast";
import { ProLayout } from "@/components/ProLayout";
import { OPERATORS, formatCmPhone, opOf } from "@shared/phone";
import { PRO_SUBSCRIPTION_FCFA } from "@shared/premium";

// ════════════════════════════════════════════════════════════════════════
// Portefeuille du médecin (étape 3) — maquette « Derm Encaissement » (rôle
// dermatologue). Disponible, bloqué (en attente de réponse), comptes Mobile
// Money, retrait, virement automatique du vendredi, mouvements. Les montants
// viennent du registre serveur (wallet_ledger) ; parts : shared/splits.ts.
// ════════════════════════════════════════════════════════════════════════

type Move = { id: number; type: string; share_pct: number | null; amount_fcfa: number; status: string; created_at: string; patient_first: string | null };
type Account = { id: number; operator: "mtn" | "orange"; msisdn: string; is_primary: boolean };
type Wallet = { available: number; held: number; moves: Move[]; accounts: Account[]; autoWithdraw: boolean; shares: { consultation: { pro: number } } };

const F = (n: number) => `${Math.abs(n).toLocaleString("fr-FR")} FCFA`;

function moveLabel(m: Move): { label: string; sub: string } {
  const d = new Date(m.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  switch (m.type) {
    case "consultation":
      return {
        label: `Consultation B2C${m.patient_first ? ` · ${m.patient_first}` : ""}`,
        sub: m.status === "escrow" ? "Bloqué jusqu'à votre réponse" : m.status === "refunded" ? "Remboursée au patient (24 h sans réponse)" : `GlowScan patient · ${m.share_pct ?? ""} %`,
      };
    case "withdrawal": return { label: "Retrait Mobile Money", sub: m.status === "pending" ? "En cours de virement" : d };
    case "subscription": return { label: "Abonnement GlowScan Derm", sub: "Payé par vos gains" };
    default: return { label: m.type, sub: d };
  }
}

export default function ProPayments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: pro } = useProAccount();
  const { data: w, isLoading, isError } = useQuery<Wallet>({ queryKey: ["/api/pro/wallet"], retry: false });
  const [acct, setAcct] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/pro/wallet"] });
  const post = async (url: string, body?: unknown, method = "POST") => {
    const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.message || "Action impossible");
    return d;
  };
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); refresh(); if (ok) toast({ title: ok }); }
    catch (e: any) { toast({ title: "Action impossible", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const selected = w?.accounts.find((a) => a.id === acct) ?? w?.accounts.find((a) => a.is_primary) ?? null;
  const amountNum = amount ? Number(amount.replace(/\D/g, "")) : (w?.available ?? 0);
  const thisMonthSub = w?.moves.find((m) => m.type === "subscription" && new Date(m.created_at).getMonth() === new Date().getMonth());
  const name = (pro as any)?.account?.fullName as string | undefined;

  return (
    <ProLayout title="Portefeuille" back="/derm/paiements">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 bg-organic-bg p-4 font-body text-organic-text">
        <span className="text-[12px] text-organic-neutral-700">
          {name ? `${/^(dr|pr)\.?\s/i.test(name) ? name : `Dr ${name}`} · ` : ""}consultations B2C ({w?.shares.consultation.pro ?? 80} %)
        </span>

        {isLoading ? <span className="text-[13px] text-organic-neutral-700">Chargement…</span>
          : isError || !w ? <div className="rounded-lg bg-organic-surface p-4 text-[14px]">Portefeuille indisponible pour le moment.</div>
          : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1 rounded-lg bg-organic-accent-2-100 p-4 text-organic-accent-2-900">
                <span className="text-[12px]">Disponible</span>
                <span className="whitespace-nowrap font-heading text-[21px]">{F(w.available)}</span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-organic-surface p-4">
                <span className="text-[12px] text-organic-neutral-700">Bloqué (consultations en cours)</span>
                <span className="whitespace-nowrap font-heading text-[21px]">{F(w.held)}</span>
              </div>
            </div>

            {thisMonthSub && (
              <div className="flex items-center justify-between rounded-lg bg-organic-surface p-4 text-[13px]">
                <span className="flex flex-col"><b>Abonnement de {new Date(thisMonthSub.created_at).toLocaleDateString("fr-FR", { month: "long" })}</b><span className="text-organic-neutral-700">Payé par vos gains</span></span>
                <span className="font-bold">{F(PRO_SUBSCRIPTION_FCFA)}</span>
              </div>
            )}

            {/* Comptes de versement */}
            <div className="flex flex-col gap-2 rounded-lg bg-organic-surface p-4">
              <span className="text-[13px] font-bold">Recevoir sur</span>
              {w.accounts.length === 0 && <span className="text-[12px] text-organic-neutral-700">Ajoutez votre numéro Mobile Money.</span>}
              {w.accounts.map((a) => (
                <button key={a.id} type="button" onClick={() => setAcct(a.id)}
                  className="flex items-center gap-3 rounded-pill border-2 bg-organic-bg px-3.5 py-2.5 text-left text-organic-text"
                  style={{ borderColor: selected?.id === a.id ? "var(--color-accent)" : "transparent" }}>
                  <span className="rounded-pill px-2.5 py-[3px] text-[11px] font-bold" style={{ background: OPERATORS[a.operator].bg, color: OPERATORS[a.operator].fg }}>{OPERATORS[a.operator].name}</span>
                  <span className="flex-1 text-[14px]">+237 {formatCmPhone(a.msisdn)}</span>
                  {a.is_primary
                    ? <span className="text-[11px] text-organic-neutral-700">principal</span>
                    : <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); run(() => post(`/api/pro/payout-accounts/${a.id}/primary`)); }} className="text-[11px] font-bold text-organic-accent">définir principal</span>}
                </button>
              ))}
              <div className="flex gap-2">
                <span className="relative flex-1">
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} inputMode="tel" placeholder="Autre numéro MTN ou Orange"
                    className="h-10 w-full rounded-pill border border-organic-divider bg-organic-bg px-3.5 pr-24 text-[14px] focus-visible:border-organic-accent focus-visible:outline-none" />
                  {opOf(newPhone) && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill px-2 py-[2px] text-[10px] font-bold" style={{ background: OPERATORS[opOf(newPhone)!].bg, color: OPERATORS[opOf(newPhone)!].fg }}>{OPERATORS[opOf(newPhone)!].name}</span>}
                </span>
                <button type="button" disabled={busy || !opOf(newPhone)} onClick={() => run(async () => { await post("/api/pro/payout-accounts", { phone: newPhone }); setNewPhone(""); }, "Compte ajouté")}
                  className="rounded-pill border border-organic-divider bg-transparent px-4 text-[13px] font-bold disabled:opacity-45">Ajouter</button>
              </div>
            </div>

            {/* Retrait */}
            <div className="flex flex-col gap-2 rounded-lg bg-organic-surface p-4">
              <label className="flex flex-col gap-1.5 text-[13px] font-bold">Montant
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder={String(w.available)}
                  className="h-11 rounded-pill border border-organic-divider bg-organic-bg px-3.5 text-[15px] font-normal focus-visible:border-organic-accent focus-visible:outline-none" />
              </label>
              <button type="button" disabled={busy || !selected || amountNum < 500 || amountNum > w.available}
                onClick={() => run(async () => { await post("/api/pro/withdrawals", { amount: amountNum, accountId: selected?.id }); setAmount(""); }, "Retrait demandé : virement en cours")}
                className="rounded-pill border-0 bg-organic-accent p-3.5 text-[15px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600 disabled:opacity-45">
                Retirer maintenant
              </button>
              <span className="text-[11px] text-organic-neutral-700">Le virement Mobile Money est effectué par GlowScan et confirmé par l'ID de transaction de l'opérateur.</span>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-organic-surface p-4">
              <span className="flex flex-1 flex-col">
                <span className="text-[14px] font-semibold">Virement automatique chaque vendredi</span>
                <span className="text-[12px] text-organic-neutral-700">Tout le disponible part sur votre compte principal</span>
              </span>
              <button type="button" role="switch" aria-checked={w.autoWithdraw} aria-label="Virement automatique chaque vendredi" disabled={busy}
                onClick={() => run(() => post("/api/pro/wallet/settings", { autoWithdraw: !w.autoWithdraw }, "PUT"))}
                className="flex h-7 w-12 flex-none items-center rounded-pill border-0 p-1"
                style={{ justifyContent: w.autoWithdraw ? "flex-end" : "flex-start", background: w.autoWithdraw ? "var(--color-accent-2-600)" : "var(--color-neutral-400)" }}>
                <span className="h-5 w-5 rounded-pill bg-organic-neutral-100" />
              </button>
            </div>

            {/* Mouvements */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">Mouvements</span>
              {w.moves.length === 0 && <span className="text-[12px] text-organic-neutral-700">Aucun mouvement pour l'instant.</span>}
              {w.moves.map((m) => {
                const { label, sub } = moveLabel(m);
                const color = m.status === "escrow" || m.status === "refunded" ? "var(--color-neutral-700)" : m.amount_fcfa > 0 ? "var(--color-accent-2-700)" : "var(--color-text)";
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-organic-surface px-4 py-3">
                    <span className="flex flex-col"><span className="text-[14px] font-semibold">{label}</span><span className="text-[12px] text-organic-neutral-700">{sub}</span></span>
                    <span className="whitespace-nowrap text-[14px] font-bold" style={{ color, textDecoration: m.status === "refunded" ? "line-through" : undefined }}>
                      {m.amount_fcfa > 0 ? "+ " : "− "}{F(m.amount_fcfa)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ProLayout>
  );
}
