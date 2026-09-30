-- Étape 10 — Entrée des relais (ADDENDUM_reseau_relais_ong.md §1, écrans R1 à R3).
-- Idempotent. Trois façons d'entrer : lien d'un dermatologue, invitation d'une ONG,
-- inscription libre. Deux validations avant le 1er cas : carte professionnelle
-- vérifiée par GlowScan + parrain (dermatologue, programme ou appel GlowScan),
-- puis le module photo (4 bonnes réponses sur 5).

CREATE TABLE IF NOT EXISTS health_centers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country VARCHAR(40),
  district TEXT,
  dhis2_org_unit_uid VARCHAR(20),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS health_centers_name_uidx ON health_centers (lower(name), COALESCE(country, ''), COALESCE(district, ''));

CREATE TABLE IF NOT EXISTS relays (
  id SERIAL PRIMARY KEY,
  pro_account_id INTEGER NOT NULL UNIQUE REFERENCES pro_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profession VARCHAR(10) NOT NULL,                     -- nurse | gp | midwife
  health_center_id INTEGER REFERENCES health_centers(id),
  country VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'pending_card',  -- invited | pending_card | pending_sponsor | pending_training | active | suspended
  card_front_url TEXT,                                 -- stockage privé, lu par l'admin seulement
  card_selfie_url TEXT,
  order_number TEXT,
  card_status VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending | verified | rejected
  card_reject_reason TEXT,
  sponsor_type VARCHAR(10),                            -- derm | program | glowscan
  sponsor_id INTEGER,
  verified_by TEXT,
  verified_at TIMESTAMP,
  phone_verified_at TIMESTAMP,
  training_passed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  inviter_type VARCHAR(10) NOT NULL,                   -- derm | program
  inviter_id INTEGER NOT NULL,                         -- pro_accounts.id du dermatologue ou du gestionnaire
  program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  name TEXT,
  center TEXT,
  token VARCHAR(40) NOT NULL UNIQUE,
  sent_via VARCHAR(10) NOT NULL,                       -- sms | link | csv
  status VARCHAR(10) NOT NULL DEFAULT 'sent',          -- sent | accepted | expired
  expires_at TIMESTAMP NOT NULL,
  reminded_j2_at TIMESTAMP,
  reminded_j7_at TIMESTAMP,
  accepted_by INTEGER REFERENCES pro_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invitations_phone_idx ON invitations (phone);

CREATE TABLE IF NOT EXISTS training_modules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  total SMALLINT NOT NULL,
  pass_score SMALLINT NOT NULL
);
INSERT INTO training_modules (code, title, total, pass_score)
VALUES ('photo', 'Bien photographier la peau', 5, 4)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS training_attempts (
  id SERIAL PRIMARY KEY,
  relay_id INTEGER NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES training_modules(id),
  score SMALLINT NOT NULL,
  total SMALLINT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE health_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE relays ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attempts ENABLE ROW LEVEL SECURITY;
