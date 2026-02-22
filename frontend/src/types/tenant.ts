export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
