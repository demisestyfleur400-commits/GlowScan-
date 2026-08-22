-- Codes de secours 2FA — tableau JSON de { h: hash bcrypt, used: bool }.
-- Colonne hors schéma Drizzle (SQL brut résilient). 8 codes à usage unique.
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_backup_codes JSONB DEFAULT '[]'::jsonb;
