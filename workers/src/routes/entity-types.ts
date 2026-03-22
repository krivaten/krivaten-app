import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";

const entityTypes = new Hono<{ Bindings: Env; Variables: Variables }>();
entityTypes.use("*", authMiddleware);

// GET /api/v1/entity-types — List all entity types
entityTypes.get("/api/v1/entity-types", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let query = supabase.from("entity_types").select("*");

  const code = c.req.query("code");
  if (code) {
    query = query.eq("code", code);
  }

  const { data, error } = await query.order("name");

  if (error) {
    return c.json(
      { detail: `Error fetching entity types: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

// GET /api/v1/entity-types/:id — Single entity type with default metrics
entityTypes.get("/api/v1/entity-types/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("entity_types")
    .select(
      "*, metrics:entity_type_metrics(position, metric:metrics(*, fields:metric_fields(*)))",
    )
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ detail: "Entity type not found" }, 404);
  }

  return c.json(data);
});

export default entityTypes;
