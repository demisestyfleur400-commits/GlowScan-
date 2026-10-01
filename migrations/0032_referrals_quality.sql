-- Étape 14b — Orientations vers l'hôpital (O4, R7) et relecture qualité.
-- ADDENDUM_reseau_relais_ong.md §5. Idempotent.
--  · (table hospital_referrals : « referrals » sert déjà au parrainage B2C)
--  · Le dermatologue oriente vers l'hôpital : fiche REF-XXXX, hôpital proposé
--    (même district, sinon le plus proche), code à 6 chiffres remis au patient.
--  · L'hôpital confirme l'arrivée sans compte GlowScan (/ref/REF-XXXX + code),
--    peut déposer son compte rendu en PDF. J+7 : SMS patient et relais ; J+10 : ONG.
--  · Relecture qualité : 1 avis de programme sur 10, par un 2e dermatologue,
--    payée par le budget du programme comme un avis simple (80 / 20, SPLITS.quality).

CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  service TEXT,                                   -- « Dermatologie »
  country VARCHAR(40) NOT NULL,
  district TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(30),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_referrals (
  id SERIAL PRIMARY KEY,
  code VARCHAR(12) NOT NULL UNIQUE,               -- REF-M236
  case_id INTEGER NOT NULL UNIQUE REFERENCES relay_cases(id) ON DELETE CASCADE,
  hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  urgency VARCHAR(12) NOT NULL DEFAULT 'consultation', -- urgent | consultation
  arrival_code VARCHAR(6) NOT NULL,               -- remis au patient ; ouvre le dossier à l'hôpital
  appointment_at TIMESTAMP,
  status VARCHAR(16) NOT NULL DEFAULT 'referred', -- referred | arrived | report_received | no_show
  report_pdf TEXT,                                -- compte rendu de l'hôpital (privé)
  arrived_at TIMESTAMP,
  report_at TIMESTAMP,
  patient_sms_at TIMESTAMP,
  reminded_j7_at TIMESTAMP,
  alerted_j10_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hospital_referrals_program_idx ON hospital_referrals (program_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quality_reviews (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL UNIQUE REFERENCES relay_cases(id) ON DELETE CASCADE,
  program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  reviewer_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending | done | expired
  agree BOOLEAN,
  comment TEXT,
  price_fcfa INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMP NOT NULL,
  answered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quality_reviews_reviewer_idx ON quality_reviews (reviewer_id, status);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reviews ENABLE ROW LEVEL SECURITY;
