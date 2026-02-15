CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_relationships_household_id ON public.relationships(household_id);
CREATE INDEX idx_relationships_from_entity ON public.relationships(from_entity_id);
CREATE INDEX idx_relationships_to_entity ON public.relationships(to_entity_id);
CREATE INDEX idx_relationships_type ON public.relationships(household_id, relationship_type);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household relationships"
  ON public.relationships FOR SELECT
  USING (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Members can insert household relationships"
  ON public.relationships FOR INSERT
  WITH CHECK (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Members can update household relationships"
  ON public.relationships FOR UPDATE
  USING (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Members can delete household relationships"
  ON public.relationships FOR DELETE
  USING (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));
