import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const search = new Hono<{ Bindings: Env; Variables: Variables }>();
search.use("*", authMiddleware);

// GET /api/v1/search/entities?q= — Search entities by name
search.get("/api/v1/search/entities", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  const q = c.req.query("q") || "";
  if (!q.trim()) {
    return c.json([]);
  }

  const { data, error } = await supabase
    .from("entities")
    .select("*, entity_type:vocabularies!entity_type_id(*)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(50);

  if (error) {
    return c.json({ detail: `Error searching entities: ${error.message}` }, 500);
  }

  return c.json(data);
});

// GET /api/v1/search/taxonomy?path= — Search entities by taxonomy prefix
search.get("/api/v1/search/taxonomy", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const path = c.req.query("path") || "";
  if (!path.trim()) {
    return c.json([]);
  }

  const { data, error } = await supabase.rpc("search_taxonomy", {
    p_path_prefix: path,
    p_limit: 100,
  });

  if (error) {
    return c.json({ detail: `Error searching taxonomy: ${error.message}` }, 500);
  }

  return c.json(data);
});

export default search;
