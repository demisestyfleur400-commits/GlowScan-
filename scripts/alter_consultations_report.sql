-- Statut d'envoi du rapport de consultation. À exécuter dans Supabase (idempotent).
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS whatsapp_sent_at     TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS whatsapp_send_status VARCHAR(20) DEFAULT 'pending';
-- pending | sent | failed
