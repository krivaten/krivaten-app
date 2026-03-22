-- ============================================================================
-- Migration: Add tenant-scoped custom metrics
-- Adds tenant_id to metrics and entity_type_metrics, updates RLS policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- PART 1: Add tenant_id to metrics
-- --------------------------------------------------------------------------
ALTER TABLE public.metrics ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Replace global unique code constraint with partial indexes
ALTER TABLE public.metrics DROP CONSTRAINT metrics_code_key;
CREATE UNIQUE INDEX idx_metrics_system_code ON public.metrics(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_metrics_tenant_code ON public.metrics(tenant_id, code) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_metrics_tenant_id ON public.metrics(tenant_id);

-- Add update timestamp trigger (missing from original migration)
CREATE TRIGGER update_metrics_timestamp
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- --------------------------------------------------------------------------
-- PART 2: RLS policies on metrics (replace SELECT-only with full CRUD)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view metrics" ON public.metrics;

CREATE POLICY "Users can view metrics"
  ON public.metrics FOR SELECT
  USING (auth.uid() IS NOT NULL AND (tenant_id IS NULL OR tenant_id = public.get_my_tenant_id()));

CREATE POLICY "Members can insert tenant metrics"
  ON public.metrics FOR INSERT
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

CREATE POLICY "Members can update tenant metrics"
  ON public.metrics FOR UPDATE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

CREATE POLICY "Members can delete tenant metrics"
  ON public.metrics FOR DELETE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND is_system = FALSE);

-- --------------------------------------------------------------------------
-- PART 3: RLS policies on metric_fields (replace SELECT-only with full CRUD)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view metric fields" ON public.metric_fields;

CREATE POLICY "Users can view metric fields"
  ON public.metric_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.metrics t
    WHERE t.id = metric_fields.metric_id
    AND (t.tenant_id IS NULL OR t.tenant_id = public.get_my_tenant_id())
  ));

CREATE POLICY "Members can insert metric fields"
  ON public.metric_fields FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.metrics t
    WHERE t.id = metric_fields.metric_id
    AND t.tenant_id IS NOT NULL AND t.tenant_id = public.get_my_tenant_id() AND t.is_system = FALSE
  ));

CREATE POLICY "Members can update metric fields"
  ON public.metric_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.metrics t
    WHERE t.id = metric_fields.metric_id
    AND t.tenant_id IS NOT NULL AND t.tenant_id = public.get_my_tenant_id() AND t.is_system = FALSE
  ));

CREATE POLICY "Members can delete metric fields"
  ON public.metric_fields FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.metrics t
    WHERE t.id = metric_fields.metric_id
    AND t.tenant_id IS NOT NULL AND t.tenant_id = public.get_my_tenant_id() AND t.is_system = FALSE
  ));

-- --------------------------------------------------------------------------
-- PART 4: Add tenant_id to entity_type_metrics
-- --------------------------------------------------------------------------
ALTER TABLE public.entity_type_metrics ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.entity_type_metrics DROP CONSTRAINT entity_type_metrics_entity_type_id_metric_id_key;
CREATE UNIQUE INDEX idx_etm_system_unique ON public.entity_type_metrics(entity_type_id, metric_id) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_etm_tenant_unique ON public.entity_type_metrics(tenant_id, entity_type_id, metric_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_etm_tenant_id ON public.entity_type_metrics(tenant_id);

DROP POLICY IF EXISTS "Anyone can view entity type metrics" ON public.entity_type_metrics;

CREATE POLICY "Users can view entity type metrics"
  ON public.entity_type_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL AND (tenant_id IS NULL OR tenant_id = public.get_my_tenant_id()));

CREATE POLICY "Members can insert tenant entity type metrics"
  ON public.entity_type_metrics FOR INSERT
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can update tenant entity type metrics"
  ON public.entity_type_metrics FOR UPDATE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());

CREATE POLICY "Members can delete tenant entity type metrics"
  ON public.entity_type_metrics FOR DELETE
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_my_tenant_id());
