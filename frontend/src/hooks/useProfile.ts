import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQuerySingleState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile, ProfileUpdate } from "@/types/profile";

export function useProfile() {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => api.get<Profile>("/api/v1/profiles/me"),
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session ? State.NONE : getQuerySingleState(query);

  const updateProfileMutation = useMutation({
    mutationFn: (updates: ProfileUpdate) =>
      api.put<Profile>("/api/v1/profiles/me", updates),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.me(), data);
    },
  });

  return {
    profile: query.data ?? null,
    state,
    error: query.error?.message ?? null,
    updateProfile: updateProfileMutation.mutateAsync,
    refetch: query.refetch,
  };
}
