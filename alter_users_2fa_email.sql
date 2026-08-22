-- 2FA par code email (dermatologues) — colonnes hors schéma Drizzle (SQL brut résilient).
-- twofa_email_enabled : la 2FA email est active pour ce compte
-- twofa_code_hash / twofa_code_expires / twofa_attempts : code OTP transitoire (connexion)
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_email_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_code_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_code_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_attempts INTEGER DEFAULT 0;
