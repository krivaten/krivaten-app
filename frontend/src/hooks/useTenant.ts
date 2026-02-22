import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getSingleState } from "@/lib/state";
import { queryKeys } from "@/lib/queryKeys";
import type { Tenant } from "@/types/tenant";

export function useTenant() {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tenant.mine(),
    queryFn: async (): Promise<Tenant | null> => {
      await api.get("/api/v1/profiles/me");
      try {
        return await api.get<Tenant>("/api/v1/tenants/mine");
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          return null;
        }
        throw err;
      }
    },
    enabled: !authLoading && !!session,
  });

  const state =
    !authLoading && !session
      ? State.NONE
      : query.status === "pending"
        ? State.PENDING
        : query.status === "error"
          ? State.ERROR
          : getSingleState(query.data);

  const createTenantMutation = useMutation({
    mutationFn: (name: string) =>
      api.post<Tenant>("/api/v1/tenants", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenant.mine() });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: (updates: {
      name?: string;
      settings?: Record<string, unknown>;
    }) => api.put<Tenant>("/api/v1/tenants/mine", updates),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tenant.mine(), data);
    },
  });

  return {
    tenant: query.data ?? null,
    state,
    error: query.error?.message ?? null,
    createTenant: createTenantMutation.mutateAsync,
    updateTenant: updateTenantMutation.mutateAsync,
    refetch: query.refetch,
  };
}
