CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tenants_timestamp
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Any authenticated user can create a tenant (workspace)
CREATE POLICY "Authenticated users can create tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT/UPDATE policies are created in migration 000003 after get_my_tenant_id() exists
