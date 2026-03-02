import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const observations = new Hono<{ Bindings: Env; Variables: Variables }>();
observations.use("*", authMiddleware);

const OBSERVATION_SELECT =
  "*, entity:entities!entity_id(id, name), tracker:trackers!tracker_id(id, code, name)";

/**
 * Resolve a tracker code string to its UUID from the trackers table.
 */
async function resolveTrackerId(
  supabase: ReturnType<typeof createSupabaseClientWithAuth>,
  code: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("trackers")
    .select("id")
    .eq("code", code)
    .single();
  return data?.id ?? null;
}

/**
 * Validate that all required fields for a tracker are present in field_values.
 * Returns an error message string if validation fails, null otherwise.
 */
async function validateRequiredFields(
  supabase: ReturnType<typeof createSupabaseClientWithAuth>,
  trackerId: string,
  fieldValues: Record<string, unknown>,
): Promise<string | null> {
  const { data: fields } = await supabase
    .from("tracker_fields")
    .select("code, name, is_required")
    .eq("tracker_id", trackerId)
    .eq("is_required", true);

  if (!fields || fields.length === 0) return null;

  const missing = fields.filter(
    (f) =>
      fieldValues[f.code] === undefined ||
      fieldValues[f.code] === null ||
      fieldValues[f.code] === "",
  );

  if (missing.length > 0) {
    const names = missing.map((f) => f.name).join(", ");
    return `Missing required fields: ${names}`;
  }

  return null;
}

// GET /api/v1/observations — List with filters and pagination
observations.get("/api/v1/observations", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  const page = parseInt(c.req.query("page") || "1");
  const perPage = Math.min(parseInt(c.req.query("per_page") || "50"), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("observations")
    .select(OBSERVATION_SELECT, { count: "exact" })
    .eq("tenant_id", tenantId);

  const entityId = c.req.query("entity_id");
  if (entityId) query = query.eq("entity_id", entityId);

  // Filter by tracker code or tracker_id
  const trackerCode = c.req.query("tracker");
  const trackerId = c.req.query("tracker_id");
  if (trackerId) {
    query = query.eq("tracker_id", trackerId);
  } else if (trackerCode) {
    const resolvedId = await resolveTrackerId(supabase, trackerCode);
    if (resolvedId) {
      query = query.eq("tracker_id", resolvedId);
    } else {
      return c.json({ data: [], count: 0, page, per_page: perPage });
    }
  }

  const fromDate = c.req.query("from");
  if (fromDate) query = query.gte("observed_at", fromDate);

  const toDate = c.req.query("to");
  if (toDate) query = query.lte("observed_at", toDate);

  const { data, error, count } = await query
    .order("observed_at", { ascending: false })
    .range(from, to);

  if (error) {
    return c.json(
      { detail: `Error fetching observations: ${error.message}` },
      500,
    );
  }

  return c.json({ data, count, page, per_page: perPage });
});

// GET /api/v1/observations/:id — Single observation
observations.get("/api/v1/observations/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("observations")
    .select(OBSERVATION_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ detail: "Observation not found" }, 404);
  }

  return c.json(data);
});

// POST /api/v1/observations — Create observation
observations.post("/api/v1/observations", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  let body: {
    entity_id: string;
    tracker_id?: string;
    tracker?: string;
    observed_at?: string;
    field_values: Record<string, unknown>;
    notes?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.entity_id) {
    return c.json({ detail: "entity_id is required" }, 400);
  }

  if (!body.field_values || typeof body.field_values !== "object") {
    return c.json({ detail: "field_values is required" }, 400);
  }

  // Resolve tracker code to ID if needed
  let trackerId = body.tracker_id;
  if (!trackerId && body.tracker) {
    trackerId = (await resolveTrackerId(supabase, body.tracker)) ?? undefined;
    if (!trackerId) {
      return c.json(
        { detail: `Invalid tracker: "${body.tracker}"` },
        400,
      );
    }
  }

  if (!trackerId) {
    return c.json({ detail: "tracker_id or tracker is required" }, 400);
  }

  // Validate required fields
  const validationError = await validateRequiredFields(
    supabase,
    trackerId,
    body.field_values,
  );
  if (validationError) {
    return c.json({ detail: validationError }, 400);
  }

  const { data, error } = await supabase
    .from("observations")
    .insert({
      tenant_id: tenantId,
      entity_id: body.entity_id,
      tracker_id: trackerId,
      observer_id: user.id,
      observed_at: body.observed_at || new Date().toISOString(),
      field_values: body.field_values,
      notes: body.notes ?? null,
    })
    .select(OBSERVATION_SELECT)
    .single();

  if (error) {
    return c.json(
      { detail: `Error creating observation: ${error.message}` },
      400,
    );
  }

  return c.json(data, 201);
});

// POST /api/v1/observations/batch — Create multiple observations
observations.post("/api/v1/observations/batch", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a space" }, 400);
  }

  let body: {
    observations: Array<{
      entity_id: string;
      tracker_id?: string;
      tracker?: string;
      observed_at?: string;
      field_values: Record<string, unknown>;
      notes?: string;
    }>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.observations) || body.observations.length === 0) {
    return c.json({ detail: "observations array is required" }, 400);
  }

  // Resolve tracker codes and build insert rows
  const enriched = await Promise.all(
    body.observations.map(async (obs) => {
      let trackerId = obs.tracker_id;
      if (!trackerId && obs.tracker) {
        trackerId =
          (await resolveTrackerId(supabase, obs.tracker)) ?? undefined;
      }
      return {
        tenant_id: tenantId,
        entity_id: obs.entity_id,
        tracker_id: trackerId,
        observer_id: user.id,
        observed_at: obs.observed_at || new Date().toISOString(),
        field_values: obs.field_values || {},
        notes: obs.notes ?? null,
      };
    }),
  );

  const { data, error } = await supabase
    .from("observations")
    .insert(enriched)
    .select();

  if (error) {
    return c.json(
      { detail: `Error creating observations: ${error.message}` },
      400,
    );
  }

  return c.json(data, 201);
});

// DELETE /api/v1/observations/:id — Delete own observation
observations.delete("/api/v1/observations/:id", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { error } = await supabase
    .from("observations")
    .delete()
    .eq("id", id)
    .eq("observer_id", user.id);

  if (error) {
    return c.json(
      { detail: `Error deleting observation: ${error.message}` },
      400,
    );
  }

  return c.body(null, 204);
});

export default observations;
