import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getCollectionState } from "@/lib/state";
import type { Observation, ObservationCreate, PaginatedResponse } from "@/types/observation";

interface ObservationFilters {
  entity_id?: string;
  category?: string;
  from?: string;
  to?: string;
  tags?: string;
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
      if (filters?.entity_id) params.set("entity_id", filters.entity_id);
      if (filters?.category) params.set("category", filters.category);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      if (filters?.tags) params.set("tags", filters.tags);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.per_page) params.set("per_page", String(filters.per_page));
      const qs = params.toString();
      const result = await api.get<PaginatedResponse<Observation>>(
        `/api/observations${qs ? `?${qs}` : ""}`,
      );
      setObservations(result.data);
      setCount(result.count);
      setState(getCollectionState(result.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load observations");
      setState(State.ERROR);
    }
  }, [filters?.entity_id, filters?.category, filters?.from, filters?.to, filters?.tags, filters?.page, filters?.per_page]);

  const createObservation = useCallback(async (observation: ObservationCreate) => {
    const data = await api.post<Observation>("/api/observations", observation);
    setObservations((prev) => {
      const next = [data, ...prev];
      setState(getCollectionState(next));
      return next;
    });
    setCount((prev) => prev + 1);
    return data;
  }, []);

  const deleteObservation = useCallback(async (id: string) => {
    await api.delete(`/api/observations/${id}`);
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
