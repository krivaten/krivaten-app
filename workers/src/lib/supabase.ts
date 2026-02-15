import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types/env.d.ts";

export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseClientWithAuth(
  env: Env,
  accessToken: string,
): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
