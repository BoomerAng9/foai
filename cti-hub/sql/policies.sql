-- policies.sql
-- 1. Create Policies Table
CREATE TABLE IF NOT EXISTS public.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'technical', -- technical, operational, security
    rules JSONB NOT NULL DEFAULT '[]', -- specific constraints or logic
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Policy Enforcement Logs
CREATE TABLE IF NOT EXISTS public.policy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    outcome TEXT NOT NULL, -- allowed, blocked, flagged
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Org members can view policies
CREATE POLICY "Org members can view policies" 
ON public.policies 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = policies.organization_id 
        AND user_id = auth.uid()
    )
);

-- Admins can manage policies
CREATE POLICY "Admins can manage policies" 
ON public.policies 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = policies.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- Org members can view logs
CREATE POLICY "Org members can view logs" 
ON public.policy_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_memberships 
        WHERE organization_id = policy_logs.organization_id 
        AND user_id = auth.uid()
    )
);
