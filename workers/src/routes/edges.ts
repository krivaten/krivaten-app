import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const edges = new Hono<{ Bindings: Env; Variables: Variables }>();
edges.use("*", authMiddleware);

// GET /api/v1/edges — List edges with optional filters
edges.get("/api/v1/edges", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  let query = supabase
    .from("edges")
    .select("*, source:entities!source_id(id, name), target:entities!target_id(id, name)")
    .eq("tenant_id", tenantId);

  // Filter by entity (matches source_id OR target_id)
  const entityId = c.req.query("entity_id");
  if (entityId) {
    query = query.or(`source_id.eq.${entityId},target_id.eq.${entityId}`);
  }

  const edgeType = c.req.query("edge_type");
  if (edgeType) {
    query = query.eq("edge_type", edgeType);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return c.json({ detail: `Error fetching edges: ${error.message}` }, 500);
  }

  return c.json(data);
});

// POST /api/v1/edges — Create edge
edges.post("/api/v1/edges", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  let body: {
    source_id: string;
    target_id: string;
    edge_type: string;
    edge_type_id?: string;
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

  if (!body.source_id || !body.target_id || !body.edge_type) {
    return c.json({ detail: "source_id, target_id, and edge_type are required" }, 400);
  }

  // Optionally resolve edge_type_id from vocabulary
  let edgeTypeId = body.edge_type_id ?? null;
  if (!edgeTypeId) {
    const { data: vocab } = await supabase
      .from("vocabularies")
      .select("id")
      .eq("vocabulary_type", "edge_type")
      .eq("code", body.edge_type)
      .single();
    if (vocab) {
      edgeTypeId = vocab.id;
    }
  }

  const { data, error } = await supabase
    .from("edges")
    .insert({
      tenant_id: tenantId,
      source_id: body.source_id,
      target_id: body.target_id,
      edge_type: body.edge_type,
      edge_type_id: edgeTypeId,
      label: body.label ?? null,
      weight: body.weight ?? 1.0,
      properties: body.properties ?? {},
      valid_from: body.valid_from ?? null,
      valid_to: body.valid_to ?? null,
    })
    .select("*, source:entities!source_id(id, name), target:entities!target_id(id, name)")
    .single();

  if (error) {
    return c.json({ detail: `Error creating edge: ${error.message}` }, 400);
  }

  return c.json(data, 201);
});

// DELETE /api/v1/edges/:id — Hard delete edge
edges.delete("/api/v1/edges/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { error } = await supabase
    .from("edges")
    .delete()
    .eq("id", id);

  if (error) {
    return c.json({ detail: `Error deleting edge: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default edges;
