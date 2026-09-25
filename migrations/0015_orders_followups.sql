-- Refonte Organic étape 2d. Idempotent : sûr à relancer.

-- 1) Rappels de suivi demandés par un médecin : le patient peut les couper en
--    répondant « ARRÊT SUIVI ». Seul le patient peut les réactiver (Profil).
ALTER TABLE consents ADD COLUMN IF NOT EXISTS followups BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE consents ADD COLUMN IF NOT EXISTS followups_stopped_at TIMESTAMP;

-- 2) Commandes : total calculé et figé par le serveur au moment de l'envoi,
--    livraison par ville, moyen de paiement et capture de preuve.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quartier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method VARCHAR(10);   -- orange | mtn | cash
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_url TEXT;           -- stockage privé, visible dans l'admin
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx ON orders (order_number);

-- 3) Anciennes commandes : un seul format de statut dans l'admin.
--    « envoyée » → received ; « livrée » → delivered.
UPDATE orders SET status = 'received'  WHERE status = 'envoyée';
UPDATE orders SET status = 'delivered' WHERE status = 'livrée';
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'received';
