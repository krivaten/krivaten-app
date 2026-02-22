import type { Vocabulary } from "./vocabulary";

export interface Entity {
  id: string;
  tenant_id: string;
  entity_type_id: string;
  name: string;
  description: string | null;
  external_id: string | null;
  taxonomy_path: string | null;
  location: unknown | null;
  elevation_m: number | null;
  attributes: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  entity_type?: Vocabulary;
}
