CREATE TABLE IF NOT EXISTS public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL,
  subcategory TEXT,
  data JSONB DEFAULT '{}',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No updated_at: observations are immutable records of what was observed

CREATE INDEX idx_observations_household_id ON public.observations(household_id);
CREATE INDEX idx_observations_entity_id ON public.observations(entity_id);
CREATE INDEX idx_observations_observer_id ON public.observations(observer_id);
CREATE INDEX idx_observations_observed_at ON public.observations(household_id, observed_at DESC);
CREATE INDEX idx_observations_category ON public.observations(household_id, category);
CREATE INDEX idx_observations_tags ON public.observations USING GIN(tags);
CREATE INDEX idx_observations_data ON public.observations USING GIN(data);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household observations"
  ON public.observations FOR SELECT
  USING (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Members can insert household observations"
  ON public.observations FOR INSERT
  WITH CHECK (
    household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    AND observer_id = auth.uid()
  );

CREATE POLICY "Members can update own observations"
  ON public.observations FOR UPDATE
  USING (observer_id = auth.uid());

CREATE POLICY "Members can delete own observations"
  ON public.observations FOR DELETE
  USING (observer_id = auth.uid());
