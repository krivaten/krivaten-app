export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "single_select"
  | "multi_select"
  | "textarea"
  | "datetime";

export interface MetricField {
  id: string;
  metric_id: string;
  code: string;
  name: string;
  field_type: FieldType;
  options: Array<{ value: string; label: string }> | null;
  is_required: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_system: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
  fields?: MetricField[];
}

export interface MetricCreate {
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  fields: MetricFieldCreate[];
}

export interface MetricFieldCreate {
  id?: string;
  code: string;
  name: string;
  field_type: FieldType;
  options?: Array<{ value: string; label: string }> | null;
  is_required: boolean;
  position: number;
}

export interface EntityTypeMetricAssociation {
  metric: Metric;
  position: number;
  is_system_default: boolean;
}
