-- Étape 15 — Export DHIS2 (ADDENDUM_reseau_relais_ong.md §6, écran O5). Idempotent.
-- Seuls des chiffres agrégés sortent (jamais de données individuelles) ; toute
-- valeur inférieure à 3 est masquée. Jeton d'accès personnel (PAT) chiffré
-- AES-256-GCM avec DHIS2_TOKEN_KEY, jamais réaffiché. Essai (dryRun) avant envoi,
-- envoi automatique le 5 de chaque mois, fichier téléchargeable en secours.

CREATE TABLE IF NOT EXISTS dhis2_connections (
  program_id INTEGER PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,                       -- https://dhis2.minsante.cm (sans /api)
  token_enc TEXT,                               -- PAT chiffré (iv.tag.data, base64)
  token_hint VARCHAR(12),                       -- « d2pat_…Ab12 » pour reconnaître le jeton
  data_set_uid VARCHAR(11),
  org_unit_uid VARCHAR(11),                     -- district (si les centres n'ont pas d'UID)
  org_unit_mode VARCHAR(10) NOT NULL DEFAULT 'district', -- district | center
  auto_send BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(12) NOT NULL DEFAULT 'new',    -- new | ok | error
  last_test_at TIMESTAMP,
  last_error TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dhis2_mappings (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  glowscan_key VARCHAR(60) NOT NULL,            -- disease:teigne:F:5-14, urgent:M:15-49, referral:arrived, agents:trained
  data_element_uid VARCHAR(11),
  coc_uid VARCHAR(11),
  UNIQUE (program_id, glowscan_key)
);

CREATE TABLE IF NOT EXISTS dhis2_exports (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  period VARCHAR(6) NOT NULL,                   -- AAAAMM
  mode VARCHAR(8) NOT NULL,                     -- dry_run | import | file
  status VARCHAR(10) NOT NULL,                  -- ok | conflicts | error
  values_count INTEGER NOT NULL DEFAULT 0,
  masked_count INTEGER NOT NULL DEFAULT 0,
  unmapped_count INTEGER NOT NULL DEFAULT 0,
  import_count JSONB,                           -- { imported, updated, ignored, deleted }
  conflicts JSONB,
  payload JSONB,
  error TEXT,
  created_by TEXT,                              -- « cron » ou compte
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dhis2_exports_prog_idx ON dhis2_exports (program_id, created_at DESC);

ALTER TABLE dhis2_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhis2_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhis2_exports ENABLE ROW LEVEL SECURITY;
