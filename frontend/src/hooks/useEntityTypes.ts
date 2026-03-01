import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { EntityType } from "@/types/entityType";

export function useEntityTypes() {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.entityTypes.list(),
    queryFn: () => api.get<EntityType[]>("/api/v1/entity-types"),
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  return {
    entityTypes: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
