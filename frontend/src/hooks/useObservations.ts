import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObservations = useCallback(async () => {
    try {
      setLoading(true);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load observations");
    } finally {
      setLoading(false);
    }
  }, [filters?.entity_id, filters?.category, filters?.from, filters?.to, filters?.tags, filters?.page, filters?.per_page]);

  const createObservation = useCallback(async (observation: ObservationCreate) => {
    const data = await api.post<Observation>("/api/observations", observation);
    setObservations((prev) => [data, ...prev]);
    setCount((prev) => prev + 1);
    return data;
  }, []);

  const deleteObservation = useCallback(async (id: string) => {
    await api.delete(`/api/observations/${id}`);
    setObservations((prev) => prev.filter((o) => o.id !== id));
    setCount((prev) => prev - 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      return;
    }
    fetchObservations();
  }, [authLoading, session, fetchObservations]);

  return { observations, count, loading, error, createObservation, deleteObservation, refetch: fetchObservations };
}
