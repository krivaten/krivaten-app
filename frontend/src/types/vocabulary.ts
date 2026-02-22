export type VocabularyType =
  | "variable"
  | "unit"
  | "entity_type"
  | "edge_type"
  | "method"
  | "quality_flag";

export interface Vocabulary {
  id: string;
  tenant_id: string | null;
  vocabulary_type: VocabularyType;
  code: string;
  name: string;
  description: string | null;
  path: string | null;
  properties: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
