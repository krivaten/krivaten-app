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

  interface Household {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }

  interface Entity {
    id: string;
    household_id: string;
    type: string;
    name: string;
    parent_id: string | null;
    properties: Record<string, unknown>;
    archived: boolean;
    created_at: string;
    updated_at: string;
  }

  interface Observation {
    id: string;
    household_id: string;
    entity_id: string;
    observer_id: string;
    observed_at: string;
    category: string;
    subcategory: string | null;
    data: Record<string, unknown>;
    notes: string | null;
    tags: string[];
    attachments: unknown[];
    created_at: string;
  }

  interface Relationship {
    id: string;
    household_id: string;
    from_entity_id: string;
    to_entity_id: string;
    relationship_type: string;
    properties: Record<string, unknown>;
    valid_from: string | null;
    valid_to: string | null;
    created_at: string;
  }
}
