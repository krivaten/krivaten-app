import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.edges.list(entityId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityId) params.set("entity_id", entityId);
      const qs = params.toString();
      return api.get<Edge[]>(`/api/v1/edges${qs ? `?${qs}` : ""}`);
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const createEdgeMutation = useMutation({
    mutationFn: (edge: EdgeCreate) =>
      api.post<Edge>("/api/v1/edges", edge),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.edges.all() });
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/edges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.edges.all() });
    },
  });

  return {
    edges: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    createEdge: createEdgeMutation.mutateAsync,
    deleteEdge: deleteEdgeMutation.mutateAsync,
    refetch: query.refetch,
  };
}
