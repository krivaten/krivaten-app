import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Metric } from "@/types/metric";

export interface EntityMetricEntry {
  metric: Metric;
  is_default: boolean;
  is_enabled: boolean;
}

export function useEntityMetrics(entityId: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entities.metrics(entityId),
    queryFn: () =>
      api.get<EntityMetricEntry[]>(
        `/api/v1/entities/${entityId}/metrics`,
      ),
    enabled: !authLoading && !!session && !!entityId,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const updateMetricsMutation = useMutation({
    mutationFn: (
      overrides: Array<{ metric_id: string; is_enabled: boolean }>,
    ) =>
      api.put<EntityMetricEntry[]>(
        `/api/v1/entities/${entityId}/metrics`,
        overrides,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.metrics(entityId),
      });
    },
  });

  return {
    metrics: query.data ?? [],
    enabledMetrics: (query.data ?? []).filter((t) => t.is_enabled),
    state,
    error: query.error?.message ?? null,
    updateMetrics: updateMetricsMutation.mutateAsync,
    refetch: query.refetch,
  };
}
