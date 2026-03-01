import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Relationship, RelationshipCreate } from "@/types/relationship";

export function useRelationships(entityId?: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.relationships.list(entityId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityId) params.set("entity_id", entityId);
      const qs = params.toString();
      return api.get<Relationship[]>(
        `/api/v1/relationships${qs ? `?${qs}` : ""}`,
      );
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const createRelationshipMutation = useMutation({
    mutationFn: (rel: RelationshipCreate) =>
      api.post<Relationship>("/api/v1/relationships", rel),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.relationships.all(),
      });
    },
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/relationships/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.relationships.all(),
      });
    },
  });

  return {
    relationships: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    createRelationship: createRelationshipMutation.mutateAsync,
    deleteRelationship: deleteRelationshipMutation.mutateAsync,
    refetch: query.refetch,
  };
}
