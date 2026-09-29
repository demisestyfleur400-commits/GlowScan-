-- Étape 4b — Signature du compte rendu par code à 4 chiffres (README §4, point 1).
-- Idempotent : sûr à relancer.
--
-- Le code n'est jamais stocké en clair : hachage bcrypt dans pro_accounts.sign_pin_hash
-- (colonne volontairement absente du schéma Drizzle pour qu'elle ne soit jamais
-- renvoyée avec le compte). consultations.signed_at = date de la signature.

ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS sign_pin_hash TEXT;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS sign_pin_set_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;
