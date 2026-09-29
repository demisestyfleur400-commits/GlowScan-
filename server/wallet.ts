// ════════════════════════════════════════════════════════════════════════
// Registres comptables (migration 0017). SEUL endroit qui écrit dans
// wallet_ledger / platform_ledger / withdrawals.
//
//  • Paiement vérifié  → part médecin + part GlowScan en « escrow » (bloqué).
//  • 1re réponse       → « available ».
//  • Remboursement     → « refunded ».
//  • Retrait           → ligne négative « pending », puis « paid_out » avec
//                        l'ID de transaction du virement (saisi par l'admin
//                        tant qu'aucune API de décaissement n'est branchée).
// Les parts viennent UNIQUEMENT de shared/splits.ts. Aucun crédit sans ID de
// transaction de l'opérateur ; un même ID ne crédite qu'une fois.
// ════════════════════════════════════════════════════════════════════════
import { sql } from "drizzle-orm";
import { db } from "./db";
import { SPLITS, splitConsultation } from "@shared/splits";
import { normalizeCmPhone, opOf } from "@shared/phone";

const rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];

/** Format accepté pour un ID de transaction d'opérateur. */
export const isOperatorTxnId = (v: unknown) => /^[A-Za-z0-9._-]{6,60}$/.test(String(v ?? "").trim());

export class WalletError extends Error {
  constructor(public code: "TXN_REQUIRED" | "TXN_ALREADY_USED" | "INSUFFICIENT" | "NO_ACCOUNT" | "NOT_FOUND" | "BAD_STATE", message: string) { super(message); }
}

// ── Consultations B2C ─────────────────────────────────────────────────────

/** Paiement VÉRIFIÉ d'une consultation : parts bloquées jusqu'à la réponse du médecin. */
export async function recordConsultationPayment(consultationId: number, operatorTxnId: string): Promise<void> {
  const txn = String(operatorTxnId || "").trim();
  if (!isOperatorTxnId(txn)) throw new WalletError("TXN_REQUIRED", "ID de transaction de l'opérateur requis");
  const c: any = rows(await db.execute(sql`SELECT id, pro_account_id, price_fcfa FROM consultations WHERE id = ${consultationId}`))[0];
  if (!c) throw new WalletError("NOT_FOUND", "Consultation introuvable");
  const gross = Number(c.price_fcfa) || 0;
  const split = splitConsultation(gross);
  const source = `consultation:${consultationId}`;

  // Même ID de transaction déjà utilisé pour un autre paiement : refus.
  const used: any = rows(await db.execute(sql`
    SELECT source_id FROM platform_ledger WHERE operator_txn_id = ${txn} AND type <> 'withdrawal' LIMIT 1`))[0];
  if (used && used.source_id !== source) throw new WalletError("TXN_ALREADY_USED", `Cet ID de transaction a déjà servi (${used.source_id})`);

  await db.execute(sql`
    INSERT INTO platform_ledger (type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES ('consultation', ${gross}, ${SPLITS.consultation.platform}, ${split.platform}, ${source}, ${txn}, 'escrow')
    ON CONFLICT (type, source_id) DO NOTHING`);
  await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES (${Number(c.pro_account_id)}, 'consultation', ${gross}, ${SPLITS.consultation.pro}, ${split.pro}, ${source}, ${txn}, 'escrow')
    ON CONFLICT (pro_id, type, source_id) DO NOTHING`);
}

/** Première réponse du médecin : les parts deviennent disponibles. */
export async function releaseConsultation(consultationId: number): Promise<void> {
  const source = `consultation:${consultationId}`;
  await db.execute(sql`UPDATE wallet_ledger SET status = 'available', updated_at = NOW() WHERE type = 'consultation' AND source_id = ${source} AND status = 'escrow'`);
  await db.execute(sql`UPDATE platform_ledger SET status = 'available', updated_at = NOW() WHERE type = 'consultation' AND source_id = ${source} AND status = 'escrow'`);
}

/** Remboursement décidé (24 h sans réponse) : aucune des deux parts n'est acquise. */
export async function refundConsultation(consultationId: number): Promise<void> {
  const source = `consultation:${consultationId}`;
  await db.execute(sql`UPDATE wallet_ledger SET status = 'refunded', updated_at = NOW() WHERE type = 'consultation' AND source_id = ${source} AND status = 'escrow'`);
  await db.execute(sql`UPDATE platform_ledger SET status = 'refunded', updated_at = NOW() WHERE type = 'consultation' AND source_id = ${source} AND status = 'escrow'`);
}

// ── Soldes et mouvements ──────────────────────────────────────────────────

export async function proBalances(proId: number): Promise<{ available: number; held: number }> {
  const r: any = rows(await db.execute(sql`
    SELECT
      COALESCE(SUM(amount_fcfa) FILTER (WHERE status = 'available' OR (amount_fcfa < 0 AND status IN ('pending', 'paid_out'))), 0)::int AS available,
      COALESCE(SUM(amount_fcfa) FILTER (WHERE status = 'escrow'), 0)::int AS held
    FROM wallet_ledger WHERE pro_id = ${proId}`))[0] || {};
  return { available: Number(r.available) || 0, held: Number(r.held) || 0 };
}

export async function platformBalances(): Promise<{ available: number; held: number }> {
  const r: any = rows(await db.execute(sql`
    SELECT
      COALESCE(SUM(amount_fcfa) FILTER (WHERE status = 'available' OR (amount_fcfa < 0 AND status IN ('pending', 'paid_out'))), 0)::int AS available,
      COALESCE(SUM(amount_fcfa) FILTER (WHERE status = 'escrow'), 0)::int AS held
    FROM platform_ledger`))[0] || {};
  return { available: Number(r.available) || 0, held: Number(r.held) || 0 };
}

export async function proMoves(proId: number, limit = 40) {
  return rows(await db.execute(sql`
    SELECT w.id, w.type, w.gross_fcfa, w.share_pct, w.amount_fcfa, w.source_id, w.status, w.created_at,
           u.first_name AS patient_first
    FROM wallet_ledger w
    LEFT JOIN consultations c ON w.type = 'consultation' AND c.id = NULLIF(split_part(w.source_id, ':', 2), '')::int
    LEFT JOIN users u ON u.id = c.user_id
    WHERE w.pro_id = ${proId}
    ORDER BY w.created_at DESC LIMIT ${limit}`));
}

// ── Comptes de versement ──────────────────────────────────────────────────

export async function payoutAccounts(proId: number) {
  return rows(await db.execute(sql`SELECT id, operator, msisdn, is_primary FROM payout_accounts WHERE pro_id = ${proId} ORDER BY is_primary DESC, created_at`));
}

export async function addPayoutAccount(proId: number, phoneInput: string) {
  const msisdn = normalizeCmPhone(phoneInput);
  const operator = opOf(phoneInput);
  if (!msisdn || !operator) throw new WalletError("NO_ACCOUNT", "Numéro MTN ou Orange à 9 chiffres requis");
  const hasPrimary = rows(await db.execute(sql`SELECT 1 FROM payout_accounts WHERE pro_id = ${proId} AND is_primary LIMIT 1`)).length > 0;
  await db.execute(sql`
    INSERT INTO payout_accounts (pro_id, operator, msisdn, is_primary) VALUES (${proId}, ${operator}, ${msisdn}, ${!hasPrimary})
    ON CONFLICT (pro_id, msisdn) DO NOTHING`);
}

export async function setPrimaryAccount(proId: number, accountId: number) {
  const r = rows(await db.execute(sql`SELECT id FROM payout_accounts WHERE id = ${accountId} AND pro_id = ${proId}`));
  if (!r.length) throw new WalletError("NOT_FOUND", "Compte introuvable");
  await db.execute(sql`UPDATE payout_accounts SET is_primary = (id = ${accountId}) WHERE pro_id = ${proId}`);
}

// ── Retraits ──────────────────────────────────────────────────────────────

/** Demande de retrait : la somme est retirée du disponible tout de suite (ligne « pending »). */
export async function requestWithdrawal(proId: number, amountFcfa: number, accountId: number | null, by: "manual" | "auto" = "manual") {
  const amount = Math.floor(Number(amountFcfa) || 0);
  const { available } = await proBalances(proId);
  if (amount < 500 || amount > available) throw new WalletError("INSUFFICIENT", `Montant entre 500 et ${available} FCFA`);
  const acc: any = rows(await db.execute(accountId
    ? sql`SELECT operator, msisdn FROM payout_accounts WHERE id = ${accountId} AND pro_id = ${proId}`
    : sql`SELECT operator, msisdn FROM payout_accounts WHERE pro_id = ${proId} AND is_primary LIMIT 1`))[0];
  if (!acc) throw new WalletError("NO_ACCOUNT", "Ajoutez un compte Mobile Money");
  const w: any = rows(await db.execute(sql`
    INSERT INTO withdrawals (owner_id, operator, msisdn, amount_fcfa, requested_by)
    VALUES (${`pro:${proId}`}, ${acc.operator}, ${acc.msisdn}, ${amount}, ${by}) RETURNING id`))[0];
  await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, amount_fcfa, source_id, status)
    VALUES (${proId}, 'withdrawal', ${-amount}, ${`withdrawal:${w.id}`}, 'pending')`);
  return { id: Number(w.id), amount, operator: acc.operator, msisdn: acc.msisdn };
}

/** Retrait de la part GlowScan vers un numéro Mobile Money. */
export async function requestPlatformWithdrawal(amountFcfa: number, phoneInput: string) {
  const amount = Math.floor(Number(amountFcfa) || 0);
  const msisdn = normalizeCmPhone(phoneInput); const operator = opOf(phoneInput);
  if (!msisdn || !operator) throw new WalletError("NO_ACCOUNT", "Numéro MTN ou Orange à 9 chiffres requis");
  const { available } = await platformBalances();
  if (amount < 500 || amount > available) throw new WalletError("INSUFFICIENT", `Montant entre 500 et ${available} FCFA`);
  const w: any = rows(await db.execute(sql`
    INSERT INTO withdrawals (owner_id, operator, msisdn, amount_fcfa) VALUES ('platform', ${operator}, ${msisdn}, ${amount}) RETURNING id`))[0];
  await db.execute(sql`
    INSERT INTO platform_ledger (type, amount_fcfa, source_id, status) VALUES ('withdrawal', ${-amount}, ${`withdrawal:${w.id}`}, 'pending')`);
  return { id: Number(w.id) };
}

/** Virement effectué (admin) : exige l'ID de transaction de l'opérateur. */
export async function markWithdrawalPaid(withdrawalId: number, operatorRef: string) {
  const ref = String(operatorRef || "").trim();
  if (!isOperatorTxnId(ref)) throw new WalletError("TXN_REQUIRED", "ID de transaction de l'opérateur requis");
  const w: any = rows(await db.execute(sql`
    UPDATE withdrawals SET status = 'paid_out', operator_ref = ${ref}, paid_at = NOW()
    WHERE id = ${withdrawalId} AND status = 'pending' RETURNING owner_id`))[0];
  if (!w) throw new WalletError("BAD_STATE", "Retrait introuvable ou déjà traité");
  const source = `withdrawal:${withdrawalId}`;
  if (String(w.owner_id).startsWith("pro:")) {
    await db.execute(sql`UPDATE wallet_ledger SET status = 'paid_out', operator_txn_id = ${ref}, updated_at = NOW() WHERE type = 'withdrawal' AND source_id = ${source}`);
  } else {
    await db.execute(sql`UPDATE platform_ledger SET status = 'paid_out', operator_txn_id = ${ref}, updated_at = NOW() WHERE type = 'withdrawal' AND source_id = ${source}`);
  }
}

/** Annulation d'un retrait non versé : la somme revient au disponible. */
export async function cancelWithdrawal(withdrawalId: number) {
  const w: any = rows(await db.execute(sql`
    UPDATE withdrawals SET status = 'cancelled' WHERE id = ${withdrawalId} AND status = 'pending' RETURNING owner_id`))[0];
  if (!w) throw new WalletError("BAD_STATE", "Retrait introuvable ou déjà traité");
  const source = `withdrawal:${withdrawalId}`;
  await db.execute(sql`DELETE FROM wallet_ledger WHERE type = 'withdrawal' AND source_id = ${source} AND status = 'pending'`);
  await db.execute(sql`DELETE FROM platform_ledger WHERE type = 'withdrawal' AND source_id = ${source} AND status = 'pending'`);
}

// ── Abonnement payé par les gains ─────────────────────────────────────────

/** Prélève l'abonnement mensuel sur le disponible s'il suffit. Renvoie true si prélevé. */
export async function chargeSubscriptionFromEarnings(proId: number, priceFcfa: number, period: string): Promise<boolean> {
  const { available } = await proBalances(proId);
  if (available < priceFcfa) return false;
  const source = `subscription:${period}`;
  const inserted = rows(await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, amount_fcfa, source_id, status)
    VALUES (${proId}, 'subscription', ${-priceFcfa}, ${source}, 'paid_out')
    ON CONFLICT (pro_id, type, source_id) DO NOTHING RETURNING id`));
  if (!inserted.length) return false; // déjà prélevé pour ce mois
  await db.execute(sql`
    INSERT INTO platform_ledger (type, gross_fcfa, amount_fcfa, source_id, status)
    VALUES ('subscription', ${priceFcfa}, ${priceFcfa}, ${`${source}:pro:${proId}`}, 'available')
    ON CONFLICT (type, source_id) DO NOTHING`);
  return true;
}
