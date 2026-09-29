-- Étape 3 — Paiements : registres comptables (README §5). Idempotent.
--
-- Règles :
--  * montants en FCFA entiers ; les parts viennent de shared/splits.ts (80/20, 60/20/20) ;
--  * aucun crédit sans ID de transaction de l'opérateur vérifié (operator_txn_id) ;
--  * un même ID de transaction ne peut créditer qu'une seule fois (index unique) ;
--  * statuts : pending | escrow (bloqué) | available | paid_out | refunded.
--
-- Solde disponible d'un médecin = SUM(amount_fcfa) des lignes « available »
-- + les retraits (montants négatifs) « pending » et « paid_out ».

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id SERIAL PRIMARY KEY,
  pro_id INTEGER NOT NULL REFERENCES pro_accounts(id),
  type VARCHAR(20) NOT NULL,               -- consultation | relay_review | peer_review | withdrawal | subscription
  gross_fcfa INTEGER NOT NULL DEFAULT 0,   -- montant payé par le patient / le programme
  share_pct INTEGER,                       -- part du médecin (80, 60…) ; NULL pour un retrait
  amount_fcfa INTEGER NOT NULL,            -- positif = crédit, négatif = retrait / prélèvement
  source_id TEXT NOT NULL,                 -- ex. consultation:77, withdrawal:12, subscription:2026-10
  operator_txn_id TEXT,                    -- ID de transaction de l'opérateur (entrée ou sortie)
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_source_uidx ON wallet_ledger (pro_id, type, source_id);
CREATE INDEX IF NOT EXISTS wallet_ledger_pro_idx ON wallet_ledger (pro_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_ledger (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,               -- consultation | relay_review | subscription | withdrawal
  gross_fcfa INTEGER NOT NULL DEFAULT 0,
  share_pct INTEGER,
  amount_fcfa INTEGER NOT NULL,
  source_id TEXT NOT NULL,
  operator_txn_id TEXT,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_ledger_source_uidx ON platform_ledger (type, source_id);
-- Un ID de transaction entrant ne crédite qu'une fois (anti-réutilisation d'une même preuve).
CREATE UNIQUE INDEX IF NOT EXISTS platform_ledger_txn_uidx ON platform_ledger (operator_txn_id)
  WHERE operator_txn_id IS NOT NULL AND type <> 'withdrawal';

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL,                  -- « pro:<id> » ou « platform »
  operator VARCHAR(10) NOT NULL,           -- mtn | orange
  msisdn TEXT NOT NULL,                    -- 2376XXXXXXXX
  amount_fcfa INTEGER NOT NULL CHECK (amount_fcfa > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid_out | cancelled
  operator_ref TEXT,                       -- ID de transaction du virement (obligatoire pour « paid_out »)
  requested_by VARCHAR(10) NOT NULL DEFAULT 'manual', -- manual | auto (virement du vendredi)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS withdrawals_owner_idx ON withdrawals (owner_id, created_at DESC);

-- Comptes Mobile Money du médecin pour recevoir ses gains.
CREATE TABLE IF NOT EXISTS payout_accounts (
  id SERIAL PRIMARY KEY,
  pro_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  operator VARCHAR(10) NOT NULL,           -- mtn | orange (détecté par opOf)
  msisdn TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS payout_accounts_uidx ON payout_accounts (pro_id, msisdn);

-- Réglage « Virement automatique chaque vendredi ».
CREATE TABLE IF NOT EXISTS wallet_settings (
  pro_id INTEGER PRIMARY KEY REFERENCES pro_accounts(id) ON DELETE CASCADE,
  auto_withdraw BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sécurité par ligne activée, sans règle : aucun accès via les clés publiques
-- (anon / authenticated) de Supabase ; le serveur y accède avec son rôle propriétaire,
-- comme pour les autres tables de l'application.
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;
