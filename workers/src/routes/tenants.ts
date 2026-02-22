import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware, getUser } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { getTenantId } from "../lib/tenant";

const tenants = new Hono<{ Bindings: Env; Variables: Variables }>();
tenants.use("*", authMiddleware);

// POST /api/v1/tenants — Create a new tenant (workspace)
tenants.post("/api/v1/tenants", async (c) => {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  // Check user doesn't already belong to a tenant
  const existing = await getTenantId(c);
  if (existing) {
    return c.json({ detail: "You already belong to a workspace" }, 400);
  }

  let body: { name: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  if (!body.name?.trim()) {
    return c.json({ detail: "Workspace name is required" }, 400);
  }

  // Generate ID up front — chicken-and-egg pattern:
  // INSERT without .select() (SELECT RLS checks get_my_tenant_id() which is still NULL),
  // update profile's tenant_id, then fetch the tenant.
  const tenantId = crypto.randomUUID();

  const { error: tError } = await supabase
    .from("tenants")
    .insert({ id: tenantId, name: body.name.trim() });

  if (tError) {
    return c.json({ detail: `Error creating workspace: ${tError.message}` }, 500);
  }

  // Assign user to tenant as admin
  const { error: pError } = await supabase
    .from("profiles")
    .update({ tenant_id: tenantId, role: "admin" })
    .eq("id", user.id);

  if (pError) {
    return c.json({ detail: `Error assigning workspace: ${pError.message}` }, 500);
  }

  // Now fetch the tenant (SELECT policy passes because profile is updated)
  const { data: tenant, error: fetchError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (fetchError) {
    return c.json({ detail: `Error fetching workspace: ${fetchError.message}` }, 500);
  }

  return c.json(tenant, 201);
});

// GET /api/v1/tenants/mine — Get current user's tenant
tenants.get("/api/v1/tenants/mine", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const tenantId = await getTenantId(c);

  if (!tenantId) {
    return c.json({ detail: "No workspace" }, 404);
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error) {
    return c.json({ detail: `Error fetching workspace: ${error.message}` }, 500);
  }

  return c.json(data);
});

// PUT /api/v1/tenants/mine — Update tenant name/settings
tenants.put("/api/v1/tenants/mine", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const tenantId = await getTenantId(c);

  if (!tenantId) {
    return c.json({ detail: "No workspace" }, 404);
  }

  let body: { name?: string; settings?: Record<string, unknown> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ detail: "Invalid JSON body" }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (body.name?.trim()) updateData.name = body.name.trim();
  if (body.settings !== undefined) updateData.settings = body.settings;

  if (Object.keys(updateData).length === 0) {
    return c.json({ detail: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("tenants")
    .update(updateData)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) {
    return c.json({ detail: `Error updating workspace: ${error.message}` }, 500);
  }

  return c.json(data);
});

export default tenants;
