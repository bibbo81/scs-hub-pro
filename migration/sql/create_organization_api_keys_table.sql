
CREATE TABLE IF NOT EXISTS public.organization_api_keys (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organization_id bigint NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider text NOT NULL,
    api_key text NOT NULL, -- Consider using Supabase Vault for encryption
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT organization_provider_unique UNIQUE (organization_id, provider)
);

COMMENT ON COLUMN public.organization_api_keys.api_key IS 'Encrypted API key. Consider using Supabase Vault for enhanced security.';

-- Enable Row Level Security
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to members of the organization" ON public.organization_api_keys;
DROP POLICY IF EXISTS "Allow admin to insert" ON public.organization_api_keys;
DROP POLICY IF EXISTS "Allow admin to update" ON public.organization_api_keys;
DROP POLICY IF EXISTS "Allow admin to delete" ON public.organization_api_keys;

-- RLS Policies
CREATE POLICY "Allow read access to members of the organization" 
ON public.organization_api_keys
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members mem
        WHERE mem.organization_id = organization_api_keys.organization_id
        AND mem.user_id = auth.uid()
    )
);

CREATE POLICY "Allow admin to insert"
ON public.organization_api_keys
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members mem
        WHERE mem.organization_id = organization_api_keys.organization_id
        AND mem.user_id = auth.uid()
        AND mem.role = 'admin'
    )
);

CREATE POLICY "Allow admin to update"
ON public.organization_api_keys
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members mem
        WHERE mem.organization_id = organization_api_keys.organization_id
        AND mem.user_id = auth.uid()
        AND mem.role = 'admin'
    )
);

CREATE POLICY "Allow admin to delete"
ON public.organization_api_keys
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members mem
        WHERE mem.organization_id = organization_api_keys.organization_id
        AND mem.user_id = auth.uid()
        AND mem.role = 'admin'
    )
);

-- Grant usage to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_api_keys TO authenticated;

