# CLAUDE.md

## Project Overview

Krivaten is a personal tools PWA with:

- **Frontend**: Vite + React + TypeScript + React Router + Tailwind CSS v4 + shadcn/ui → Cloudflare Pages
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Google, GitHub, email/password)
- **Package Manager**: pnpm (workspace monorepo)

## Project Structure

```
krivaten/
├── frontend/          # React SPA → Cloudflare Pages (port 5173)
├── workers/           # Hono API → Cloudflare Workers (port 8787)
├── supabase/          # Database migrations
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

## Testing

### Running Tests

```bash
supabase start        # Must be running (Docker required)
pnpm test:workers     # 40 integration tests against local Supabase
```

### Test Architecture

- Tests use **real Supabase auth JWTs** (not mocks) — `adminClient.auth.admin.createUser()` + `signInWithPassword()` to get tokens that pass jose JWKS verification
- Tests invoke the Hono app via `app.request(path, init, TEST_ENV)` — no HTTP server needed
- Cleanup uses the **service role client** (bypasses RLS) in `beforeEach`/`afterEach`
- Delete order matters due to FK constraints: relationships → observations → entities → profiles → households → auth users

### Key Files

- `workers/src/test/setup.ts` — Supabase credentials, admin client, connectivity check
- `workers/src/test/helpers/auth.ts` — `createTestUser()`, `authHeaders()`, `deleteTestUser()`
- `workers/src/test/helpers/request.ts` — `appGet`, `appPost`, `appPut`, `appDelete` wrappers
- `workers/src/test/helpers/cleanup.ts` — `cleanupAllData()` via service role
- `workers/src/test/helpers/fixtures.ts` — `setupUserWithHousehold()`, `createEntityForUser()`, `createObservationForUser()`

## Database Schema

### Entity Type Constraint

The `entities` table has a CHECK constraint limiting `type` to: `person`, `location`, `plant`, `project`, `equipment`, `supply`, `process`, `animal`. Using any other type value will fail with a constraint violation.

### RLS Design Notes

- **Profiles table**: The SELECT policy must NOT subquery back into `profiles` — this causes infinite recursion. The fix (migration `20260216000005`) uses `auth.uid()` directly instead of `get_my_household_id()`.
- **Household creation**: The `POST /api/households` route generates a UUID up front, inserts without `.select()`, updates the profile with the household_id, and THEN fetches the household. This avoids the INSERT+SELECT chicken-and-egg problem where SELECT RLS checks `get_my_household_id()` which is still NULL.
- **All other tables** (entities, observations, relationships): RLS policies check `household_id IN (SELECT p.household_id FROM profiles p WHERE p.id = auth.uid())` — this works because it queries profiles (not itself) and profiles RLS uses `auth.uid()` directly.

## Architecture Patterns

### Hono App Structure

- Each route module creates its own `Hono` instance with typed bindings: `new Hono<{ Bindings: Env; Variables: Variables }>()`
- Auth middleware sets `user` and `accessToken` in Hono context variables
- Routes that need household scope call `requireHouseholdId(c)` which throws if user has no household
- The `Env` type (`workers/src/types/env.d.ts`) uses ambient declarations (no namespace) — types like `Env`, `User`, `Variables` are globally available

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
