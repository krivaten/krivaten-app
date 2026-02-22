import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getCollectionState } from "@/lib/state";
import type { Observation, ObservationCreate, PaginatedResponse } from "@/types/observation";

interface ObservationFilters {
  subject_id?: string;
  variable?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export function useObservations(filters?: ObservationFilters) {
  const { session, loading: authLoading } = useAuth();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [count, setCount] = useState(0);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchObservations = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.subject_id) params.set("subject_id", filters.subject_id);
      if (filters?.variable) params.set("variable", filters.variable);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.per_page) params.set("per_page", String(filters.per_page));
      const qs = params.toString();
      const result = await api.get<PaginatedResponse<Observation>>(
        `/api/v1/observations${qs ? `?${qs}` : ""}`,
      );
      setObservations(result.data);
      setCount(result.count);
      setState(getCollectionState(result.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load observations");
      setState(State.ERROR);
    }
  }, [filters?.subject_id, filters?.variable, filters?.from, filters?.to, filters?.page, filters?.per_page]);

  const createObservation = useCallback(async (observation: ObservationCreate) => {
    const data = await api.post<Observation>("/api/v1/observations", observation);
    setObservations((prev) => {
      const next = [data, ...prev];
      setState(getCollectionState(next));
      return next;
    });
    setCount((prev) => prev + 1);
    return data;
  }, []);

  const deleteObservation = useCallback(async (id: string) => {
    await api.delete(`/api/v1/observations/${id}`);
    setObservations((prev) => {
      const next = prev.filter((o) => o.id !== id);
      setState(getCollectionState(next));
      return next;
    });
    setCount((prev) => prev - 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(State.NONE);
      return;
    }
    fetchObservations();
  }, [authLoading, session, fetchObservations]);

  return { observations, count, state, error, createObservation, deleteObservation, refetch: fetchObservations };
}
