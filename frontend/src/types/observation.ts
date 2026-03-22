import type { Entity } from "./entity";
import type { Metric } from "./metric";

export interface Observation {
  id: string;
  tenant_id: string;
  entity_id: string;
  metric_id: string;
  observer_id: string | null;
  observed_at: string;
  field_values: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  entity?: Pick<Entity, "id" | "name">;
  metric?: Pick<Metric, "id" | "code" | "name">;
}

export interface ObservationCreate {
  entity_id: string;
  metric_id?: string;
  metric?: string;
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
