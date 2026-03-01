import type { Entity } from "./entity";

export interface Relationship {
  id: string;
  tenant_id: string;
  source_id: string;
  target_id: string;
  type: string;
  label: string | null;
  weight: number;
  properties: Record<string, unknown>;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
  source?: Pick<Entity, "id" | "name">;
  target?: Pick<Entity, "id" | "name">;
}

export interface RelationshipCreate {
  source_id: string;
  target_id: string;
  type: string;
  label?: string;
  weight?: number;
  properties?: Record<string, unknown>;
  valid_from?: string;
  valid_to?: string;
}
