CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type_id UUID NOT NULL REFERENCES public.vocabularies(id),
  name TEXT NOT NULL,
  description TEXT,
  external_id TEXT,
  taxonomy_path TEXT,
  location GEOGRAPHY(POINT, 4326),
  elevation_m NUMERIC,
  attributes JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_tenant_id ON public.entities(tenant_id);
CREATE INDEX idx_entities_type_id ON public.entities(tenant_id, entity_type_id);
CREATE INDEX idx_entities_active ON public.entities(tenant_id, is_active);
CREATE INDEX idx_entities_taxonomy ON public.entities(taxonomy_path text_pattern_ops);
CREATE INDEX idx_entities_external_id ON public.entities(tenant_id, external_id);
CREATE INDEX idx_entities_location ON public.entities USING GIST(location);
CREATE INDEX idx_entities_attributes ON public.entities USING GIN(attributes);

CREATE TRIGGER update_entities_timestamp
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant entities"
  ON public.entities FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can insert tenant entities"
  ON public.entities FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can update tenant entities"
  ON public.entities FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());
