import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getSingleState } from "@/lib/state";
import type { Household } from "@/types/household";

export function useHousehold() {
  const { session, loading: authLoading } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchHousehold = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      const data = await api.get<Household>("/api/households/mine");
      setHousehold(data);
      setState(getSingleState(data));
    } catch (err) {
      // 404 means no household yet — not an error
      if (err instanceof Error && err.message.includes("404")) {
        setHousehold(null);
        setState(State.NONE);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load household");
        setState(State.ERROR);
      }
    }
  }, []);

  const createHousehold = useCallback(async (name: string) => {
    const data = await api.post<Household>("/api/households", { name });
    setHousehold(data);
    setState(getSingleState(data));
    return data;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(State.NONE);
      return;
    }
    fetchHousehold();
  }, [authLoading, session, fetchHousehold]);

  return { household, state, error, createHousehold, refetch: fetchHousehold };
}
