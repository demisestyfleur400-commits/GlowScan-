-- 0042 — CGU version 2026-11-v2 : acceptation versionnée + consentement recherche redemandé.
-- Idempotente : peut être relancée sans effet (les consentements donnés sous la v2 portent
-- leur version et ne sont donc jamais remis à zéro par une nouvelle exécution).
-- À appliquer à la main AVANT le déploiement du code de la branche cgu-v2.

BEGIN;

-- 1. Version des CGU acceptée et date, par compte.
ALTER TABLE users        ADD COLUMN IF NOT EXISTS cgu_version     varchar(20);
ALTER TABLE users        ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS cgu_version     varchar(20);
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;

-- 2. Version du texte sous lequel le consentement recherche a été donné.
ALTER TABLE users    ADD COLUMN IF NOT EXISTS dataset_consent         boolean DEFAULT false;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS dataset_consent_at      timestamp;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS dataset_consent_version varchar(20);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS consent_dataset         boolean;
ALTER TABLE consents ADD COLUMN IF NOT EXISTS research_version        varchar(20);

-- 3. La portée change (modèles open source, accès chercheurs) : tout consentement recherche
--    antérieur à la v2 est remis à « non » et sera redemandé avec le nouveau texte.
UPDATE users
   SET dataset_consent = false, dataset_consent_at = NULL
 WHERE dataset_consent = true
   AND dataset_consent_version IS DISTINCT FROM '2026-11-v2';

UPDATE users
   SET consent_dataset = false
 WHERE consent_dataset = true
   AND dataset_consent_version IS DISTINCT FROM '2026-11-v2';

UPDATE consents
   SET research = false, updated_at = NOW()
 WHERE research = true
   AND research_version IS DISTINCT FROM '2026-11-v2';

COMMIT;
