import type { Entity } from "./entity";
import type { Tracker } from "./tracker";

export interface Observation {
  id: string;
  tenant_id: string;
  entity_id: string;
  tracker_id: string;
  observer_id: string | null;
  observed_at: string;
  field_values: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  entity?: Pick<Entity, "id" | "name">;
  tracker?: Pick<Tracker, "id" | "code" | "name">;
}

export interface ObservationCreate {
  entity_id: string;
  tracker_id?: string;
  tracker?: string;
  observed_at?: string;
  field_values: Record<string, unknown>;
  notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}
