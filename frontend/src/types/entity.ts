export type EntityType =
  | "person"
  | "location"
  | "plant"
  | "project"
  | "equipment"
  | "supply"
  | "process"
  | "animal";

export interface Entity {
  id: string;
  household_id: string;
  type: EntityType;
  name: string;
  parent_id: string | null;
  properties: Record<string, unknown>;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntityCreate {
  type: EntityType;
  name: string;
  parent_id?: string;
  properties?: Record<string, unknown>;
}
