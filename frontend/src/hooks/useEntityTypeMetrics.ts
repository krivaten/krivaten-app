import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { EntityTypeMetricAssociation } from "@/types/metric";

export function useEntityTypeMetrics(entityTypeId: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entityTypeMetrics.list(entityTypeId),
    queryFn: () =>
      api.get<EntityTypeMetricAssociation[]>(
        `/api/v1/entity-type-metrics?entity_type_id=${entityTypeId}`,
      ),
    enabled: !authLoading && !!session && !!entityTypeId,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const updateMutation = useMutation({
    mutationFn: (metrics: Array<{ metric_id: string; position: number }>) =>
      api.put<EntityTypeMetricAssociation[]>("/api/v1/entity-type-metrics", {
        entity_type_id: entityTypeId,
        metrics,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entityTypeMetrics.all() });
    },
  });

  return {
    associations: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    updateAssociations: updateMutation.mutateAsync,
    refetch: query.refetch,
  };
}
