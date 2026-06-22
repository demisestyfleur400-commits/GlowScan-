-- Migration 0004 : Table des comptes secrétaire
-- ─────────────────────────────────────────────────────────────────────────────
-- La table secretary_accounts était définie dans schema.ts mais n'a JAMAIS été
-- créée dans Supabase → POST /api/pro/secretaries plantait en 500 (insert dans
-- une table inexistante), laissant un utilisateur orphelin → faux 400 ensuite.
--
-- ⚠️ À exécuter dans Supabase (SQL Editor) AVANT de retester la création de secrétaire.

CREATE TABLE IF NOT EXISTS "secretary_accounts" (
  "id"             serial PRIMARY KEY,
  "user_id"        text    NOT NULL UNIQUE,
  "pro_account_id" integer NOT NULL,
  "full_name"      text    NOT NULL,
  "email"          text    NOT NULL,
  "created_at"     timestamp DEFAULT now(),
  "created_by"     text    NOT NULL,
  CONSTRAINT "secretary_accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "secretary_accounts_pro_account_id_fkey"
    FOREIGN KEY ("pro_account_id") REFERENCES "pro_accounts"("id") ON DELETE CASCADE
);

-- Nettoyage : supprimer les utilisateurs "secretary" orphelins créés par les
-- tentatives ratées (ils n'ont aucune ligne dans secretary_accounts).
-- Ainsi les emails utilisés lors des essais redeviennent disponibles.
DELETE FROM "users"
WHERE "role" = 'secretary'
  AND "id" NOT IN (SELECT "user_id" FROM "secretary_accounts");
