import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { getTenantId } from "../lib/tenant";

const vocabularies = new Hono<{ Bindings: Env; Variables: Variables }>();
vocabularies.use("*", authMiddleware);

// GET /api/v1/vocabularies — List system + tenant vocabularies
vocabularies.get("/api/v1/vocabularies", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const type = c.req.query("type");
  const code = c.req.query("code");

  // RLS handles visibility: system vocabs (tenant_id IS NULL) are visible to all,
  // tenant vocabs are visible only to members of that tenant.
  let query = supabase.from("vocabularies").select("*");

  if (type) query = query.eq("vocabulary_type", type);
  if (code) query = query.eq("code", code);

  const { data, error } = await query.order("vocabulary_type").order("name");

  if (error) {
    return c.json({ detail: `Error fetching vocabularies: ${error.message}` }, 500);
  }

  return c.json(data);
});

// GET /api/v1/vocabularies/:id — Single vocabulary entry
vocabularies.get("/api/v1/vocabularies/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("vocabularies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ detail: "Vocabulary entry not found" }, 404);
  }

  return c.json(data);
});

// POST /api/v1/vocabularies — Create tenant vocabulary
vocabularies.post("/api/v1/vocabularies", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const tenantId = await getTenantId(c);
  if (!tenantId) {
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  let body: {
    vocabulary_type: string;
    code: string;
    name: string;
    description?: string;
    path?: string;
    properties?: Record<string, unknown>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.vocabulary_type || !body.code || !body.name?.trim()) {
    return c.json({ detail: "vocabulary_type, code, and name are required" }, 400);
  }

  const { data, error } = await supabase
    .from("vocabularies")
    .insert({
      tenant_id: tenantId,
      vocabulary_type: body.vocabulary_type,
      code: body.code,
      name: body.name.trim(),
      description: body.description ?? null,
      path: body.path ?? null,
      properties: body.properties ?? {},
      is_system: false, // Always force false from API
    })
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error creating vocabulary: ${error.message}` }, 400);
  }

  return c.json(data, 201);
});

// PUT /api/v1/vocabularies/:id — Update vocabulary (tenant only)
vocabularies.put("/api/v1/vocabularies/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  // Check if it's a system vocab
  const { data: existing } = await supabase
    .from("vocabularies")
    .select("is_system")
    .eq("id", id)
    .single();

  if (!existing) {
    return c.json({ detail: "Vocabulary entry not found" }, 404);
  }

  if (existing.is_system) {
    return c.json({ detail: "Cannot modify system vocabularies" }, 403);
  }

  let body: {
    name?: string;
    description?: string;
    path?: string;
    properties?: Record<string, unknown>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description;
  if (body.path !== undefined) updateData.path = body.path;
  if (body.properties !== undefined) updateData.properties = body.properties;

  if (Object.keys(updateData).length === 0) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("vocabularies")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error updating vocabulary: ${error.message}` }, 400);
  }

  return c.json(data);
});

// DELETE /api/v1/vocabularies/:id — Delete vocabulary (tenant only)
vocabularies.delete("/api/v1/vocabularies/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  // Check if it's a system vocab
  const { data: existing } = await supabase
    .from("vocabularies")
    .select("is_system")
    .eq("id", id)
    .single();

  if (!existing) {
    return c.json({ detail: "Vocabulary entry not found" }, 404);
  }

  if (existing.is_system) {
    return c.json({ detail: "Cannot delete system vocabularies" }, 403);
  }

  const { error } = await supabase
    .from("vocabularies")
    .delete()
    .eq("id", id);

  if (error) {
    return c.json({ detail: `Error deleting vocabulary: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default vocabularies;
