import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Entity, EntityCreate } from "@/types/entity";

export function useEntities(filters?: { type?: string; parent_id?: string }) {
  const { session, loading: authLoading } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.parent_id) params.set("parent_id", filters.parent_id);
      const qs = params.toString();
      const data = await api.get<Entity[]>(`/api/entities${qs ? `?${qs}` : ""}`);
      setEntities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entities");
    } finally {
      setLoading(false);
    }
  }, [filters?.type, filters?.parent_id]);

  const createEntity = useCallback(async (entity: EntityCreate) => {
    const data = await api.post<Entity>("/api/entities", entity);
    setEntities((prev) => [...prev, data]);
    return data;
  }, []);

  const updateEntity = useCallback(async (id: string, updates: Partial<Entity>) => {
    const data = await api.put<Entity>(`/api/entities/${id}`, updates);
    setEntities((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  }, []);

  const archiveEntity = useCallback(async (id: string) => {
    await api.delete(`/api/entities/${id}`);
    setEntities((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      return;
    }
    fetchEntities();
  }, [authLoading, session, fetchEntities]);

  return { entities, loading, error, createEntity, updateEntity, archiveEntity, refetch: fetchEntities };
}
