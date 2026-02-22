-- Graph traversal: find entities related to a starting entity via edges
CREATE OR REPLACE FUNCTION public.get_related_entities(
  p_entity_id UUID,
  p_max_depth INT DEFAULT 2,
  p_edge_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,
  depth INT,
  edge_id UUID,
  edge_type TEXT,
  direction TEXT
) AS $$
WITH RECURSIVE traversal AS (
  SELECT
    CASE WHEN e.source_id = p_entity_id THEN e.target_id ELSE e.source_id END AS entity_id,
    1 AS depth,
    e.id AS edge_id,
    e.edge_type,
    CASE WHEN e.source_id = p_entity_id THEN 'outgoing' ELSE 'incoming' END AS direction,
    ARRAY[p_entity_id, CASE WHEN e.source_id = p_entity_id THEN e.target_id ELSE e.source_id END] AS visited
  FROM public.edges e
  WHERE (e.source_id = p_entity_id OR e.target_id = p_entity_id)
    AND e.tenant_id = public.get_my_tenant_id()
    AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
    AND (e.valid_to IS NULL OR e.valid_to > NOW())

  UNION ALL

  SELECT
    CASE WHEN e.source_id = t.entity_id THEN e.target_id ELSE e.source_id END,
    t.depth + 1,
    e.id,
    e.edge_type,
    CASE WHEN e.source_id = t.entity_id THEN 'outgoing' ELSE 'incoming' END,
    t.visited || CASE WHEN e.source_id = t.entity_id THEN e.target_id ELSE e.source_id END
  FROM traversal t
  JOIN public.edges e ON (e.source_id = t.entity_id OR e.target_id = t.entity_id)
  WHERE t.depth < p_max_depth
    AND e.tenant_id = public.get_my_tenant_id()
    AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
    AND (e.valid_to IS NULL OR e.valid_to > NOW())
    AND NOT (CASE WHEN e.source_id = t.entity_id THEN e.target_id ELSE e.source_id END = ANY(t.visited))
)
SELECT DISTINCT ON (t.entity_id)
  t.entity_id,
  ent.name AS entity_name,
  v.code AS entity_type,
  t.depth,
  t.edge_id,
  t.edge_type,
  t.direction
FROM traversal t
JOIN public.entities ent ON ent.id = t.entity_id
JOIN public.vocabularies v ON v.id = ent.entity_type_id
ORDER BY t.entity_id, t.depth;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Time-series query for an entity's observations
CREATE OR REPLACE FUNCTION public.get_time_series(
  p_entity_id UUID,
  p_variable_code TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 1000
)
RETURNS TABLE (
  observation_id UUID,
  observed_at TIMESTAMPTZ,
  variable_code TEXT,
  variable_name TEXT,
  value_numeric NUMERIC,
  value_text TEXT,
  value_boolean BOOLEAN,
  unit_code TEXT
) AS $$
  SELECT
    o.id,
    o.observed_at,
    vv.code,
    vv.name,
    o.value_numeric,
    o.value_text,
    o.value_boolean,
    vu.code
  FROM public.observations o
  LEFT JOIN public.vocabularies vv ON vv.id = o.variable_id
  LEFT JOIN public.vocabularies vu ON vu.id = o.unit_id
  WHERE o.subject_id = p_entity_id
    AND o.tenant_id = public.get_my_tenant_id()
    AND (p_variable_code IS NULL OR vv.code = p_variable_code)
    AND (p_from IS NULL OR o.observed_at >= p_from)
    AND (p_to IS NULL OR o.observed_at <= p_to)
  ORDER BY o.observed_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Taxonomy search: find entities by path prefix
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
  SELECT e.id, e.name, v.code, e.taxonomy_path
  FROM public.entities e
  JOIN public.vocabularies v ON v.id = e.entity_type_id
  WHERE e.tenant_id = public.get_my_tenant_id()
    AND e.taxonomy_path LIKE (p_path_prefix || '%')
    AND e.is_active = TRUE
  ORDER BY e.taxonomy_path, e.name
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
