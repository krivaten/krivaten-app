-- ============================================================================
-- Migration: Tracker-Based Data Model Redesign
-- Drops old vocabulary-based tables and creates new tracker-based schema
-- ============================================================================

-- ============================================================================
-- PART 1: Drop Old Tables and Functions
-- ============================================================================

-- Drop old RPC functions
DROP FUNCTION IF EXISTS public.get_related_entities(UUID, INT, TEXT[]);
DROP FUNCTION IF EXISTS public.get_time_series(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS public.search_taxonomy(TEXT, INT);

-- Drop old tables in FK-safe order
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.observations CASCADE;
DROP TABLE IF EXISTS public.edges CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;
DROP TABLE IF EXISTS public.vocabularies CASCADE;

-- ============================================================================
-- PART 2: Create New Tables
-- ============================================================================

-- --------------------------------------------------------------------------
-- entity_types: Global catalog of entity types
-- --------------------------------------------------------------------------
CREATE TABLE public.entity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entity_types_code ON public.entity_types(code);

ALTER TABLE public.entity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entity types"
  ON public.entity_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- trackers: Observation templates with typed fields
-- --------------------------------------------------------------------------
CREATE TABLE public.trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trackers_code ON public.trackers(code);

ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trackers"
  ON public.trackers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- tracker_fields: Field definitions for each tracker
-- --------------------------------------------------------------------------
CREATE TABLE public.tracker_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'number', 'boolean', 'single_select', 'multi_select', 'textarea', 'datetime'
  )),
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tracker_id, code)
);

CREATE INDEX idx_tracker_fields_tracker ON public.tracker_fields(tracker_id);

ALTER TABLE public.tracker_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracker fields"
  ON public.tracker_fields FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- entity_type_trackers: Default tracker assignments per entity type
-- --------------------------------------------------------------------------
CREATE TABLE public.entity_type_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type_id UUID NOT NULL REFERENCES public.entity_types(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type_id, tracker_id)
);

CREATE INDEX idx_ett_entity_type ON public.entity_type_trackers(entity_type_id);
CREATE INDEX idx_ett_tracker ON public.entity_type_trackers(tracker_id);

ALTER TABLE public.entity_type_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entity type trackers"
  ON public.entity_type_trackers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- entities: Things being tracked (re-created with FK to entity_types)
-- --------------------------------------------------------------------------
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type_id UUID NOT NULL REFERENCES public.entity_types(id),
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
  ON public.entities FOR SELECT USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Members can insert tenant entities"
  ON public.entities FOR INSERT WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Members can update tenant entities"
  ON public.entities FOR UPDATE USING (tenant_id = public.get_my_tenant_id());

-- --------------------------------------------------------------------------
-- entity_trackers: Per-entity tracker overrides
-- --------------------------------------------------------------------------
CREATE TABLE public.entity_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_id, tracker_id)
);

CREATE INDEX idx_entity_trackers_entity ON public.entity_trackers(entity_id);

ALTER TABLE public.entity_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view entity trackers"
  ON public.entity_trackers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = entity_trackers.entity_id AND e.tenant_id = public.get_my_tenant_id()
  ));
CREATE POLICY "Members can insert entity trackers"
  ON public.entity_trackers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = entity_trackers.entity_id AND e.tenant_id = public.get_my_tenant_id()
  ));
CREATE POLICY "Members can update entity trackers"
  ON public.entity_trackers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = entity_trackers.entity_id AND e.tenant_id = public.get_my_tenant_id()
  ));
CREATE POLICY "Members can delete entity trackers"
  ON public.entity_trackers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = entity_trackers.entity_id AND e.tenant_id = public.get_my_tenant_id()
  ));

-- --------------------------------------------------------------------------
-- observations: Structured measurements with JSONB field_values
-- --------------------------------------------------------------------------
CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES public.trackers(id),
  observer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  field_values JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_obs_tenant_id ON public.observations(tenant_id);
CREATE INDEX idx_obs_entity_id ON public.observations(entity_id);
CREATE INDEX idx_obs_tracker_id ON public.observations(tracker_id);
CREATE INDEX idx_obs_observer_id ON public.observations(observer_id);
CREATE INDEX idx_obs_observed_at ON public.observations(tenant_id, observed_at DESC);
CREATE INDEX idx_obs_entity_tracker ON public.observations(entity_id, tracker_id);
CREATE INDEX idx_obs_field_values ON public.observations USING GIN(field_values);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant observations"
  ON public.observations FOR SELECT USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Members can insert tenant observations"
  ON public.observations FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND observer_id = auth.uid());
CREATE POLICY "Observers can delete own observations"
  ON public.observations FOR DELETE USING (observer_id = auth.uid());

-- --------------------------------------------------------------------------
-- relationships: Simplified directed relationships between entities
-- --------------------------------------------------------------------------
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  weight NUMERIC DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rel_tenant_id ON public.relationships(tenant_id);
CREATE INDEX idx_rel_source ON public.relationships(source_id);
CREATE INDEX idx_rel_target ON public.relationships(target_id);
CREATE INDEX idx_rel_type ON public.relationships(tenant_id, type);
CREATE INDEX idx_rel_active ON public.relationships(source_id, type) WHERE valid_to IS NULL;

CREATE TRIGGER update_relationships_timestamp
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant relationships"
  ON public.relationships FOR SELECT USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Members can insert tenant relationships"
  ON public.relationships FOR INSERT WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Members can update tenant relationships"
  ON public.relationships FOR UPDATE USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Members can delete tenant relationships"
  ON public.relationships FOR DELETE USING (tenant_id = public.get_my_tenant_id());

-- --------------------------------------------------------------------------
-- audit_log: Action history per tenant (re-created)
-- --------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_table ON public.audit_log(table_name, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant audit logs"
  ON public.audit_log FOR SELECT USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
