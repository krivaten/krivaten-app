CREATE TABLE IF NOT EXISTS public.vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  vocabulary_type TEXT NOT NULL CHECK (vocabulary_type IN (
    'variable', 'unit', 'entity_type', 'edge_type', 'method', 'quality_flag'
  )),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT,                          -- taxonomy: "biology.botany.flowering"
  properties JSONB DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE NULLS NOT DISTINCT (tenant_id, vocabulary_type, code)
);

CREATE INDEX idx_vocabularies_tenant_id ON public.vocabularies(tenant_id);
CREATE INDEX idx_vocabularies_type ON public.vocabularies(vocabulary_type);
CREATE INDEX idx_vocabularies_type_code ON public.vocabularies(vocabulary_type, code);
CREATE INDEX idx_vocabularies_path ON public.vocabularies(path text_pattern_ops);

CREATE TRIGGER update_vocabularies_timestamp
  BEFORE UPDATE ON public.vocabularies
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.vocabularies ENABLE ROW LEVEL SECURITY;

-- System vocabs (tenant_id IS NULL) readable by all authenticated users
CREATE POLICY "Anyone can view system vocabularies"
  ON public.vocabularies FOR SELECT
  USING (tenant_id IS NULL);

CREATE POLICY "Members can view tenant vocabularies"
  ON public.vocabularies FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can create tenant vocabularies"
  ON public.vocabularies FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

CREATE POLICY "Members can update tenant vocabularies"
  ON public.vocabularies FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

CREATE POLICY "Members can delete tenant vocabularies"
  ON public.vocabularies FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND is_system = FALSE);
