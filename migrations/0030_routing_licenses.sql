-- Étape 13 — Envoi au bon dermatologue et réseau entre pays (ADDENDUM_reseau_relais_ong.md §4,
-- écran D1). Idempotent.
--  · Télé-expertise (avis à un soignant) : ouverte à tous les pays du réseau.
--  · Consultation directe (appli patient) : seulement avec un dermatologue
--    autorisé à exercer dans le pays du patient (derm_licenses vérifiée).
--  · Routage : référent du relais → dermatologue du même pays → réseau (si le
--    patient a accepté l'envoi hors de son pays). Sans prise en charge après 25 %
--    du délai : dermatologue suivant.

CREATE TABLE IF NOT EXISTS derm_licenses (
  id SERIAL PRIMARY KEY,
  derm_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  country VARCHAR(40) NOT NULL,
  kind VARCHAR(15) NOT NULL,                        -- home | authorization
  document_url TEXT,                                -- justificatif, privé (lu par l'admin seulement)
  status VARCHAR(10) NOT NULL DEFAULT 'pending',    -- pending | verified | rejected
  reject_reason TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS derm_licenses_uidx ON derm_licenses (derm_id, country);

ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{fr}';
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS network_daily_cap SMALLINT NOT NULL DEFAULT 10;

ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'fr';
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS routed_at TIMESTAMP;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS route_step VARCHAR(10);            -- referent | country | network
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS reassign_count SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS routing_log JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS cross_border_consent_at TIMESTAMP;  -- accord du patient (demandé par le relais)

-- Dermatologues déjà inscrits : autorisation « home » vérifiée dans leur pays
-- (ils sont déjà proposés dans l'appli patient ; rien ne doit disparaître).
INSERT INTO derm_licenses (derm_id, country, kind, status, verified_at)
SELECT id, COALESCE(NULLIF(country, ''), 'Cameroun'), 'home', 'verified', NOW()
FROM pro_accounts WHERE COALESCE(profile, 'derm') = 'derm'
ON CONFLICT (derm_id, country) DO NOTHING;

ALTER TABLE derm_licenses ENABLE ROW LEVEL SECURITY;
