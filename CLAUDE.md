# CLAUDE.md

## Project Overview

Krivaten is a Universal Observation Database — a metric-based platform for tracking entities (things), relationships (connections), and observations (structured measurements) across any domain.

- **Frontend**: Vite + React + TypeScript + React Router + TanStack Query v5 + Tailwind CSS v4 + shadcn/ui → Cloudflare Pages
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Supabase (PostgreSQL with PostGIS, pgcrypto, Row Level Security)
- **Authentication**: Supabase Auth (Google, GitHub, email/password)
- **Package Manager**: pnpm (workspace monorepo)

## Agent Guidelines

- **Use the `superpowers:write-plan` Agent Skill for plan writing:** When writing plans, always use the `superpowers:write-plan` skill to ensure clarity and completeness.
- **Use the `superpowers:execute-plan` Agent Skill for plan execution:** When executing plans, always use the `superpowers:execute-plan` skill to ensure accurate and efficient plan execution.
- **Use the `superpowers:write-code` Agent Skill for code generation:** When generating code, always use the `superpowers:write-code` skill to ensure the code is well-structured and maintainable.

## Project Structure

```
app/
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

**Root `.env`:** SUPABASE_URL, SUPABASE_KEY, VITE_SUPABASE_URL (`$SUPABASE_URL`), VITE_SUPABASE_KEY (`$SUPABASE_KEY`), VITE_API_URL
**Workers `.dev.vars`:** SUPABASE_URL, SUPABASE_KEY, SUPABASE_JWT_SECRET, FRONTEND_URL

### Local vs Hosted Supabase

The project uses a **hosted Supabase** (`sflwikhnqgxwvmrktfss.supabase.co`) as the default dev target. Both `.env` and `workers/.dev.vars` must point to the same Supabase instance. Local Supabase (`127.0.0.1:54321`) is used only for integration tests — the test setup (`workers/src/test/setup.ts`) auto-detects local credentials via `supabase status --output json` and falls back to well-known demo keys.

**Critical:** After schema changes, deploy migrations to the hosted instance with `supabase db push` or `supabase db reset --linked`. Tests pass against local Supabase but the app runs against hosted — a schema mismatch between them causes 500 errors that don't show up in tests.

### Deploying Migrations to Hosted Supabase

```bash
supabase db push              # Apply pending migrations
supabase db push --dry-run    # Preview what would be applied
supabase db reset --linked    # Nuclear option: drop everything, reapply all migrations + seed
```

If `db push` fails with "Remote migration versions not found in local", the migration history is out of sync. Use `supabase migration repair --status reverted <version>` for each old remote migration, then push again.

## Database Schema

### Tables

- **tenants** — Multi-tenant spaces (id, name, slug, settings JSONB)
- **tenant_members** — Join table linking users to tenants (user_id, tenant_id, role, is_active). Partial unique index enforces one active membership per user. Users can belong to multiple tenants but only one is active at a time
- **profiles** — User profiles (auto-created on signup via trigger, or lazily via `ensureProfile`). No tenant_id — tenant association lives in `tenant_members`
- **entity_types** — System-defined entity categories (person, plant, animal, location, project, equipment, supply, process). Read-only, shared across all tenants
- **metrics** — Observation templates with structured fields (mood, growth, health, etc.). System-defined, shared across all tenants
- **metric_fields** — Field definitions for each metric (code, name, field_type, options, is_required, position). Field types: text, number, boolean, single_select, multi_select, textarea, datetime
- **entity_type_metrics** — Default metric assignments per entity type (e.g. person → mood, health, sleep, diet, behavior)
- **entities** — Things being tracked. entity_type_id FK to entity_types. Attributes JSONB, PostGIS location, taxonomy_path, soft-delete via is_active
- **entity_metrics** — Per-entity metric overrides (enable/disable specific metrics for an individual entity)
- **relationships** — Directed connections between entities. Plain text `type` field (located_in, manages, part_of, etc.). Temporal validity (valid_from/valid_to)
- **observations** — Structured measurements. `field_values` JSONB stores metric field data. entity_id FK to entities, metric_id FK to metrics, observer_id FK to auth.users
- **audit_log** — Action history per tenant

### Metric-Based Observation Model

Observations use structured JSONB `field_values` keyed by metric field codes. Each metric defines its fields (with types, options, required flags). The API validates required fields on creation. Example:

```json
{
  "entity_id": "uuid",
  "metric": "mood",
  "field_values": { "mood": "good", "energy": "high", "notes": "Feeling great" }
}
```

### Entity Type → Metric Defaults

Each entity type has default metrics assigned via `entity_type_metrics`:

- person → behavior, diet, sleep, health, mood
- plant → soil, health, growth, harvest
- animal → health, diet, behavior, growth
- location → weather, conditions
- project → status, milestones
- equipment → maintenance, condition
- supply → inventory, usage
- process → execution, quality

### RLS Design Notes

- **`get_my_tenant_id()`**: SECURITY DEFINER function that reads `tenant_members` for the current user's active membership. Used by all tenant-scoped RLS policies. Bypasses RLS because it's SECURITY DEFINER.
- **`tenant_members` table**: Users can view own memberships (`user_id = auth.uid()`), view all memberships in their active tenant, create own memberships, and update own memberships.
- **Profiles table**: SELECT policy uses `auth.uid() = id` directly (own profile) plus an EXISTS check on `tenant_members` (profiles of people in the same active tenant). Never subqueries back into profiles.
- **Tenant creation**: The `POST /api/v1/tenants` route calls `ensureProfile`, generates a tenant UUID, inserts the tenant, creates a `tenant_members` row (admin, active), then fetches the tenant.
- **entity_types, metrics, metric_fields**: Read-only, visible to all authenticated users (`auth.uid() IS NOT NULL`).
- **entity_type_metrics**: Read-only, visible to all authenticated users.
- **entity_metrics**: RLS checks entity ownership via EXISTS on entities table with `tenant_id = get_my_tenant_id()`.
- **All tenant-scoped tables** (entities, relationships, observations): RLS policies use `tenant_id = get_my_tenant_id()`.

### RPC Functions

- `get_related_entities(p_entity_id, p_max_depth, p_relationship_types)` — Recursive CTE graph traversal via relationships table
- `search_taxonomy(p_path_prefix, p_limit)` — Taxonomy path prefix search joining entity_types

## API Endpoints

All routes under `/api/v1/`:

- `GET /api/v1/health` — Health check
- `POST/GET/PUT /api/v1/tenants` — Space CRUD (`/mine` for current)
- `GET/PUT /api/v1/profiles/me` — Current user profile
- `GET /api/v1/entity-types` — List entity types (optional `?code=` filter)
- `GET /api/v1/entity-types/:id` — Entity type detail with default metrics
- `GET /api/v1/metrics` — List metrics (optional `?entity_type=` filter)
- `GET /api/v1/metrics/:id` — Metric detail with fields
- `GET/POST/PUT/DELETE /api/v1/entities` — Entity CRUD (DELETE = soft-delete)
- `GET /api/v1/entities/:id/metrics` — Entity's effective metrics (defaults + overrides)
- `PUT /api/v1/entities/:id/metrics` — Upsert entity metric overrides
- `GET /api/v1/entities/:id/relationships` — Entity's relationships
- `GET /api/v1/entities/:id/related` — Graph traversal (RPC)
- `GET/POST/DELETE /api/v1/relationships` — Relationship CRUD
- `GET/POST/DELETE /api/v1/observations` — Observation CRUD with pagination
- `GET /api/v1/observations/:id` — Single observation with entity/metric joins
- `POST /api/v1/observations/batch` — Batch create observations
- `GET /api/v1/search/entities?q=` — Entity name search
- `GET /api/v1/search/taxonomy?path=` — Taxonomy prefix search (RPC)

## Testing

### Running Tests

```bash
supabase start        # Must be running (Docker required)
pnpm test:workers     # 72 integration tests against local Supabase
```

### Test Architecture

- Tests use **real Supabase auth JWTs** (not mocks) — `adminClient.auth.admin.createUser()` + `signInWithPassword()` to get tokens that pass jose JWKS verification
- Tests invoke the Hono app via `app.request(path, init, TEST_ENV)` — no HTTP server needed
- Cleanup uses the **service role client** (bypasses RLS) in `beforeEach`/`afterEach`
- Delete order matters due to FK constraints: audit_log → observations → entity_metrics → relationships → entities → tenant_members → profiles → tenants → auth users

### Key Files

- `workers/src/test/setup.ts` — Supabase credentials, admin client, connectivity check
- `workers/src/test/helpers/auth.ts` — `createTestUser()`, `authHeaders()`, `deleteTestUser()`
- `workers/src/test/helpers/request.ts` — `appGet`, `appPost`, `appPut`, `appDelete` wrappers
- `workers/src/test/helpers/cleanup.ts` — `cleanupAllData()` via service role
- `workers/src/test/helpers/fixtures.ts` — `setupUserWithTenant()`, `getEntityTypeId()`, `getMetricId()`, `createEntityForUser()`, `createObservationForUser()`, `createRelationshipForUser()`

### Entity Type / Metric Code Lookup Pattern

Tests use `getEntityTypeId(user, code)` and `getMetricId(user, code)` to look up system UUIDs by code. This avoids hardcoding UUIDs. Example: `const personTypeId = await getEntityTypeId(user, "person")`.

## Architecture Patterns

### Hono App Structure

- Each route module creates its own `Hono` instance with typed bindings: `new Hono<{ Bindings: Env; Variables: Variables }>()`
- Auth middleware sets `user` and `accessToken` in Hono context variables
- Routes that need tenant scope call `requireTenantId(c)` which throws if user has no tenant
- The `Env` type (`workers/src/types/env.d.ts`) uses ambient declarations (no namespace) — types like `Env`, `User`, `Variables` are globally available
- Global `app.onError()` handler in `index.ts` catches unhandled exceptions and returns `{ detail: message }` with 500 status

### Profile Lifecycle (ensureProfile)

`ensureProfile` (`workers/src/lib/profile.ts`) is the single source of truth for profile creation:

- **Common path**: SELECT finds existing profile (created by `handle_new_user` trigger) → return it
- **Trigger missed**: INSERT the profile, then re-SELECT → return it
- **Stale JWT**: INSERT fails with FK violation (code `23503`, profiles.id → auth.users) → return `null`
- Called by `POST /api/v1/tenants` and `GET /api/v1/profiles/me`. A `null` return → 401 response.

### Frontend 401 Interceptor

The `ApiClient` in `frontend/src/lib/api.ts` intercepts 401 responses in both `request()` and `delete()` methods. On 401: signs out via `supabase.auth.signOut()`, redirects to `/signin`. The `useTenant` hook calls `GET /profiles/me` before `GET /tenants/mine` to trigger `ensureProfile` on every app load.

### Frontend API Error Handling

The `ApiClient` in `frontend/src/lib/api.ts` reads the `{ detail }` field from error response bodies. Errors surface as `"<status>: <detail>"` (e.g., `"500: Could not find the table 'public.tenants'"`). Hooks that check status codes (like `useTenant` checking for `"404"`) match against `err.message.includes("404")`.

### Code Resolution in API

The API accepts both UUIDs and string codes. For entities: `entity_type_id` (UUID) or `entity_type` (code string, resolved via `entity_types` table). For observations: `metric_id` (UUID) or `metric` (code string, resolved via `metrics` table). The API resolves codes to UUIDs internally.

### TanStack Query Data Fetching

All data-fetching hooks use TanStack Query v5 (`useQuery`/`useMutation`). The `QueryClientProvider` wraps the app inside `AuthProvider` in `App.tsx`.

- **Query key factory** (`frontend/src/lib/queryKeys.ts`): Centralized key definitions — `queryKeys.entities.list(filters)`, `queryKeys.entities.detail(id)`, `queryKeys.entities.metrics(id)`, `queryKeys.metrics.list(entityType)`, etc. Mutations invalidate the `.all()` prefix to refetch all related queries.
- **State bridge** (`frontend/src/lib/queryState.ts`): Converts TanStack Query status to the app's `State` enum via `getQueryCollectionState()`, `getQuerySingleState()`, `getQueryPaginatedState()`. This preserves the existing component contract.
- **Defaults**: `staleTime: 2min`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`
- **Auth gating**: All hooks use `enabled: !authLoading && !!session` to prevent queries before auth resolves
- **Cache invalidation**: Mutations call `queryClient.invalidateQueries({ queryKey: queryKeys.<domain>.all() })` on success. Updates that return the new object use `setQueryData` for instant UI updates.
- **Hooks**: `useProfile`, `useTenant`, `useEntityTypes`, `useMetrics`, `useEntityMetrics`, `useEntities`, `useRelationships`, `useObservations`, plus `EntityDetail.tsx` inline fetch
- **DevTools**: `ReactQueryDevtools` included (flower icon, bottom-right in dev)

### Frontend State Enum

Hooks return `State` from `frontend/src/lib/state.ts`. TanStack Query status is bridged via `queryState.ts` helpers.

- **State values**: `INITIAL`, `PENDING`, `NONE`, `ONE`, `SOME`, `MANY`, `ERROR`, `SUCCESS`
- **Helpers**: `getCollectionState(items[])` returns NONE/ONE/SOME/MANY (threshold = 10), `getSingleState(item)` returns NONE or ONE
- **Components** check `state === State.PENDING` for loading, `State.ERROR` for errors, `State.NONE` for empty states
- **AuthContext stays boolean** — auth init is a binary gate, not a data-fetching concern
- **Mutations keep local booleans** — submit buttons use local `saving` state, not the enum

### Dynamic Observation Forms

The `ObservationForm` renders metric fields dynamically based on the selected metric's field definitions. The `MetricFieldInput` component maps `field_type` to the appropriate UI control:

- `text` → Input
- `number` → Input[type=number]
- `boolean` → Checkbox
- `single_select` → Select with options
- `multi_select` → Multiple checkboxes
- `textarea` → Textarea
- `datetime` → Input[type=datetime-local]

Required fields are validated client-side before submission.

### Vitest Configuration Pitfalls

- **File parallelism must be disabled** (`fileParallelism: false` in vitest.config.ts) — test files share the same Supabase database, so parallel execution causes data conflicts between test suites
- The `sequence.concurrent: false` setting only prevents tests WITHIN a file from running concurrently — it does NOT prevent test FILES from running in parallel

### Migration Idempotency

Migrations should be idempotent where possible:

- Use `CREATE TABLE IF NOT EXISTS` for tables
- Use `INSERT ... ON CONFLICT DO NOTHING` for seed-like inserts (e.g., storage buckets)
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY` when policies may already exist from a prior partial run
- The avatars bucket migration (`20260221000004`) uses these patterns because `storage.buckets` persists across `supabase db reset`
