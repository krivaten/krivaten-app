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

  // Create the household
  const { data: household, error: hError } = await supabase
    .from("households")
    .insert({ name: body.name.trim() })
    .select()
    .single();

  if (hError) {
    return c.json({ detail: `Error creating household: ${hError.message}` }, 500);
  }

  // Assign user to household as admin
  const { error: pError } = await supabase
    .from("profiles")
    .update({ household_id: household.id, role: "admin" })
    .eq("id", user.id);

  if (pError) {
    return c.json({ detail: `Error assigning household: ${pError.message}` }, 500);
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
