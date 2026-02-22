declare namespace Global {
  interface Env {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    SUPABASE_JWT_SECRET: string;
    FRONTEND_URL: string;
  }

  interface User {
    id: string;
    email: string | null;
    role: string | null;
    metadata: Record<string, unknown>;
  }

  interface Variables {
    user: User;
    accessToken: string;
  }

  interface Tenant {
    id: string;
    name: string;
    slug: string | null;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }

  interface Vocabulary {
    id: string;
    tenant_id: string | null;
    vocabulary_type: string;
    code: string;
    name: string;
    description: string | null;
    path: string | null;
    properties: Record<string, unknown>;
    is_system: boolean;
    created_at: string;
    updated_at: string;
  }

  interface Entity {
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

  interface Edge {
    id: string;
    tenant_id: string;
    source_id: string;
    target_id: string;
    edge_type_id: string | null;
    edge_type: string;
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

  interface Observation {
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
    location: unknown | null;
    elevation_m: number | null;
    attributes: Record<string, unknown>;
    created_at: string;
    subject?: Pick<Entity, "id" | "name">;
    variable?: Vocabulary;
    unit?: Vocabulary;
  }

  interface AuditLogEntry {
    id: string;
    tenant_id: string;
    user_id: string | null;
    action: string;
    table_name: string;
    record_id: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
  }
}
