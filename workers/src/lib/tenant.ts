import { Context } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { createSupabaseClientWithAuth } from "./supabase";

export async function getTenantId(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<string | null> {
  const user = c.get("user");
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const { data } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

export async function requireTenantId(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<string> {
  const tenantId = await getTenantId(c);
  if (!tenantId) {
    throw new Error("NO_TENANT");
  }
  return tenantId;
}
