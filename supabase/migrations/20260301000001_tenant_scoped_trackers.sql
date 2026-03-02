-- ============================================================================
-- Migration: Add tenant-scoped custom trackers
-- Adds tenant_id to trackers and entity_type_trackers, updates RLS policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- PART 1: Add tenant_id to trackers
-- --------------------------------------------------------------------------
ALTER TABLE public.trackers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Replace global unique code constraint with partial indexes
ALTER TABLE public.trackers DROP CONSTRAINT trackers_code_key;
CREATE UNIQUE INDEX idx_trackers_system_code ON public.trackers(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_trackers_tenant_code ON public.trackers(tenant_id, code) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_trackers_tenant_id ON public.trackers(tenant_id);

-- Add update timestamp trigger (missing from original migration)
CREATE TRIGGER update_trackers_timestamp
  BEFORE UPDATE ON public.trackers
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- --------------------------------------------------------------------------
-- PART 2: RLS policies on trackers (replace SELECT-only with full CRUD)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view trackers" ON public.trackers;

CREATE POLICY "Users can view trackers"
  ON public.trackers FOR SELECT
  USING (auth.uid() IS NOT NULL AND (tenant_id IS NULL OR tenant_id = public.get_my_tenant_id()));

CREATE POLICY "Members can insert tenant trackers"
  ON public.trackers FOR INSERT
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

CREATE POLICY "Members can update tenant trackers"
  ON public.trackers FOR UPDATE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

CREATE POLICY "Members can delete tenant trackers"
  ON public.trackers FOR DELETE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

-- --------------------------------------------------------------------------
-- PART 3: RLS policies on tracker_fields (replace SELECT-only with full CRUD)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view tracker fields" ON public.tracker_fields;

CREATE POLICY "Users can view tracker fields"
  ON public.tracker_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trackers t
    WHERE t.id = tracker_fields.tracker_id
    AND (t.tenant_id IS NULL OR t.tenant_id = public.get_my_tenant_id())
  ));

CREATE POLICY "Members can insert tracker fields"
  ON public.tracker_fields FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trackers t
    WHERE t.id = tracker_fields.tracker_id
    AND t.tenant_id IS NOT NULL AND t.tenant_id = public.get_my_tenant_id() AND t.is_system = FALSE
  ));

CREATE POLICY "Members can update tracker fields"
  ON public.tracker_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trackers t
    WHERE t.id = tracker_fields.tracker_id
    AND t.tenant_id IS NOT NULL AND t.tenant_id = public.get_my_tenant_id() AND t.is_system = FALSE
  ));

CREATE POLICY "Members can delete tracker fields"
  ON public.tracker_fields FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trackers t
    WHERE t.id = tracker_fields.tracker_id
    AND t.tenant_id IS NOT NULL AND t.tenant_id = public.get_my_tenant_id() AND t.is_system = FALSE
  ));

-- --------------------------------------------------------------------------
-- PART 4: Add tenant_id to entity_type_trackers
-- --------------------------------------------------------------------------
ALTER TABLE public.entity_type_trackers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.entity_type_trackers DROP CONSTRAINT entity_type_trackers_entity_type_id_tracker_id_key;
CREATE UNIQUE INDEX idx_ett_system_unique ON public.entity_type_trackers(entity_type_id, tracker_id) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_ett_tenant_unique ON public.entity_type_trackers(tenant_id, entity_type_id, tracker_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_ett_tenant_id ON public.entity_type_trackers(tenant_id);

DROP POLICY IF EXISTS "Anyone can view entity type trackers" ON public.entity_type_trackers;

CREATE POLICY "Users can view entity type trackers"
  ON public.entity_type_trackers FOR SELECT
  USING (auth.uid() IS NOT NULL AND (tenant_id IS NULL OR tenant_id = public.get_my_tenant_id()));

CREATE POLICY "Members can insert tenant entity type trackers"
  ON public.entity_type_trackers FOR INSERT
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can update tenant entity type trackers"
  ON public.entity_type_trackers FOR UPDATE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can delete tenant entity type trackers"
  ON public.entity_type_trackers FOR DELETE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());
