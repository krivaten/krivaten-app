-- SECURITY DEFINER avoids RLS recursion on profiles
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Tenants: members can view/update their own tenant
CREATE POLICY "Members can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_my_tenant_id());

CREATE POLICY "Members can update own tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_my_tenant_id());

-- Profiles: users can see other members in their tenant
CREATE POLICY "Users can view tenant members"
  ON public.profiles FOR SELECT
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());
