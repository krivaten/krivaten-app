import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getCollectionState } from "@/lib/state";
import type { Entity, EntityCreate } from "@/types/entity";

interface EntityFilters {
  type?: string;
  search?: string;
  taxonomy_path?: string;
  active?: boolean;
}

export function useEntities(filters?: EntityFilters) {
  const { session, loading: authLoading } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.taxonomy_path) params.set("taxonomy_path", filters.taxonomy_path);
      if (filters?.active !== undefined) params.set("active", String(filters.active));
      const qs = params.toString();
      const data = await api.get<Entity[]>(`/api/v1/entities${qs ? `?${qs}` : ""}`);
      setEntities(data);
      setState(getCollectionState(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entities");
      setState(State.ERROR);
    }
  }, [filters?.type, filters?.search, filters?.taxonomy_path, filters?.active]);

  const createEntity = useCallback(async (entity: EntityCreate) => {
    const data = await api.post<Entity>("/api/v1/entities", entity);
    setEntities((prev) => {
      const next = [...prev, data];
      setState(getCollectionState(next));
      return next;
    });
    return data;
  }, []);

  const updateEntity = useCallback(async (id: string, updates: Partial<Entity>) => {
    const data = await api.put<Entity>(`/api/v1/entities/${id}`, updates);
    setEntities((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  }, []);

  const archiveEntity = useCallback(async (id: string) => {
    await api.delete(`/api/v1/entities/${id}`);
    setEntities((prev) => {
      const next = prev.filter((e) => e.id !== id);
      setState(getCollectionState(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(State.NONE);
      return;
    }
    fetchEntities();
  }, [authLoading, session, fetchEntities]);

  return { entities, state, error, createEntity, updateEntity, archiveEntity, refetch: fetchEntities };
}
