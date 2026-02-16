import { Hono } from "hono";

import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";

const profiles = new Hono<{ Bindings: Env; Variables: Variables }>();

profiles.use("*", authMiddleware);

// GET /api/profiles/me
profiles.get("/api/profiles/me", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Profile doesn't exist yet — create it
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          display_name: user.email?.split("@")[0] ?? null,
        })
        .select()
        .single();

      if (insertError) {
        return c.json(
          { detail: `Error creating profile: ${insertError.message}` },
          500,
        );
      }
      return c.json(newProfile);
    }
    return c.json({ detail: `Error fetching profile: ${error.message}` }, 500);
  }

  return c.json(data);
});

// PUT /api/profiles/me
profiles.put("/api/profiles/me", async (c) => {
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
