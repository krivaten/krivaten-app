import type { VocabularyType } from "@/types/vocabulary";

interface EntityFilters {
  type?: string;
  search?: string;
  taxonomy_path?: string;
  active?: boolean;
}

interface VocabularyFilters {
  type?: VocabularyType;
}

interface ObservationFilters {
  subject_id?: string;
  variable?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export const queryKeys = {
  profile: {
    me: () => ["profile", "me"] as const,
  },
  tenant: {
    mine: () => ["tenant", "mine"] as const,
  },
  entities: {
    all: () => ["entities"] as const,
    list: (filters?: EntityFilters) =>
      ["entities", "list", filters ?? {}] as const,
    detail: (id: string) => ["entities", "detail", id] as const,
  },
  vocabularies: {
    all: () => ["vocabularies"] as const,
    list: (filters?: VocabularyFilters) =>
      ["vocabularies", "list", filters ?? {}] as const,
  },
  observations: {
    all: () => ["observations"] as const,
    list: (filters?: ObservationFilters) =>
      ["observations", "list", filters ?? {}] as const,
  },
  edges: {
    all: () => ["edges"] as const,
    list: (entityId?: string) =>
      ["edges", "list", entityId ?? "all"] as const,
  },
};
