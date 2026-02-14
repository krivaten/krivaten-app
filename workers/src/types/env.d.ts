export interface Env {
  SUPABASE_URL: string
  SUPABASE_KEY: string
  SUPABASE_JWT_SECRET: string
  FRONTEND_URL: string
}

export interface User {
  id: string
  email: string | null
  role: string | null
  metadata: Record<string, unknown>
}

export interface Variables {
  user: User
}
