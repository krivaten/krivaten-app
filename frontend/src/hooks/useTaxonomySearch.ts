import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface TaxonomyResult {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  taxonomy_path: string;
}

export function useTaxonomySearch(prefix: string) {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["taxonomy", "search", prefix],
    queryFn: () =>
      api.get<TaxonomyResult[]>(
        `/api/v1/search/taxonomy?path=${encodeURIComponent(prefix)}`,
      ),
    enabled: !authLoading && !!session && prefix.length >= 2,
  });

  const suggestions = Array.from(
    new Set((query.data ?? []).map((r) => r.taxonomy_path)),
  ).sort();

  return { suggestions, isLoading: query.isLoading };
}
