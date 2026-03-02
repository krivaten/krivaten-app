interface EntityFilters {
  type?: string;
  search?: string;
  taxonomy_path?: string;
  active?: boolean;
}

interface ObservationFilters {
  entity_id?: string;
  tracker?: string;
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
  trackers: {
    all: () => ["trackers"] as const,
    list: (entityType?: string) =>
      ["trackers", "list", entityType ?? "all"] as const,
    detail: (id: string) => ["trackers", "detail", id] as const,
  },
  entities: {
    all: () => ["entities"] as const,
    list: (filters?: EntityFilters) =>
      ["entities", "list", filters ?? {}] as const,
    detail: (id: string) => ["entities", "detail", id] as const,
    trackers: (id: string) => ["entities", "trackers", id] as const,
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
  entityTypeTrackers: {
    all: () => ["entityTypeTrackers"] as const,
    list: (entityTypeId: string) =>
      ["entityTypeTrackers", "list", entityTypeId] as const,
  },
};
