import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Household } from "@/types/household";

export function useHousehold() {
  const { session, loading: authLoading } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHousehold = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Household>("/api/households/mine");
      setHousehold(data);
    } catch (err) {
      // 404 means no household yet — not an error
      if (err instanceof Error && err.message.includes("404")) {
        setHousehold(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load household");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createHousehold = useCallback(async (name: string) => {
    const data = await api.post<Household>("/api/households", { name });
    setHousehold(data);
    return data;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      return;
    }
    fetchHousehold();
  }, [authLoading, session, fetchHousehold]);

  return { household, loading, error, createHousehold, refetch: fetchHousehold };
}
