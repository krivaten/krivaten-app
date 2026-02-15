import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireHouseholdId } from "../lib/household";

const observations = new Hono<{ Bindings: Env; Variables: Variables }>();
observations.use("*", authMiddleware);

// GET /api/observations — List with filters and pagination
observations.get("/api/observations", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  const page = parseInt(c.req.query("page") || "1");
  const perPage = Math.min(parseInt(c.req.query("per_page") || "50"), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("observations")
    .select("*, entity:entities(id, name, type)", { count: "exact" })
    .eq("household_id", householdId);

  const entityId = c.req.query("entity_id");
  if (entityId) query = query.eq("entity_id", entityId);

  const category = c.req.query("category");
  if (category) query = query.eq("category", category);

  const fromDate = c.req.query("from");
  if (fromDate) query = query.gte("observed_at", fromDate);

  const toDate = c.req.query("to");
  if (toDate) query = query.lte("observed_at", toDate);

  const tags = c.req.query("tags");
  if (tags) query = query.contains("tags", tags.split(","));

  const { data, error, count } = await query
    .order("observed_at", { ascending: false })
    .range(from, to);

  if (error) {
    return c.json({ detail: `Error fetching observations: ${error.message}` }, 500);
  }

  return c.json({ data, count, page, per_page: perPage });
});

// GET /api/observations/:id — Single observation
observations.get("/api/observations/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  const { data, error } = await supabase
    .from("observations")
    .select("*, entity:entities(id, name, type)")
    .eq("id", id)
    .eq("household_id", householdId)
    .single();

  if (error) {
    return c.json({ detail: "Observation not found" }, 404);
  }

  return c.json(data);
});

// POST /api/observations — Create observation
observations.post("/api/observations", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let body: {
    entity_id: string;
    observed_at?: string;
    category: string;
    subcategory?: string;
    data?: Record<string, unknown>;
    notes?: string;
    tags?: string[];
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.entity_id || !body.category) {
    return c.json({ detail: "entity_id and category are required" }, 400);
  }

  const { data, error } = await supabase
    .from("observations")
    .insert({
      household_id: householdId,
      entity_id: body.entity_id,
      observer_id: user.id,
      observed_at: body.observed_at || new Date().toISOString(),
      category: body.category,
      subcategory: body.subcategory ?? null,
      data: body.data ?? {},
      notes: body.notes ?? null,
      tags: body.tags ?? [],
    })
    .select("*, entity:entities(id, name, type)")
    .single();

  if (error) {
    return c.json({ detail: `Error creating observation: ${error.message}` }, 400);
  }

  return c.json(data, 201);
});

// POST /api/observations/bulk — Create multiple observations
observations.post("/api/observations/bulk", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  let body: { observations: Array<{
    entity_id: string;
    observed_at?: string;
    category: string;
    subcategory?: string;
    data?: Record<string, unknown>;
    notes?: string;
    tags?: string[];
  }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.observations) || body.observations.length === 0) {
    return c.json({ detail: "observations array is required" }, 400);
  }

  const enriched = body.observations.map((obs) => ({
    household_id: householdId,
    entity_id: obs.entity_id,
    observer_id: user.id,
    observed_at: obs.observed_at || new Date().toISOString(),
    category: obs.category,
    subcategory: obs.subcategory ?? null,
    data: obs.data ?? {},
    notes: obs.notes ?? null,
    tags: obs.tags ?? [],
  }));

  const { data, error } = await supabase
    .from("observations")
    .insert(enriched)
    .select();

  if (error) {
    return c.json({ detail: `Error creating observations: ${error.message}` }, 400);
  }

  return c.json(data, 201);
});

// DELETE /api/observations/:id — Delete own observation
observations.delete("/api/observations/:id", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { error } = await supabase
    .from("observations")
    .delete()
    .eq("id", id)
    .eq("observer_id", user.id);

  if (error) {
    return c.json({ detail: `Error deleting observation: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default observations;
