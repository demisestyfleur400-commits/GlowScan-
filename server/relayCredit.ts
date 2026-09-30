import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount } from "./proRoutes";
import { providerFor } from "./payments/provider";
import { GLOWSCAN_MOMO } from "@shared/splits";
import { currencyOf, toLocal, toXaf, momoAvailable, type Currency } from "@shared/currency";

// ════════════════════════════════════════════════════════════════════════
// Crédit prépayé du relais (étape 12, écran R6) et taux de change.
// Recharge par Mobile Money : en attente jusqu'à la vérification de l'ID de
// transaction par GlowScan (aucun crédit sans ID vérifié). Un avis payé en
// espèces est débité du crédit ; délai dépassé → crédit remboursé.
// Le solde est la somme des lignes confirmées du grand livre.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
export class CreditError extends Error { constructor(public code: string, message: string) { super(message); } }

export async function rateFor(currency: Currency): Promise<number | null> {
  const r = Rows(await db.execute(sql`SELECT per_xaf FROM fx_rates WHERE currency = ${currency}`))[0];
  const n = r ? Number(r.per_xaf) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
/** Pays, devise et taux du relais (le taux est null si GlowScan ne l'a pas encore saisi). */
export async function relayMoney(proId: number) {
  const r = Rows(await db.execute(sql`
    SELECT COALESCE(r.country, p.country, 'Cameroun') AS country FROM pro_accounts p LEFT JOIN relays r ON r.pro_account_id = p.id WHERE p.id = ${proId}`))[0];
  const country = r?.country || "Cameroun";
  const currency = currencyOf(country);
  return { country, currency, rate: await rateFor(currency) };
}
export async function creditBalance(proId: number): Promise<number> {
  const r = Rows(await db.execute(sql`SELECT COALESCE(SUM(amount_fcfa), 0)::int AS b FROM relay_credit_ledger WHERE relay_id = ${proId} AND status = 'confirmed'`))[0];
  return Number(r?.b) || 0;
}

/** Débite le crédit pour un avis payé en espèces. Refus si le solde est insuffisant. */
export async function debitCreditForCase(proId: number, caseId: number, priceXaf: number, fx: { currency: Currency; rate: number }) {
  // Verrou par relais dans une transaction : deux envois simultanés ne peuvent pas dépasser le solde.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${9_100_000 + proId})`);
    const b = Number(Rows(await tx.execute(sql`SELECT COALESCE(SUM(amount_fcfa), 0)::int AS b FROM relay_credit_ledger WHERE relay_id = ${proId} AND status = 'confirmed'`))[0]?.b) || 0;
    if (b < priceXaf) throw new CreditError("INSUFFICIENT_CREDIT", "Crédit insuffisant : rechargez votre crédit ou faites payer la patiente par Mobile Money.");
    await tx.execute(sql`
      INSERT INTO relay_credit_ledger (relay_id, kind, amount_fcfa, amount_local, fx_currency, fx_rate, case_id, status, confirmed_at)
      VALUES (${proId}, 'debit', ${-priceXaf}, ${-toLocal(priceXaf, fx.rate, fx.currency)}, ${fx.currency}, ${fx.rate}, ${caseId}, 'confirmed', NOW())`);
  });
}
/** Délai dépassé : le montant débité revient sur le crédit (une seule fois par cas). */
export async function refundCreditForCase(caseId: number): Promise<boolean> {
  const d = Rows(await db.execute(sql`SELECT relay_id, amount_fcfa, amount_local, fx_currency, fx_rate FROM relay_credit_ledger WHERE case_id = ${caseId} AND kind = 'debit' AND status = 'confirmed'`))[0];
  if (!d) return false;
  const r = Rows(await db.execute(sql`
    INSERT INTO relay_credit_ledger (relay_id, kind, amount_fcfa, amount_local, fx_currency, fx_rate, case_id, status, confirmed_at)
    VALUES (${d.relay_id}, 'refund', ${-Number(d.amount_fcfa)}, ${d.amount_local == null ? null : -Number(d.amount_local)}, ${d.fx_currency}, ${d.fx_rate}, ${caseId}, 'confirmed', NOW())
    ON CONFLICT (case_id, kind) WHERE case_id IS NOT NULL DO NOTHING RETURNING id`));
  return r.length > 0;
}

/** L'ID a-t-il déjà servi ailleurs (recharge, avis relais, grand livre GlowScan) ? */
async function txnUsed(txn: string): Promise<boolean> {
  const r = Rows(await db.execute(sql`
    SELECT 1 FROM relay_credit_ledger WHERE operator_txn_id = ${txn}
    UNION ALL SELECT 1 FROM relay_cases WHERE operator_txn_id = ${txn}
    UNION ALL SELECT 1 FROM platform_ledger WHERE operator_txn_id = ${txn} AND type <> 'withdrawal' LIMIT 1`));
  return r.length > 0;
}

export function registerRelayCreditRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const relayOnly = [requireActivePro, (req: any, res: any, next: any) => (req.proAccount?.profile === "relay" ? next() : res.status(403).json({ message: "Réservé aux relais." }))];
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));

  // R6 · Mon crédit
  app.get("/api/relay/credit", ...relayOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const m = await relayMoney(me);
      const balance = await creditBalance(me);
      const rows = Rows(await db.execute(sql`
        SELECT id, kind, amount_fcfa, amount_local, fx_currency, operator_txn_id, status, reject_reason, case_id, created_at
        FROM relay_credit_ledger WHERE relay_id = ${me} ORDER BY created_at DESC LIMIT 50`));
      res.json({
        ...m, balance, balanceLocal: m.rate ? Math.floor(balance * m.rate) : null,
        momo: momoAvailable(m.country), momoNumbers: GLOWSCAN_MOMO,
        entries: rows.map((r: any) => ({
          id: r.id, kind: r.kind, amountFcfa: r.amount_fcfa, amountLocal: r.amount_local == null ? null : Number(r.amount_local),
          currency: r.fx_currency, txn: r.operator_txn_id, status: r.status, reason: r.reject_reason, caseId: r.case_id, at: r.created_at,
        })),
      });
    } catch (e) {
      console.error("[relay/credit]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Recharge : montant payé (monnaie locale) + ID de transaction → en attente de vérification.
  app.post("/api/relay/credit/recharge", ...relayOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const d = z.object({ amountLocal: z.number().positive().max(10_000_000), operatorTxnId: z.string().trim().regex(/^[A-Za-z0-9._-]{6,60}$/) }).parse(req.body);
      const m = await relayMoney(me);
      if (!providerFor(m.country)) return res.status(409).json({ message: "La recharge par Mobile Money n'est pas encore disponible dans votre pays." });
      if (!m.rate) return res.status(409).json({ message: "Taux de change indisponible pour votre devise. Réessayez plus tard." });
      if (await txnUsed(d.operatorTxnId)) return res.status(409).json({ message: "Cet ID de transaction a déjà servi." });
      const xaf = toXaf(d.amountLocal, m.rate);
      if (xaf < 1000) return res.status(400).json({ message: "Recharge minimale : l'équivalent de 1 000 F CFA." });
      await db.execute(sql`
        INSERT INTO relay_credit_ledger (relay_id, kind, amount_fcfa, amount_local, fx_currency, fx_rate, operator_txn_id, status)
        VALUES (${me}, 'recharge', ${xaf}, ${d.amountLocal}, ${m.currency}, ${m.rate}, ${d.operatorTxnId}, 'pending')`);
      res.json({ success: true, amountFcfa: xaf });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Montant ou ID de transaction invalide (6 caractères au moins)." });
      if (String(e?.message || "").includes("relay_credit_txn_uidx")) return res.status(409).json({ message: "Cet ID de transaction a déjà servi." });
      console.error("[relay/credit/recharge]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Admin : recharges à vérifier ─────────────────────────────────────
  app.get("/api/admin/relay-credit", admin, async (_req: any, res) => {
    const rows = Rows(await db.execute(sql`
      SELECT l.id, l.amount_fcfa, l.amount_local, l.fx_currency, l.operator_txn_id, l.created_at, p.full_name, p.phone
      FROM relay_credit_ledger l JOIN pro_accounts p ON p.id = l.relay_id
      WHERE l.kind = 'recharge' AND l.status = 'pending' ORDER BY l.created_at ASC LIMIT 200`));
    res.json({ items: rows });
  });
  app.post("/api/admin/relay-credit/:id/confirm", admin, async (req: any, res) => {
    // L'admin recopie l'ID vu sur son relevé Mobile Money : il doit correspondre à celui déclaré.
    const ref = String(req.body?.operatorRef || "").trim();
    const r = Rows(await db.execute(sql`
      UPDATE relay_credit_ledger SET status = 'confirmed', confirmed_at = NOW()
      WHERE id = ${Number(req.params.id)} AND kind = 'recharge' AND status = 'pending' AND operator_txn_id = ${ref}
      RETURNING relay_id, amount_fcfa`))[0];
    if (!r) return res.status(409).json({ message: "Recharge introuvable, déjà traitée, ou ID différent de celui déclaré par le relais." });
    notifyProAccount(Number(r.relay_id), { title: "Crédit rechargé", body: `Votre recharge est vérifiée (${Number(r.amount_fcfa).toLocaleString("fr-FR")} F CFA).`, url: "/derm/relais" }).catch(() => {});
    res.json({ success: true });
  });
  app.post("/api/admin/relay-credit/:id/reject", admin, async (req: any, res) => {
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ message: "Indiquez le motif." });
    const r = Rows(await db.execute(sql`
      UPDATE relay_credit_ledger SET status = 'rejected', reject_reason = ${reason}
      WHERE id = ${Number(req.params.id)} AND kind = 'recharge' AND status = 'pending' RETURNING relay_id`))[0];
    if (!r) return res.status(409).json({ message: "Recharge introuvable ou déjà traitée." });
    notifyProAccount(Number(r.relay_id), { title: "Recharge non vérifiée", body: reason, url: "/derm/relais" }).catch(() => {});
    res.json({ success: true });
  });

  // ── Admin : taux de change (saisis par GlowScan, figés à chaque paiement) ──
  app.get("/api/admin/fx-rates", admin, async (_req: any, res) => {
    res.json({ items: Rows(await db.execute(sql`SELECT currency, per_xaf, updated_at, updated_by FROM fx_rates ORDER BY currency`)) });
  });
  app.post("/api/admin/fx-rates", admin, async (req: any, res) => {
    const d = z.object({ currency: z.enum(["CDF", "BIF"]), perXaf: z.number().positive().max(1000) }).safeParse(req.body);
    if (!d.success) return res.status(400).json({ message: "Devise (CDF ou BIF) et taux positif requis. XAF et XOF sont fixes." });
    await db.execute(sql`
      INSERT INTO fx_rates (currency, per_xaf, updated_at, updated_by) VALUES (${d.data.currency}, ${d.data.perXaf}, NOW(), 'GlowScan')
      ON CONFLICT (currency) DO UPDATE SET per_xaf = EXCLUDED.per_xaf, updated_at = NOW(), updated_by = 'GlowScan'`);
    res.json({ success: true });
  });
}
