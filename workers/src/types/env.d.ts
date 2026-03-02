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

  interface EntityType {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    is_system: boolean;
    created_at: string;
    updated_at: string;
  }

  interface Tracker {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    is_system: boolean;
    created_at: string;
    updated_at: string;
    fields?: TrackerField[];
  }

  interface TrackerField {
    id: string;
    tracker_id: string;
    code: string;
    name: string;
    field_type:
      | "text"
      | "number"
      | "boolean"
      | "single_select"
      | "multi_select"
      | "textarea"
      | "datetime";
    options: Array<{ value: string; label: string }> | null;
    is_required: boolean;
    position: number;
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
    entity_type?: EntityType;
  }

  interface Observation {
    id: string;
    tenant_id: string;
    entity_id: string;
    tracker_id: string;
    observer_id: string | null;
    observed_at: string;
    field_values: Record<string, unknown>;
    notes: string | null;
    created_at: string;
    entity?: Pick<Entity, "id" | "name">;
    tracker?: Pick<Tracker, "id" | "code" | "name">;
  }

  interface Relationship {
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
