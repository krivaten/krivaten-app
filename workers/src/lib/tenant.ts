import { Context } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { createSupabaseClientWithAuth } from "./supabase";

export async function getTenantId(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<string | null> {
  const user = c.get("user");
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));
  const { data } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
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
