import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures a profile row exists for the authenticated user.
 *
 * - Common path: trigger already created the row → SELECT returns it.
 * - Trigger missed: INSERT the row, then re-SELECT.
 * - Stale JWT (user deleted from auth.users): INSERT fails with FK violation → return null.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: { id: string; email: string | null },
): Promise<{ id: string } | null> {
  // 1. Check if profile already exists (common path)
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing;

  // 2. Profile missing — create it
  const { error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      display_name: user.email?.split("@")[0] ?? null,
    });

  if (insertError) {
    // FK violation: profiles.id -> auth.users(id) means user was deleted (stale JWT)
    if (insertError.code === "23503") {
      return null;
    }
    throw new Error(`Failed to create profile: ${insertError.message}`);
  }

  // 3. Re-fetch the newly created profile
  const { data: created } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return created;
}
