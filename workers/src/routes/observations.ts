import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const observations = new Hono<{ Bindings: Env; Variables: Variables }>();
observations.use("*", authMiddleware);

/**
 * Resolve a variable code string to its vocabulary UUID.
 */
async function resolveVariableId(
  supabase: ReturnType<typeof createSupabaseClientWithAuth>,
  code: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("vocabularies")
    .select("id")
    .eq("vocabulary_type", "variable")
    .eq("code", code)
    .single();
  return data?.id ?? null;
}

const OBSERVATION_SELECT = "*, subject:entities!subject_id(id, name), variable:vocabularies!variable_id(id, code, name), unit:vocabularies!unit_id(id, code, name)";

// GET /api/v1/observations — List with filters and pagination
observations.get("/api/v1/observations", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let tenantId: string;
  try {
    tenantId = await requireTenantId(c);
  } catch {
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  const page = parseInt(c.req.query("page") || "1");
  const perPage = Math.min(parseInt(c.req.query("per_page") || "50"), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("observations")
    .select(OBSERVATION_SELECT, { count: "exact" })
    .eq("tenant_id", tenantId);

  const subjectId = c.req.query("subject_id");
  if (subjectId) query = query.eq("subject_id", subjectId);

  // Filter by variable code — resolve to ID
  const variableCode = c.req.query("variable");
  if (variableCode) {
    const variableId = await resolveVariableId(supabase, variableCode);
    if (variableId) {
      query = query.eq("variable_id", variableId);
    } else {
      // No matching variable — return empty
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
    return c.json({ detail: `Error fetching observations: ${error.message}` }, 500);
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
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  let body: {
    subject_id: string;
    variable_id?: string;
    variable?: string;
    value_numeric?: number;
    value_text?: string;
    value_boolean?: boolean;
    value_json?: Record<string, unknown>;
    unit_id?: string;
    quality_flag?: string;
    method_id?: string;
    observed_at?: string;
    attributes?: Record<string, unknown>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.subject_id) {
    return c.json({ detail: "subject_id is required" }, 400);
  }

  // Resolve variable code to ID if needed
  let variableId = body.variable_id ?? null;
  if (!variableId && body.variable) {
    variableId = await resolveVariableId(supabase, body.variable);
  }

  const { data, error } = await supabase
    .from("observations")
    .insert({
      tenant_id: tenantId,
      subject_id: body.subject_id,
      observer_id: user.id,
      variable_id: variableId,
      value_numeric: body.value_numeric ?? null,
      value_text: body.value_text ?? null,
      value_boolean: body.value_boolean ?? null,
      value_json: body.value_json ?? null,
      unit_id: body.unit_id ?? null,
      quality_flag: body.quality_flag ?? null,
      method_id: body.method_id ?? null,
      observed_at: body.observed_at || new Date().toISOString(),
      attributes: body.attributes ?? {},
    })
    .select(OBSERVATION_SELECT)
    .single();

  if (error) {
    return c.json({ detail: `Error creating observation: ${error.message}` }, 400);
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
    return c.json({ detail: "You must belong to a workspace" }, 400);
  }

  let body: {
    observations: Array<{
      subject_id: string;
      variable_id?: string;
      variable?: string;
      value_numeric?: number;
      value_text?: string;
      value_boolean?: boolean;
      value_json?: Record<string, unknown>;
      unit_id?: string;
      observed_at?: string;
      attributes?: Record<string, unknown>;
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

  // Resolve any variable codes to IDs
  const enriched = await Promise.all(
    body.observations.map(async (obs) => {
      let variableId = obs.variable_id ?? null;
      if (!variableId && obs.variable) {
        variableId = await resolveVariableId(supabase, obs.variable);
      }
      return {
        tenant_id: tenantId,
        subject_id: obs.subject_id,
        observer_id: user.id,
        variable_id: variableId,
        value_numeric: obs.value_numeric ?? null,
        value_text: obs.value_text ?? null,
        value_boolean: obs.value_boolean ?? null,
        value_json: obs.value_json ?? null,
        unit_id: obs.unit_id ?? null,
        observed_at: obs.observed_at || new Date().toISOString(),
        attributes: obs.attributes ?? {},
      };
    }),
  );

  const { data, error } = await supabase
    .from("observations")
    .insert(enriched)
    .select();

  if (error) {
    return c.json({ detail: `Error creating observations: ${error.message}` }, 400);
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
    return c.json({ detail: `Error deleting observation: ${error.message}` }, 400);
  }

  return c.body(null, 204);
});

export default observations;
