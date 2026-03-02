import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState, getQuerySingleState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Tracker } from "@/types/tracker";

export function useTrackers(entityType?: string) {
  const { session, loading: authLoading } = useAuth();

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

  return {
    trackers: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    refetch: query.refetch,
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
