-- Fix recursive RLS on profiles: the "Users can view household members" policy
-- does a subquery on profiles which triggers RLS again, causing infinite recursion.

-- Create a SECURITY DEFINER function to safely get the current user's household_id
CREATE OR REPLACE FUNCTION public.get_my_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view household members" ON public.profiles;

-- Recreate using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Users can view household members"
  ON public.profiles FOR SELECT
  USING (
    household_id IS NOT NULL
    AND household_id = public.get_my_household_id()
  );

-- Also fix the household policies that have the same subquery pattern
DROP POLICY IF EXISTS "Members can view own household" ON public.households;
CREATE POLICY "Members can view own household"
  ON public.households FOR SELECT
  USING (id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can update own household" ON public.households;
CREATE POLICY "Members can update own household"
  ON public.households FOR UPDATE
  USING (id = public.get_my_household_id());

-- Fix entity policies
DROP POLICY IF EXISTS "Members can view household entities" ON public.entities;
CREATE POLICY "Members can view household entities"
  ON public.entities FOR SELECT
  USING (household_id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can insert household entities" ON public.entities;
CREATE POLICY "Members can insert household entities"
  ON public.entities FOR INSERT
  WITH CHECK (household_id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can update household entities" ON public.entities;
CREATE POLICY "Members can update household entities"
  ON public.entities FOR UPDATE
  USING (household_id = public.get_my_household_id());

-- Fix observation policies
DROP POLICY IF EXISTS "Members can view household observations" ON public.observations;
CREATE POLICY "Members can view household observations"
  ON public.observations FOR SELECT
  USING (household_id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can insert household observations" ON public.observations;
CREATE POLICY "Members can insert household observations"
  ON public.observations FOR INSERT
  WITH CHECK (
    household_id = public.get_my_household_id()
    AND observer_id = auth.uid()
  );

-- Fix relationship policies
DROP POLICY IF EXISTS "Members can view household relationships" ON public.relationships;
CREATE POLICY "Members can view household relationships"
  ON public.relationships FOR SELECT
  USING (household_id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can insert household relationships" ON public.relationships;
CREATE POLICY "Members can insert household relationships"
  ON public.relationships FOR INSERT
  WITH CHECK (household_id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can update household relationships" ON public.relationships;
CREATE POLICY "Members can update household relationships"
  ON public.relationships FOR UPDATE
  USING (household_id = public.get_my_household_id());

DROP POLICY IF EXISTS "Members can delete household relationships" ON public.relationships;
CREATE POLICY "Members can delete household relationships"
  ON public.relationships FOR DELETE
  USING (household_id = public.get_my_household_id());
