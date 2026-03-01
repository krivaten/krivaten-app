import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const relationships = new Hono<{ Bindings: Env; Variables: Variables }>();
relationships.use("*", authMiddleware);

const RELATIONSHIP_SELECT =
  "*, source:entities!source_id(id, name), target:entities!target_id(id, name)";

// GET /api/v1/relationships — List relationships with optional entity filter
relationships.get("/api/v1/relationships", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  let query = supabase
    .from("relationships")
    .select(RELATIONSHIP_SELECT)
    .eq("tenant_id", tenantId);

  const entityId = c.req.query("entity_id");
  if (entityId) {
    query = query.or(`source_id.eq.${entityId},target_id.eq.${entityId}`);
  }

  const type = c.req.query("type");
  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    return c.json(
      { detail: `Error fetching relationships: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

// POST /api/v1/relationships — Create relationship
relationships.post("/api/v1/relationships", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  let body: {
    source_id: string;
    target_id: string;
    type: string;
    label?: string;
    weight?: number;
    properties?: Record<string, unknown>;
    valid_from?: string;
    valid_to?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.source_id || !body.target_id || !body.type) {
    return c.json(
      { detail: "source_id, target_id, and type are required" },
      400,
    );
  }

  const { data, error } = await supabase
    .from("relationships")
    .insert({
      tenant_id: tenantId,
      source_id: body.source_id,
      target_id: body.target_id,
      type: body.type,
      label: body.label ?? null,
      weight: body.weight ?? 1.0,
      properties: body.properties ?? {},
      valid_from: body.valid_from ?? null,
      valid_to: body.valid_to ?? null,
    })
    .select(RELATIONSHIP_SELECT)
    .single();

  if (error) {
    return c.json(
      { detail: `Error creating relationship: ${error.message}` },
      400,
    );
  }

  return c.json(data, 201);
});

// DELETE /api/v1/relationships/:id — Delete relationship
relationships.delete("/api/v1/relationships/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", id);

  if (error) {
    return c.json(
      { detail: `Error deleting relationship: ${error.message}` },
      400,
    );
  }

  return c.body(null, 204);
});

export default relationships;
