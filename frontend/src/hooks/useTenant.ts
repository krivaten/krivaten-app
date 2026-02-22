import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getSingleState } from "@/lib/state";
import type { Tenant } from "@/types/tenant";

export function useTenant() {
  const { session, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      await api.get("/api/v1/profiles/me");
      const data = await api.get<Tenant>("/api/v1/tenants/mine");
      setTenant(data);
      setState(getSingleState(data));
    } catch (err) {
      // 404 means no tenant yet — not an error
      if (err instanceof Error && err.message.includes("404")) {
        setTenant(null);
        setState(State.NONE);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load workspace");
        setState(State.ERROR);
      }
    }
  }, []);

  const createTenant = useCallback(async (name: string) => {
    const data = await api.post<Tenant>("/api/v1/tenants", { name });
    setTenant(data);
    setState(getSingleState(data));
    return data;
  }, []);

  const updateTenant = useCallback(async (updates: { name?: string; settings?: Record<string, unknown> }) => {
    const data = await api.put<Tenant>("/api/v1/tenants/mine", updates);
    setTenant(data);
    return data;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(State.NONE);
      return;
    }
    fetchTenant();
  }, [authLoading, session, fetchTenant]);

  return { tenant, state, error, createTenant, updateTenant, refetch: fetchTenant };
}
