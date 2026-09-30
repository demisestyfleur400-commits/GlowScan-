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
import { SPLITS, splitConsultation, splitRelay, splitPeer } from "@shared/splits";
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

// ── Avis de télé-expertise (relais) : 60 % dermatologue, 20 % relais, 20 % GlowScan ──

/**
 * Paiement VÉRIFIÉ d'un cas relais (patiente → CSI par Mobile Money) : les trois
 * parts sont bloquées jusqu'à la réponse du dermatologue. Les cas payés par un
 * programme ne passent pas ici : ils seront réglés sur facture (étape 6).
 */
export async function recordRelayPayment(caseId: number, operatorTxnId: string): Promise<void> {
  const txn = String(operatorTxnId || "").trim();
  if (!isOperatorTxnId(txn)) throw new WalletError("TXN_REQUIRED", "ID de transaction de l'opérateur requis");
  const c: any = rows(await db.execute(sql`SELECT id, relay_id, derm_id, price_fcfa FROM relay_cases WHERE id = ${caseId}`))[0];
  if (!c) throw new WalletError("NOT_FOUND", "Cas introuvable");
  if (!c.derm_id) throw new WalletError("BAD_STATE", "Aucun dermatologue référent pour ce cas");
  const gross = Number(c.price_fcfa) || 0;
  const split = splitRelay(gross);
  const source = `relay_case:${caseId}`;
  const used: any = rows(await db.execute(sql`
    SELECT source_id FROM platform_ledger WHERE operator_txn_id = ${txn} AND type <> 'withdrawal' LIMIT 1`))[0];
  if (used && used.source_id !== source) throw new WalletError("TXN_ALREADY_USED", `Cet ID de transaction a déjà servi (${used.source_id})`);

  await db.execute(sql`
    INSERT INTO platform_ledger (type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES ('relay_review', ${gross}, ${SPLITS.relay.platform}, ${split.platform}, ${source}, ${txn}, 'escrow')
    ON CONFLICT (type, source_id) DO NOTHING`);
  await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES (${Number(c.derm_id)}, 'relay_review', ${gross}, ${SPLITS.relay.derm}, ${split.derm}, ${source}, ${txn}, 'escrow'),
           (${Number(c.relay_id)}, 'relay_review', ${gross}, ${SPLITS.relay.relay}, ${split.relay}, ${source}, ${txn}, 'escrow')
    ON CONFLICT (pro_id, type, source_id) DO NOTHING`);
  await stampRelayFx(caseId);
}

/**
 * Avis payé en espèces par la patiente et débité du crédit prépayé du relais
 * (étape 12) : l'argent est déjà sur le compte GlowScan (recharge vérifiée par
 * son ID opérateur, relay_credit_ledger). Même séquestre et même 60/20/20.
 */
export async function recordRelayCreditPayment(caseId: number): Promise<void> {
  const c: any = rows(await db.execute(sql`SELECT id, relay_id, derm_id, price_fcfa FROM relay_cases WHERE id = ${caseId}`))[0];
  if (!c) throw new WalletError("NOT_FOUND", "Cas introuvable");
  if (!c.derm_id) throw new WalletError("BAD_STATE", "Aucun dermatologue référent pour ce cas");
  const gross = Number(c.price_fcfa) || 0;
  const split = splitRelay(gross);
  const source = `relay_case:${caseId}`;
  await db.execute(sql`
    INSERT INTO platform_ledger (type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES ('relay_review', ${gross}, ${SPLITS.relay.platform}, ${split.platform}, ${source}, NULL, 'escrow')
    ON CONFLICT (type, source_id) DO NOTHING`);
  await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES (${Number(c.derm_id)}, 'relay_review', ${gross}, ${SPLITS.relay.derm}, ${split.derm}, ${source}, NULL, 'escrow'),
           (${Number(c.relay_id)}, 'relay_review', ${gross}, ${SPLITS.relay.relay}, ${split.relay}, ${source}, NULL, 'escrow')
    ON CONFLICT (pro_id, type, source_id) DO NOTHING`);
  await stampRelayFx(caseId);
}

/** Recopie le taux figé du cas sur ses lignes du grand livre. */
async function stampRelayFx(caseId: number) {
  const source = `relay_case:${caseId}`;
  await db.execute(sql`UPDATE wallet_ledger w SET fx_currency = c.fx_currency, fx_rate = c.fx_rate FROM relay_cases c WHERE c.id = ${caseId} AND w.type = 'relay_review' AND w.source_id = ${source}`);
  await db.execute(sql`UPDATE platform_ledger l SET fx_currency = c.fx_currency, fx_rate = c.fx_rate FROM relay_cases c WHERE c.id = ${caseId} AND l.type = 'relay_review' AND l.source_id = ${source}`);
}

/** Réponse du dermatologue : les parts deviennent disponibles. */
export async function releaseRelayCase(caseId: number): Promise<void> {
  const source = `relay_case:${caseId}`;
  await db.execute(sql`UPDATE wallet_ledger SET status = 'available', updated_at = NOW() WHERE type = 'relay_review' AND source_id = ${source} AND status = 'escrow'`);
  await db.execute(sql`UPDATE platform_ledger SET status = 'available', updated_at = NOW() WHERE type = 'relay_review' AND source_id = ${source} AND status = 'escrow'`);
}

/** Délai dépassé sans réponse : remboursement décidé, aucune part acquise. */
export async function refundRelayCase(caseId: number): Promise<void> {
  const source = `relay_case:${caseId}`;
  await db.execute(sql`UPDATE wallet_ledger SET status = 'refunded', updated_at = NOW() WHERE type = 'relay_review' AND source_id = ${source} AND status = 'escrow'`);
  await db.execute(sql`UPDATE platform_ledger SET status = 'refunded', updated_at = NOW() WHERE type = 'relay_review' AND source_id = ${source} AND status = 'escrow'`);
}

// ── Avis entre confrères : 80 % au confrère, 20 % à GlowScan ─────────────
// Payé depuis le portefeuille du demandeur (argent déjà vérifié) : réservé à
// l'envoi, débité à la réponse, rendu si le délai est dépassé. Portefeuille
// insuffisant : Mobile Money, crédité seulement après vérification de l'ID.

/** Réserve le prix sur le portefeuille du demandeur. Refus si le disponible est insuffisant. */
export async function reservePeerReview(reviewId: number, requesterId: number, priceFcfa: number): Promise<void> {
  const { available } = await proBalances(requesterId);
  if (available < priceFcfa) throw new WalletError("INSUFFICIENT", `Solde disponible insuffisant (${available} FCFA)`);
  await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, gross_fcfa, share_pct, amount_fcfa, source_id, status)
    VALUES (${requesterId}, 'peer_review', ${priceFcfa}, NULL, ${-priceFcfa}, ${`peer_review:${reviewId}:request`}, 'reserved')
    ON CONFLICT (pro_id, type, source_id) DO NOTHING`);
}

/** Paiement Mobile Money VÉRIFIÉ d'un avis confrère (portefeuille insuffisant). */
export async function recordPeerMomoPayment(reviewId: number, operatorTxnId: string): Promise<void> {
  const txn = String(operatorTxnId || "").trim();
  if (!isOperatorTxnId(txn)) throw new WalletError("TXN_REQUIRED", "ID de transaction de l'opérateur requis");
  const r: any = rows(await db.execute(sql`SELECT id, price_fcfa FROM peer_reviews WHERE id = ${reviewId}`))[0];
  if (!r) throw new WalletError("NOT_FOUND", "Avis introuvable");
  const used: any = rows(await db.execute(sql`
    SELECT source_id FROM platform_ledger WHERE operator_txn_id = ${txn} AND type <> 'withdrawal' LIMIT 1`))[0];
  const source = `peer_review:${reviewId}`;
  if (used && used.source_id !== source) throw new WalletError("TXN_ALREADY_USED", `Cet ID de transaction a déjà servi (${used.source_id})`);
  const gross = Number(r.price_fcfa) || 0;
  // Argent reçu, bloqué jusqu'à la réponse : la part GlowScan porte l'ID de transaction.
  await db.execute(sql`
    INSERT INTO platform_ledger (type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
    VALUES ('peer_review', ${gross}, ${SPLITS.peer.platform}, ${splitPeer(gross).platform}, ${source}, ${txn}, 'escrow')
    ON CONFLICT (type, source_id) DO NOTHING`);
}

/** Avis rendu : débit définitif du demandeur, 80 % au confrère, 20 % à GlowScan. */
export async function settlePeerReview(reviewId: number, requesterId: number, answererId: number): Promise<{ peer: number }> {
  const r: any = rows(await db.execute(sql`SELECT price_fcfa, payment_status FROM peer_reviews WHERE id = ${reviewId}`))[0];
  if (!r) throw new WalletError("NOT_FOUND", "Avis introuvable");
  const gross = Number(r.price_fcfa) || 0;
  const split = splitPeer(gross);
  const source = `peer_review:${reviewId}`;
  if (r.payment_status === "reserved") {
    await db.execute(sql`UPDATE wallet_ledger SET status = 'settled', updated_at = NOW()
      WHERE pro_id = ${requesterId} AND type = 'peer_review' AND source_id = ${`${source}:request`} AND status = 'reserved'`);
    await db.execute(sql`
      INSERT INTO platform_ledger (type, gross_fcfa, share_pct, amount_fcfa, source_id, status)
      VALUES ('peer_review', ${gross}, ${SPLITS.peer.platform}, ${split.platform}, ${source}, 'available')
      ON CONFLICT (type, source_id) DO NOTHING`);
  } else if (r.payment_status === "paid") {
    await db.execute(sql`UPDATE platform_ledger SET status = 'available', updated_at = NOW()
      WHERE type = 'peer_review' AND source_id = ${source} AND status = 'escrow'`);
  } else {
    throw new WalletError("BAD_STATE", "Avis non payé");
  }
  await db.execute(sql`
    INSERT INTO wallet_ledger (pro_id, type, gross_fcfa, share_pct, amount_fcfa, source_id, status)
    VALUES (${answererId}, 'peer_review', ${gross}, ${SPLITS.peer.peer}, ${split.peer}, ${source}, 'available')
    ON CONFLICT (pro_id, type, source_id) DO NOTHING`);
  return { peer: split.peer };
}

/** Délai dépassé : la réservation est rendue (ou le Mobile Money est à rembourser). */
export async function refundPeerReview(reviewId: number, requesterId: number): Promise<void> {
  const source = `peer_review:${reviewId}`;
  await db.execute(sql`UPDATE wallet_ledger SET status = 'refunded', updated_at = NOW()
    WHERE pro_id = ${requesterId} AND type = 'peer_review' AND source_id = ${`${source}:request`} AND status = 'reserved'`);
  await db.execute(sql`UPDATE platform_ledger SET status = 'refunded', updated_at = NOW()
    WHERE type = 'peer_review' AND source_id = ${source} AND status = 'escrow'`);
}

// ── Soldes et mouvements ──────────────────────────────────────────────────

export async function proBalances(proId: number): Promise<{ available: number; held: number }> {
  const r: any = rows(await db.execute(sql`
    SELECT
      COALESCE(SUM(amount_fcfa) FILTER (WHERE status = 'available' OR (amount_fcfa < 0 AND status IN ('pending', 'paid_out', 'reserved', 'settled'))), 0)::int AS available,
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
