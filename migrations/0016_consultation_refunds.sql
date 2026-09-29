-- Consultations B2C : paiement bloqué jusqu'à la réponse du médecin, décision
-- de remboursement automatique après 24 h sans réponse (cron). Le virement est
-- fait par l'administrateur, qui saisit l'ID de transaction de l'opérateur :
-- aucun remboursement n'est marqué « fait » sans cet ID. Idempotent.

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS first_doctor_reply_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS refund_due_at TIMESTAMP;       -- décision du cron (24 h sans réponse)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;         -- virement confirmé par l'admin
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS refund_operator_ref TEXT;      -- ID de transaction de l'opérateur
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS owner_alert_2h_at TIMESTAMP;   -- alerte fondateur à 2 h (une seule fois)

-- Consultations payées avant cette migration : la date de création sert de date de paiement.
UPDATE consultations SET paid_at = created_at WHERE payment_status = 'paid' AND paid_at IS NULL;
-- Premier message du médecin déjà envoyé.
UPDATE consultations c SET first_doctor_reply_at = m.first_at
FROM (SELECT consultation_id, MIN(created_at) AS first_at FROM consultation_messages WHERE sender_type = 'doctor' GROUP BY consultation_id) m
WHERE m.consultation_id = c.id AND c.first_doctor_reply_at IS NULL;
-- Les consultations passées en « timeout » par l'ancien cron (2 h) ne sont pas
-- touchées : elles ont été traitées à la main et ne doivent pas être remboursées deux fois.
