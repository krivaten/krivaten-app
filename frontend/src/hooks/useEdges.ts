import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getCollectionState } from "@/lib/state";
import type { Edge } from "@/types/edge";

interface EdgeCreate {
  source_id: string;
  target_id: string;
  edge_type: string;
  edge_type_id?: string;
  label?: string;
  weight?: number;
  properties?: Record<string, unknown>;
  valid_from?: string;
  valid_to?: string;
}

export function useEdges(entityId?: string) {
  const { session, loading: authLoading } = useAuth();
  const [edges, setEdges] = useState<Edge[]>([]);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchEdges = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      const params = new URLSearchParams();
      if (entityId) params.set("entity_id", entityId);
      const qs = params.toString();
      const data = await api.get<Edge[]>(`/api/v1/edges${qs ? `?${qs}` : ""}`);
      setEdges(data);
      setState(getCollectionState(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load edges");
      setState(State.ERROR);
    }
  }, [entityId]);

  const createEdge = useCallback(async (edge: EdgeCreate) => {
    const data = await api.post<Edge>("/api/v1/edges", edge);
    setEdges((prev) => {
      const next = [...prev, data];
      setState(getCollectionState(next));
      return next;
    });
    return data;
  }, []);

  const deleteEdge = useCallback(async (id: string) => {
    await api.delete(`/api/v1/edges/${id}`);
    setEdges((prev) => {
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
    fetchEdges();
  }, [authLoading, session, fetchEdges]);

  return { edges, state, error, createEdge, deleteEdge, refetch: fetchEdges };
}
