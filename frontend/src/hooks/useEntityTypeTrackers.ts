import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { EntityTypeTrackerAssociation } from "@/types/tracker";

export function useEntityTypeTrackers(entityTypeId: string) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entityTypeTrackers.list(entityTypeId),
    queryFn: () =>
      api.get<EntityTypeTrackerAssociation[]>(
        `/api/v1/entity-type-trackers?entity_type_id=${entityTypeId}`,
      ),
    enabled: !authLoading && !!session && !!entityTypeId,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const updateMutation = useMutation({
    mutationFn: (trackers: Array<{ tracker_id: string; position: number }>) =>
      api.put<EntityTypeTrackerAssociation[]>("/api/v1/entity-type-trackers", {
        entity_type_id: entityTypeId,
        trackers,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entityTypeTrackers.all() });
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
