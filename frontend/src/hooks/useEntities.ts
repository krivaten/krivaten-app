import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Entity, EntityCreate } from "@/types/entity";

interface EntityFilters {
  type?: string;
  search?: string;
  taxonomy_path?: string;
  active?: boolean;
}

export function useEntities(filters?: EntityFilters) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entities.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.taxonomy_path)
        params.set("taxonomy_path", filters.taxonomy_path);
      if (filters?.active !== undefined)
        params.set("active", String(filters.active));
      const qs = params.toString();
      return api.get<Entity[]>(`/api/v1/entities${qs ? `?${qs}` : ""}`);
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const createEntityMutation = useMutation({
    mutationFn: (entity: EntityCreate) =>
      api.post<Entity>("/api/v1/entities", entity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.all() });
    },
  });

  const updateEntityMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Entity>;
    }) => api.put<Entity>(`/api/v1/entities/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.all() });
    },
  });

  const archiveEntityMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/entities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.all() });
    },
  });

  return {
    entities: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    createEntity: createEntityMutation.mutateAsync,
    updateEntity: async (id: string, updates: Partial<Entity>) =>
      updateEntityMutation.mutateAsync({ id, updates }),
    archiveEntity: archiveEntityMutation.mutateAsync,
    refetch: query.refetch,
  };
}
