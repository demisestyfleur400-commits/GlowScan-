-- Appli patient B4 — « Mon évolution » : bilan du jour (ressenti). Idempotent.
--  · skin_journal : une ligne par patient et par jour (heure du Cameroun).
--    comfort = confort de peau ressenti, de 1 (très inconfortable) à 5 (très
--    confortable) ; note libre facultative. Un nouveau bilan le même jour
--    remplace le précédent. Sert aussi de donnée de ressenti à côté du Glow Score.

CREATE TABLE IF NOT EXISTS skin_journal (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  comfort SMALLINT NOT NULL CHECK (comfort BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS skin_journal_user_day_idx ON skin_journal (user_id, day DESC);

ALTER TABLE skin_journal ENABLE ROW LEVEL SECURITY;
