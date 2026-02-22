import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { beforeAll } from "vitest";

// Local Supabase well-known defaults
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

function getSupabaseCredentials() {
  try {
    const output = execSync("supabase status --output json 2>/dev/null", {
      encoding: "utf-8",
      timeout: 10000,
    });
    const status = JSON.parse(output);
    return {
      url: status.API_URL || LOCAL_SUPABASE_URL,
      anonKey: status.ANON_KEY || LOCAL_ANON_KEY,
      serviceRoleKey: status.SERVICE_ROLE_KEY || LOCAL_SERVICE_ROLE_KEY,
    };
  } catch {
    // Fall back to well-known local defaults
    return {
      url: LOCAL_SUPABASE_URL,
      anonKey: LOCAL_ANON_KEY,
      serviceRoleKey: LOCAL_SERVICE_ROLE_KEY,
    };
  }
}

const creds = getSupabaseCredentials();

export const TEST_ENV: Env = {
  SUPABASE_URL: creds.url,
  SUPABASE_KEY: creds.anonKey,
  SUPABASE_JWT_SECRET: "super-secret-jwt-token-with-at-least-32-characters-long",
  FRONTEND_URL: "http://localhost:5173",
};

export const SERVICE_ROLE_KEY = creds.serviceRoleKey;

export const adminClient: SupabaseClient = createClient(
  creds.url,
  creds.serviceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

beforeAll(async () => {
  // Verify local Supabase is reachable
  try {
    const { error } = await adminClient.from("tenants").select("id").limit(1);
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Local Supabase is not reachable. Run 'supabase start' first.\n${msg}`,
    );
  }
});
