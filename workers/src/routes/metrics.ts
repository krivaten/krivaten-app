import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireTenantId } from "../lib/tenant";

const VALID_FIELD_TYPES = ["text", "number", "boolean", "single_select", "multi_select", "textarea", "datetime"];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const metrics = new Hono<{ Bindings: Env; Variables: Variables }>();
metrics.use("*", authMiddleware);

// GET /api/v1/metrics — List metrics, optionally filtered by entity type code
metrics.get("/api/v1/metrics", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  const entityTypeCode = c.req.query("entity_type");

  if (entityTypeCode) {
    // Look up entity type by code, then join through entity_type_metrics
    const { data: entityType } = await supabase
      .from("entity_types")
      .select("id")
      .eq("code", entityTypeCode)
      .single();

    if (!entityType) {
      return c.json([]);
    }

    const { data, error } = await supabase
      .from("entity_type_metrics")
      .select("position, metric:metrics(*, fields:metric_fields(*))")
      .eq("entity_type_id", entityType.id)
      .order("position");

    if (error) {
      return c.json(
        { detail: `Error fetching metrics: ${error.message}` },
        500,
      );
    }

    // Flatten: return the metric objects with fields, sorted by position
    const metricList = (data || [])
      .map((row: { metric: unknown }) => row.metric)
      .filter(Boolean);
    return c.json(metricList);
  }

  // No filter: return all metrics with fields
  const { data, error } = await supabase
    .from("metrics")
    .select("*, fields:metric_fields(*)")
    .order("name");

  if (error) {
    return c.json(
      { detail: `Error fetching metrics: ${error.message}` },
      500,
    );
  }

  return c.json(data);
});

// GET /api/v1/metrics/:id — Single metric with fields
metrics.get("/api/v1/metrics/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("metrics")
    .select("*, fields:metric_fields(*)")
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ detail: "Metric not found" }, 404);
  }

  return c.json(data);
});

// POST /api/v1/metrics — Create a custom metric
metrics.post("/api/v1/metrics", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  let tenantId: string;
  try { tenantId = await requireTenantId(c); }
  catch { return c.json({ detail: "You must belong to a space" }, 400); }

  const body = await c.req.json();
  const { name, description, icon, fields } = body;
  const code = body.code || (name ? slugify(name) : "");

  if (!name?.trim()) {
    return c.json({ detail: "name is required" }, 400);
  }
  if (!code) {
    return c.json({ detail: "code is required" }, 400);
  }

  // Validate fields
  if (fields && Array.isArray(fields)) {
    for (const f of fields) {
      if (!VALID_FIELD_TYPES.includes(f.field_type)) {
        return c.json({ detail: `Invalid field_type: ${f.field_type}` }, 400);
      }
      if ((f.field_type === "single_select" || f.field_type === "multi_select") && (!f.options || !Array.isArray(f.options) || f.options.length === 0)) {
        return c.json({ detail: `Options required for ${f.field_type} field: ${f.code}` }, 400);
      }
    }
  }

  // Insert metric
  const { data: metric, error: metricError } = await supabase
    .from("metrics")
    .insert({ code, name: name.trim(), description: description || null, icon: icon || null, is_system: false, tenant_id: tenantId })
    .select("*")
    .single();

  if (metricError) {
    if (metricError.code === "23505") {
      return c.json({ detail: `Metric code "${code}" already exists` }, 409);
    }
    return c.json({ detail: `Error creating metric: ${metricError.message}` }, 500);
  }

  // Insert fields
  let insertedFields: unknown[] = [];
  if (fields && Array.isArray(fields) && fields.length > 0) {
    const fieldRows = fields.map((f: { code: string; name: string; field_type: string; options?: unknown; is_required?: boolean; position?: number }, i: number) => ({
      metric_id: metric.id,
      code: f.code,
      name: f.name,
      field_type: f.field_type,
      options: f.options || null,
      is_required: f.is_required ?? false,
      position: f.position ?? i,
    }));
    const { data: fieldData, error: fieldError } = await supabase
      .from("metric_fields")
      .insert(fieldRows)
      .select("*");
    if (fieldError) {
      return c.json({ detail: `Error creating fields: ${fieldError.message}` }, 500);
    }
    insertedFields = fieldData || [];
  }

  return c.json({ ...metric, fields: insertedFields }, 201);
});

// PUT /api/v1/metrics/:id — Update a custom metric
metrics.put("/api/v1/metrics/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  // Fetch existing metric
  const { data: existing, error: fetchErr } = await supabase
    .from("metrics")
    .select("*, fields:metric_fields(*)")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return c.json({ detail: "Metric not found" }, 404);
  }
  if (existing.is_system) {
    return c.json({ detail: "Cannot edit system metrics" }, 403);
  }

  const body = await c.req.json();
  const { name, description, icon, fields } = body;

  // Update metric metadata
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description || null;
  if (icon !== undefined) updates.icon = icon || null;

  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await supabase.from("metrics").update(updates).eq("id", id);
    if (updateErr) {
      return c.json({ detail: `Error updating metric: ${updateErr.message}` }, 500);
    }
  }

  // Sync fields if provided
  if (fields && Array.isArray(fields)) {
    // Validate
    for (const f of fields) {
      if (!VALID_FIELD_TYPES.includes(f.field_type)) {
        return c.json({ detail: `Invalid field_type: ${f.field_type}` }, 400);
      }
    }

    const existingFieldIds = new Set((existing.fields || []).map((f: { id: string }) => f.id));
    const incomingFieldIds = new Set(fields.filter((f: { id?: string }) => f.id).map((f: { id: string }) => f.id));

    // Delete removed fields
    for (const existingId of existingFieldIds) {
      if (!incomingFieldIds.has(existingId)) {
        await supabase.from("metric_fields").delete().eq("id", existingId);
      }
    }

    // Upsert fields
    for (const f of fields) {
      const fieldData = {
        metric_id: id,
        code: f.code,
        name: f.name,
        field_type: f.field_type,
        options: f.options || null,
        is_required: f.is_required ?? false,
        position: f.position ?? 0,
      };
      if (f.id && existingFieldIds.has(f.id)) {
        await supabase.from("metric_fields").update(fieldData).eq("id", f.id);
      } else {
        await supabase.from("metric_fields").insert(fieldData);
      }
    }
  }

  // Re-fetch and return
  const { data: updated } = await supabase
    .from("metrics")
    .select("*, fields:metric_fields(*)")
    .eq("id", id)
    .single();

  return c.json(updated);
});

// DELETE /api/v1/metrics/:id — Delete a custom metric
metrics.delete("/api/v1/metrics/:id", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const id = c.req.param("id");

  const { data: existing, error: fetchErr } = await supabase
    .from("metrics")
    .select("id, is_system")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return c.json({ detail: "Metric not found" }, 404);
  }
  if (existing.is_system) {
    return c.json({ detail: "Cannot delete system metrics" }, 403);
  }

  // Check for observations
  const { count } = await supabase
    .from("observations")
    .select("id", { count: "exact", head: true })
    .eq("metric_id", id);

  if (count && count > 0) {
    return c.json({ detail: "Cannot delete metric with existing observations. Remove observations first." }, 409);
  }

  const { error: deleteErr } = await supabase.from("metrics").delete().eq("id", id);
  if (deleteErr) {
    return c.json({ detail: `Error deleting metric: ${deleteErr.message}` }, 500);
  }

  return c.body(null, 204);
});

// GET /api/v1/entity-type-metrics — List metric associations for an entity type
metrics.get("/api/v1/entity-type-metrics", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const entityTypeId = c.req.query("entity_type_id");

  if (!entityTypeId) {
    return c.json({ detail: "entity_type_id query param required" }, 400);
  }

  const { data, error } = await supabase
    .from("entity_type_metrics")
    .select("id, entity_type_id, metric_id, position, tenant_id, metric:metrics(*, fields:metric_fields(*))")
    .eq("entity_type_id", entityTypeId)
    .order("position");

  if (error) {
    return c.json({ detail: `Error fetching associations: ${error.message}` }, 500);
  }

  // Deduplicate by metric_id — tenant row overrides system row
  const seen = new Map<string, unknown>();
  for (const row of data || []) {
    const existing = seen.get(row.metric_id);
    if (!existing || row.tenant_id !== null) {
      seen.set(row.metric_id, {
        metric: row.metric,
        position: row.position,
        is_system_default: row.tenant_id === null,
      });
    }
  }

  return c.json(Array.from(seen.values()));
});

// PUT /api/v1/entity-type-metrics — Replace tenant associations for an entity type
metrics.put("/api/v1/entity-type-metrics", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  let tenantId: string;
  try { tenantId = await requireTenantId(c); }
  catch { return c.json({ detail: "You must belong to a space" }, 400); }

  const body = await c.req.json();
  const { entity_type_id, metrics: metricList } = body;

  if (!entity_type_id) {
    return c.json({ detail: "entity_type_id is required" }, 400);
  }

  // Delete existing tenant-scoped associations for this entity type
  await supabase
    .from("entity_type_metrics")
    .delete()
    .eq("entity_type_id", entity_type_id)
    .eq("tenant_id", tenantId);

  // Insert new ones
  if (metricList && Array.isArray(metricList) && metricList.length > 0) {
    const rows = metricList.map((t: { metric_id: string; position?: number }, i: number) => ({
      entity_type_id,
      metric_id: t.metric_id,
      position: t.position ?? i,
      tenant_id: tenantId,
    }));
    const { error } = await supabase.from("entity_type_metrics").insert(rows);
    if (error) {
      return c.json({ detail: `Error saving associations: ${error.message}` }, 500);
    }
  }

  // Return updated list
  const { data } = await supabase
    .from("entity_type_metrics")
    .select("id, entity_type_id, metric_id, position, tenant_id, metric:metrics(*, fields:metric_fields(*))")
    .eq("entity_type_id", entity_type_id)
    .order("position");

  const seen = new Map<string, unknown>();
  for (const row of data || []) {
    const existing = seen.get(row.metric_id);
    if (!existing || row.tenant_id !== null) {
      seen.set(row.metric_id, {
        metric: row.metric,
        position: row.position,
        is_system_default: row.tenant_id === null,
      });
    }
  }

  return c.json(Array.from(seen.values()));
});

export default metrics;
