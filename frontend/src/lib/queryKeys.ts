interface EntityFilters {
  type?: string;
  search?: string;
  taxonomy_path?: string;
  active?: boolean;
}

interface ObservationFilters {
  entity_id?: string;
  metric?: string;
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
  entityTypes: {
    all: () => ["entityTypes"] as const,
    list: () => ["entityTypes", "list"] as const,
  },
  metrics: {
    all: () => ["metrics"] as const,
    list: (entityType?: string) =>
      ["metrics", "list", entityType ?? "all"] as const,
    detail: (id: string) => ["metrics", "detail", id] as const,
  },
  entities: {
    all: () => ["entities"] as const,
    list: (filters?: EntityFilters) =>
      ["entities", "list", filters ?? {}] as const,
    detail: (id: string) => ["entities", "detail", id] as const,
    metrics: (id: string) => ["entities", "metrics", id] as const,
    related: (id: string) => ["entities", "related", id] as const,
  },
  observations: {
    all: () => ["observations"] as const,
    list: (filters?: ObservationFilters) =>
      ["observations", "list", filters ?? {}] as const,
    detail: (id: string) => ["observations", "detail", id] as const,
  },
  relationships: {
    all: () => ["relationships"] as const,
    list: (entityId?: string) =>
      ["relationships", "list", entityId ?? "all"] as const,
  },
  entityTypeMetrics: {
    all: () => ["entityTypeMetrics"] as const,
    list: (entityTypeId: string) =>
      ["entityTypeMetrics", "list", entityTypeId] as const,
  },
};
