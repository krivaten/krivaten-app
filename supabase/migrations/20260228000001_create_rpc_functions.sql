-- ============================================================================
-- RPC Functions for Metric-Based Schema
-- ============================================================================

-- --------------------------------------------------------------------------
-- get_related_entities: Recursive graph traversal via relationships table
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_related_entities(
  p_entity_id UUID,
  p_max_depth INT DEFAULT 2,
  p_relationship_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,
  depth INT,
  relationship_id UUID,
  relationship_type TEXT,
  direction TEXT
) AS $$
WITH RECURSIVE traversal AS (
  SELECT
    CASE WHEN r.source_id = p_entity_id THEN r.target_id ELSE r.source_id END AS entity_id,
    1 AS depth,
    r.id AS relationship_id,
    r.type AS relationship_type,
    CASE WHEN r.source_id = p_entity_id THEN 'outgoing' ELSE 'incoming' END AS direction,
    ARRAY[p_entity_id, CASE WHEN r.source_id = p_entity_id THEN r.target_id ELSE r.source_id END] AS visited
  FROM public.relationships r
  WHERE (r.source_id = p_entity_id OR r.target_id = p_entity_id)
    AND r.tenant_id = public.get_my_tenant_id()
    AND (p_relationship_types IS NULL OR r.type = ANY(p_relationship_types))
    AND (r.valid_to IS NULL OR r.valid_to > NOW())
  UNION ALL
  SELECT
    CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END,
    t.depth + 1,
    r.id,
    r.type,
    CASE WHEN r.source_id = t.entity_id THEN 'outgoing' ELSE 'incoming' END,
    t.visited || CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END
  FROM traversal t
  JOIN public.relationships r ON (r.source_id = t.entity_id OR r.target_id = t.entity_id)
  WHERE t.depth < p_max_depth
    AND r.tenant_id = public.get_my_tenant_id()
    AND (p_relationship_types IS NULL OR r.type = ANY(p_relationship_types))
    AND (r.valid_to IS NULL OR r.valid_to > NOW())
    AND NOT (CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END = ANY(t.visited))
)
SELECT DISTINCT ON (t.entity_id)
  t.entity_id, ent.name, et.code, t.depth, t.relationship_id, t.relationship_type, t.direction
FROM traversal t
JOIN public.entities ent ON ent.id = t.entity_id
JOIN public.entity_types et ON et.id = ent.entity_type_id
ORDER BY t.entity_id, t.depth;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------------
-- search_taxonomy: Taxonomy path prefix search
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_taxonomy(
  p_path_prefix TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,
  taxonomy_path TEXT
) AS $$
  SELECT e.id, e.name, et.code, e.taxonomy_path
  FROM public.entities e
  JOIN public.entity_types et ON et.id = e.entity_type_id
  WHERE e.tenant_id = public.get_my_tenant_id()
    AND e.taxonomy_path LIKE (p_path_prefix || '%')
    AND e.is_active = TRUE
  ORDER BY e.taxonomy_path, e.name
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
