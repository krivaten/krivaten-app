import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQueryPaginatedState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type {
  Observation,
  ObservationCreate,
  PaginatedResponse,
} from "@/types/observation";

interface ObservationFilters {
  subject_id?: string;
  variable?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export function useObservations(filters?: ObservationFilters) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.observations.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.subject_id) params.set("subject_id", filters.subject_id);
      if (filters?.variable) params.set("variable", filters.variable);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.per_page) params.set("per_page", String(filters.per_page));
      const qs = params.toString();
      return api.get<PaginatedResponse<Observation>>(
        `/api/v1/observations${qs ? `?${qs}` : ""}`,
      );
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQueryPaginatedState(query);

  const createObservationMutation = useMutation({
    mutationFn: (observation: ObservationCreate) =>
      api.post<Observation>("/api/v1/observations", observation),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.observations.all(),
      });
    },
  });

  const deleteObservationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/observations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.observations.all(),
      });
    },
  });

  return {
    observations: query.data?.data ?? [],
    count: query.data?.count ?? 0,
    state,
    error: query.error?.message ?? null,
    createObservation: createObservationMutation.mutateAsync,
    deleteObservation: deleteObservationMutation.mutateAsync,
    refetch: query.refetch,
  };
}
