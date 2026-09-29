-- Sécurité par ligne sur les 5 tables créées à la volée par le serveur (alerte Supabase
-- « RLS disabled in public »). Sans règle : plus aucun accès via les clés publiques
-- anon / authenticated ; le serveur y accède avec son rôle propriétaire, comme pour les
-- autres tables. Le code réapplique cette ligne une fois par démarrage (server/ensureRls.ts).
-- Appliquée en production le 29/09/2026. Idempotent.
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_ai_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2c_reminders ENABLE ROW LEVEL SECURITY;
