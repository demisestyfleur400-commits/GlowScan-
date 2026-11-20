-- 0041 · Rappel de rendez-vous envoyé PAR LE CABINET (file d'envoi en un clic).
-- Distinct de reminder_j1_sent_at, que le rappel automatique de 18 h pose même
-- quand l'envoi WhatsApp échoue : la file s'appuie sur ce marqueur-ci.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_manual_at timestamptz;
COMMENT ON COLUMN appointments.reminder_manual_at IS 'Rappel envoyé par le cabinet depuis la file en un clic (WhatsApp ouvert)';
