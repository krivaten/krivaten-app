-- 1. Create tenant_members table (before the function that queries it)
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tenant_members_user_tenant
  ON public.tenant_members (user_id, tenant_id);

CREATE UNIQUE INDEX idx_tenant_members_active_user
  ON public.tenant_members (user_id) WHERE is_active = true;

-- 2. SECURITY DEFINER function — reads tenant_members, bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. tenant_members RLS (function exists now, safe to reference)
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON public.tenant_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view tenant memberships"
  ON public.tenant_members FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Users can create own membership"
  ON public.tenant_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership"
  ON public.tenant_members FOR UPDATE
  USING (user_id = auth.uid());

-- 4. Tenants RLS (unchanged — uses get_my_tenant_id())
CREATE POLICY "Members can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_my_tenant_id());

CREATE POLICY "Members can update own tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_my_tenant_id());

-- 5. Profiles: users can see profiles of people in their active tenant
CREATE POLICY "Users can view tenant members"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE tenant_id = public.get_my_tenant_id()
      AND user_id = profiles.id
    )
  );
