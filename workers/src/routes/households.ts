import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { getHouseholdId } from "../lib/household";

const households = new Hono<{ Bindings: Env; Variables: Variables }>();
households.use("*", authMiddleware);

// POST /api/households — Create a new household, assign creator as admin
households.post("/api/households", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  // Check user doesn't already belong to a household
  const existing = await getHouseholdId(c);
  if (existing) {
    return c.json({ detail: "You already belong to a household" }, 400);
  }

  let body: { name: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.name?.trim()) {
    return c.json({ detail: "Household name is required" }, 400);
  }

  // Generate ID up front so we can insert without needing .select()
  // (.select() after INSERT fails because the SELECT RLS policy checks
  // get_my_household_id(), which is still NULL until the profile is updated)
  const householdId = crypto.randomUUID();

  const { error: hError } = await supabase
    .from("households")
    .insert({ id: householdId, name: body.name.trim() });

  if (hError) {
    return c.json({ detail: `Error creating household: ${hError.message}` }, 500);
  }

  // Assign user to household as admin — this makes the SELECT policy work
  const { error: pError } = await supabase
    .from("profiles")
    .update({ household_id: householdId, role: "admin" })
    .eq("id", user.id);

  if (pError) {
    return c.json({ detail: `Error assigning household: ${pError.message}` }, 500);
  }

  // Now fetch the household (SELECT policy passes because profile is updated)
  const { data: household, error: fetchError } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();

  if (fetchError) {
    return c.json({ detail: `Error fetching household: ${fetchError.message}` }, 500);
  }

  return c.json(household, 201);
});

// GET /api/households/mine — Get current user's household
households.get("/api/households/mine", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const householdId = await getHouseholdId(c);

  if (!householdId) {
    return c.json({ detail: "No household" }, 404);
  }

  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();

  if (error) {
    return c.json({ detail: `Error fetching household: ${error.message}` }, 500);
  }

  return c.json(data);
});

// PUT /api/households/mine — Update household name
households.put("/api/households/mine", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const householdId = await getHouseholdId(c);

  if (!householdId) {
    return c.json({ detail: "No household" }, 404);
  }

  let body: { name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.name?.trim()) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("households")
    .update({ name: body.name.trim() })
    .eq("id", householdId)
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error updating household: ${error.message}` }, 500);
  }

  return c.json(data);
});

export default households;
