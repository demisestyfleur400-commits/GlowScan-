-- Consultations in-app (circuit fermé B2C ↔ dermatologue) : chat + paiement.
-- Idempotent : sûr à relancer.

CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id),
  scan_id INTEGER REFERENCES scans(id),
  condition TEXT,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending_payment',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_ref TEXT,
  price_fcfa INTEGER DEFAULT 0,
  unread_patient INTEGER DEFAULT 0,
  unread_doctor INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_messages (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_user ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_pro ON consultations(pro_account_id);
CREATE INDEX IF NOT EXISTS idx_messages_consultation ON consultation_messages(consultation_id);

-- Opt-in dermatologue : consultable en B2C + prix de sa consultation.
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS b2c_available BOOLEAN DEFAULT FALSE;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS consult_price_fcfa INTEGER DEFAULT 3000;
