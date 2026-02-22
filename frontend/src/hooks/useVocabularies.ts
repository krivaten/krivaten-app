import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryCollectionState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Vocabulary, VocabularyType } from "@/types/vocabulary";

interface VocabularyFilters {
  type?: VocabularyType;
}

export function useVocabularies(filters?: VocabularyFilters) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.vocabularies.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      const qs = params.toString();
      return api.get<Vocabulary[]>(
        `/api/v1/vocabularies${qs ? `?${qs}` : ""}`,
      );
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryCollectionState(query);

  const createVocabularyMutation = useMutation({
    mutationFn: (
      vocab: Omit<
        Vocabulary,
        "id" | "tenant_id" | "is_system" | "created_at" | "updated_at"
      >,
    ) => api.post<Vocabulary>("/api/v1/vocabularies", vocab),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.all(),
      });
    },
  });

  const updateVocabularyMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; description?: string; path?: string };
    }) => api.put<Vocabulary>(`/api/v1/vocabularies/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.all(),
      });
    },
  });

  const deleteVocabularyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/vocabularies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.all(),
      });
    },
  });

  return {
    vocabularies: query.data ?? [],
    state,
    error: query.error?.message ?? null,
    createVocabulary: createVocabularyMutation.mutateAsync,
    updateVocabulary: async (
      id: string,
      updates: { name?: string; description?: string; path?: string },
    ) => updateVocabularyMutation.mutateAsync({ id, updates }),
    deleteVocabulary: deleteVocabularyMutation.mutateAsync,
    refetch: query.refetch,
  };
}
