import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const entities = new Hono<{ Bindings: Env; Variables: Variables }>();
entities.use("*", authMiddleware);

/**
 * Resolve an entity_type code string to its vocabulary UUID.
 * Returns null if not found.
 */
async function resolveEntityTypeId(
  supabase: ReturnType<typeof createSupabaseClientWithAuth>,
  code: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("vocabularies")
    .select("id")
    .eq("vocabulary_type", "entity_type")
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
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  let query = supabase
    .from("entities")
    .select("*, entity_type:vocabularies!entity_type_id(*)")
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
    return c.json({ detail: `Error fetching entities: ${error.message}` }, 500);
  }

  return c.json(data);
});

// GET /api/v1/entities/:id — Single entity with joined entity_type
entities.get("/api/v1/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("entities")
    .select("*, entity_type:vocabularies!entity_type_id(*)")
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
    return c.json({ detail: "You must belong to a workspace" }, 400);
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
    entityTypeId = await resolveEntityTypeId(supabase, body.entity_type) ?? undefined;
    if (!entityTypeId) {
      return c.json({ detail: `Invalid entity type: "${body.entity_type}"` }, 400);
    }
  }

  if (!entityTypeId) {
    return c.json({ detail: "entity_type_id or entity_type is required" }, 400);
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
    .select("*, entity_type:vocabularies!entity_type_id(*)")
    .single();

  if (error) {
    return c.json({ detail: `Error creating entity: ${error.message}` }, 400);
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
  if (body.taxonomy_path !== undefined) updateData.taxonomy_path = body.taxonomy_path;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  if (Object.keys(updateData).length === 0) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("entities")
    .update(updateData)
    .eq("id", id)
    .select("*, entity_type:vocabularies!entity_type_id(*)")
    .single();

  if (error) {
    return c.json({ detail: `Error updating entity: ${error.message}` }, 400);
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
    return c.json({ detail: `Error archiving entity: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default entities;
