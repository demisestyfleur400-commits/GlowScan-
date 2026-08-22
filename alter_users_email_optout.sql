-- Désabonnement des emails marketing (ré-engagement, digest…). Les emails
-- transactionnels (2FA, sécurité, reçu, résultat) partent toujours.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE;
