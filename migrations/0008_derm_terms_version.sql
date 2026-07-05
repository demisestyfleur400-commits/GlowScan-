-- Version des Conditions d'utilisation & Politique de confidentialité DERM
-- acceptée par le dermatologue à l'inscription (preuve opposable de la version).
-- Idempotent : sûr à relancer.

ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20);
