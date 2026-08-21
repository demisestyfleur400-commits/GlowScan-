-- Rappel de contrôle patient (suivi évolution) — colonnes hors schéma Drizzle.
-- follow_up_at : date à laquelle envoyer le rappel WhatsApp au patient
-- follow_up_message : message personnalisé optionnel (sinon message par défaut)
-- follow_up_reminder_sent : évite les doublons d'envoi
ALTER TABLE patients ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS follow_up_message TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS follow_up_reminder_sent BOOLEAN DEFAULT FALSE;
