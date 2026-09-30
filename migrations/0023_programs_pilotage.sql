-- Étape 6 — Pilotage des programmes (ONG, districts) et rapport mensuel au bailleur
-- (README §4 point 10). Idempotent : sûr à relancer.
--
-- Les programmes sont créés par GlowScan (admin). Un compte « ONG » (profile = ngo)
-- consulte le tableau de bord ANONYMISÉ de son programme. Chaque relais choisit de
-- partager ou non sa progression avec le programme. Le rapport mensuel est relu
-- puis envoyé au bailleur par GlowScan.

ALTER TABLE programs ADD COLUMN IF NOT EXISTS budget_fcfa INTEGER NOT NULL DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS funder_email TEXT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active';

ALTER TABLE program_members ADD COLUMN IF NOT EXISTS share_progress BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS program_managers (
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  pro_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, pro_id)
);

CREATE TABLE IF NOT EXISTS program_reports (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,             -- AAAA-MM
  sent_to TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS program_reports_prog_idx ON program_reports (program_id, month);

ALTER TABLE program_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_reports ENABLE ROW LEVEL SECURITY;
