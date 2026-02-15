import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireHouseholdId } from "../lib/household";

const relationships = new Hono<{ Bindings: Env; Variables: Variables }>();
relationships.use("*", authMiddleware);

// GET /api/relationships — List, optionally filter by entity_id
relationships.get("/api/relationships", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let query = supabase
    .from("relationships")
    .select("*, from_entity:entities!from_entity_id(id, name, type), to_entity:entities!to_entity_id(id, name, type)")
    .eq("household_id", householdId);

  const entityId = c.req.query("entity_id");
  if (entityId) {
    query = query.or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return c.json({ detail: `Error fetching relationships: ${error.message}` }, 500);
  }

  return c.json(data);
});

// POST /api/relationships — Create
relationships.post("/api/relationships", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let body: {
    from_entity_id: string;
    to_entity_id: string;
    relationship_type: string;
    properties?: Record<string, unknown>;
    valid_from?: string;
    valid_to?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.from_entity_id || !body.to_entity_id || !body.relationship_type) {
    return c.json({ detail: "from_entity_id, to_entity_id, and relationship_type are required" }, 400);
  }

  const { data, error } = await supabase
    .from("relationships")
    .insert({
      household_id: householdId,
      from_entity_id: body.from_entity_id,
      to_entity_id: body.to_entity_id,
      relationship_type: body.relationship_type,
      properties: body.properties ?? {},
      valid_from: body.valid_from ?? null,
      valid_to: body.valid_to ?? null,
    })
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error creating relationship: ${error.message}` }, 400);
  }

  return c.json(data, 201);
});

// DELETE /api/relationships/:id — Hard delete
relationships.delete("/api/relationships/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) {
    return c.json({ detail: `Error deleting relationship: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default relationships;
