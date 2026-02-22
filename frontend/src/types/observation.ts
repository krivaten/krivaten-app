import type { Entity } from "./entity";
import type { Vocabulary } from "./vocabulary";

export interface Observation {
  id: string;
  tenant_id: string;
  observed_at: string;
  subject_id: string;
  observer_id: string | null;
  variable_id: string | null;
  value_numeric: number | null;
  value_text: string | null;
  value_boolean: boolean | null;
  value_json: Record<string, unknown> | null;
  unit_id: string | null;
  quality_flag: string | null;
  method_id: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  subject?: Pick<Entity, "id" | "name">;
  variable?: Vocabulary;
  unit?: Vocabulary;
}

export interface ObservationCreate {
  subject_id: string;
  variable_id?: string;
  variable?: string;
  value_numeric?: number;
  value_text?: string;
  value_boolean?: boolean;
  value_json?: Record<string, unknown>;
  unit_id?: string;
  quality_flag?: string;
  method_id?: string;
  observed_at?: string;
  attributes?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}
