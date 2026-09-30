-- Étape 14a — Programmes ONG : création (O1), agents (O2), budget d'avis prépayé (O3).
-- ADDENDUM_reseau_relais_ong.md §5, maquette « Programmes ONG ». Idempotent.
--  · L'ONG crée son programme en brouillon ; il démarre quand GlowScan valide
--    la première recharge (décision du fondateur).
--  · Les cas « programme » sont débités automatiquement du budget ; même
--    répartition 60 / 20 / 20 que les autres payeurs ; délai dépassé → rendu.
--  · Solde = somme des lignes confirmées de program_budget_ledger.

ALTER TABLE programs ADD COLUMN IF NOT EXISTS country VARCHAR(40);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS derm_mode VARCHAR(10) NOT NULL DEFAULT 'auto';   -- auto | chosen
ALTER TABLE programs ADD COLUMN IF NOT EXISTS alert_pct SMALLINT NOT NULL DEFAULT 20;          -- 20 | 30 | 50
ALTER TABLE programs ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMP;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES pro_accounts(id) ON DELETE SET NULL;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
-- status : draft | active | paused | closed (colonne existante, 0023)

CREATE TABLE IF NOT EXISTS program_districts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  country VARCHAR(40) NOT NULL,
  district TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS program_districts_uidx ON program_districts (program_id, country, lower(district));

CREATE TABLE IF NOT EXISTS program_derms (
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  derm_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, derm_id)
);

-- Vide = toutes les maladies.
CREATE TABLE IF NOT EXISTS program_diseases (
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  disease_code VARCHAR(40) NOT NULL,
  PRIMARY KEY (program_id, disease_code)
);

CREATE TABLE IF NOT EXISTS program_budget_ledger (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  kind VARCHAR(15) NOT NULL,                      -- recharge | debit | refund | quality | close_refund
  amount_fcfa INTEGER NOT NULL,                   -- + recharge / remboursement, − débit
  reviews INTEGER,                                -- recharge : nombre d'avis simples équivalent
  case_id INTEGER REFERENCES relay_cases(id) ON DELETE SET NULL,
  method VARCHAR(10),                             -- virement | momo
  operator_ref TEXT,                              -- référence de virement ou ID Mobile Money
  status VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending | confirmed | rejected
  reject_reason TEXT,
  receipt_no VARCHAR(20),                         -- GS-REC-xxxxx, à la confirmation
  requested_by INTEGER REFERENCES pro_accounts(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS program_budget_prog_idx ON program_budget_ledger (program_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS program_budget_case_uidx ON program_budget_ledger (case_id, kind) WHERE case_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS program_budget_ref_uidx ON program_budget_ledger (operator_ref) WHERE operator_ref IS NOT NULL AND kind = 'recharge';

ALTER TABLE program_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_derms ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_budget_ledger ENABLE ROW LEVEL SECURITY;
