-- ==============================================
-- SUPABASE SECURITY FIXES
-- ==============================================
-- Esegui questo script nel SQL Editor di Supabase
-- Data: Gennaio 2025
-- ==============================================

-- ==============================
-- 1. FIX DASHBOARD_STATS VIEW
-- ==============================
-- Rimuovi la view con SECURITY DEFINER e ricreala senza
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;

-- Ricrea la view SENZA SECURITY DEFINER
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT 
    COUNT(*) as total_trackings,
    COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'delayed') as delayed,
    COUNT(*) FILTER (WHERE status = 'arrived') as arrived,
    COUNT(*) FILTER (WHERE status = 'registered') as registered,
    COUNT(*) FILTER (WHERE status = 'exception') as exception
FROM trackings
WHERE user_id = auth.uid(); -- Usa auth.uid() per l'utente corrente

-- Commenta la riga seguente se non vuoi grant pubblico
GRANT SELECT ON public.dashboard_stats TO authenticated;

-- ==============================
-- 2. FIX FUNCTION SEARCH PATHS
-- ==============================
-- Imposta search_path sicuro per tutte le function

-- Function 1: update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public, pg_temp;

-- Function 2: handle_new_user_settings
ALTER FUNCTION public.handle_new_user_settings() 
SET search_path = public, pg_temp;

-- Function 3: create_default_org_for_user
ALTER FUNCTION public.create_default_org_for_user() 
SET search_path = public, pg_temp;

-- Function 4: handle_new_user
ALTER FUNCTION public.handle_new_user() 
SET search_path = public, pg_temp;

-- ==============================
-- 3. GESTIONE ACCESSO ANONIMO
-- ==============================
-- OPZIONE A: SE VUOI DISABILITARE L'ACCESSO ANONIMO
-- Decommenta le seguenti righe per rimuovere i permessi anonimi

/*
-- Rimuovi permessi SELECT per utenti anonimi
REVOKE SELECT ON public.api_logs FROM anon;
REVOKE SELECT ON public.audit_log FROM anon;
REVOKE SELECT ON public.notifications FROM anon;
REVOKE SELECT ON public.organization_api_keys FROM anon;
REVOKE SELECT ON public.organization_members FROM anon;
REVOKE SELECT ON public.organizations FROM anon;
REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.shipment_items FROM anon;
REVOKE SELECT ON public.shipments FROM anon;
REVOKE SELECT ON public.tracking_events FROM anon;
REVOKE SELECT ON public.trackings FROM anon;
REVOKE SELECT ON public.user_settings FROM anon;

-- Rimuovi permessi INSERT/UPDATE/DELETE per utenti anonimi
REVOKE INSERT, UPDATE, DELETE ON public.trackings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tracking_events FROM anon;
-- Aggiungi altre tabelle se necessario
*/

-- OPZIONE B: SE VUOI MANTENERE L'ACCESSO ANONIMO (DEFAULT)
-- Le policy esistenti rimarranno attive
-- Questo è utile per demo o utenti che provano il sistema

-- ==============================
-- 4. ABILITA LEAKED PASSWORD PROTECTION
-- ==============================
-- Questo deve essere fatto dal Dashboard Supabase:
-- 1. Vai su Authentication > Providers
-- 2. Clicca su Email
-- 3. Abilita "Check passwords against HaveIBeenPwned"
-- 4. Salva le modifiche

-- ==============================
-- 5. CREA INDICI PER PERFORMANCE
-- ==============================
-- Aggiungi indici per migliorare le performance

-- Indice per trackings by user_id
CREATE INDEX IF NOT EXISTS idx_trackings_user_id 
ON public.trackings(user_id);

-- Indice per trackings by status
CREATE INDEX IF NOT EXISTS idx_trackings_status 
ON public.trackings(status);

-- Indice per trackings by tracking_number
CREATE INDEX IF NOT EXISTS idx_trackings_tracking_number 
ON public.trackings(tracking_number);

-- Indice composito per query comuni
CREATE INDEX IF NOT EXISTS idx_trackings_user_status 
ON public.trackings(user_id, status);

-- ==============================
-- 6. VERIFICA RLS POLICIES
-- ==============================
-- Verifica che tutte le tabelle abbiano RLS abilitato

-- Lista tabelle senza RLS (per verifica)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
    SELECT tablename 
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true
);

-- ==============================
-- 7. AUDIT E LOGGING
-- ==============================
-- Crea tabella per audit log se non esiste
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    table_name text,
    user_id uuid REFERENCES auth.users(id),
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Abilita RLS per audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: solo admin possono vedere audit log
CREATE POLICY "Only admins can view audit log" ON public.security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ==============================
-- 8. VALIDAZIONE FINALE
-- ==============================
-- Query per verificare lo stato della sicurezza

-- Controlla views con SECURITY DEFINER (dovrebbe essere vuoto)
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid, true) as view_definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND pg_get_viewdef(c.oid, true) ILIKE '%SECURITY DEFINER%';

-- Controlla functions senza search_path
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND NOT pg_get_functiondef(p.oid) LIKE '%search_path%';

-- ==============================
-- FINE SECURITY FIXES
-- ==============================