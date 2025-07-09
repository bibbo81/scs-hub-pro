-- Add carrier information columns to shipments
-- Run these statements in the Supabase SQL editor

ALTER TABLE public.shipments
    ADD COLUMN IF NOT EXISTS carrier_code TEXT,
    ADD COLUMN IF NOT EXISTS carrier_name TEXT,
    ADD COLUMN IF NOT EXISTS carrier_service TEXT,
    ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_from TEXT,
    ADD COLUMN IF NOT EXISTS source_tracking_id UUID;

GRANT INSERT(carrier_code, carrier_name, carrier_service, auto_created, created_from, source_tracking_id),
        UPDATE(carrier_code, carrier_name, carrier_service, auto_created, created_from, source_tracking_id)
ON public.shipments TO api;

DROP POLICY IF EXISTS "API upsert shipments" ON public.shipments;
CREATE POLICY "API upsert shipments" ON public.shipments
    FOR INSERT WITH CHECK (auth.role() = 'api')
    TO api;

DROP POLICY IF EXISTS "API update shipments" ON public.shipments;
CREATE POLICY "API update shipments" ON public.shipments
    FOR UPDATE USING (auth.role() = 'api')
    TO api;