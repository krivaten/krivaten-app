import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const entities = new Hono<{ Bindings: Env; Variables: Variables }>();
entities.use("*", authMiddleware);

const ENTITY_SELECT = "*, entity_type:entity_types!entity_type_id(*)";

/**
 * Resolve an entity_type code string to its UUID from entity_types table.
 */
async function resolveEntityTypeId(
  supabase: ReturnType<typeof createSupabaseClientWithAuth>,
  code: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("entity_types")
    .select("id")
    .eq("code", code)
    .single();
  return data?.id ?? null;
}

// GET /api/v1/entities — List entities with optional filters
entities.get("/api/v1/entities", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  let query = supabase
    .from("entities")
    .select(ENTITY_SELECT)
    .eq("tenant_id", tenantId);

  // Filter by entity type code
  const type = c.req.query("type");
  if (type) {
    const typeId = await resolveEntityTypeId(supabase, type);
    if (!typeId) {
      return c.json([]);
    }
    query = query.eq("entity_type_id", typeId);
  }

  // Filter by active status (default: only active)
  const active = c.req.query("active");
  if (active !== "false") {
    query = query.eq("is_active", true);
  }

  // Search by name
  const search = c.req.query("search");
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  // Filter by taxonomy path prefix
  const taxonomyPath = c.req.query("taxonomy_path");
  if (taxonomyPath) {
    query = query.like("taxonomy_path", `${taxonomyPath}%`);
  }

  const { data, error } = await query.order("name");

  if (error) {
    return c.json(
      { detail: `Error fetching entities: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

// GET /api/v1/entities/:id — Single entity with joined entity_type
entities.get("/api/v1/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("entities")
    .select(ENTITY_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ detail: "Entity not found" }, 404);
  }

  return c.json(data);
});

// POST /api/v1/entities — Create entity
entities.post("/api/v1/entities", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  let body: {
    entity_type_id?: string;
    entity_type?: string;
    name: string;
    description?: string;
    external_id?: string;
    taxonomy_path?: string;
    attributes?: Record<string, unknown>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.name?.trim()) {
    return c.json({ detail: "name is required" }, 400);
  }

  // Resolve entity_type_id from code if not provided directly
  let entityTypeId = body.entity_type_id;
  if (!entityTypeId && body.entity_type) {
    entityTypeId =
      (await resolveEntityTypeId(supabase, body.entity_type)) ?? undefined;
    if (!entityTypeId) {
      return c.json(
        { detail: `Invalid entity type: "${body.entity_type}"` },
        400,
      );
    }
  }

  if (!entityTypeId) {
    return c.json(
      { detail: "entity_type_id or entity_type is required" },
      400,
    );
  }

  const { data, error } = await supabase
    .from("entities")
    .insert({
      tenant_id: tenantId,
      entity_type_id: entityTypeId,
      name: body.name.trim(),
      description: body.description ?? null,
      external_id: body.external_id ?? null,
      taxonomy_path: body.taxonomy_path ?? null,
      attributes: body.attributes ?? {},
    })
    .select(ENTITY_SELECT)
    .single();

  if (error) {
    return c.json(
      { detail: `Error creating entity: ${error.message}` },
      400,
    );
  }

  return c.json(data, 201);
});

// PUT /api/v1/entities/:id — Update entity
entities.put("/api/v1/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let body: {
    name?: string;
    description?: string;
    attributes?: Record<string, unknown>;
    taxonomy_path?: string;
    is_active?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description;
  if (body.attributes !== undefined) updateData.attributes = body.attributes;
  if (body.taxonomy_path !== undefined)
    updateData.taxonomy_path = body.taxonomy_path;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  if (Object.keys(updateData).length === 0) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("entities")
    .update(updateData)
    .eq("id", id)
    .select(ENTITY_SELECT)
    .single();

  if (error) {
    return c.json(
      { detail: `Error updating entity: ${error.message}` },
      400,
    );
  }

  return c.json(data);
});

// DELETE /api/v1/entities/:id — Soft delete (set is_active=false)
entities.delete("/api/v1/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { error } = await supabase
    .from("entities")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return c.json(
      { detail: `Error archiving entity: ${error.message}` },
      400,
    );
  }

  return c.body(null, 204);
});

// GET /api/v1/entities/:id/relationships — Relationships for this entity
entities.get("/api/v1/entities/:id/relationships", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("relationships")
    .select(
      "*, source:entities!source_id(id, name), target:entities!target_id(id, name)",
    )
    .or(`source_id.eq.${id},target_id.eq.${id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return c.json(
      { detail: `Error fetching relationships: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

// GET /api/v1/entities/:id/trackers — Effective trackers for this entity
entities.get("/api/v1/entities/:id/trackers", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  // Get entity to find its type
  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("entity_type_id")
    .eq("id", id)
    .single();

  if (entityError || !entity) {
    return c.json({ detail: "Entity not found" }, 404);
  }

  // Get default trackers for the entity type
  const { data: defaults } = await supabase
    .from("entity_type_trackers")
    .select("tracker_id, position, tracker:trackers(*, fields:tracker_fields(*))")
    .eq("entity_type_id", entity.entity_type_id)
    .order("position");

  // Get per-entity overrides
  const { data: overrides } = await supabase
    .from("entity_trackers")
    .select("tracker_id, is_enabled, tracker:trackers(*, fields:tracker_fields(*))")
    .eq("entity_id", id);

  // Build override map
  const overrideMap = new Map<string, { is_enabled: boolean; tracker: unknown }>();
  for (const o of overrides || []) {
    overrideMap.set(o.tracker_id, { is_enabled: o.is_enabled, tracker: o.tracker });
  }

  // Deduplicate defaults by tracker_id (tenant row overrides system)
  const defaultRows = defaults || [];
  const deduped = new Map<string, (typeof defaultRows)[number]>();
  for (const d of defaultRows) {
    const existing = deduped.get(d.tracker_id);
    if (!existing || (d as Record<string, unknown>).tenant_id !== null) {
      deduped.set(d.tracker_id, d);
    }
  }
  const dedupedDefaults = Array.from(deduped.values());

  // Merge: defaults + overrides
  const result: Array<{ tracker: unknown; is_default: boolean; is_enabled: boolean }> = [];

  // Add default trackers
  for (const d of dedupedDefaults) {
    const override = overrideMap.get(d.tracker_id);
    result.push({
      tracker: d.tracker,
      is_default: true,
      is_enabled: override ? override.is_enabled : true,
    });
    overrideMap.delete(d.tracker_id);
  }

  // Add non-default overrides that are enabled
  for (const [, override] of overrideMap) {
    if (override.is_enabled) {
      result.push({
        tracker: override.tracker,
        is_default: false,
        is_enabled: true,
      });
    }
  }

  return c.json(result);
});

// PUT /api/v1/entities/:id/trackers — Upsert entity tracker overrides
entities.put("/api/v1/entities/:id/trackers", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let body: Array<{ tracker_id: string; is_enabled: boolean }>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body)) {
    return c.json({ detail: "Body must be an array of { tracker_id, is_enabled }" }, 400);
  }

  const rows = body.map((item) => ({
    entity_id: id,
    tracker_id: item.tracker_id,
    is_enabled: item.is_enabled,
  }));

  const { error } = await supabase
    .from("entity_trackers")
    .upsert(rows, { onConflict: "entity_id,tracker_id" });

  if (error) {
    return c.json(
      { detail: `Error updating entity trackers: ${error.message}` },
      400,
    );
  }

  return c.json({ success: true });
});

// GET /api/v1/entities/:id/related — Related entities via graph traversal RPC
entities.get("/api/v1/entities/:id/related", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const maxDepth = parseInt(c.req.query("max_depth") || "2");
  const typesParam = c.req.query("relationship_types");
  const relationshipTypes = typesParam ? typesParam.split(",") : null;

  const { data, error } = await supabase.rpc("get_related_entities", {
    p_entity_id: id,
    p_max_depth: maxDepth,
    p_relationship_types: relationshipTypes,
  });

  if (error) {
    return c.json(
      { detail: `Error fetching related entities: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

export default entities;
