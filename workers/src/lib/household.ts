import { Context } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { createSupabaseClientWithAuth } from "./supabase";
import { getUser } from "../middleware/auth";

export async function getHouseholdId(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<string | null> {
  const user = getUser(c);
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const { data } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();
  return data?.household_id ?? null;
}

export async function requireHouseholdId(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<string> {
  const householdId = await getHouseholdId(c);
  if (!householdId) {
    throw new Error("NO_HOUSEHOLD");
  }
  return householdId;
}
