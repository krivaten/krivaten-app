# CLAUDE.md

## Project Overview

Krivaten is a Universal Observation Database — a vocabulary-driven platform for tracking entities (things), edges (relationships), and observations (measurements) across any domain.

- **Frontend**: Vite + React + TypeScript + React Router + Tailwind CSS v4 + shadcn/ui → Cloudflare Pages
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Supabase (PostgreSQL with PostGIS, pgcrypto, Row Level Security)
- **Authentication**: Supabase Auth (Google, GitHub, email/password)
- **Package Manager**: pnpm (workspace monorepo)

## Project Structure

```
krivaten/
├── frontend/          # React SPA → Cloudflare Pages (port 5173)
├── workers/           # Hono API → Cloudflare Workers (port 8787)
├── supabase/          # Database migrations + seed.sql
├── package.json       # Root scripts
└── pnpm-workspace.yaml
```

## Commands

- `pnpm dev` — Start frontend + workers concurrently
- `pnpm frontend` — Frontend only
- `pnpm workers` — Workers only
- `pnpm build` — Build frontend for production
- `pnpm deploy:workers` — Deploy workers to Cloudflare
- `pnpm test:workers` — Run backend integration tests (requires `supabase start`)

## Environment Variables

**Frontend (.env):** VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_API_URL
**Workers (.dev.vars):** SUPABASE_URL, SUPABASE_KEY, SUPABASE_JWT_SECRET, FRONTEND_URL

## Database Schema

### Tables

- **tenants** — Multi-tenant workspaces (id, name, slug, settings JSONB)
- **profiles** — User profiles with tenant_id FK (auto-created on signup)
- **vocabularies** — Controlled terms: entity types, variables, units, edge types, methods, quality flags. System vocabs (tenant_id IS NULL) are shared; tenant vocabs extend them
- **entities** — Things being tracked. entity_type_id FK to vocabularies. Attributes JSONB, PostGIS location, taxonomy_path, soft-delete via is_active
- **edges** — Directed relationships between entities. edge_type (denormalized text) + edge_type_id FK. Temporal validity (valid_from/valid_to)
- **observations** — Immutable measurements. Polymorphic values: value_numeric, value_text, value_boolean, value_json. subject_id FK to entities, variable_id/unit_id/method_id FKs to vocabularies
- **audit_log** — Action history per tenant

### Entity Type System

Entity types are **vocabulary-driven** — no hardcoded CHECK constraint. The `entity_type_id` column is a FK to the vocabularies table where `vocabulary_type = 'entity_type'`. System seed data provides 8 default types (person, location, plant, animal, project, equipment, supply, process). New types are added by creating vocabulary entries — zero DDL.

### RLS Design Notes

- **`get_my_tenant_id()`**: SECURITY DEFINER function that reads `profiles.tenant_id` for the current user. Used by all tenant-scoped RLS policies. Avoids infinite recursion because it bypasses RLS on profiles.
- **Profiles table**: SELECT policy uses `auth.uid() = id` directly (own profile) plus `tenant_id = get_my_tenant_id()` (tenant members). Never subqueries back into profiles.
- **Tenant creation**: The `POST /api/v1/tenants` route generates a UUID up front, inserts without `.select()`, updates the profile's tenant_id, and THEN fetches the tenant. Avoids INSERT+SELECT chicken-and-egg.
- **Vocabularies**: System vocabs (tenant_id IS NULL) visible to all authenticated users. Tenant vocabs use `get_my_tenant_id()`.
- **All other tables** (entities, edges, observations): RLS policies use `tenant_id = get_my_tenant_id()`.

### RPC Functions

- `get_related_entities(p_entity_id, p_max_depth, p_edge_types)` — Recursive CTE graph traversal
- `get_time_series(p_entity_id, p_variable_code, p_from, p_to, p_limit)` — Time-series observations query
- `search_taxonomy(p_path_prefix, p_limit)` — Taxonomy path prefix search

## API Endpoints

All routes under `/api/v1/`:

- `GET /api/v1/health` — Health check
- `POST/GET/PUT /api/v1/tenants` — Workspace CRUD (`/mine` for current)
- `GET/PUT /api/v1/profiles/me` — Current user profile
- `GET/POST/PUT/DELETE /api/v1/vocabularies` — Vocabulary CRUD (system vocabs are read-only)
- `GET/POST/PUT/DELETE /api/v1/entities` — Entity CRUD (DELETE = soft-delete)
- `GET /api/v1/entities/:id/edges` — Entity's edges
- `GET /api/v1/entities/:id/timeseries` — Entity time-series (RPC)
- `GET /api/v1/entities/:id/related` — Graph traversal (RPC)
- `GET/POST/DELETE /api/v1/edges` — Edge CRUD
- `GET/POST/DELETE /api/v1/observations` — Observation CRUD with pagination
- `POST /api/v1/observations/batch` — Batch create observations
- `GET /api/v1/search/entities?q=` — Entity name search
- `GET /api/v1/search/taxonomy?path=` — Taxonomy prefix search (RPC)

## Testing

### Running Tests

```bash
supabase start        # Must be running (Docker required)
pnpm test:workers     # 59 integration tests against local Supabase
```

### Test Architecture

- Tests use **real Supabase auth JWTs** (not mocks) — `adminClient.auth.admin.createUser()` + `signInWithPassword()` to get tokens that pass jose JWKS verification
- Tests invoke the Hono app via `app.request(path, init, TEST_ENV)` — no HTTP server needed
- Cleanup uses the **service role client** (bypasses RLS) in `beforeEach`/`afterEach`
- Delete order matters due to FK constraints: audit_log → observations → edges → entities → vocabularies (non-system) → profiles → tenants → auth users

### Key Files

- `workers/src/test/setup.ts` — Supabase credentials, admin client, connectivity check
- `workers/src/test/helpers/auth.ts` — `createTestUser()`, `authHeaders()`, `deleteTestUser()`
- `workers/src/test/helpers/request.ts` — `appGet`, `appPost`, `appPut`, `appDelete` wrappers
- `workers/src/test/helpers/cleanup.ts` — `cleanupAllData()` via service role
- `workers/src/test/helpers/fixtures.ts` — `setupUserWithTenant()`, `getSystemVocabId()`, `createEntityForUser()`, `createObservationForUser()`, `createEdgeForUser()`

### Vocabulary Code Lookup Pattern

Tests use `getSystemVocabId(user, type, code)` to look up system vocabulary UUIDs by type and code. This avoids hardcoding UUIDs. Example: `const personTypeId = await getSystemVocabId(user, "entity_type", "person")`.

## Architecture Patterns

### Hono App Structure

- Each route module creates its own `Hono` instance with typed bindings: `new Hono<{ Bindings: Env; Variables: Variables }>()`
- Auth middleware sets `user` and `accessToken` in Hono context variables
- Routes that need tenant scope call `requireTenantId(c)` which throws if user has no tenant
- The `Env` type (`workers/src/types/env.d.ts`) uses ambient declarations (no namespace) — types like `Env`, `User`, `Variables` are globally available

### Vocabulary Codes as API Contract

The API accepts both vocabulary UUIDs and codes. For entities: `entity_type_id` (UUID) or `entity_type` (code string). For observations: `variable_id` (UUID) or `variable` (code string). The API resolves codes to UUIDs internally.

### Polymorphic Observation Values

Observations store values in typed columns: `value_numeric`, `value_text`, `value_boolean`, `value_json`. Only one is populated per observation. The frontend auto-detects type and renders accordingly.

### Frontend State Enum

Hooks use `State` from `frontend/src/lib/state.ts` instead of `loading: boolean`. Each data-fetching hook returns `{ data, state: State, error }`.

- **State flow**: `INITIAL` → `PENDING` → `NONE`/`ONE`/`SOME`/`MANY` or `ERROR`
- **Helpers**: `getCollectionState(items[])` returns NONE/ONE/SOME/MANY (threshold = 10), `getSingleState(item)` returns NONE or ONE
- **Components** check `state === State.PENDING` for loading, `State.ERROR` for errors, `State.NONE` for empty states
- **AuthContext stays boolean** — auth init is a binary gate, not a data-fetching concern
- **Mutations keep local booleans** — submit buttons use local `saving` state, not the enum

### Vitest Configuration Pitfalls

- **File parallelism must be disabled** (`fileParallelism: false` in vitest.config.ts) — test files share the same Supabase database, so parallel execution causes data conflicts between test suites
- The `sequence.concurrent: false` setting only prevents tests WITHIN a file from running concurrently — it does NOT prevent test FILES from running in parallel
