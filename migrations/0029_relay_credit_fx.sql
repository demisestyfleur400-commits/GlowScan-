-- Étape 12 — Paiement de l'avis relais sans ONG (ADDENDUM_reseau_relais_ong.md §3,
-- écrans R4 et R6). Idempotent.
--  1. Mobile Money de la patiente (instructions par SMS, ID vérifié par GlowScan) ;
--  2. Espèces : le relais encaisse, l'avis est débité de son crédit prépayé ;
--  3. Programme ONG.
-- Répartition identique quel que soit le payeur : 60 / 20 / 20 (SPLITS.relay).
-- Prix de référence en F CFA (XAF) ; le taux de la monnaie locale est figé au paiement.

CREATE TABLE IF NOT EXISTS fx_rates (
  currency VARCHAR(3) PRIMARY KEY,             -- XAF, XOF, CDF, BIF…
  per_xaf NUMERIC(14, 6) NOT NULL,             -- unités locales pour 1 F CFA (XAF)
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by TEXT
);
-- Franc CFA d'Afrique centrale et de l'Ouest : même parité fixe.
INSERT INTO fx_rates (currency, per_xaf, updated_by) VALUES ('XAF', 1, 'parité'), ('XOF', 1, 'parité')
ON CONFLICT (currency) DO NOTHING;

-- Crédit prépayé du relais : le solde = somme des lignes confirmées.
CREATE TABLE IF NOT EXISTS relay_credit_ledger (
  id SERIAL PRIMARY KEY,
  relay_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL,                    -- recharge | debit | refund
  amount_fcfa INTEGER NOT NULL,                 -- + recharge / remboursement, − débit
  amount_local NUMERIC(14, 2),
  fx_currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
  fx_rate NUMERIC(14, 6) NOT NULL DEFAULT 1,
  case_id INTEGER REFERENCES relay_cases(id) ON DELETE SET NULL,
  operator_txn_id TEXT,                         -- recharge : ID Mobile Money, vérifié par GlowScan
  status VARCHAR(10) NOT NULL DEFAULT 'pending', -- pending | confirmed | rejected
  reject_reason TEXT,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS relay_credit_relay_idx ON relay_credit_ledger (relay_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS relay_credit_txn_uidx ON relay_credit_ledger (operator_txn_id) WHERE operator_txn_id IS NOT NULL;
-- Un seul débit et un seul remboursement par cas.
CREATE UNIQUE INDEX IF NOT EXISTS relay_credit_case_uidx ON relay_credit_ledger (case_id, kind) WHERE case_id IS NOT NULL;

ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS fx_currency VARCHAR(3);
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(14, 6);
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS amount_local NUMERIC(14, 2);
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(20);        -- facultatif : SMS de paiement seulement
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS patient_sms_sent_at TIMESTAMP;

-- Nouveau payeur « credit » (espèces, débité du crédit du relais).
ALTER TABLE relay_cases DROP CONSTRAINT IF EXISTS relay_cases_payer_check;
ALTER TABLE relay_cases ADD CONSTRAINT relay_cases_payer_check CHECK (payer IN ('patient', 'credit', 'program', 'none'));

ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS fx_currency VARCHAR(3);
ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(14, 6);
ALTER TABLE platform_ledger ADD COLUMN IF NOT EXISTS fx_currency VARCHAR(3);
ALTER TABLE platform_ledger ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(14, 6);

ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_credit_ledger ENABLE ROW LEVEL SECURITY;
