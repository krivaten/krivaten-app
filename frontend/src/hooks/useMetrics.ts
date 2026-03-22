import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState, getQuerySingleState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Metric, MetricCreate } from "@/types/metric";

export function useMetrics(entityType?: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.metrics.list(entityType),
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entity_type", entityType);
      const qs = params.toString();
      return api.get<Metric[]>(`/api/v1/metrics${qs ? `?${qs}` : ""}`);
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const createMutation = useMutation({
    mutationFn: (data: MetricCreate) => api.post<Metric>("/api/v1/metrics", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MetricCreate> }) =>
      api.put<Metric>(`/api/v1/metrics/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.detail(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/metrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all() });
    },
  });

  return {
    metrics: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    createMetric: createMutation.mutateAsync,
    updateMetric: updateMutation.mutateAsync,
    deleteMetric: deleteMutation.mutateAsync,
  };
}

export function useMetric(id: string) {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.metrics.detail(id),
    queryFn: () => api.get<Metric>(`/api/v1/metrics/${id}`),
    enabled: !authLoading && !!session && !!id,
  });

  const state =
    !authLoading && !session ? State.NONE : getQuerySingleState(query);

  return {
    metric: query.data ?? null,
    state,
    error: query.error?.message ?? null,
  };
}
