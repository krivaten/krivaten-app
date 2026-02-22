import { Hono } from "hono";

import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { ensureProfile } from "../lib/profile";

const profiles = new Hono<{ Bindings: Env; Variables: Variables }>();

profiles.use("*", authMiddleware);

// GET /api/v1/profiles/me
profiles.get("/api/v1/profiles/me", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const profile = await ensureProfile(supabase, user);
  if (!profile) {
    return c.json({ detail: "Session is invalid. Please sign in again." }, 401);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return c.json({ detail: `Error fetching profile: ${error.message}` }, 500);
  }

  return c.json(data);
});

// PUT /api/v1/profiles/me
profiles.put("/api/v1/profiles/me", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let body: { display_name?: string; bio?: string; avatar_url?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (body.display_name !== undefined)
    updateData.display_name = body.display_name;
  if (body.bio !== undefined) updateData.bio = body.bio;
  if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;

  if (Object.keys(updateData).length === 0) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error updating profile: ${error.message}` }, 500);
  }

  return c.json(data);
});

export default profiles;
