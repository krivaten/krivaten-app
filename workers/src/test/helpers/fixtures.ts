import { appGet, appPost } from "./request";
import { authHeaders, createTestUser } from "./auth";

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
  name = "Test Workspace",
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
  tenantName = "Test Workspace",
): Promise<{ user: TestUser; tenant: { id: string; name: string } }> {
  const user = await createTestUser(emailPrefix);
  const tenant = await createTenantForUser(user, tenantName);
  return { user, tenant };
}

/**
 * Looks up a system vocabulary by type and code, returns its UUID.
 */
export async function getSystemVocabId(
  user: TestUser,
  type: string,
  code: string,
): Promise<string> {
  const headers = authHeaders(user.accessToken);
  const res = await appGet(`/api/v1/vocabularies?type=${type}&code=${code}`, headers);
  if (res.status !== 200) {
    throw new Error(`Failed to look up vocabulary ${type}/${code}`);
  }
  const vocabs = await res.json();
  if (!Array.isArray(vocabs) || vocabs.length === 0) {
    throw new Error(`System vocabulary not found: ${type}/${code}`);
  }
  return vocabs[0].id;
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
): Promise<Entity> {
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
  },
): Promise<Observation> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/v1/observations", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create observation: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Creates an edge between two entities for a user who already has a tenant.
 */
export async function createEdgeForUser(
  user: TestUser,
  data: {
    source_id: string;
    target_id: string;
    edge_type: string;
    edge_type_id?: string;
    label?: string;
    properties?: Record<string, unknown>;
  },
): Promise<Edge> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/v1/edges", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create edge: ${JSON.stringify(body)}`);
  }
  return res.json();
}
