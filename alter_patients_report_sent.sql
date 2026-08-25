-- Marque la date d'envoi du dossier PDF au patient (badge "Dossier envoyé").
-- Colonne hors schéma Drizzle (SQL brut résilient).
ALTER TABLE patients ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMP;
