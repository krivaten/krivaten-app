CREATE TABLE IF NOT EXISTS public.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  edge_type_id UUID REFERENCES public.vocabularies(id),
  edge_type TEXT NOT NULL,
  label TEXT,
  weight NUMERIC DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edges_tenant_id ON public.edges(tenant_id);
CREATE INDEX idx_edges_source ON public.edges(source_id);
CREATE INDEX idx_edges_target ON public.edges(target_id);
CREATE INDEX idx_edges_type ON public.edges(tenant_id, edge_type);
CREATE INDEX idx_edges_active ON public.edges(source_id, edge_type) WHERE valid_to IS NULL;

CREATE TRIGGER update_edges_timestamp
  BEFORE UPDATE ON public.edges
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant edges"
  ON public.edges FOR SELECT USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can insert tenant edges"
  ON public.edges FOR INSERT WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can update tenant edges"
  ON public.edges FOR UPDATE USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can delete tenant edges"
  ON public.edges FOR DELETE USING (tenant_id = public.get_my_tenant_id());
