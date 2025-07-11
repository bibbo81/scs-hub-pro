-- ==============================================
-- SHIPMENTS ACCESS POLICIES
-- ==============================================
-- Run these statements in the Supabase SQL editor

-- Allow organization members to read their own shipments
DROP POLICY IF EXISTS "Org members can access own shipments" ON public.shipments;
CREATE POLICY "Org members can access own shipments" ON public.shipments
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Analogous policies for other operations
DROP POLICY IF EXISTS "Org members can insert shipments" ON public.shipments;
CREATE POLICY "Org members can insert shipments" ON public.shipments
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Org members can update shipments" ON public.shipments;
CREATE POLICY "Org members can update shipments" ON public.shipments
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Org members can delete shipments" ON public.shipments;
CREATE POLICY "Org members can delete shipments" ON public.shipments
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );
