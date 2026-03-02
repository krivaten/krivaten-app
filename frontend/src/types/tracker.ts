export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "single_select"
  | "multi_select"
  | "textarea"
  | "datetime";

export interface TrackerField {
  id: string;
  tracker_id: string;
  code: string;
  name: string;
  field_type: FieldType;
  options: Array<{ value: string; label: string }> | null;
  is_required: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Tracker {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_system: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
  fields?: TrackerField[];
}

export interface TrackerCreate {
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  fields: TrackerFieldCreate[];
}

export interface TrackerFieldCreate {
  id?: string;
  code: string;
  name: string;
  field_type: FieldType;
  options?: Array<{ value: string; label: string }> | null;
  is_required: boolean;
  position: number;
}

export interface EntityTypeTrackerAssociation {
  tracker: Tracker;
  position: number;
  is_system_default: boolean;
}
