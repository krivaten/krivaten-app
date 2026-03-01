import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Tracker } from "@/types/tracker";

export interface EntityTrackerEntry {
  tracker: Tracker;
  is_default: boolean;
  is_enabled: boolean;
}

export function useEntityTrackers(entityId: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entities.trackers(entityId),
    queryFn: () =>
      api.get<EntityTrackerEntry[]>(
        `/api/v1/entities/${entityId}/trackers`,
      ),
    enabled: !authLoading && !!session && !!entityId,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const updateTrackersMutation = useMutation({
    mutationFn: (
      overrides: Array<{ tracker_id: string; is_enabled: boolean }>,
    ) =>
      api.put<EntityTrackerEntry[]>(
        `/api/v1/entities/${entityId}/trackers`,
        overrides,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.trackers(entityId),
      });
    },
  });

  return {
    trackers: query.data ?? [],
    enabledTrackers: (query.data ?? []).filter((t) => t.is_enabled),
    state,
    error: query.error?.message ?? null,
    updateTrackers: updateTrackersMutation.mutateAsync,
    refetch: query.refetch,
  };
}
