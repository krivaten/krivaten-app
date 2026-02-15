CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'person', 'location', 'plant', 'project',
    'equipment', 'supply', 'process', 'animal'
  )),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}',
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_entities_household_id ON public.entities(household_id);
CREATE INDEX idx_entities_type ON public.entities(household_id, type);
CREATE INDEX idx_entities_parent_id ON public.entities(parent_id);
CREATE INDEX idx_entities_archived ON public.entities(household_id, archived);
CREATE INDEX idx_entities_properties ON public.entities USING GIN(properties);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household entities"
  ON public.entities FOR SELECT
  USING (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Members can insert household entities"
  ON public.entities FOR INSERT
  WITH CHECK (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Members can update household entities"
  ON public.entities FOR UPDATE
  USING (household_id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE TRIGGER update_entities_timestamp
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();
