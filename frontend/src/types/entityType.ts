export interface EntityType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
