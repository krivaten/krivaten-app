import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";

const trackers = new Hono<{ Bindings: Env; Variables: Variables }>();
trackers.use("*", authMiddleware);

// GET /api/v1/trackers — List trackers, optionally filtered by entity type code
trackers.get("/api/v1/trackers", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const entityTypeCode = c.req.query("entity_type");

  if (entityTypeCode) {
    // Look up entity type by code, then join through entity_type_trackers
    const { data: entityType } = await supabase
      .from("entity_types")
      .select("id")
      .eq("code", entityTypeCode)
      .single();

    if (!entityType) {
      return c.json([]);
    }

    const { data, error } = await supabase
      .from("entity_type_trackers")
      .select("position, tracker:trackers(*, fields:tracker_fields(*))")
      .eq("entity_type_id", entityType.id)
      .order("position");

    if (error) {
      return c.json(
        { detail: `Error fetching trackers: ${error.message}` },
        500,
      );
    }

    // Flatten: return the tracker objects with fields, sorted by position
    const trackerList = (data || [])
      .map((row: { tracker: unknown }) => row.tracker)
      .filter(Boolean);
    return c.json(trackerList);
  }

  // No filter: return all trackers with fields
  const { data, error } = await supabase
    .from("trackers")
    .select("*, fields:tracker_fields(*)")
    .order("name");

  if (error) {
    return c.json(
      { detail: `Error fetching trackers: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

// GET /api/v1/trackers/:id — Single tracker with fields
trackers.get("/api/v1/trackers/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("trackers")
    .select("*, fields:tracker_fields(*)")
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ detail: "Tracker not found" }, 404);
  }

  return c.json(data);
});

export default trackers;
