-- Étape 16 — Bogou et API ouverte (ADDENDUM_reseau_relais_ong.md §7, écran O5). Idempotent.
--  · Bogou (pas d'API publique) : export d'un cas en paquet (PDF + photos + avis),
--    téléchargé ou envoyé à l'adresse du cercle Bogou ; import manuel d'un cas Bogou.
--  · API ouverte /api/v1/network : clé partenaire (hachée), journal d'accès,
--    limite d'appels, webhooks signés (case.answered, referral.arrived).
--  · Chaque partenaire est rattaché à un programme : ses cas sont débités du
--    budget prépayé (décision du fondateur). Secret de webhook chiffré avec
--    DHIS2_TOKEN_KEY (même clé que les jetons DHIS2).
--  · Table api_partners : « partners » sert déjà aux partenaires de la boutique
--    B2C. Une première version visait « partners » par erreur ; les clés
--    étrangères sont rebranchées ici sur api_partners (tables alors vides).

CREATE TABLE IF NOT EXISTS api_partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  kind VARCHAR(12) NOT NULL DEFAULT 'telemed',      -- bogou | telemed | hospital | ministry | other
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  owner_pro_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE RESTRICT, -- compte technique « relais » qui porte les cas
  key_prefix VARCHAR(12) NOT NULL UNIQUE,           -- gsk_xxxxxxxx (affiché pour reconnaître la clé)
  key_hash TEXT NOT NULL,                            -- sha256 de la clé complète
  webhook_url TEXT,
  webhook_secret_enc TEXT,
  rate_limit_per_min SMALLINT NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_access_log (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER,
  method VARCHAR(8) NOT NULL,
  path TEXT NOT NULL,
  status SMALLINT NOT NULL,
  ip VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS partner_access_log_idx ON partner_access_log (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL,
  event VARCHAR(30) NOT NULL,                        -- case.answered | referral.arrived
  payload JSONB NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',     -- pending | delivered | failed
  attempts SMALLINT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_error TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_due_idx ON webhook_deliveries (status, next_attempt_at);

ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'glowscan'; -- glowscan | bogou | partner
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS external_ref VARCHAR(80);
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS partner_id INTEGER;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS bogou_shared_at TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS relay_cases_partner_ref_uidx ON relay_cases (partner_id, external_ref) WHERE partner_id IS NOT NULL AND external_ref IS NOT NULL;

-- Clés étrangères vers api_partners (et jamais vers la table « partners » de la boutique).
ALTER TABLE partner_access_log DROP CONSTRAINT IF EXISTS partner_access_log_partner_id_fkey;
ALTER TABLE partner_access_log ADD CONSTRAINT partner_access_log_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES api_partners(id) ON DELETE CASCADE;
ALTER TABLE webhook_deliveries DROP CONSTRAINT IF EXISTS webhook_deliveries_partner_id_fkey;
ALTER TABLE webhook_deliveries ADD CONSTRAINT webhook_deliveries_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES api_partners(id) ON DELETE CASCADE;
ALTER TABLE relay_cases DROP CONSTRAINT IF EXISTS relay_cases_partner_id_fkey;
ALTER TABLE relay_cases ADD CONSTRAINT relay_cases_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES api_partners(id) ON DELETE SET NULL;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS bogou_email TEXT;

ALTER TABLE api_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
