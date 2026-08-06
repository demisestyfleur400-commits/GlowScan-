-- ============================================================================
-- Profil public dermatologue + certification + stats. À exécuter dans Supabase.
-- Idempotent. Lu/écrit en SQL brut (résilient — fonctionne avant/après).
-- ============================================================================

ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS slug                    VARCHAR(120);
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS bio                     TEXT;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS specialties             TEXT[];
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS photo_url               TEXT;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS whatsapp_number         VARCHAR(20);
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS is_certified            BOOLEAN DEFAULT FALSE;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS certified_at            TIMESTAMP;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS profile_completed_at    TIMESTAMP;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS public_profile_enabled  BOOLEAN DEFAULT TRUE;

-- Slug lisible à partir du nom (accents FR simplifiés). Unicité assurée côté app
-- pour les nouveaux comptes ; ici on backfill une base + suffixe id pour garantir
-- l'unicité sans échec.
UPDATE pro_accounts
SET slug = 'dr-' ||
  trim(both '-' from regexp_replace(
    translate(lower(full_name), 'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
    '[^a-z0-9]+', '-', 'g')) || '-' || id
WHERE slug IS NULL AND full_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_slug ON pro_accounts(slug);
CREATE INDEX IF NOT EXISTS idx_pro_certified ON pro_accounts(is_certified);

-- Stats mensuelles pré-calculées (générées le 1er du mois par un cron — à venir).
CREATE TABLE IF NOT EXISTS dermatologue_monthly_stats (
  id                   SERIAL PRIMARY KEY,
  dermatologue_id      INTEGER REFERENCES pro_accounts(id) ON DELETE CASCADE,
  month                INTEGER,
  year                 INTEGER,
  patients_seen        INTEGER DEFAULT 0,
  online_consultations INTEGER DEFAULT 0,
  dossiers_created     INTEGER DEFAULT 0,
  pdfs_generated       INTEGER DEFAULT 0,
  online_revenue       INTEGER DEFAULT 0,
  top_condition        VARCHAR(100),
  top_phototype        VARCHAR(10),
  average_rating       DECIMAL(2,1),
  new_ratings          INTEGER DEFAULT 0,
  created_at           TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_derm_stats ON dermatologue_monthly_stats(dermatologue_id, year, month);

SELECT COUNT(*) AS pros, COUNT(slug) AS avec_slug, COUNT(*) FILTER (WHERE is_certified) AS certifies
FROM pro_accounts;
