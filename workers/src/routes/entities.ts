import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireHouseholdId } from "../lib/household";

const entities = new Hono<{ Bindings: Env; Variables: Variables }>();
entities.use("*", authMiddleware);

// GET /api/entities — List entities with optional filters
entities.get("/api/entities", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let query = supabase
    .from("entities")
    .select("*")
    .eq("household_id", householdId);

  const type = c.req.query("type");
  if (type) query = query.eq("type", type);

  const parentId = c.req.query("parent_id");
  if (parentId) query = query.eq("parent_id", parentId);

  if (c.req.query("archived") !== "true") {
    query = query.eq("archived", false);
  }

  const { data, error } = await query.order("name");

  if (error) {
    return c.json({ detail: `Error fetching entities: ${error.message}` }, 500);
  }

  return c.json(data);
});

// GET /api/entities/:id — Single entity
entities.get("/api/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  const { data, error } = await supabase
    .from("entities")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .single();

  if (error) {
    return c.json({ detail: "Entity not found" }, 404);
  }

  return c.json(data);
});

// POST /api/entities — Create entity
entities.post("/api/entities", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let body: { type: string; name: string; parent_id?: string; properties?: Record<string, unknown> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.type || !body.name?.trim()) {
    return c.json({ detail: "type and name are required" }, 400);
  }

  const { data, error } = await supabase
    .from("entities")
    .insert({
      household_id: householdId,
      type: body.type,
      name: body.name.trim(),
      parent_id: body.parent_id ?? null,
      properties: body.properties ?? {},
    })
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error creating entity: ${error.message}` }, 400);
  }

  return c.json(data, 201);
});

// PUT /api/entities/:id — Update entity
entities.put("/api/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let body: { name?: string; parent_id?: string | null; properties?: Record<string, unknown>; archived?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;
  if (body.properties !== undefined) updateData.properties = body.properties;
  if (body.archived !== undefined) updateData.archived = body.archived;

  if (Object.keys(updateData).length === 0) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("entities")
    .update(updateData)
    .eq("id", id)
    .eq("household_id", householdId)
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error updating entity: ${error.message}` }, 400);
  }

  return c.json(data);
});

// DELETE /api/entities/:id — Soft delete (archive)
entities.delete("/api/entities/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  const { error } = await supabase
    .from("entities")
    .update({ archived: true })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) {
    return c.json({ detail: `Error archiving entity: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default entities;
