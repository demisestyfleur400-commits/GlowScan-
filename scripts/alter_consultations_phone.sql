-- Numéro WhatsApp du patient pour l'envoi du rapport. À exécuter dans Supabase.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(20);
