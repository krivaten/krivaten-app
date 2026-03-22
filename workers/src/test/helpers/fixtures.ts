import { appGet, appPost } from "./request";
import { authHeaders, createTestUser } from "./auth";

/**
 * Creates a custom metric for a user who already has a tenant.
 */
export async function createMetricForUser(
  user: TestUser,
  data: {
    name: string;
    code?: string;
    description?: string;
    fields?: Array<{
      code: string;
      name: string;
      field_type: string;
      options?: Array<{ value: string; label: string }>;
      is_required?: boolean;
      position?: number;
    }>;
  },
): Promise<{
  id: string;
  code: string;
  name: string;
  tenant_id: string;
  is_system: boolean;
  fields: unknown[];
  [key: string]: unknown;
}> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/v1/metrics", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create metric: ${JSON.stringify(body)}`);
  }
  return res.json();
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Creates a tenant for a test user and returns the tenant data.
 * Ensures profile exists first, then creates tenant via API.
 */
export async function createTenantForUser(
  user: TestUser,
  name = "Test Space",
): Promise<{ id: string; name: string }> {
  const headers = authHeaders(user.accessToken);

  // Ensure profile exists first
  await appGet("/api/v1/profiles/me", headers);

  // Create tenant
  const res = await appPost("/api/v1/tenants", { name }, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create tenant: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Creates a complete test user with tenant and profile.
 */
export async function setupUserWithTenant(
  emailPrefix?: string,
  tenantName = "Test Space",
): Promise<{ user: TestUser; tenant: { id: string; name: string } }> {
  const user = await createTestUser(emailPrefix);
  const tenant = await createTenantForUser(user, tenantName);
  return { user, tenant };
}

/**
 * Looks up an entity type by code, returns its UUID.
 */
export async function getEntityTypeId(
  user: TestUser,
  code: string,
): Promise<string> {
  const headers = authHeaders(user.accessToken);
  const res = await appGet(`/api/v1/entity-types?code=${code}`, headers);
  if (res.status !== 200) {
    throw new Error(`Failed to look up entity type: ${code}`);
  }
  const types: Array<{ id: string }> = await res.json();
  if (types.length === 0) {
    throw new Error(`Entity type not found: ${code}`);
  }
  return types[0].id;
}

/**
 * Looks up a metric by code, returns its UUID.
 */
export async function getMetricId(
  user: TestUser,
  code: string,
): Promise<string> {
  const headers = authHeaders(user.accessToken);
  const res = await appGet("/api/v1/metrics", headers);
  if (res.status !== 200) {
    throw new Error(`Failed to look up metrics`);
  }
  const metrics: Array<{ id: string; code: string }> = await res.json();
  const metric = metrics.find((t) => t.code === code);
  if (!metric) {
    throw new Error(`Metric not found: ${code}`);
  }
  return metric.id;
}

/**
 * Creates an entity for a user who already has a tenant.
 */
export async function createEntityForUser(
  user: TestUser,
  data: {
    entity_type_id?: string;
    entity_type?: string;
    name: string;
    description?: string;
    external_id?: string;
    taxonomy_path?: string;
    attributes?: Record<string, unknown>;
  },
): Promise<{
  id: string;
  tenant_id: string;
  entity_type_id: string;
  name: string;
  is_active: boolean;
  [key: string]: unknown;
}> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/v1/entities", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create entity: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Creates an observation for a user who already has a tenant and entity.
 */
export async function createObservationForUser(
  user: TestUser,
  data: {
    entity_id: string;
    metric_id?: string;
    metric?: string;
    observed_at?: string;
    field_values: Record<string, unknown>;
    notes?: string;
  },
): Promise<{
  id: string;
  entity_id: string;
  metric_id: string;
  field_values: Record<string, unknown>;
  observer_id: string;
  [key: string]: unknown;
}> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/v1/observations", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create observation: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Creates a relationship between two entities for a user who already has a tenant.
 */
export async function createRelationshipForUser(
  user: TestUser,
  data: {
    source_id: string;
    target_id: string;
    type: string;
    label?: string;
    properties?: Record<string, unknown>;
  },
): Promise<{
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  [key: string]: unknown;
}> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/v1/relationships", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create relationship: ${JSON.stringify(body)}`);
  }
  return res.json();
}
