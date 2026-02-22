CREATE TABLE IF NOT EXISTS public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subject_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  observer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  variable_id UUID REFERENCES public.vocabularies(id),
  value_numeric NUMERIC,
  value_text TEXT,
  value_boolean BOOLEAN,
  value_json JSONB,
  unit_id UUID REFERENCES public.vocabularies(id),
  quality_flag UUID REFERENCES public.vocabularies(id),
  method_id UUID REFERENCES public.vocabularies(id),
  location GEOGRAPHY(POINT, 4326),
  elevation_m NUMERIC,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- No updated_at: observations are immutable
);

CREATE INDEX idx_obs_tenant_id ON public.observations(tenant_id);
CREATE INDEX idx_obs_subject_id ON public.observations(subject_id);
CREATE INDEX idx_obs_observer_id ON public.observations(observer_id);
CREATE INDEX idx_obs_observed_at ON public.observations(tenant_id, observed_at DESC);
CREATE INDEX idx_obs_variable_id ON public.observations(tenant_id, variable_id);
CREATE INDEX idx_obs_numeric ON public.observations(value_numeric) WHERE value_numeric IS NOT NULL;
CREATE INDEX idx_obs_location ON public.observations USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX idx_obs_attributes ON public.observations USING GIN(attributes);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant observations"
  ON public.observations FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can insert tenant observations"
  ON public.observations FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND observer_id = auth.uid());

CREATE POLICY "Observers can update own observations"
  ON public.observations FOR UPDATE USING (observer_id = auth.uid());

CREATE POLICY "Observers can delete own observations"
  ON public.observations FOR DELETE USING (observer_id = auth.uid());
