import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState, getQuerySingleState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Tracker, TrackerCreate } from "@/types/tracker";

export function useTrackers(entityType?: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.trackers.list(entityType),
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entity_type", entityType);
      const qs = params.toString();
      return api.get<Tracker[]>(`/api/v1/trackers${qs ? `?${qs}` : ""}`);
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const createMutation = useMutation({
    mutationFn: (data: TrackerCreate) => api.post<Tracker>("/api/v1/trackers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackers.all() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrackerCreate> }) =>
      api.put<Tracker>(`/api/v1/trackers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trackers.detail(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/trackers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackers.all() });
    },
  });

  return {
    trackers: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    createTracker: createMutation.mutateAsync,
    updateTracker: updateMutation.mutateAsync,
    deleteTracker: deleteMutation.mutateAsync,
  };
}

export function useTracker(id: string) {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.trackers.detail(id),
    queryFn: () => api.get<Tracker>(`/api/v1/trackers/${id}`),
    enabled: !authLoading && !!session && !!id,
  });

  const state =
    !authLoading && !session ? State.NONE : getQuerySingleState(query);

  return {
    tracker: query.data ?? null,
    state,
    error: query.error?.message ?? null,
  };
}
