import { appPost } from "./request";
import { authHeaders, createTestUser } from "./auth";

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Creates a household for a test user and returns the household data.
 * Also triggers profile creation via the profiles/me endpoint first.
 */
export async function createHouseholdForUser(
  user: TestUser,
  name = "Test Household",
): Promise<{ id: string; name: string }> {
  const headers = authHeaders(user.accessToken);

  // Ensure profile exists first (GET /api/profiles/me auto-creates)
  const { appGet } = await import("./request");
  await appGet("/api/profiles/me", headers);

  // Create household
  const res = await appPost("/api/households", { name }, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create household: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Creates an entity for a user who already has a household.
 */
export async function createEntityForUser(
  user: TestUser,
  data: {
    type: string;
    name: string;
    parent_id?: string;
    properties?: Record<string, unknown>;
  },
): Promise<{ id: string; type: string; name: string; household_id: string }> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/entities", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create entity: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Creates an observation for a user who already has a household and entity.
 */
export async function createObservationForUser(
  user: TestUser,
  data: {
    entity_id: string;
    category: string;
    observed_at?: string;
    subcategory?: string;
    data?: Record<string, unknown>;
    notes?: string;
    tags?: string[];
  },
): Promise<{ id: string; entity_id: string; category: string }> {
  const headers = authHeaders(user.accessToken);
  const res = await appPost("/api/observations", data, headers);
  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Failed to create observation: ${JSON.stringify(body)}`);
  }
  return res.json();
}

/**
 * Sets up a complete test user with household, profile, and optionally entities.
 * Convenience wrapper for common test setup pattern.
 */
export async function setupUserWithHousehold(
  emailPrefix?: string,
  householdName = "Test Household",
): Promise<{ user: TestUser; household: { id: string; name: string } }> {
  const user = await createTestUser(emailPrefix);
  const household = await createHouseholdForUser(user, householdName);
  return { user, household };
}
