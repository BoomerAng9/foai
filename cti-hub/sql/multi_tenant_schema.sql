-- organizations.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    tier TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Organization Memberships Table
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- 3. Add organization_id to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_org_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.context_packs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.usage_tracking ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 4. Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Organizations
-- Users can see organizations they are members of
CREATE POLICY "Users can view their own organizations" 
ON public.organizations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid()
    )
);

-- Owners/Admins can update organization info
CREATE POLICY "Admins can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- 6. Policies for Memberships
CREATE POLICY "Users can view their own memberships" 
ON public.organization_memberships 
FOR SELECT 
USING (user_id = auth.uid());

-- 7. Update existing table policies to use organization_id
ALTER TABLE public.context_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view context packs" 
ON public.context_packs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = context_packs.organization_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Org members can insert context packs" 
ON public.context_packs 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = context_packs.organization_id 
        AND user_id = auth.uid()
    )
);
