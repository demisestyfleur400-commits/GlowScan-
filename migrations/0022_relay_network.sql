-- Étape 5 — Téléexpertise, réseau des relais et formation (README §4 points 7 à 9, §5).
-- Idempotent : sûr à relancer. Montants en FCFA entiers ; parts 60/20/20 dans shared/splits.ts.

-- Niveau « Formateur » attribué par le dermatologue référent (0 = calculé automatiquement).
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS relay_level SMALLINT NOT NULL DEFAULT 0;

-- Programmes (ONG, districts) — pilotage à l'étape 6.
CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  funder TEXT,
  district TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS program_members (
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  relay_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, relay_id)
);

-- Le relais choisit son dermatologue référent (un seul à la fois).
CREATE TABLE IF NOT EXISTS relay_links (
  relay_id INTEGER PRIMARY KEY REFERENCES pro_accounts(id) ON DELETE CASCADE,
  derm_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS relay_links_derm_idx ON relay_links (derm_id);

-- Cas envoyés par un relais. Le relais propose son diagnostic AVANT l'IA.
-- status : awaiting_payment | awaiting_review | answered | autonomous | refund_due | refunded
-- payment_status : pending | verified | program | refunded
CREATE TABLE IF NOT EXISTS relay_cases (
  id SERIAL PRIMARY KEY,
  relay_id INTEGER NOT NULL REFERENCES pro_accounts(id),
  derm_id INTEGER REFERENCES pro_accounts(id),
  center_name TEXT,
  patient_age INTEGER,
  patient_sex VARCHAR(1),
  zone TEXT,
  symptoms TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  relay_diagnosis TEXT NOT NULL,
  relay_disease_code VARCHAR(40),
  ai_scan_id INTEGER REFERENCES scans(id),
  ai_diagnosis TEXT,
  ai_confidence VARCHAR(10),
  tier VARCHAR(10) NOT NULL CHECK (tier IN ('simple', 'urgent')),
  price_fcfa INTEGER NOT NULL DEFAULT 0,
  payer VARCHAR(10) NOT NULL CHECK (payer IN ('patient', 'program', 'none')),
  program_id INTEGER REFERENCES programs(id),
  operator_txn_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'awaiting_payment',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  due_at TIMESTAMP,
  alert_sent_at TIMESTAMP,
  derm_verdict VARCHAR(10) CHECK (derm_verdict IN ('confirm', 'correct')),
  derm_diagnosis TEXT,
  derm_disease_code VARCHAR(40),
  derm_note TEXT,
  lesson_tip VARCHAR(40),
  answered_at TIMESTAMP,
  refunded_at TIMESTAMP,
  refund_operator_ref TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS relay_cases_relay_idx ON relay_cases (relay_id, created_at DESC);
CREATE INDEX IF NOT EXISTS relay_cases_derm_idx ON relay_cases (derm_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS relay_cases_txn_uidx ON relay_cases (operator_txn_id) WHERE operator_txn_id IS NOT NULL;

-- Formation : un suivi par maladie. Autonome à ≥ 85 % d'accord sur ≥ 20 cas.
CREATE TABLE IF NOT EXISTS relay_progress (
  relay_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  disease_code VARCHAR(40) NOT NULL,
  cases INTEGER NOT NULL DEFAULT 0,
  agreements INTEGER NOT NULL DEFAULT 0,
  autonomous_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (relay_id, disease_code)
);

-- Avis entre confrères : niveau d'urgence et réponse structurée.
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS urgency VARCHAR(10) NOT NULL DEFAULT 'normal';
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE peer_review_replies ADD COLUMN IF NOT EXISTS structured JSONB;

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_review_replies ENABLE ROW LEVEL SECURITY;
