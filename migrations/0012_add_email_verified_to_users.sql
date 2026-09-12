-- Migration: vérification email obligatoire (B2C).
-- email_verified = false par défaut ; un compte email n'est actif qu'après
-- saisie du code envoyé à cette adresse (flux OTP existant). Les comptes
-- existants sont grand-pérennisés (=true) pour ne jamais bloquer un utilisateur
-- déjà en place ; seuls les NOUVEAUX comptes email devront vérifier.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;

-- Grand-pérennisation des comptes existants (à n'exécuter qu'une fois).
UPDATE "users" SET "email_verified" = true WHERE "email_verified" IS DISTINCT FROM true;
