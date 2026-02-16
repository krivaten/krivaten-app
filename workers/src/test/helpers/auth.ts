import { createClient } from "@supabase/supabase-js";
import { adminClient, TEST_ENV, SERVICE_ROLE_KEY } from "../setup";

let userCounter = 0;

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Creates a test user via admin API with a real JWT from Supabase Auth.
 * Uses signInWithPassword to get a token that passes jose JWKS verification.
 */
export async function createTestUser(
  emailPrefix?: string,
): Promise<TestUser> {
  userCounter++;
  const email =
    `${emailPrefix || "testuser"}+${userCounter}+${Date.now()}@test.local`;
  const password = "test-password-123!";

  // Create user via admin API (bypasses email confirmation)
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    throw new Error(
      `Failed to create test user: ${createError?.message || "No user returned"}`,
    );
  }

  // Sign in to get a real JWT
  const anonClient = createClient(TEST_ENV.SUPABASE_URL, TEST_ENV.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: session, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password });

  if (signInError || !session.session) {
    throw new Error(
      `Failed to sign in test user: ${signInError?.message || "No session returned"}`,
    );
  }

  return {
    id: created.user.id,
    email,
    accessToken: session.session.access_token,
  };
}

/**
 * Returns authorization headers for a test user.
 */
export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Deletes a test user via admin API.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await adminClient.auth.admin.deleteUser(userId);
}
