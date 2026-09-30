-- Étape 4c — Agenda et rappels (README §4, points 4 et 5). Idempotent.
--
-- La table appointments existait déjà (créée à la volée par le serveur) : on la
-- crée si besoin puis on ajoute les colonnes des rappels.
--   patient_record_id      : dossier patient du cabinet (patients.id) lié au RDV
--   created_by             : doctor | secretary
--   confirmed_at           : le patient a répondu « 1 » au rappel de la veille
--   reminder_j1_sent_at    : rappel WhatsApp de la veille envoyé
--   report_reminder_sent_at: rappel au médecin « compte rendu à envoyer » après la visite

CREATE TABLE IF NOT EXISTS appointments (
  id serial PRIMARY KEY, dermatologue_id integer, patient_id text, patient_name varchar(100),
  patient_contact varchar(50), appointment_date timestamptz NOT NULL, duration_minutes integer DEFAULT 30,
  type varchar(20) DEFAULT 'consultation', priority varchar(10) DEFAULT 'normal', notes text,
  status varchar(20) DEFAULT 'scheduled', reminder_h2_sent boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_email varchar(120);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_record_id integer REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by varchar(10);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_j1_sent_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS report_reminder_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS appointments_derm_date_idx ON appointments (dermatologue_id, appointment_date);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
