import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

interface RelatedEntity {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  depth: number;
  relationship_id: string;
  relationship_type: string;
  direction: string;
}

export function useRelatedEntities(entityId: string, maxDepth: number = 2) {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.entities.related(entityId),
    queryFn: () =>
      api.get<RelatedEntity[]>(
        `/api/v1/entities/${entityId}/related?max_depth=${maxDepth}`,
      ),
    enabled: !authLoading && !!session && !!entityId,
  });

  return {
    relatedEntities: query.data ?? [],
    isLoading: query.isLoading,
  };
}
