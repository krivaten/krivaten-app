-- Add household columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_profiles_household_id ON public.profiles(household_id);

-- Household RLS: members can view their own household
CREATE POLICY "Members can view own household"
  ON public.households FOR SELECT
  USING (
    id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Any authenticated user can create a household
CREATE POLICY "Authenticated users can create households"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Members can update their household
CREATE POLICY "Members can update own household"
  ON public.households FOR UPDATE
  USING (
    id IN (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Users can view other profiles in their household
CREATE POLICY "Users can view household members"
  ON public.profiles FOR SELECT
  USING (
    household_id IS NOT NULL
    AND household_id = (
      SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
