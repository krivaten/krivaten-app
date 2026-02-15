export interface Observation {
  id: string;
  household_id: string;
  entity_id: string;
  observer_id: string;
  observed_at: string;
  category: string;
  subcategory: string | null;
  data: Record<string, unknown>;
  notes: string | null;
  tags: string[];
  attachments: unknown[];
  created_at: string;
  entity?: { id: string; name: string; type: string };
}

export interface ObservationCreate {
  entity_id: string;
  observed_at?: string;
  category: string;
  subcategory?: string;
  data?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}
